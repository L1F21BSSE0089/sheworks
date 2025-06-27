import { createContext, useContext, useState, useEffect } from "react";
import apiService from "../services/api";
import deeplTranslationService from "../services/deeplTranslation";

const LanguageContext = createContext();

// Interface languages - only English and Urdu
export const INTERFACE_LANGUAGES = {
  en: { name: "English", nativeName: "English", flag: "🇺🇸" },
  ur: { name: "Urdu", nativeName: "اردو", flag: "🇵🇰" }
};

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

// Interface translations (English as base)
const INTERFACE_TRANSLATIONS = {
  en: {
    "Home": "Home",
    "Products": "Products",
    "Cart": "Cart",
    "Account": "Account",
    "Login": "Login",
    "Signup": "Signup",
    "Logout": "Logout",
    "Search": "Search",
    "Add to Cart": "Add to Cart",
    "Remove from Cart": "Remove from Cart",
    "Checkout": "Checkout",
    "Total": "Total",
    "Quantity": "Quantity",
    "Price": "Price",
    "Description": "Description",
    "Reviews": "Reviews",
    "Rating": "Rating",
    "Submit": "Submit",
    "Cancel": "Cancel",
    "Save": "Save",
    "Edit": "Edit",
    "Delete": "Delete",
    "Create": "Create",
    "Update": "Update",
    "Loading": "Loading",
    "Error": "Error",
    "Success": "Success",
    "Warning": "Warning",
    "Info": "Info",
    "Close": "Close",
    "Back": "Back",
    "Next": "Next",
    "Previous": "Previous",
    "Continue": "Continue",
    "Finish": "Finish",
    "Reset": "Reset",
    "Clear": "Clear",
    "Filter": "Filter",
    "Sort": "Sort",
    "View": "View",
    "Details": "Details",
    "Settings": "Settings",
    "Profile": "Profile",
    "Messages": "Messages",
    "Notifications": "Notifications",
    "Wishlist": "Wishlist",
    "Orders": "Orders",
    "Dashboard": "Dashboard",
    "Vendor Dashboard": "Vendor Dashboard",
    "Admin Dashboard": "Admin Dashboard",
    "About": "About",
    "Contact": "Contact",
    "Privacy Policy": "Privacy Policy",
    "Terms of Service": "Terms of Service",
    "All rights reserved": "All rights reserved",
    "Follow us": "Follow us",
    "Customer Service": "Customer Service"
  },
  ur: {} // Will be populated with DeepL translations
};

export function useLanguage() {
  return useContext(LanguageContext);
}

export function LanguageProvider({ children }) {
  const [interfaceLanguage, setInterfaceLanguage] = useState(() => localStorage.getItem("interfaceLanguage") || "en");
  const [interfaceTranslations, setInterfaceTranslations] = useState(INTERFACE_TRANSLATIONS);
  const [translationCache, setTranslationCache] = useState({});

  useEffect(() => {
    localStorage.setItem("interfaceLanguage", interfaceLanguage);
  }, [interfaceLanguage]);

  // Initialize Urdu translations on first load
  useEffect(() => {
    const initializeUrduTranslations = async () => {
      if (interfaceTranslations.ur && Object.keys(interfaceTranslations.ur).length === 0) {
        const urduTranslations = {};
        
        for (const [key, englishText] of Object.entries(INTERFACE_TRANSLATIONS.en)) {
          try {
            const translated = await deeplTranslationService.translateText(englishText, 'en', 'ur');
            urduTranslations[key] = translated;
          } catch (error) {
            urduTranslations[key] = englishText; // Fallback to English
          }
        }
        
        setInterfaceTranslations(prev => ({
          ...prev,
          ur: urduTranslations
        }));
      }
    };

    initializeUrduTranslations();
  }, []);

  // Interface translation function
  const t = (key) => {
    if (interfaceLanguage === 'en') {
      return INTERFACE_TRANSLATIONS.en[key] || key;
    }
    
    if (interfaceTranslations.ur[key]) {
      return interfaceTranslations.ur[key];
    }
    
    return INTERFACE_TRANSLATIONS.en[key] || key;
  };

  // Message translation function using DeepL
  const translateMessage = async (message, userLang) => {
    if (message.content.language === userLang) return message.content.text;
    
    const cacheKey = `${message.content.text}-${message.content.language}-${userLang}`;
    if (translationCache[cacheKey]) {
      return translationCache[cacheKey];
    }
    
    const translatedText = await deeplTranslationService.translateText(message.content.text, message.content.language, userLang);
    setTranslationCache(prev => ({ ...prev, [cacheKey]: translatedText }));
    return translatedText;
  };

  const translateBatch = async (messages, targetLang) => {
    if (!messages || messages.length === 0) return [];
    
    const translatedMessages = [];
    
    for (const message of messages) {
      if (message.content.language !== targetLang) {
        const translatedText = await deeplTranslationService.translateText(message.content.text, message.content.language, targetLang);
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
  };

  const clearTranslationCache = () => {
    setTranslationCache({});
  };

  return (
    <LanguageContext.Provider value={{ 
      interfaceLanguage, 
      setInterfaceLanguage, 
      interfaceLanguages: INTERFACE_LANGUAGES,
      messageLanguages: LANGUAGES,
      t, // Interface translation function
      translateMessage,
      translateBatch,
      clearTranslationCache
    }}>
      {children}
    </LanguageContext.Provider>
  );
} 
 