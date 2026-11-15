import { defineConfig } from 'vitest/config';

const testDatabaseUrl =
  process.env.TEST_DATABASE_URL ?? 'postgresql://taskmanager:taskmanager@localhost:5432/taskmanager_test?schema=public';

export default defineConfig({
  test: {
    globalSetup: ['tests/global-setup.ts'],
    setupFiles: ['tests/setup.ts'],
    // All test files share one database, so they must not run concurrently.
    fileParallelism: false,
    env: {
      NODE_ENV: 'test',
      DATABASE_URL: testDatabaseUrl,
      JWT_SECRET: 'test-secret-that-is-long-enough-for-hs256-signing',
      JWT_EXPIRES_IN: '1h',
      BCRYPT_ROUNDS: '4',
      AUTH_RATE_LIMIT_MAX: '1000',
    },
  },
});
