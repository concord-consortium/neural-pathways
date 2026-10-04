import "../../core/state/setup";
import { Model, model, modelAction, tProp, types } from "mobx-keystone";
import { Animated, animationProps, Speed } from "../../core/state/animation";

/** How many of Trace a Case's four steps are done: none to all. */
const stepsDoneType = types.refinement(types.integer, n => n >= 0 && n <= 4, "steps done, 0 to 4");

/**
 * Trace a Case's own state. The current conversation is in SharedState. Adding a field with a
 * default is not a new version.
 *
 * The `$modelType` is stored in saved student data: never rename it.
 */
@model("npw/TraceACaseState")
export class TraceACaseState extends Model({
  version: tProp(types.literal(1), 1),
  /**
   * Steps done for each conversation, by conversation id. A step still playing isn't counted, and
   * a conversation with none done isn't stored.
   */
  stepsByConversation: tProp(types.record(stepsDoneType), () => ({})),
  ...animationProps,
}) implements Animated {
  stepsDone(conversationId: string): number {
    return this.stepsByConversation[conversationId] ?? 0;
  }

  @modelAction
  setStepsDone(conversationId: string, stepsDone: number) {
    if (stepsDone === 0) {
      delete this.stepsByConversation[conversationId];
    } else {
      this.stepsByConversation[conversationId] = stepsDone;
    }
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
