import type { ErrorRequestHandler, RequestHandler } from 'express';
import { ZodError, z } from 'zod';
import { Prisma } from '../generated/prisma/client.js';
import { AppError } from '../utils/app-error.js';

interface ErrorBody {
  error: { code: string; message: string; details?: unknown };
}

function isExposedClientError(err: unknown): err is { status: number; message: string } {
  return (
    err instanceof Error &&
    'status' in err &&
    typeof err.status === 'number' &&
    err.status >= 400 &&
    err.status < 500 &&
    'expose' in err &&
    err.expose === true
  );
}

function toErrorResponse(err: unknown): { status: number; body: ErrorBody } {
  if (err instanceof AppError) {
    return {
      status: err.statusCode,
      body: { error: { code: err.code, message: err.message, details: err.details } },
    };
  }
  if (err instanceof ZodError) {
    return {
      status: 422,
      body: { error: { code: 'VALIDATION_ERROR', message: 'Invalid request data', details: z.flattenError(err) } },
    };
  }
  // express.json() marks malformed bodies with type 'entity.parse.failed'
  if (err instanceof SyntaxError && 'type' in err && err.type === 'entity.parse.failed') {
    return { status: 400, body: { error: { code: 'MALFORMED_JSON', message: 'Request body is not valid JSON' } } };
  }
  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
    return { status: 409, body: { error: { code: 'CONFLICT', message: 'Resource already exists' } } };
  }
  // Record removed between the ownership check and the write.
  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
    return { status: 404, body: { error: { code: 'NOT_FOUND', message: 'Resource not found' } } };
  }
  // Other client errors raised by express.json() (e.g. 413 body too large, 415 bad charset).
  if (isExposedClientError(err)) {
    return { status: err.status, body: { error: { code: 'BAD_REQUEST', message: err.message } } };
  }
  return { status: 500, body: { error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } } };
}

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  const { status, body } = toErrorResponse(err);
  if (status === 500) console.error(err);
  res.status(status).json(body);
};

export const notFoundHandler: RequestHandler = (_req, res) => {
  res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Route not found' } });
};
