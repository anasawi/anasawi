// Flat config ESLint 9 — remplace `next lint` (déprécié depuis Next 15.3).
// `eslint-config-next` est encore publié au format eslintrc : on passe par
// FlatCompat, comme le fait le template officiel de Next 15.
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { FlatCompat } from '@eslint/eslintrc';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
  {
    // `.next-build` : sortie des builds de validation, lancés à côté du
    // serveur de dev (voir `distDir` dans next.config.ts). Sans cette
    // exclusion, ESLint analyse le code compilé — des milliers d'erreurs.
    ignores: [
      '.next/**',
      '.next-build/**',
      '.storage/**',
      'node_modules/**',
      'drizzle/**',
      'next-env.d.ts',
    ],
  },
];

export default eslintConfig;
