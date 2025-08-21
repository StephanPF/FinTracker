import React, { useState } from 'react';
import { useAccounting } from '../contexts/AccountingContext';
import { useLanguage } from '../contexts/LanguageContext';
import RecentDatabases from './RecentDatabases';
import LanguageSwitcher from './LanguageSwitcher';
import Logo from './Logo';

const DatabaseSetup = () => {
  const { createNewDatabase, loadExistingDatabase } = useAccounting();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCreateNew = async () => {
    try {
      setLoading(true);
      setError('');
      const success = await createNewDatabase();
      if (!success) {
        // Don't show error if user just cancelled the dialog
        setError('');
      }
    } catch (err) {
      setError('Error creating database: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLoadExisting = async () => {
    try {
      setLoading(true);
      setError('');
      const success = await loadExistingDatabase();
      if (!success) {
        // Don't show error if user just cancelled the dialog
        setError('');
      }
    } catch (err) {
      setError('Error loading database: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="database-setup">
      <div className="setup-container">
        <div className="setup-header financeflow-setup-header">
          <Logo variant="full" size="large" theme="light" />
          <div className="header-text">
            <h1>{t('welcomeTitle')}</h1>
          </div>
        </div>
        
        <header className="app-language-header">
          <LanguageSwitcher />
        </header>

        {error && (
          <div className="error-message">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
            </svg>
            {error}
          </div>
        )}

        <div className="setup-workflow">
          <div className="setup-actions">
            <div className="setup-action-card">
              <div className="action-icon new-database">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" fill="currentColor"/>
                </svg>
              </div>
              <div className="action-content">
                <h3>{t('startNewPersonal')}</h3>
                <p>{t('startNewPersonalDesc')}</p>
                <ul className="action-features">
                  <li>{t('preConfigured')}</li>
                  <li>{t('personalStandard')}</li>
                  <li>{t('readyToUse')}</li>
                </ul>
              </div>
              <button 
                onClick={handleCreateNew}
                disabled={loading}
                className="action-btn primary-btn"
              >
                {loading ? t('cancel') : t('createNewDatabase')}
              </button>
            </div>

            <div className="setup-action-card">
              <div className="action-icon existing-database">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M10 4H4c-1.11 0-2 .89-2 2v12c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2h-8l-2-2z" fill="currentColor"/>
                </svg>
              </div>
              <div className="action-content">
                <h3>{t('importExistingData')}</h3>
                <p>{t('importExistingDataDesc')}</p>
                <ul className="action-features">
                  <li>{t('preserveData')}</li>
                  <li>{t('continueWorkflows')}</li>
                  <li>{t('maintainIntegrity')}</li>
                </ul>
              </div>
              <button 
                onClick={handleLoadExisting}
                disabled={loading}
                className="action-btn secondary-btn"
              >
                {loading ? t('cancel') : t('selectDatabaseFolder')}
              </button>
            </div>
          </div>
        </div>

        <RecentDatabases />

      </div>
    </div>
  );
};

export default DatabaseSetup;