import { createContext, useContext, useState, useEffect } from "react";
import apiService from "../services/api";

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
    "Customer Service": "Customer Service",
    "My Wishlist": "My Wishlist",
    "Your wishlist is empty": "Your wishlist is empty",
    "Browse Products": "Browse Products",
    "Remove": "Remove",
    "Welcome to SheWorks": "Welcome to SheWorks",
    "Discover from women entrepreneurs": "Discover from women entrepreneurs",
    "Shop All Products": "Shop All Products",
    "No products found": "No products found",
    "Shop jewelry, accessories, and more!": "Shop jewelry, accessories, and more!",
    "Clear All Filters": "Clear All Filters",
    "Filters": "Filters"
  },
  ur: {} // Will be populated with API translations
};

export function useLanguage() {
  return useContext(LanguageContext);
}

export function LanguageProvider({ children }) {
  const [interfaceLanguage, setInterfaceLanguage] = useState(() => localStorage.getItem("interfaceLanguage") || "en");
  const [interfaceTranslations, setInterfaceTranslations] = useState(INTERFACE_TRANSLATIONS);
  const [translationCache, setTranslationCache] = useState({});
  const [isLoadingTranslations, setIsLoadingTranslations] = useState(false);

  useEffect(() => {
    localStorage.setItem("interfaceLanguage", interfaceLanguage);
  }, [interfaceLanguage]);

  // Initialize Urdu translations using API
  useEffect(() => {
    const initializeUrduTranslations = async () => {
      if (interfaceTranslations.ur && Object.keys(interfaceTranslations.ur).length === 0) {
        setIsLoadingTranslations(true);
        const urduTranslations = {};
        
        try {
          // Translate all interface texts to Urdu using the API
          for (const [key, englishText] of Object.entries(INTERFACE_TRANSLATIONS.en)) {
            try {
              const translated = await apiService.translateText(englishText, 'en', 'ur', 'interface');
              urduTranslations[key] = translated;
              // Add small delay to avoid overwhelming the API
              await new Promise(resolve => setTimeout(resolve, 100));
            } catch (error) {
              console.warn(`Failed to translate "${key}":`, error);
              urduTranslations[key] = englishText; // Fallback to English
            }
          }
          
          setInterfaceTranslations(prev => ({
            ...prev,
            ur: urduTranslations
          }));
          
          console.log('✅ Urdu translations loaded successfully');
        } catch (error) {
          console.error('❌ Failed to load Urdu translations:', error);
        } finally {
          setIsLoadingTranslations(false);
        }
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

  // Message translation function using API
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
      interfaceLanguage, 
      setInterfaceLanguage, 
      interfaceLanguages: INTERFACE_LANGUAGES,
      messageLanguages: LANGUAGES,
      t, // Interface translation function
      translateMessage,
      translateBatch,
      clearTranslationCache,
      isLoadingTranslations
    }}>
      {children}
    </LanguageContext.Provider>
  );
} 
 