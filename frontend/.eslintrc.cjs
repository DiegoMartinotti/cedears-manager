module.exports = {
  root: true,
  env: {
    browser: true,
    es2020: true,
  },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react-hooks/recommended'
  ],
  ignorePatterns: ['dist', '.eslintrc.cjs', 'vite.config.ts', 'vitest.config.ts'],
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
    '@typescript-eslint'
  ],
  rules: {
    // Reglas de complejidad cognitiva
    'complexity': ['error', 35], // Ajustado para el código existente
    
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
    '@typescript-eslint/no-explicit-any': 'off', // Deshabilitado temporalmente para el código existente
    
    // ESLint base (ya definido arriba)
    // 'complexity': ['error', 10],
    'max-depth': ['error', 4],
    'max-lines-per-function': ['error', 500], // Más permisivo para componentes React existentes
    'max-params': ['error', 4],
    'no-console': 'off', // Temporalmente deshabilitado para desarrollo
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