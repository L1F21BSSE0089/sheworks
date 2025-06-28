import { createContext, useContext, useState } from "react";
import apiService from "../services/api";

const LanguageContext = createContext();

// All languages for messaging (keep multilingual)
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

export function useLanguage() {
  return useContext(LanguageContext);
}

export function LanguageProvider({ children }) {
  const [translationCache, setTranslationCache] = useState({});

  // Message translation function using DeepL API
  const translateMessage = async (message, userLang) => {
    if (message.content.language === userLang) return message.content.text;
    
    const cacheKey = `${message.content.text}-${message.content.language}-${userLang}`;
    if (translationCache[cacheKey]) {
      return translationCache[cacheKey];
    }
    
    try {
      const translatedText = await apiService.translateText(
        message.content.text, 
        message.content.language, 
        userLang,
        'message'
      );
      setTranslationCache(prev => ({ ...prev, [cacheKey]: translatedText }));
      return translatedText;
    } catch (error) {
      console.error('Translation error:', error);
      return message.content.text; // Return original if translation fails
    }
  };

  const translateBatch = async (messages, targetLang) => {
    if (!messages || messages.length === 0) return [];
    
    try {
      const translatedMessages = await apiService.translateBatch(messages, targetLang);
      return translatedMessages;
    } catch (error) {
      console.error('Batch translation error:', error);
      return messages.map(message => ({
        messageId: message._id || message.id,
        originalText: message.content.text,
        translatedText: message.content.text,
        originalLanguage: message.content.language,
        targetLanguage: targetLang
      }));
    }
  };

  const clearTranslationCache = () => {
    setTranslationCache({});
  };

  return (
    <LanguageContext.Provider value={{ 
      messageLanguages: LANGUAGES,
      translateMessage,
      translateBatch,
      clearTranslationCache
    }}>
      {children}
    </LanguageContext.Provider>
  );
} 
 