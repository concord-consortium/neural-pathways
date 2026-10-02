import "./setup";
import { Model, model, tProp, types } from "mobx-keystone";

/**
 * The state every view reads and writes, carried from one interactive to the next in the Activity
 * Player. Fields arrive with the view stories that first use them; see docs/view-state.md. Adding
 * a field with a default is not a new version.
 *
 * The `$modelType` is stored in saved student data: never rename it.
 */
@model("npw/SharedState")
export class SharedState extends Model({
  version: tProp(types.literal(1), 1),
}) {}
