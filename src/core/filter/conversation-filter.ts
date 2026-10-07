import {
  filter as liqeFilter, parse, SyntaxError as LiqeSyntaxError,
  type FieldToken, type LiqeQuery, type ParserAst, type TagToken,
} from "liqe";
import { alien3Dataset } from "../datasets/alien3-dataset";
import { DatasetDefinition } from "../datasets/dataset-definition";
import { AttributeDefinition } from "../types/attributes";
import { S3Index, S3Item } from "../types/s3-data";

export type FilterResult = { ids: readonly string[] } | { error: string };

/** A filter over one dataset index's conversations. */
export interface ConversationFilter {
  /** The field names a query can use, in the order the help lists them. */
  fields: readonly string[];
  /** The attributes behind the attribute fields, for the help's labels and ranges. */
  attributes: readonly AttributeDefinition[];
  /** Every conversation's id, in dataset order. */
  allIds: readonly string[];
  run(query: string): FilterResult;
}

type FilterRecord = Record<string, string | number>;

/** A problem found in a parsed query. Its message is shown as is. */
class QueryError extends Error {}

interface Fit {
  name: string;
  pathwayCount: number;
}

/** The index's one fit, or undefined when it has none. The lesson's datasets have one. */
function onlyFit(datasetIndex: S3Index): Fit | undefined {
  const names = Object.keys(datasetIndex.metadata.fa_fits);
  if (names.length > 1) {
    throw new Error(`Expected at most one fit, found ${names.join(", ")}`);
  }
  if (names.length === 0) {
    return undefined;
  }
  return { name: names[0], pathwayCount: datasetIndex.metadata.fa_fits[names[0]].n_pathways };
}

/** Numbered from 1, as the lesson numbers its pathways. */
function pathwayFields(fit: Fit | undefined): string[] {
  return fit ? Array.from({ length: fit.pathwayCount }, (_, i) => `pathway_${i + 1}`) : [];
}

/** A missing value is left out: `field:value` never matches it, so `NOT field:value` always does. */
function toRecord(
  item: S3Item,
  place: number,
  dataset: DatasetDefinition,
  attributes: readonly AttributeDefinition[],
  fit: Fit | undefined,
): FilterRecord {
  // Lowercase, as every query value is made, so a match ignores case even when quoted: liqe
  // matches a quoted value case-sensitively. The line breaks between turns become spaces, so a
  // quoted phrase can span two turns.
  const record: FilterRecord = { n: place + 1, id: item.id, text: item.text.replace(/\n/g, " ").toLowerCase() };
  if (item.observation != null) {
    record.observation = item.observation.toLowerCase();
  }
  if (item.target_label != null) {
    record.target_label = item.target_label;
  }
  for (const attribute of attributes) {
    const value = dataset.getAttributeValue(item, attribute.key);
    if (value != null) {
      record[attribute.key] = value;
    }
  }
  if (fit) {
    const scores = item.pathway_scores[fit.name] ?? [];
    pathwayFields(fit).forEach((field, i) => {
      if (scores[i] != null) {
        record[field] = scores[i];
      }
    });
  }
  return record;
}

interface QueryFields {
  all: ReadonlySet<string>;
  /** The fields that hold numbers: `n`, the attributes and the pathways. */
  numbers: ReadonlySet<string>;
}

/** The fields every conversation has, before the attributes and pathways. All are in RESERVED_FIELD_NAMES. */
export const FIXED_FIELDS = ["n", "id", "text", "observation", "target_label"];

/** The fields a bare word searches: the conversation's alien words and the observer's notes. */
const BARE_WORD_FIELDS = ["text", "observation"];

/** The tag with its value lowercased, to match the lowercased records. */
function lowercased(tag: TagToken): TagToken {
  const { expression } = tag;
  return expression.type === "LiteralExpression" && typeof expression.value === "string"
    ? { ...tag, expression: { ...expression, value: expression.value.toLowerCase() } }
    : tag;
}

function fieldToken(name: string, location: TagToken["location"]): FieldToken {
  return { type: "Field", name, path: [name], quoted: false, location };
}

/**
 * A bare word searches the alien text or the observation. Without a field, liqe would search every
 * string field, target_label included.
 */
function checkBareWord(tag: TagToken): ParserAst {
  const [left, right] = BARE_WORD_FIELDS.map(name => ({ ...lowercased(tag), field: fieldToken(name, tag.location) }));
  return {
    type: "ParenthesizedExpression",
    location: tag.location,
    expression: {
      type: "LogicalExpression",
      location: tag.location,
      operator: { type: "BooleanOperator", operator: "OR", location: tag.location },
      left,
      right,
    },
  };
}

/**
 * Checks a tag with a field and rewrites it for matching. It rejects a field the records don't
 * have, a word given to a number field, and a comparison with no number: liqe would match the first
 * two against nothing, and reject the third only once filtering runs. It rewrites a number on a
 * number field as a range, and lowercases a string value.
 */
function checkFieldTag(tag: TagToken, field: FieldToken, fields: QueryFields): ParserAst {
  if (!fields.all.has(field.name)) {
    throw new QueryError(`Unknown field: ${field.name}`);
  }
  const operator = tag.operator.operator;
  const { expression } = tag;
  const isNumber = expression.type === "LiteralExpression" && typeof expression.value === "number";
  if (operator !== ":" && !isNumber) {
    throw new QueryError(`${field.name}${operator} needs a number`);
  }
  // `model_correct:no` would quietly match nothing: the records hold 0 and 1, not the labels.
  if (fields.numbers.has(field.name) && expression.type === "LiteralExpression" && !isNumber) {
    throw new QueryError(`${field.name} needs a number`);
  }
  // liqe matches `field:1` as text, so n:1 would also match 10 to 19, 21 and so on. As the range
  // [1 TO 1], it is compared as a number. Only on a number field: id:111 is still a substring.
  if (fields.numbers.has(field.name) && operator === ":" && expression.type === "LiteralExpression"
    && typeof expression.value === "number") {
    const { value } = expression;
    return {
      ...tag,
      expression: {
        type: "RangeExpression",
        location: expression.location,
        range: { min: value, max: value, minInclusive: true, maxInclusive: true },
      },
    };
  }
  return lowercased(tag);
}

function checkQuery(ast: ParserAst, fields: QueryFields): ParserAst {
  switch (ast.type) {
    case "EmptyExpression":
      return ast;
    case "LogicalExpression":
      return { ...ast, left: checkQuery(ast.left, fields), right: checkQuery(ast.right, fields) };
    case "ParenthesizedExpression":
      return { ...ast, expression: checkQuery(ast.expression, fields) };
    case "UnaryOperator":
      return { ...ast, operand: checkQuery(ast.operand, fields) };
    case "Tag":
      return ast.field.type === "ImplicitField" ? checkBareWord(ast) : checkFieldTag(ast, ast.field, fields);
  }
}

function errorMessage(error: unknown): string {
  if (error instanceof QueryError) {
    return error.message;
  }
  if (error instanceof LiqeSyntaxError) {
    return `Can't read the query at column ${error.column}`;
  }
  if (error instanceof Error) {
    // A trailing AND, an unclosed parenthesis or a lone NOT.
    return error.message === "Found no parsings." ? "Incomplete query" : error.message;
  }
  return String(error);
}

export function createConversationFilter(
  datasetIndex: S3Index,
  dataset: DatasetDefinition,
  attributes: readonly AttributeDefinition[],
): ConversationFilter {
  const fit = onlyFit(datasetIndex);
  const fields = [...FIXED_FIELDS, ...attributes.map(a => a.key), ...pathwayFields(fit)];
  const queryFields: QueryFields = {
    all: new Set(fields),
    numbers: new Set(["n", ...attributes.map(a => a.key), ...pathwayFields(fit)]),
  };
  const records = datasetIndex.items.map((item, i) => toRecord(item, i, dataset, attributes, fit));
  const allIds = datasetIndex.items.map(item => item.id);

  return {
    fields,
    attributes,
    allIds,
    run(query) {
      if (query.trim() === "") {
        return { ids: allIds };
      }
      let matched: readonly FilterRecord[];
      try {
        matched = liqeFilter(checkQuery(parse(query), queryFields) as LiqeQuery, records);
      } catch (error) {
        return { error: errorMessage(error) };
      }
      // OR's matches come back in no useful order.
      const matchedSet = new Set(matched);
      return { ids: allIds.filter((_, i) => matchedSet.has(records[i])) };
    },
  };
}

/** The query's matches, or every conversation when the query can't be read. */
export function idsFor(filter: ConversationFilter, query: string): readonly string[] {
  const result = filter.run(query);
  return "ids" in result ? result.ids : filter.allIds;
}

// One per index. useDatasetIndex shares one index object per page, so a view's load correction and
// its body use the same records.
const filters = new WeakMap<S3Index, ConversationFilter>();

/** The lesson's filter for a loaded alien3 index: every attribute not hidden is filterable. */
export function conversationFilterFor(datasetIndex: S3Index): ConversationFilter {
  let filter = filters.get(datasetIndex);
  if (!filter) {
    const attributes = alien3Dataset.resolveAttributes(datasetIndex).filter(a => !a.hidden);
    filter = createConversationFilter(datasetIndex, alien3Dataset, attributes);
    filters.set(datasetIndex, filter);
  }
  return filter;
}
