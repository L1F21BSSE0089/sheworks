# 🚀 Vercel Deployment Guide for SheWorks E-commerce

## 📋 Prerequisites
- GitHub repository with your code
- Stripe account (sandbox mode)
- PayPal Developer account
- MongoDB database (MongoDB Atlas recommended)

---

## 🎯 Step 1: Deploy Backend to Railway

### 1.1 Set Up Railway Account
1. Go to [railway.app](https://railway.app)
2. Sign up with your GitHub account
3. Click "New Project"

### 1.2 Deploy Your Backend
1. Choose "Deploy from GitHub repo"
2. Select your repository
3. Set the **Root Directory** to `/server`
4. Click "Deploy"

### 1.3 Configure Railway Environment Variables
In your Railway project dashboard:
1. Go to **Variables** tab
2. Add these environment variables:

```env
# Database
MONGODB_URI=your_mongodb_atlas_connection_string

# JWT
JWT_SECRET=your_super_secret_jwt_key_here

# Stripe
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key_here

# PayPal
PAYPAL_CLIENT_ID=your_paypal_client_id_here
PAYPAL_CLIENT_SECRET=your_paypal_client_secret_here

# App Configuration
NODE_ENV=production
PORT=5000

# Frontend URL (will be updated after Vercel deployment)
FRONTEND_URL=https://your-vercel-app.vercel.app

# Email Configuration (optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_email_password
SMTP_FROM=your_email@gmail.com
```

### 1.4 Get Your Railway URL
1. After deployment, go to **Settings** → **Domains**
2. Copy your Railway URL (e.g., `https://your-app.railway.app`)
3. This is your backend API URL

---

## 🎯 Step 2: Deploy Frontend to Vercel

### 2.1 Set Up Vercel Account
1. Go to [vercel.com](https://vercel.com)
2. Sign up with your GitHub account
3. Click "New Project"

### 2.2 Deploy Your Frontend
1. Import your GitHub repository
2. Set the **Root Directory** to `/` (main directory)
3. Set the **Framework Preset** to `Vite`
4. Click "Deploy"

### 2.3 Configure Vercel Environment Variables
In your Vercel project dashboard:
1. Go to **Settings** → **Environment Variables**
2. Add these variables:

```env
# API Configuration
VITE_API_URL=https://your-railway-app.railway.app/api

# Stripe
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key_here

# App Configuration
VITE_APP_NAME=SheWorks
VITE_APP_URL=https://your-vercel-app.vercel.app
```

### 2.4 Update Railway Frontend URL
1. Go back to Railway dashboard
2. Update the `FRONTEND_URL` variable with your Vercel URL:
```env
FRONTEND_URL=https://your-vercel-app.vercel.app
```

---

## 🎯 Step 3: Get Your API Keys

### 3.1 Stripe Setup
1. Go to [stripe.com](https://stripe.com) and create account
2. Go to **Developers** → **API keys**
3. Copy your **Publishable key** (`pk_test_...`) and **Secret key** (`sk_test_...`)

### 3.2 PayPal Setup
1. Go to [developer.paypal.com](https://developer.paypal.com)
2. Create app and get **Client ID** and **Secret**

### 3.3 MongoDB Atlas (if not already set up)
1. Go to [mongodb.com](https://mongodb.com)
2. Create free cluster
3. Get your connection string
4. Replace `<password>` with your database password

---

## 🎯 Step 4: Update Environment Variables

### 4.1 Update Railway Variables
Replace the placeholder values in Railway with your actual API keys:

```env
# Replace these with your actual values
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/sheworks
STRIPE_SECRET_KEY=sk_test_51ABC123...
PAYPAL_CLIENT_ID=ABC123...
PAYPAL_CLIENT_SECRET=XYZ789...
JWT_SECRET=your_super_secret_key_here
FRONTEND_URL=https://your-vercel-app.vercel.app
```

### 4.2 Update Vercel Variables
Replace the placeholder values in Vercel:

```env
# Replace these with your actual values
VITE_API_URL=https://your-railway-app.railway.app/api
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_51ABC123...
```

---

## 🎯 Step 5: Test Your Deployment

### 5.1 Test Backend Health
1. Visit: `https://your-railway-app.railway.app/api/health`
2. You should see: `{"status":"OK","message":"Server is running"}`

### 5.2 Test Frontend
1. Visit your Vercel URL: `https://your-vercel-app.vercel.app`
2. Sign up/login as a customer
3. Add products to cart
4. Test checkout with Stripe test cards:
   - **Visa**: `4242 4242 4242 4242`
   - **Expiry**: Any future date
   - **CVC**: Any 3 digits

### 5.3 Test Payment Flow
1. Add items to cart
2. Proceed to checkout
3. Fill shipping information
4. Choose payment method:
   - **Credit Card**: Use test card numbers
   - **PayPal**: Will redirect to PayPal sandbox
   - **Cash on Delivery**: No payment processing

---

## 🔧 Troubleshooting

### Issue 1: "Cannot connect to API"
**Solution**:
- Check Railway deployment status
- Verify `VITE_API_URL` in Vercel matches your Railway URL
- Test the health endpoint: `https://your-railway-app.railway.app/api/health`

### Issue 2: "CORS Error"
**Solution**:
- Verify `FRONTEND_URL` in Railway matches your Vercel URL exactly
- Check that Railway CORS settings include your Vercel domain
- Restart Railway deployment after updating environment variables

### Issue 3: "Payment failed"
**Solution**:
- Verify Stripe keys are correct (test keys for development)
- Check Railway logs for payment intent creation errors
- Ensure PayPal credentials are correct

### Issue 4: "Database connection failed"
**Solution**:
- Check MongoDB Atlas connection string
- Verify network access settings in MongoDB Atlas
- Ensure database user has correct permissions

---

## 📊 Monitoring

### Railway Monitoring
1. Go to Railway dashboard
2. Check **Deployments** tab for build status
3. Check **Logs** tab for any errors
4. Monitor **Metrics** for performance

### Vercel Monitoring
1. Go to Vercel dashboard
2. Check **Deployments** for build status
3. Check **Functions** for API route performance
4. Monitor **Analytics** for user behavior

---

## 🚀 Production Checklist

- [ ] Backend deployed to Railway
- [ ] Frontend deployed to Vercel
- [ ] All environment variables configured
- [ ] Stripe test payments working
- [ ] PayPal test payments working
- [ ] Database connected and working
- [ ] CORS issues resolved
- [ ] Health check endpoint responding
- [ ] Order creation working
- [ ] Email notifications working (if configured)

---

## 🎉 Success!

Your e-commerce platform is now live on:
- **Frontend**: `https://your-vercel-app.vercel.app`
- **Backend**: `https://your-railway-app.railway.app`

**Next Steps**:
1. Test all payment methods thoroughly
2. Set up monitoring and alerts
3. Configure custom domain (optional)
4. Switch to production API keys when ready

---

## 📞 Support

If you encounter issues:
1. Check Railway logs for backend errors
2. Check Vercel deployment logs for frontend errors
3. Verify all environment variables are set correctly
4. Test API endpoints individually
5. Check browser console for CORS or network errors

**🎉 Your e-commerce platform is now live and ready for customers!** 