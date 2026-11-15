import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate.js';
import * as tasksController from './tasks.controller.js';

export const tasksRouter = Router();

tasksRouter.use(authenticate);
tasksRouter.get('/', tasksController.list);
tasksRouter.get('/:id', tasksController.getById);
tasksRouter.patch('/:id', tasksController.update);
tasksRouter.delete('/:id', tasksController.remove);
