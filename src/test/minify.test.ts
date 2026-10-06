import { minify } from "terser";

// The production build minifies with these options; the dev server and Jest don't minify at all.
const { terserOptions } = require("../../webpack.config");

const source = `
  globalThis.minifyTestResult = (() => {
    class SharedState {}
    return SharedState.name;
  })();
`;

async function classNameAfterMinifying(options: object) {
  const { code } = await minify(source, options);
  new Function(code!)();
  return (globalThis as any).minifyTestResult;
}

describe("production minifying", () => {
  it("keeps class names", async () => {
    expect(await classNameAfterMinifying(terserOptions)).toBe("SharedState");
  });

  it("would rename them with terser's defaults, so the option matters", async () => {
    expect(await classNameAfterMinifying({})).not.toBe("SharedState");
  });
});
