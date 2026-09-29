// Checks that the student-facing import boundary in eslint.config.mjs still catches violations.
// A zone that matches no files is silent, so a config refactor could otherwise disable it unnoticed.
// Run with `npm run lint:boundary`. This is not a jest test because ESLint loads its .mjs config
// with a dynamic import.
import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { ESLint } from "eslint";

const root = import.meta.dirname;
// Two throwaway views. They must exist before the config loads, since it lists the view folders.
const viewA = path.join(root, "src/views/boundary-test-a");
const viewB = path.join(root, "src/views/boundary-test-b");

let eslint;

before(() => {
  fs.mkdirSync(path.join(viewA, "sub"), { recursive: true });
  fs.mkdirSync(viewB, { recursive: true });
  fs.writeFileSync(path.join(viewA, "sub/inner.js"), "export const inner = 1;\n");
  fs.writeFileSync(path.join(viewB, "b.js"), "export const b = 1;\n");
  // import/no-cycle crashes on lintText input.
  eslint = new ESLint({ cwd: root, overrideConfig: { rules: { "import/no-cycle": "off" } } });
});

after(() => {
  fs.rmSync(viewA, { recursive: true, force: true });
  fs.rmSync(viewB, { recursive: true, force: true });
});

// Lints `code` as if it lived at `file` and returns the boundary errors.
async function boundaryErrors(file, code) {
  const [result] = await eslint.lintText(code, { filePath: path.join(root, file) });
  return result.messages.filter(m => m.ruleId === "import/no-restricted-paths"
    || m.ruleId === "@eslint-community/eslint-comments/no-restricted-disable");
}

const forbidden = [
  ["src/core/x.js", "../lab/shared/data-loader"],
  ["src/core/x.js", "../../scripts/alien/checks"],
  ["src/core/x.js", "../test/setupTests"],
  ["src/core/x.js", "../../playwright.config"],
  ["src/core/x.js", "../app/README.md"],
  ["src/core/x.js", "../views/boundary-test-b/b"],
  ["src/core/x.mjs", "../lab/shared/data-loader"],
  ["src/views/boundary-test-a/x.js", "../../lab/shared/data-loader"],
  ["src/views/boundary-test-a/x.js", "../../app/README.md"],
  ["src/views/boundary-test-a/x.js", "../boundary-test-b/b"],
  ["src/views/x.js", "./boundary-test-b/b"],
  ["src/app/x.js", "../lab/shared/data-loader"],
  ["src/app/x.js", "../../scripts/alien/checks"],
];

const allowed = [
  ["src/core/x.js", "react"],
  ["src/core/x.js", "node:fs"],
  ["src/core/x.js", "./README.md"],
  ["src/views/boundary-test-a/x.js", "./sub/inner"],
  ["src/views/boundary-test-a/x.js", "../../core/README.md"],
  ["src/app/x.js", "../views/boundary-test-b/b"],
  ["src/app/x.js", "../core/README.md"],
  ["src/lab/x.js", "../../scripts/alien/checks"],
];

describe("student-facing import boundary", () => {
  for (const [file, source] of forbidden) {
    it(`forbids ${file} importing ${source}`, async () => {
      const errors = await boundaryErrors(file, `export * from "${source}";\n`);
      assert.equal(errors.length, 1, JSON.stringify(errors));
    });
  }

  for (const [file, source] of allowed) {
    it(`allows ${file} importing ${source}`, async () => {
      const errors = await boundaryErrors(file, `export * from "${source}";\n`);
      assert.deepEqual(errors, []);
    });
  }

  it("forbids disabling the rule in student-facing code", async () => {
    const code = `// eslint-disable-next-line import/no-restricted-paths\nexport * from "../lab/shared/data-loader";\n`;
    const errors = await boundaryErrors("src/core/x.js", code);
    assert.deepEqual(errors.map(e => e.ruleId), ["@eslint-community/eslint-comments/no-restricted-disable"]);
  });
});
