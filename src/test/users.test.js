const request = require('supertest');
const express = require('express');
const usersRouter = require('../routes/users');

// Mock the users data
jest.mock('../data/users', () => [
  { id: 1, name: 'Alice Martin', email: 'alice@example.com', role: 'admin' },
  { id: 2, name: 'Bob Dupont', email: 'bob@example.com', role: 'customer' },
  { id: 3, name: 'Charlie Leroy', email: 'charlie@example.com', role: 'customer' },
]);

describe('Users Router', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/users', usersRouter);
  });

  describe('GET /api/users', () => {
    it('should return all users', async () => {
      const res = await request(app).get('/api/users');

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(3);
      expect(res.body[0].name).toBe('Alice Martin');
      expect(res.body[0].email).toBe('alice@example.com');
    });
  });

  describe('GET /api/users/:id', () => {
    it('should return a user by ID', async () => {
      const res = await request(app).get('/api/users/1');

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(1);
      expect(res.body.name).toBe('Alice Martin');
      expect(res.body.email).toBe('alice@example.com');
      expect(res.body.role).toBe('admin');
    });

    it('should return different user by different ID', async () => {
      const res = await request(app).get('/api/users/2');

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(2);
      expect(res.body.name).toBe('Bob Dupont');
    });

    it('should return 404 for non-existent user', async () => {
      const res = await request(app).get('/api/users/999');

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('User not found');
    });

    it('should handle invalid ID format gracefully', async () => {
      const res = await request(app).get('/api/users/invalid');

      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/users', () => {
    it('should create a new user with name and email', async () => {
      const newUser = {
        name: 'Diana Smith',
        email: 'diana@example.com',
      };

      const res = await request(app).post('/api/users').send(newUser);

      expect(res.status).toBe(201);
      expect(res.body.id).toBeDefined();
      expect(res.body.name).toBe('Diana Smith');
      expect(res.body.email).toBe('diana@example.com');
      expect(res.body.role).toBe('customer');
    });

    it('should assign customer role by default to new users', async () => {
      const newUser = {
        name: 'Eve Johnson',
        email: 'eve@example.com',
      };

      const res = await request(app).post('/api/users').send(newUser);

      expect(res.status).toBe(201);
      expect(res.body.role).toBe('customer');
    });

    it('should return 400 if name is missing', async () => {
      const newUser = {
        email: 'test@example.com',
      };

      const res = await request(app).post('/api/users').send(newUser);

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('name and email are required');
    });

    it('should return 400 if email is missing', async () => {
      const newUser = {
        name: 'Frank Wilson',
      };

      const res = await request(app).post('/api/users').send(newUser);

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('name and email are required');
    });

    it('should return 400 if both name and email are missing', async () => {
      const res = await request(app).post('/api/users').send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('name and email are required');
    });

    it('should accept email with various formats', async () => {
      const newUser = {
        name: 'Grace Lee',
        email: 'grace.lee+tag@example.co.uk',
      };

      const res = await request(app).post('/api/users').send(newUser);

      expect(res.status).toBe(201);
      expect(res.body.email).toBe('grace.lee+tag@example.co.uk');
    });
  });
});