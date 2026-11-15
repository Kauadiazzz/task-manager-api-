import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate.js';
import * as usersController from './users.controller.js';

export const usersRouter = Router();

usersRouter.use(authenticate);
usersRouter.get('/me', usersController.getMe);
usersRouter.patch('/me', usersController.updateMe);
usersRouter.patch('/me/password', usersController.changePassword);
