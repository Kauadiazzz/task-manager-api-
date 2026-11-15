import { describe, expect, it } from 'vitest';
import { prisma } from '../src/lib/prisma.js';
import { api, bearer, createProject, createTask, registerUser } from './helpers.js';

type TaskBody = { id: string; title: string };
const titles = (body: { data: TaskBody[] }) => body.data.map((task) => task.title);

describe('task creation and update', () => {
  it('creates a task with defaults', async () => {
    const { token } = await registerUser();
    const project = await createProject(token);
    const res = await api().post(`/projects/${project.id}/tasks`).set(bearer(token)).send({ title: 'Write docs' });

    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({
      title: 'Write docs',
      description: null,
      priority: 'MEDIUM',
      status: 'PENDING',
      dueDate: null,
      projectId: project.id,
    });
    expect(res.body.data.createdAt).toEqual(expect.any(String));
    expect(res.body.data.updatedAt).toEqual(expect.any(String));
  });

  it('creates a task with all fields', async () => {
    const { token } = await registerUser();
    const project = await createProject(token);
    const res = await api().post(`/projects/${project.id}/tasks`).set(bearer(token)).send({
      title: 'Deploy',
      description: 'Ship v1',
      priority: 'HIGH',
      status: 'IN_PROGRESS',
      dueDate: '2026-12-01T12:00:00-03:00',
    });

    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({
      priority: 'HIGH',
      status: 'IN_PROGRESS',
      dueDate: '2026-12-01T15:00:00.000Z',
    });
  });

  it('returns 422 for invalid priority, status or date', async () => {
    const { token } = await registerUser();
    const project = await createProject(token);
    const res = await api()
      .post(`/projects/${project.id}/tasks`)
      .set(bearer(token))
      .send({ title: 'X', priority: 'URGENT', status: 'DONE', dueDate: 'tomorrow' });

    expect(res.status).toBe(422);
    expect(Object.keys(res.body.error.details.fieldErrors)).toEqual(
      expect.arrayContaining(['priority', 'status', 'dueDate']),
    );
  });

  it('updates a task and refreshes updatedAt', async () => {
    const { token } = await registerUser();
    const project = await createProject(token);
    const task = await createTask(token, project.id, { title: 'Draft', dueDate: '2026-12-01T00:00:00Z' });
    const before = await prisma.task.findUniqueOrThrow({ where: { id: task.id } });

    const res = await api()
      .patch(`/tasks/${task.id}`)
      .set(bearer(token))
      .send({ status: 'COMPLETED', title: 'Final', dueDate: null });

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ status: 'COMPLETED', title: 'Final', dueDate: null });
    expect(new Date(res.body.data.updatedAt).getTime()).toBeGreaterThan(before.updatedAt.getTime());
  });

  it('returns 422 for an empty update', async () => {
    const { token } = await registerUser();
    const project = await createProject(token);
    const task = await createTask(token, project.id);
    expect((await api().patch(`/tasks/${task.id}`).set(bearer(token)).send({})).status).toBe(422);
  });

  it('gets and deletes a task', async () => {
    const { token } = await registerUser();
    const project = await createProject(token);
    const task = await createTask(token, project.id);

    expect((await api().get(`/tasks/${task.id}`).set(bearer(token))).body.data.id).toBe(task.id);
    expect((await api().delete(`/tasks/${task.id}`).set(bearer(token))).status).toBe(204);
    expect((await api().get(`/tasks/${task.id}`).set(bearer(token))).status).toBe(404);
  });
});

describe('task isolation between users', () => {
  it("returns 404 for another user's task and leaves it untouched", async () => {
    const owner = await registerUser();
    const intruder = await registerUser();
    const project = await createProject(owner.token);
    const task = await createTask(owner.token, project.id, { title: 'Secret' });
    const path = `/tasks/${task.id}`;

    expect((await api().get(path).set(bearer(intruder.token))).status).toBe(404);
    expect((await api().patch(path).set(bearer(intruder.token)).send({ title: 'Hacked' })).status).toBe(404);
    expect((await api().delete(path).set(bearer(intruder.token))).status).toBe(404);

    const unchanged = await prisma.task.findUniqueOrThrow({ where: { id: task.id } });
    expect(unchanged.title).toBe('Secret');
  });

  it("never lists another user's tasks, even when filtering by their project", async () => {
    const owner = await registerUser();
    const intruder = await registerUser();
    const project = await createProject(owner.token);
    await createTask(owner.token, project.id);

    const all = await api().get('/tasks').set(bearer(intruder.token));
    const byProject = await api().get(`/tasks?projectId=${project.id}`).set(bearer(intruder.token));

    expect(all.body.meta.total).toBe(0);
    expect(byProject.body.meta.total).toBe(0);
  });
});

describe('task filters, search, sorting and pagination', () => {
  async function seed() {
    const { token } = await registerUser();
    const work = await createProject(token, { name: 'Work' });
    const home = await createProject(token, { name: 'Home' });
    await createTask(token, work.id, { title: 'Fix login bug', priority: 'HIGH', status: 'IN_PROGRESS', dueDate: '2026-12-03T00:00:00Z' });
    await createTask(token, work.id, { title: 'Write report', priority: 'LOW', status: 'PENDING', dueDate: '2026-12-01T00:00:00Z' });
    await createTask(token, home.id, { title: 'Buy groceries', priority: 'HIGH', status: 'COMPLETED' });
    await createTask(token, home.id, { title: 'Fix sink', priority: 'MEDIUM', status: 'PENDING', dueDate: '2026-12-02T00:00:00Z' });
    return { token, work, home };
  }

  it('filters by status', async () => {
    const { token } = await seed();
    const res = await api().get('/tasks?status=PENDING').set(bearer(token));
    expect(titles(res.body).sort()).toEqual(['Fix sink', 'Write report']);
  });

  it('filters by priority', async () => {
    const { token } = await seed();
    const res = await api().get('/tasks?priority=HIGH').set(bearer(token));
    expect(titles(res.body).sort()).toEqual(['Buy groceries', 'Fix login bug']);
  });

  it('filters by project', async () => {
    const { token, home } = await seed();
    const res = await api().get(`/tasks?projectId=${home.id}`).set(bearer(token));
    expect(titles(res.body).sort()).toEqual(['Buy groceries', 'Fix sink']);
  });

  it('searches the title case-insensitively and combines filters', async () => {
    const { token } = await seed();
    const search = await api().get('/tasks?search=FIX').set(bearer(token));
    expect(titles(search.body).sort()).toEqual(['Fix login bug', 'Fix sink']);

    const combined = await api().get('/tasks?search=fix&priority=HIGH').set(bearer(token));
    expect(titles(combined.body)).toEqual(['Fix login bug']);
  });

  it('treats LIKE wildcards in the search as literal text', async () => {
    const { token, work } = await seed();
    for (const wildcard of ['%25', '_', '%5C']) {
      // "%", "_" and "\"
      const res = await api().get(`/tasks?search=${wildcard}`).set(bearer(token));
      expect(res.body.meta.total, wildcard).toBe(0);
    }

    await createTask(token, work.id, { title: 'Reach 100% coverage' });
    const literal = await api().get('/tasks?search=100%25').set(bearer(token));
    expect(titles(literal.body)).toEqual(['Reach 100% coverage']);
  });

  it('sorts by due date with tasks without a due date last', async () => {
    const { token } = await seed();
    const asc = await api().get('/tasks?sortBy=dueDate&order=asc').set(bearer(token));
    expect(titles(asc.body)).toEqual(['Write report', 'Fix sink', 'Fix login bug', 'Buy groceries']);

    const desc = await api().get('/tasks?sortBy=dueDate&order=desc').set(bearer(token));
    expect(titles(desc.body)).toEqual(['Fix login bug', 'Fix sink', 'Write report', 'Buy groceries']);
  });

  it('sorts by creation date, newest first by default', async () => {
    const { token } = await seed();
    const res = await api().get('/tasks').set(bearer(token));
    expect(titles(res.body)).toEqual(['Fix sink', 'Buy groceries', 'Write report', 'Fix login bug']);

    const asc = await api().get('/tasks?order=asc').set(bearer(token));
    expect(titles(asc.body)).toEqual(['Fix login bug', 'Write report', 'Buy groceries', 'Fix sink']);
  });

  it('paginates with limit and offset', async () => {
    const { token } = await seed();
    const res = await api().get('/tasks?order=asc&limit=2&offset=1').set(bearer(token));

    expect(res.body.meta).toEqual({ total: 4, limit: 2, offset: 1 });
    expect(titles(res.body)).toEqual(['Write report', 'Buy groceries']);
  });

  it('returns 422 for invalid query parameters', async () => {
    const { token } = await registerUser();
    for (const query of ['status=DONE', 'priority=URGENT', 'sortBy=title', 'order=up', 'projectId=abc', 'offset=-1']) {
      expect((await api().get(`/tasks?${query}`).set(bearer(token))).status, query).toBe(422);
    }
  });
});
