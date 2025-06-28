// DeepL Translation Service (using backend proxy to avoid CORS)
class DeepLTranslationService {
  constructor() {
    this.apiKey = import.meta.env.VITE_DEEPL_API_KEY;
    this.baseUrl = import.meta.env.VITE_API_URL || 'https://sheworks-production.up.railway.app';
  }

  async translateText(text, fromLang, toLang) {
    if (!text || fromLang === toLang) return text;
    
    try {
      // Get auth token from localStorage
      const token = localStorage.getItem('token');
      if (!token) {
        console.warn('No auth token found, using fallback translation');
        return this.fallbackTranslation(text, fromLang, toLang);
      }

      const response = await fetch(`${this.baseUrl}/api/messages/translate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          text,
          fromLang,
          toLang
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Backend translation error:', errorText);
        throw new Error(`Backend translation error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      const translatedText = data.translatedText || text;
      
      return translatedText;

    } catch (error) {
      console.error('❌ Backend translation error:', error);
      return this.fallbackTranslation(text, fromLang, toLang);
    }
  }

  async translateBatch(texts, fromLang, toLang) {
    if (!texts || texts.length === 0) return [];
    
    const results = [];
    for (const text of texts) {
      const translated = await this.translateText(text, fromLang, toLang);
      results.push(translated);
    }
    return results;
  }

  async translateMessages(messages, targetLang) {
    if (!messages || messages.length === 0) return {};
    
    try {
      // Get auth token from localStorage
      const token = localStorage.getItem('token');
      if (!token) {
        console.warn('No auth token found, using individual translations');
        return this.translateMessagesIndividually(messages, targetLang);
      }

      const response = await fetch(`${this.baseUrl}/api/messages/translate-batch`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messages,
          targetLang
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Backend batch translation error:', errorText);
        throw new Error(`Backend batch translation error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      
      // Convert array response to object format
      const translatedMessages = {};
      data.translatedMessages.forEach(item => {
        translatedMessages[item.messageId] = item.translatedText;
      });
      
      return translatedMessages;

    } catch (error) {
      console.error('❌ Backend batch translation error:', error);
      return this.translateMessagesIndividually(messages, targetLang);
    }
  }

  // Fallback to individual translations
  async translateMessagesIndividually(messages, targetLang) {
    const translatedMessages = {};
    
    for (const message of messages) {
      const messageId = message._id || message.id;
      const originalText = message.content?.text || message.text || '';
      const originalLang = message.content?.language || message.language || 'en';
      
      // Always translate if target language is different from original
      if (originalLang !== targetLang && originalText) {
        const translatedText = await this.translateText(originalText, originalLang, targetLang);
        translatedMessages[messageId] = translatedText;
      } else {
        // If same language or no text, keep original
        translatedMessages[messageId] = originalText;
      }
    }
    
    return translatedMessages;
  }

  // Fallback translation using MyMemory (free, no API key required)
  async fallbackTranslation(text, fromLang, toLang) {
    try {
      const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${fromLang}|${toLang}`;
      
      const response = await fetch(url);
      
      if (!response.ok) {
        return text; // Return original if translation fails
      }
      
      const data = await response.json();
      
      const translatedText = data.responseData?.translatedText || text;
      
      return translatedText;
      
    } catch (error) {
      return text; // Return original if all translations fail
    }
  }

  // Map language codes to DeepL format
  mapLanguageCode(code) {
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
  }
}

// Create and export singleton instance
const deeplTranslationService = new DeepLTranslationService();
export default deeplTranslationService; 