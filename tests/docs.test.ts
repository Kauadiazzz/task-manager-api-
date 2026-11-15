import { expect, it } from 'vitest';
import { api } from './helpers.js';

it('serves an OpenAPI document covering every route', async () => {
  const res = await api().get('/docs/openapi.json');

  expect(res.status).toBe(200);
  expect(res.body.openapi).toBe('3.1.0');
  expect(Object.keys(res.body.paths).sort()).toEqual([
    '/auth/login',
    '/auth/register',
    '/projects',
    '/projects/{id}',
    '/projects/{projectId}/tasks',
    '/tasks',
    '/tasks/{id}',
    '/users/me',
    '/users/me/password',
  ]);
  expect(res.body.paths['/auth/login'].post.security).toEqual([]);
  expect(res.body.paths['/tasks'].get.security).toEqual([{ bearerAuth: [] }]);
});

it('serves the Swagger UI', async () => {
  const res = await api().get('/docs/');
  expect(res.status).toBe(200);
  expect(res.text).toContain('swagger-ui');
});
