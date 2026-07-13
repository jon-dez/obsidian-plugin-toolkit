import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.e2e.test.ts'],
    environment: 'node',
    testTimeout: 120_000,
    typecheck: {
      tsconfig: './tsconfig.test.json',
    },
  },
});
