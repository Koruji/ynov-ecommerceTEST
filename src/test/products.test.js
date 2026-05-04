const request = require('supertest');
const express = require('express');
const productsRouter = require('../routes/products');

// Mock the products data
jest.mock('../data/products', () => [
  { id: 1, name: 'Laptop Pro 15"', price: 1299.99, stock: 12, category: 'electronics' },
  { id: 2, name: 'Wireless Mouse', price: 39.99, stock: 85, category: 'electronics' },
  { id: 3, name: 'Mechanical Keyboard', price: 149.99, stock: 34, category: 'electronics' },
]);

describe('Products Router', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/products', productsRouter);
  });

  describe('GET /api/products', () => {
    it('should return all products with V1 format by default', async () => {
      delete process.env.FEATURE_V2_PRODUCTS;
      const res = await request(app).get('/api/products');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(3);
      expect(res.body[0]).toHaveProperty('id');
      expect(res.body[0]).toHaveProperty('name');
      expect(res.body[0]).toHaveProperty('price');
      expect(res.body[0]).toHaveProperty('stock');
    });
  });

  describe('GET /api/products/:id', () => {
    it('should return a product by ID', async () => {
      const res = await request(app).get('/api/products/1');
      expect(res.status).toBe(200);
      expect(res.body.id).toBe(1);
      expect(res.body.name).toBe('Laptop Pro 15"');
      expect(res.body.price).toBe(1299.99);
    });

    it('should return 404 for non-existent product', async () => {
      const res = await request(app).get('/api/products/999');

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Product not found');
    });

    it('should handle invalid ID format gracefully', async () => {
      const res = await request(app).get('/api/products/abc');

      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/products', () => {
    it('should create a new product with all required fields', async () => {
      const newProduct = {
        name: 'Test Monitor',
        price: 299.99,
        stock: 15,
        category: 'electronics',
      };

      const res = await request(app).post('/api/products').send(newProduct);

      expect(res.status).toBe(201);
      expect(res.body.id).toBeDefined();
      expect(res.body.name).toBe('Test Monitor');
      expect(res.body.price).toBe(299.99);
      expect(res.body.stock).toBe(15);
      expect(res.body.category).toBe('electronics');
    });

    it('should create product with default stock of 0 when not provided', async () => {
      const newProduct = {
        name: 'Test Keyboard',
        price: 79.99,
      };

      const res = await request(app).post('/api/products').send(newProduct);

      expect(res.status).toBe(201);
      expect(res.body.stock).toBe(0);
      expect(res.body.category).toBe('misc');
    });

    it('should return 400 if name is missing', async () => {
      const newProduct = {
        price: 299.99,
        stock: 15,
      };

      const res = await request(app).post('/api/products').send(newProduct);

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('name and price are required');
    });

    it('should return 400 if price is missing', async () => {
      const newProduct = {
        name: 'Test Product',
        stock: 15,
      };

      const res = await request(app).post('/api/products').send(newProduct);

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('name and price are required');
    });

    it('should accept price of 0', async () => {
      const newProduct = {
        name: 'Free Product',
        price: 0,
      };

      const res = await request(app).post('/api/products').send(newProduct);

      expect(res.status).toBe(201);
      expect(res.body.price).toBe(0);
    });
  });

  describe('GET /api/products with feature flag', () => {
  it('should return V1 format by default (no feature flag)', async () => {
    delete process.env.FEATURE_V2_PRODUCTS;
    
    const res = await request(app).get('/api/products');

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body[0]).toHaveProperty('id');
    expect(res.body[0]).toHaveProperty('name');
    expect(res.body[0]).not.toHaveProperty('available');
    expect(res.body[0]).not.toHaveProperty('priceFormatted');
  });

  it('should return V2 format when FEATURE_V2_PRODUCTS is enabled', async () => {
    process.env.FEATURE_V2_PRODUCTS = 'true';
    
    const res = await request(app).get('/api/products');

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body[0]).toHaveProperty('available');
    expect(res.body[0]).toHaveProperty('priceFormatted');
    expect(res.body[0].priceFormatted).toMatch(/^€\d+\.\d{2}$/);
    expect(typeof res.body[0].available).toBe('boolean');
    
    delete process.env.FEATURE_V2_PRODUCTS;
  });
});
});