import { getSnapshot } from "mobx-keystone";
import { Speed, SPEED_STOPS } from "./animation";

/**
 * A tree's snapshot as it would be saved: through JSON, which drops the `undefined` values
 * `getSnapshot` keeps for unset optional props.
 */
export function savedJson(node: object): unknown {
  return JSON.parse(JSON.stringify(getSnapshot(node)));
}

/** A speed by the name the slider shows under it, for tests. */
export function speedNamed(name: typeof SPEED_STOPS[number]["name"]): Speed {
  return SPEED_STOPS.find(stop => stop.name === name)!.key;
}
