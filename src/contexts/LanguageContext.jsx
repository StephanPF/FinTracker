import React, { createContext, useContext, useState, useEffect } from 'react';
import { en } from '../translations/en';
import { fr } from '../translations/fr';

const LanguageContext = createContext();

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

export const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState('en');

  const translations = {
    en,
    fr
  };

  useEffect(() => {
    // Load saved language preference
    const savedLanguage = localStorage.getItem('accounting_app_language');
    if (savedLanguage && translations[savedLanguage]) {
      setLanguage(savedLanguage);
    }
  }, []);

  const changeLanguage = (newLanguage) => {
    if (translations[newLanguage]) {
      setLanguage(newLanguage);
      localStorage.setItem('accounting_app_language', newLanguage);
    }
  };

  const t = (key) => {
    return translations[language][key] || key;
  };

  const formatCurrency = (amount) => {
    const currency = language === 'fr' ? 'EUR' : 'USD';
    const locale = language === 'fr' ? 'fr-FR' : 'en-US';
    
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency
    }).format(amount);
  };

  const value = {
    language,
    changeLanguage,
    t,
    formatCurrency,
    availableLanguages: [
      { code: 'en', name: 'English' },
      { code: 'fr', name: 'Français' }
    ]
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};