module.exports = {
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/strict-type-checked', 'plugin:@typescript-eslint/stylistic-type-checked'],
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  parserOptions: {
    project: true,
    tsconfigRootDir: __dirname,
  },
  root: true,
  rules: {
    "strict": ["error", "global"],
    "@typescript-eslint/no-floating-promises": ["error", { ignoreIIFE: true }],
  }
};
