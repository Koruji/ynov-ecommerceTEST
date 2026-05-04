const request = require('supertest');
const express = require('express');
const ordersRouter = require('../routes/orders');

// Mock the orders data
jest.mock('../data/orders', () => [
  { id: 1, userId: 1, productIds: [1, 2], total: 1339.98, status: 'shipped', createdAt: '2024-01-10' },
  { id: 2, userId: 2, productIds: [3], total: 149.99, status: 'pending', createdAt: '2024-01-12' },
  { id: 3, userId: 1, productIds: [4, 5], total: 559.98, status: 'delivered', createdAt: '2024-01-08' },
]);

// Mock nodemailer
jest.mock('nodemailer', () => ({
  createTransport: jest.fn().mockReturnValue({
    sendMail: jest.fn().mockResolvedValue({ messageId: '123' }),
  }),
}));

describe('Orders Router', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/orders', ordersRouter);
  });

  describe('GET /api/orders', () => {
    it('should return all orders', async () => {
      const res = await request(app).get('/api/orders');

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(3);
      expect(res.body[0].id).toBe(1);
      expect(res.body[0].userId).toBe(1);
    });

    it('should return orders with all required fields', async () => {
      const res = await request(app).get('/api/orders');

      expect(res.status).toBe(200);
      const order = res.body[0];
      expect(order).toHaveProperty('id');
      expect(order).toHaveProperty('userId');
      expect(order).toHaveProperty('productIds');
      expect(order).toHaveProperty('total');
      expect(order).toHaveProperty('status');
      expect(order).toHaveProperty('createdAt');
    });
  });

  describe('GET /api/orders/:id', () => {
    it('should return an order by ID', async () => {
      const res = await request(app).get('/api/orders/1');

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(1);
      expect(res.body.userId).toBe(1);
      expect(res.body.productIds).toEqual([1, 2]);
      expect(res.body.total).toBe(1339.98);
      expect(res.body.status).toBe('shipped');
    });

    it('should return different order by different ID', async () => {
      const res = await request(app).get('/api/orders/2');

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(2);
      expect(res.body.userId).toBe(2);
      expect(res.body.productIds).toEqual([3]);
    });

    it('should return 404 for non-existent order', async () => {
      const res = await request(app).get('/api/orders/999');

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Order not found');
    });

    it('should handle invalid ID format gracefully', async () => {
      const res = await request(app).get('/api/orders/abc');

      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/orders', () => {
    it('should create a new order with userId and productIds', async () => {
      const newOrder = {
        userId: 3,
        productIds: [1, 3, 5],
      };

      const res = await request(app).post('/api/orders').send(newOrder);

      expect(res.status).toBe(201);
      expect(res.body.id).toBeDefined();
      expect(res.body.userId).toBe(3);
      expect(res.body.productIds).toEqual([1, 3, 5]);
      expect(res.body.total).toBe(0);
      expect(res.body.status).toBe('pending');
      expect(res.body.createdAt).toBeDefined();
    });

    it('should send confirmation email when email is provided', async () => {
      const nodemailer = require('nodemailer');
      const mockSendMail = jest.fn().mockResolvedValue({ messageId: '123' });
      nodemailer.createTransport().sendMail = mockSendMail;

      const newOrder = {
        userId: 1,
        productIds: [2],
        email: 'client@example.com',
      };

      const res = await request(app).post('/api/orders').send(newOrder);

      expect(res.status).toBe(201);
      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'client@example.com',
          subject: expect.stringContaining('Commande'),
        })
      );
    });

    it('should NOT send email when email is not provided', async () => {
      const nodemailer = require('nodemailer');
      const mockSendMail = jest.fn().mockResolvedValue({ messageId: '123' });
      nodemailer.createTransport().sendMail = mockSendMail;

      const newOrder = {
        userId: 1,
        productIds: [2],
      };

      const res = await request(app).post('/api/orders').send(newOrder);

      expect(res.status).toBe(201);
      expect(mockSendMail).not.toHaveBeenCalled();
    });

    it('should set status to pending for new orders', async () => {
      const newOrder = {
        userId: 1,
        productIds: [2],
      };

      const res = await request(app).post('/api/orders').send(newOrder);

      expect(res.status).toBe(201);
      expect(res.body.status).toBe('pending');
    });

    it('should set total to 0 for new orders', async () => {
      const newOrder = {
        userId: 2,
        productIds: [1, 2, 3],
      };

      const res = await request(app).post('/api/orders').send(newOrder);

      expect(res.status).toBe(201);
      expect(res.body.total).toBe(0);
    });

    it('should generate createdAt date in YYYY-MM-DD format', async () => {
      const newOrder = {
        userId: 1,
        productIds: [1],
      };

      const res = await request(app).post('/api/orders').send(newOrder);

      expect(res.status).toBe(201);
      expect(res.body.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('should return 400 if userId is missing', async () => {
      const newOrder = {
        productIds: [1, 2],
      };

      const res = await request(app).post('/api/orders').send(newOrder);

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('userId and productIds[] are required');
    });

    it('should return 400 if productIds is missing', async () => {
      const newOrder = {
        userId: 1,
      };

      const res = await request(app).post('/api/orders').send(newOrder);

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('userId and productIds[] are required');
    });

    it('should return 400 if productIds is not an array', async () => {
      const newOrder = {
        userId: 1,
        productIds: 'not-an-array',
      };

      const res = await request(app).post('/api/orders').send(newOrder);

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('userId and productIds[] are required');
    });

    it('should accept empty productIds array', async () => {
      const newOrder = {
        userId: 1,
        productIds: [],
      };

      const res = await request(app).post('/api/orders').send(newOrder);

      expect(res.status).toBe(201);
      expect(res.body.productIds).toEqual([]);
    });
  });

  describe('PATCH /api/orders/:id/status', () => {
    it('should update order status to shipped', async () => {
      const res = await request(app)
        .patch('/api/orders/1/status')
        .send({ status: 'shipped' });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('shipped');
      expect(res.body.id).toBe(1);
    });

    it('should update order status to delivered', async () => {
      const res = await request(app)
        .patch('/api/orders/2/status')
        .send({ status: 'delivered' });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('delivered');
    });

    it('should update order status to cancelled', async () => {
      const res = await request(app)
        .patch('/api/orders/3/status')
        .send({ status: 'cancelled' });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('cancelled');
    });

    it('should update order status to pending', async () => {
      const res = await request(app)
        .patch('/api/orders/1/status')
        .send({ status: 'pending' });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('pending');
    });

    it('should return 404 for non-existent order', async () => {
      const res = await request(app)
        .patch('/api/orders/999/status')
        .send({ status: 'shipped' });

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Order not found');
    });

    it('should return 400 for invalid status', async () => {
      const res = await request(app)
        .patch('/api/orders/1/status')
        .send({ status: 'invalid-status' });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('status must be one of');
      expect(res.body.error).toContain('pending');
      expect(res.body.error).toContain('shipped');
      expect(res.body.error).toContain('delivered');
      expect(res.body.error).toContain('cancelled');
    });

    it('should return 400 when status is missing', async () => {
      const res = await request(app)
        .patch('/api/orders/1/status')
        .send({});

      expect(res.status).toBe(400);
    });

    it('should preserve other order properties when updating status', async () => {
      const res = await request(app)
        .patch('/api/orders/1/status')
        .send({ status: 'cancelled' });

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(1);
      expect(res.body.userId).toBe(1);
      expect(res.body.productIds).toEqual([1, 2]);
      expect(res.body.total).toBe(1339.98);
    });
  });
});