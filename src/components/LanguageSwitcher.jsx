import React from 'react';
import { useLanguage } from '../contexts/LanguageContext';

const LanguageSwitcher = () => {
  const { language, changeLanguage, availableLanguages, t } = useLanguage();

  return (
    <div className="language-switcher">
      <label className="language-label">
        {t('language')}:
      </label>
      <select
        value={language}
        onChange={(e) => changeLanguage(e.target.value)}
        className="language-select"
      >
        {availableLanguages.map((lang) => (
          <option key={lang.code} value={lang.code}>
            {lang.name}
          </option>
        ))}
      </select>
    </div>
  );
};

export default LanguageSwitcher;