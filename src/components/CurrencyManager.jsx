import React, { useState, useEffect } from 'react';
import { useAccounting } from '../contexts/AccountingContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useDate } from '../hooks/useDate';

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
    getAccountsWithTypes,
    // API Management
    apiSettings,
    updateApiSettings,
    getApiUsage,
    refreshExchangeRates,
    getRatesFreshness,
    getApiStatus,
    saveExchangeRatesToFile,
  } = useAccounting();
  
  const { t } = useLanguage();
  const { formatDate } = useDate();
  
  const [activeTab, setActiveTab] = useState('currencies');
  const [showForm, setShowForm] = useState(false);
  const [showExchangeRateForm, setShowExchangeRateForm] = useState(false);
  const [formData, setFormData] = useState({});
  const [editingId, setEditingId] = useState(null);
  const [apiFormData, setApiFormData] = useState({});
  const [isUpdatingRates, setIsUpdatingRates] = useState(false);
  const [rateUpdateStatus, setRateUpdateStatus] = useState(null);
  const [openDropdownId, setOpenDropdownId] = useState(null);
  const [dropdownUp, setDropdownUp] = useState(false);

  // Initialize API form data from current settings
  useEffect(() => {
    const currentApiSettings = apiSettings[0];
    if (Object.keys(apiFormData).length === 0) {
      if (currentApiSettings) {
        setApiFormData(currentApiSettings);
      } else {
        // Set default values if no settings exist
        setApiFormData({
          provider: 'Currency-API (GitHub)',
          apiKey: '', // Not needed but kept for compatibility
          isActive: true, // Always active since it's free
          autoUpdate: false,
          frequency: 'manual',
          baseCurrency: 'EUR'
        });
      }
    }
  }, [apiSettings, apiFormData]);

  // Handle clicks outside dropdown to close it
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.actions-dropdown')) {
        setOpenDropdownId(null);
      }
    };

    if (openDropdownId) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [openDropdownId]);

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

  const handleDropdownClick = (e, currencyId) => {
    console.log('🔍 CURRENCY DROPDOWN CLICK:', { currencyId, currentOpenId: openDropdownId });
    e.stopPropagation();
    
    if (openDropdownId === currencyId) {
      setOpenDropdownId(null);
      return;
    }
    
    const button = e.target;
    const rect = button.getBoundingClientRect();
    const dropdownHeight = 80; // Approximate height for 2 items
    
    // Check if dropdown would go off-screen if placed below
    const spaceBelow = window.innerHeight - rect.bottom;
    const shouldFlipUp = spaceBelow < dropdownHeight;
    
    setDropdownUp(shouldFlipUp);
    setOpenDropdownId(currencyId);
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
      
      // Automatically refresh exchange rates for the new base currency
      console.log('🔄 Base currency changed, refreshing exchange rates...');
      setIsUpdatingRates(true);
      setRateUpdateStatus({ type: 'info', message: 'Refreshing rates for new base currency...' });
      
      try {
        const result = await refreshExchangeRates();
        if (result.success) {
          setRateUpdateStatus({ 
            type: 'success', 
            message: `Updated ${result.ratesCount} rates for new base currency and saved to Excel!` 
          });
        } else {
          setRateUpdateStatus({ 
            type: 'error', 
            message: `Failed to update rates: ${result.error}` 
          });
        }
      } catch (refreshError) {
        setRateUpdateStatus({ 
          type: 'error', 
          message: `Error refreshing rates: ${refreshError.message}` 
        });
      } finally {
        setIsUpdatingRates(false);
        setTimeout(() => setRateUpdateStatus(null), 5000);
      }
    } catch (error) {
      alert(`Error: ${error.message}`);
    }
  };

  // API Settings Management
  const handleApiSettingsSubmit = async (e) => {
    e.preventDefault();
    try {
      // Ensure we have the minimum required fields
      const settingsToSave = {
        provider: 'Currency-API (GitHub)',
        apiKey: '', // Not needed for ExchangeRate.host
        isActive: true, // Always active since it's free
        autoUpdate: apiFormData.autoUpdate || false,
        frequency: apiFormData.frequency || 'manual',
        baseCurrency: apiFormData.baseCurrency || 'EUR',
        ...apiFormData
      };
      
      await updateApiSettings(settingsToSave);
      setRateUpdateStatus({ type: 'success', message: 'API settings saved successfully!' });
    } catch (error) {
      setRateUpdateStatus({ type: 'error', message: `Error: ${error.message}` });
      console.error('API Settings Error:', error);
    }
  };

  const handleRefreshRates = async () => {
    setIsUpdatingRates(true);
    setRateUpdateStatus(null);
    try {
      const result = await refreshExchangeRates();
      if (result.success) {
        setRateUpdateStatus({ 
          type: 'success', 
          message: `Successfully updated ${result.ratesCount} rates and saved to Excel!` 
        });
      } else {
        setRateUpdateStatus({ 
          type: 'error', 
          message: `Failed to update rates: ${result.error}` 
        });
      }
    } catch (error) {
      setRateUpdateStatus({ 
        type: 'error', 
        message: `Error refreshing rates: ${error.message}` 
      });
    } finally {
      setIsUpdatingRates(false);
      // Clear status after 5 seconds
      setTimeout(() => setRateUpdateStatus(null), 5000);
    }
  };


  const formatTimeAgo = (timestamp) => {
    if (!timestamp) return 'Never';
    const now = new Date();
    const time = new Date(timestamp);
    const diffMs = now - time;
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    
    if (diffHours > 24) {
      return `${Math.floor(diffHours / 24)} days ago`;
    } else if (diffHours > 0) {
      return `${diffHours} hours ago`;
    } else if (diffMinutes > 0) {
      return `${diffMinutes} minutes ago`;
    } else {
      return 'Just now';
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
      </div>

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
                    <button 
                      onClick={(e) => handleDropdownClick(e, currency.id)}
                      className="btn-dropdown"
                      title="More actions"
                    >
                      ⋮
                    </button>
                    {openDropdownId === currency.id && (
                      <div className={`dropdown-menu ${dropdownUp ? 'dropdown-up' : ''}`}>
                        <button 
                          onClick={() => {
                            handleCurrencyEdit(currency);
                            setOpenDropdownId(null);
                          }}
                          className="dropdown-item"
                        >
                          ✏️ {t('edit')}
                        </button>
                        {/* Only show delete button if not protected currency */}
                        {(() => {
                          const protectedCurrencies = ['CUR_001', 'CUR_002', 'CUR_003', 'CUR_004', 'CUR_005', 'CUR_006', 'CUR_007', 'CUR_008']; // EUR, USD, AED, GBP, AUD, BTC, ETH, CHF
                          const isProtected = protectedCurrencies.includes(currency.id);
                          
                          console.log('🔍 CURRENCY PROTECTION DEBUG:', {
                            currencyId: currency.id,
                            currencyCode: currency.code,
                            isProtected,
                            protectedList: protectedCurrencies
                          });
                          
                          if (!isProtected) {
                            return (
                              <button 
                                onClick={() => {
                                  handleCurrencyDelete(currency);
                                  setOpenDropdownId(null);
                                }}
                                className="dropdown-item"
                              >
                                🗑️ {t('delete')}
                              </button>
                            );
                          }
                          return null;
                        })()}
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const getUniqueExchangeRates = () => {
    const activeCurrencies = getActiveCurrencies();
    const baseCurrencyId = getBaseCurrency();
    const baseCurrency = currencies.find(c => c.id === baseCurrencyId);
    
    if (!baseCurrency || activeCurrencies.length === 0) return [];
    
    const uniqueRates = [];
    const seenPairs = new Set();
    
    // Generate all possible currency pairs: other currencies → base currency
    activeCurrencies.forEach(currency => {
      if (currency.id === baseCurrencyId) return; // Skip base currency to itself
      
      const pairKey = `${currency.id}-${baseCurrencyId}`;
      if (seenPairs.has(pairKey)) return;
      seenPairs.add(pairKey);
      
      // Check for reverse API rate first (base → currency) since API rates are stored that way
      const reverseApiRates = exchangeRates
        .filter(rate => 
          rate.fromCurrencyId === baseCurrencyId && 
          rate.toCurrencyId === currency.id &&
          (rate.source === 'api' || rate.source === 'crypto-api')
        )
        .sort((a, b) => {
          const sourceOrder = { 'api': 0, 'crypto-api': 1 };
          const aOrder = sourceOrder[a.source] || 999;
          const bOrder = sourceOrder[b.source] || 999;
          
          if (aOrder !== bOrder) {
            return aOrder - bOrder;
          }
          return new Date(b.timestamp || b.date) - new Date(a.timestamp || a.date);
        });

      // If we have API rates in reverse direction, use them (prioritize API over manual)
      if (reverseApiRates.length > 0 && reverseApiRates[0].rate > 0) {
        const reverseRate = reverseApiRates[0];
        uniqueRates.push({
          ...reverseRate,
          id: `inverse-${reverseRate.id}`,
          fromCurrencyId: currency.id,
          toCurrencyId: baseCurrencyId,
          rate: 1 / reverseRate.rate,
          source: reverseRate.source + '-inverse'
        });
      } else {
        // Look for direct rates (currency → base) - this would include manual rates
        const directRates = exchangeRates
          .filter(rate => 
            rate.fromCurrencyId === currency.id && 
            rate.toCurrencyId === baseCurrencyId
          )
          .sort((a, b) => {
            // Even here, prioritize API over manual
            const sourceOrder = { 'api': 0, 'crypto-api': 1, 'manual': 999 };
            const aOrder = sourceOrder[a.source] || 999;
            const bOrder = sourceOrder[b.source] || 999;
            
            if (aOrder !== bOrder) {
              return aOrder - bOrder;
            }
            return new Date(b.timestamp || b.date) - new Date(a.timestamp || a.date);
          });
        
        if (directRates.length > 0) {
          uniqueRates.push(directRates[0]);
        } else {
          // No rates available at all
          uniqueRates.push({
            id: `missing-${currency.id}-${baseCurrencyId}`,
            fromCurrencyId: currency.id,
            toCurrencyId: baseCurrencyId,
            rate: null,
            date: null,
            source: 'missing',
            timestamp: null
          });
        }
      }
    });
    
    return uniqueRates;
  };

  const renderExchangeRatesTab = () => {
    const uniqueRates = getUniqueExchangeRates();
    const availableRatesCount = uniqueRates.filter(r => r.source !== 'missing').length;
    
    
    return (
    <div className="exchange-rates-tab">
      <div className="section-header">
        <h3>{t('exchangeRates')} ({availableRatesCount}/{uniqueRates.length})</h3>
        <div className="section-actions">
          <button 
            onClick={handleRefreshRates}
            disabled={isUpdatingRates}
            className="btn-secondary"
          >
            {isUpdatingRates ? '🔄 Updating...' : '🔄 Refresh All Rates'}
          </button>
        </div>
      </div>


      {/* Rate Status Indicators */}
      <div className="rates-status">
        {(() => {
          const freshness = getRatesFreshness();
          const statusIcon = {
            'fresh': '🟢',
            'recent': '🟡', 
            'stale': '🔴',
            'no-api-rates': '⚪'
          }[freshness.status];
          return (
            <span className={`status-indicator ${freshness.status}`}>
              {statusIcon} {freshness.message}
            </span>
          );
        })()}
        {getApiStatus().lastUpdate && (
          <span className="last-update">
            Last updated: {formatTimeAgo(getApiStatus().lastUpdate)}
          </span>
        )}
      </div>

      {/* Update Status Messages */}
      {rateUpdateStatus && (
        <div className={`update-status ${rateUpdateStatus.type}`}>
          {rateUpdateStatus.type === 'success' ? '✅' : '⚠️'} {rateUpdateStatus.message}
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
              <th>Status</th>
              <th>Age</th>
            </tr>
          </thead>
          <tbody>
            {uniqueRates.map(rate => (
              <tr key={rate.id} className={
                rate.source === 'missing' ? 'missing-rate' : 
                rate.source === 'api' ? 'api-rate' : 
                rate.source === 'crypto-api' ? 'crypto-rate' : 'manual-rate'
              }>
                <td>{getCurrencyName(rate.fromCurrencyId)}</td>
                <td>{getCurrencyName(rate.toCurrencyId)}</td>
                <td>
                  {rate.rate ? (
                    <strong>{rate.rate}</strong>
                  ) : (
                    <span className="missing-rate-text">Not Available</span>
                  )}
                </td>
                <td>
                  {rate.date ? formatDate(rate.date) : '-'}
                </td>
                <td>
                  {rate.source === 'missing' ? (
                    <span className="badge badge-missing">❌ Missing</span>
                  ) : (
                    <span className={`badge ${
                      rate.source === 'api' || rate.source === 'api-inverse' ? 'badge-api' : 
                      rate.source === 'crypto-api' || rate.source === 'crypto-api-inverse' ? 'badge-crypto' : 'badge-manual'
                    }`}>
                      {(rate.source === 'api' || rate.source === 'api-inverse') ? '📡 Live' : 
                       (rate.source === 'crypto-api' || rate.source === 'crypto-api-inverse') ? '🪙 Crypto' : '✏️ Manual'}
                    </span>
                  )}
                </td>
                <td>
                  {rate.source === 'missing' ? (
                    <span className="missing-age">-</span>
                  ) : (
                    <span className="rate-age">
                      {rate.timestamp ? formatTimeAgo(rate.timestamp) : formatTimeAgo(rate.date)}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
    );
  };

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

          {/* API Settings Section */}
          <div className="setting-group">
            <h4>📡 Live Exchange Rates API</h4>
            <p>Configure automatic exchange rate updates from Currency-API (completely free!)</p>
            
            <form onSubmit={handleApiSettingsSubmit}>
                  <div className="form-grid">
                    <div className="form-group">
                      <label>📡 Free Forex API Provider</label>
                      <div className="provider-info">
                        <strong>Currency-API (GitHub)</strong> - No API key required!
                        <br />
                        <small>✅ Completely free • ✅ 200+ currencies • ✅ No rate limits • ✅ CORS enabled</small>
                      </div>
                    </div>

                    <div className="form-group">
                      <label>
                        <input
                          type="checkbox"
                          checked={apiFormData.autoUpdate || false}
                          onChange={(e) => setApiFormData({...apiFormData, autoUpdate: e.target.checked})}
                        />
                        Enable automatic rate updates
                      </label>
                    </div>

                    <div className="form-group">
                      <label>Update Frequency</label>
                      <select
                        value={apiFormData.frequency || 'manual'}
                        onChange={(e) => setApiFormData({...apiFormData, frequency: e.target.value})}
                        disabled={!apiFormData.autoUpdate}
                      >
                        <option value="manual">Manual only</option>
                        <option value="hourly">Every hour</option>
                        <option value="daily">Daily</option>
                      </select>
                    </div>
                  </div>

                  <div className="form-actions">
                    <button type="submit" className="btn-primary">
                      💾 Save API Settings
                    </button>
                  </div>
            </form>

            {/* API Status Display */}
            <div className="api-status">
              <div className="status-grid">
                <div className="status-item">
                  <strong>API Provider:</strong>
                  <span className="status-good">
                    ✅ Currency-API (GitHub)
                  </span>
                </div>
                <div className="status-item">
                  <strong>Automatic Updates:</strong>
                  <span className={getApiStatus().isScheduled ? 'status-good' : 'status-neutral'}>
                    {getApiStatus().isScheduled ? '✅ Scheduled' : '⏸️ Inactive'}
                  </span>
                </div>
                {getApiStatus().lastAttemptResult && (
                  <div className="status-item">
                    <strong>Last Attempt:</strong>
                    <span className={getApiStatus().lastAttemptResult.success ? 'status-good' : 'status-error'}>
                      {getApiStatus().lastAttemptResult.success ? (
                        `✅ Success (${getApiStatus().lastAttemptResult.ratesCount || 0} rates)`
                      ) : getApiStatus().lastAttemptResult.status === 'retrying' ? (
                        `🔄 Retrying (${getApiStatus().lastAttemptResult.retryCount}/3)...`
                      ) : getApiStatus().lastAttemptResult.status === 'attempting' ? (
                        '🔄 Attempting...'
                      ) : (
                        `❌ Failed: ${getApiStatus().lastAttemptResult.error || 'Unknown error'}`
                      )}
                      {getApiStatus().lastAttemptResult.retryCount > 0 && getApiStatus().lastAttemptResult.success && (
                        ` (after ${getApiStatus().lastAttemptResult.retryCount} retries)`
                      )}
                    </span>
                  </div>
                )}
                <div className="status-item">
                  <strong>Rate Limits:</strong>
                  <span className="status-good">
                    ♾️ Unlimited (Free)
                  </span>
                </div>
                {getApiStatus().lastUpdate && (
                  <div className="status-item">
                    <strong>Last Update:</strong>
                    <span>{formatTimeAgo(getApiStatus().lastUpdate)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

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