# AI-Powered Translation Setup Guide

This guide explains how to set up AI-powered translation for the messaging system.

## 🚀 **AI Translation Features**

- **Google Translate API** - High accuracy, reliable translations
- **OpenAI GPT-3.5** - Context-aware, intelligent translations
- **LibreTranslate** - Free, open-source fallback
- **MyMemory** - Basic fallback for common phrases

## 🔧 **Environment Variables Setup**

### **Frontend (.env.local)**
```bash
# Google Translate API (Recommended)
VITE_GOOGLE_TRANSLATE_API_KEY=your_google_translate_api_key

# OpenAI API (For context-aware translations)
VITE_OPENAI_API_KEY=your_openai_api_key
```

### **Backend (.env)**
```bash
# Google Translate API
GOOGLE_TRANSLATE_API_KEY=your_google_translate_api_key

# OpenAI API
OPENAI_API_KEY=your_openai_api_key
```

## 📋 **API Setup Instructions**

### **1. Google Translate API**
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable the "Cloud Translation API"
4. Create credentials (API Key)
5. Add the API key to your environment variables

### **2. OpenAI API**
1. Go to [OpenAI Platform](https://platform.openai.com/)
2. Create an account and get API key
3. Add the API key to your environment variables

### **3. Free Alternative (No Setup Required)**
- LibreTranslate and MyMemory work without API keys
- Translations will be slightly less accurate but functional

## 🎯 **Translation Priority**

The system tries translation services in this order:

1. **Google Translate API** (if configured) - Best accuracy
2. **OpenAI GPT-3.5** (if configured) - Context-aware
3. **LibreTranslate** - Free, open-source
4. **MyMemory** - Basic fallback
5. **Pattern matching** - For common phrases

## 🔒 **Security Notes**

- API keys are stored server-side for security
- Frontend only sends translation requests to backend
- No sensitive data is exposed to client-side

## 💡 **Usage Examples**

### **Frontend Usage**
```javascript
import { useLanguage } from '../context/LanguageContext';

const { translate, translateBatch } = useLanguage();

// Translate single text
const translated = await translate('Hello', 'en', 'ur', 'conversation');

// Translate multiple messages
const translatedMessages = await translateBatch(messages, 'ur');
```

### **Backend Usage**
```javascript
// Translation endpoint
POST /api/messages/translate
{
  "text": "Hello world",
  "fromLang": "en",
  "toLang": "ur",
  "context": "conversation"
}

// Batch translation endpoint
POST /api/messages/translate-batch
{
  "messages": [...],
  "targetLang": "ur"
}
```

## 🎨 **User Experience Features**

- **Real-time translation** - Messages translate instantly
- **Language switching** - Change language mid-conversation
- **Context awareness** - AI understands conversation context
- **Fallback handling** - Always shows original if translation fails
- **Translation caching** - Avoids repeated API calls
- **Visual indicators** - Shows when messages are AI-translated

## 🚀 **Deployment Notes**

### **Vercel (Frontend)**
- Add environment variables in Vercel dashboard
- Variables must start with `VITE_`

### **Railway (Backend)**
- Add environment variables in Railway dashboard
- No `VITE_` prefix needed

## 🔧 **Troubleshooting**

### **Translation Not Working**
1. Check API keys are correctly set
2. Verify API quotas and billing
3. Check network connectivity
4. Review browser console for errors

### **Slow Translations**
1. Enable translation caching
2. Use batch translation for multiple messages
3. Consider upgrading API plans

### **API Limits**
- Google Translate: 500,000 characters/month (free tier)
- OpenAI: Pay-per-use, reasonable rates
- LibreTranslate: No limits (public instance)

## 📞 **Support**

If you encounter issues:
1. Check the browser console for errors
2. Verify environment variables are set
3. Test with different languages
4. Check API service status

---

**Note**: The system gracefully degrades if APIs are unavailable, ensuring messages are always readable even without translation. 