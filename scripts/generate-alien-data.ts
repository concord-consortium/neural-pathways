import * as path from "path";
import { alienConfig } from "./alien-config";
import { checksPassed, runChecks } from "./alien/checks";
import { writeDataset } from "./alien/emit";
import { generate } from "./alien/pipeline";
import { formatSummary } from "./alien/summary";

function main(): void {
  const run = generate(alienConfig);
  const checks = runChecks(run);
  const outputDir = path.resolve(__dirname, "..", alienConfig.outputDir);

  writeDataset(outputDir, run.dataset);
  console.log(formatSummary(run, checks));
  console.log("");
  console.log(`wrote ${run.dataset.index.reviews.length} conversations to ${outputDir}`);

  if (!checksPassed(checks)) {
    console.error("");
    console.error("One or more self-checks failed. The dataset was written so you can inspect it, "
      + "but it should not be shipped in this state.");
    process.exitCode = 1;
  }
}

main();
