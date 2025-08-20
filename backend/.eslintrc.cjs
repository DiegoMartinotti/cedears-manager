module.exports = {
  root: true,
  env: {
    node: true,
    es2022: true,
  },
  extends: [
    'eslint:recommended',
    '@typescript-eslint/recommended',
    'plugin:sonarjs/recommended'
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    project: './tsconfig.json'
  },
  plugins: [
    '@typescript-eslint',
    'sonarjs'
  ],
  rules: {
    // Reglas de complejidad cognitiva
    'sonarjs/cognitive-complexity': ['error', 15],
    
    // Reglas contra duplicación
    'sonarjs/no-identical-functions': 'error',
    'sonarjs/no-duplicate-string': 'error',
    'sonarjs/no-duplicated-branches': 'error',
    
    // Reglas adicionales de calidad
    'sonarjs/max-switch-cases': ['error', 30],
    'sonarjs/no-nested-switch': 'error',
    'sonarjs/no-nested-template-literals': 'error',
    'sonarjs/prefer-immediate-return': 'error',
    'sonarjs/no-redundant-boolean': 'error',
    'sonarjs/no-useless-catch': 'error',
    'sonarjs/no-collapsible-if': 'error',
    
    // TypeScript específicas
    '@typescript-eslint/no-unused-vars': ['error', { 
      argsIgnorePattern: '^_',
      varsIgnorePattern: '^_' 
    }],
    '@typescript-eslint/explicit-function-return-type': 'warn',
    '@typescript-eslint/no-explicit-any': 'warn',
    
    // ESLint base
    'complexity': ['error', 10],
    'max-depth': ['error', 4],
    'max-lines-per-function': ['error', 50],
    'max-params': ['error', 4],
    'no-console': 'warn',
    'prefer-const': 'error',
    'no-var': 'error'
  },
  ignorePatterns: [
    'dist/**/*',
    'node_modules/**/*',
    '*.js',
    '*.d.ts'
  ]
};