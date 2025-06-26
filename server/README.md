# She E-commerce Backend

A comprehensive backend for the "She" e-commerce platform with real-time messaging, multi-language support, and vendor-customer management.

## 🚀 Features

- **User & Vendor Authentication** - JWT-based authentication
- **Real-time Messaging** - Socket.io powered chat between customers and vendors
- **Multi-language Support** - 12 languages supported in chat
- **MongoDB Database** - Scalable NoSQL database
- **RESTful API** - Clean and organized API endpoints
- **Security** - Rate limiting, CORS, input validation

## 📋 Prerequisites

- Node.js (v14 or higher)
- MongoDB (local or cloud)
- npm or yarn

## 🛠️ Installation

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Create `.env` file:**
   ```env
   MONGODB_URI=mongodb://localhost:27017/she-ecommerce
   JWT_SECRET=your_jwt_secret_here
   FRONTEND_URL=http://localhost:5173
   PORT=5000
   ```

3. **Start the server:**
   ```bash
   # Development
   npm run dev
   
   # Production
   npm start
   ```

## 📡 API Endpoints

### Authentication
- `POST /api/auth/register/user` - Register customer
- `POST /api/auth/register/vendor` - Register vendor
- `POST /api/auth/login/user` - Customer login
- `POST /api/auth/login/vendor` - Vendor login
- `GET /api/auth/me` - Get current user/vendor
- `POST /api/auth/logout` - Logout

### Messaging
- `GET /api/messages/conversations` - Get all conversations
- `GET /api/messages/conversation/:participantId` - Get specific conversation
- `POST /api/messages/send` - Send message
- `PUT /api/messages/read/:conversationId` - Mark messages as read
- `GET /api/messages/unread-count` - Get unread count
- `GET /api/messages/vendors` - Get available vendors (customers only)
- `GET /api/messages/customers` - Get available customers (vendors only)

### Health Check
- `GET /api/health` - Server health status

## 🔌 Socket.io Events

### Client to Server
- `authenticate` - Authenticate user for real-time features
- `send_message` - Send real-time message
- `typing` - Send typing indicator

### Server to Client
- `new_message` - Receive new message
- `message_sent` - Message sent confirmation
- `user_typing` - User typing indicator
- `message_error` - Message error

## 🗄️ Database Models

- **User** - Customer accounts with preferences
- **Vendor** - Business accounts with verification
- **Product** - E-commerce products with variants
- **Order** - Customer orders with payment tracking
- **Message** - Real-time chat messages with multi-language support

## 🔒 Security Features

- JWT token authentication
- Password hashing with bcrypt
- Rate limiting (100 requests per 15 minutes)
- Input validation with express-validator
- CORS protection
- Helmet security headers

## 🌐 Multi-language Support

Supported languages:
- English (en)
- Spanish (es)
- French (fr)
- German (de)
- Italian (it)
- Portuguese (pt)
- Russian (ru)
- Chinese (zh)
- Japanese (ja)
- Korean (ko)
- Arabic (ar)
- Hindi (hi)

## 🚀 Deployment

### Environment Variables
```env
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_secure_jwt_secret
FRONTEND_URL=your_frontend_url
PORT=5000
NODE_ENV=production
```

### Recommended Platforms
- **Heroku** - Easy deployment for students
- **Railway** - Modern deployment platform
- **Vercel** - Great for full-stack apps
- **AWS/DigitalOcean** - Professional hosting

## 📝 License

MIT License - feel free to use for your final year project!

## 👨‍💻 Author

Rashid - Final Year Project 