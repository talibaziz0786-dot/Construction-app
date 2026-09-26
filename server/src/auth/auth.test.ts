import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import app from '../app.js';
import { UserModel } from './user.model.js';
import { ProjectModel } from '../modules/project/models/ProjectModel.js';

describe('Authentication & Project Ownership', () => {
  const testUser = {
    name: 'Test User',
    email: 'test@example.com',
    password: 'Password123',
  };

  beforeEach(async () => {
    // Clear users and projects before each test
    await UserModel.deleteMany({});
    await ProjectModel.deleteMany({});
  });

  it('should register a new user successfully', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send(testUser);

    expect(res.status).toBe(201);
    expect(res.body.user).toBeDefined();
    expect(res.body.user.email).toBe(testUser.email);
    expect(res.body.user.passwordHash).toBeUndefined();
    expect(res.headers['set-cookie']).toBeDefined();
  });

  it('should not allow duplicate email registration', async () => {
    await request(app).post('/api/auth/register').send(testUser);
    const res = await request(app).post('/api/auth/register').send(testUser);

    expect(res.status).toBe(409);
    expect(res.body.error).toBeDefined();
  });

  it('should login an existing user', async () => {
    await request(app).post('/api/auth/register').send(testUser);

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: testUser.email, password: testUser.password });

    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe(testUser.email);
    expect(res.headers['set-cookie']).toBeDefined();
  });

  it('should reject login with wrong password', async () => {
    await request(app).post('/api/auth/register').send(testUser);

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: testUser.email, password: 'WrongPassword' });

    expect(res.status).toBe(401);
  });

  it('should get current authenticated user via /me', async () => {
    const agent = request.agent(app);
    await agent.post('/api/auth/register').send(testUser);

    const res = await agent.get('/api/auth/me');

    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe(testUser.email);
  });

  it('should logout user and clear cookie', async () => {
    const agent = request.agent(app);
    await agent.post('/api/auth/register').send(testUser);

    const res = await agent.post('/api/auth/logout');
    expect(res.status).toBe(200);

    const meRes = await agent.get('/api/auth/me');
    expect(meRes.status).toBe(401);
  });

  it('should enforce project ownership and IDOR protection', async () => {
    const agent1 = request.agent(app);
    const agent2 = request.agent(app);

    // Register user 1 and create a project
    await agent1.post('/api/auth/register').send({
      name: 'User One',
      email: 'user1@example.com',
      password: 'Password123',
    });

    const projectPayload = {
      projectId: 'proj-owned-1',
      name: 'User 1 Project',
      type: 'house',
      buildings: [],
    };

    const createRes = await agent1.post('/api/projects').send(projectPayload);
    expect(createRes.status).toBe(200);

    // Register user 2
    await agent2.post('/api/auth/register').send({
      name: 'User Two',
      email: 'user2@example.com',
      password: 'Password123',
    });

    // User 2 tries to update User 1's project -> should be forbidden or not found
    const updateRes = await agent2.put('/api/projects/proj-owned-1').send({
      ...projectPayload,
      name: 'Hacked Project',
    });
    expect([403, 404]).toContain(updateRes.status);

    // User 2 tries to delete User 1's project -> should fail
    const deleteRes = await agent2.delete('/api/projects/proj-owned-1');
    expect([403, 404]).toContain(deleteRes.status);
  });
});