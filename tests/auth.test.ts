import { describe, expect, it } from 'vitest';
import { prisma } from '../src/lib/prisma.js';
import { api, registerUser } from './helpers.js';

describe('POST /auth/register', () => {
  it('creates a user, returns a token and never exposes the password hash', async () => {
    const res = await api()
      .post('/auth/register')
      .send({ name: '  Ana  ', email: ' Ana@Example.COM ', password: 'password123' });

    expect(res.status).toBe(201);
    expect(res.body.data.token).toEqual(expect.any(String));
    expect(res.body.data.user).toMatchObject({ name: 'Ana', email: 'ana@example.com' });
    expect(res.body.data.user).not.toHaveProperty('passwordHash');
    expect(res.body.data.user).not.toHaveProperty('tokenVersion');
  });

  it('stores a bcrypt hash instead of the plain password', async () => {
    await registerUser({ email: 'hash@example.com', password: 'password123' });
    const stored = await prisma.user.findUniqueOrThrow({
      where: { email: 'hash@example.com' },
      select: { passwordHash: true },
    });
    expect(stored.passwordHash).not.toBe('password123');
    expect(stored.passwordHash).toMatch(/^\$2[aby]\$/);
  });

  it('rejects a duplicate email regardless of case with 409', async () => {
    await registerUser({ email: 'dup@example.com' });
    const res = await api()
      .post('/auth/register')
      .send({ name: 'Other', email: 'DUP@example.com', password: 'password123' });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('EMAIL_IN_USE');
  });

  it('returns 422 with field details for invalid data', async () => {
    const res = await api().post('/auth/register').send({ name: '', email: 'not-an-email', password: 'short' });

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(Object.keys(res.body.error.details.fieldErrors)).toEqual(
      expect.arrayContaining(['name', 'email', 'password']),
    );
  });

  it('returns 400 for a malformed JSON body', async () => {
    const res = await api().post('/auth/register').set('Content-Type', 'application/json').send('{"name":');

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('MALFORMED_JSON');
  });
});

describe('POST /auth/login', () => {
  it('returns a token for valid credentials', async () => {
    await registerUser({ email: 'login@example.com', password: 'password123' });
    const res = await api().post('/auth/login').send({ email: 'LOGIN@example.com', password: 'password123' });

    expect(res.status).toBe(200);
    expect(res.body.data.token).toEqual(expect.any(String));
    expect(res.body.data.user.email).toBe('login@example.com');
    expect(res.body.data.user).not.toHaveProperty('passwordHash');
  });

  it('returns the same 401 for a wrong password and for an unknown email', async () => {
    await registerUser({ email: 'login@example.com', password: 'password123' });

    const wrongPassword = await api().post('/auth/login').send({ email: 'login@example.com', password: 'wrong-pass' });
    const unknownEmail = await api().post('/auth/login').send({ email: 'nobody@example.com', password: 'password123' });

    expect(wrongPassword.status).toBe(401);
    expect(unknownEmail.status).toBe(401);
    expect(wrongPassword.body).toEqual(unknownEmail.body);
  });
});
