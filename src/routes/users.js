const express = require('express');
const router = express.Router();
const users = require('../data/users');
const FEATURE_SURPRISE = process.env.FEATURE_SURPRISE === 'true';

// GET /api/users
router.get('/', (req, res) => {
  if (FEATURE_SURPRISE) {
    res.json({name: 'COUCOU'});
  } else {
    res.json(users);
  }
});

// GET /api/users/:id
router.get('/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const user = users.find(u => u.id === id);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  res.json(user);
});

// POST /api/users
router.post('/', (req, res) => {
  const { name, email } = req.body;
  if (!name || !email) {
    return res.status(400).json({ error: 'name and email are required' });
  }
  const newUser = {
    id: users.length + 1,
    name,
    email,
    role: 'customer',
  };
  users.push(newUser);
  res.status(201).json(newUser);
});

module.exports = router;
