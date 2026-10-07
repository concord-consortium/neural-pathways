import { S3Index } from "../types/s3-data";
import { forward, ForwardPass } from "./forward";
import { Network } from "./network";
import { networkScales, NetworkScales } from "./network-scales";

export interface IndexPasses {
  /** One per item, in index order. */
  passes: ForwardPass[];
  scales: NetworkScales;
}

/** By network, then by index. useDatasetIndex keeps an index for the life of the page. */
const cache = new WeakMap<Network, WeakMap<S3Index, IndexPasses>>();

/**
 * Every item's pass through `network`, and the scales over all of them, computed once per network
 * and index. For alien3 that is 800 passes and a sort over every edge of every pass, too slow to
 * repeat each time a view mounts.
 */
export function indexPasses(network: Network, index: S3Index): IndexPasses {
  let byIndex = cache.get(network);
  if (!byIndex) {
    byIndex = new WeakMap();
    cache.set(network, byIndex);
  }
  let result = byIndex.get(index);
  if (!result) {
    const passes = index.items.map(item => forward(network, item.text));
    result = { passes, scales: networkScales(network, passes) };
    byIndex.set(index, result);
  }
  return result;
}
