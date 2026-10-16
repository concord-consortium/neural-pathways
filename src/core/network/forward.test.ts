import { forward, predictedClass, wordCounts } from "./forward";
import { fixtureNetwork } from "./__fixtures__/alien3-network";
import fixture from "./__fixtures__/alien3-conversations.json";

const conversations = fixture.conversations;

describe("wordCounts", () => {
  it("counts each vocabulary word, in vocabulary order", () => {
    expect(wordCounts(["b", "a", "c"], "a b a\na")).toEqual([1, 3, 0]);
  });

  it("ignores words outside the vocabulary and splits on any whitespace", () => {
    expect(wordCounts(["a", "b"], "a\tzzz   b\nzzz a")).toEqual([2, 1]);
  });
});

describe("forward", () => {
  it("returns word counts and one array per layer", () => {
    const pass = forward(fixtureNetwork, conversations[0].text);
    expect(pass.input).toEqual(wordCounts(fixtureNetwork.vocabulary, conversations[0].text));
    expect(pass.layers.map(layer => layer.length)).toEqual([10, 8, 6, 2]);
  });

  it("feeds a repeated word its count", () => {
    const { input } = forward(fixtureNetwork, "hakku hakku tovril hakku");
    expect(input[fixtureNetwork.vocabulary.indexOf("hakku")]).toBe(3);
    expect(input[fixtureNetwork.vocabulary.indexOf("tovril")]).toBe(1);
    expect(input.reduce((sum, x) => sum + x, 0)).toBe(4);
  });

  it("ignores unknown words and splits on any whitespace", () => {
    expect(forward(fixtureNetwork, "hakku\nzzz   tovril")).toEqual(forward(fixtureNetwork, "hakku tovril"));
  });

  it.each(conversations)("predicts the model's class for $id", ({ text, classification }) => {
    expect(predictedClass(forward(fixtureNetwork, text))).toBe(classification);
  });
});

describe("predictedClass", () => {
  it("picks the larger logit", () => {
    expect(predictedClass({ input: [], layers: [[0.3, -2]] })).toBe(0);
    expect(predictedClass({ input: [], layers: [[-1, 0.5]] })).toBe(1);
  });

  it("picks the first class on a tie", () => {
    expect(predictedClass({ input: [], layers: [[0.5, 0.5]] })).toBe(0);
  });
});
