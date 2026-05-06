import js from '@eslint/js';
import typescript from '@typescript-eslint/eslint-plugin';
import typescriptParser from '@typescript-eslint/parser';
import prettier from 'eslint-plugin-prettier';
import prettierConfig from 'eslint-config-prettier';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';

// Known design token colors that are allowed
const ALLOWED_COLORS = new Set([
  'transparent',
  'currentColor',
  'inherit',
  // Hex patterns that match design tokens
  '#000000',
  '#ffffff',
  '#0a0a0a',
  '#1a1a1a',
  '#fcb131',
  '#f39c12',
  '#ffed4e', // Primary
  '#10b981',
  '#059669',
  '#6ee7b7', // Success
  '#ef4444',
  '#dc2626',
  '#fecaca', // Error
  '#f59e0b',
  '#d97706', // Warning
  '#3b82f6',
  '#1d4ed8', // Info
]);

export default [
  {
    ignores: [
      '.next/**',
      'dist/**',
      'node_modules/**',
      'build/**',
      '*.min.js',
      'next/.next/**',
      '**/node_modules/**',
      '**/.next/**',
      'e2e/**',
    ],
  },
  {
    files: ['next/src/**/*.{js,jsx,ts,tsx}'],
    languageOptions: {
      parser: typescriptParser,
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        console: 'readonly',
        process: 'readonly',
        Buffer: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        module: 'readonly',
        require: 'readonly',
        exports: 'readonly',
        global: 'readonly',
        window: 'readonly',
        document: 'readonly',
      },
    },
    plugins: {
      '@typescript-eslint': typescript,
      react: react,
      'react-hooks': reactHooks,
    },
    rules: {
      // Allow any for pragmatic cases
      '@typescript-eslint/no-explicit-any': 'off',

      // Allow unused variables with underscore prefix
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],

      // Nudge toward const without blocking
      'prefer-const': 'warn',

      // Turn off overly strict rules
      'no-undef': 'off', // TypeScript handles this
      'no-unused-vars': 'off', // Use TypeScript version instead
      '@typescript-eslint/no-unused-expressions': 'off',

      // React rules
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',

      // No hardcoded colors in JSX (allow design tokens)
      'no-restricted-syntax': [
        'error',
        {
          selector:
            'JSXAttribute[name.name="style"] > JSXElement > Literal[value=/:[\\s\\S]*#[a-fA-F0-9]{6}/]',
          message:
            'Use designTokens or Tailwind classes instead of hardcoded colors in style attributes',
        },
      ],

      // Warn on specific hardcoded hex colors
      'no-warning-comments': [
        'warn',
        { terms: ['TODO:.*#fcb131', 'TODO:.*#[a-fA-F0-9]{6}'], location: 'any' },
      ],
    },
  },
];
