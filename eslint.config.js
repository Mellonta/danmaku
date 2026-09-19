import js from "@eslint/js";
import tseslint from "@typescript-eslint/eslint-plugin";
import { defineConfig } from "eslint/config";

export default defineConfig(
  {
    ignores: ["dist/**", "node_modules/**"],
  },
  {
    files: ["src/**/*.{ts,tsx}"],
    extends: [
      js.configs.recommended,
      tseslint.configs["flat/strict-type-checked"],
      tseslint.configs["flat/stylistic-type-checked"],
    ],
    languageOptions: {
      parserOptions: {
        project: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      strict: ["error", "global"],
      "@typescript-eslint/no-floating-promises": [
        "error",
        { ignoreIIFE: true },
      ],
      // Preserve the existing interpolation and loop rules during this upgrade.
      "@typescript-eslint/restrict-template-expressions": [
        "error",
        { allowNumber: true, allowNullish: true },
      ],
      "@typescript-eslint/prefer-regexp-exec": "off",
      "no-constant-condition": ["error", { checkLoops: "all" }],
    },
  },
);
