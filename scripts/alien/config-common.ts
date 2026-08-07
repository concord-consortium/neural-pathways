import { AttributeConfig, Thresholds, VocabularyWord } from "./config-types";

/**
 * Distinct magnitudes within each half, so a pathway score is a sum over many
 * different values rather than an integer multiple of one. A single magnitude
 * leaves only ~21 distinct scores across the whole corpus, which reads as
 * obviously synthetic and coarsens every threshold downstream.
 */
export const MAGNITUDES = [0.55, 0.78, 1.0, 1.27, 1.55];

export interface WordGroup {
  positives: string[];
  negatives: string[];
}

/**
 * Ten words per group. Groups are numbered rather than named: nothing defines
 * what these words mean, meaning is emergent, and any gloss here would be an
 * invention. A group is bound to a pathway by the config that uses it, and the
 * same group sits on a different pathway in a different config.
 */
export const WORD_GROUPS: WordGroup[] = [
  {
    positives: ["tarrak", "vosh", "krenn", "ulash", "drivek"],
    negatives: ["mellu", "sooma", "aloven", "quissa", "nimbar"],
  },
  {
    positives: ["hakku", "tovril", "sennat", "blikka", "ormesh"],
    negatives: ["vaneth", "luppo", "ishara", "karnok", "dweshi"],
  },
  {
    positives: ["pellum", "torva", "ganneth", "ussik", "brimo"],
    negatives: ["ledda", "oxxin", "favuun", "mirrek", "saanth"],
  },
  {
    positives: ["chullo", "arvek", "nembu", "tisshak", "oradda"],
    negatives: ["welvin", "murrash", "kippa", "yandor", "essulo"],
  },
];

/**
 * Builds one pathway's words: each carries zero weight in every other pathway,
 * and the ten weights are symmetric under negation. That symmetry is what makes
 * the pathway scores uncorrelated — see self-check 8.
 */
export function groupBuilder(scale: number[]) {
  return function group(pathway: number, words: WordGroup): VocabularyWord[] {
    const build = (word: string, sign: number, index: number): VocabularyWord => ({
      word,
      weights: scale.map((value, p) => (p === pathway ? sign * MAGNITUDES[index] * value : 0)),
    });
    return [
      ...words.positives.map((word, i) => build(word, 1, i)),
      ...words.negatives.map((word, i) => build(word, -1, i)),
    ];
  };
}

const YES_NO = { 0: "no", 1: "yes" };

export type BaseAttribute = Omit<AttributeConfig, "pathway" | "targetR">;

/**
 * The nine attributes, minus where they sit. Omitting `pathway` and `targetR`
 * from the type is what stops a config inheriting an assignment by accident —
 * each dataset must state its own, via withPathwayAssignments below.
 *
 * The order is load-bearing: solveAttributes consumes the single PRNG one
 * attribute at a time in this order, so reordering changes every value in every
 * dataset.
 */
export const BASE_ATTRIBUTES: BaseAttribute[] = [
  {
    key: "voices_raised",
    label: "Voices raised",
    description: "Whether any participant noticeably increased their volume during the exchange.",
    type: "binary",
    hidden: false,
    valueShares: [0.65, 0.35],
    minValue: 0,
    valueLabels: YES_NO,
    notes: {
      1: [
        "Voices rose sharply more than once.",
        "One speaker raised their voice mid-exchange.",
        "The exchange got loud enough to carry across the clearing.",
        "Volume climbed steadily through the recording.",
      ],
      0: [
        "Tones stayed level throughout.",
        "Nobody raised their voice at any point.",
        "The whole exchange stayed quiet.",
        "Volume never rose above a murmur.",
      ],
    },
  },
  {
    key: "engaged_in_task",
    label: "Engaged in a task",
    description: "Whether the participants were working on something with their hands while talking.",
    type: "binary",
    hidden: false,
    valueShares: [0.5, 0.5],
    minValue: 0,
    valueLabels: YES_NO,
    notes: {
      1: [
        "Both were working on something with their hands the whole time.",
        "The group kept at a shared task while they talked.",
        "Hands stayed busy with the work in front of them.",
        "They talked over an object they were assembling.",
      ],
      0: [
        "Nobody was working on anything.",
        "Their hands were idle from start to finish.",
        "No task was underway.",
        "They stood with nothing in front of them.",
      ],
    },
  },
  {
    key: "group_size",
    label: "Group size",
    description: "How many individuals were visible in the recording.",
    type: "integer",
    hidden: false,
    valueShares: [0.08, 0.22, 0.28, 0.22, 0.14, 0.06],
    minValue: 1,
    notes: {
      1: [
        "Only one individual was in frame; the other voice came from off-frame.",
        "A single individual visible, answering someone I could not see.",
      ],
      2: [
        "Two individuals, facing each other.",
        "A pair, standing close together.",
      ],
      3: [
        "Three individuals were present.",
        "Three of them, loosely triangular.",
      ],
      4: [
        "Four individuals were in the recording.",
        "Four present, two on each side.",
      ],
      5: [
        "Five individuals, spread out.",
        "Five of them, no clear arrangement.",
      ],
      6: [
        "Six individuals were present, the largest gathering I have recorded here.",
        "Six of them, packed into a small area.",
      ],
    },
  },
  {
    key: "near_water",
    label: "Near water",
    description: "Whether open water was within a short distance of the group.",
    type: "binary",
    hidden: false,
    valueShares: [0.6, 0.4],
    minValue: 0,
    valueLabels: YES_NO,
    notes: {
      1: [
        "A stream ran within a few paces of them.",
        "They were standing at the edge of open water.",
        "Running water was audible in the background.",
      ],
      0: [
        "No water anywhere nearby.",
        "The ground was dry in every direction.",
        "Nothing but dry ground all around them.",
      ],
    },
  },
  {
    key: "food_present",
    label: "Food present",
    description: "Whether food was visible within reach of the group.",
    type: "binary",
    hidden: false,
    valueShares: [0.55, 0.45],
    minValue: 0,
    valueLabels: YES_NO,
    notes: {
      1: [
        "Food was laid out between them.",
        "They had gathered food within easy reach.",
        "There was food on the ground beside them.",
      ],
      0: [
        "No food was visible.",
        "Nothing to eat anywhere in frame.",
        "I could see no food at all.",
      ],
    },
  },
  {
    key: "resource_stressed",
    label: "Resource stressed",
    description:
      "Whether the surroundings showed scarcity rather than abundance. Coded from the state of "
      + "the area around the group, not from anything the group did.",
    type: "binary",
    hidden: true,
    valueShares: [0.7, 0.3],
    minValue: 0,
    valueLabels: YES_NO,
    notes: {
      1: [
        "The surroundings looked picked over and bare.",
        "Stores nearby were nearly empty.",
        "Everything within reach had already been stripped.",
        "The area showed clear signs of scarcity.",
      ],
      0: [
        "The surroundings were plainly abundant.",
        "There was more than enough within easy reach.",
        "Stores nearby were full.",
        "Nothing about the area suggested scarcity.",
      ],
    },
  },
  {
    key: "gestures_repeated",
    label: "Gestures repeated",
    description: "Whether any single hand gesture recurred during the exchange.",
    type: "binary",
    hidden: true,
    valueShares: [0.65, 0.35],
    minValue: 0,
    valueLabels: YES_NO,
    notes: {
      1: [
        "One gesture was repeated many times over.",
        "The same hand motion came back again and again.",
        "A single gesture recurred throughout.",
      ],
      0: [
        "No gesture was repeated.",
        "Each hand motion appeared only once.",
        "I noticed nothing repeated in their gestures.",
      ],
    },
  },
  {
    key: "young_present",
    label: "Young present",
    description: "Whether any juvenile was among the individuals recorded.",
    type: "binary",
    hidden: true,
    valueShares: [0.75, 0.25],
    minValue: 0,
    valueLabels: YES_NO,
    notes: {
      1: [
        "At least one juvenile was present.",
        "A young one stayed close by the whole time.",
        "Juveniles were among the group.",
      ],
      0: [
        "No juveniles anywhere.",
        "Every individual present was fully grown.",
        "I saw no young ones.",
      ],
    },
  },
  {
    key: "carrying_burden",
    label: "Carrying a burden",
    description: "Whether individuals were carrying loads.",
    type: "binary",
    hidden: true,
    valueShares: [0.7, 0.3],
    minValue: 0,
    valueLabels: YES_NO,
    notes: {
      1: [
        "Several were carrying loads on their backs.",
        "They had bundles slung over their shoulders.",
        "At least two were burdened with cargo.",
      ],
      0: [
        "Nobody carried anything.",
        "Their arms and backs were free.",
        "No loads of any kind.",
      ],
    },
  },
];

export interface PathwayAssignment {
  /** Which pathway this attribute tracks in this dataset, or null for a decoy. */
  pathway: number | null;
  /** Requested correlation with that pathway. Must be 0 when pathway is null. */
  targetR: number;
}

/**
 * Binds the shared attributes to one dataset's pathways. Every base attribute
 * needs an entry and every entry needs a base attribute: a tenth attribute added
 * later must then say where it sits in both datasets, rather than silently
 * defaulting to a decoy in one of them.
 */
export function withPathwayAssignments(
  base: BaseAttribute[],
  assignments: Record<string, PathwayAssignment>,
): AttributeConfig[] {
  const known = new Set(base.map(attribute => attribute.key));
  for (const key of Object.keys(assignments)) {
    if (!known.has(key)) {
      throw new Error(
        `Pathway assignment names "${key}", which is not one of the base attributes.`,
      );
    }
  }
  return base.map(attribute => {
    const assignment = assignments[attribute.key];
    if (!assignment) {
      throw new Error(
        `Attribute "${attribute.key}" has no pathway assignment. Every dataset must say where `
        + `each attribute sits.`,
      );
    }
    return { ...attribute, pathway: assignment.pathway, targetR: assignment.targetR };
  });
}

/**
 * Material that maps to no attribute at all. Without it a reader could recover
 * the entire attribute set from the notes and the coding exercise would collapse
 * into reading answers off a menu.
 */
export const FILLER_FRAGMENTS: string[] = [
  "The light was flat and grey.",
  "Recording made shortly after dawn.",
  "Wind made parts of the audio hard to follow.",
  "I stayed roughly thirty paces back.",
  "The recording runs just under four minutes.",
  "Ground was uneven where they stood.",
  "One of them glanced toward me twice.",
  "A second recorder was running from the far side.",
  "The sky stayed overcast for the whole session.",
  "I have marked this one for a second listen.",
  "Ambient noise was higher than usual.",
  "The exchange ended abruptly.",
  "They dispersed in different directions afterward.",
  "My hands were cold and these notes are shorter than I would like.",
];

export const THRESHOLDS: Thresholds = {
  correlationTolerance: 0.02,
  // Judges every decoy against every pathway — 24 correlations in the
  // four-pathway dataset, 18 in the three-pathway one — each with a standard
  // error near 0.035. The largest of that many lands around 0.09 on a typical
  // reseed, so a threshold of 0.08 would fail half the time on data that is
  // entirely fine.
  decoyMax: 0.15,
  pathwayOrthogonalityMax: 0.12,
  truthBiasMax: 0.08,
  detectableBiasMin: 0.2,
  minWordOccurrences: 100,
  shapTolerance: 1e-9,
};
