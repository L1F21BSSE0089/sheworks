const mongoose = require('mongoose');
const User = require('./models/User');
const Vendor = require('./models/Vendor');
require('dotenv').config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/sheworks';

async function seedTestUsers() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB');

    // Create test customers
    const testCustomers = [
      {
        username: 'john_doe',
        email: 'john@example.com',
        password: 'password123',
        firstName: 'John',
        lastName: 'Doe',
        isActive: true,
        isVerified: true
      },
      {
        username: 'jane_smith',
        email: 'jane@example.com',
        password: 'password123',
        firstName: 'Jane',
        lastName: 'Smith',
        isActive: true,
        isVerified: true
      },
      {
        username: 'mike_wilson',
        email: 'mike@example.com',
        password: 'password123',
        firstName: 'Mike',
        lastName: 'Wilson',
        isActive: true,
        isVerified: true
      }
    ];

    // Create test vendors
    const testVendors = [
      {
        businessName: 'Elegant Jewelry',
        email: 'elegant@jewelry.com',
        password: 'password123',
        contactPerson: {
          firstName: 'Sarah',
          lastName: 'Johnson',
          phone: '+1234567890'
        },
        businessInfo: {
          description: 'Premium jewelry and accessories',
          category: 'jewelry'
        },
        status: 'active',
        verification: {
          isVerified: true
        }
      },
      {
        businessName: 'Fashion Forward',
        email: 'fashion@forward.com',
        password: 'password123',
        contactPerson: {
          firstName: 'David',
          lastName: 'Brown',
          phone: '+1234567891'
        },
        businessInfo: {
          description: 'Trendy fashion accessories',
          category: 'fashion'
        },
        status: 'active',
        verification: {
          isVerified: true
        }
      },
      {
        businessName: 'Luxury Watches',
        email: 'luxury@watches.com',
        password: 'password123',
        contactPerson: {
          firstName: 'Emma',
          lastName: 'Davis',
          phone: '+1234567892'
        },
        businessInfo: {
          description: 'High-end timepieces',
          category: 'watches'
        },
        status: 'active',
        verification: {
          isVerified: true
        }
      }
    ];

    // Check if users already exist
    for (const customerData of testCustomers) {
      const existingCustomer = await User.findOne({ email: customerData.email });
      if (!existingCustomer) {
        const customer = new User(customerData);
        await customer.save();
        console.log(`✅ Created customer: ${customer.email}`);
      } else {
        console.log(`⏭️ Customer already exists: ${customerData.email}`);
      }
    }

    // Check if vendors already exist
    for (const vendorData of testVendors) {
      const existingVendor = await Vendor.findOne({ email: vendorData.email });
      if (!existingVendor) {
        const vendor = new Vendor(vendorData);
        await vendor.save();
        console.log(`✅ Created vendor: ${vendor.email}`);
      } else {
        console.log(`⏭️ Vendor already exists: ${vendorData.email}`);
      }
    }

    // Count total users and vendors
    const totalCustomers = await User.countDocuments();
    const totalVendors = await Vendor.countDocuments();
    
    console.log(`\n📊 Database Summary:`);
    console.log(`👥 Total customers: ${totalCustomers}`);
    console.log(`🏪 Total vendors: ${totalVendors}`);
    console.log(`📝 Total users: ${totalCustomers + totalVendors}`);

    console.log('\n✅ Test users seeding completed!');
    process.exit(0);

  } catch (error) {
    console.error('❌ Error seeding test users:', error);
    process.exit(1);
  }
}

seedTestUsers(); 