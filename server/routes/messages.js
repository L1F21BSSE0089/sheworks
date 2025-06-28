const express = require('express');
const jwt = require('jsonwebtoken');
const Message = require('../models/Message');
const User = require('../models/User');
const Vendor = require('../models/Vendor');

const router = express.Router();

// Translation cache to avoid repeated API calls
const translationCache = new Map();
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

// Rate limiting for translation requests
const translationRequests = new Map();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 10; // Max 10 requests per minute

// Middleware to verify token
const verifyToken = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// Rate limiting middleware for translations
const rateLimitTranslations = (req, res, next) => {
  const userId = req.user?.userId || req.ip;
  const now = Date.now();
  
  if (!translationRequests.has(userId)) {
    translationRequests.set(userId, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
  } else {
    const userRequests = translationRequests.get(userId);
    if (now > userRequests.resetTime) {
      userRequests.count = 1;
      userRequests.resetTime = now + RATE_LIMIT_WINDOW;
    } else if (userRequests.count >= RATE_LIMIT_MAX_REQUESTS) {
      return res.status(429).json({ 
        error: 'Too many translation requests. Please try again later.',
        retryAfter: Math.ceil((userRequests.resetTime - now) / 1000)
      });
    } else {
      userRequests.count++;
    }
  }
  
  next();
};

// Get cached translation
const getCachedTranslation = (text, fromLang, toLang) => {
  const cacheKey = `${text}:${fromLang}:${toLang}`;
  const cached = translationCache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.translation;
  }
  
  return null;
};

// Set cached translation
const setCachedTranslation = (text, fromLang, toLang, translation) => {
  const cacheKey = `${text}:${fromLang}:${toLang}`;
  translationCache.set(cacheKey, {
    translation,
    timestamp: Date.now()
  });
};

// DeepL Translation Service
const translateText = async (text, fromLang, toLang) => {
  if (!text || fromLang === toLang) return text;
  
  console.log('🌐 Backend translateText called:', { text, fromLang, toLang });
  
  // Check cache first
  const cachedTranslation = getCachedTranslation(text, fromLang, toLang);
  if (cachedTranslation) {
    console.log('✅ Using cached translation:', cachedTranslation);
    return cachedTranslation;
  }
  
  console.log('🔑 DeepL API Key available:', !!process.env.DEEPL_API_KEY);
  
  try {
    // Use DeepL API for translation
    if (process.env.DEEPL_API_KEY) {
      console.log('📤 Calling DeepL API...');
      
      // Add delay to prevent rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const deeplResponse = await fetch('https://api-free.deepl.com/v2/translate', {
        method: 'POST',
        headers: {
          'Authorization': `DeepL-Auth-Key ${process.env.DEEPL_API_KEY}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          text: text,
          source_lang: mapLanguageCode(fromLang),
          target_lang: mapLanguageCode(toLang)
        })
      });

      console.log('📥 DeepL API response status:', deeplResponse.status);

      if (deeplResponse.ok) {
        const data = await deeplResponse.json();
        console.log('📥 DeepL API response data:', data);
        const translatedText = data.translations?.[0]?.text || text;
        console.log('✅ DeepL translated text:', translatedText);
        
        // Cache the translation
        setCachedTranslation(text, fromLang, toLang, translatedText);
        return translatedText;
      } else {
        const errorText = await deeplResponse.text();
        console.error('❌ DeepL API error:', deeplResponse.status, errorText);
      }
    } else {
      console.log('⚠️ No DeepL API key found, using fallback');
    }

    // Fallback to MyMemory (free, no API key required)
    console.log('🔄 Using MyMemory fallback translation...');
    
    // Add delay to prevent rate limiting
    await new Promise(resolve => setTimeout(resolve, 200));
    
    const myMemoryResponse = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${fromLang}|${toLang}`);
    
    console.log('📥 MyMemory API response status:', myMemoryResponse.status);
    
    if (myMemoryResponse.ok) {
      const myMemoryData = await myMemoryResponse.json();
      console.log('📥 MyMemory API response data:', myMemoryData);
      const translatedText = myMemoryData.responseData?.translatedText || text;
      console.log('✅ MyMemory translated text:', translatedText);
      
      // Cache the translation
      setCachedTranslation(text, fromLang, toLang, translatedText);
      return translatedText;
    } else {
      console.error('❌ MyMemory API error:', myMemoryResponse.status);
    }

  } catch (error) {
    console.error('❌ Translation error:', error);
  }
  
  console.log('⚠️ Returning original text due to translation failure');
  return text; // Return original text if translation fails
};

// Map language codes to DeepL format
const mapLanguageCode = (code) => {
  const languageMap = {
    'en': 'EN',
    'ur': 'UR', // DeepL doesn't support Urdu, will use fallback
    'ar': 'AR',
    'es': 'ES',
    'fr': 'FR',
    'de': 'DE',
    'it': 'IT',
    'pt': 'PT',
    'ru': 'RU',
    'zh': 'ZH',
    'ja': 'JA',
    'ko': 'KO',
    'hi': 'HI', // DeepL doesn't support Hindi, will use fallback
    'bn': 'BN', // DeepL doesn't support Bengali, will use fallback
    'tr': 'TR',
    'nl': 'NL'
  };
  
  return languageMap[code] || 'EN';
};

// Bulk interface translation endpoint
router.post('/translate-interface', verifyToken, rateLimitTranslations, async (req, res) => {
  try {
    const { texts, fromLang, toLang } = req.body;
    
    if (!texts || !Array.isArray(texts) || !fromLang || !toLang) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const results = {};
    
    for (const text of texts) {
      // Check cache first
      const cachedTranslation = getCachedTranslation(text, fromLang, toLang);
      if (cachedTranslation) {
        results[text] = cachedTranslation;
        continue;
      }
      
      // Translate if not cached
      const translatedText = await translateText(text, fromLang, toLang);
      results[text] = translatedText;
      
      // Add delay between translations to prevent rate limiting
      await new Promise(resolve => setTimeout(resolve, 150));
    }

    res.json({ translations: results });

  } catch (error) {
    console.error('Interface translation error:', error);
    res.status(500).json({ error: 'Interface translation failed' });
  }
});

// Translation endpoint
router.post('/translate', verifyToken, rateLimitTranslations, async (req, res) => {
  try {
    const { text, fromLang, toLang } = req.body;
    
    console.log('🌐 Translation endpoint called with:', { text, fromLang, toLang });
    console.log('🔑 DeepL API Key in endpoint:', !!process.env.DEEPL_API_KEY);
    
    if (!text || !fromLang || !toLang) {
      console.error('❌ Missing required fields:', { text, fromLang, toLang });
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const cachedTranslation = getCachedTranslation(text, fromLang, toLang);
    if (cachedTranslation) {
      console.log('✅ Translation endpoint result:', { originalText: text, translatedText: cachedTranslation, fromLang, toLang });
      return res.json({ translatedText: cachedTranslation, originalText: text, fromLang, toLang });
    }

    const translatedText = await translateText(text, fromLang, toLang);
    console.log('✅ Translation endpoint result:', { originalText: text, translatedText, fromLang, toLang });
    
    setCachedTranslation(text, fromLang, toLang, translatedText);
    res.json({ translatedText, originalText: text, fromLang, toLang });

  } catch (error) {
    console.error('❌ Translation endpoint error:', error);
    res.status(500).json({ error: 'Translation failed' });
  }
});

// Batch translation endpoint for multiple messages
router.post('/translate-batch', verifyToken, async (req, res) => {
  try {
    const { messages, targetLang } = req.body;
    
    if (!messages || !Array.isArray(messages) || !targetLang) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const translatedMessages = [];
    
    for (const message of messages) {
      if (message.content.language !== targetLang) {
        const translatedText = await translateText(
          message.content.text, 
          message.content.language, 
          targetLang
        );
        translatedMessages.push({
          messageId: message._id || message.id,
          originalText: message.content.text,
          translatedText,
          originalLanguage: message.content.language,
          targetLanguage: targetLang
        });
      } else {
        translatedMessages.push({
          messageId: message._id || message.id,
          originalText: message.content.text,
          translatedText: message.content.text,
          originalLanguage: message.content.language,
          targetLanguage: targetLang
        });
      }
    }

    res.json({ translatedMessages });

  } catch (error) {
    console.error('Batch translation error:', error);
    res.status(500).json({ error: 'Batch translation failed' });
  }
});

// Get all conversations for current user/vendor
router.get('/conversations', verifyToken, async (req, res) => {
  try {
    const { userId, userType } = req.user;
    
    // Get all messages where user is sender or recipient
    const messages = await Message.find({
      $or: [
        { 'sender.id': userId },
        { 'recipient.id': userId }
      ]
    })
    .sort({ createdAt: -1 })
    .populate('sender.id', 'firstName lastName username businessName')
    .populate('recipient.id', 'firstName lastName username businessName');

    // Group messages by conversation
    const conversations = {};
    messages.forEach(message => {
      const conversationId = message.conversationId;
      if (!conversations[conversationId]) {
        conversations[conversationId] = {
          conversationId,
          lastMessage: message,
          unreadCount: 0,
          participants: []
        };
      }
      
      // Add participants
      const sender = message.sender.id;
      const recipient = message.recipient.id;
      
      if (!conversations[conversationId].participants.find(p => p.id.toString() === sender._id.toString())) {
        conversations[conversationId].participants.push({
          id: sender._id,
          name: sender.businessName || `${sender.firstName} ${sender.lastName}`,
          type: message.sender.type
        });
      }
      
      if (!conversations[conversationId].participants.find(p => p.id.toString() === recipient._id.toString())) {
        conversations[conversationId].participants.push({
          id: recipient._id,
          name: recipient.businessName || `${recipient.firstName} ${recipient.lastName}`,
          type: message.recipient.type
        });
      }
      
      // Count unread messages
      if (message.recipient.id.toString() === userId && message.status !== 'read') {
        conversations[conversationId].unreadCount++;
      }
    });

    // Convert to array and sort by last message time
    const conversationsArray = Object.values(conversations).sort((a, b) => 
      new Date(b.lastMessage.createdAt) - new Date(a.lastMessage.createdAt)
    );

    res.json({ conversations: conversationsArray });

  } catch (error) {
    console.error('Get conversations error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get conversation with specific user/vendor
router.get('/conversation/:participantId', verifyToken, async (req, res) => {
  try {
    const { userId, userType } = req.user;
    const { participantId } = req.params;
    const { limit = 50, skip = 0 } = req.query;

    const messages = await Message.getConversation(
      userId, 
      participantId, 
      parseInt(limit), 
      parseInt(skip)
    );

    // Mark messages as read
    const unreadMessages = messages.filter(msg => 
      msg.recipient.id.toString() === userId && msg.status !== 'read'
    );

    for (const message of unreadMessages) {
      await message.markAsRead();
    }

    res.json({ messages: messages.reverse() });

  } catch (error) {
    console.error('Get conversation error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete conversation with specific user/vendor
router.delete('/conversation/:participantId', verifyToken, async (req, res) => {
  try {
    const { userId, userType } = req.user;
    const { participantId } = req.params;

    console.log('🗑️ Deleting conversation between:', userId, 'and', participantId);

    // Delete all messages between these two users
    const result = await Message.deleteMany({
      $or: [
        { 'sender.id': userId, 'recipient.id': participantId },
        { 'sender.id': participantId, 'recipient.id': userId }
      ]
    });

    console.log('✅ Deleted', result.deletedCount, 'messages');

    res.json({ 
      message: 'Conversation deleted successfully',
      deletedCount: result.deletedCount 
    });

  } catch (error) {
    console.error('Delete conversation error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Send a message
router.post('/send', verifyToken, async (req, res) => {
  try {
    const { userId, userType } = req.user;
    const { recipientId, content, language = 'en', attachments = [] } = req.body;

    console.log('📤 Send message request:', { userId, userType, recipientId, content });

    // Validate recipient exists - check both User and Vendor collections
    let recipient = await User.findById(recipientId);
    let recipientType = 'customer';
    
    if (!recipient) {
      recipient = await Vendor.findById(recipientId);
      recipientType = 'vendor';
    }

    if (!recipient) {
      console.error('❌ Recipient not found in either collection:', recipientId);
      return res.status(404).json({ error: 'Recipient not found' });
    }

    console.log('✅ Recipient found:', { 
      id: recipient._id, 
      type: recipientType, 
      name: recipient.businessName || `${recipient.firstName} ${recipient.lastName}` 
    });

    // Create message
    const message = new Message({
      sender: {
        id: userId,
        model: userType === 'customer' ? 'User' : 'Vendor',
        type: userType
      },
      recipient: {
        id: recipientId,
        model: recipientType === 'customer' ? 'User' : 'Vendor',
        type: recipientType
      },
      content: {
        text: content,
        language: language
      },
      attachments
    });

    await message.save();
    console.log('✅ Message saved successfully');

    // Populate sender and recipient info
    await message.populate('sender.id', 'firstName lastName username businessName');
    await message.populate('recipient.id', 'firstName lastName username businessName');

    console.log('✅ Message populated and ready to send');
    res.status(201).json({ message });

  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Mark messages as read
router.put('/read/:conversationId', verifyToken, async (req, res) => {
  try {
    const { userId } = req.user;
    const { conversationId } = req.params;

    // Get all unread messages in this conversation
    const unreadMessages = await Message.find({
      $or: [
        { 'sender.id': userId, 'recipient.id': conversationId },
        { 'sender.id': conversationId, 'recipient.id': userId }
      ],
      status: { $in: ['sent', 'delivered'] }
    });

    // Mark all as read
    for (const message of unreadMessages) {
      await message.markAsRead();
    }

    res.json({ message: 'Messages marked as read' });

  } catch (error) {
    console.error('Mark as read error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get unread message count
router.get('/unread-count', verifyToken, async (req, res) => {
  try {
    const { userId } = req.user;
    const count = await Message.getUnreadCount(userId);
    res.json({ unreadCount: count });

  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get available vendors for customer
router.get('/vendors', verifyToken, async (req, res) => {
  try {
    console.log('🔍 Fetching vendors...');
    
    // First try with current filters
    let vendors = await Vendor.find({ 
      status: 'active',
      'verification.isVerified': true 
    })
    .select('businessName businessInfo category languages rating email contactPerson')
    .sort({ 'rating.average': -1 });

    console.log('📊 Vendors with strict filters:', vendors.length);

    // If no vendors found, try without verification filter
    if (vendors.length === 0) {
      vendors = await Vendor.find({ 
        status: 'active'
      })
      .select('businessName businessInfo category languages rating email contactPerson')
      .sort({ 'rating.average': -1 });
      
      console.log('📊 Vendors without verification filter:', vendors.length);
    }

    // If still no vendors, get all vendors
    if (vendors.length === 0) {
      vendors = await Vendor.find({})
        .select('businessName businessInfo category languages rating email contactPerson')
        .sort({ 'rating.average': -1 });
        
      console.log('📊 All vendors:', vendors.length);
    }

    console.log('📊 Final vendors response:', vendors);
    res.json({ vendors });

  } catch (error) {
    console.error('Get vendors error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get available customers for vendor
router.get('/customers', verifyToken, async (req, res) => {
  try {
    console.log('🔍 Fetching customers...');
    
    // First try with isActive filter
    let customers = await User.find({ isActive: true })
      .select('firstName lastName username email preferences')
      .sort({ lastLogin: -1 });

    console.log('📊 Customers with isActive filter:', customers.length);

    // If no customers found, get all users
    if (customers.length === 0) {
      customers = await User.find({})
        .select('firstName lastName username email preferences')
        .sort({ lastLogin: -1 });
        
      console.log('📊 All customers:', customers.length);
    }

    console.log('📊 Final customers response:', customers);
    res.json({ customers });

  } catch (error) {
    console.error('Get customers error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Find recipient by email (for starting new conversation)
router.post('/find-recipient', verifyToken, async (req, res) => {
  const { email } = req.body;
  let recipient = await User.findOne({ email });
  let type = 'customer';
  if (!recipient) {
    recipient = await Vendor.findOne({ email });
    type = 'vendor';
  }
  if (!recipient) return res.status(404).json({ error: 'Recipient not found' });
  res.json({ id: recipient._id, type });
});

// Test endpoint to check database status
router.get('/test-db', verifyToken, async (req, res) => {
  try {
    console.log('🧪 Testing database connection...');
    
    const totalUsers = await User.countDocuments();
    const totalVendors = await Vendor.countDocuments();
    
    console.log(`📊 Database counts - Users: ${totalUsers}, Vendors: ${totalVendors}`);
    
    // Get sample users
    const sampleUsers = await User.find({}).limit(3).select('firstName lastName email');
    const sampleVendors = await Vendor.find({}).limit(3).select('businessName email contactPerson');
    
    res.json({
      success: true,
      counts: {
        users: totalUsers,
        vendors: totalVendors,
        total: totalUsers + totalVendors
      },
      sampleUsers,
      sampleVendors
    });
  } catch (error) {
    console.error('❌ Database test error:', error);
    res.status(500).json({ error: 'Database test failed', details: error.message });
  }
});

module.exports = router; 