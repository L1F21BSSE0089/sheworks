#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('🔧 SheWorks E-commerce API Setup\n');

// Frontend .env template
const frontendEnvTemplate = `# Frontend Environment Variables
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key_here
VITE_API_URL=http://localhost:5000/api
VITE_APP_NAME=SheWorks
VITE_APP_URL=http://localhost:5173
VITE_PAYPAL_CLIENT_ID=your_paypal_client_id_here
`;

// Backend .env template
const backendEnvTemplate = `# Backend Environment Variables
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key_here
PAYPAL_CLIENT_ID=your_paypal_client_id_here
PAYPAL_CLIENT_SECRET=your_paypal_client_secret_here
JWT_SECRET=your_jwt_secret_here
MONGODB_URI=your_mongodb_connection_string
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_email_password
SMTP_FROM=your_email@gmail.com
`;

async function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

async function setupEnvironment() {
  try {
    console.log('📝 Setting up environment variables...\n');

    // Create frontend .env
    const frontendEnvPath = path.join(__dirname, '.env');
    if (!fs.existsSync(frontendEnvPath)) {
      fs.writeFileSync(frontendEnvPath, frontendEnvTemplate);
      console.log('✅ Created frontend .env file');
    } else {
      console.log('⚠️  Frontend .env file already exists');
    }

    // Create backend .env
    const backendEnvPath = path.join(__dirname, 'server', '.env');
    if (!fs.existsSync(backendEnvPath)) {
      fs.writeFileSync(backendEnvPath, backendEnvTemplate);
      console.log('✅ Created backend .env file');
    } else {
      console.log('⚠️  Backend .env file already exists');
    }

    console.log('\n📋 Next Steps:');
    console.log('1. Get your Stripe API keys from: https://dashboard.stripe.com/apikeys');
    console.log('2. Get your PayPal credentials from: https://developer.paypal.com/');
    console.log('3. Update the .env files with your actual API keys');
    console.log('4. Start your servers:');
    console.log('   - Backend: cd server && npm start');
    console.log('   - Frontend: npm run dev');
    console.log('\n📖 See API_SETUP_GUIDE.md for detailed instructions');

  } catch (error) {
    console.error('❌ Error setting up environment:', error.message);
  } finally {
    rl.close();
  }
}

setupEnvironment(); 