import React, { useState, useEffect } from 'react';
import { useAccounting } from '../contexts/AccountingContext';
import { useLanguage } from '../contexts/LanguageContext';
import './NotificationSettings.css';

const NotificationSettings = () => {
  const { t } = useLanguage();
  const { updateUserPreferences } = useAccounting();
  const [settings, setSettings] = useState({
    enabled: true,
    budgetAlerts: {
      enabled: true,
      thresholds: [80, 100, 120],
      largeTransactionAmount: 500
    },
    lowBalanceAlerts: {
      enabled: true,
      defaultThreshold: 500
    },
    reconciliationReminders: {
      enabled: true,
      daysOverdue: 7
    },
    dataIssues: {
      enabled: true
    },
    insights: {
      enabled: true
    },
    cleanupDays: 30
  });
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState('');

  useEffect(() => {
    loadCurrentSettings();
  }, []);

  const loadCurrentSettings = async () => {
    try {
      // Load existing preferences from database
      // This would be implemented with proper preference loading
      console.log('Loading notification settings...');
    } catch (error) {
      console.error('Error loading notification settings:', error);
    }
  };

  const handleToggle = (path, value) => {
    setSettings(prev => {
      const newSettings = { ...prev };
      const keys = path.split('.');
      let current = newSettings;
      
      for (let i = 0; i < keys.length - 1; i++) {
        current = current[keys[i]];
      }
      current[keys[keys.length - 1]] = value;
      
      return newSettings;
    });
  };

  const handleNumberChange = (path, value) => {
    const numValue = parseInt(value, 10);
    if (!isNaN(numValue) && numValue >= 0) {
      handleToggle(path, numValue);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveStatus('');
    
    try {
      await updateUserPreferences('notifications', settings);
      setSaveStatus('Settings saved successfully!');
      
      // Clear status after 3 seconds
      setTimeout(() => setSaveStatus(''), 3000);
    } catch (error) {
      console.error('Error saving notification settings:', error);
      setSaveStatus('Error saving settings. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    const defaultSettings = {
      enabled: true,
      budgetAlerts: {
        enabled: true,
        thresholds: [80, 100, 120],
        largeTransactionAmount: 500
      },
      lowBalanceAlerts: {
        enabled: true,
        defaultThreshold: 500
      },
      reconciliationReminders: {
        enabled: true,
        daysOverdue: 7
      },
      dataIssues: {
        enabled: true
      },
      insights: {
        enabled: true
      },
      cleanupDays: 30
    };
    setSettings(defaultSettings);
  };

  return (
    <div className="notification-settings">
      <div className="settings-header">
        <h3>🔔 {t('notificationSettings') || 'Notification Settings'}</h3>
        <p>Configure when and how you receive financial notifications and alerts.</p>
      </div>

      <div className="settings-content">
        {/* Master Toggle */}
        <div className="setting-section">
          <div className="setting-item">
            <div className="setting-info">
              <label className="setting-label">Enable Notifications</label>
              <p className="setting-description">Master switch for all notifications</p>
            </div>
            <div className="setting-control">
              <input
                type="checkbox"
                className="white-checkbox"
                checked={settings.enabled}
                onChange={(e) => handleToggle('enabled', e.target.checked)}
              />
            </div>
          </div>
        </div>

        {settings.enabled && (
          <>
            {/* Budget Alerts */}
            <div className="setting-section">
              <h4 className="section-title">💰 Budget & Finance Alerts</h4>
              
              <div className="setting-item">
                <div className="setting-info">
                  <label className="setting-label">Budget Alerts</label>
                  <p className="setting-description">Get notified when approaching or exceeding budget limits</p>
                </div>
                <div className="setting-control">
                  <input
                    type="checkbox"
                    className="white-checkbox"
                    checked={settings.budgetAlerts.enabled}
                    onChange={(e) => handleToggle('budgetAlerts.enabled', e.target.checked)}
                  />
                </div>
              </div>

              {settings.budgetAlerts.enabled && (
                <div className="setting-subitem">
                  <label className="setting-label">Large Transaction Threshold</label>
                  <div className="input-group">
                    <input
                      type="number"
                      min="0"
                      step="50"
                      value={settings.budgetAlerts.largeTransactionAmount}
                      onChange={(e) => handleNumberChange('budgetAlerts.largeTransactionAmount', e.target.value)}
                      className="number-input"
                    />
                    <span className="input-suffix">Alert for transactions above this amount</span>
                  </div>
                </div>
              )}

              <div className="setting-item">
                <div className="setting-info">
                  <label className="setting-label">Low Balance Alerts</label>
                  <p className="setting-description">Get notified when account balances fall below thresholds</p>
                </div>
                <div className="setting-control">
                  <input
                    type="checkbox"
                    className="white-checkbox"
                    checked={settings.lowBalanceAlerts.enabled}
                    onChange={(e) => handleToggle('lowBalanceAlerts.enabled', e.target.checked)}
                  />
                </div>
              </div>

              {settings.lowBalanceAlerts.enabled && (
                <div className="setting-subitem">
                  <label className="setting-label">Default Low Balance Threshold</label>
                  <div className="input-group">
                    <input
                      type="number"
                      min="0"
                      step="100"
                      value={settings.lowBalanceAlerts.defaultThreshold}
                      onChange={(e) => handleNumberChange('lowBalanceAlerts.defaultThreshold', e.target.value)}
                      className="number-input"
                    />
                    <span className="input-suffix">Default threshold for accounts</span>
                  </div>
                </div>
              )}
            </div>

            {/* Data & Maintenance */}
            <div className="setting-section">
              <h4 className="section-title">🔍 Data & Maintenance</h4>
              
              <div className="setting-item">
                <div className="setting-info">
                  <label className="setting-label">Reconciliation Reminders</label>
                  <p className="setting-description">Get reminded when accounts need reconciliation</p>
                </div>
                <div className="setting-control">
                  <input
                    type="checkbox"
                    className="white-checkbox"
                    checked={settings.reconciliationReminders.enabled}
                    onChange={(e) => handleToggle('reconciliationReminders.enabled', e.target.checked)}
                  />
                </div>
              </div>

              {settings.reconciliationReminders.enabled && (
                <div className="setting-subitem">
                  <label className="setting-label">Days Before Reminder</label>
                  <div className="input-group">
                    <input
                      type="number"
                      min="1"
                      max="30"
                      value={settings.reconciliationReminders.daysOverdue}
                      onChange={(e) => handleNumberChange('reconciliationReminders.daysOverdue', e.target.value)}
                      className="number-input"
                    />
                    <span className="input-suffix">days without reconciliation</span>
                  </div>
                </div>
              )}

              <div className="setting-item">
                <div className="setting-info">
                  <label className="setting-label">Data Issues</label>
                  <p className="setting-description">Get notified about data inconsistencies and missing information</p>
                </div>
                <div className="setting-control">
                  <input
                    type="checkbox"
                    className="white-checkbox"
                    checked={settings.dataIssues.enabled}
                    onChange={(e) => handleToggle('dataIssues.enabled', e.target.checked)}
                  />
                </div>
              </div>
            </div>

            {/* Insights & Reports */}
            <div className="setting-section">
              <h4 className="section-title">💡 Insights & Reports</h4>
              
              <div className="setting-item">
                <div className="setting-info">
                  <label className="setting-label">Financial Insights</label>
                  <p className="setting-description">Get insights about spending patterns and opportunities</p>
                </div>
                <div className="setting-control">
                  <input
                    type="checkbox"
                    className="white-checkbox"
                    checked={settings.insights.enabled}
                    onChange={(e) => handleToggle('insights.enabled', e.target.checked)}
                  />
                </div>
              </div>
            </div>

            {/* Cleanup Settings */}
            <div className="setting-section">
              <h4 className="section-title">🧹 Maintenance</h4>
              
              <div className="setting-item">
                <div className="setting-info">
                  <label className="setting-label">Auto-cleanup Old Notifications</label>
                  <p className="setting-description">Automatically delete notifications after specified days</p>
                </div>
                <div className="setting-control">
                  <div className="input-group">
                    <input
                      type="number"
                      min="1"
                      max="365"
                      value={settings.cleanupDays}
                      onChange={(e) => handleNumberChange('cleanupDays', e.target.value)}
                      className="number-input"
                    />
                    <span className="input-suffix">days</span>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Actions */}
      <div className="settings-actions">
        <button
          className="button-secondary"
          onClick={handleReset}
          disabled={isSaving}
        >
          Reset to Defaults
        </button>
        
        <button
          className="button-primary"
          onClick={handleSave}
          disabled={isSaving}
        >
          {isSaving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>

      {/* Status Message */}
      {saveStatus && (
        <div className={`save-status ${saveStatus.includes('Error') ? 'error' : 'success'}`}>
          {saveStatus}
        </div>
      )}
    </div>
  );
};

export default NotificationSettings;