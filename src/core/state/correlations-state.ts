import { Model, model, modelAction, tProp, types } from "mobx-keystone";

/** The Correlations views' modes. The values are stored in saved student data: never change them. */
export const CORRELATIONS_MODES = ["measures", "graphs"] as const;
export type CorrelationsMode = typeof CORRELATIONS_MODES[number];

/** The open detail card: one cell of the matrix, or a whole pathway column. */
export type OpenDetail =
  | { kind: "cell"; attribute: string; pathway: number }
  | { kind: "pathway"; pathway: number };

const openDetailType = types.or(
  types.object(() => ({ kind: types.literal("cell"), attribute: types.string, pathway: types.integer })),
  types.object(() => ({ kind: types.literal("pathway"), pathway: types.integer })),
);

/**
 * The state of Correlations, and of Correlations Part 2 as a separate tree. The query is in
 * SharedState. A cell is stored by attribute key, not row position, because Part 2's rows include
 * the commissioned codings. The `$modelType` is stored in saved student data: never rename it.
 */
@model("npw/CorrelationsState")
export class CorrelationsState extends Model({
  version: tProp(types.literal(1), 1),
  mode: tProp(types.or(...CORRELATIONS_MODES.map(mode => types.literal(mode))), "measures"),
  openDetail: tProp(types.maybe(openDetailType)),
}) {
  @modelAction
  setMode(mode: CorrelationsMode) {
    this.mode = mode;
  }

  @modelAction
  openDetailCard(detail: OpenDetail) {
    this.openDetail = detail;
  }

  @modelAction
  closeDetailCard() {
    this.openDetail = undefined;
  }
}
