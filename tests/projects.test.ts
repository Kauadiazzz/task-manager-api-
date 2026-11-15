import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { prisma } from '../src/lib/prisma.js';
import { api, bearer, createProject, createTask, registerUser } from './helpers.js';

describe('projects CRUD', () => {
  it('requires authentication', async () => {
    expect((await api().get('/projects')).status).toBe(401);
    expect((await api().post('/projects').send({ name: 'X' })).status).toBe(401);
  });

  it('creates a project owned by the user', async () => {
    const { token, user } = await registerUser();
    const res = await api().post('/projects').set(bearer(token)).send({ name: ' Website ', description: 'Redesign' });

    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ name: 'Website', description: 'Redesign', ownerId: user.id });
  });

  it('returns 422 for invalid data', async () => {
    const { token } = await registerUser();
    const res = await api().post('/projects').set(bearer(token)).send({ name: '' });

    expect(res.status).toBe(422);
    expect(res.body.error.details.fieldErrors).toHaveProperty('name');
  });

  it('gets, updates and deletes a project', async () => {
    const { token } = await registerUser();
    const project = await createProject(token);

    const fetched = await api().get(`/projects/${project.id}`).set(bearer(token));
    expect(fetched.status).toBe(200);
    expect(fetched.body.data.id).toBe(project.id);

    const updated = await api()
      .patch(`/projects/${project.id}`)
      .set(bearer(token))
      .send({ name: 'Renamed', description: null });
    expect(updated.status).toBe(200);
    expect(updated.body.data).toMatchObject({ name: 'Renamed', description: null });

    expect((await api().delete(`/projects/${project.id}`).set(bearer(token))).status).toBe(204);
    expect((await api().get(`/projects/${project.id}`).set(bearer(token))).status).toBe(404);
  });

  it('deletes the tasks of a deleted project', async () => {
    const { token } = await registerUser();
    const project = await createProject(token);
    await createTask(token, project.id);

    await api().delete(`/projects/${project.id}`).set(bearer(token)).expect(204);
    expect(await prisma.task.count({ where: { projectId: project.id } })).toBe(0);
  });

  it('returns 422 for a malformed id and 404 for an unknown one', async () => {
    const { token } = await registerUser();
    expect((await api().get('/projects/not-a-uuid').set(bearer(token))).status).toBe(422);
    expect((await api().get(`/projects/${randomUUID()}`).set(bearer(token))).status).toBe(404);
  });

  it('lists only the user projects with pagination metadata', async () => {
    const owner = await registerUser();
    const other = await registerUser();
    for (const name of ['A', 'B', 'C']) await createProject(owner.token, { name });
    await createProject(other.token, { name: 'Not mine' });

    const page = await api().get('/projects?limit=2&offset=0').set(bearer(owner.token));
    expect(page.status).toBe(200);
    expect(page.body.meta).toEqual({ total: 3, limit: 2, offset: 0 });
    expect(page.body.data).toHaveLength(2);

    const rest = await api().get('/projects?limit=2&offset=2').set(bearer(owner.token));
    expect(rest.body.data).toHaveLength(1);
    const names = [...page.body.data, ...rest.body.data].map((p: { name: string }) => p.name);
    expect(names.sort()).toEqual(['A', 'B', 'C']);
  });

  it('rejects an out-of-range limit', async () => {
    const { token } = await registerUser();
    expect((await api().get('/projects?limit=101').set(bearer(token))).status).toBe(422);
  });
});

describe('project isolation between users', () => {
  it("returns 404 when reading, updating or deleting another user's project", async () => {
    const owner = await registerUser();
    const intruder = await registerUser();
    const project = await createProject(owner.token, { name: 'Private' });
    const path = `/projects/${project.id}`;

    expect((await api().get(path).set(bearer(intruder.token))).status).toBe(404);
    expect((await api().patch(path).set(bearer(intruder.token)).send({ name: 'Hacked' })).status).toBe(404);
    expect((await api().delete(path).set(bearer(intruder.token))).status).toBe(404);

    const unchanged = await prisma.project.findUniqueOrThrow({ where: { id: project.id } });
    expect(unchanged.name).toBe('Private');
  });

  it("does not allow creating tasks in another user's project", async () => {
    const owner = await registerUser();
    const intruder = await registerUser();
    const project = await createProject(owner.token);

    const res = await api().post(`/projects/${project.id}/tasks`).set(bearer(intruder.token)).send({ title: 'Sneaky' });
    expect(res.status).toBe(404);
    expect(await prisma.task.count()).toBe(0);
  });

  it('ignores an ownerId sent in the body', async () => {
    const owner = await registerUser();
    const other = await registerUser();
    const res = await api().post('/projects').set(bearer(owner.token)).send({ name: 'Mine', ownerId: other.user.id });

    expect(res.status).toBe(201);
    expect(res.body.data.ownerId).toBe(owner.user.id);
  });
});
