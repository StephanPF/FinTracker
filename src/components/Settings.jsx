import React, { useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import CurrencyFormatSettings from './CurrencyFormatSettings';
import DateSettings from './DateSettings';

const Settings = () => {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState('number-currency');

  const tabs = [
    {
      id: 'number-currency',
      label: 'Number & Currency',
      icon: '💰',
      component: CurrencyFormatSettings
    },
    {
      id: 'date',
      label: 'Date',
      icon: '📅',
      component: DateSettings
    }
  ];

  const ActiveComponent = tabs.find(tab => tab.id === activeTab)?.component || NumberFormatSettings;

  return (
    <div className="settings-container">
      <div className="settings-header">
        <h1>Settings</h1>
        <p>Customize your application preferences and display options</p>
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