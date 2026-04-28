import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: ["**/*.test.ts", "**/*.test.tsx"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "tmp-foundation/**",
    "playwright-report/**",
    "test-results/**",
    // Vendored, minified third-party browser assets.
    "public/vendor/pdfjs/**",
    // One-off migration/utility scripts
    "patch_schema.js",
    "resolve.js",
    "resolver.js",
    // Sentry bootstrap files — Sentry's star-re-exports cause irresolvable TS ambiguity;
    // these are thin startup stubs verified at runtime, not application logic.
    "instrumentation.ts",
    "instrumentation-client.ts",
  ]),
]);

export default eslintConfig;
