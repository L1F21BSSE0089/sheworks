import { createContext, useContext, useState, useEffect } from "react";
import apiService from "../services/api";

const LanguageContext = createContext();

// Available languages with their display names and codes
export const LANGUAGES = {
  en: { name: "English", nativeName: "English", flag: "🇺🇸" },
  ur: { name: "Urdu", nativeName: "اردو", flag: "🇵🇰" },
  ar: { name: "Arabic", nativeName: "العربية", flag: "🇸🇦" },
  es: { name: "Spanish", nativeName: "Español", flag: "🇪🇸" },
  fr: { name: "French", nativeName: "Français", flag: "🇫🇷" },
  de: { name: "German", nativeName: "Deutsch", flag: "🇩🇪" },
  it: { name: "Italian", nativeName: "Italiano", flag: "🇮🇹" },
  pt: { name: "Portuguese", nativeName: "Português", flag: "🇵🇹" },
  ru: { name: "Russian", nativeName: "Русский", flag: "🇷🇺" },
  zh: { name: "Chinese", nativeName: "中文", flag: "🇨🇳" },
  ja: { name: "Japanese", nativeName: "日本語", flag: "🇯🇵" },
  ko: { name: "Korean", nativeName: "한국어", flag: "🇰🇷" },
  hi: { name: "Hindi", nativeName: "हिन्दी", flag: "🇮🇳" },
  bn: { name: "Bengali", nativeName: "বাংলা", flag: "🇧🇩" },
  tr: { name: "Turkish", nativeName: "Türkçe", flag: "🇹🇷" },
  nl: { name: "Dutch", nativeName: "Nederlands", flag: "🇳🇱" }
};

// AI-Powered Translation using multiple services for better accuracy
const translateText = async (text, fromLang, toLang) => {
  if (!text || fromLang === toLang) return text;
  
  try {
    // Try Google Translate API first (most reliable)
    const googleResponse = await fetch(`https://translation.googleapis.com/language/translate/v2?key=${process.env.VITE_GOOGLE_TRANSLATE_API_KEY}`, {
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

    // Final fallback to MyMemory (basic but reliable)
    const myMemoryResponse = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${fromLang}|${toLang}`);
    const myMemoryData = await myMemoryResponse.json();
    return myMemoryData.responseData?.translatedText || text;

  } catch (error) {
    console.error('AI Translation error:', error);
    
    // If all APIs fail, try a simple word-by-word translation for common phrases
    return await simpleAITranslation(text, fromLang, toLang);
  }
};

// Simple AI-powered translation for common phrases and patterns
const simpleAITranslation = async (text, fromLang, toLang) => {
  // Common greeting patterns
  const greetings = {
    en: ['hello', 'hi', 'hey', 'good morning', 'good afternoon', 'good evening'],
    ur: ['السلام علیکم', 'ہیلو', 'ہائے', 'صبح بخیر', 'دوپہر بخیر', 'شام بخیر'],
    ar: ['مرحبا', 'أهلا', 'السلام عليكم', 'صباح الخير', 'مساء الخير'],
    es: ['hola', 'buenos días', 'buenas tardes', 'buenas noches'],
    fr: ['bonjour', 'salut', 'bonsoir'],
    de: ['hallo', 'guten tag', 'guten morgen', 'guten abend'],
    hi: ['नमस्ते', 'हैलो', 'सुप्रभात', 'शुभ संध्या'],
    zh: ['你好', '早上好', '下午好', '晚上好'],
    ja: ['こんにちは', 'おはよう', 'こんばんは'],
    ko: ['안녕하세요', '안녕', '좋은 아침', '좋은 저녁']
  };

  // Common response patterns
  const responses = {
    en: ['thank you', 'thanks', 'okay', 'ok', 'yes', 'no', 'maybe'],
    ur: ['شکریہ', 'آپ کا شکریہ', 'ٹھیک ہے', 'ہاں', 'نہیں', 'شاید'],
    ar: ['شكرا', 'شكرا لك', 'حسنا', 'نعم', 'لا', 'ربما'],
    es: ['gracias', 'ok', 'sí', 'no', 'tal vez'],
    fr: ['merci', 'd\'accord', 'oui', 'non', 'peut-être'],
    de: ['danke', 'okay', 'ja', 'nein', 'vielleicht'],
    hi: ['धन्यवाद', 'ठीक है', 'हाँ', 'नहीं', 'शायद'],
    zh: ['谢谢', '好的', '是', '不', '也许'],
    ja: ['ありがとう', 'はい', 'いいえ', 'たぶん'],
    ko: ['감사합니다', '네', '아니요', '아마도']
  };

  // Try to match common patterns
  const lowerText = text.toLowerCase().trim();
  
  // Check greetings
  if (greetings[fromLang] && greetings[toLang]) {
    const fromIndex = greetings[fromLang].findIndex(greeting => 
      lowerText.includes(greeting.toLowerCase())
    );
    if (fromIndex !== -1 && greetings[toLang][fromIndex]) {
      return greetings[toLang][fromIndex];
    }
  }

  // Check responses
  if (responses[fromLang] && responses[toLang]) {
    const fromIndex = responses[fromLang].findIndex(response => 
      lowerText.includes(response.toLowerCase())
    );
    if (fromIndex !== -1 && responses[toLang][fromIndex]) {
      return responses[toLang][fromIndex];
    }
  }

  // If no pattern match, return original text
  return text;
};

// Context-aware translation for better accuracy
const translateWithContext = async (text, fromLang, toLang, context = 'general') => {
  try {
    // Add context to improve translation accuracy
    const contextPrompt = `Translate the following ${context} text from ${fromLang} to ${toLang}. Maintain the original meaning and tone: "${text}"`;
    
    // Use a more sophisticated approach with context
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.VITE_OPENAI_API_KEY}`,
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

    if (response.ok) {
      const data = await response.json();
      return data.choices[0].message.content.trim();
    }
  } catch (error) {
    console.error('OpenAI translation error:', error);
  }

  // Fallback to regular translation
  return await translateText(text, fromLang, toLang);
};

export function useLanguage() {
  return useContext(LanguageContext);
}

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState(() => localStorage.getItem("language") || "en");
  const [translationCache, setTranslationCache] = useState({});
  const [isTranslating, setIsTranslating] = useState(false);

  useEffect(() => {
    localStorage.setItem("language", language);
  }, [language]);

  const translate = async (text, fromLang, toLang, context = 'general') => {
    if (!text || fromLang === toLang) return text;
    
    const cacheKey = `${text}-${fromLang}-${toLang}-${context}`;
    if (translationCache[cacheKey]) {
      return translationCache[cacheKey];
    }
    
    setIsTranslating(true);
    try {
      const response = await apiService.translateText(text, fromLang, toLang, context);
      const translatedText = response.translatedText || text;
      setTranslationCache(prev => ({ ...prev, [cacheKey]: translatedText }));
      return translatedText;
    } catch (error) {
      console.error('Translation error:', error);
      return text; // Return original text if translation fails
    } finally {
      setIsTranslating(false);
    }
  };

  const translateMessage = async (message, userLang) => {
    if (message.content.language === userLang) return message.content.text;
    return await translate(message.content.text, message.content.language, userLang, 'conversation');
  };

  const translateBatch = async (messages, targetLang) => {
    if (!messages || messages.length === 0) return [];
    
    setIsTranslating(true);
    try {
      const response = await apiService.translateBatch(messages, targetLang);
      return response.translatedMessages || [];
    } catch (error) {
      console.error('Batch translation error:', error);
      return messages.map(msg => ({
        messageId: msg._id || msg.id,
        originalText: msg.content.text,
        translatedText: msg.content.text,
        originalLanguage: msg.content.language,
        targetLanguage: targetLang
      }));
    } finally {
      setIsTranslating(false);
    }
  };

  const clearTranslationCache = () => {
    setTranslationCache({});
  };

  return (
    <LanguageContext.Provider value={{ 
      language, 
      setLanguage, 
      languages: LANGUAGES,
      translate,
      translateMessage,
      translateBatch,
      isTranslating,
      clearTranslationCache
    }}>
      {children}
    </LanguageContext.Provider>
  );
} 
 