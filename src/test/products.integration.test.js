const request = require('supertest');
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const productsRouter = require('../routes/products');

// Setup base de données SQLite pour les tests
let db;

beforeAll((done) => {
  db = new sqlite3.Database(':memory:');
  
  db.serialize(() => {
    db.run(`
      CREATE TABLE products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        price REAL NOT NULL,
        stock INTEGER,
        category TEXT
      )
    `, (err) => {
      if (err) console.error(err);
    });

    // Insérer des données de test
    db.run(`
      INSERT INTO products (name, price, stock, category) VALUES 
      ('Laptop', 1299.99, 12, 'electronics'),
      ('Mouse', 39.99, 85, 'electronics'),
      ('Keyboard', 149.99, 34, 'electronics')
    `, (err) => {
      if (err) console.error(err);
      done();
    });
  });
});

afterAll((done) => {
  db.close(done);
});

describe('Products Router - Integration Tests with SQLite', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    
    // Route qui utilise la base de données
    app.get('/api/products', (req, res) => {
      db.all('SELECT * FROM products', (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
      });
    });

    app.get('/api/products/:id', (req, res) => {
      const id = parseInt(req.params.id);
      db.get('SELECT * FROM products WHERE id = ?', [id], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!row) return res.status(404).json({ error: 'Product not found' });
        res.json(row);
      });
    });

    app.post('/api/products', (req, res) => {
      const { name, price, stock, category } = req.body;
      if (!name || price === undefined) {
        return res.status(400).json({ error: 'name and price are required' });
      }

      db.run(
        'INSERT INTO products (name, price, stock, category) VALUES (?, ?, ?, ?)',
        [name, price, stock ?? 0, category ?? 'misc'],
        function(err) {
          if (err) return res.status(500).json({ error: err.message });
          res.status(201).json({
            id: this.lastID,
            name,
            price,
            stock: stock ?? 0,
            category: category ?? 'misc',
          });
        }
      );
    });
  });

  describe('GET /api/products', () => {
    it('✅ SHOULD return all products from database', async () => {
      const res = await request(app).get('/api/products');

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(3);
      expect(res.body[0].name).toBe('Laptop');
      expect(res.body[0].price).toBe(1299.99);
    });

    it('❌ INTENTIONAL FAIL - should return 5 products (will fail!)', async () => {
      const res = await request(app).get('/api/products');

      expect(res.status).toBe(200);
      expect(res.body.length).toBe(5); // ❌ FAUX! Il y a seulement 3 produits
    });
  });

  describe('GET /api/products/:id', () => {
    it('✅ SHOULD return a product by ID from database', async () => {
      const res = await request(app).get('/api/products/1');

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(1);
      expect(res.body.name).toBe('Laptop');
      expect(res.body.price).toBe(1299.99);
    });

    it('❌ INTENTIONAL FAIL - product price should be 99.99', async () => {
      const res = await request(app).get('/api/products/1');

      expect(res.status).toBe(200);
      expect(res.body.price).toBe(99.99); // ❌ FAUX! Le prix est 1299.99
    });

    it('✅ SHOULD return 404 for non-existent product', async () => {
      const res = await request(app).get('/api/products/999');

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Product not found');
    });
  });

  describe('POST /api/products', () => {
    it('✅ SHOULD create a new product in database', async () => {
      const newProduct = {
        name: 'Monitor',
        price: 299.99,
        stock: 15,
        category: 'electronics',
      };

      const res = await request(app).post('/api/products').send(newProduct);

      expect(res.status).toBe(201);
      expect(res.body.id).toBeDefined();
      expect(res.body.name).toBe('Monitor');
      expect(res.body.price).toBe(299.99);

      // Vérifier que le produit est bien dans la DB
      const getRes = await request(app).get(`/api/products/${res.body.id}`);
      expect(getRes.status).toBe(200);
      expect(getRes.body.name).toBe('Monitor');
    });

    it('❌ INTENTIONAL FAIL - should create product with negative price', async () => {
      const newProduct = {
        name: 'Headphones',
        price: -50, // ❌ Les prix négatifs ne devraient pas être acceptés
        stock: 10,
      };

      const res = await request(app).post('/api/products').send(newProduct);

      expect(res.status).toBe(400); // ❌ Le serveur accepte -50 sans vérifier
    });

    it('✅ SHOULD return 400 if name is missing', async () => {
      const res = await request(app).post('/api/products').send({
        price: 99.99,
      });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('name and price are required');
    });
  });
});