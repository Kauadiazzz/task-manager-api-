import { execSync } from 'node:child_process';
import type { TestProject } from 'vitest/node';

// Creates the test database if needed and applies all migrations before any test file runs.
export default function setup(project: TestProject): void {
  const databaseUrl = project.config.env.DATABASE_URL;
  execSync('npx prisma migrate deploy', {
    env: { ...process.env, DATABASE_URL: databaseUrl },
    stdio: 'ignore',
  });
}
