import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  
  // Add these root directory configurations
  rootDir: '.',
  roots: ['<rootDir>/src', '<rootDir>/tests/integration'],
  
  // Configuración explícita para ESM
  globals: {
    'ts-jest': {
      tsconfig: 'tsconfig.json',
      useESM: true
    }
  },
  
  moduleNameMapper: {
    '^@/config$': '<rootDir>/tests/mocks/config.ts',
    '^@/lib/supabase$': '<rootDir>/tests/mocks/supabaseClient.ts',
    '^@/(.*)$': '<rootDir>/src/$1',
    '^(\\.{1,2}/.*)\\.js$': '$1',
    '\\.(css|less|sass|scss)$': 'identity-obj-proxy'
  },

  transformIgnorePatterns: [
    'node_modules/(?!(msw|@mswjs)/)'
  ],
  
  
  extensionsToTreatAsEsm: ['.ts', '.tsx'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  
};

export default config;
