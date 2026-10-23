import eslint from '@eslint/js';
import { configs } from 'typescript-eslint';
import { flatConfigs as importConfigs } from 'eslint-plugin-import-x';
import eslintPluginPrettier from 'eslint-plugin-prettier/recommended';

/** @type {import('@typescript-eslint/utils').TSESLint.FlatConfig.ConfigFile} */
export default [
  { ignores: ['lib/'] },
  eslint.configs.recommended,
  ...configs.recommended,
  importConfigs.recommended,
  importConfigs.typescript,
  eslintPluginPrettier,
  {
    rules: {
      'import-x/no-cycle': 'error',
      '@typescript-eslint/consistent-type-imports': 'error'
    }
  }
];
