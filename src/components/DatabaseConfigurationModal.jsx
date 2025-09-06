import React from 'react';
import { useLanguage } from '../contexts/LanguageContext';

const DatabaseConfigurationModal = ({ isOpen, onClose, onSelectPreset }) => {
  const { t } = useLanguage();

  if (!isOpen) return null;

  // Check if screen is very short and adjust alignment
  const isShortScreen = window.innerHeight < 600;

  const presets = [
    {
      id: 'default',
      title: t('defaultConfiguration'),
      description: t('defaultConfigurationDesc'),
      icon: '💼',
      features: [
        t('standardAccounts'),
        t('basicCategories'),
        t('generalPurpose')
      ]
    },
    {
      id: 'nomadic',
      title: t('nomadicLifestyle'),
      description: t('nomadicLifestyleDesc'),
      icon: '✈️',
      features: [
        t('travelFriendly'),
        t('locationTracking'),
        t('currencyOptimized')
      ]
    }
  ];

  const handlePresetSelect = (presetId) => {
    onSelectPreset(presetId);
    onClose();
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div 
      className="database-config-overlay" 
      onClick={handleBackdropClick}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        display: 'flex',
        alignItems: isShortScreen ? 'flex-start' : 'center',
        justifyContent: 'center',
        zIndex: 1001,
        padding: isShortScreen ? '20px 12px' : '12px',
        overflow: 'hidden'
      }}
    >
      <div className="modal-container database-config-modal">
        <div className="modal-header">
          <h2>{t('chooseConfiguration')}</h2>
          <button className="modal-close" onClick={onClose}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
            </svg>
          </button>
        </div>
        
        <div className="modal-content">
          <div className="preset-cards">
            {presets.map((preset) => (
              <div 
                key={preset.id}
                className="preset-card"
                onClick={() => handlePresetSelect(preset.id)}
              >
                <div className="preset-icon">{preset.icon}</div>
                <div className="preset-content">
                  <h3>{preset.title}</h3>
                  <p>{preset.description}</p>
                  <ul className="preset-features">
                    {preset.features.map((feature, index) => (
                      <li key={index}>{feature}</li>
                    ))}
                  </ul>
                </div>
                <div className="preset-action">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z"/>
                  </svg>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="modal-footer">
          <button 
            className="action-btn secondary-btn" 
            onClick={onClose}
          >
            {t('cancel')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DatabaseConfigurationModal;