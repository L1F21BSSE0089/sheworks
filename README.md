# SheWorks E-commerce Platform

A modern, full-stack, multi-vendor e-commerce platform with real-time chat, multi-language support, and admin/vendor/customer dashboards.

---

## 🚀 Features
- Customer, Vendor, and Admin flows
- Real-time multi-lingual chat
- Product management, cart, checkout, order tracking
- Responsive, modern UI (React, Tailwind, Vite)
- Node.js/Express/MongoDB backend

---

## 🛠️ Local Development

### 1. Backend

```bash
cd server
npm install
cp .env.example .env # Fill in MongoDB URI, JWT secret, etc.
npm run dev
```

- Runs on http://localhost:5000 by default
- Requires MongoDB (local or cloud)

### 2. Frontend

```bash
npm install
npm run dev
```
- Runs on http://localhost:5173 by default

---

## 🌐 Production Build

### Frontend
```bash
npm run build
# Output in dist/
```
You can deploy the `dist/` folder to any static host (Vercel, Netlify, etc.)

### Backend
- Use `npm start` for production
- Set environment variables in `.env`

---

## 🚢 Deployment

### Recommended
- **Frontend:** [Vercel](https://vercel.com/) (connect your GitHub repo, auto-deploys on push)
- **Backend:** [Render](https://render.com/) or [Railway](https://railway.app/)

### Environment Variables
- See `server/.env.example` for backend
- For frontend, set `VITE_API_URL` in `.env` if your backend is not on localhost

---

## 📦 Environment Variables Example

### server/.env
```
MONGODB_URI=your_mongodb_uri
JWT_SECRET=your_jwt_secret
FRONTEND_URL=https://your-frontend-url
PORT=5000
```

### .env (frontend, optional)
```
VITE_API_URL=https://your-backend-url
```

---

## 📝 Notes
- Make sure CORS is enabled for your frontend URL in the backend
- For custom domains, set them up in Vercel/Render/Railway dashboard
- For help, see the platform docs or ask your AI assistant! 