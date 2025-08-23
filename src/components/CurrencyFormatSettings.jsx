import React, { useState, useEffect } from 'react';
import { useAccounting } from '../contexts/AccountingContext';
import { useLanguage } from '../contexts/LanguageContext';

const CurrencyFormatSettings = () => {
  const { 
    currencies,
    getCurrencyFormatPreferences,
    getAllCurrencyFormatPreferences,
    updateCurrencyFormatPreferences,
    numberFormatService
  } = useAccounting();
  const { t } = useLanguage();
  
  const [selectedCurrencyId, setSelectedCurrencyId] = useState('');
  const [preferences, setPreferences] = useState({});
  const [originalPreferences, setOriginalPreferences] = useState({});
  const [allPreferences, setAllPreferences] = useState({});
  const [preview, setPreview] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Load current preferences
  useEffect(() => {
    if (currencies.length > 0 && numberFormatService) {
      const allPrefs = getAllCurrencyFormatPreferences();
      setAllPreferences(allPrefs);
      
      // Select first currency by default
      if (!selectedCurrencyId && currencies.length > 0) {
        setSelectedCurrencyId(currencies[0].id);
      }
      
      setIsLoading(false);
    }
  }, [currencies, numberFormatService, getAllCurrencyFormatPreferences, selectedCurrencyId]);

  // Load preferences for selected currency
  useEffect(() => {
    if (selectedCurrencyId && numberFormatService) {
      const currencyPrefs = getCurrencyFormatPreferences(selectedCurrencyId);
      setPreferences(currencyPrefs);
      setOriginalPreferences(currencyPrefs);
      setHasUnsavedChanges(false);
      updatePreview(currencyPrefs);
    }
  }, [selectedCurrencyId, getCurrencyFormatPreferences, numberFormatService]);

  const updatePreview = (prefs) => {
    if (!numberFormatService || !selectedCurrencyId) return;
    
    const currency = currencies.find(c => c.id === selectedCurrencyId);
    if (!currency) return;

    try {
      // Convert preferences to options format for formatCurrency
      const formatOptions = {
        symbolPosition: prefs.currencySymbolPosition,
        decimalSeparator: prefs.decimalSeparator,
        thousandsSeparator: prefs.thousandsSeparator,
        precision: prefs.decimalPrecision,
        negativeDisplay: prefs.negativeDisplay,
        largeNumberNotation: prefs.largeNumberNotation,
        currencyCodeDisplay: prefs.currencyCodeDisplay
      };

      setPreview({
        positive: numberFormatService.formatCurrency(1234.56, selectedCurrencyId, formatOptions),
        negative: numberFormatService.formatCurrency(-1234.56, selectedCurrencyId, formatOptions),
        large: numberFormatService.formatCurrency(1234567.89, selectedCurrencyId, formatOptions),
        small: numberFormatService.formatCurrency(0.1234, selectedCurrencyId, formatOptions)
      });
    } catch (error) {
      console.error('Preview generation failed:', error);
    }
  };

  const handleSettingChange = (key, value) => {
    const newPreferences = {
      ...preferences,
      [key]: value
    };
    
    setPreferences(newPreferences);
    updatePreview(newPreferences);
    setHasUnsavedChanges(true);
  };

  const handleSave = () => {
    // Save to database
    Object.keys(preferences).forEach(key => {
      if (preferences[key] !== originalPreferences[key]) {
        updateCurrencyFormatPreferences(selectedCurrencyId, { [key]: preferences[key] });
      }
    });
    
    // Update all preferences cache
    setAllPreferences(prev => ({
      ...prev,
      [selectedCurrencyId]: preferences
    }));
    
    setOriginalPreferences(preferences);
    setHasUnsavedChanges(false);
  };

  const handleReset = () => {
    setPreferences(originalPreferences);
    updatePreview(originalPreferences);
    setHasUnsavedChanges(false);
  };

  const applyPreset = (preset) => {
    let presetSettings = {};
    
    switch (preset) {
      case 'us':
        presetSettings = {
          currencySymbolPosition: 'before',
          decimalSeparator: 'dot',
          thousandsSeparator: 'comma',
          negativeDisplay: 'minus'
        };
        break;
      case 'eu':
        presetSettings = {
          currencySymbolPosition: 'after',
          decimalSeparator: 'comma',
          thousandsSeparator: 'space',
          negativeDisplay: 'minus'
        };
        break;
      case 'uk':
        presetSettings = {
          currencySymbolPosition: 'before',
          decimalSeparator: 'dot',
          thousandsSeparator: 'comma',
          negativeDisplay: 'minus'
        };
        break;
      case 'crypto':
        presetSettings = {
          currencySymbolPosition: 'after',
          decimalSeparator: 'dot',
          thousandsSeparator: 'comma',
          negativeDisplay: 'minus'
        };
        break;
    }
    
    const newPreferences = {
      ...preferences,
      ...presetSettings
    };
    
    setPreferences(newPreferences);
    updatePreview(newPreferences);
    setHasUnsavedChanges(true);
  };

  if (isLoading) {
    return <div className="loading">Loading currency format settings...</div>;
  }

  if (currencies.length === 0) {
    return (
      <div className="empty-state">
        <h3>No currencies available</h3>
        <p>Please add currencies first to configure their formatting.</p>
      </div>
    );
  }

  const selectedCurrency = currencies.find(c => c.id === selectedCurrencyId);

  return (
    <div className="currency-format-settings">
      <div className="settings-header">
        <h2>💰 Currency Formatting Settings</h2>
        <p>Configure how each currency is displayed throughout the application.</p>
      </div>

      <div className="currency-selector">
        <label htmlFor="currency-select">
          <strong>Select Currency to Configure:</strong>
        </label>
        <select 
          id="currency-select"
          value={selectedCurrencyId} 
          onChange={(e) => setSelectedCurrencyId(e.target.value)}
          className="currency-select"
        >
          {currencies.map(currency => (
            <option key={currency.id} value={currency.id}>
              {currency.symbol} {currency.name} ({currency.code})
            </option>
          ))}
        </select>
      </div>

      {selectedCurrency && (
        <div className="currency-settings-content">
          <div className="settings-grid">
            <div className="settings-panel">
              <h3>📋 Format Settings for {selectedCurrency.name}</h3>
              
              <div className="quick-presets">
                <label><strong>Quick Presets:</strong></label>
                <div className="preset-buttons">
                  <button 
                    className="preset-btn"
                    onClick={() => applyPreset('us')}
                    title="US Format: $1,234.56"
                  >
                    🇺🇸 US Format
                  </button>
                  <button 
                    className="preset-btn"
                    onClick={() => applyPreset('eu')}
                    title="European Format: 1 234,56 €"
                  >
                    🇪🇺 EU Format
                  </button>
                  <button 
                    className="preset-btn"
                    onClick={() => applyPreset('uk')}
                    title="UK Format: £1,234.56"
                  >
                    🇬🇧 UK Format
                  </button>
                  <button 
                    className="preset-btn"
                    onClick={() => applyPreset('crypto')}
                    title="Crypto Format: 0.1234 BTC"
                  >
                    🪙 Crypto Format
                  </button>
                </div>
              </div>

              <div className="setting-group">
                <label htmlFor="symbol-position">Currency Symbol Position:</label>
                <select 
                  id="symbol-position"
                  value={preferences.currencySymbolPosition || 'before'} 
                  onChange={(e) => handleSettingChange('currencySymbolPosition', e.target.value)}
                >
                  <option value="before">Before amount (€123.45)</option>
                  <option value="after">After amount (123.45 €)</option>
                </select>
              </div>

              <div className="setting-group">
                <label htmlFor="decimal-separator">Decimal Separator:</label>
                <select 
                  id="decimal-separator"
                  value={preferences.decimalSeparator || 'dot'} 
                  onChange={(e) => handleSettingChange('decimalSeparator', e.target.value)}
                >
                  <option value="dot">Dot (123.45)</option>
                  <option value="comma">Comma (123,45)</option>
                </select>
              </div>

              <div className="setting-group">
                <label htmlFor="thousands-separator">Thousands Separator:</label>
                <select 
                  id="thousands-separator"
                  value={preferences.thousandsSeparator || 'comma'} 
                  onChange={(e) => handleSettingChange('thousandsSeparator', e.target.value)}
                >
                  <option value="comma">Comma (1,234.56)</option>
                  <option value="dot">Dot (1.234,56)</option>
                  <option value="space">Space (1 234.56)</option>
                  <option value="none">None (1234.56)</option>
                </select>
              </div>

              <div className="setting-group">
                <label htmlFor="decimal-precision">Decimal Precision:</label>
                <select 
                  id="decimal-precision"
                  value={preferences.decimalPrecision || 'auto'} 
                  onChange={(e) => handleSettingChange('decimalPrecision', e.target.value)}
                >
                  <option value="auto">Auto (uses currency default)</option>
                  <option value="fixed-2">Always 2 decimals</option>
                  <option value="fixed-4">Always 4 decimals</option>
                  <option value="smart">Smart (hides unnecessary zeros)</option>
                </select>
              </div>

              <div className="setting-group">
                <label htmlFor="negative-display">Negative Number Display:</label>
                <select 
                  id="negative-display"
                  value={preferences.negativeDisplay || 'minus'} 
                  onChange={(e) => handleSettingChange('negativeDisplay', e.target.value)}
                >
                  <option value="minus">Minus sign (-123.45)</option>
                  <option value="parentheses">Parentheses (123.45)</option>
                  <option value="red">Red color</option>
                </select>
              </div>

              <div className="setting-group">
                <label htmlFor="large-number-notation">Large Number Notation:</label>
                <select 
                  id="large-number-notation"
                  value={preferences.largeNumberNotation || 'full'} 
                  onChange={(e) => handleSettingChange('largeNumberNotation', e.target.value)}
                >
                  <option value="full">Full (1,234,567.89)</option>
                  <option value="compact">Compact (1.23M)</option>
                  <option value="scientific">Scientific (1.23e6)</option>
                </select>
              </div>

              <div className="setting-group">
                <label htmlFor="currency-code-display">Currency Code Display:</label>
                <select 
                  id="currency-code-display"
                  value={preferences.currencyCodeDisplay || 'symbol-only'} 
                  onChange={(e) => handleSettingChange('currencyCodeDisplay', e.target.value)}
                >
                  <option value="symbol-only">Symbol only (€)</option>
                  <option value="code-only">Code only (EUR)</option>
                  <option value="both">Both (€ EUR)</option>
                </select>
              </div>
            </div>

            <div className="preview-panel">
              <h3>👀 Live Preview</h3>
              <div className="preview-section">
                <h4>Positive Numbers:</h4>
                <div className="preview-value">{preview.positive || 'Loading...'}</div>
              </div>
              
              <div className="preview-section">
                <h4>Negative Numbers:</h4>
                <div className="preview-value negative">{preview.negative || 'Loading...'}</div>
              </div>
              
              <div className="preview-section">
                <h4>Large Numbers:</h4>
                <div className="preview-value">{preview.large || 'Loading...'}</div>
              </div>
              
              <div className="preview-section">
                <h4>Small Numbers:</h4>
                <div className="preview-value">{preview.small || 'Loading...'}</div>
              </div>
            </div>
          </div>

          <div className="settings-actions">
            {hasUnsavedChanges && (
              <div className="unsaved-indicator">
                ⚠️ You have unsaved changes
              </div>
            )}
            <div className="action-buttons">
              <button 
                className="reset-btn" 
                onClick={handleReset}
                disabled={!hasUnsavedChanges}
                title="Reset to saved values"
              >
                🔄 Reset
              </button>
              <button 
                className="save-btn" 
                onClick={handleSave}
                disabled={!hasUnsavedChanges}
                title="Save changes to database"
              >
                💾 Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CurrencyFormatSettings;