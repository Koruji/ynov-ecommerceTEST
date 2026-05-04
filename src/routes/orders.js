const express = require('express');
const router = express.Router();
const orders = require('../data/orders');
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

// GET /api/orders
router.get('/', (req, res) => {
  res.json(orders);
});

// GET /api/orders/:id
router.get('/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const order = orders.find(o => o.id === id);
  if (!order) {
    return res.status(404).json({ error: 'Order not found' });
  }
  res.json(order);
});

// POST /api/orders
router.post('/', async (req, res) => {
  const { userId, productIds, email } = req.body;
  if (!userId || !productIds || !Array.isArray(productIds)) {
    return res.status(400).json({ error: 'userId and productIds[] are required' });
  }
  
  const newOrder = {
    id: orders.length + 1,
    userId,
    productIds,
    total: 0,
    status: 'pending',
    createdAt: new Date().toISOString().split('T')[0],
  };
  
  orders.push(newOrder);

  // Envoyer email
  if (email) {
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: `Commande #${newOrder.id} confirmée`,
      html: `<h2>Commande confirmée!</h2><p>N°: #${newOrder.id}</p>`,
    });
  }

  res.status(201).json(newOrder);
});

// PATCH /api/orders/:id/status
router.patch('/:id/status', (req, res) => {
  const id = parseInt(req.params.id);
  const order = orders.find(o => o.id === id);
  if (!order) {
    return res.status(404).json({ error: 'Order not found' });
  }
  const { status } = req.body;
  const validStatuses = ['pending', 'shipped', 'delivered', 'cancelled'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: `status must be one of: ${validStatuses.join(', ')}` });
  }
  order.status = status;
  res.json(order);
});

module.exports = router;
