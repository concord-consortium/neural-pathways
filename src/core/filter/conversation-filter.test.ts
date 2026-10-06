import { conversationFilterFor, createConversationFilter, idsFor } from "./conversation-filter";
import { alien3Dataset } from "../datasets/alien3-dataset";
import { filterTestIndex } from "./__fixtures__/filter-test-index";

const ALL = ["aaa111", "bbb222", "ccc333", "ddd444"];

describe("conversationFilterFor", () => {
  const filter = conversationFilterFor(filterTestIndex());

  it("lists the fields in order: the fixed ones, the filterable attributes, then the pathways", () => {
    expect(filter.fields).toEqual([
      "n", "id", "text", "target_label",
      "target", "prediction", "model_correct", "voices_raised", "group_size",
      "pathway_1", "pathway_2", "pathway_3",
    ]);
  });

  it("leaves hidden attributes out", () => {
    expect(filter.attributes.map(a => a.key)).not.toContain("resource_stressed");
  });

  it("lists every conversation's id in dataset order", () => {
    expect(filter.allIds).toEqual(ALL);
  });

  it("returns the same filter for the same index, and a new one for another", () => {
    const datasetIndex = filterTestIndex();
    expect(conversationFilterFor(datasetIndex)).toBe(conversationFilterFor(datasetIndex));
    expect(conversationFilterFor(filterTestIndex())).not.toBe(conversationFilterFor(datasetIndex));
  });

  it("has no pathway fields for an index with no fit", () => {
    const datasetIndex = filterTestIndex();
    datasetIndex.metadata.fa_fits = {};
    expect(conversationFilterFor(datasetIndex).fields).not.toContain("pathway_1");
  });
});

describe("run", () => {
  const filter = conversationFilterFor(filterTestIndex());
  const matches = (query: string) => filter.run(query);

  it("matches every conversation for an empty or blank query", () => {
    expect(matches("")).toEqual({ ids: ALL });
    expect(matches("   ")).toEqual({ ids: ALL });
  });

  it("numbers conversations from 1 by their place among all of them", () => {
    expect(matches("n:2")).toEqual({ ids: ["bbb222"] });
  });

  it("matches a quoted phrase across a line break in the text", () => {
    expect(matches("\"quissa blikka\"")).toEqual({ ids: ["aaa111"] });
  });

  it("matches part of an id, ignoring case", () => {
    expect(matches("id:AAA1")).toEqual({ ids: ["aaa111"] });
  });

  it("filters on the derived attributes", () => {
    expect(matches("model_correct:0")).toEqual({ ids: ["bbb222", "ddd444"] });
    expect(matches("prediction:1")).toEqual({ ids: ["ddd444"] });
  });

  it("numbers the pathways from 1", () => {
    expect(matches("pathway_1:>2")).toEqual({ ids: ["bbb222"] });
    expect(matches("pathway_2:>2")).toEqual({ ids: ["ccc333"] });
    expect(matches("pathway_3:>2")).toEqual({ ids: ["aaa111"] });
  });

  it("compares numbers", () => {
    expect(matches("group_size:>=3")).toEqual({ ids: ["bbb222", "ddd444"] });
  });

  it("matches a bare word in the text and nowhere else", () => {
    expect(matches("yandor")).toEqual({ ids: ["aaa111", "bbb222", "ddd444"] });
    expect(matches("wait")).toEqual({ ids: [] });
    expect(matches("target_label:wait")).toEqual({ ids: ["aaa111", "ddd444"] });
  });

  it("combines terms with AND, a space, OR, NOT, - and parentheses", () => {
    expect(matches("yandor AND voices_raised:1")).toEqual({ ids: ["bbb222"] });
    expect(matches("yandor voices_raised:1")).toEqual({ ids: ["bbb222"] });
    expect(matches("NOT yandor")).toEqual({ ids: ["ccc333"] });
    expect(matches("-yandor")).toEqual({ ids: ["ccc333"] });
    expect(matches("(model_correct:0 OR group_size:1) AND NOT voices_raised:0"))
      .toEqual({ ids: ["bbb222", "ccc333"] });
  });

  it("returns OR's matches in dataset order", () => {
    expect(matches("chullo OR blikka")).toEqual({ ids: ["aaa111", "ccc333", "ddd444"] });
  });

  it("treats lowercase or as a word to search for", () => {
    expect(matches("yandor or chullo")).toEqual({ ids: [] });
  });

  it("reports a field it doesn't know", () => {
    expect(matches("bogus:1")).toEqual({ error: "Unknown field: bogus" });
    expect(matches("pathway_0:1")).toEqual({ error: "Unknown field: pathway_0" });
    expect(matches("pathway_4:1")).toEqual({ error: "Unknown field: pathway_4" });
  });

  it("reports a hidden attribute the same way as a typo", () => {
    expect(matches("resource_stressed:1")).toEqual({ error: "Unknown field: resource_stressed" });
  });

  it("treats field names as case-sensitive", () => {
    expect(matches("Model_correct:0")).toEqual({ error: "Unknown field: Model_correct" });
  });

  it("reports a comparison without a number", () => {
    expect(matches("pathway_1:>abc")).toEqual({ error: "pathway_1:> needs a number" });
  });

  it("reports an incomplete query", () => {
    expect(matches("(model_correct:0")).toEqual({ error: "Incomplete query" });
    expect(matches("yandor AND")).toEqual({ error: "Incomplete query" });
  });

  it("reports where it can't read the query", () => {
    expect(matches("model_correct:0)")).toEqual({ error: "Can't read the query at column 16" });
  });
});

describe("createConversationFilter", () => {
  it("leaves a missing value out of the record, so it never matches", () => {
    const datasetIndex = filterTestIndex();
    datasetIndex.items[0].target_label = null;
    const filter = createConversationFilter(datasetIndex, alien3Dataset, []);
    expect(filter.run("target_label:wait")).toEqual({ ids: ["ddd444"] });
  });
});

describe("idsFor", () => {
  const filter = conversationFilterFor(filterTestIndex());

  it("gives the query's matches", () => {
    expect(idsFor(filter, "n:2")).toEqual(["bbb222"]);
  });

  it("gives every conversation for a query it can't read", () => {
    expect(idsFor(filter, "bogus:1")).toEqual(ALL);
  });
});
