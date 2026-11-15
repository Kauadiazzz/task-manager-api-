import { Router } from 'express';
import { authRateLimiter } from '../../middlewares/rate-limit.js';
import * as authController from './auth.controller.js';

export const authRouter = Router();

authRouter.use(authRateLimiter);
authRouter.post('/register', authController.register);
authRouter.post('/login', authController.login);
