import React, { useState } from 'react';
import { useAccounting } from '../contexts/AccountingContext';
import { useLanguage } from '../contexts/LanguageContext';

const CurrencyManager = () => {
  const { 
    currencies,
    exchangeRates,
    currencySettings,
    exchangeRateService,
    getCurrencies,
    getActiveCurrencies,
    getCurrenciesByType,
    addCurrency,
    updateCurrency,
    deleteCurrency,
    addExchangeRate,
    updateCurrencySettings,
    getAccountsWithTypes
  } = useAccounting();
  
  const { t } = useLanguage();
  
  const [activeTab, setActiveTab] = useState('currencies');
  const [showForm, setShowForm] = useState(false);
  const [showExchangeRateForm, setShowExchangeRateForm] = useState(false);
  const [formData, setFormData] = useState({});
  const [editingId, setEditingId] = useState(null);
  const [exchangeRateForm, setExchangeRateForm] = useState({
    fromCurrencyId: '',
    toCurrencyId: '',
    rate: '',
    date: new Date().toISOString().split('T')[0]
  });

  // Currency form handling
  const handleCurrencySubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await updateCurrency(editingId, formData);
      } else {
        await addCurrency(formData);
      }
      resetCurrencyForm();
    } catch (error) {
      alert(`Error: ${error.message}`);
    }
  };

  const handleCurrencyEdit = (currency) => {
    setFormData(currency);
    setEditingId(currency.id);
    setShowForm(true);
  };

  const handleCurrencyDelete = async (currency) => {
    if (window.confirm(`Are you sure you want to delete ${currency.name}?`)) {
      try {
        await deleteCurrency(currency.id);
      } catch (error) {
        alert(`Error: ${error.message}`);
      }
    }
  };

  const resetCurrencyForm = () => {
    setFormData({});
    setEditingId(null);
    setShowForm(false);
  };

  // Exchange rate form handling
  const handleExchangeRateSubmit = async (e) => {
    e.preventDefault();
    try {
      const rate = parseFloat(exchangeRateForm.rate);
      if (isNaN(rate) || rate <= 0) {
        alert('Please enter a valid exchange rate');
        return;
      }

      await addExchangeRate({
        fromCurrencyId: exchangeRateForm.fromCurrencyId,
        toCurrencyId: exchangeRateForm.toCurrencyId,
        rate: rate,
        date: exchangeRateForm.date
      });
      
      resetExchangeRateForm();
      setShowExchangeRateForm(false);
    } catch (error) {
      alert(`Error: ${error.message}`);
    }
  };

  const resetExchangeRateForm = () => {
    setExchangeRateForm({
      fromCurrencyId: '',
      toCurrencyId: '',
      rate: '',
      date: new Date().toISOString().split('T')[0]
    });
  };

  // Base currency handling
  const handleBaseCurrencyChange = async (currencyId) => {
    try {
      await updateCurrencySettings({ baseCurrencyId: currencyId });
    } catch (error) {
      alert(`Error: ${error.message}`);
    }
  };

  const getBaseCurrency = () => {
    const settings = currencySettings.find(s => s.userId === 'default');
    return settings ? settings.baseCurrencyId : 'CUR_001';
  };

  const getCurrencyName = (currencyId) => {
    const currency = currencies.find(c => c.id === currencyId);
    return currency ? `${currency.symbol} ${currency.name}` : 'Unknown';
  };

  const getTotalPortfolioValue = () => {
    if (exchangeRateService && getAccountsWithTypes) {
      const accountsWithTypes = getAccountsWithTypes();
      return exchangeRateService.calculatePortfolioTotal(accountsWithTypes);
    }
    return 0;
  };

  const renderCurrenciesTab = () => (
    <div className="currencies-tab">
      <div className="section-header">
        <h3>{t('currencies')} ({currencies.length})</h3>
        <div className="section-actions">
          <button 
            onClick={() => setShowForm(!showForm)}
            className="btn-primary"
          >
            {showForm ? t('cancel') : t('addCurrency')}
          </button>
        </div>
      </div>

      {showForm && (
        <div className="form-container">
          <h4>{editingId ? t('edit') + ' ' + t('currency') : t('addCurrency')}</h4>
          <form onSubmit={handleCurrencySubmit} className="currency-form">
            <div className="form-grid">
              <div className="form-group">
                <label>{t('currencyCode')} *</label>
                <input
                  type="text"
                  value={formData.code || ''}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  placeholder="USD, EUR, BTC..."
                  maxLength={10}
                  required
                />
              </div>
              
              <div className="form-group">
                <label>{t('currencyName')} *</label>
                <input
                  type="text"
                  value={formData.name || ''}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="US Dollar, Euro, Bitcoin..."
                  required
                />
              </div>
              
              <div className="form-group">
                <label>{t('currencySymbol')} *</label>
                <input
                  type="text"
                  value={formData.symbol || ''}
                  onChange={(e) => setFormData({ ...formData, symbol: e.target.value })}
                  placeholder="$, €, ₿..."
                  maxLength={10}
                  required
                />
              </div>
              
              <div className="form-group">
                <label>{t('currencyType')}</label>
                <select
                  value={formData.type || 'fiat'}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                >
                  <option value="fiat">{t('fiat')}</option>
                  <option value="crypto">{t('crypto')}</option>
                </select>
              </div>
              
              <div className="form-group">
                <label>{t('decimalPlaces')}</label>
                <input
                  type="number"
                  value={formData.decimalPlaces || 2}
                  onChange={(e) => setFormData({ ...formData, decimalPlaces: parseInt(e.target.value) })}
                  min="0"
                  max="18"
                />
              </div>
              
              <div className="form-group">
                <label>
                  <input
                    type="checkbox"
                    checked={formData.isActive !== false}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  />
                  {t('isActive')}
                </label>
              </div>
            </div>
            
            <div className="form-actions">
              <button type="submit" className="btn-primary">
                {editingId ? t('updateCurrency') : t('addCurrency')}
              </button>
              <button type="button" onClick={resetCurrencyForm} className="btn-secondary">
                {t('cancel')}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="data-table">
        <table>
          <thead>
            <tr>
              <th>{t('currencyCode')}</th>
              <th>{t('name')}</th>
              <th>{t('currencySymbol')}</th>
              <th>{t('type')}</th>
              <th>{t('decimalPlaces')}</th>
              <th>Status</th>
              <th>{t('actions')}</th>
            </tr>
          </thead>
          <tbody>
            {currencies.map(currency => (
              <tr key={currency.id}>
                <td><strong>{currency.code}</strong></td>
                <td>{currency.name}</td>
                <td><span style={{fontSize: '1.2em'}}>{currency.symbol}</span></td>
                <td>
                  <span className={`badge ${currency.type === 'crypto' ? 'badge-crypto' : 'badge-fiat'}`}>
                    {currency.type === 'crypto' ? '₿ ' + t('crypto') : '💰 ' + t('fiat')}
                  </span>
                </td>
                <td>{currency.decimalPlaces}</td>
                <td>
                  <span className={`badge ${currency.isActive ? 'badge-active' : 'badge-inactive'}`}>
                    {currency.isActive ? t('isActive') : 'Inactive'}
                  </span>
                </td>
                <td className="actions-cell">
                  <div className="actions-dropdown">
                    <button className="btn-dropdown">⋮</button>
                    <div className="dropdown-menu">
                      <button 
                        onClick={() => handleCurrencyEdit(currency)}
                        className="dropdown-item"
                      >
                        ✏️ {t('edit')}
                      </button>
                      <button 
                        onClick={() => handleCurrencyDelete(currency)}
                        className="dropdown-item"
                      >
                        🗑️ {t('delete')}
                      </button>
                    </div>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderExchangeRatesTab = () => (
    <div className="exchange-rates-tab">
      <div className="section-header">
        <h3>{t('exchangeRates')} ({exchangeRates.length})</h3>
        <div className="section-actions">
          <button 
            onClick={() => {
              if (showExchangeRateForm) {
                resetExchangeRateForm();
              }
              setShowExchangeRateForm(!showExchangeRateForm);
            }}
            className="btn-primary"
          >
            {showExchangeRateForm ? t('cancel') : t('addExchangeRate')}
          </button>
        </div>
      </div>

      {showExchangeRateForm && (
        <div className="form-container">
        <h4>{t('addExchangeRate')}</h4>
        <form onSubmit={handleExchangeRateSubmit} className="exchange-rate-form">
          <div className="form-grid">
            <div className="form-group">
              <label>{t('fromCurrency')}</label>
              <select
                value={exchangeRateForm.fromCurrencyId}
                onChange={(e) => setExchangeRateForm({ ...exchangeRateForm, fromCurrencyId: e.target.value })}
                required
              >
                <option value="">{t('selectCurrency')}...</option>
                {getActiveCurrencies().map(currency => (
                  <option key={currency.id} value={currency.id}>
                    {currency.code} - {currency.name}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="form-group">
              <label>{t('toCurrency')}</label>
              <select
                value={exchangeRateForm.toCurrencyId}
                onChange={(e) => setExchangeRateForm({ ...exchangeRateForm, toCurrencyId: e.target.value })}
                required
              >
                <option value="">{t('selectCurrency')}...</option>
                {getActiveCurrencies().map(currency => (
                  <option key={currency.id} value={currency.id}>
                    {currency.code} - {currency.name}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="form-group">
              <label>{t('exchangeRate')}</label>
              <input
                type="number"
                step="any"
                value={exchangeRateForm.rate}
                onChange={(e) => setExchangeRateForm({ ...exchangeRateForm, rate: e.target.value })}
                placeholder="1.10"
                required
              />
            </div>
            
            <div className="form-group">
              <label>Date</label>
              <input
                type="date"
                value={exchangeRateForm.date}
                onChange={(e) => setExchangeRateForm({ ...exchangeRateForm, date: e.target.value })}
                required
              />
            </div>
          </div>
          
          <div className="form-actions">
            <button type="submit" className="btn-primary">
              {t('addExchangeRate')}
            </button>
          </div>
        </form>
        </div>
      )}

      <div className="data-table">
        <table>
          <thead>
            <tr>
              <th>{t('fromCurrency')}</th>
              <th>{t('toCurrency')}</th>
              <th>{t('rate')}</th>
              <th>Date</th>
              <th>{t('source')}</th>
            </tr>
          </thead>
          <tbody>
            {exchangeRates
              .sort((a, b) => new Date(b.date) - new Date(a.date))
              .map(rate => (
              <tr key={rate.id}>
                <td>{getCurrencyName(rate.fromCurrencyId)}</td>
                <td>{getCurrencyName(rate.toCurrencyId)}</td>
                <td><strong>{rate.rate}</strong></td>
                <td>{new Date(rate.date).toLocaleDateString()}</td>
                <td>
                  <span className={`badge ${rate.source === 'api' ? 'badge-api' : 'badge-manual'}`}>
                    {rate.source}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderSettingsTab = () => {
    const baseCurrencyId = getBaseCurrency();
    const baseCurrency = currencies.find(c => c.id === baseCurrencyId);

    return (
      <div className="settings-tab">
        <div className="section-header">
          <h3>{t('currencySettings')}</h3>
        </div>

        <div className="settings-container">
          <div className="setting-group">
            <h4>{t('baseCurrency')}</h4>
            <p>All portfolio totals and conversions will be displayed in this currency.</p>
            
            <div className="current-base">
              <label>Current {t('baseCurrency')}:</label>
              <span className="base-currency-display">
                {baseCurrency ? (
                  <span>
                    <span style={{fontSize: '1.2em', marginRight: '0.5rem'}}>{baseCurrency.symbol}</span>
                    {baseCurrency.name} ({baseCurrency.code})
                  </span>
                ) : (
                  t('notSet')
                )}
              </span>
            </div>

            <div className="form-group">
              <label>Change {t('baseCurrency')}:</label>
              <select
                value={baseCurrencyId}
                onChange={(e) => handleBaseCurrencyChange(e.target.value)}
                className="base-currency-select"
              >
                {getActiveCurrencies().map(currency => (
                  <option key={currency.id} value={currency.id}>
                    {currency.symbol} {currency.name} ({currency.code})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {exchangeRateService && (
            <div className="setting-group">
              <h4>{t('portfolioSummary')}</h4>
              <div className="portfolio-summary">
                <p>Portfolio value in base currency:</p>
                <div className="portfolio-total">
                  {baseCurrency && exchangeRateService.formatAmount(getTotalPortfolioValue(), baseCurrency.id)}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="currency-manager">
      <div className="page-header">
        <h2>{t('currencies')} Management</h2>
      </div>

      <div className="tab-navigation">
        <button 
          className={activeTab === 'currencies' ? 'tab-btn active' : 'tab-btn'}
          onClick={() => setActiveTab('currencies')}
        >
          💰 {t('currencies')}
        </button>
        <button 
          className={activeTab === 'rates' ? 'tab-btn active' : 'tab-btn'}
          onClick={() => setActiveTab('rates')}
        >
          📈 {t('exchangeRates')}
        </button>
        <button 
          className={activeTab === 'settings' ? 'tab-btn active' : 'tab-btn'}
          onClick={() => setActiveTab('settings')}
        >
          ⚙️ {t('currencySettings')}
        </button>
      </div>

      <div className="tab-content">
        {activeTab === 'currencies' && renderCurrenciesTab()}
        {activeTab === 'rates' && renderExchangeRatesTab()}
        {activeTab === 'settings' && renderSettingsTab()}
      </div>
    </div>
  );
};

export default CurrencyManager;