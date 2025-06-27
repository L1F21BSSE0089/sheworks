const express = require('express');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const Vendor = require('../models/Vendor');
const mongoose = require('mongoose');
const Product = require('../models/Product');

const router = express.Router();

// Generate JWT token
const generateToken = (userId, userType) => {
  return jwt.sign(
    { userId, userType },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
};

// Register User (Customer)
router.post('/register/user', [
  body('username').isLength({ min: 3 }).withMessage('Username must be at least 3 characters'),
  body('email').isEmail().withMessage('Please enter a valid email'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('firstName').notEmpty().withMessage('First name is required'),
  body('lastName').notEmpty().withMessage('Last name is required')
], async (req, res) => {
  try {
    console.log('=== USER REGISTRATION START ===');
    
    // Check if JWT_SECRET is configured
    if (!process.env.JWT_SECRET) {
      console.error('JWT_SECRET is not configured!');
      return res.status(500).json({ 
        error: 'Server configuration error', 
        details: 'JWT_SECRET environment variable is missing' 
      });
    }
    
    console.log('Request body:', JSON.stringify(req.body, null, 2));
    console.log('Request headers:', req.headers);
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('Validation errors:', errors.array());
      return res.status(400).json({ errors: errors.array() });
    }

    const { username, email, password, firstName, lastName, phone } = req.body;
    console.log('Extracted data:', { username, email, firstName, lastName, phone: phone || 'not provided' });

    // Check if user already exists
    console.log('Checking for existing user...');
    const existingUser = await User.findOne({ 
      $or: [{ email }, { username }] 
    });

    if (existingUser) {
      console.log('User already exists:', { email, username });
      return res.status(400).json({ 
        error: 'User with this email or username already exists' 
      });
    }

    console.log('Creating new user...');
    
    // Create new user
    const user = new User({
      username,
      email,
      password,
      firstName,
      lastName,
      phone
    });

    console.log('User object created, saving to database...');
    await user.save();
    console.log('User saved successfully:', user._id);

    // Generate token
    console.log('Generating JWT token...');
    const token = generateToken(user._id, 'customer');
    console.log('Token generated successfully');

    const responseData = {
      message: 'User registered successfully',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        fullName: user.fullName
      }
    };

    console.log('Sending response:', JSON.stringify(responseData, null, 2));
    console.log('=== USER REGISTRATION SUCCESS ===');
    
    res.status(201).json(responseData);

  } catch (error) {
    console.error('=== USER REGISTRATION ERROR ===');
    console.error('Error details:', error);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    console.error('=== END ERROR ===');
    res.status(500).json({ error: 'Server error', details: error.message });
  }
});

// Register Vendor
router.post('/register/vendor', [
  body('businessName').notEmpty().withMessage('Business name is required'),
  body('email').isEmail().withMessage('Please enter a valid email'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('contactPerson.firstName').notEmpty().withMessage('Contact person first name is required'),
  body('contactPerson.lastName').notEmpty().withMessage('Contact person last name is required'),
  body('contactPerson.phone').notEmpty().withMessage('Contact phone is required'),
  body('businessInfo.category').notEmpty().withMessage('Business category is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { 
      businessName, 
      email, 
      password, 
      contactPerson, 
      businessInfo,
      address,
      languages 
    } = req.body;

    // Check if vendor already exists
    const existingVendor = await Vendor.findOne({ email });

    if (existingVendor) {
      return res.status(400).json({ 
        error: 'Vendor with this email already exists' 
      });
    }

    // Create new vendor
    const vendor = new Vendor({
      businessName,
      email,
      password,
      contactPerson,
      businessInfo,
      address,
      languages: languages || ['en']
    });

    await vendor.save();

    // Generate token
    const token = generateToken(vendor._id, 'vendor');

    res.status(201).json({
      message: 'Vendor registered successfully',
      token,
      vendor: {
        id: vendor._id,
        businessName: vendor.businessName,
        email: vendor.email,
        contactPerson: vendor.contactPerson,
        status: vendor.status
      }
    });

  } catch (error) {
    console.error('Vendor registration error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Login User
router.post('/login/user', [
  body('email').isEmail().withMessage('Please enter a valid email'),
  body('password').notEmpty().withMessage('Password is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    // Find user
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check password
    const isPasswordValid = await user.comparePassword(password);

    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate token
    const token = generateToken(user._id, 'customer');

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        fullName: user.fullName,
        preferences: user.preferences
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Login Vendor
router.post('/login/vendor', [
  body('email').isEmail().withMessage('Please enter a valid email'),
  body('password').notEmpty().withMessage('Password is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    // Find vendor
    const vendor = await Vendor.findOne({ email });

    if (!vendor) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check password
    const isPasswordValid = await vendor.comparePassword(password);

    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check if vendor is active
    if (vendor.status !== 'active') {
      return res.status(403).json({ 
        error: 'Account is not active. Please contact support.' 
      });
    }

    // Update last login
    vendor.lastLogin = new Date();
    await vendor.save();

    // Generate token
    const token = generateToken(vendor._id, 'vendor');

    res.json({
      message: 'Login successful',
      token,
      vendor: {
        id: vendor._id,
        businessName: vendor.businessName,
        email: vendor.email,
        contactPerson: vendor.contactPerson,
        status: vendor.status,
        verification: vendor.verification,
        languages: vendor.languages
      }
    });

  } catch (error) {
    console.error('Vendor login error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Google OAuth routes
router.post('/google', async (req, res) => {
  try {
    console.log('Google OAuth attempt:', req.body);
    
    const { email, name, picture, googleId, userType = 'customer' } = req.body;
    
    if (!email || !name) {
      return res.status(400).json({ error: 'Email and name are required' });
    }

    if (userType === 'vendor') {
      // Handle vendor Google signup
      let vendor = await Vendor.findOne({ email });

      if (!vendor) {
        // Create new vendor from Google data
        const [firstName, ...lastNameParts] = name.split(' ');
        const lastName = lastNameParts.join(' ') || '';
        
        vendor = new Vendor({
          businessName: name + ' Store',
          email,
          contactPerson: {
            firstName,
            lastName,
            phone: 'Not provided'
          },
          password: 'google-auth-' + Math.random().toString(36).substr(2, 15), // Random password for Google users
          businessInfo: {
            category: 'other'
          },
          status: 'active',
          verification: { isVerified: true },
          googleId: googleId
        });

        await vendor.save();
        console.log('Google vendor created:', vendor._id);
      }

      // Generate token
      const token = generateToken(vendor._id, 'vendor');

      res.json({
        message: 'Google vendor authentication successful',
        token,
        vendor: {
          id: vendor._id,
          businessName: vendor.businessName,
          email: vendor.email,
          contactPerson: vendor.contactPerson,
          status: vendor.status
        }
      });
    } else {
      // Handle customer Google signup (existing code)
      let user = await User.findOne({ email });

      if (!user) {
        // Create new user from Google data
        const [firstName, ...lastNameParts] = name.split(' ');
        const lastName = lastNameParts.join(' ') || '';
        
        user = new User({
          username: email.split('@')[0] + Math.random().toString(36).substr(2, 5),
          email,
          firstName,
          lastName,
          password: 'google-auth-' + Math.random().toString(36).substr(2, 15), // Random password for Google users
          avatar: picture,
          isVerified: true, // Google accounts are pre-verified
          googleId: googleId
        });

        await user.save();
        console.log('Google user created:', user._id);
      }

      // Generate token
      const token = generateToken(user._id, 'customer');

      res.json({
        message: 'Google authentication successful',
        token,
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          fullName: user.fullName,
          avatar: user.avatar
        }
      });
    }

  } catch (error) {
    console.error('Google OAuth error:', error);
    res.status(500).json({ error: 'Google authentication failed', details: error.message });
  }
});

// Verify Token (Middleware)
const verifyToken = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// Get current user/vendor
router.get('/me', verifyToken, async (req, res) => {
  try {
    const { userId, userType } = req.user;

    if (userType === 'customer') {
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      res.json({ user });
    } else if (userType === 'vendor') {
      const vendor = await Vendor.findById(userId);
      if (!vendor) {
        return res.status(404).json({ error: 'Vendor not found' });
      }
      res.json({ vendor });
    }

  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Logout (client-side token removal)
router.post('/logout', verifyToken, (req, res) => {
  res.json({ message: 'Logged out successfully' });
});

// Get current user's wishlist
router.get('/users/me/wishlist', verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).populate('wishlist.product');
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ wishlist: user.wishlist });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Add product to wishlist
router.post('/users/me/wishlist', verifyToken, async (req, res) => {
  try {
    const { productId } = req.body;
    if (!mongoose.Types.ObjectId.isValid(productId)) return res.status(400).json({ error: 'Invalid product ID' });
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.wishlist.some(item => item.product.toString() === productId)) {
      return res.status(400).json({ error: 'Product already in wishlist' });
    }
    user.wishlist.push({ product: productId });
    await user.save();
    res.json({ wishlist: user.wishlist });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Remove product from wishlist
router.delete('/users/me/wishlist/:productId', verifyToken, async (req, res) => {
  try {
    const { productId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(productId)) return res.status(400).json({ error: 'Invalid product ID' });
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    user.wishlist = user.wishlist.filter(item => item.product.toString() !== productId);
    await user.save();
    res.json({ wishlist: user.wishlist });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = { router, verifyToken }; 