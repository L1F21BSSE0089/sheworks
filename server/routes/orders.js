const express = require('express');
const Order = require('../models/Order');
const Product = require('../models/Product');
const User = require('../models/User');
const Vendor = require('../models/Vendor');
const jwt = require('jsonwebtoken');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { io } = require('../server');
const serverModule = require('../server');
const connectedVendors = serverModule.connectedVendors || new Map();
const Notification = require('../models/Notification');
const nodemailer = require('nodemailer');

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

// Place a new order (customer)
router.post('/', verifyToken, async (req, res) => {
  if (req.user.userType !== 'customer') return res.status(403).json({ error: 'Only customers can place orders' });
  try {
    const { items, billingAddress, shippingAddress, payment, shipping } = req.body;
    if (!items || !Array.isArray(items) || items.length === 0) return res.status(400).json({ error: 'No items in order' });
    // Calculate totals
    let subtotal = 0;
    for (const item of items) {
      const product = await Product.findById(item.product);
      if (!product) return res.status(404).json({ error: 'Product not found' });
      if (product.inventory.stock < item.quantity) return res.status(400).json({ error: 'Insufficient stock' });
      subtotal += product.price.current * item.quantity;
      // Reduce stock
      product.inventory.stock -= item.quantity;
      await product.save();
    }
    const tax = subtotal * 0.1;
    const total = subtotal + tax + (shipping?.cost || 0) - (payment?.discount || 0);
    const order = new Order({
      customer: req.user.userId,
      items,
      billingAddress,
      shippingAddress,
      payment: { ...payment, amount: total },
      shipping,
      totals: {
        subtotal,
        tax,
        shipping: shipping?.cost || 0,
        discount: payment?.discount || 0,
        total
      },
      status: 'pending',
      statusHistory: [{ status: 'pending', timestamp: new Date() }]
    });
    await order.save();
    // Emit real-time notification to vendors
    const vendorIds = [...new Set(items.map(i => i.vendor.toString()))];
    vendorIds.forEach(async vendorId => {
      const socketId = connectedVendors.get(vendorId);
      if (socketId && io) {
        io.to(socketId).emit('order_placed', {
          orderId: order._id,
          vendorId,
          message: 'You have a new order!',
          orderSummary: {
            items: order.items.filter(i => i.vendor.toString() === vendorId),
            total: order.totals.total,
            customer: order.customer
          }
        });
      }
      // Save persistent notification
      await Notification.create({
        user: vendorId,
        type: 'order',
        message: 'You have a new order!',
        data: { orderId: order._id }
      });
    });
    // Send order confirmation email
    try {
      const user = await User.findById(req.user.userId);
      if (user && user.email) {
        const transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port: process.env.SMTP_PORT,
          secure: process.env.SMTP_SECURE === 'true',
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
          }
        });
        const itemList = items.map(i => `<li>${i.quantity}x ${i.product}</li>`).join('');
        await transporter.sendMail({
          from: process.env.SMTP_FROM || process.env.SMTP_USER,
          to: user.email,
          subject: `Order Confirmation - #${order.orderNumber || order._id}`,
          html: `<h2>Thank you for your order!</h2>
            <p>Your order has been received and is being processed.</p>
            <h3>Order Summary</h3>
            <ul>${itemList}</ul>
            <p><strong>Total:</strong> $${order.totals.total}</p>
            <h4>Shipping Address</h4>
            <p>${shippingAddress?.street || ''}, ${shippingAddress?.city || ''}, ${shippingAddress?.state || ''}, ${shippingAddress?.zipCode || ''}, ${shippingAddress?.country || ''}</p>
            <p>Order ID: ${order._id}</p>`
        });
      }
    } catch (emailErr) {
      console.error('Order confirmation email failed:', emailErr);
    }
    res.status(201).json({ order });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get all orders for current customer
router.get('/my', verifyToken, async (req, res) => {
  if (req.user.userType !== 'customer') return res.status(403).json({ error: 'Only customers can view their orders' });
  try {
    const orders = await Order.find({ customer: req.user.userId }).sort({ createdAt: -1 });
    res.json({ orders });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get all orders for current vendor
router.get('/vendor', verifyToken, async (req, res) => {
  if (req.user.userType !== 'vendor') return res.status(403).json({ error: 'Only vendors can view their orders' });
  try {
    const orders = await Order.find({ 'items.vendor': req.user.userId }).sort({ createdAt: -1 });
    res.json({ orders });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get single order
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    // Only allow customer or vendor involved to view
    if (
      (req.user.userType === 'customer' && order.customer.toString() !== req.user.userId) ||
      (req.user.userType === 'vendor' && !order.items.some(i => i.vendor.toString() === req.user.userId))
    ) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    res.json({ order });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Create Stripe payment intent
router.post('/create-payment-intent', async (req, res) => {
  try {
    const { amount, currency = 'usd' } = req.body;
    if (!amount) return res.status(400).json({ error: 'Amount is required' });
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Stripe expects cents
      currency,
      payment_method_types: ['card'],
    });
    res.json({ clientSecret: paymentIntent.client_secret });
  } catch (error) {
    console.error('Stripe error:', error);
    res.status(500).json({ error: 'Failed to create payment intent' });
  }
});

module.exports = router; 