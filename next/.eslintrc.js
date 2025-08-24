module.exports = {
  extends: "next/core-web-vitals",
  parser: "@typescript-eslint/parser",
  plugins: ["@typescript-eslint"],
  rules: {
    // Disable any type errors completely
    "@typescript-eslint/no-explicit-any": "off",

    // Allow unused variables with underscore prefix
    "@typescript-eslint/no-unused-vars": [
      "error",
      {
        argsIgnorePattern: "^_",
        varsIgnorePattern: "^_",
      },
    ],

    // Set react-hooks/exhaustive-deps to warn instead of error
    "react-hooks/exhaustive-deps": "warn",

    // Configure ts-comment rules
    "@typescript-eslint/ban-ts-comment": [
      "error",
      {
        "ts-expect-error": "allow-with-description",
        "ts-ignore": "allow-with-description",
      },
    ],

    // Prefer const but don't error on it
    "prefer-const": "warn",
  },
};
