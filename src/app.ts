import express from 'express';
import helmet from 'helmet';
import swaggerUi from 'swagger-ui-express';
import { openApiDocument } from './docs/openapi.js';
import { errorHandler, notFoundHandler } from './middlewares/error-handler.js';
import { authRouter } from './modules/auth/auth.routes.js';
import { projectsRouter } from './modules/projects/projects.routes.js';
import { tasksRouter } from './modules/tasks/tasks.routes.js';
import { usersRouter } from './modules/users/users.routes.js';

export const app = express();

app.disable('x-powered-by');
app.use(helmet());
app.use(express.json({ limit: '100kb' }));

app.get('/docs/openapi.json', (_req, res) => {
  res.json(openApiDocument);
});
app.use('/docs', swaggerUi.serve, swaggerUi.setup(openApiDocument));

app.use('/auth', authRouter);
app.use('/users', usersRouter);
app.use('/projects', projectsRouter);
app.use('/tasks', tasksRouter);

app.use(notFoundHandler);
app.use(errorHandler);
