// @ts-check
import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import globals from "globals";
import { fileURLToPath } from "node:url";
import path from "node:path";

// Avoid Node-version coupling: import.meta.dirname needs Node >=20.11.
// Use fileURLToPath + path.dirname to stay compatible with Node 18 LTS.
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Filter recommendedTypeChecked to only apply to .ts files
const typeCheckedConfigs = tseslint.configs.recommendedTypeChecked.map(
  (config) => {
    if (!config.files && config.rules) {
      // Add files filter to type-checked rules that don't have one
      return {
        ...config,
        files: ["**/*.ts", "**/*.tsx", "**/*.mts", "**/*.cts"],
      };
    }
    return config;
  },
);

export default [
  {
    ignores: [
      "dist/**",
      "node_modules/**",
      ".cache/**",
      "OTHER_REPOS/**",
      "*.config.js",
      "*.config.mjs",
      "tests/playwright/test_interaction_index.mjs",
      "tests/playwright/test_layout_metrics.mjs",
    ],
  },
  eslint.configs.recommended,
  {
    files: ["**/*.ts"],
    languageOptions: {
      parserOptions: {
        project: ["./tsconfig.json"],
        tsconfigRootDir: __dirname,
      },
      globals: { ...globals.browser, ...globals.node },
    },
  },
  ...typeCheckedConfigs,
  {
    files: ["**/*.ts"],
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          args: "after-used",
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrors: "all",
          caughtErrorsIgnorePattern: "^_",
          destructuredArrayIgnorePattern: "^_",
        },
      ],
      "@typescript-eslint/explicit-function-return-type": "warn",
      "@typescript-eslint/no-floating-promises": "error",
      "no-var": "error",
      "prefer-const": "error",
      "no-implicit-coercion": "warn",
      eqeqeq: "error",
      "no-throw-literal": "error",
      "no-console": "warn",
      "preserve-caught-error": "warn",
    },
  },
  {
    files: ["**/*.mjs", "**/*.js", "**/*.cjs"],
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
    },
    rules: {
      "no-var": "error",
      "prefer-const": "error",
      "no-implicit-coercion": "warn",
      eqeqeq: "error",
      "no-throw-literal": "error",
      "no-console": "warn",
      "no-unused-vars": [
        "error",
        {
          args: "after-used",
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrors: "all",
          caughtErrorsIgnorePattern: "^_",
          destructuredArrayIgnorePattern: "^_",
        },
      ],
      "preserve-caught-error": "warn",
    },
  },
];
