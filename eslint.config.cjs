const { FlatCompat } = require('@eslint/eslintrc');
const compat = new FlatCompat({ baseDirectory: __dirname });

module.exports = [
  { ignores: ['.next/**', '.vercel/**', 'node_modules/**', '.playwright-results/**', 'playwright-report/**', 'next-env.d.ts'] },
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
  { files: ['**/*.cjs', 'postcss.config.js'], rules: { '@typescript-eslint/no-require-imports': 'off' } },
];
