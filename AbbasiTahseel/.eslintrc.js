module.exports = {
  root: true,
  extends: ['@react-native', 'prettier'],
  plugins: ['import'],
  rules: {
    // ─── Strictness ─────────────────────────────────────────────────────────
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/no-unused-vars': [
      'error',
      { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
    ],
    '@typescript-eslint/consistent-type-imports': 'warn',

    // ─── Imports ────────────────────────────────────────────────────────────
    'import/order': [
      'warn',
      {
        groups: [
          'builtin',
          'external',
          'internal',
          'parent',
          'sibling',
          'index',
          'type',
        ],
        'newlines-between': 'always',
        alphabetize: { order: 'asc', caseInsensitive: true },
      },
    ],
    'import/no-cycle': 'error',
    'import/no-default-export': 'off',

    // ─── React Native ───────────────────────────────────────────────────────
    'react-native/no-inline-styles': 'warn',
    'react-native/no-color-literals': 'off', // we control via theme + lint review
    'react-native/no-raw-text': 'off',

    // ─── Console ────────────────────────────────────────────────────────────
    'no-console': ['warn', { allow: ['warn', 'error'] }],
  },
  ignorePatterns: ['node_modules/', 'android/', 'ios/', 'build/', 'dist/'],
};
