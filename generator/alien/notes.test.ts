import { fourPathwayConfig } from "../alien-config";
import { createRng } from "./rng";
import { buildCorpus } from "./conversations";
import { solveAttributes } from "./attributes";
import { FLAVOR_COUNT, TemplateNoteRenderer, buildFacts, renderNotes } from "./notes";

const corpus = buildCorpus(fourPathwayConfig, createRng(fourPathwayConfig.seed));
const solvedAttributes = solveAttributes(corpus.scores, fourPathwayConfig, createRng(2));
const renderer = new TemplateNoteRenderer(fourPathwayConfig);
const notes = renderNotes(solvedAttributes, fourPathwayConfig, renderer, createRng(4));

describe("buildFacts", () => {
  it("carries every attribute, hidden ones included", () => {
    const facts = buildFacts(solvedAttributes, 0, createRng(1));
    expect(Object.keys(facts.attributes).sort())
      .toEqual(fourPathwayConfig.attributes.map(a => a.key).sort());
    expect(facts.attributes.resource_stressed).toBeDefined();
    expect(facts.flavor).toHaveLength(FLAVOR_COUNT);
  });
});

describe("TemplateNoteRenderer", () => {
  it("writes one note per conversation", () => {
    expect(notes).toHaveLength(fourPathwayConfig.conversationCount);
  });

  it("attests every attribute value, hidden included", () => {
    notes.forEach((note, i) => {
      for (const attribute of fourPathwayConfig.attributes) {
        const value = solvedAttributes.find(s => s.key === attribute.key)!.values[i];
        const matching = attribute.notes[value].filter(fragment => note.includes(fragment));
        expect(matching).toHaveLength(1);
      }
    });
  });

  it("never attests a value the conversation does not have", () => {
    notes.forEach((note, i) => {
      for (const attribute of fourPathwayConfig.attributes) {
        const value = solvedAttributes.find(s => s.key === attribute.key)!.values[i];
        for (const [otherValue, fragments] of Object.entries(attribute.notes)) {
          if (Number(otherValue) === value) continue;
          for (const fragment of fragments) expect(note).not.toContain(fragment);
        }
      }
    });
  });

  it("includes material that maps to no attribute", () => {
    notes.forEach(note => {
      const fillerCount = fourPathwayConfig.fillerFragments.filter(f => note.includes(f)).length;
      expect(fillerCount).toBeGreaterThanOrEqual(fourPathwayConfig.minFillerPerNote);
      expect(fillerCount).toBeLessThanOrEqual(fourPathwayConfig.maxFillerPerNote);
    });
  });

  it("varies phrasing and ordering rather than emitting one template", () => {
    expect(new Set(notes).size).toBe(notes.length);
    const opening = new Set(notes.map(note => note.slice(0, 20)));
    expect(opening.size).toBeGreaterThan(20);
  });

  it("is reproducible", () => {
    const again = renderNotes(solvedAttributes, fourPathwayConfig, renderer, createRng(4));
    expect(again).toEqual(notes);
  });
});
