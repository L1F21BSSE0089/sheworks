// DeepL Translation Service
class DeepLTranslationService {
  constructor() {
    this.apiKey = import.meta.env.VITE_DEEPL_API_KEY;
    this.baseUrl = 'https://api-free.deepl.com/v2/translate';
  }

  async translateText(text, fromLang, toLang) {
    if (!text || fromLang === toLang) return text;
    
    if (!this.apiKey) {
      console.warn('DeepL API key not found. Using fallback translation.');
      return this.fallbackTranslation(text, fromLang, toLang);
    }

    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Authorization': `DeepL-Auth-Key ${this.apiKey}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          text: text,
          source_lang: this.mapLanguageCode(fromLang),
          target_lang: this.mapLanguageCode(toLang)
        })
      });

      if (!response.ok) {
        throw new Error(`DeepL API error: ${response.status}`);
      }

      const data = await response.json();
      return data.translations?.[0]?.text || text;

    } catch (error) {
      console.error('DeepL translation error:', error);
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
      const response = await fetch(
        `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${fromLang}|${toLang}`
      );
      
      if (!response.ok) {
        return text; // Return original if translation fails
      }
      
      const data = await response.json();
      return data.responseData?.translatedText || text;
      
    } catch (error) {
      console.error('Fallback translation error:', error);
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