# 🔧 API Setup Guide for SheWorks E-commerce

## 📋 Prerequisites
- Node.js and npm installed
- Git repository cloned
- Basic understanding of APIs

---

## 🎯 Step 1: Stripe Setup

### 1.1 Create Stripe Account
1. Go to [stripe.com](https://stripe.com)
2. Click "Start now" and create an account
3. Complete your business verification
4. Navigate to Dashboard

### 1.2 Get Stripe API Keys
1. In Stripe Dashboard, go to **Developers** → **API keys**
2. You'll see two keys:
   - **Publishable key** (starts with `pk_test_` for testing)
   - **Secret key** (starts with `sk_test_` for testing)
3. Copy both keys

### 1.3 Configure Frontend (.env file)
Create a `.env` file in your frontend root directory:

```env
# Frontend Environment Variables
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key_here
VITE_API_URL=http://localhost:5000/api
VITE_APP_NAME=SheWorks
VITE_APP_URL=http://localhost:5173
```

### 1.4 Configure Backend (.env file)
Create a `.env` file in your server directory:

```env
# Backend Environment Variables
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key_here
JWT_SECRET=your_jwt_secret_here
MONGODB_URI=your_mongodb_connection_string
PORT=5000
NODE_ENV=development
```

---

## 🎯 Step 2: PayPal Setup

### 2.1 Create PayPal Developer Account
1. Go to [developer.paypal.com](https://developer.paypal.com)
2. Sign up for a PayPal Developer account
3. Navigate to Dashboard

### 2.2 Create PayPal App
1. In PayPal Developer Dashboard, go to **Apps & Credentials**
2. Click **Create App**
3. Choose **Business** account type
4. Give your app a name (e.g., "SheWorks E-commerce")
5. Click **Create App**

### 2.3 Get PayPal Credentials
1. After creating the app, you'll see:
   - **Client ID**
   - **Secret**
2. Copy both credentials

### 2.4 Add PayPal to Backend (.env)
Add these to your server `.env` file:

```env
# PayPal Configuration
PAYPAL_CLIENT_ID=your_paypal_client_id_here
PAYPAL_CLIENT_SECRET=your_paypal_client_secret_here
FRONTEND_URL=http://localhost:5173
```

---

## 🎯 Step 3: Test the Integration

### 3.1 Test Stripe
1. Start your backend server: `cd server && npm start`
2. Start your frontend: `npm run dev`
3. Add items to cart and proceed to checkout
4. Use Stripe test card numbers:
   - **Visa**: 4242 4242 4242 4242
   - **MasterCard**: 5555 5555 5555 4444
   - **Expiry**: Any future date (e.g., 12/25)
   - **CVC**: Any 3 digits (e.g., 123)

### 3.2 Test PayPal
1. In checkout, select PayPal payment method
2. You'll be redirected to PayPal sandbox
3. Use PayPal sandbox account:
   - **Email**: sb-xxxxx@business.example.com
   - **Password**: (provided in PayPal developer dashboard)

---

## 🎯 Step 4: Production Setup

### 4.1 Stripe Production
1. In Stripe Dashboard, toggle to **Live** mode
2. Get your live API keys
3. Update your environment variables with live keys
4. Test with real cards (small amounts)

### 4.2 PayPal Production
1. In PayPal Developer Dashboard, switch to **Live** environment
2. Get your live credentials
3. Update environment variables
4. Test with real PayPal accounts

---

## 🔧 Troubleshooting

### Common Issues:

1. **Stripe Error: "Invalid API key"**
   - Check if you're using the correct key (test vs live)
   - Ensure the key is properly copied without extra spaces

2. **PayPal Error: "Invalid credentials"**
   - Verify your PayPal Client ID and Secret
   - Check if you're using the correct environment (sandbox vs live)

3. **CORS Error**
   - Ensure your backend CORS settings include your frontend URL
   - Check if your API URL is correct in frontend .env

4. **Payment Intent Creation Failed**
   - Verify your Stripe secret key is correct
   - Check if the amount is in the correct format (cents for USD)

### Debug Steps:
1. Check browser console for frontend errors
2. Check server logs for backend errors
3. Verify all environment variables are set
4. Test API endpoints with Postman or similar tool

---

## 📞 Support

If you encounter issues:
1. Check the error logs in browser console and server
2. Verify all environment variables are correctly set
3. Test with the provided test credentials
4. Ensure your server is running and accessible

---

## ✅ Checklist

- [ ] Stripe account created
- [ ] Stripe API keys obtained
- [ ] PayPal developer account created
- [ ] PayPal app created and credentials obtained
- [ ] Frontend .env file configured
- [ ] Backend .env file configured
- [ ] Stripe test payment successful
- [ ] PayPal test payment successful
- [ ] Production keys configured (when ready)
- [ ] All payment methods working

---

**🎉 Congratulations! Your payment integration is now complete!** 