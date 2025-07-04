const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const http = require('http');
const socketIo = require('socket.io');
require('dotenv').config();

const app = express();
const server = http.createServer(app);

// Trust proxy for Railway deployment
app.set('trust proxy', 1);

// CORS configuration for production
const allowedOrigins = [
  process.env.FRONTEND_URL || "http://localhost:5173",
  "https://your-vercel-app.vercel.app",
  "https://*.vercel.app"
];

const io = socketIo(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Middleware
app.use(helmet());
app.use(compression());
app.use(morgan('combined'));
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Check if origin is in allowed list
    const isAllowed = allowedOrigins.some(allowedOrigin => {
      if (allowedOrigin.includes('*')) {
        // Handle wildcard domains
        const pattern = allowedOrigin.replace('*', '.*');
        return new RegExp(pattern).test(origin);
      }
      return allowedOrigin === origin;
    });
    
    if (isAllowed) {
      callback(null, true);
    } else {
      console.log('CORS blocked origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/api/', limiter);

// Database connection
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/she-ecommerce', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('✅ Connected to MongoDB'))
.catch(err => console.error('❌ MongoDB connection error:', err));

// Import routes
const { router: authRoutes } = require('./routes/auth');
// const userRoutes = require('./routes/users');
// const vendorRoutes = require('./routes/vendors');
const productRoutes = require('./routes/products');
const orderRoutes = require('./routes/orders');
const messageRoutes = require('./routes/messages');
const adminRoutes = require('./routes/admin');
const notificationsRoutes = require('./routes/notifications');

// Routes
app.use('/api/auth', authRoutes);
// app.use('/api/users', userRoutes);
// app.use('/api/vendors', vendorRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/notifications', notificationsRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Simple test endpoint for debugging
app.get('/api/test', (req, res) => {
  res.json({ 
    message: 'Test endpoint working',
    timestamp: new Date().toISOString()
  });
});

// Test POST endpoint
app.post('/api/test', (req, res) => {
  console.log('Test POST request received:', req.body);
  res.json({ 
    message: 'Test POST endpoint working',
    receivedData: req.body,
    timestamp: new Date().toISOString()
  });
});

// Test products endpoint
app.get('/api/test-products', async (req, res) => {
  try {
    const Product = require('./models/Product');
    const count = await Product.countDocuments();
    res.json({ 
      message: 'Products test successful',
      productCount: count,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Test products error:', error);
    res.status(500).json({ 
      error: 'Products test failed',
      details: error.message 
    });
  }
});

// Test auth endpoint
app.post('/api/test-auth', async (req, res) => {
  try {
    console.log('Test auth endpoint called with body:', req.body);
    
    // Check JWT_SECRET
    if (!process.env.JWT_SECRET) {
      return res.status(500).json({ 
        error: 'JWT_SECRET is not configured',
        details: 'This is likely the cause of registration failures'
      });
    }
    
    const User = require('./models/User');
    const bcrypt = require('bcryptjs');
    
    // Test creating a simple user
    const testUser = new User({
      username: 'testuser' + Date.now(),
      email: 'test@example.com',
      password: 'test123',
      firstName: 'Test',
      lastName: 'User'
    });
    
    await testUser.save();
    console.log('Test user created successfully:', testUser._id);
    
    res.json({ 
      message: 'Auth test successful',
      userId: testUser._id,
      jwtSecretConfigured: !!process.env.JWT_SECRET,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Auth test error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      error: 'Auth test failed', 
      details: error.message,
      stack: error.stack,
      jwtSecretConfigured: !!process.env.JWT_SECRET
    });
  }
});

// Comprehensive seed endpoint with multiple products
app.get('/api/seed-full', async (req, res) => {
  try {
    console.log('Comprehensive seed endpoint called');
    
    const Product = require('./models/Product');
    const Vendor = require('./models/Vendor');
    
    // Check if products exist
    const existingProducts = await Product.countDocuments();
    if (existingProducts > 0) {
      return res.json({ message: `${existingProducts} products already exist. Skipping seed.` });
    }
    
    // Create vendor
    let vendor = await Vendor.findOne();
    if (!vendor) {
      vendor = new Vendor({
        businessName: 'Elegant Jewelry Store',
        email: 'jewelry@store.com',
        password: 'jewelry123',
        contactPerson: {
          firstName: 'Elegant',
          lastName: 'Jewelry',
          phone: '+1234567890'
        },
        businessInfo: {
          category: 'jewelry',
          specialties: ['rings', 'necklaces', 'earrings', 'bracelets', 'watches']
        },
        status: 'active',
        verification: { isVerified: true }
      });
      await vendor.save();
      console.log('Created vendor');
    }
    
    // Create multiple products
    const products = [
      {
        name: 'Elegant Pearl Necklace',
        description: 'Beautiful handcrafted pearl necklace perfect for any occasion',
        vendor: vendor._id,
        category: 'necklaces',
        price: { current: 89.99, original: 120.00, currency: 'USD' },
        images: [{ url: '/necklace.png', alt: 'Pearl Necklace', isPrimary: true }],
        inventory: { stock: 15, sku: 'NECK001', lowStockThreshold: 5 },
        status: 'active',
        featured: true,
        tags: ['pearl', 'elegant', 'necklace']
      },
      {
        name: 'Diamond Stud Earrings',
        description: 'Classic diamond stud earrings with brilliant cut stones',
        vendor: vendor._id,
        category: 'earrings',
        price: { current: 299.99, original: 399.00, currency: 'USD' },
        images: [{ url: '/earring.png', alt: 'Diamond Earrings', isPrimary: true }],
        inventory: { stock: 8, sku: 'EARR001', lowStockThreshold: 3 },
        status: 'active',
        featured: true,
        tags: ['diamond', 'classic', 'earrings']
      },
      {
        name: 'Gold Wedding Ring',
        description: 'Traditional 18k gold wedding ring with elegant design',
        vendor: vendor._id,
        category: 'rings',
        price: { current: 599.99, original: 750.00, currency: 'USD' },
        images: [{ url: '/ring.png', alt: 'Gold Ring', isPrimary: true }],
        inventory: { stock: 12, sku: 'RING001', lowStockThreshold: 4 },
        status: 'active',
        featured: true,
        tags: ['gold', 'wedding', 'ring']
      },
      {
        name: 'Silver Bracelet',
        description: 'Delicate silver bracelet with intricate patterns',
        vendor: vendor._id,
        category: 'bracelets',
        price: { current: 45.99, original: 65.00, currency: 'USD' },
        images: [{ url: '/bracelet.png', alt: 'Silver Bracelet', isPrimary: true }],
        inventory: { stock: 20, sku: 'BRAC001', lowStockThreshold: 5 },
        status: 'active',
        featured: false,
        tags: ['silver', 'delicate', 'bracelet']
      },
      {
        name: 'Luxury Watch',
        description: 'Premium luxury watch with leather strap',
        vendor: vendor._id,
        category: 'watches',
        price: { current: 899.99, original: 1200.00, currency: 'USD' },
        images: [{ url: '/watch.png', alt: 'Luxury Watch', isPrimary: true }],
        inventory: { stock: 5, sku: 'WATCH001', lowStockThreshold: 2 },
        status: 'active',
        featured: true,
        tags: ['luxury', 'watch', 'premium']
      }
    ];
    
    await Product.insertMany(products);
    console.log('Created', products.length, 'products');
    res.json({ message: `${products.length} products created successfully!` });
  } catch (error) {
    console.error('Comprehensive seed error:', error);
    res.status(500).json({ error: 'Seed failed', details: error.message });
  }
});

// Socket.io connection handling
const connectedUsers = new Map();
const connectedVendors = new Map();

io.on('connection', (socket) => {
  console.log('🔌 New client connected:', socket.id);

  // Handle user authentication
  socket.on('authenticate', (data) => {
    const { userId, userType } = data;
    if (userType === 'customer') {
      connectedUsers.set(userId, socket.id);
    } else if (userType === 'vendor') {
      connectedVendors.set(userId, socket.id);
    }
    socket.userId = userId;
    socket.userType = userType;
    console.log(`👤 ${userType} ${userId} authenticated`);
  });

  // Handle private messages
  socket.on('send_message', async (data) => {
    const { recipientId, message, language, senderType } = data;
    
    try {
      console.log('📤 Socket message received:', { recipientId, message, language, senderType, senderId: socket.userId });
      
      // Import Message model
      const Message = require('./models/Message');
      const User = require('./models/User');
      const Vendor = require('./models/Vendor');
      
      // Validate recipient exists
      let recipient = await User.findById(recipientId);
      let recipientType = 'customer';
      
      if (!recipient) {
        recipient = await Vendor.findById(recipientId);
        recipientType = 'vendor';
      }

      if (!recipient) {
        console.error('❌ Recipient not found:', recipientId);
        socket.emit('message_error', { error: 'Recipient not found' });
        return;
      }

      // Create and save message to database
      const newMessage = new Message({
        sender: {
          id: socket.userId,
          model: senderType === 'customer' ? 'User' : 'Vendor',
          type: senderType
        },
        recipient: {
          id: recipientId,
          model: recipientType === 'customer' ? 'User' : 'Vendor',
          type: recipientType
        },
        content: {
          text: message,
          language: language || 'en'
        }
      });

      await newMessage.save();
      console.log('✅ Message saved to database:', newMessage._id);

      // Populate sender and recipient info
      await newMessage.populate('sender.id', 'firstName lastName username businessName');
      await newMessage.populate('recipient.id', 'firstName lastName username businessName');

      // Create the message object to send via socket
      const savedMessage = {
        _id: newMessage._id,
        sender: {
          id: newMessage.sender.id._id || newMessage.sender.id,
          type: newMessage.sender.type,
          name: newMessage.sender.id.businessName || `${newMessage.sender.id.firstName} ${newMessage.sender.id.lastName}`
        },
        recipient: {
          id: newMessage.recipient.id._id || newMessage.recipient.id,
          type: newMessage.recipient.type,
          name: newMessage.recipient.id.businessName || `${newMessage.recipient.id.firstName} ${newMessage.recipient.id.lastName}`
        },
        content: {
          text: newMessage.content.text,
          language: newMessage.content.language
        },
        createdAt: newMessage.createdAt,
        conversationId: newMessage.conversationId
      };

      // Emit to recipient if online
      const recipientSocketId = senderType === 'customer' 
        ? connectedVendors.get(recipientId)
        : connectedUsers.get(recipientId);

      if (recipientSocketId) {
        console.log('📡 Emitting message to recipient:', recipientSocketId);
        io.to(recipientSocketId).emit('new_message', savedMessage);
      } else {
        console.log('📡 Recipient not online:', recipientId);
      }

      // Send confirmation back to sender
      socket.emit('message_sent', savedMessage);
      console.log('✅ Message sent successfully');
      
    } catch (error) {
      console.error('❌ Socket message error:', error);
      socket.emit('message_error', { error: 'Failed to send message', details: error.message });
    }
  });

  // Handle typing indicators
  socket.on('typing', (data) => {
    const { recipientId, isTyping, senderType } = data;
    const recipientSocketId = senderType === 'customer' 
      ? connectedVendors.get(recipientId)
      : connectedUsers.get(recipientId);

    if (recipientSocketId) {
      io.to(recipientSocketId).emit('user_typing', {
        userId: socket.userId,
        isTyping
      });
    }
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log('🔌 Client disconnected:', socket.id);
    
    if (socket.userId) {
      if (socket.userType === 'customer') {
        connectedUsers.delete(socket.userId);
      } else if (socket.userType === 'vendor') {
        connectedVendors.delete(socket.userId);
      }
    }
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    error: 'Something went wrong!',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📱 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:5173'}`);
  console.log(`🔌 Socket.io ready for real-time chat`);
});

module.exports = { app, io }; 