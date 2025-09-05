import React, { useState, useEffect } from 'react';
import { useAccounting } from '../contexts/AccountingContext';
import { useLanguage } from '../contexts/LanguageContext';

const DateSettings = () => {
  const { database, updateUserPreferences } = useAccounting();
  const { t } = useLanguage();
  
  const [preferences, setPreferences] = useState({
    dateFormat: 'DD/MM/YYYY',
    timeFormat: '24h',
    firstDayOfWeek: 'monday',
    timezone: 'auto'
  });

  const [isLoading, setIsLoading] = useState(false);

  // Load current preferences
  useEffect(() => {
    if (database) {
      const datePrefs = database.getUserPreferences().find(p => p.category === 'date_formatting');
      if (datePrefs) {
        // Parse JSON string back to object
        const settings = typeof datePrefs.settings === 'string' 
          ? JSON.parse(datePrefs.settings) 
          : datePrefs.settings;
        setPreferences(settings);
      }
    }
  }, [database]);

  const handlePreferenceChange = (key, value) => {
    setPreferences(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const savePreferences = async () => {
    try {
      setIsLoading(true);
      await updateUserPreferences('date_formatting', preferences);
      alert(t('datePreferencesSaved'));
    } catch (error) {
      console.error('Error saving date preferences:', error);
      alert('Error saving preferences. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const resetToDefaults = () => {
    setPreferences({
      dateFormat: 'DD/MM/YYYY',
      timeFormat: '24h',
      firstDayOfWeek: 'monday',
      timezone: 'auto'
    });
  };

  const getDateFormatExample = (format) => {
    const now = new Date();
    const day = now.getDate().toString().padStart(2, '0');
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const year = now.getFullYear();
    
    switch (format) {
      case 'DD/MM/YYYY':
        return `${day}/${month}/${year}`;
      case 'MM/DD/YYYY':
        return `${month}/${day}/${year}`;
      case 'YYYY-MM-DD':
        return `${year}-${month}-${day}`;
      case 'DD.MM.YYYY':
        return `${day}.${month}.${year}`;
      case 'MMM DD, YYYY':
        return now.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
      default:
        return `${day}/${month}/${year}`;
    }
  };

  const getTimeFormatExample = (format) => {
    const now = new Date();
    return format === '24h' 
      ? now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
      : now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  };

  return (
    <div className="date-settings">
      <div className="settings-header">
        <h2>{t('dateTimePreferences')}</h2>
        <p>Customize how dates and times are displayed throughout the application</p>
      </div>

      <div className="settings-content">
        <div className="settings-panel">
          {/* Date Format */}
          <div className="setting-group">
            <label>{t('dateFormat')}</label>
            <div className="radio-group">
              {[
                { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY' },
                { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY' },
                { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD' },
                { value: 'DD.MM.YYYY', label: 'DD.MM.YYYY' },
                { value: 'MMM DD, YYYY', label: 'MMM DD, YYYY' }
              ].map(option => (
                <label key={option.value} className="radio-option">
                  <input
                    type="radio"
                    name="dateFormat"
                    value={option.value}
                    checked={preferences.dateFormat === option.value}
                    onChange={(e) => handlePreferenceChange('dateFormat', e.target.value)}
                  />
                  {option.label} <span className="format-example">({getDateFormatExample(option.value)})</span>
                </label>
              ))}
            </div>
          </div>

          {/* Time Format */}
          <div className="setting-group">
            <label>{t('timeFormat')}</label>
            <div className="radio-group">
              <label className="radio-option">
                <input
                  type="radio"
                  name="timeFormat"
                  value="24h"
                  checked={preferences.timeFormat === '24h'}
                  onChange={(e) => handlePreferenceChange('timeFormat', e.target.value)}
                />
                {t('hour24')} <span className="format-example">({getTimeFormatExample('24h')})</span>
              </label>
              <label className="radio-option">
                <input
                  type="radio"
                  name="timeFormat"
                  value="12h"
                  checked={preferences.timeFormat === '12h'}
                  onChange={(e) => handlePreferenceChange('timeFormat', e.target.value)}
                />
                {t('hour12')} <span className="format-example">({getTimeFormatExample('12h')})</span>
              </label>
            </div>
          </div>

          {/* First Day of Week */}
          <div className="setting-group">
            <label>First Day of Week</label>
            <select 
              value={preferences.firstDayOfWeek}
              onChange={(e) => handlePreferenceChange('firstDayOfWeek', e.target.value)}
            >
              <option value="monday">Monday</option>
              <option value="sunday">Sunday</option>
              <option value="saturday">Saturday</option>
            </select>
          </div>

          {/* Timezone */}
          <div className="setting-group">
            <label>Timezone</label>
            <select 
              value={preferences.timezone}
              onChange={(e) => handlePreferenceChange('timezone', e.target.value)}
            >
              <option value="auto">Automatic (Browser timezone)</option>
              <option value="UTC">UTC</option>
              <option value="Europe/London">Europe/London</option>
              <option value="Europe/Paris">Europe/Paris</option>
              <option value="America/New_York">America/New_York</option>
              <option value="America/Los_Angeles">America/Los_Angeles</option>
              <option value="Asia/Tokyo">Asia/Tokyo</option>
              <option value="Australia/Sydney">Australia/Sydney</option>
            </select>
          </div>
        </div>

        {/* Preview Panel */}
        <div className="preview-panel">
          <h3>Preview</h3>
          <div className="preview-section">
            <h4>{t('currentDateTime')}</h4>
            <div className="preview-item">
              <span className="preview-label">{t('date')}:</span>
              <span className="preview-value">{getDateFormatExample(preferences.dateFormat)}</span>
            </div>
            <div className="preview-item">
              <span className="preview-label">{t('time')}</span>
              <span className="preview-value">{getTimeFormatExample(preferences.timeFormat)}</span>
            </div>
            <div className="preview-item">
              <span className="preview-label">Week starts:</span>
              <span className="preview-value">
                {preferences.firstDayOfWeek ? 
                  preferences.firstDayOfWeek.charAt(0).toUpperCase() + preferences.firstDayOfWeek.slice(1) : 
                  'Monday'
                }
              </span>
            </div>
            <div className="preview-item">
              <span className="preview-label">Timezone:</span>
              <span className="preview-value">
                {preferences.timezone === 'auto' ? 'Auto-detected' : preferences.timezone}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="settings-actions">
        <button onClick={resetToDefaults} className="btn-secondary">
          Reset to Defaults
        </button>
        <button onClick={savePreferences} className="btn-primary" disabled={isLoading}>
          {isLoading ? 'Saving...' : 'Save Preferences'}
        </button>
      </div>
    </div>
  );
};

export default DateSettings;