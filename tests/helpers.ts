import request from 'supertest';
import { app } from '../src/app.js';

export const api = () => request(app);

let userCounter = 0;

export async function registerUser(overrides: { name?: string; email?: string; password?: string } = {}) {
  userCounter += 1;
  const credentials = {
    name: overrides.name ?? `User ${userCounter}`,
    email: overrides.email ?? `user${userCounter}@example.com`,
    password: overrides.password ?? 'password123',
  };
  const res = await api().post('/auth/register').send(credentials).expect(201);
  const { user, token } = res.body.data as { user: { id: string; email: string }; token: string };
  return { user, token, credentials };
}

export const bearer = (token: string) => ({ Authorization: `Bearer ${token}` });

export async function createProject(token: string, body: Record<string, unknown> = { name: 'Project' }) {
  const res = await api().post('/projects').set(bearer(token)).send(body).expect(201);
  return res.body.data as { id: string; name: string };
}

export async function createTask(token: string, projectId: string, body: Record<string, unknown> = { title: 'Task' }) {
  const res = await api().post(`/projects/${projectId}/tasks`).set(bearer(token)).send(body).expect(201);
  return res.body.data as { id: string; title: string };
}
