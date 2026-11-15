import { expect, it, vi } from 'vitest';

it('returns 429 after too many auth attempts', async () => {
  // env.ts was already loaded by the setup file, so reload modules to pick up the lower limit.
  vi.stubEnv('AUTH_RATE_LIMIT_MAX', '3');
  vi.resetModules();
  const { api } = await import('./helpers.js');

  const attempt = () => api().post('/auth/login').send({ email: 'x@example.com', password: 'whatever' });
  for (let i = 0; i < 3; i += 1) {
    expect((await attempt()).status).toBe(401);
  }

  const blocked = await attempt();
  expect(blocked.status).toBe(429);
  expect(blocked.body.error.code).toBe('TOO_MANY_REQUESTS');
});
