const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/sheworks';

async function seedAdmin() {
  await mongoose.connect(MONGO_URI);
  const existingAdmin = await User.findOne({ role: 'admin' });
  if (existingAdmin) {
    console.log('Admin user already exists:', existingAdmin.email);
    process.exit(0);
  }
  const admin = new User({
    username: 'admin',
    email: 'admin@sheworks.com',
    password: 'admin123',
    firstName: 'Admin',
    lastName: 'User',
    role: 'admin',
    isActive: true,
    isVerified: true
  });
  await admin.save();
  console.log('Admin user created: admin@sheworks.com / admin123');
  process.exit(0);
}

seedAdmin().catch(err => {
  console.error('Error seeding admin:', err);
  process.exit(1);
}); 