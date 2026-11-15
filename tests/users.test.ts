import jwt from 'jsonwebtoken';
import { describe, expect, it } from 'vitest';
import { api, registerUser } from './helpers.js';

describe('route protection', () => {
  it('returns 401 without a token', async () => {
    const res = await api().get('/users/me');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('returns 401 for a malformed token', async () => {
    const res = await api().get('/users/me').set('Authorization', 'Bearer not-a-jwt');
    expect(res.status).toBe(401);
  });

  it('returns 401 for a token signed with another secret', async () => {
    const { user } = await registerUser();
    const forged = jwt.sign({ ver: 0 }, 'some-other-secret-with-enough-length-1234', { subject: user.id });
    const res = await api().get('/users/me').set('Authorization', `Bearer ${forged}`);
    expect(res.status).toBe(401);
  });

  it('returns 401 for an expired token', async () => {
    const { user } = await registerUser();
    const expired = jwt.sign({ ver: 0 }, process.env.JWT_SECRET ?? '', { subject: user.id, expiresIn: -10 });
    const res = await api().get('/users/me').set('Authorization', `Bearer ${expired}`);
    expect(res.status).toBe(401);
  });
});

describe('GET /users/me', () => {
  it('returns the authenticated user without sensitive fields', async () => {
    const { token, user } = await registerUser({ name: 'Bia' });
    const res = await api().get('/users/me').set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ id: user.id, name: 'Bia' });
    expect(res.body.data).not.toHaveProperty('passwordHash');
  });
});

describe('PATCH /users/me', () => {
  it('updates the profile', async () => {
    const { token } = await registerUser();
    const res = await api()
      .patch('/users/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'New Name', email: 'NEW@example.com' });

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ name: 'New Name', email: 'new@example.com' });
  });

  it("returns 409 when the email belongs to another user", async () => {
    await registerUser({ email: 'taken@example.com' });
    const { token } = await registerUser();
    const res = await api().patch('/users/me').set('Authorization', `Bearer ${token}`).send({ email: 'taken@example.com' });

    expect(res.status).toBe(409);
  });

  it('returns 422 for an empty body', async () => {
    const { token } = await registerUser();
    const res = await api().patch('/users/me').set('Authorization', `Bearer ${token}`).send({});

    expect(res.status).toBe(422);
  });
});

describe('PATCH /users/me/password', () => {
  it('rejects a wrong current password', async () => {
    const { token } = await registerUser();
    const res = await api()
      .patch('/users/me/password')
      .set('Authorization', `Bearer ${token}`)
      .send({ currentPassword: 'wrong-pass', newPassword: 'newpassword123' });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
  });

  it('changes the password and revokes previously issued tokens', async () => {
    const { token, credentials } = await registerUser();

    const change = await api()
      .patch('/users/me/password')
      .set('Authorization', `Bearer ${token}`)
      .send({ currentPassword: credentials.password, newPassword: 'newpassword123' });
    expect(change.status).toBe(204);

    const oldToken = await api().get('/users/me').set('Authorization', `Bearer ${token}`);
    expect(oldToken.status).toBe(401);

    const oldPassword = await api().post('/auth/login').send({ email: credentials.email, password: credentials.password });
    expect(oldPassword.status).toBe(401);

    const newLogin = await api().post('/auth/login').send({ email: credentials.email, password: 'newpassword123' });
    expect(newLogin.status).toBe(200);
    const me = await api().get('/users/me').set('Authorization', `Bearer ${newLogin.body.data.token}`);
    expect(me.status).toBe(200);
  });
});
