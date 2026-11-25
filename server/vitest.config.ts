import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    testTimeout: 30_000,
    env: {
      NODE_ENV: 'test',
      LOG_LEVEL: 'silent',
      JWT_SECRET: 'test-secret-test-secret-test-secret',
      RUN_WORKER_INLINE: 'false',
    },
    coverage: {
      include: [
        'src/services/analysis/**',
        'src/services/generator/**',
        'src/services/crawler/url-guard.ts',
        'src/services/crawler/robots.ts',
      ],
      thresholds: { lines: 70, functions: 70, branches: 70, statements: 70 },
    },
  },
});
