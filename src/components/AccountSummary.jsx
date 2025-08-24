import React, { useState } from 'react';
import { useAccounting } from '../contexts/AccountingContext';
import { useLanguage } from '../contexts/LanguageContext';
import TransactionList from './TransactionList';

const AccountSummary = () => {
  const { accounts, customers, vendors, tags, getSummary, getAccountsWithTypes, currencies, exchangeRateService, numberFormatService } = useAccounting();
  const { t } = useLanguage();
  const summary = getSummary();
  const accountsWithTypes = getAccountsWithTypes();
  
  // State for currency display toggle
  const [showNativeCurrency, setShowNativeCurrency] = useState(true);

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

  const [includeRetirementInAssets, setIncludeRetirementInAssets] = useState(false);
  const baseCurrencyTotals = getBaseCurrencyTotals();

  return (
    <div className="account-summary">
      {/* Top Summary Cards - Base Currency Totals */}
      <div className="summary-cards">
        <div className="summary-card assets">
          <div className="card-header">
            <h3>💰 {t('totalAssets')}</h3>
            <span className="card-icon">📈</span>
          </div>
          <div className="card-values">
            {displayCurrencyValues(baseCurrencyTotals.assets)}
          </div>
          <div className="card-subtitle">{getNonRetirementAssetAccounts().length} {t('accountsCount')}</div>
        </div>

        <div className="summary-card liabilities">
          <div className="card-header">
            <h3>📋 {t('totalLiabilities')}</h3>
            <span className="card-icon">📊</span>
          </div>
          <div className="card-values">
            {displayCurrencyValues(baseCurrencyTotals.liabilities)}
          </div>
          <div className="card-subtitle">{getIncludedAccountsByType('Liability').length} {t('accountsCount')}</div>
        </div>

        <div className="summary-card net-worth">
          <div className="card-header">
            <h3>💎 Net Worth</h3>
            <span className="card-icon">🎯</span>
          </div>
          <div className="card-values">
            {displayCurrencyValues(baseCurrencyTotals.netWorth)}
          </div>
          <div className="card-subtitle">Assets - Liabilities</div>
        </div>

        <div className="summary-card retirement">
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
                onClick={() => setIncludeRetirementInAssets(!includeRetirementInAssets)}
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
                <div key={account.id} className={`account-item ${account.accountType ? account.accountType.type.toLowerCase() : 'unknown'} ${account.accountType?.subtype === 'Retirement account' ? 'retirement' : ''}`}>
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
    </div>
  );
};

export default AccountSummary;