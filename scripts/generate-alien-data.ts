import * as fs from "fs";
import * as path from "path";

const OUTPUT_DIR = path.resolve(__dirname, "..", "dist", "alien-data");

function main(): void {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  fs.writeFileSync(path.join(OUTPUT_DIR, "index.json"), JSON.stringify({ reviews: [] }));
  console.log(`wrote ${OUTPUT_DIR}`);
}

main();
