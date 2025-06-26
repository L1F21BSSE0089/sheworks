const express = require('express');
const Product = require('../models/Product');
const Vendor = require('../models/Vendor');
const { body, validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');
const Order = require('../models/Order');

const router = express.Router();

// Middleware to verify token
const verifyToken = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'No token provided' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// Get all products
router.get('/', async (req, res) => {
  try {
    const products = await Product.find().populate('vendor', 'businessName');
    res.json({ products });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get single product
router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).populate('vendor', 'businessName');
    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json({ product });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Create product (vendor only)
router.post('/', verifyToken, [
  body('name').notEmpty(),
  body('description').notEmpty(),
  body('category').notEmpty(),
  body('price.current').isNumeric(),
  body('inventory.stock').isInt({ min: 0 })
], async (req, res) => {
  if (req.user.userType !== 'vendor') return res.status(403).json({ error: 'Only vendors can create products' });
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  try {
    const vendor = await Vendor.findById(req.user.userId);
    if (!vendor) return res.status(404).json({ error: 'Vendor not found' });
    const product = new Product({ ...req.body, vendor: vendor._id });
    await product.save();
    res.status(201).json({ product });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Update product (vendor only)
router.put('/:id', verifyToken, async (req, res) => {
  if (req.user.userType !== 'vendor') return res.status(403).json({ error: 'Only vendors can update products' });
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ error: 'Product not found' });
    if (product.vendor.toString() !== req.user.userId) return res.status(403).json({ error: 'Not your product' });
    Object.assign(product, req.body);
    await product.save();
    res.json({ product });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete product (vendor only)
router.delete('/:id', verifyToken, async (req, res) => {
  if (req.user.userType !== 'vendor') return res.status(403).json({ error: 'Only vendors can delete products' });
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ error: 'Product not found' });
    if (product.vendor.toString() !== req.user.userId) return res.status(403).json({ error: 'Not your product' });
    await product.remove();
    res.json({ message: 'Product deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get recommended products for a user (simple: most popular)
router.get('/recommendations', async (req, res) => {
  try {
    // Aggregate product order counts
    const popular = await Order.aggregate([
      { $unwind: "$items" },
      { $group: { _id: "$items.product", count: { $sum: "$items.quantity" } } },
      { $sort: { count: -1 } },
      { $limit: 8 }
    ]);
    const ids = popular.map(p => p._id);
    let products = [];
    if (ids.length) {
      products = await Product.find({ _id: { $in: ids }, isActive: true });
    } else {
      products = await Product.find({ isActive: true }).limit(8);
    }
    res.json({ products });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch recommendations' });
  }
});

// Add a review to a product
router.post('/:id/reviews', verifyToken, [
  body('rating').isInt({ min: 1, max: 5 }),
  body('comment').isLength({ min: 1, max: 1000 })
], async (req, res) => {
  if (req.user.userType !== 'customer') return res.status(403).json({ error: 'Only customers can review products' });
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ error: 'Product not found' });
    // Prevent duplicate reviews by the same user
    if (product.reviews.some(r => r.user && r.user.toString() === req.user.userId)) {
      return res.status(400).json({ error: 'You have already reviewed this product' });
    }
    const review = {
      user: req.user.userId,
      rating: req.body.rating,
      comment: req.body.comment,
      createdAt: new Date()
    };
    product.reviews.unshift(review);
    // Update average rating and count
    product.rating.count = product.reviews.length;
    product.rating.average = product.reviews.reduce((sum, r) => sum + r.rating, 0) / product.reviews.length;
    await product.save();
    await product.populate('reviews.user', 'username');
    res.status(201).json({ review: product.reviews[0], rating: product.rating });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router; 