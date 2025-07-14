import { defineConfig, globalIgnores } from "eslint/config";
import globals from "globals";
import stylistic from "@stylistic/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import simpleImportSort from "eslint-plugin-simple-import-sort";
import eslintPluginUnicorn from "eslint-plugin-unicorn";

export default defineConfig([
    {
        files: ["**/*.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"],
        languageOptions: {
            parser: tsParser,
            parserOptions: {
                ecmaFeatures: { jsx: true },
                ecmaVersion: 2020,
                sourceType: "module",
            },
            globals: globals.node,
        },
        plugins: {
            unicorn: eslintPluginUnicorn,
            "simple-import-sort": simpleImportSort,
            "@stylistic": stylistic
        },
        rules: {
            "unicorn/filename-case": ["error", { case: "kebabCase" }],
            "simple-import-sort/imports": "error",
            "simple-import-sort/exports": "error",
            "@stylistic/brace-style": [2, "allman", { allowSingleLine: true }],
            "@stylistic/quotes": [2, "double"]
        },
    },
    globalIgnores(["**/.next*", "**/out*", "**/dist*", "**/node_modules*", "**/.git*"]),
]);
