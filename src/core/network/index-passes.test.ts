import { S3Index, S3Item } from "../types/s3-data";
import { forward } from "./forward";
import { indexPasses } from "./index-passes";
import { Network } from "./network";
import { networkScales } from "./network-scales";
import { fixtureNetwork } from "./__fixtures__/alien3-network";
import fixture from "./__fixtures__/alien3-conversations.json";

function indexOf(conversations: { id: string; text: string }[]): S3Index {
  const items = conversations.map(({ id, text }) => ({ id, text }) as S3Item);
  return { metadata: { fa_fits: {}, review_sets: {} }, items };
}

const index = indexOf(fixture.conversations.slice(0, 4));

describe("indexPasses", () => {
  it("runs every item through the network, in index order, with the scales over them", () => {
    const expected = index.items.map(item => forward(fixtureNetwork, item.text));
    expect(indexPasses(fixtureNetwork, index))
      .toEqual({ passes: expected, scales: networkScales(fixtureNetwork, expected) });
  });

  it("computes once per network and index", () => {
    const first = indexPasses(fixtureNetwork, index);
    expect(indexPasses(fixtureNetwork, index)).toBe(first);
    expect(indexPasses(fixtureNetwork, indexOf(fixture.conversations.slice(0, 4)))).not.toBe(first);
    const otherNetwork: Network = { ...fixtureNetwork };
    expect(indexPasses(otherNetwork, index)).not.toBe(first);
  });
});
