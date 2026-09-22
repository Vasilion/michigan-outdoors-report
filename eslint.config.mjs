import coreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";
import tseslint from "typescript-eslint";

const NO_ASYNC_MESSAGE =
  "async/await is banned by the project code standard. Use synchronous code, or .then() chains where Promises are unavoidable.";

const bannedSyntax = [
  { selector: "FunctionDeclaration[async=true]", message: NO_ASYNC_MESSAGE },
  { selector: "FunctionExpression[async=true]", message: NO_ASYNC_MESSAGE },
  { selector: "ArrowFunctionExpression[async=true]", message: NO_ASYNC_MESSAGE },
  { selector: "AwaitExpression", message: NO_ASYNC_MESSAGE },
  { selector: "ForOfStatement[await=true]", message: NO_ASYNC_MESSAGE },
];

const config = [
  ...coreWebVitals,
  ...nextTypescript,
  {
    ignores: [
      ".next/**",
      "out/**",
      "node_modules/**",
      "raw-cache/**",
      "public/generated/**",
      "next-env.d.ts",
      "coverage/**",
    ],
  },
  {
    files: ["**/*.ts", "**/*.tsx"],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: { ecmaVersion: "latest", sourceType: "module" },
    },
    plugins: { "@typescript-eslint": tseslint.plugin },
    rules: {
      "no-restricted-syntax": ["error", ...bannedSyntax],
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/explicit-function-return-type": [
        "error",
        {
          allowExpressions: false,
          allowTypedFunctionExpressions: true,
          allowHigherOrderFunctions: false,
          allowDirectConstAssertionInArrowFunctions: true,
        },
      ],
      "@typescript-eslint/typedef": [
        "error",
        {
          arrayDestructuring: false,
          arrowParameter: true,
          memberVariableDeclaration: true,
          objectDestructuring: false,
          parameter: true,
          propertyDeclaration: true,
          variableDeclaration: true,
          variableDeclarationIgnoreFunction: true,
        },
      ],
      "@typescript-eslint/consistent-type-imports": [
        "error",
        { prefer: "type-imports", fixStyle: "inline-type-imports" },
      ],
      eqeqeq: ["error", "always"],
      "prefer-const": "error",
      "no-var": "error",
    },
  },
  {
    files: [
      "src/lib/data/schemas.ts",
      "importers/curated/parse.ts",
      "src/components/ui/*.tsx",
    ],
    rules: {
      "@typescript-eslint/typedef": "off",
    },
  },
];

export default config;
