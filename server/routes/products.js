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
  try {
    console.log('=== PRODUCT CREATION START ===');
    console.log('User:', req.user);
    console.log('Request body:', JSON.stringify(req.body, null, 2));
    
    if (req.user.userType !== 'vendor') {
      console.log('Access denied: User is not a vendor');
      return res.status(403).json({ error: 'Only vendors can create products' });
    }
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('Validation errors:', errors.array());
      return res.status(400).json({ errors: errors.array() });
    }
    
    console.log('Looking for vendor with ID:', req.user.userId);
    const vendor = await Vendor.findById(req.user.userId);
    if (!vendor) {
      console.log('Vendor not found');
      return res.status(404).json({ error: 'Vendor not found' });
    }
    
    console.log('Vendor found:', vendor.businessName);
    console.log('Creating product with data:', { ...req.body, vendor: vendor._id });
    
    const product = new Product({ ...req.body, vendor: vendor._id });
    await product.save();
    
    console.log('Product created successfully:', product._id);
    console.log('=== PRODUCT CREATION SUCCESS ===');
    
    res.status(201).json({ product });
  } catch (err) {
    console.error('=== PRODUCT CREATION ERROR ===');
    console.error('Error details:', err);
    console.error('Error message:', err.message);
    console.error('Error stack:', err.stack);
    console.error('=== END ERROR ===');
    res.status(500).json({ error: 'Server error', details: err.message });
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
    console.log('Starting recommendations request...');
    
    // First check if we have any orders
    const orderCount = await Order.countDocuments();
    console.log('Order count:', orderCount);
    
    let products = [];
    
    if (orderCount > 0) {
      console.log('Processing orders for recommendations...');
      // Aggregate product order counts
      const popular = await Order.aggregate([
        { $unwind: "$items" },
        { $group: { _id: "$items.product", count: { $sum: "$items.quantity" } } },
        { $sort: { count: -1 } },
        { $limit: 8 }
      ]);
      
      console.log('Popular products from orders:', popular);
      const ids = popular.map(p => p._id);
      if (ids.length > 0) {
        products = await Product.find({ _id: { $in: ids }, isActive: true }).populate('vendor', 'businessName');
        console.log('Found products from orders:', products.length);
      }
    }
    
    // If no products from orders, get some active products
    if (products.length === 0) {
      console.log('Getting fallback products...');
      products = await Product.find({ isActive: true }).populate('vendor', 'businessName').limit(8);
      console.log('Found fallback products:', products.length);
    }
    
    console.log('Sending recommendations response with', products.length, 'products');
    res.json({ products });
  } catch (error) {
    console.error('Recommendations error details:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ error: 'Failed to fetch recommendations', details: error.message });
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

// Test endpoint to check basic functionality
router.get('/test', async (req, res) => {
  try {
    console.log('Test endpoint called');
    res.json({ message: 'Products route is working', timestamp: new Date().toISOString() });
  } catch (error) {
    console.error('Test endpoint error:', error);
    res.status(500).json({ error: 'Test failed', details: error.message });
  }
});

// Simple seed endpoint without vendor creation
router.get('/simple-seed', async (req, res) => {
  try {
    console.log('Simple seed endpoint called');
    
    // Check if products already exist
    const existingProducts = await Product.countDocuments();
    console.log('Existing products:', existingProducts);
    
    if (existingProducts > 0) {
      return res.json({ message: `${existingProducts} products already exist. Skipping seed.` });
    }

    // First create a simple vendor
    let vendor = await Vendor.findOne();
    if (!vendor) {
      console.log('Creating simple vendor...');
      vendor = new Vendor({
        businessName: 'Test Store',
        email: 'test@store.com',
        password: 'test123',
        contactPerson: {
          firstName: 'Test',
          lastName: 'Vendor',
          phone: '+1234567890'
        },
        businessInfo: {
          category: 'jewelry',
          specialties: ['rings', 'necklaces']
        },
        status: 'active',
        verification: {
          isVerified: true
        }
      });
      await vendor.save();
      console.log('Simple vendor created');
    }

    // Create a simple product with correct schema
    const simpleProduct = new Product({
      name: 'Test Product',
      description: 'A simple test product',
      vendor: vendor._id,
      category: 'rings',
      price: { 
        current: 99.99, 
        original: 120.00,
        currency: 'USD'
      },
      images: [{
        url: 'test.png',
        alt: 'Test Product',
        isPrimary: true
      }],
      inventory: { 
        stock: 10, 
        sku: 'TEST001',
        lowStockThreshold: 5
      },
      status: 'active',
      featured: true
    });

    await simpleProduct.save();
    console.log('Simple product created');
    res.json({ message: 'Simple test product created successfully!' });
  } catch (error) {
    console.error('Simple seed error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ error: 'Simple seed failed', details: error.message });
  }
});

// Seed sample products (for development/testing) - GET endpoint for browser access
router.get('/seed', async (req, res) => {
  try {
    console.log('Starting seed process...');
    
    // Check if products already exist
    const existingProducts = await Product.countDocuments();
    if (existingProducts > 0) {
      return res.json({ message: `${existingProducts} products already exist. Skipping seed.` });
    }

    console.log('No existing products found, creating vendor...');
    
    // Get or create a vendor
    let vendor = await Vendor.findOne();
    if (!vendor) {
      vendor = new Vendor({
        businessName: 'Sample Jewelry Store',
        email: 'vendor@sample.com',
        password: 'vendor123',
        contactPerson: {
          firstName: 'Sample',
          lastName: 'Vendor',
          phone: '+1234567890'
        },
        businessInfo: {
          category: 'jewelry',
          specialties: ['rings', 'necklaces', 'earrings', 'bracelets', 'watches']
        },
        address: {
          street: '123 Jewelry St',
          city: 'Sample City',
          state: 'Sample State',
          zipCode: '12345',
          country: 'USA'
        },
        status: 'active',
        verification: {
          isVerified: true
        }
      });
      await vendor.save();
      console.log('Created sample vendor');
    } else {
      console.log('Using existing vendor');
    }

    console.log('Creating sample products...');
    
    const sampleProducts = [
      {
        name: 'Elegant Pearl Necklace',
        description: 'Beautiful handcrafted pearl necklace perfect for any occasion',
        category: 'Necklaces',
        price: { current: 89.99, original: 120.00 },
        images: ['necklace.png'],
        inventory: { stock: 15, sku: 'NECK001' },
        isActive: true,
        isFeatured: true,
        vendor: vendor._id
      },
      {
        name: 'Diamond Stud Earrings',
        description: 'Classic diamond stud earrings with brilliant cut stones',
        category: 'Earrings',
        price: { current: 299.99, original: 399.00 },
        images: ['earring.png'],
        inventory: { stock: 8, sku: 'EARR001' },
        isActive: true,
        isFeatured: true,
        vendor: vendor._id
      },
      {
        name: 'Gold Wedding Ring',
        description: 'Traditional 18k gold wedding ring with elegant design',
        category: 'Rings',
        price: { current: 599.99, original: 750.00 },
        images: ['ring.png'],
        inventory: { stock: 12, sku: 'RING001' },
        isActive: true,
        isFeatured: true,
        vendor: vendor._id
      },
      {
        name: 'Silver Bracelet',
        description: 'Delicate silver bracelet with intricate patterns',
        category: 'Bracelets',
        price: { current: 45.99, original: 65.00 },
        images: ['bracelet.png'],
        inventory: { stock: 20, sku: 'BRAC001' },
        isActive: true,
        isFeatured: false,
        vendor: vendor._id
      },
      {
        name: 'Luxury Watch',
        description: 'Premium luxury watch with leather strap',
        category: 'Watches',
        price: { current: 899.99, original: 1200.00 },
        images: ['watch.png'],
        inventory: { stock: 5, sku: 'WATCH001' },
        isActive: true,
        isFeatured: true,
        vendor: vendor._id
      }
    ];

    await Product.insertMany(sampleProducts);
    console.log('Sample products created successfully!');
    res.json({ message: 'Sample products created successfully!', count: sampleProducts.length });
  } catch (error) {
    console.error('Seed error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ error: 'Failed to seed products', details: error.message });
  }
});

// Seed sample products (for development/testing) - POST endpoint
router.post('/seed', async (req, res) => {
  try {
    // Check if products already exist
    const existingProducts = await Product.countDocuments();
    if (existingProducts > 0) {
      return res.json({ message: `${existingProducts} products already exist. Skipping seed.` });
    }

    // Get or create a vendor
    let vendor = await Vendor.findOne();
    if (!vendor) {
      vendor = new Vendor({
        businessName: 'Sample Jewelry Store',
        email: 'vendor@sample.com',
        password: 'vendor123',
        contactPerson: {
          firstName: 'Sample',
          lastName: 'Vendor',
          phone: '+1234567890'
        },
        businessInfo: {
          category: 'jewelry',
          specialties: ['rings', 'necklaces', 'earrings', 'bracelets', 'watches']
        },
        address: {
          street: '123 Jewelry St',
          city: 'Sample City',
          state: 'Sample State',
          zipCode: '12345',
          country: 'USA'
        },
        status: 'active',
        verification: {
          isVerified: true
        }
      });
      await vendor.save();
    }

    const sampleProducts = [
      {
        name: 'Elegant Pearl Necklace',
        description: 'Beautiful handcrafted pearl necklace perfect for any occasion',
        category: 'Necklaces',
        price: { current: 89.99, original: 120.00 },
        images: ['necklace.png'],
        inventory: { stock: 15, sku: 'NECK001' },
        isActive: true,
        isFeatured: true,
        vendor: vendor._id
      },
      {
        name: 'Diamond Stud Earrings',
        description: 'Classic diamond stud earrings with brilliant cut stones',
        category: 'Earrings',
        price: { current: 299.99, original: 399.00 },
        images: ['earring.png'],
        inventory: { stock: 8, sku: 'EARR001' },
        isActive: true,
        isFeatured: true,
        vendor: vendor._id
      },
      {
        name: 'Gold Wedding Ring',
        description: 'Traditional 18k gold wedding ring with elegant design',
        category: 'Rings',
        price: { current: 599.99, original: 750.00 },
        images: ['ring.png'],
        inventory: { stock: 12, sku: 'RING001' },
        isActive: true,
        isFeatured: true,
        vendor: vendor._id
      },
      {
        name: 'Silver Bracelet',
        description: 'Delicate silver bracelet with intricate patterns',
        category: 'Bracelets',
        price: { current: 45.99, original: 65.00 },
        images: ['bracelet.png'],
        inventory: { stock: 20, sku: 'BRAC001' },
        isActive: true,
        isFeatured: false,
        vendor: vendor._id
      },
      {
        name: 'Luxury Watch',
        description: 'Premium luxury watch with leather strap',
        category: 'Watches',
        price: { current: 899.99, original: 1200.00 },
        images: ['watch.png'],
        inventory: { stock: 5, sku: 'WATCH001' },
        isActive: true,
        isFeatured: true,
        vendor: vendor._id
      }
    ];

    await Product.insertMany(sampleProducts);
    res.json({ message: 'Sample products created successfully!', count: sampleProducts.length });
  } catch (error) {
    console.error('Seed error:', error);
    res.status(500).json({ error: 'Failed to seed products' });
  }
});

module.exports = router; 