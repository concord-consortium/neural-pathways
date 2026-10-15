import fs from "fs";
import path from "path";
import about from "../views/correlations/about.md";

it("imports an .md file as its text, as webpack's asset/source rule does", () => {
  expect(about).toBe(fs.readFileSync(path.join(__dirname, "../views/correlations/about.md"), "utf8"));
});
