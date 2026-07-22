import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // One-shot operational tooling, frozen after the completed production data
    // migration (2026-07-23) — deliberately not linted so it is never edited
    // to satisfy style rules.
    "scripts/migrate-legacy/**",
  ]),
]);

export default eslintConfig;
