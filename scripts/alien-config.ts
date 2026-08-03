import { AlienConfig, AttributeConfig, VocabularyWord } from "./alien/config-types";

/**
 * Pathway weight scales, solved numerically for the 55/20/15/10 variance split.
 * There is no closed form: the word-selection tilt is itself proportional to the
 * weight, so variance rises faster than scale^2 and sqrt(share) undershoots the
 * lower pathways badly.
 */
const SCALE = [1.0, 0.7912, 0.7308, 0.6546];

/**
 * Distinct magnitudes within each half, so a pathway score is a sum over many
 * different values rather than an integer multiple of one. A single magnitude
 * leaves only ~21 distinct scores across the whole corpus, which reads as
 * obviously synthetic and coarsens every threshold downstream.
 */
const MAGNITUDES = [0.55, 0.78, 1.0, 1.27, 1.55];

/**
 * Ten words per pathway, each carrying zero weight in every other pathway, and
 * the ten weights symmetric under negation. That symmetry is what makes the
 * pathway scores uncorrelated — see self-check 8. Nothing defines what these
 * words mean; meaning is emergent, and any gloss written here would be an
 * invention.
 */
function group(pathway: number, positives: string[], negatives: string[]): VocabularyWord[] {
  const build = (word: string, sign: number, index: number): VocabularyWord => ({
    word,
    weights: SCALE.map((scale, p) => (p === pathway ? sign * MAGNITUDES[index] * scale : 0)),
  });
  return [
    ...positives.map((word, i) => build(word, 1, i)),
    ...negatives.map((word, i) => build(word, -1, i)),
  ];
}

const vocabulary: VocabularyWord[] = [
  ...group(0, ["tarrak", "vosh", "krenn", "ulash", "drivek"],
              ["mellu", "sooma", "aloven", "quissa", "nimbar"]),
  ...group(1, ["hakku", "tovril", "sennat", "blikka", "ormesh"],
              ["vaneth", "luppo", "ishara", "karnok", "dweshi"]),
  ...group(2, ["pellum", "torva", "ganneth", "ussik", "brimo"],
              ["ledda", "oxxin", "favuun", "mirrek", "saanth"]),
  ...group(3, ["chullo", "arvek", "nembu", "tisshak", "oradda"],
              ["welvin", "murrash", "kippa", "yandor", "essulo"]),
];

const YES_NO = { 0: "no", 1: "yes" };

const attributes: AttributeConfig[] = [
  {
    key: "voices_raised",
    label: "Voices raised",
    description: "Whether any participant noticeably increased their volume during the exchange.",
    type: "binary",
    pathway: 0,
    targetR: 0.65,
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
    pathway: 1,
    targetR: 0.35,
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
    pathway: 2,
    targetR: 0.15,
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
    pathway: null,
    targetR: 0,
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
    pathway: null,
    targetR: 0,
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
    pathway: 3,
    targetR: 0.65,
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
    pathway: null,
    targetR: 0,
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
    pathway: null,
    targetR: 0,
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
    pathway: null,
    targetR: 0,
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

/**
 * Material that maps to no attribute at all. Without it a reader could recover
 * the entire attribute set from the notes and the coding exercise would collapse
 * into reading answers off a menu.
 */
const fillerFragments: string[] = [
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

export const alienConfig: AlienConfig = {
  seed: 20260803,
  conversationCount: 800,
  pathwayCount: 4,
  fitName: "alien-fa-4",
  reviewSetName: "alien",
  reviewSetDescription: "Generated alien-language conversations with observer field notes",
  outputDir: "dist/alien-data",

  minTurns: 3,
  maxTurns: 6,
  minWords: 12,
  maxWords: 40,
  tiltLambda: 0.8,

  vocabulary,
  targetVarianceShares: [0.55, 0.2, 0.15, 0.1],

  attributes,

  biasAttributeKey: "resource_stressed",
  truthPathway: 0,
  errorRateWhenBiasOn: 0.2,
  errorRateWhenBiasOff: 0.03,
  logitScale: 2.5,

  fillerFragments,
  minFillerPerNote: 2,
  maxFillerPerNote: 4,

  thresholds: {
    correlationTolerance: 0.02,
    // Judges 24 decoy-by-pathway correlations, each with a standard error near
    // 0.035, so the largest of them lands around 0.09 on a typical reseed. A
    // threshold of 0.08 would fail half the time on data that is entirely fine.
    decoyMax: 0.15,
    pathwayOrthogonalityMax: 0.12,
    truthBiasMax: 0.08,
    detectableBiasMin: 0.2,
    minWordOccurrences: 100,
    shapTolerance: 1e-9,
  },
};
