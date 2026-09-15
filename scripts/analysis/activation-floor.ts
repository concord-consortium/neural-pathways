import { alienConfigs } from "../alien-config";
import { recoveryReport } from "../alien/checks";
import { AlienConfig } from "../alien/config-types";
import { generate } from "../alien/pipeline";

/**
 * Where is the floor? Regenerates each dataset with fewer neurons and less
 * explained variance and reports how well factor analysis recovers the
 * authored pathways. The shipped config is the first row of each table.
 */
const NEURON_COUNTS = [14, 12, 10, 8];
const EXPLAINED_TOTALS = [0.9, 0.8];

function sweep(base: AlienConfig): void {
  console.log(`== ${base.fitName}`);
  console.log("  neurons  explained  " + Array.from({ length: base.pathwayCount }, (_, p) => `P${p}`).join("  "));
  for (const explainedVarianceTotal of EXPLAINED_TOTALS) {
    for (const neuronCount of NEURON_COUNTS) {
      const config: AlienConfig = {
        ...base,
        activations: { ...base.activations, neuronCount, explainedVarianceTotal },
      };
      if ((neuronCount - base.pathwayCount) ** 2 < neuronCount + base.pathwayCount) continue;
      const prefix = `  ${String(neuronCount).padEnd(7)}  ${explainedVarianceTotal.toFixed(1).padEnd(9)}  `;
      try {
        const report = recoveryReport(generate(config));
        const cells = report.map(e =>
          `F${e.factor} r ${e.scoreR.toFixed(2)} cos ${e.loadingCosine.toFixed(2)}`);
        console.log(`${prefix}${cells.join("  ")}`);
      } catch (error) {
        console.log(`${prefix}ERROR: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  }
  console.log("");
}

for (const config of alienConfigs) sweep(config);
