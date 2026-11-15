import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate.js';
import * as tasksController from '../tasks/tasks.controller.js';
import * as projectsController from './projects.controller.js';

export const projectsRouter = Router();

projectsRouter.use(authenticate);
projectsRouter.post('/', projectsController.create);
projectsRouter.get('/', projectsController.list);
projectsRouter.get('/:id', projectsController.getById);
projectsRouter.patch('/:id', projectsController.update);
projectsRouter.delete('/:id', projectsController.remove);
projectsRouter.post('/:projectId/tasks', tasksController.create);
