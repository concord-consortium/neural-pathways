import { S3Index, S3Item } from "../types/s3-data";
import { forward } from "./forward";
import { indexPasses } from "./index-passes";
import { Network } from "./network";
import { networkScales } from "./network-scales";
import { toyNetwork } from "./toy-network";
import fixture from "./__fixtures__/toy-network-conversations.json";

function indexOf(conversations: { id: string; text: string }[]): S3Index {
  const items = conversations.map(({ id, text }) => ({ id, text }) as S3Item);
  return { metadata: { fa_fits: {}, review_sets: {} }, items };
}

const index = indexOf(fixture.conversations.slice(0, 4));

describe("indexPasses", () => {
  it("runs every item through the network, in index order, with the scales over them", () => {
    const expected = index.items.map(item => forward(toyNetwork, item.text));
    expect(indexPasses(toyNetwork, index)).toEqual({ passes: expected, scales: networkScales(toyNetwork, expected) });
  });

  it("computes once per network and index", () => {
    const first = indexPasses(toyNetwork, index);
    expect(indexPasses(toyNetwork, index)).toBe(first);
    expect(indexPasses(toyNetwork, indexOf(fixture.conversations.slice(0, 4)))).not.toBe(first);
    const otherNetwork: Network = { ...toyNetwork };
    expect(indexPasses(otherNetwork, index)).not.toBe(first);
  });
});
