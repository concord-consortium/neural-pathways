import { Model, model, modelAction, tProp, types } from "mobx-keystone";
import { Animated, animationProps, Speed } from "./animation";

/** The chain's last step: 0 is the empty skeleton, and each of the four buttons fills in one more. */
export const PREDICTION_CHAIN_LAST_STEP = 4;

const stepType = types.refinement(
  types.integer, n => n >= 0 && n <= PREDICTION_CHAIN_LAST_STEP, `integer from 0 to ${PREDICTION_CHAIN_LAST_STEP}`
);

/**
 * Prediction Chain's own state. The query and the current conversation are in SharedState.
 * The `$modelType` is stored in saved student data: never rename it.
 */
@model("npw/PredictionChainState")
export class PredictionChainState extends Model({
  version: tProp(types.literal(1), 1),
  /** The step each conversation is on, by conversation id. */
  stepByConversation: tProp(types.record(stepType), () => ({})),
  ...animationProps,
}) implements Animated {
  @modelAction
  setStep(conversationId: string, step: number) {
    this.stepByConversation[conversationId] = step;
  }

  @modelAction
  setAnimate(animate: boolean) {
    this.animate = animate;
  }

  @modelAction
  setSpeed(speed: Speed) {
    this.speed = speed;
  }
}
