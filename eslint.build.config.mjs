import { defineConfig } from "eslint/config";
import baseConfig from "./eslint.config.mjs";

// build/production configuration extends default/development configuration
export default defineConfig(
  ...baseConfig,
  {
    files: ["**/*.{js,mjs,ts,tsx,jsx}"],
    rules: {
      "@eslint-community/eslint-comments/no-unused-disable": "warn",
      "no-console": ["warn", { allow: ["warn", "error"] }],
      "no-debugger": "error"
    }
  },
  {
    // The generator and analysis scripts report by printing, so the no-console rule above does
    // not apply to them (the base config turns it off there too).
    files: ["generator/**/*.ts", "scripts/**/*.ts"],
    rules: {
      "no-console": "off"
    }
  }
);
