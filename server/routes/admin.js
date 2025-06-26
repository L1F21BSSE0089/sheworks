const express = require('express');
const User = require('../models/User');
const Vendor = require('../models/Vendor');
const Product = require('../models/Product');
const Order = require('../models/Order');
const adminMiddleware = require('../middleware/admin');
const authMiddleware = require('./auth').verifyToken || ((req, res, next) => next());

const router = express.Router();

// Protect all routes
router.use(authMiddleware, adminMiddleware);

// Users
router.get('/users', async (req, res) => {
  const users = await User.find();
  res.json({ users });
});
router.put('/users/:id/suspend', async (req, res) => {
  const user = await User.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
  res.json({ user });
});
router.delete('/users/:id', async (req, res) => {
  await User.findByIdAndDelete(req.params.id);
  res.json({ message: 'User deleted' });
});

// Vendors
router.get('/vendors', async (req, res) => {
  const vendors = await Vendor.find();
  res.json({ vendors });
});
router.put('/vendors/:id/activate', async (req, res) => {
  const vendor = await Vendor.findByIdAndUpdate(req.params.id, { status: 'active', isActive: true }, { new: true });
  res.json({ vendor });
});
router.put('/vendors/:id/suspend', async (req, res) => {
  const vendor = await Vendor.findByIdAndUpdate(req.params.id, { status: 'suspended', isActive: false }, { new: true });
  res.json({ vendor });
});
router.delete('/vendors/:id', async (req, res) => {
  await Vendor.findByIdAndDelete(req.params.id);
  res.json({ message: 'Vendor deleted' });
});

// Products
router.put('/products/:id/suspend', async (req, res) => {
  const product = await Product.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
  res.json({ product });
});
router.delete('/products/:id', async (req, res) => {
  await Product.findByIdAndDelete(req.params.id);
  res.json({ message: 'Product deleted' });
});

// Orders
router.delete('/orders/:id', async (req, res) => {
  await Order.findByIdAndDelete(req.params.id);
  res.json({ message: 'Order deleted' });
});

module.exports = router; 