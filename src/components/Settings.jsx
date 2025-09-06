import React, { useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import CurrencyFormatSettings from './CurrencyFormatSettings';
import DateSettings from './DateSettings';
import DataSettings from './DataSettings';
import ImportSettings from './ImportSettings';

const Settings = () => {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState('number-currency');

  const tabs = [
    {
      id: 'number-currency',
      label: t('numberCurrency'),
      icon: '💰',
      component: CurrencyFormatSettings
    },
    {
      id: 'date',
      label: t('date'),
      icon: '📅',
      component: DateSettings
    },
    {
      id: 'data',
      label: t('data'),
      icon: '📁',
      component: DataSettings
    },
    {
      id: 'import',
      label: t('bankConfiguration'),
      icon: '🏦',
      component: ImportSettings
    }
  ];

  const ActiveComponent = tabs.find(tab => tab.id === activeTab)?.component || CurrencyFormatSettings;

  return (
    <div className="settings-container">
      <div className="settings-header">
        <h1>{t('settings')}</h1>
        <p>{t('customizePreferences')}</p>
      </div>

      <div className="settings-navigation">
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`settings-tab-btn ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <span className="tab-icon">{tab.icon}</span>
            <span className="tab-label">{tab.label}</span>
          </button>
        ))}
      </div>

      <div className="settings-content">
        <ActiveComponent />
      </div>
    </div>
  );
};

export default Settings;