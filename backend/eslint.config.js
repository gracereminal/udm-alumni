import js from '@eslint/js';
import globals from 'globals';

export default [
  { ignores: ['node_modules', 'uploads', '.pgdata', '.pgtest-template', 'coverage'] },
  js.configs.recommended,
  {
    languageOptions: { ecmaVersion: 2024, sourceType: 'module', globals: { ...globals.node } },
    rules: { 'no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }] },
  },
];
