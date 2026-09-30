import { Model, model, tProp, types } from "mobx-keystone";

/**
 * The state every view reads and writes. In the Activity Player it will be saved alongside each
 * interactive's own state and carried from one interactive to the next.
 *
 * Fields arrive with the view stories that first use them: the current conversation with Trace a
 * Case, the query with the filter, the commissioned codings with Investigate Unknown Pathway. The
 * target is in docs/view-state.md. Adding a field with a default is not a new version.
 *
 * The `$modelType` is stored in saved student data: never rename it.
 */
@model("npw/SharedState")
export class SharedState extends Model({
  version: tProp(types.literal(1), 1),
}) {}
