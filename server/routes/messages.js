const express = require('express');
const jwt = require('jsonwebtoken');
const Message = require('../models/Message');
const User = require('../models/User');
const Vendor = require('../models/Vendor');

const router = express.Router();

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

// AI-Powered Translation Service
const translateText = async (text, fromLang, toLang, context = 'general') => {
  if (!text || fromLang === toLang) return text;
  
  try {
    // Try Google Translate API first (most reliable)
    if (process.env.GOOGLE_TRANSLATE_API_KEY) {
      const googleResponse = await fetch(`https://translation.googleapis.com/language/translate/v2?key=${process.env.GOOGLE_TRANSLATE_API_KEY}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          q: text,
          source: fromLang,
          target: toLang,
          format: 'text'
        })
      });

      if (googleResponse.ok) {
        const data = await googleResponse.json();
        return data.data.translations[0].translatedText;
      }
    }

    // Try OpenAI for context-aware translation
    if (process.env.OPENAI_API_KEY) {
      const contextPrompt = `Translate the following ${context} text from ${fromLang} to ${toLang}. Maintain the original meaning and tone: "${text}"`;
      
      const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: `You are a professional translator. Translate the given text accurately while preserving the original meaning, tone, and context. Respond only with the translated text, nothing else.`
            },
            {
              role: 'user',
              content: contextPrompt
            }
          ],
          max_tokens: 150,
          temperature: 0.3
        })
      });

      if (openaiResponse.ok) {
        const data = await openaiResponse.json();
        return data.choices[0].message.content.trim();
      }
    }

    // Fallback to LibreTranslate (free, open-source)
    const libreResponse = await fetch('https://libretranslate.de/translate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        q: text,
        source: fromLang,
        target: toLang,
        format: 'text'
      })
    });

    if (libreResponse.ok) {
      const data = await libreResponse.json();
      return data.translatedText;
    }

    // Final fallback to MyMemory
    const myMemoryResponse = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${fromLang}|${toLang}`);
    const myMemoryData = await myMemoryResponse.json();
    return myMemoryData.responseData?.translatedText || text;

  } catch (error) {
    console.error('AI Translation error:', error);
    return text; // Return original text if all translations fail
  }
};

// Translation endpoint
router.post('/translate', verifyToken, async (req, res) => {
  try {
    const { text, fromLang, toLang, context = 'general' } = req.body;
    
    if (!text || !fromLang || !toLang) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const translatedText = await translateText(text, fromLang, toLang, context);
    res.json({ translatedText, originalText: text, fromLang, toLang });

  } catch (error) {
    console.error('Translation endpoint error:', error);
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
          targetLang, 
          'conversation'
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

// Send a message
router.post('/send', verifyToken, async (req, res) => {
  try {
    const { userId, userType } = req.user;
    const { recipientId, content, language = 'en', attachments = [] } = req.body;

    // Validate recipient exists
    let recipient;
    if (userType === 'customer') {
      recipient = await Vendor.findById(recipientId);
    } else {
      recipient = await User.findById(recipientId);
    }

    if (!recipient) {
      return res.status(404).json({ error: 'Recipient not found' });
    }

    // Create message
    const message = new Message({
      sender: {
        id: userId,
        model: userType === 'customer' ? 'User' : 'Vendor',
        type: userType
      },
      recipient: {
        id: recipientId,
        model: userType === 'customer' ? 'Vendor' : 'User',
        type: userType === 'customer' ? 'vendor' : 'customer'
      },
      content: {
        text: content,
        language: language
      },
      attachments
    });

    await message.save();

    // Populate sender and recipient info
    await message.populate('sender.id', 'firstName lastName username businessName');
    await message.populate('recipient.id', 'firstName lastName username businessName');

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
    const { userType } = req.user;
    
    if (userType !== 'customer') {
      return res.status(403).json({ error: 'Only customers can view vendors' });
    }

    const vendors = await Vendor.find({ 
      status: 'active',
      'verification.isVerified': true 
    })
    .select('businessName businessInfo category languages rating')
    .sort({ 'rating.average': -1 });

    res.json({ vendors });

  } catch (error) {
    console.error('Get vendors error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get available customers for vendor
router.get('/customers', verifyToken, async (req, res) => {
  try {
    const { userType } = req.user;
    
    if (userType !== 'vendor') {
      return res.status(403).json({ error: 'Only vendors can view customers' });
    }

    const customers = await User.find({ isActive: true })
      .select('firstName lastName username email preferences')
      .sort({ lastLogin: -1 });

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

module.exports = router; 