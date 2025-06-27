import { createContext, useContext, useState, useEffect } from "react";
import apiService from "../services/api";

const LanguageContext = createContext();

// Interface languages - only English and Urdu
export const INTERFACE_LANGUAGES = {
  en: { name: "English", nativeName: "English", flag: "🇺🇸" },
  ur: { name: "Urdu", nativeName: "اردو", flag: "🇵🇰" }
};

// All languages for messaging (keep multilingual)
export const MESSAGE_LANGUAGES = {
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
    // Navigation
    "Home": "Home",
    "Products": "Products",
    "About": "About",
    "Contact": "Contact",
    "Cart": "Cart",
    "Wishlist": "Wishlist",
    "Account": "Account",
    "Login": "Login",
    "Signup": "Signup",
    "Logout": "Logout",
    "Dashboard": "Dashboard",
    "Messages": "Messages",
    "Notifications": "Notifications",
    
    // Common actions
    "Add to Cart": "Add to Cart",
    "Add to Wishlist": "Add to Wishlist",
    "Remove from Wishlist": "Remove from Wishlist",
    "View Details": "View Details",
    "Buy Now": "Buy Now",
    "Checkout": "Checkout",
    "Continue Shopping": "Continue Shopping",
    "Place Order": "Place Order",
    "Confirm Order": "Confirm Order",
    
    // Product related
    "Price": "Price",
    "Quantity": "Quantity",
    "Total": "Total",
    "Description": "Description",
    "Reviews": "Reviews",
    "Rating": "Rating",
    "In Stock": "In Stock",
    "Out of Stock": "Out of Stock",
    "Free Shipping": "Free Shipping",
    "Fast Delivery": "Fast Delivery",
    
    // Forms
    "Email": "Email",
    "Password": "Password",
    "Confirm Password": "Confirm Password",
    "Name": "Name",
    "Phone": "Phone",
    "Address": "Address",
    "City": "City",
    "Country": "Country",
    "Submit": "Submit",
    "Cancel": "Cancel",
    "Save": "Save",
    "Edit": "Edit",
    "Delete": "Delete",
    
    // Messages
    "Send Message": "Send Message",
    "Type your message": "Type your message",
    "Start Conversation": "Start Conversation",
    "New Message": "New Message",
    "Search users": "Search users",
    "No messages yet": "No messages yet",
    "Select a conversation": "Select a conversation",
    
    // Notifications
    "No notifications": "No notifications",
    "Mark as read": "Mark as read",
    "Mark all as read": "Mark all as read",
    
    // Footer
    "Follow us": "Follow us",
    "Customer Service": "Customer Service",
    "Privacy Policy": "Privacy Policy",
    "Terms of Service": "Terms of Service",
    "All rights reserved": "All rights reserved"
  },
  ur: {} // Will be populated with DeepL translations
};

// DeepL translation function for interface
const translateInterfaceText = async (text, toLang) => {
  if (!text || toLang === 'en') return text;
  
  try {
    // Use DeepL API for interface translation
    if (import.meta.env.VITE_DEEPL_API_KEY) {
      const deeplResponse = await fetch('https://api-free.deepl.com/v2/translate', {
        method: 'POST',
        headers: { 
          'Authorization': `DeepL-Auth-Key ${import.meta.env.VITE_DEEPL_API_KEY}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          text: text,
          source_lang: 'EN',
          target_lang: toLang.toUpperCase()
        })
      });
      
      if (deeplResponse.ok) {
        const data = await deeplResponse.json();
        if (data.translations && data.translations[0]) {
          return data.translations[0].text;
        }
      }
    }
    
    // Fallback to MyMemory if DeepL fails
    const response = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|${toLang}`);
    const data = await response.json();
    
    if (data.responseData?.translatedText) {
      return data.responseData.translatedText;
    }
    
    return text; // Return original if translation fails
  } catch (error) {
    console.error('Interface translation error:', error);
    return text;
  }
};

// Message translation function (simplified, no loading states)
const translateMessageText = async (text, fromLang, toLang) => {
  if (!text || fromLang === toLang) return text;
  
  try {
    // Use DeepL API for message translation
    if (import.meta.env.VITE_DEEPL_API_KEY) {
      const deeplResponse = await fetch('https://api-free.deepl.com/v2/translate', {
        method: 'POST',
        headers: { 
          'Authorization': `DeepL-Auth-Key ${import.meta.env.VITE_DEEPL_API_KEY}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          text: text,
          source_lang: fromLang.toUpperCase(),
          target_lang: toLang.toUpperCase()
        })
      });
      
      if (deeplResponse.ok) {
        const data = await deeplResponse.json();
        if (data.translations && data.translations[0]) {
          return data.translations[0].text;
        }
      }
    }
    
    // Fallback to MyMemory
    const response = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${fromLang}|${toLang}`);
    const data = await response.json();
    
    if (data.responseData?.translatedText) {
      return data.responseData.translatedText;
    }
    
    return text;
  } catch (error) {
    console.error('Message translation error:', error);
    return text;
  }
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
            const translated = await translateInterfaceText(englishText, 'ur');
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

  // Message translation function (no loading states)
  const translateMessage = async (message, userLang) => {
    if (message.content.language === userLang) return message.content.text;
    
    const cacheKey = `${message.content.text}-${message.content.language}-${userLang}`;
    if (translationCache[cacheKey]) {
      return translationCache[cacheKey];
    }
    
    const translatedText = await translateMessageText(message.content.text, message.content.language, userLang);
    setTranslationCache(prev => ({ ...prev, [cacheKey]: translatedText }));
    return translatedText;
  };

  const translateBatch = async (messages, targetLang) => {
    if (!messages || messages.length === 0) return [];
    
    const translatedMessages = [];
    
    for (const message of messages) {
      if (message.content.language !== targetLang) {
        const translatedText = await translateMessageText(message.content.text, message.content.language, targetLang);
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
      messageLanguages: MESSAGE_LANGUAGES,
      t, // Interface translation function
      translateMessage,
      translateBatch,
      clearTranslationCache
    }}>
      {children}
    </LanguageContext.Provider>
  );
} 
 