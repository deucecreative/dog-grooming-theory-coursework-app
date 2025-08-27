const { FlatCompat } = require('@eslint/eslintrc');

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.config({
    extends: ['next/core-web-vitals', 'next/typescript'],
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          'argsIgnorePattern': '^_',
          'varsIgnorePattern': '^_',
          'caughtErrorsIgnorePattern': '^_'
        }
      ],
      // Allow require imports in config files
      '@typescript-eslint/no-require-imports': 'off'
    }
  }),
  {
    ignores: [
      '.next/**',
      'node_modules/**',
      'coverage/**',
      'vitest.config.*',
      'vitest.*.config.*',
      'next.config.*',
      'tailwind.config.ts',
      'scripts/**',
      'next-env.d.ts',
      'tsconfig.tsbuildinfo',
      '.claude/hooks/**',
    ],
  }
];

module.exports = eslintConfig;