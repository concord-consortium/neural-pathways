import * as path from "path";
import { alienConfigs } from "./alien-config";
import { checksPassed, runChecks } from "./alien/checks";
import { writeDataset } from "./alien/emit";
import { generate } from "./alien/pipeline";
import { formatSummary } from "./alien/summary";

function main(): void {
  let anyFailed = false;

  for (const config of alienConfigs) {
    const run = generate(config);
    const checks = runChecks(run);
    const outputDir = path.resolve(__dirname, "..", config.outputDir);

    writeDataset(outputDir, run.dataset);
    console.log(formatSummary(run, checks));
    console.log("");
    console.log(`wrote ${run.dataset.index.reviews.length} conversations to ${outputDir}`);
    console.log("");

    if (!checksPassed(checks)) {
      anyFailed = true;
      console.error(`Self-checks failed for "${config.fitName}".`);
      console.error("");
    }
  }

  if (anyFailed) {
    console.error("One or more self-checks failed. Every dataset above was written so you can "
      + "inspect it, but a failing one should not be shipped in this state.");
    process.exitCode = 1;
  }
}

main();
