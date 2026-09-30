import { SolvedAttribute } from "./attributes";
import { AlienConfig } from "./config-types";
import { Rng } from "./rng";

export interface ObservationFacts {
  /** Every attribute for this conversation, hidden ones included. */
  attributes: Record<string, number>;
  /** Seeded values for detail that is not an attribute. */
  flavor: number[];
}

/**
 * The seam between the deterministic core and however notes get written. Only
 * TemplateNoteRenderer ships: it needs no API key and no network, so build-time
 * generation stays deterministic. An LLM-backed renderer would read a
 * content-addressed cache keyed by the facts, never call an API during a build.
 */
export interface NoteRenderer {
  render(facts: ObservationFacts, rng: Rng): string;
}

export const FLAVOR_COUNT = 4;

export function buildFacts(
  solvedAttributes: SolvedAttribute[],
  index: number,
  rng: Rng,
): ObservationFacts {
  const attributes: Record<string, number> = {};
  for (const solved of solvedAttributes) attributes[solved.key] = solved.values[index];
  const flavor: number[] = [];
  for (let i = 0; i < FLAVOR_COUNT; i++) flavor.push(rng.next());
  return { attributes, flavor };
}

export class TemplateNoteRenderer implements NoteRenderer {
  private readonly config: AlienConfig;

  constructor(config: AlienConfig) {
    this.config = config;
  }

  render(facts: ObservationFacts, rng: Rng): string {
    const sentences: string[] = [];

    // One fragment per attribute, hidden included: phase 6 commissions a coding
    // for a hidden attribute, and that coding has to be derivable from the note.
    for (const attribute of this.config.attributes) {
      const value = facts.attributes[attribute.key];
      const fragments = attribute.notes[value];
      if (!fragments) {
        throw new Error(`Attribute "${attribute.key}" has no note fragments for value ${value}`);
      }
      sentences.push(rng.pick(fragments));
    }

    // Filler makes the note more than an enumeration of the attribute set.
    const { minFillerPerNote, maxFillerPerNote, fillerFragments } = this.config;
    const fillerCount = minFillerPerNote
      + Math.floor(facts.flavor[0] * (maxFillerPerNote - minFillerPerNote + 1));
    const remaining = [...fillerFragments];
    for (let i = 0; i < Math.min(fillerCount, remaining.length); i++) {
      sentences.push(remaining.splice(rng.int(0, remaining.length - 1), 1)[0]);
    }

    // Fisher-Yates, so the attributes do not always appear in config order.
    for (let i = sentences.length - 1; i > 0; i--) {
      const j = rng.int(0, i);
      [sentences[i], sentences[j]] = [sentences[j], sentences[i]];
    }

    return sentences.join(" ");
  }
}

export function renderNotes(
  solvedAttributes: SolvedAttribute[],
  config: AlienConfig,
  renderer: NoteRenderer,
  rng: Rng,
): string[] {
  const notes: string[] = [];
  for (let i = 0; i < config.conversationCount; i++) {
    notes.push(renderer.render(buildFacts(solvedAttributes, i, rng), rng));
  }
  return notes;
}
