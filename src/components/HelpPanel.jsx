import React, { useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';

const HelpPanel = ({ isOpen, onClose }) => {
  const { t } = useLanguage();
  const [activeView, setActiveView] = useState('support'); // 'support' or 'releases'

  const toggleView = () => {
    setActiveView(activeView === 'support' ? 'releases' : 'support');
  };

  const renderSupportContent = () => (
    <div className="help-content">
      <h3>🆘 {t('supportTitle')}</h3>
      
      <div className="support-section">
        <h4>📧 {t('contactInfo')}</h4>
        <div className="contact-item">
          <span className="contact-label">{t('email')}:</span>
          <span className="contact-value">support@personalfinance.app</span>
        </div>
        <div className="contact-item">
          <span className="contact-label">{t('phone')}:</span>
          <span className="contact-value">+1 (555) 123-4567</span>
        </div>
      </div>

      <div className="support-section">
        <h4>🕒 {t('supportHours')}</h4>
        <p>{t('supportHoursText')}</p>
      </div>

      <div className="support-section">
        <h4>📚 {t('quickHelp')}</h4>
        <ul className="help-list">
          <li><strong>{t('addingTransactions')}:</strong> {t('addingTransactionsHelp')}</li>
          <li><strong>{t('managingAccounts')}:</strong> {t('managingAccountsHelp')}</li>
          <li><strong>{t('categories')}:</strong> {t('categoriesHelp')}</li>
          <li><strong>{t('doubleEntry')}:</strong> {t('doubleEntryHelp')}</li>
        </ul>
      </div>

      <div className="support-section">
        <h4>🐛 {t('reportBug')}</h4>
        <p>{t('reportBugText')}</p>
        <button className="support-btn">
          📝 {t('reportIssue')}
        </button>
      </div>
    </div>
  );

  const renderReleaseNotes = () => (
    <div className="help-content">
      <h3>🎁 {t('releaseNotes')}</h3>
      
      <div className="release-section">
        <h4>Version 1.2.0 - {t('latest')}</h4>
        <p className="release-date">Released: August 21, 2025</p>
        <ul className="release-list">
          <li>✨ {t('categorySystemImplemented')}</li>
          <li>🌍 {t('frenchLocalizationImproved')}</li>
          <li>🎨 {t('uiEnhancements')}</li>
          <li>🔧 {t('bugFixesGeneral')}</li>
        </ul>
      </div>

      <div className="release-section">
        <h4>Version 1.1.0</h4>
        <p className="release-date">Released: August 15, 2025</p>
        <ul className="release-list">
          <li>🔗 {t('foreignKeyRelationships')}</li>
          <li>📊 {t('improvedReporting')}</li>
          <li>💾 {t('betterDataValidation')}</li>
        </ul>
      </div>

      <div className="release-section">
        <h4>Version 1.0.0</h4>
        <p className="release-date">Released: August 1, 2025</p>
        <ul className="release-list">
          <li>🚀 {t('initialRelease')}</li>
          <li>💰 {t('doubleEntryBookkeeping')}</li>
          <li>📁 {t('excelFileStorage')}</li>
          <li>🌐 {t('bilingualSupport')}</li>
        </ul>
      </div>
    </div>
  );

  return (
    <>
      {isOpen && <div className="help-overlay" onClick={onClose}></div>}
      <div className={`help-panel ${isOpen ? 'open' : ''}`}>
        <div className="help-header">
          <div className="help-header-left">
            <button 
              className="help-toggle-btn"
              onClick={toggleView}
              title={activeView === 'support' ? t('viewReleaseNotes') : t('viewSupport')}
            >
              {activeView === 'support' ? '🎁' : '🆘'}
            </button>
            <h2>{activeView === 'support' ? t('support') : t('releaseNotes')}</h2>
          </div>
          <button className="help-close-btn" onClick={onClose}>
            ✕
          </button>
        </div>
        
        <div className="help-body">
          {activeView === 'support' ? renderSupportContent() : renderReleaseNotes()}
        </div>
      </div>
    </>
  );
};

export default HelpPanel;