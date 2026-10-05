import { restScene } from "./extract-scene";
import { setupDuration, setupSceneAt } from "./setup-timeline";

const SIZES = [10, 8, 6, 2];

describe("Setup", () => {
  it("takes 3,416 ms", () => {
    expect(setupDuration(SIZES)).toBe(3416);
  });

  it("dims everything but the hidden neurons over the first 350 ms", () => {
    expect(setupSceneAt(SIZES, 0).network.dim).toBe(1);
    const partway = setupSceneAt(SIZES, 175).network.dim;
    expect(partway).toBeGreaterThan(0.5);
    expect(partway).toBeLessThan(1);
    expect(setupSceneAt(SIZES, 350).network.dim).toBe(0.5);
  });

  it("lifts the copies out at 550 ms", () => {
    expect(setupSceneAt(SIZES, 549).lifted).toBeUndefined();
    expect(setupSceneAt(SIZES, 550).lifted).toEqual({ flight: 0, opacity: 1, labelOpacity: 0 });
    expect(setupSceneAt(SIZES, 1000).lifted?.flight).toBe(450);
    expect(setupSceneAt(SIZES, 2900).lifted?.flight).toBe(2166);
  });

  it("brings the network back and fades the label in from 2,976 ms", () => {
    expect(setupSceneAt(SIZES, 2975).network.dim).toBe(0.5);
    const midway = setupSceneAt(SIZES, 2976 + 160);
    expect(midway.network.dim).toBeGreaterThan(0.5);
    expect(midway.network.dim).toBeLessThan(1);
    expect(midway.lifted?.labelOpacity).toBeGreaterThan(0);
    expect(midway.lifted?.labelOpacity).toBeLessThan(1);
  });

  it("ends on the scene at rest with Setup done", () => {
    expect(setupSceneAt(SIZES, setupDuration(SIZES))).toEqual(restScene(SIZES, 1));
  });
});
