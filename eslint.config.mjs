import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import globals from "globals";

export default tseslint.config(
  {
    ignores: [
      "**/dist/**",
      "**/node_modules/**",
      "**/*.wasm",
      "**/.turbo/**",
      "**/bun.lock",
      "**/*.lock",
      "**/*.js",
    ],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  ...tseslint.configs.strict,
  {
    files: ["**/*.ts", "**/*.tsx"],
    languageOptions: {
      globals: globals.node,
    },
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          "argsIgnorePattern": "^_",
          "varsIgnorePattern": "^_",
          "caughtErrorsIgnorePattern": "^_",
        },
      ],
      "@typescript-eslint/no-explicit-any": "warn",
    },
  },
  {
    files: ["cli/src/**/*.{ts,tsx}"],
    languageOptions: {
      globals: { ...globals.node, ...globals.browser },
    },
  },
  // Examples can use any for simplicity
  {
    files: ["**/examples/**/*.ts"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
  // Tools and MCP client use any for dynamic tool input/API types
  {
    files: [
      "**/packages/agent/src/tools/**/*.ts",
      "**/packages/agent/src/mcp/**/*.ts",
      "**/packages/agent/src/providers/**/*.ts",
      "**/packages/agent/src/tool-helper.ts",
      "**/packages/agent/src/sdk-mcp-server.ts",
      "**/packages/agent/src/types.ts",
      "**/packages/agent/src/utils/messages.ts",
      "**/packages/agent/src/utils/compact.ts",
      "**/packages/agent/src/utils/retry.ts",
      "**/packages/agent/src/utils/tokens.ts",
      "**/packages/agent/src/engine.ts",
      "**/packages/agent/src/agent.ts",
      "**/packages/agent/src/hooks.ts",
      "**/packages/blueprint/src/**/*.ts",
    ],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
);
