// DeepL Translation Service (using backend proxy to avoid CORS)
class DeepLTranslationService {
  constructor() {
    this.apiKey = import.meta.env.VITE_DEEPL_API_KEY;
    this.baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
  }

  async translateText(text, fromLang, toLang) {
    if (!text || fromLang === toLang) return text;
    
    console.log('🌐 DeepL translateText called:', { text, fromLang, toLang });
    console.log('🔑 DeepL API Key available:', !!this.apiKey);
    console.log('🌐 Backend URL:', this.baseUrl);
    
    try {
      // Get auth token from localStorage
      const token = localStorage.getItem('token');
      if (!token) {
        console.warn('No auth token found, using fallback translation');
        return this.fallbackTranslation(text, fromLang, toLang);
      }

      console.log('📤 Calling backend translation endpoint...');
      
      const response = await fetch(`${this.baseUrl}/messages/translate`, {
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

      console.log('📥 Backend translation response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Backend translation error:', errorText);
        throw new Error(`Backend translation error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log('📥 Backend translation response data:', data);
      
      const translatedText = data.translatedText || text;
      console.log('✅ Final translated text:', translatedText);
      
      return translatedText;

    } catch (error) {
      console.error('❌ Backend translation error:', error);
      console.log('🔄 Falling back to MyMemory translation...');
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
    
    console.log('🌐 Starting batch translation of', messages.length, 'messages to', targetLang);
    
    try {
      // Get auth token from localStorage
      const token = localStorage.getItem('token');
      if (!token) {
        console.warn('No auth token found, using individual translations');
        return this.translateMessagesIndividually(messages, targetLang);
      }

      console.log('📤 Calling backend batch translation endpoint...');
      
      const response = await fetch(`${this.baseUrl}/messages/translate-batch`, {
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

      console.log('📥 Backend batch translation response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Backend batch translation error:', errorText);
        throw new Error(`Backend batch translation error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log('📥 Backend batch translation response data:', data);
      
      // Convert array response to object format
      const translatedMessages = {};
      data.translatedMessages.forEach(item => {
        translatedMessages[item.messageId] = item.translatedText;
      });
      
      console.log('✅ Batch translation completed');
      return translatedMessages;

    } catch (error) {
      console.error('❌ Backend batch translation error:', error);
      console.log('🔄 Falling back to individual translations...');
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
      
      console.log(`🌐 Translating message ${messageId}:`, {
        originalText: originalText.substring(0, 50) + '...',
        fromLang: originalLang,
        toLang: targetLang
      });
      
      // Always translate if target language is different from original
      if (originalLang !== targetLang && originalText) {
        const translatedText = await this.translateText(originalText, originalLang, targetLang);
        translatedMessages[messageId] = translatedText;
        console.log(`✅ Translated to ${targetLang}:`, translatedText.substring(0, 50) + '...');
      } else {
        // If same language or no text, keep original
        translatedMessages[messageId] = originalText;
        console.log(`⏭️ No translation needed for ${messageId}`);
      }
    }
    
    return translatedMessages;
  }

  // Fallback translation using MyMemory (free, no API key required)
  async fallbackTranslation(text, fromLang, toLang) {
    try {
      console.log('🔄 MyMemory fallback translation:', { text, fromLang, toLang });
      
      const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${fromLang}|${toLang}`;
      console.log('📤 MyMemory API URL:', url);
      
      const response = await fetch(url);
      
      console.log('📥 MyMemory API response status:', response.status);
      
      if (!response.ok) {
        console.error('❌ MyMemory API error:', response.status);
        return text; // Return original if translation fails
      }
      
      const data = await response.json();
      console.log('📥 MyMemory API response data:', data);
      
      const translatedText = data.responseData?.translatedText || text;
      console.log('✅ MyMemory translated text:', translatedText);
      
      return translatedText;
      
    } catch (error) {
      console.error('❌ Fallback translation error:', error);
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