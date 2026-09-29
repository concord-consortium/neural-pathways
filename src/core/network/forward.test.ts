import { forward, predictedClass } from "./forward";
import { toyNetwork } from "./toy-network";
import fixture from "./__fixtures__/toy-network-conversations.json";

interface FixtureConversation {
  id: string;
  text: string;
  classification: number;
  expected?: { layers: number[][] };
}

const conversations = fixture.conversations as FixtureConversation[];

describe("forward", () => {
  it("returns word presence and one array per layer", () => {
    const pass = forward(toyNetwork, conversations[0].text);
    expect(pass.input).toHaveLength(30);
    expect(pass.layers.map(layer => layer.length)).toEqual([10, 8, 6, 2]);
  });

  it("marks exactly the vocabulary words present", () => {
    const { input } = forward(toyNetwork, "yandor aloven");
    expect(input[toyNetwork.vocabulary.indexOf("aloven")]).toBe(1);
    expect(input[toyNetwork.vocabulary.indexOf("yandor")]).toBe(1);
    expect(input.reduce((sum, x) => sum + x, 0)).toBe(2);
  });

  it("counts a repeated word once", () => {
    expect(forward(toyNetwork, "hakku hakku tovril")).toEqual(forward(toyNetwork, "hakku tovril"));
  });

  it("ignores unknown words and splits on any whitespace", () => {
    expect(forward(toyNetwork, "hakku\nzzz   tovril")).toEqual(forward(toyNetwork, "hakku tovril"));
  });

  it.each(conversations)("predicts the model's class for $id", ({ text, classification }) => {
    expect(predictedClass(forward(toyNetwork, text))).toBe(classification);
  });

  it("reproduces the prototype's values", () => {
    const checked = conversations.filter(c => c.expected);
    expect(checked).toHaveLength(2);
    for (const { text, expected } of checked) {
      const pass = forward(toyNetwork, text);
      expected!.layers.forEach((layer, l) => {
        layer.forEach((value, u) => expect(pass.layers[l][u]).toBeCloseTo(value, 5));
      });
    }
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
