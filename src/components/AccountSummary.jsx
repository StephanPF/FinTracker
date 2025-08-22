import React from 'react';
import { useAccounting } from '../contexts/AccountingContext';
import { useLanguage } from '../contexts/LanguageContext';

const AccountSummary = () => {
  const { accounts, customers, vendors, tags, getSummary, getAccountsWithTypes, currencies, exchangeRateService } = useAccounting();
  const { t, formatCurrency } = useLanguage();
  const summary = getSummary();
  const accountsWithTypes = getAccountsWithTypes();

  const getAccountsByType = (type) => {
    return accountsWithTypes.filter(account => account.accountType && account.accountType.type === type);
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

  return (
    <div className="account-summary">
      <div className="summary-cards">
        <div className="summary-card assets">
          <div className="card-header">
            <h3>💰 {t('totalAssets')}</h3>
            <span className="card-icon">📈</span>
          </div>
          <div className="card-value">{formatCurrency(summary.totalAssets)}</div>
          <div className="card-subtitle">{getAccountsByType('Asset').length} {t('accountsCount')}</div>
        </div>

        <div className="summary-card liabilities">
          <div className="card-header">
            <h3>📋 {t('totalLiabilities')}</h3>
            <span className="card-icon">📊</span>
          </div>
          <div className="card-value">{formatCurrency(summary.totalLiabilities)}</div>
          <div className="card-subtitle">{getAccountsByType('Liability').length} {t('accountsCount')}</div>
        </div>

        <div className="summary-card income">
          <div className="card-header">
            <h3>💵 {t('totalIncome')}</h3>
            <span className="card-icon">📊</span>
          </div>
          <div className="card-value">{formatCurrency(summary.totalIncome)}</div>
          <div className="card-subtitle">{getAccountsByType('Income').length} {t('accountsCount')}</div>
        </div>

        <div className="summary-card expenses">
          <div className="card-header">
            <h3>💸 {t('totalExpenses')}</h3>
            <span className="card-icon">📉</span>
          </div>
          <div className="card-value">{formatCurrency(summary.totalExpenses)}</div>
          <div className="card-subtitle">{getAccountsByType('Expense').length} {t('accountsCount')}</div>
        </div>

        <div className="summary-card net">
          <div className="card-header">
            <h3>💼 {t('netIncome')}</h3>
            <span className="card-icon">🎯</span>
          </div>
          <div className="card-value">
            {formatCurrency(summary.totalIncome - summary.totalExpenses)}
          </div>
          <div className="card-subtitle">{summary.transactionsCount} {t('transactionsCount')}</div>
        </div>
      </div>

      {/* Multi-Currency Portfolio Summary */}
      {exchangeRateService && (
        <div className="portfolio-summary-card">
          <div className="card-header">
            <h3>🌍 {t('portfolioSummary')}</h3>
            <span className="card-icon">💱</span>
          </div>
          <div className="portfolio-total">
            <span className="portfolio-label">{t('totalPortfolioValue')}:</span>
            <span className="portfolio-value">
              {exchangeRateService.formatAmount(getTotalPortfolioValue(), getBaseCurrency()?.id)}
            </span>
          </div>
          
          <div className="currency-breakdown">
            <h4>{t('currencyBreakdown')}:</h4>
            <div className="currency-list">
              {Object.entries(getCurrencyBreakdown()).map(([currencyId, data]) => (
                <div key={currencyId} className="currency-item">
                  <div className="currency-info">
                    <span className="currency-symbol">{data.currency.symbol}</span>
                    <span className="currency-name">{data.currency.name}</span>
                    <span className="currency-code">({data.currency.code})</span>
                  </div>
                  <div className="currency-amounts">
                    <div className="original-amount">
                      {exchangeRateService.formatAmount(data.totalValue, currencyId)}
                    </div>
                    {currencyId !== exchangeRateService.getBaseCurrencyId() && (
                      <div className="converted-amount">
                        ≈ {exchangeRateService.formatAmount(
                          exchangeRateService.convertToBaseCurrency(data.totalValue, currencyId),
                          getBaseCurrency()?.id
                        )}
                      </div>
                    )}
                  </div>
                  <div className="currency-accounts">
                    {data.accounts.length} {t('currencyAccounts')}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="relational-summary">
        <div className="summary-section">
          <h3>📋 {t('accountBalances')}</h3>
          <div className="accounts-grid">
            {accountsWithTypes.filter(account => account.isActive).map(account => (
              <div key={account.id} className={`account-item ${account.accountType ? account.accountType.type.toLowerCase() : 'unknown'}`}>
                <div className="account-info">
                  <span className="account-name">{account.name}</span>
                  <span className="account-type">
                    {account.accountType ? account.accountType.type : 'Unknown'} 
                    {account.accountType && account.accountType.subtype && ` - ${account.accountType.subtype}`}
                  </span>
                </div>
                <div className="account-balance">
                  {formatCurrency(account.balance)}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="summary-row">
          <div className="summary-section">
            <h4>👥 {t('customersCount')} ({summary.customersCount})</h4>
            <div className="entity-list">
              {customers.slice(0, 3).map(customer => (
                <div key={customer.id} className="entity-item">
                  <span className="entity-name">{customer.name}</span>
                  <span className="entity-detail">{customer.email}</span>
                </div>
              ))}
              {customers.length > 3 && (
                <div className="entity-more">+{customers.length - 3} {t('more')}</div>
              )}
            </div>
          </div>

          <div className="summary-section">
            <h4>🏢 {t('vendorsCount')} ({summary.vendorsCount})</h4>
            <div className="entity-list">
              {vendors.slice(0, 3).map(vendor => (
                <div key={vendor.id} className="entity-item">
                  <span className="entity-name">{vendor.name}</span>
                  <span className="entity-detail">{vendor.category}</span>
                </div>
              ))}
              {vendors.length > 3 && (
                <div className="entity-more">+{vendors.length - 3} {t('more')}</div>
              )}
            </div>
          </div>

          <div className="summary-section">
            <h4>🏷️ {t('productsServicesCount')} ({summary.productsCount})</h4>
            <div className="entity-list">
              {tags.slice(0, 3).map(tag => (
                <div key={tag.id} className="entity-item">
                  <span className="entity-name">{tag.name}</span>
                  <span className="entity-detail">{tag.description}</span>
                </div>
              ))}
              {tags.length > 3 && (
                <div className="entity-more">+{tags.length - 3} {t('more')}</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AccountSummary;