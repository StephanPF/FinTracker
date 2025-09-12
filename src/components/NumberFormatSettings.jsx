import React, { useState, useEffect } from 'react';
import { useAccounting } from '../contexts/AccountingContext';
import { useLanguage } from '../contexts/LanguageContext';
import NumberFormatService from '../utils/numberFormatService';

const NumberFormatSettings = () => {
  const { database, updateUserPreferences } = useAccounting();
  const { t } = useLanguage();
  
  const [preferences, setPreferences] = useState({
    currencySymbolPosition: 'auto',
    decimalSeparator: 'dot',
    thousandsSeparator: 'comma',
    decimalPrecision: 'auto',
    negativeDisplay: 'minus',
    largeNumberNotation: 'full',
    currencyCodeDisplay: 'contextual'
  });

  const [preview, setPreview] = useState({});
  const [isLoading, setIsLoading] = useState(true);

  // Load current preferences
  useEffect(() => {
    if (database) {
      const currentPrefs = database.getNumberFormatPreferences();
      setPreferences(currentPrefs);
      setIsLoading(false);
      updatePreview(currentPrefs);
    }
  }, [database]);

  // Update preview when preferences change
  useEffect(() => {
    updatePreview(preferences);
  }, [preferences]);

  const updatePreview = (prefs) => {
    if (!database) return;

    // Use the NumberFormatService from the context
    const formatService = new NumberFormatService(database);
    
    const currencies = database.getTable('currencies');
    const usdCurrency = currencies.find(c => c.code === 'USD');
    const eurCurrency = currencies.find(c => c.code === 'EUR');
    const btcCurrency = currencies.find(c => c.code === 'BTC');

    setPreview({
      positive: {
        USD: formatService.formatCurrency(1234.56, usdCurrency?.id, prefs),
        EUR: formatService.formatCurrency(1234.56, eurCurrency?.id, prefs),
        BTC: formatService.formatCurrency(0.1234, btcCurrency?.id, prefs)
      },
      negative: {
        USD: formatService.formatCurrency(-1234.56, usdCurrency?.id, prefs),
        EUR: formatService.formatCurrency(-1234.56, eurCurrency?.id, prefs)
      },
      large: {
        USD: formatService.formatCurrency(1234567.89, usdCurrency?.id, prefs)
      }
    });
  };

  const handlePreferenceChange = (key, value) => {
    setPreferences(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const savePreferences = async () => {
    try {
      setIsLoading(true);
      await updateUserPreferences('number_formatting', preferences);
      alert('Number formatting preferences saved successfully!');
    } catch (error) {
      console.error('Error saving preferences:', error);
      alert('Error saving preferences. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const resetToDefaults = () => {
    const defaults = {
      currencySymbolPosition: 'auto',
      decimalSeparator: 'dot',
      thousandsSeparator: 'comma',
      decimalPrecision: 'auto',
      negativeDisplay: 'minus',
      largeNumberNotation: 'full',
      currencyCodeDisplay: 'contextual'
    };
    setPreferences(defaults);
  };

  const applyLocalePreset = (locale) => {
    const presets = {
      US: {
        currencySymbolPosition: 'before',
        decimalSeparator: 'dot',
        thousandsSeparator: 'comma',
        negativeDisplay: 'minus'
      },
      EU: {
        currencySymbolPosition: 'after',
        decimalSeparator: 'comma',
        thousandsSeparator: 'dot',
        negativeDisplay: 'minus'
      },
      UK: {
        currencySymbolPosition: 'before',
        decimalSeparator: 'dot',
        thousandsSeparator: 'comma',
        negativeDisplay: 'minus'
      }
    };

    if (presets[locale]) {
      setPreferences(prev => ({
        ...prev,
        ...presets[locale]
      }));
    }
  };

  if (isLoading) {
    return <div className="loading">Loading preferences...</div>;
  }

  return (
    <div className="number-format-settings">
      <div className="settings-content">
        <div className="settings-panel">
          {/* Locale Presets */}
          <div className="setting-group">
            <h3>Quick Presets</h3>
            <div className="preset-buttons">
              <button onClick={() => applyLocalePreset('US')} className="preset-btn">
                🇺🇸 US Format ($1,234.56)
              </button>
              <button onClick={() => applyLocalePreset('EU')} className="preset-btn">
                🇪🇺 EU Format (1.234,56 €)
              </button>
              <button onClick={() => applyLocalePreset('UK')} className="preset-btn">
                🇬🇧 UK Format (£1,234.56)
              </button>
            </div>
          </div>

          {/* Currency Symbol Position */}
          <div className="setting-group">
            <label>Currency Symbol Position</label>
            <select 
              value={preferences.currencySymbolPosition}
              onChange={(e) => handlePreferenceChange('currencySymbolPosition', e.target.value)}
            >
              <option value="before">Before amount ($1,234.56)</option>
              <option value="after">After amount (1,234.56 $)</option>
              <option value="auto">Auto (follows currency convention)</option>
            </select>
          </div>

          {/* Decimal Separator */}
          <div className="setting-group">
            <label>Decimal Separator</label>
            <div className="radio-group">
              <label className="radio-option">
                <input
                  type="radio"
                  name="decimalSeparator"
                  value="dot"
                  checked={preferences.decimalSeparator === 'dot'}
                  onChange={(e) => handlePreferenceChange('decimalSeparator', e.target.value)}
                />
                Dot (1,234.56)
              </label>
              <label className="radio-option">
                <input
                  type="radio"
                  name="decimalSeparator"
                  value="comma"
                  checked={preferences.decimalSeparator === 'comma'}
                  onChange={(e) => handlePreferenceChange('decimalSeparator', e.target.value)}
                />
                Comma (1,234<span className="highlight">,</span>56)
              </label>
            </div>
          </div>

          {/* Thousands Separator */}
          <div className="setting-group">
            <label>Thousands Separator</label>
            <select 
              value={preferences.thousandsSeparator}
              onChange={(e) => handlePreferenceChange('thousandsSeparator', e.target.value)}
            >
              <option value="comma">Comma (1,234,567.89)</option>
              <option value="dot">Dot (1.234.567,89)</option>
              <option value="space">Space (1 234 567.89)</option>
              <option value="none">None (1234567.89)</option>
            </select>
          </div>

          {/* Decimal Precision */}
          <div className="setting-group">
            <label>Decimal Precision</label>
            <select 
              value={preferences.decimalPrecision}
              onChange={(e) => handlePreferenceChange('decimalPrecision', e.target.value)}
            >
              <option value="auto">Auto (use currency default)</option>
              <option value="fixed-2">Always 2 decimals (1,234.56)</option>
              <option value="fixed-4">Always 4 decimals (1,234.5600)</option>
              <option value="smart">Smart (hide trailing zeros)</option>
            </select>
          </div>

          {/* Negative Display */}
          <div className="setting-group">
            <label>Negative Numbers</label>
            <div className="radio-group">
              <label className="radio-option">
                <input
                  type="radio"
                  name="negativeDisplay"
                  value="minus"
                  checked={preferences.negativeDisplay === 'minus'}
                  onChange={(e) => handlePreferenceChange('negativeDisplay', e.target.value)}
                />
                Minus sign (-$1,234.56)
              </label>
              <label className="radio-option">
                <input
                  type="radio"
                  name="negativeDisplay"
                  value="parentheses"
                  checked={preferences.negativeDisplay === 'parentheses'}
                  onChange={(e) => handlePreferenceChange('negativeDisplay', e.target.value)}
                />
                Parentheses (($1,234.56))
              </label>
              <label className="radio-option">
                <input
                  type="radio"
                  name="negativeDisplay"
                  value="red"
                  checked={preferences.negativeDisplay === 'red'}
                  onChange={(e) => handlePreferenceChange('negativeDisplay', e.target.value)}
                />
                Red color + minus (-$1,234.56)
              </label>
            </div>
          </div>

          {/* Large Number Notation */}
          <div className="setting-group">
            <label>Large Numbers</label>
            <select 
              value={preferences.largeNumberNotation}
              onChange={(e) => handlePreferenceChange('largeNumberNotation', e.target.value)}
            >
              <option value="full">Full numbers (1,234,567.89)</option>
              <option value="compact">Compact notation (1.23M)</option>
              <option value="scientific">Scientific (1.23E+6)</option>
            </select>
          </div>

          {/* Currency Code Display */}
          <div className="setting-group">
            <label>Currency Display</label>
            <select 
              value={preferences.currencyCodeDisplay}
              onChange={(e) => handlePreferenceChange('currencyCodeDisplay', e.target.value)}
            >
              <option value="symbol-only">Symbol only ($1,234.56)</option>
              <option value="code-only">Code only (USD 1,234.56)</option>
              <option value="both">Both ($1,234.56 USD)</option>
              <option value="contextual">Smart (symbol for base, code for others)</option>
            </select>
          </div>
        </div>

        {/* Preview Panel */}
        <div className="preview-panel">
          <h3>Preview</h3>
          <div className="preview-section">
            <h4>Positive Amounts</h4>
            <div className="preview-item">
              <span className="currency-label">USD:</span>
              <span className="preview-value">{preview.positive?.USD || 'Loading...'}</span>
            </div>
            <div className="preview-item">
              <span className="currency-label">EUR:</span>
              <span className="preview-value">{preview.positive?.EUR || 'Loading...'}</span>
            </div>
            <div className="preview-item">
              <span className="currency-label">BTC:</span>
              <span className="preview-value">{preview.positive?.BTC || 'Loading...'}</span>
            </div>
          </div>

          <div className="preview-section">
            <h4>Negative Amounts</h4>
            <div className="preview-item">
              <span className="currency-label">USD:</span>
              <span className="preview-value">{preview.negative?.USD || 'Loading...'}</span>
            </div>
            <div className="preview-item">
              <span className="currency-label">EUR:</span>
              <span className="preview-value">{preview.negative?.EUR || 'Loading...'}</span>
            </div>
          </div>

          <div className="preview-section">
            <h4>Large Numbers</h4>
            <div className="preview-item">
              <span className="currency-label">USD:</span>
              <span className="preview-value">{preview.large?.USD || 'Loading...'}</span>
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

export default NumberFormatSettings;