import { Model, model, modelAction, tProp, types } from "mobx-keystone";
import { Animated, animationProps, countType, Speed } from "./animation";

/**
 * Trace a Case's own state. The query and the current conversation are in SharedState.
 * The `$modelType` is stored in saved student data: never rename it.
 */
@model("npw/TraceACaseState")
export class TraceACaseState extends Model({
  version: tProp(types.literal(1), 1),
  /** Steps done for each conversation stepped so far, by conversation id. */
  stepsByConversation: tProp(types.record(countType), () => ({})),
  ...animationProps,
}) implements Animated {
  @modelAction
  setStep(conversationId: string, stepsDone: number) {
    this.stepsByConversation[conversationId] = stepsDone;
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
