const mongoose = require('mongoose');
const Product = require('./models/Product');
const Vendor = require('./models/Vendor');
require('dotenv').config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/sheworks';

const sampleProducts = [
  {
    name: 'Elegant Pearl Necklace',
    description: 'Beautiful handcrafted pearl necklace perfect for any occasion',
    category: 'Necklaces',
    price: {
      current: 89.99,
      original: 120.00
    },
    images: [{
      url: '/necklace.png',
      alt: 'Elegant Pearl Necklace',
      isPrimary: true
    }],
    inventory: {
      stock: 15,
      sku: 'NECK001'
    },
    isActive: true,
    isFeatured: true
  },
  {
    name: 'Diamond Stud Earrings',
    description: 'Classic diamond stud earrings with brilliant cut stones',
    category: 'Earrings',
    price: {
      current: 299.99,
      original: 399.00
    },
    images: [{
      url: '/earring.png',
      alt: 'Diamond Stud Earrings',
      isPrimary: true
    }],
    inventory: {
      stock: 8,
      sku: 'EARR001'
    },
    isActive: true,
    isFeatured: true
  },
  {
    name: 'Gold Wedding Ring',
    description: 'Traditional 18k gold wedding ring with elegant design',
    category: 'Rings',
    price: {
      current: 599.99,
      original: 750.00
    },
    images: [{
      url: '/ring.png',
      alt: 'Gold Wedding Ring',
      isPrimary: true
    }],
    inventory: {
      stock: 12,
      sku: 'RING001'
    },
    isActive: true,
    isFeatured: true
  },
  {
    name: 'Silver Bracelet',
    description: 'Delicate silver bracelet with intricate patterns',
    category: 'Bracelets',
    price: {
      current: 45.99,
      original: 65.00
    },
    images: [{
      url: '/bracelet.png',
      alt: 'Silver Bracelet',
      isPrimary: true
    }],
    inventory: {
      stock: 20,
      sku: 'BRAC001'
    },
    isActive: true,
    isFeatured: false
  },
  {
    name: 'Luxury Watch',
    description: 'Premium luxury watch with leather strap',
    category: 'Watches',
    price: {
      current: 899.99,
      original: 1200.00
    },
    images: [{
      url: '/watch.png',
      alt: 'Luxury Watch',
      isPrimary: true
    }],
    inventory: {
      stock: 5,
      sku: 'WATCH001'
    },
    isActive: true,
    isFeatured: true
  }
];

async function seedProducts() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB');

    // Check if we have any vendors
    const vendors = await Vendor.find();
    if (vendors.length === 0) {
      console.log('No vendors found. Creating a sample vendor...');
      const sampleVendor = new Vendor({
        businessName: 'Sample Jewelry Store',
        email: 'vendor@sample.com',
        password: 'vendor123',
        firstName: 'Sample',
        lastName: 'Vendor',
        phone: '+1234567890',
        address: {
          street: '123 Jewelry St',
          city: 'Sample City',
          state: 'Sample State',
          zipCode: '12345',
          country: 'USA'
        },
        isActive: true,
        isVerified: true
      });
      await sampleVendor.save();
      console.log('Sample vendor created');
    }

    // Get the first vendor (or create one if none exist)
    let vendor = await Vendor.findOne();
    if (!vendor) {
      console.log('Creating a vendor for products...');
      vendor = new Vendor({
        businessName: 'Sample Jewelry Store',
        email: 'vendor@sample.com',
        password: 'vendor123',
        firstName: 'Sample',
        lastName: 'Vendor',
        phone: '+1234567890',
        address: {
          street: '123 Jewelry St',
          city: 'Sample City',
          state: 'Sample State',
          zipCode: '12345',
          country: 'USA'
        },
        isActive: true,
        isVerified: true
      });
      await vendor.save();
    }

    // Check if products already exist
    const existingProducts = await Product.countDocuments();
    if (existingProducts > 0) {
      console.log(`${existingProducts} products already exist. Skipping seed.`);
      process.exit(0);
    }

    // Add vendor ID to each product
    const productsWithVendor = sampleProducts.map(product => ({
      ...product,
      vendor: vendor._id
    }));

    // Insert products
    await Product.insertMany(productsWithVendor);
    console.log('Sample products created successfully!');
    
    process.exit(0);
  } catch (error) {
    console.error('Error seeding products:', error);
    process.exit(1);
  }
}

seedProducts(); 