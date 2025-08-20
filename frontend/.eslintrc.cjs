module.exports = {
  root: true,
  env: {
    browser: true,
    es2020: true,
  },
  extends: [
    'eslint:recommended',
    '@typescript-eslint/recommended',
    'plugin:react-hooks/recommended',
    'plugin:sonarjs/recommended'
  ],
  ignorePatterns: ['dist', '.eslintrc.cjs'],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true
    },
    project: './tsconfig.json'
  },
  plugins: [
    'react-refresh',
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
    
    // Reglas adicionales de calidad SonarJS
    'sonarjs/max-switch-cases': ['error', 30],
    'sonarjs/no-nested-switch': 'error',
    'sonarjs/no-nested-template-literals': 'error',
    'sonarjs/prefer-immediate-return': 'error',
    'sonarjs/no-redundant-boolean': 'error',
    'sonarjs/no-useless-catch': 'error',
    'sonarjs/no-collapsible-if': 'error',
    'sonarjs/no-small-switch': 'error',
    
    // React específicas
    'react-refresh/only-export-components': [
      'warn',
      { allowConstantExport: true },
    ],
    
    // TypeScript específicas
    '@typescript-eslint/no-unused-vars': ['error', { 
      argsIgnorePattern: '^_',
      varsIgnorePattern: '^_' 
    }],
    '@typescript-eslint/explicit-function-return-type': 'off', // Más flexible en React
    '@typescript-eslint/no-explicit-any': 'warn',
    
    // ESLint base
    'complexity': ['error', 10],
    'max-depth': ['error', 4],
    'max-lines-per-function': ['error', 100], // Más permisivo para componentes React
    'max-params': ['error', 4],
    'no-console': 'warn',
    'prefer-const': 'error',
    'no-var': 'error',
    
    // JSX específicas
    'jsx-quotes': ['error', 'prefer-double'],
    'react-hooks/exhaustive-deps': 'warn'
  },
  settings: {
    react: {
      version: '18.2'
    }
  }
};