# API Keys Setup Guide for Railway & Vercel

## Required API Keys

### 1. **DeepL API Key** (Translation)
- **Current**: `00238c96-c7cc-4f22-9164-17d49396147e:fx`
- **Purpose**: Bilingual translation (English ↔ Urdu)
- **Status**: ✅ Already configured

### 2. **Hugging Face API Key** (AI Recommendations)
- **Get Free Key**: https://huggingface.co/settings/tokens
- **Purpose**: AI-powered product recommendations
- **Status**: ⚠️ Need to add

### 3. **Google OAuth** (Authentication)
- **Purpose**: Google login functionality
- **Status**: ⚠️ Need to configure

## Railway Setup (Backend)

### Step 1: Add Environment Variables
1. Go to your Railway dashboard
2. Select your backend project
3. Go to **Variables** tab
4. Add these variables:

```env
# Existing (already set)
MONGODB_URI=mongodb+srv://rashidali210502:rashid2105@cluster0.n2l1cmd.mongodb.net/fypdb?retryWrites=true&w=majority&appName=Cluster0
JWT_SECRET=mySuperSecretKey123!@#
DEEPL_API_KEY=00238c96-c7cc-4f22-9164-17d49396147e:fx

# New - Add these
HUGGINGFACE_API_KEY=hf_your_key_here
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
```

### Step 2: Get Hugging Face API Key
1. Visit: https://huggingface.co/settings/tokens
2. Click **New token**
3. Name: `sheworks-ai`
4. Role: **Read**
5. Copy the token and add to Railway

## Vercel Setup (Frontend)

### Step 1: Add Environment Variables
1. Go to your Vercel dashboard
2. Select your frontend project
3. Go to **Settings** → **Environment Variables**
4. Add these variables:

```env
# API URLs
VITE_API_URL=https://your-railway-app.up.railway.app

# API Keys
VITE_DEEPL_API_KEY=00238c96-c7cc-4f22-9164-17d49396147e:fx
VITE_HUGGINGFACE_API_KEY=hf_your_key_here

# Google OAuth
VITE_GOOGLE_CLIENT_ID=your_google_client_id

# Stripe (if needed)
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_key
```

### Step 2: Update Google OAuth Redirect URIs
1. Go to Google Cloud Console
2. Add these redirect URIs:
   - `https://sheworks-theta.vercel.app`
   - `https://sheworks-theta.vercel.app/login`
   - `https://sheworks-theta.vercel.app/signup`

## Quick Setup Commands

### Railway (Backend)
```bash
# Add to Railway environment variables
railway variables set HUGGINGFACE_API_KEY=hf_your_key_here
railway variables set GOOGLE_CLIENT_ID=your_google_client_id
railway variables set GOOGLE_CLIENT_SECRET=your_google_client_secret
```

### Vercel (Frontend)
```bash
# Add to Vercel environment variables
vercel env add VITE_HUGGINGFACE_API_KEY
vercel env add VITE_GOOGLE_CLIENT_ID
vercel env add VITE_DEEPL_API_KEY
```

## Testing the Setup

### 1. Test Translation API
```javascript
// Test in browser console
fetch('https://your-railway-app.up.railway.app/messages/translate', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer your_token',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    text: 'Hello world',
    fromLang: 'en',
    toLang: 'ur'
  })
})
```

### 2. Test AI Recommendations
```javascript
// Test in browser console
fetch('https://your-railway-app.up.railway.app/products/recommendations')
  .then(res => res.json())
  .then(data => console.log('Recommendations:', data))
```

## Free API Alternatives

If you need free alternatives:

### Translation APIs (Free)
- **MyMemory**: No API key needed
- **LibreTranslate**: Free tier available
- **Google Translate**: Free tier (limited)

### AI Recommendation APIs (Free)
- **Hugging Face**: Free tier
- **OpenAI**: Free tier (limited)
- **Cohere**: Free tier available

## Status Check

- ✅ **DeepL API**: Configured
- ⚠️ **Hugging Face API**: Need to add
- ⚠️ **Google OAuth**: Need to configure
- ✅ **MongoDB**: Configured
- ✅ **JWT Secret**: Configured

## Next Steps

1. Get Hugging Face API key
2. Add environment variables to Railway
3. Add environment variables to Vercel
4. Test the APIs
5. Deploy and verify functionality

Your app will have:
- ✅ Bilingual interface (English/Urdu)
- ✅ AI-powered product recommendations
- ✅ Google OAuth login
- ✅ Real-time translations 