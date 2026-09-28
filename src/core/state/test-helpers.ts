import { getSnapshot } from "mobx-keystone";

/**
 * A tree's snapshot as it would be saved: through JSON, which drops the `undefined` values
 * `getSnapshot` keeps for unset optional props.
 */
export function savedJson(node: object): unknown {
  return JSON.parse(JSON.stringify(getSnapshot(node)));
}
