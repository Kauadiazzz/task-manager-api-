import { OpenAPIRegistry, OpenApiGeneratorV31, type RouteConfig } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';
import { Priority, Status } from '../generated/prisma/client.js';
import { loginSchema, registerSchema } from '../modules/auth/auth.schemas.js';
import { createProjectSchema, projectIdParamSchema, updateProjectSchema } from '../modules/projects/projects.schemas.js';
import { createTaskSchema, listTasksQuerySchema, updateTaskSchema } from '../modules/tasks/tasks.schemas.js';
import { changePasswordSchema, updateProfileSchema } from '../modules/users/users.schemas.js';
import { idParamSchema, paginationSchema } from '../utils/schemas.js';

const registry = new OpenAPIRegistry();

registry.registerComponent('securitySchemes', 'bearerAuth', { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' });

// Response shapes (documentation only; request schemas are the same ones the API validates with).
const timestamps = { createdAt: z.iso.datetime(), updatedAt: z.iso.datetime() };
const User = z.object({ id: z.uuid(), name: z.string(), email: z.email(), ...timestamps }).meta({ id: 'User' });
const Project = z
  .object({ id: z.uuid(), name: z.string(), description: z.string().nullable(), ownerId: z.uuid(), ...timestamps })
  .meta({ id: 'Project' });
const Task = z
  .object({
    id: z.uuid(),
    title: z.string(),
    description: z.string().nullable(),
    priority: z.enum(Priority),
    status: z.enum(Status),
    dueDate: z.iso.datetime().nullable(),
    projectId: z.uuid(),
    ...timestamps,
  })
  .meta({ id: 'Task' });
const AuthResult = z.object({ user: User, token: z.string() }).meta({ id: 'AuthResult' });
const ErrorResponse = z
  .object({ error: z.object({ code: z.string(), message: z.string(), details: z.unknown().optional() }) })
  .meta({ id: 'Error' });
const PageMeta = z.object({ total: z.int(), limit: z.int(), offset: z.int() }).meta({ id: 'PageMeta' });

const json = (schema: z.ZodType) => ({ content: { 'application/json': { schema } } });
const ok = (schema: z.ZodType, description = 'OK') => ({ description, ...json(z.object({ data: schema })) });
const page = (schema: z.ZodType) => ({ description: 'OK', ...json(z.object({ data: z.array(schema), meta: PageMeta })) });
const error = (description: string) => ({ description, ...json(ErrorResponse) });
const noContent = { description: 'No content' };

const errors = {
  401: error('Missing, invalid or revoked token'),
  404: error('Not found, or owned by another user'),
  422: error('Validation error'),
};

function route(config: RouteConfig, { isPublic = false } = {}): void {
  registry.registerPath({ ...config, security: isPublic ? [] : [{ bearerAuth: [] }] });
}

route(
  {
    method: 'post',
    path: '/auth/register',
    tags: ['Auth'],
    summary: 'Create an account',
    request: { body: json(registerSchema) },
    responses: { 201: ok(AuthResult, 'Created'), 409: error('Email already registered'), 422: errors[422], 429: error('Too many attempts') },
  },
  { isPublic: true },
);
route(
  {
    method: 'post',
    path: '/auth/login',
    tags: ['Auth'],
    summary: 'Log in and receive a JWT',
    request: { body: json(loginSchema) },
    responses: { 200: ok(AuthResult), 401: error('Invalid email or password'), 422: errors[422], 429: error('Too many attempts') },
  },
  { isPublic: true },
);

route({ method: 'get', path: '/users/me', tags: ['Users'], summary: 'Get my profile', responses: { 200: ok(User), 401: errors[401] } });
route({
  method: 'patch',
  path: '/users/me',
  tags: ['Users'],
  summary: 'Update my profile',
  request: { body: json(updateProfileSchema) },
  responses: { 200: ok(User), 401: errors[401], 409: error('Email already registered'), 422: errors[422] },
});
route({
  method: 'patch',
  path: '/users/me/password',
  tags: ['Users'],
  summary: 'Change my password (revokes existing tokens)',
  request: { body: json(changePasswordSchema) },
  responses: { 204: noContent, 401: error('Invalid token or wrong current password'), 422: errors[422] },
});

route({
  method: 'post',
  path: '/projects',
  tags: ['Projects'],
  summary: 'Create a project',
  request: { body: json(createProjectSchema) },
  responses: { 201: ok(Project, 'Created'), 401: errors[401], 422: errors[422] },
});
route({
  method: 'get',
  path: '/projects',
  tags: ['Projects'],
  summary: 'List my projects',
  request: { query: paginationSchema },
  responses: { 200: page(Project), 401: errors[401], 422: errors[422] },
});
route({
  method: 'get',
  path: '/projects/{id}',
  tags: ['Projects'],
  summary: 'Get a project',
  request: { params: idParamSchema },
  responses: { 200: ok(Project), ...errors },
});
route({
  method: 'patch',
  path: '/projects/{id}',
  tags: ['Projects'],
  summary: 'Update a project',
  request: { params: idParamSchema, body: json(updateProjectSchema) },
  responses: { 200: ok(Project), ...errors },
});
route({
  method: 'delete',
  path: '/projects/{id}',
  tags: ['Projects'],
  summary: 'Delete a project and its tasks',
  request: { params: idParamSchema },
  responses: { 204: noContent, ...errors },
});

route({
  method: 'post',
  path: '/projects/{projectId}/tasks',
  tags: ['Tasks'],
  summary: 'Create a task in a project',
  request: { params: projectIdParamSchema, body: json(createTaskSchema) },
  responses: { 201: ok(Task, 'Created'), ...errors },
});
route({
  method: 'get',
  path: '/tasks',
  tags: ['Tasks'],
  summary: 'List my tasks with filters, search, sorting and pagination',
  request: { query: listTasksQuerySchema },
  responses: { 200: page(Task), 401: errors[401], 422: errors[422] },
});
route({
  method: 'get',
  path: '/tasks/{id}',
  tags: ['Tasks'],
  summary: 'Get a task',
  request: { params: idParamSchema },
  responses: { 200: ok(Task), ...errors },
});
route({
  method: 'patch',
  path: '/tasks/{id}',
  tags: ['Tasks'],
  summary: 'Update a task',
  request: { params: idParamSchema, body: json(updateTaskSchema) },
  responses: { 200: ok(Task), ...errors },
});
route({
  method: 'delete',
  path: '/tasks/{id}',
  tags: ['Tasks'],
  summary: 'Delete a task',
  request: { params: idParamSchema },
  responses: { 204: noContent, ...errors },
});

export const openApiDocument = new OpenApiGeneratorV31(registry.definitions).generateDocument({
  openapi: '3.1.0',
  info: {
    title: 'Task Manager API',
    version: '1.0.0',
    description: 'REST API to manage projects and tasks. Authenticate with POST /auth/login and use the token in "Authorize".',
  },
});
