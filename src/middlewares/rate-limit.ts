import { rateLimit } from 'express-rate-limit';
import { env } from '../config/env.js';

// shortcut: in-memory store counts per process, switch to a Redis store when running more than one instance.
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: env.AUTH_RATE_LIMIT_MAX,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  handler: (_req, res) => {
    res.status(429).json({ error: { code: 'TOO_MANY_REQUESTS', message: 'Too many attempts, try again later' } });
  },
});
