// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*'],
  },
  {
    files: ['src/widgets/index.ts', 'src/test/**', '**/__tests__/**'],
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
]);
