/** What is picked: a lifted neuron (0-13) or a pathway (0-2), or nothing. */
export type Pick = { kind: "neuron" | "pathway"; index: number } | undefined;

/** Whether loading (neuron, pathway) is lit: all of them when nothing is picked. */
export function isLit(pick: Pick, neuron: number, pathway: number): boolean {
  if (!pick) {
    return true;
  }
  return pick.index === (pick.kind === "neuron" ? neuron : pathway);
}

/** Whether two picks are the same item, or both empty. */
export function samePick(a: Pick, b: Pick): boolean {
  return a?.kind === b?.kind && a?.index === b?.index;
}

/** Picking the picked item again clears the pick; anything else picks it. */
export function togglePick(pick: Pick, next: NonNullable<Pick>): Pick {
  return samePick(pick, next) ? undefined : next;
}
