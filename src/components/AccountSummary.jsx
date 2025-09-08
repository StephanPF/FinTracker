import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useAccounting } from '../contexts/AccountingContext';
import { useLanguage } from '../contexts/LanguageContext';
import TransactionList from './TransactionList';

const AccountSummary = ({ onAccountClick }) => {
  const { accounts, tags, getSummary, getAccountsWithTypes, currencies, exchangeRateService, numberFormatService, updateAccount, addNetWorthSnapshot, getBaseCurrency: getBaseCurrencyFromContext } = useAccounting();
  const { t } = useLanguage();
  const summary = getSummary();
  const accountsWithTypes = getAccountsWithTypes();
  
  // State for currency display toggle
  const [showNativeCurrency, setShowNativeCurrency] = useState(false);
  
  // State for context menu and notes modal
  const [contextMenu, setContextMenu] = useState({ show: false, x: 0, y: 0, account: null, card: null });
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [accountNotes, setAccountNotes] = useState('');
  
  // State for net worth snapshot
  const [isSavingSnapshot, setIsSavingSnapshot] = useState(false);
  const contextMenuRef = useRef(null);

  const getAccountsByType = (type) => {
    return accountsWithTypes.filter(account => account.accountType && account.accountType.type === type);
  };

  const getNonRetirementAssetAccounts = () => {
    return accountsWithTypes.filter(account => 
      account.accountType && 
      account.accountType.type === 'Asset' && 
      account.accountType.subtype !== 'Retirement account' &&
      account.includeInOverview !== false
    );
  };

  const getIncludedAccountsByType = (type) => {
    return accountsWithTypes.filter(account => 
      account.accountType && 
      account.accountType.type === type &&
      account.includeInOverview !== false
    );
  };

  const getRetirementAccounts = () => {
    return accountsWithTypes.filter(account => 
      account.accountType && 
      account.accountType.type === 'Asset' && 
      account.accountType.subtype === 'Retirement account' &&
      account.includeInOverview !== false
    );
  };

  const getRetirementTotal = () => {
    const retirementAccounts = getRetirementAccounts();
    const baseCurrency = getBaseCurrency();
    let totalInBaseCurrency = 0;
    
    retirementAccounts.forEach(account => {
      const balance = account.balance || 0;
      
      if (exchangeRateService) {
        // Convert to base currency using exchange rate service
        const baseCurrencyAmount = exchangeRateService.convertToBaseCurrency(balance, account.currencyId);
        
        // Debug logging for currency conversion issues
        if (typeof process !== 'undefined' && process.env.NODE_ENV === 'development') {
          const rate = exchangeRateService.getExchangeRate(account.currencyId, baseCurrency?.id);
          console.log(`Retirement Account: ${account.name}`);
          console.log(`Amount: ${balance} ${currencies.find(c => c.id === account.currencyId)?.code}`);
          console.log(`Exchange Rate: ${rate}`);
          console.log(`Converted: ${baseCurrencyAmount} ${baseCurrency?.code}`);
        }
        
        totalInBaseCurrency += baseCurrencyAmount;
      } else {
        // Fallback: assume all amounts are already in base currency
        totalInBaseCurrency += balance;
      }
    });
    
    // Return as object with base currency ID for consistency with formatting
    const baseCurrencyId = baseCurrency?.id || 'CUR_001';
    return { [baseCurrencyId]: totalInBaseCurrency };
  };

  const getCurrencyBreakdown = () => {
    const breakdown = {};
    accountsWithTypes.forEach(account => {
      const currencyId = account.currencyId || 'CUR_001';
      const currency = currencies.find(c => c.id === currencyId);
      
      if (currency) {
        if (!breakdown[currencyId]) {
          breakdown[currencyId] = {
            currency: currency,
            totalValue: 0,
            accounts: []
          };
        }
        breakdown[currencyId].totalValue += account.balance || 0;
        breakdown[currencyId].accounts.push(account);
      }
    });
    return breakdown;
  };

  const getTotalPortfolioValue = () => {
    if (exchangeRateService) {
      return exchangeRateService.calculatePortfolioTotal(accountsWithTypes);
    }
    return summary.totalAssets + summary.totalLiabilities;
  };

  const getBaseCurrency = () => {
    if (exchangeRateService) {
      const baseCurrencyId = exchangeRateService.getBaseCurrencyId();
      return currencies.find(c => c.id === baseCurrencyId);
    }
    return currencies.find(c => c.code === 'EUR'); // fallback
  };

  const formatCurrencyAmount = (amount, currencyId = null) => {
    // If no currency specified, use base currency
    if (!currencyId) {
      const baseCurrency = getBaseCurrency();
      currencyId = baseCurrency ? baseCurrency.id : 'CUR_001';
    }

    // Use NumberFormatService if available
    if (numberFormatService) {
      return numberFormatService.formatCurrency(amount, currencyId);
    }
    
    // Fallback formatting
    const currency = currencies.find(c => c.id === currencyId);
    if (currency) {
      return `${currency.symbol}${amount.toFixed(currency.decimalPlaces || 2)}`;
    }
    
    return amount.toFixed(2);
  };

  // Calculate totals in base currency
  const getBaseCurrencyTotals = () => {
    const baseCurrency = getBaseCurrency();
    const baseCurrencyId = baseCurrency?.id || 'CUR_001';
    const totals = {
      assets: 0,
      liabilities: 0,
      netWorth: 0
    };

    // Group accounts by type and convert all to base currency
    accountsWithTypes.forEach(account => {
      // Only include accounts that are set to be included in overview
      if (account.includeInOverview === false) return;
      
      const balance = account.balance || 0;
      const accountType = account.accountType?.type;
      const accountSubtype = account.accountType?.subtype;
      
      let baseCurrencyAmount = balance;
      if (exchangeRateService) {
        baseCurrencyAmount = exchangeRateService.convertToBaseCurrency(balance, account.currencyId);
      }

      // Include retirement accounts in assets if toggle is enabled
      if (accountType === 'Asset' && 
          (accountSubtype !== 'Retirement account' || 
           (accountSubtype === 'Retirement account' && includeRetirementInAssets))) {
        totals.assets += baseCurrencyAmount;
      } else if (accountType === 'Liability') {
        totals.liabilities += Math.abs(baseCurrencyAmount);
      }
    });

    // Calculate net worth (Assets - Liabilities)
    totals.netWorth = totals.assets - totals.liabilities;

    // Return as currency objects for consistency
    return {
      assets: { [baseCurrencyId]: totals.assets },
      liabilities: { [baseCurrencyId]: totals.liabilities },
      netWorth: { [baseCurrencyId]: totals.netWorth }
    };
  };

  // Calculate totals by currency (native currency breakdown)
  const getNativeCurrencyTotals = () => {
    const totals = {
      assets: {},
      liabilities: {},
      netWorth: {}
    };

    // Group accounts by currency and type (excluding retirement accounts from assets total, respecting includeInOverview setting)
    accountsWithTypes.forEach(account => {
      // Only include accounts that are set to be included in overview
      if (account.includeInOverview === false) return;
      
      const currencyId = account.currencyId || 'CUR_001';
      const balance = account.balance || 0;
      const accountType = account.accountType?.type;
      const accountSubtype = account.accountType?.subtype;

      if (accountType === 'Asset' && accountSubtype !== 'Retirement account') {
        totals.assets[currencyId] = (totals.assets[currencyId] || 0) + balance;
      } else if (accountType === 'Liability') {
        totals.liabilities[currencyId] = (totals.liabilities[currencyId] || 0) + Math.abs(balance);
      }
    });

    // Calculate net worth per currency (Assets - Liabilities)
    const allCurrencies = new Set([
      ...Object.keys(totals.assets),
      ...Object.keys(totals.liabilities)
    ]);

    allCurrencies.forEach(currencyId => {
      const assets = totals.assets[currencyId] || 0;
      const liabilities = totals.liabilities[currencyId] || 0;
      totals.netWorth[currencyId] = assets - liabilities;
    });

    return totals;
  };

  // Format currency breakdown for display
  const formatCurrencyBreakdown = (amounts) => {
    return Object.entries(amounts)
      .filter(([currencyId, amount]) => Math.abs(amount) > 0.01) // Filter out near-zero amounts
      .map(([currencyId, amount]) => {
        const currency = currencies.find(c => c.id === currencyId);
        return {
          currencyId,
          currency,
          amount,
          formatted: formatCurrencyAmount(amount, currencyId)
        };
      })
      .sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount)); // Sort by absolute amount, largest first
  };

  // Helper function to display currency values with 0 fallback
  const displayCurrencyValues = (amounts) => {
    const breakdown = formatCurrencyBreakdown(amounts);
    if (breakdown.length === 0) {
      // Show 0 in base currency when no amounts
      const baseCurrency = getBaseCurrency();
      const baseCurrencyId = baseCurrency?.id || 'CUR_001';
      return (
        <div className="currency-value">
          <span className="amount">{formatCurrencyAmount(0, baseCurrencyId)}</span>
          <span className="currency-code">{baseCurrency?.code}</span>
        </div>
      );
    }
    return breakdown.map(({ currencyId, formatted, currency, amount }) => (
      <div key={currencyId} className={`currency-value ${amount < 0 ? 'negative' : 'positive'}`}>
        <span className="amount">{formatted}</span>
        <span className="currency-code">{currency?.code}</span>
      </div>
    ));
  };

  // Handle clicks outside context menu to close it
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(event.target)) {
        setContextMenu({ show: false, x: 0, y: 0, account: null, card: null });
      }
    };

    if (contextMenu.show) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [contextMenu.show]);

  // Handle card click to show context menu
  const handleCardClick = (event, cardType) => {
    event.preventDefault();
    event.stopPropagation();
    
    const x = event.clientX;
    const y = event.clientY;
    
    setContextMenu({
      show: true,
      x: x,
      y: y,
      account: null,
      card: cardType
    });
  };

  // Handle account click to show context menu
  const handleAccountClick = (event, account) => {
    event.preventDefault();
    event.stopPropagation();
    
    const x = event.clientX;
    const y = event.clientY;
    
    setContextMenu({
      show: true,
      x: x,
      y: y,
      account: account,
      card: null
    });
  };

  // Handle view transactions
  const handleViewTransactions = () => {
    if (contextMenu.account && onAccountClick) {
      onAccountClick(contextMenu.account.id);
    }
    setContextMenu({ show: false, x: 0, y: 0, account: null, card: null });
  };

  // Handle view notes
  const handleViewNotes = () => {
    setSelectedAccount(contextMenu.account);
    setAccountNotes(contextMenu.account.notes || '');
    setShowNotesModal(true);
    setContextMenu({ show: false, x: 0, y: 0, account: null, card: null });
  };

  // Handle save snapshot from context menu
  const handleSaveSnapshotFromMenu = async () => {
    setContextMenu({ show: false, x: 0, y: 0, account: null, card: null });
    await handleSaveSnapshot();
  };

  // Handle save notes
  const handleSaveNotes = async () => {
    try {
      await updateAccount(selectedAccount.id, {
        ...selectedAccount,
        notes: accountNotes
      });
      console.log(`Notes saved for account ${selectedAccount.name}:`, accountNotes);
      setShowNotesModal(false);
      setSelectedAccount(null);
      setAccountNotes('');
    } catch (error) {
      console.error('Error saving account notes:', error);
      alert('Failed to save notes. Please try again.');
    }
  };

  // Handle save net worth snapshot
  const handleSaveSnapshot = async () => {
    try {
      setIsSavingSnapshot(true);
      
      // Calculate current financial totals
      const baseCurrencyTotals = getBaseCurrencyTotals();
      const baseCurrency = getBaseCurrencyFromContext();
      const retirementTotal = getRetirementTotal();
      
      // Extract values from currency objects
      const baseCurrencyId = baseCurrency?.id || 'CUR_001';
      const totalAssets = baseCurrencyTotals.assets[baseCurrencyId] || 0;
      const totalLiabilities = baseCurrencyTotals.liabilities[baseCurrencyId] || 0;
      const netAssets = baseCurrencyTotals.netWorth[baseCurrencyId] || 0;
      const totalRetirement = retirementTotal[baseCurrencyId] || 0;
      
      // Create snapshot data
      const snapshotData = {
        snapshotDate: new Date().toISOString().split('T')[0], // Today's date in YYYY-MM-DD
        baseCurrencyId: baseCurrencyId,
        totalAssets: totalAssets,
        totalLiabilities: totalLiabilities,
        netAssets: netAssets,
        totalRetirement: totalRetirement,
        description: `Snapshot taken from Overview page`
      };
      
      await addNetWorthSnapshot(snapshotData);
      
      // Show success message
      alert(`📊 ${t('snapshotSaved') || 'Net Worth Snapshot saved successfully!'}`);
      console.log('Net worth snapshot saved:', snapshotData);
      
    } catch (error) {
      console.error('Error saving net worth snapshot:', error);
      alert('Failed to save net worth snapshot. Please try again.');
    } finally {
      setIsSavingSnapshot(false);
    }
  };

  const [includeRetirementInAssets, setIncludeRetirementInAssets] = useState(false);
  const baseCurrencyTotals = getBaseCurrencyTotals();

  return (
    <div className="account-summary">
      {/* Top Summary Cards - Base Currency Totals */}
      <div className="summary-cards">
        <div 
          className="summary-card assets clickable" 
          onClick={(e) => handleCardClick(e, 'assets')}
          style={{ cursor: 'pointer' }}
          title="Click for options"
        >
          <div className="card-header">
            <h3>💰 {t('totalAssets')}</h3>
            <span className="card-icon">📈</span>
          </div>
          <div className="card-values">
            {displayCurrencyValues(baseCurrencyTotals.assets)}
          </div>
          <div className="card-subtitle">{getNonRetirementAssetAccounts().length} {t('accountsCount')}</div>
        </div>

        <div 
          className="summary-card liabilities clickable" 
          onClick={(e) => handleCardClick(e, 'liabilities')}
          style={{ cursor: 'pointer' }}
          title="Click for options"
        >
          <div className="card-header">
            <h3>📋 {t('totalLiabilities')}</h3>
            <span className="card-icon">📊</span>
          </div>
          <div className="card-values">
            {displayCurrencyValues(baseCurrencyTotals.liabilities)}
          </div>
          <div className="card-subtitle">{getIncludedAccountsByType('Liability').length} {t('accountsCount')}</div>
        </div>

        <div 
          className="summary-card net-worth clickable" 
          onClick={(e) => handleCardClick(e, 'net-worth')}
          style={{ cursor: 'pointer' }}
          title="Click for options"
        >
          <div className="card-header">
            <h3>💎 Net Worth</h3>
            <span className="card-icon">🎯</span>
          </div>
          <div className="card-values">
            {displayCurrencyValues(baseCurrencyTotals.netWorth)}
          </div>
          <div className="card-subtitle">Assets - Liabilities</div>
        </div>

        <div 
          className="summary-card retirement clickable" 
          onClick={(e) => handleCardClick(e, 'retirement')}
          style={{ cursor: 'pointer' }}
          title="Click for options"
        >
          <div className="card-header">
            <h3>🏦 {t('retirement')}</h3>
            <span className="card-icon">📈</span>
          </div>
          <div className="card-values">
            {(() => {
              const retirementTotal = getRetirementTotal();
              const baseCurrency = getBaseCurrency();
              const baseCurrencyId = baseCurrency?.id || 'CUR_001';
              const totalAmount = retirementTotal[baseCurrencyId] || 0;
              
              return (
                <div className="currency-value">
                  <span className="amount">{formatCurrencyAmount(totalAmount, baseCurrencyId)}</span>
                  <span className="currency-code">{baseCurrency?.code}</span>
                </div>
              );
            })()}
          </div>
          <div className="card-subtitle-with-toggle">
            <span className="card-subtitle">{getRetirementAccounts().length} retirement {getRetirementAccounts().length === 1 ? 'account' : 'accounts'}</span>
            <div className="card-toggle-control">
              <button
                className={`mini-toggle ${includeRetirementInAssets ? 'enabled' : 'disabled'}`}
                onClick={(e) => {
                  e.stopPropagation(); // Prevent card click when clicking toggle
                  setIncludeRetirementInAssets(!includeRetirementInAssets);
                }}
                title={`${includeRetirementInAssets ? 'Remove from' : 'Add to'} Total Assets`}
              >
                {includeRetirementInAssets ? '- Exclude' : '+ Include'}
              </button>
            </div>
          </div>
        </div>
      </div>


      {/* Accounts List with Currency Toggle */}
      <div className="accounts-section">
        <div className="section-header">
          <h3>📋 {t('accountBalances')}</h3>
          <div className="currency-toggle">
            <button 
              className={`toggle-btn ${showNativeCurrency ? 'active' : ''}`}
              onClick={() => setShowNativeCurrency(true)}
            >
              Native Currency
            </button>
            <button 
              className={`toggle-btn ${!showNativeCurrency ? 'active' : ''}`}
              onClick={() => setShowNativeCurrency(false)}
            >
              Base Currency
            </button>
          </div>
        </div>
        
        <div className="accounts-grid">
          {accountsWithTypes
            .filter(account => account.isActive && account.includeInOverview !== false)
            // Use the custom order from Account Management (already sorted by getAccountsWithTypes)
            .map(account => {
              const displayBalance = showNativeCurrency 
                ? formatCurrencyAmount(account.balance, account.currencyId)
                : (exchangeRateService 
                    ? exchangeRateService.formatAmount(
                        exchangeRateService.convertToBaseCurrency(account.balance || 0, account.currencyId),
                        getBaseCurrency()?.id
                      )
                    : formatCurrencyAmount(account.balance, getBaseCurrency()?.id));
              
              return (
                <div 
                  key={account.id} 
                  className={`account-item ${account.accountType ? account.accountType.type.toLowerCase() : 'unknown'} ${account.accountType?.subtype === 'Retirement account' ? 'retirement' : ''} ${account.accountType?.subtype === 'Business account' ? 'business' : ''} clickable`}
                  onClick={(e) => handleAccountClick(e, account)}
                  style={{ cursor: 'pointer' }}
                  title={`Click for options: ${account.name}`}
                >
                  <div className="account-info">
                    <span className="account-name">{account.name}</span>
                    <span className="account-type">
                      {account.accountType ? account.accountType.type : 'Unknown'} 
                      {account.accountType && account.accountType.subtype && ` - ${account.accountType.subtype}`}
                    </span>
                    {showNativeCurrency && account.currencyId !== getBaseCurrency()?.id && (
                      <span className="account-currency">
                        {currencies.find(c => c.id === account.currencyId)?.code || 'Unknown'}
                      </span>
                    )}
                  </div>
                  <div className="account-balance">
                    {displayBalance}
                    {!showNativeCurrency && account.currencyId !== getBaseCurrency()?.id && (
                      <div className="native-balance">
                        ({formatCurrencyAmount(account.balance, account.currencyId)})
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
        </div>
      </div>

      {/* Recent Transactions Section */}
      <div className="recent-transactions-section">
        <div className="section-header">
          <h3>📋 {t('recentTransactions')}</h3>
          <span className="section-subtitle">Last 5 transactions</span>
        </div>
        <TransactionList limit={5} />
      </div>

      {/* Context Menu */}
      {contextMenu.show && createPortal(
        <div 
          ref={contextMenuRef}
          className="account-context-menu"
          style={{
            position: 'fixed',
            top: contextMenu.y + 'px',
            left: contextMenu.x + 'px',
            backgroundColor: 'white',
            color: '#1a202c',
            border: '1px solid #d1d5db',
            borderRadius: '8px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            zIndex: 1000,
            minWidth: '160px',
            padding: '4px'
          }}
        >
          {/* Account-specific menu items */}
          {contextMenu.account && (
            <>
              <button 
                className="context-menu-item"
                onClick={handleViewTransactions}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  margin: '0',
                  border: 'none',
                  backgroundColor: 'white',
                  color: '#1a202c',
                  textAlign: 'left',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  borderRadius: '6px',
                  transition: 'background-color 0.15s ease'
                }}
                onMouseEnter={(e) => e.target.style.backgroundColor = '#f3f4f6'}
                onMouseLeave={(e) => e.target.style.backgroundColor = 'white'}
              >
                📋 {t('viewTransactions') || 'View Transactions'}
              </button>
              <button 
                className="context-menu-item"
                onClick={handleViewNotes}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  margin: '0',
                  border: 'none',
                  backgroundColor: 'white',
                  color: '#1a202c',
                  textAlign: 'left',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  borderRadius: '6px',
                  transition: 'background-color 0.15s ease'
                }}
                onMouseEnter={(e) => e.target.style.backgroundColor = '#f3f4f6'}
                onMouseLeave={(e) => e.target.style.backgroundColor = 'white'}
              >
                📝 {t('viewNotes') || 'View Notes'}
              </button>
            </>
          )}
          
          {/* Card-specific menu items */}
          {contextMenu.card && (
            <button 
              className="context-menu-item"
              onClick={handleSaveSnapshotFromMenu}
              disabled={isSavingSnapshot}
              style={{
                width: '100%',
                padding: '8px 12px',
                margin: '0',
                border: 'none',
                backgroundColor: isSavingSnapshot ? '#f3f4f6' : 'white',
                color: isSavingSnapshot ? '#9CA3AF' : '#1a202c',
                textAlign: 'left',
                cursor: isSavingSnapshot ? 'not-allowed' : 'pointer',
                fontSize: '0.875rem',
                borderRadius: '6px',
                transition: 'background-color 0.15s ease'
              }}
              onMouseEnter={(e) => {
                if (!isSavingSnapshot) {
                  e.target.style.backgroundColor = '#f3f4f6';
                }
              }}
              onMouseLeave={(e) => {
                if (!isSavingSnapshot) {
                  e.target.style.backgroundColor = 'white';
                }
              }}
            >
              📊 {isSavingSnapshot ? t('saving') || 'Saving...' : t('saveSnapshot') || 'Save Snapshot'}
            </button>
          )}
        </div>,
        document.body
      )}

      {/* Notes Modal */}
      {showNotesModal && selectedAccount && createPortal(
        <div className="modal-overlay" style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div className="modal-content" style={{
            backgroundColor: 'white',
            color: '#1a202c',
            borderRadius: '12px',
            padding: '12px',
            maxWidth: '500px',
            width: '90%',
            maxHeight: '70vh',
            overflow: 'auto',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
          }}>
            <div className="modal-header" style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '12px',
              borderBottom: '1px solid #d1d5db',
              paddingBottom: '12px'
            }}>
              <h3 style={{ margin: 0, color: '#1a202c', fontSize: '1.125rem' }}>
                📝 Notes for {selectedAccount.name}
              </h3>
              <button 
                onClick={() => setShowNotesModal(false)}
                style={{
                  backgroundColor: 'white',
                  color: '#1a202c',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '16px',
                  cursor: 'pointer',
                  padding: '4px 8px',
                  lineHeight: '1'
                }}
              >
                ×
              </button>
            </div>
            
            <div className="modal-body" style={{ marginBottom: '12px' }}>
              <textarea
                value={accountNotes}
                onChange={(e) => setAccountNotes(e.target.value)}
                placeholder={`Add notes about ${selectedAccount.name}...`}
                style={{
                  width: '100%',
                  minHeight: '150px',
                  padding: '8px',
                  margin: '0',
                  backgroundColor: 'white',
                  color: '#1a202c',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '0.875rem',
                  fontFamily: 'inherit',
                  resize: 'vertical',
                  boxSizing: 'border-box'
                }}
              />
            </div>
            
            <div className="modal-footer" style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '8px',
              marginTop: '0',
              paddingTop: '12px',
              borderTop: '1px solid #d1d5db'
            }}>
              <button 
                onClick={() => setShowNotesModal(false)}
                style={{
                  padding: '0.75rem',
                  border: '1px solid #d1d5db',
                  backgroundColor: 'white',
                  color: '#1a202c',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '0.9rem'
                }}
              >
                {t('cancel') || 'Cancel'}
              </button>
              <button 
                onClick={handleSaveNotes}
                style={{
                  padding: '0.75rem',
                  border: 'none',
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '0.9rem'
                }}
              >
                {t('save') || 'Save'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default AccountSummary;