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

// Generic translation function - can be easily replaced with any API
const translateText = async (text, fromLang, toLang) => {
  if (!text || fromLang === toLang) return text;
  
  try {
    // Option 1: Use MyMemory (free, no API key required)
    const response = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${fromLang}|${toLang}`);
    const data = await response.json();
    
    if (data.responseData?.translatedText) {
      return data.responseData.translatedText;
    }
    
    // Option 2: Use LibreTranslate (free, no API key required)
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
      const libreData = await libreResponse.json();
      if (libreData.translatedText) {
        return libreData.translatedText;
      }
    }
    
    // If all free APIs fail, return original text
    console.warn('Translation failed, returning original text');
    return text;
    
  } catch (error) {
    console.error('Translation error:', error);
    return text; // Return original text if translation fails
  }
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
      // Use the generic translation function
      const translatedText = await translateText(text, fromLang, toLang);
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
      const translatedMessages = [];
      
      for (const message of messages) {
        if (message.content.language !== targetLang) {
          const translatedText = await translateText(message.content.text, message.content.language, targetLang);
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
      
      return translatedMessages;
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
 