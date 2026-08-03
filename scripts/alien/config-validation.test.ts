import { alienConfig } from "../alien-config";
import { validateConfig } from "./config-validation";
import { AlienConfig } from "./config-types";

function clone(): AlienConfig {
  return JSON.parse(JSON.stringify(alienConfig)) as AlienConfig;
}

describe("validateConfig", () => {
  it("accepts the shipped config", () => {
    expect(() => validateConfig(alienConfig)).not.toThrow();
  });

  it("rejects a duplicate vocabulary word", () => {
    const config = clone();
    config.vocabulary[1].word = config.vocabulary[0].word;
    expect(() => validateConfig(config)).toThrow(/duplicate vocabulary word/i);
  });

  it("rejects a word with weight in two pathways", () => {
    const config = clone();
    config.vocabulary[0].weights[1] = 0.4;
    expect(() => validateConfig(config)).toThrow(/exactly one pathway/i);
  });

  it("rejects a pathway group that is not symmetric under negation", () => {
    const config = clone();
    config.vocabulary[0].weights[0] = -config.vocabulary[0].weights[0];
    expect(() => validateConfig(config)).toThrow(/symmetric under negation/i);
  });

  it("rejects value shares that do not sum to one", () => {
    const config = clone();
    config.attributes[0].valueShares = [0.5, 0.4];
    expect(() => validateConfig(config)).toThrow(/sum to 1/i);
  });

  it("rejects a value with fewer than two note fragments", () => {
    const config = clone();
    config.attributes[0].notes[1] = ["only one"];
    expect(() => validateConfig(config)).toThrow(/at least two note fragments/i);
  });

  it("rejects a fragment reused across attributes", () => {
    const config = clone();
    config.attributes[1].notes[1][0] = config.attributes[0].notes[1][0];
    expect(() => validateConfig(config)).toThrow(/fragment/i);
  });

  it("rejects a fragment that contains another fragment", () => {
    const config = clone();
    config.fillerFragments[0] = `Note: ${config.attributes[0].notes[0][0]} And more.`;
    expect(() => validateConfig(config)).toThrow(/substring/i);
  });

  it("rejects an empty outputDir", () => {
    const config = clone();
    config.outputDir = "";
    expect(() => validateConfig(config)).toThrow(/outputDir/i);
  });

  it("rejects an outputDir of \".\"", () => {
    const config = clone();
    config.outputDir = ".";
    expect(() => validateConfig(config)).toThrow(/outputDir/i);
  });

  it("rejects an absolute outputDir", () => {
    const config = clone();
    config.outputDir = "/tmp/alien-data";
    expect(() => validateConfig(config)).toThrow(/outputDir/i);
  });

  it("rejects an outputDir that escapes via ..", () => {
    const config = clone();
    config.outputDir = "../alien-data";
    expect(() => validateConfig(config)).toThrow(/outputDir/i);
  });

  it("rejects an unknown bias attribute key", () => {
    const config = clone();
    config.biasAttributeKey = "nope";
    expect(() => validateConfig(config)).toThrow(/bias attribute/i);
  });

  it("rejects a bias attribute that is not binary", () => {
    const config = clone();
    config.attributes.find(a => a.key === "resource_stressed")!.type = "integer";
    expect(() => validateConfig(config)).toThrow(/binary/i);
  });

  it("rejects an attribute key that collides with a reserved search field", () => {
    const config = clone();
    config.attributes[0].key = "text";
    expect(() => validateConfig(config)).toThrow(/reserved/i);
  });
});
