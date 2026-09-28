import { Model, model, modelAction, tProp, types } from "mobx-keystone";
import { animationProps, countType, Speed } from "./animation";

/**
 * Extract Pathways' state: the extraction stages completed so far. A stage in progress is not
 * kept. The `$modelType` is stored in saved student data: never rename it.
 */
@model("npw/ExtractPathwaysState")
export class ExtractPathwaysState extends Model({
  version: tProp(types.literal(1), 1),
  ...animationProps,
  extracted: tProp(types.boolean, false),
  /** How many cases have been collected into the deck. */
  collected: tProp(countType, 0),
  cubeDone: tProp(types.boolean, false),
  pathwaysDone: tProp(types.boolean, false),
}) {
  @modelAction
  setAnimate(animate: boolean) {
    this.animate = animate;
  }

  @modelAction
  setSpeed(speed: Speed) {
    this.speed = speed;
  }

  @modelAction
  setExtracted(extracted: boolean) {
    this.extracted = extracted;
  }

  @modelAction
  setCollected(collected: number) {
    this.collected = collected;
  }

  @modelAction
  setCubeDone(done: boolean) {
    this.cubeDone = done;
  }

  @modelAction
  setPathwaysDone(done: boolean) {
    this.pathwaysDone = done;
  }
}
