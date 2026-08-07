import { AlienConfig } from "./alien/config-types";
import {
  BASE_ATTRIBUTES, FILLER_FRAGMENTS, THRESHOLDS, WORD_GROUPS, groupBuilder, withPathwayAssignments,
} from "./alien/config-common";

/**
 * Pathway weight scales, solved numerically for the 55/20/15/10 variance split.
 * There is no closed form: the word-selection tilt is itself proportional to the
 * weight, so variance rises faster than scale^2 and sqrt(share) undershoots the
 * lower pathways badly.
 */
const FOUR_SCALE = [1.0, 0.7912, 0.7308, 0.6546];
const fourGroup = groupBuilder(FOUR_SCALE);

export const fourPathwayConfig: AlienConfig = {
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

  vocabulary: [
    ...fourGroup(0, WORD_GROUPS[0]),
    ...fourGroup(1, WORD_GROUPS[1]),
    ...fourGroup(2, WORD_GROUPS[2]),
    ...fourGroup(3, WORD_GROUPS[3]),
  ],
  targetVarianceShares: [0.55, 0.2, 0.15, 0.1],

  attributes: withPathwayAssignments(BASE_ATTRIBUTES, {
    voices_raised: { pathway: 0, targetR: 0.65 },
    engaged_in_task: { pathway: 1, targetR: 0.35 },
    group_size: { pathway: 2, targetR: 0.15 },
    near_water: { pathway: null, targetR: 0 },
    food_present: { pathway: null, targetR: 0 },
    resource_stressed: { pathway: 3, targetR: 0.65 },
    gestures_repeated: { pathway: null, targetR: 0 },
    young_present: { pathway: null, targetR: 0 },
    carrying_burden: { pathway: null, targetR: 0 },
  }),

  biasAttributeKey: "resource_stressed",
  truthPathway: 0,
  errorRateWhenBiasOn: 0.2,
  errorRateWhenBiasOff: 0.03,
  logitScale: 2.5,

  fillerFragments: FILLER_FRAGMENTS,
  minFillerPerNote: 2,
  maxFillerPerNote: 4,

  thresholds: THRESHOLDS,
};

/**
 * Untuned: these are the four-pathway scales for P0, P1 and the bias pathway,
 * carried over unchanged so this config runs before the split is solved. The
 * realized variance will not match targetVarianceShares until the scales are
 * re-solved.
 */
const THREE_SCALE = [1.0, 0.7912, 0.6546];
const threeGroup = groupBuilder(THREE_SCALE);

export const threePathwayConfig: AlienConfig = {
  seed: 20260803,
  conversationCount: 800,
  pathwayCount: 3,
  fitName: "alien-fa-3",
  reviewSetName: "alien3",
  reviewSetDescription:
    "Generated alien-language conversations with observer field notes, three-pathway variant",
  outputDir: "dist/alien-data-3",

  minTurns: 3,
  maxTurns: 6,
  minWords: 12,
  maxWords: 40,
  tiltLambda: 0.8,

  vocabulary: [
    ...threeGroup(0, WORD_GROUPS[0]),
    ...threeGroup(1, WORD_GROUPS[1]),
    // The fourth group keeps its words and moves to P2, so the words a student
    // reads when they filter high bias-pathway scores are the same ten in both
    // datasets. WORD_GROUPS[2] is dropped along with the pathway group_size
    // tracked in the four-pathway set.
    ...threeGroup(2, WORD_GROUPS[3]),
  ],
  targetVarianceShares: [0.55, 0.35, 0.1],

  attributes: withPathwayAssignments(BASE_ATTRIBUTES, {
    voices_raised: { pathway: 0, targetR: 0.65 },
    engaged_in_task: { pathway: 1, targetR: 0.35 },
    group_size: { pathway: null, targetR: 0 },
    near_water: { pathway: null, targetR: 0 },
    food_present: { pathway: null, targetR: 0 },
    resource_stressed: { pathway: 2, targetR: 0.65 },
    gestures_repeated: { pathway: null, targetR: 0 },
    young_present: { pathway: null, targetR: 0 },
    carrying_burden: { pathway: null, targetR: 0 },
  }),

  biasAttributeKey: "resource_stressed",
  truthPathway: 0,
  errorRateWhenBiasOn: 0.2,
  errorRateWhenBiasOff: 0.03,
  logitScale: 2.5,

  fillerFragments: FILLER_FRAGMENTS,
  minFillerPerNote: 2,
  maxFillerPerNote: 4,

  thresholds: THRESHOLDS,
};

/** Every dataset `npm run generate:alien` emits, in the order it emits them. */
export const alienConfigs: AlienConfig[] = [fourPathwayConfig, threePathwayConfig];
