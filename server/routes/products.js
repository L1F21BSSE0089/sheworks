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

// Get all products - Optimized for speed
router.get('/', async (req, res) => {
  try {
    console.log('=== GET PRODUCTS START ===');
    const { page = 1, limit = 50, category, search, sort } = req.query;
    
    // Build query - be more lenient with isActive filter
    let query = { 
      $or: [
        { isActive: true },
        { isActive: { $exists: false } }
      ]
    };
    
    if (category) {
      query.category = category;
    }
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } }
      ];
    }
    
    // Simplified sort for faster queries
    let sortOption = { createdAt: -1 }; // Default to newest first
    if (sort === 'price-asc') sortOption = { 'price.current': 1 };
    else if (sort === 'price-desc') sortOption = { 'price.current': -1 };
    else if (sort === 'rating-desc') sortOption = { 'rating.average': -1 };
    
    const skip = (page - 1) * limit;
    
    // Ultra-optimized query - only essential fields, lean queries, no population
    const products = await Product.find(query)
      .select('name description category price images rating tags isActive createdAt')
      .sort(sortOption)
      .limit(parseInt(limit))
      .skip(skip)
      .lean() // Use lean() for maximum speed
      .exec(); // Explicit execution for better performance
      
    // Only count if we have filters or pagination
    let total = products.length;
    if (Object.keys(query).length > 1 || page > 1) {
      total = await Product.countDocuments(query).exec();
    }
    
    console.log('Found products:', products.length, 'of', total);
    console.log('=== GET PRODUCTS SUCCESS ===');
    
    // Add aggressive cache headers for better performance
    res.set('Cache-Control', 'public, max-age=600'); // Cache for 10 minutes
    res.set('ETag', `products-${products.length}-${Date.now()}`);
    
    res.json({ 
      products,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    console.error('=== GET PRODUCTS ERROR ===');
    console.error('Error:', err);
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
  body('name').notEmpty().withMessage('Product name is required'),
  body('description').notEmpty().withMessage('Product description is required'),
  body('category')
    .notEmpty().withMessage('Category is required')
    .isLength({ min: 2, max: 50 }).withMessage('Category must be between 2 and 50 characters')
    .matches(/^[^<>{}]*$/).withMessage('Category contains invalid characters'),
  body('price.current').isNumeric().withMessage('Price must be a valid number'),
  body('inventory.stock').isInt({ min: 0 }).withMessage('Stock must be a non-negative integer')
], async (req, res) => {
  try {
    console.log('=== PRODUCT CREATION START ===');
    console.log('User:', req.user);
    console.log('Request body keys:', Object.keys(req.body));
    console.log('Images count:', req.body.images ? req.body.images.length : 0);
    
    if (req.user.userType !== 'vendor') {
      console.log('Access denied: User is not a vendor');
      return res.status(403).json({ error: 'Only vendors can create products' });
    }
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('Validation errors:', errors.array());
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: errors.array().map(err => ({
          field: err.path,
          message: err.msg
        }))
      });
    }
    
    console.log('Looking for vendor with ID:', req.user.userId);
    const vendor = await Vendor.findById(req.user.userId);
    if (!vendor) {
      console.log('Vendor not found');
      return res.status(404).json({ error: 'Vendor not found' });
    }
    
    console.log('Vendor found:', vendor.businessName);
    
    // Clean up the request body to ensure it matches the schema
    const productData = {
      name: req.body.name,
      description: req.body.description,
      category: req.body.category,
      price: req.body.price,
      inventory: req.body.inventory,
      images: req.body.images || [],
      vendor: vendor._id
    };
    
    console.log('Creating product with data:', {
      ...productData,
      images: productData.images.map(img => ({ ...img, url: img.url ? img.url.substring(0, 50) + '...' : 'no url' }))
    });
    
    const product = new Product(productData);
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
    
    // Handle Mongoose validation errors
    if (err.name === 'ValidationError') {
      const validationErrors = Object.values(err.errors).map(error => ({
        field: error.path,
        message: error.message
      }));
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: validationErrors 
      });
    }
    
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

// AI-powered product recommendations using Hugging Face
const getAIRecommendations = async (userPreferences = null, limit = 8) => {
  try {
    const huggingfaceApiKey = process.env.HUGGINGFACE_API_KEY;
    
    if (!huggingfaceApiKey) {
      console.log('No Hugging Face API key, using fallback recommendations');
      return await getFallbackRecommendations(limit);
    }

    // For now, use fallback recommendations
    // TODO: Implement proper AI recommendations when fetch issues are resolved
    console.log('Using fallback recommendations (AI integration pending)');
    return await getFallbackRecommendations(limit);
    
  } catch (error) {
    console.error('AI recommendation error:', error);
    return await getFallbackRecommendations(limit);
  }
};

// Fallback recommendation logic
const getFallbackRecommendations = async (limit = 8) => {
  try {
    const products = await Product.find({ isActive: true })
      .sort({ 'rating.average': -1, 'inventory.stock': -1 })
      .limit(parseInt(limit))
      .populate('vendor', 'businessName')
      .lean();
    
    return products;
  } catch (error) {
    console.error('Fallback recommendation error:', error);
    return [];
  }
};

// AI-powered product recommendations
router.get('/recommendations', async (req, res) => {
  try {
    const { userId, limit = 8 } = req.query;
    
    // Get user preferences if available
    let userPreferences = null;
    if (userId) {
      const userOrders = await Order.find({ customer: userId })
        .populate('items.product')
        .sort({ createdAt: -1 })
        .limit(5);
      
      const purchasedCategories = userOrders.flatMap(order => 
        order.items.map(item => item.product?.category).filter(Boolean)
      );
      
      if (purchasedCategories.length > 0) {
        userPreferences = `user prefers: ${purchasedCategories.join(', ')}`;
      }
    }
    
    const products = await getAIRecommendations(userPreferences, limit);
    res.json({ products });
  } catch (err) {
    console.error('Recommendation error:', err);
    res.status(500).json({ error: 'Failed to get recommendations' });
  }
});

// Trending products
router.get('/trending', async (req, res) => {
  try {
    const { limit = 8 } = req.query;
    
    // Get products with high ratings and recent activity
    const products = await Product.find({ isActive: true })
      .sort({ 'rating.average': -1, createdAt: -1 })
      .limit(parseInt(limit))
      .populate('vendor', 'businessName')
      .lean();
    
    res.json({ products });
  } catch (err) {
    console.error('Trending products error:', err);
    res.status(500).json({ error: 'Failed to get trending products' });
  }
});

// Similar products
router.get('/:id/similar', async (req, res) => {
  try {
    const { id } = req.params;
    const { limit = 4 } = req.query;
    
    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    // Find products in same category
    const similarProducts = await Product.find({
      _id: { $ne: id },
      category: product.category,
      isActive: true
    })
      .sort({ 'rating.average': -1 })
      .limit(parseInt(limit))
      .populate('vendor', 'businessName')
      .lean();
    
    res.json({ products: similarProducts });
  } catch (err) {
    console.error('Similar products error:', err);
    res.status(500).json({ error: 'Failed to get similar products' });
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
        images: [{
          url: '/necklace.png',
          alt: 'Elegant Pearl Necklace',
          isPrimary: true
        }],
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
        images: [{
          url: '/earring.png',
          alt: 'Diamond Stud Earrings',
          isPrimary: true
        }],
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
        images: [{
          url: '/ring.png',
          alt: 'Gold Wedding Ring',
          isPrimary: true
        }],
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
        images: [{
          url: '/bracelet.png',
          alt: 'Silver Bracelet',
          isPrimary: true
        }],
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
        images: [{
          url: '/watch.png',
          alt: 'Luxury Watch',
          isPrimary: true
        }],
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
        images: [{
          url: '/necklace.png',
          alt: 'Elegant Pearl Necklace',
          isPrimary: true
        }],
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
        images: [{
          url: '/earring.png',
          alt: 'Diamond Stud Earrings',
          isPrimary: true
        }],
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
        images: [{
          url: '/ring.png',
          alt: 'Gold Wedding Ring',
          isPrimary: true
        }],
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
        images: [{
          url: '/bracelet.png',
          alt: 'Silver Bracelet',
          isPrimary: true
        }],
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
        images: [{
          url: '/watch.png',
          alt: 'Luxury Watch',
          isPrimary: true
        }],
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

// Test endpoint to create a simple product
router.post('/test-create', verifyToken, async (req, res) => {
  try {
    console.log('=== TEST PRODUCT CREATION ===');
    
    if (req.user.userType !== 'vendor') {
      return res.status(403).json({ error: 'Only vendors can create products' });
    }
    
    const vendor = await Vendor.findById(req.user.userId);
    if (!vendor) {
      return res.status(404).json({ error: 'Vendor not found' });
    }
    
    const testProduct = new Product({
      name: 'Test Product',
      description: 'A test product',
      category: 'test',
      price: { current: 10.00 },
      inventory: { stock: 5 },
      vendor: vendor._id,
      images: [{ url: '/shop.webp', alt: 'Test Product', isPrimary: true }]
    });
    
    await testProduct.save();
    console.log('Test product created:', testProduct._id);
    
    res.status(201).json({ product: testProduct });
  } catch (err) {
    console.error('Test product creation error:', err);
    res.status(500).json({ error: 'Test failed', details: err.message });
  }
});

// Debug endpoint to check all products in database
router.get('/debug/all', async (req, res) => {
  try {
    console.log('=== DEBUG ALL PRODUCTS ===');
    
    // Get all products without any filters
    const allProducts = await Product.find({});
    console.log('Total products in DB:', allProducts.length);
    
    // Get active products
    const activeProducts = await Product.find({ isActive: true });
    console.log('Active products:', activeProducts.length);
    
    // Get inactive products
    const inactiveProducts = await Product.find({ isActive: false });
    console.log('Inactive products:', inactiveProducts.length);
    
    // Get products without isActive field
    const noActiveField = await Product.find({ isActive: { $exists: false } });
    console.log('Products without isActive field:', noActiveField.length);
    
    res.json({
      total: allProducts.length,
      active: activeProducts.length,
      inactive: inactiveProducts.length,
      noActiveField: noActiveField.length,
      sampleProducts: allProducts.slice(0, 3).map(p => ({
        id: p._id,
        name: p.name,
        isActive: p.isActive,
        category: p.category
      }))
    });
  } catch (err) {
    console.error('Debug endpoint error:', err);
    res.status(500).json({ error: 'Debug failed', details: err.message });
  }
});

// Get vendor's own products (vendor only)
router.get('/vendor/my', verifyToken, async (req, res) => {
  try {
    console.log('=== GET VENDOR PRODUCTS START ===');
    
    if (req.user.userType !== 'vendor') {
      return res.status(403).json({ error: 'Only vendors can access this endpoint' });
    }
    
    const { page = 1, limit = 50, sort } = req.query;
    
    // Build query for vendor's products only
    const query = { vendor: req.user.userId };
    
    // Simplified sort for faster queries
    let sortOption = { createdAt: -1 }; // Default to newest first
    if (sort === 'price-asc') sortOption = { 'price.current': 1 };
    else if (sort === 'price-desc') sortOption = { 'price.current': -1 };
    else if (sort === 'rating-desc') sortOption = { 'rating.average': -1 };
    
    const skip = (page - 1) * limit;
    
    // Ultra-optimized query for vendor products
    const products = await Product.find(query)
      .select('name description category price images rating tags isActive createdAt inventory')
      .sort(sortOption)
      .limit(parseInt(limit))
      .skip(skip)
      .lean() // Use lean() for maximum speed
      .exec(); // Explicit execution for better performance
      
    const total = await Product.countDocuments(query).exec();
    
    console.log('Found vendor products:', products.length, 'of', total);
    console.log('=== GET VENDOR PRODUCTS SUCCESS ===');
    
    // Add cache headers for better performance
    res.set('Cache-Control', 'private, max-age=300'); // Cache for 5 minutes (private for vendor)
    
    res.json({ 
      products,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    console.error('=== GET VENDOR PRODUCTS ERROR ===');
    console.error('Error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Simple health check for products service
router.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    service: 'products',
    timestamp: new Date().toISOString(),
    message: 'Products service is running'
  });
});

module.exports = router; 