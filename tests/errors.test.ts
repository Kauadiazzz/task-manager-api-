import { expect, it, vi } from 'vitest';
import { projectsRepository } from '../src/modules/projects/projects.repository.js';
import { api, bearer, registerUser } from './helpers.js';

it('returns 404 in the standard format for an unknown route', async () => {
  const res = await api().get('/does-not-exist');
  expect(res.status).toBe(404);
  expect(res.body).toEqual({ error: { code: 'NOT_FOUND', message: 'Route not found' } });
});

it('returns 413 instead of 500 for an oversized body', async () => {
  const res = await api()
    .post('/auth/register')
    .send({ name: 'x'.repeat(200_000), email: 'big@example.com', password: 'password123' });
  expect(res.status).toBe(413);
  expect(res.body.error.code).toBe('BAD_REQUEST');
});

it('hides internal error details behind a generic 500', async () => {
  const { token } = await registerUser();
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(projectsRepository, 'create').mockRejectedValueOnce(new Error('connection to 10.0.0.5 failed'));

  const res = await api().post('/projects').set(bearer(token)).send({ name: 'Boom' });

  expect(res.status).toBe(500);
  expect(res.body).toEqual({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } });
  vi.restoreAllMocks();
});

it('sets security headers and hides the framework', async () => {
  const res = await api().get('/does-not-exist');
  expect(res.headers['x-powered-by']).toBeUndefined();
  expect(res.headers['content-security-policy']).toBeDefined();
  expect(res.headers['x-content-type-options']).toBe('nosniff');
});
