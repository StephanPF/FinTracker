import React, { useState, useEffect } from 'react';
import { useAnalytics } from '../AnalyticsMain';
import { useAccounting } from '../../../contexts/AccountingContext';

/**
 * Filter Controls Component
 * Provides account filtering and additional analytics filters
 * Follows BUILD_NEW_FEATURE_GUIDE.md compact design principles
 */
const FilterControls = () => {
  const { 
    selectedAccounts, 
    setSelectedAccounts, 
    t 
  } = useAnalytics();
  
  const { database } = useAccounting();
  const [accounts, setAccounts] = useState([]);
  const [accountTypes, setAccountTypes] = useState([]);

  // Load accounts on component mount
  useEffect(() => {
    loadAccounts();
  }, [database]);

  /**
   * Load accounts with filtering for analytics (only relevant account types)
   */
  const loadAccounts = () => {
    try {
      const allAccounts = database.getTable('accounts') || [];
      const allAccountTypes = database.getTable('account_types') || [];
      
      // Filter to only include analytics-relevant account types
      const analyticsAccountTypes = ['ACCT_TYPE_001', 'ACCT_TYPE_006']; // Bank Account, Current Liability
      const filteredAccountTypes = allAccountTypes.filter(type => 
        analyticsAccountTypes.includes(type.id)
      );
      
      // Filter accounts to only include those with relevant account types and Analytics enabled
      const filteredAccounts = allAccounts.filter(account => 
        analyticsAccountTypes.includes(account.accountTypeId) && 
        account.isActive && 
        account.includeInOverview !== false
      );

      setAccounts(filteredAccounts);
      setAccountTypes(filteredAccountTypes);
    } catch (error) {
      console.error('Error loading accounts for analytics:', error);
      setAccounts([]);
      setAccountTypes([]);
    }
  };

  /**
   * Handle account selection change
   */
  const handleAccountSelectionChange = (event) => {
    const value = event.target.value;
    setSelectedAccounts(value);
  };

  /**
   * Handle individual account toggle
   */
  const handleAccountToggle = (accountId) => {
    if (selectedAccounts === 'all') {
      // If "all" was selected, switch to individual selection
      setSelectedAccounts([accountId]);
    } else if (Array.isArray(selectedAccounts)) {
      if (selectedAccounts.includes(accountId)) {
        // Remove account from selection
        const newSelection = selectedAccounts.filter(id => id !== accountId);
        if (newSelection.length === 0) {
          setSelectedAccounts('all');
        } else {
          setSelectedAccounts(newSelection);
        }
      } else {
        // Add account to selection
        setSelectedAccounts([...selectedAccounts, accountId]);
      }
    } else {
      // Single account selected, switch to array
      setSelectedAccounts([selectedAccounts, accountId]);
    }
  };

  /**
   * Get account type name by ID
   */
  const getAccountTypeName = (accountTypeId) => {
    const accountType = accountTypes.find(type => type.id === accountTypeId);
    return accountType?.name || 'Unknown';
  };

  /**
   * Check if account is selected
   */
  const isAccountSelected = (accountId) => {
    if (selectedAccounts === 'all') return true;
    if (Array.isArray(selectedAccounts)) return selectedAccounts.includes(accountId);
    return selectedAccounts === accountId;
  };

  /**
   * Get selected accounts count
   */
  const getSelectedCount = () => {
    if (selectedAccounts === 'all') return accounts.length;
    if (Array.isArray(selectedAccounts)) return selectedAccounts.length;
    return 1;
  };

  return (
    <div className="filter-controls">
      <div className="filter-controls-header">
        <h3>{t('filters') || 'Filters'}</h3>
        <span className="filter-summary">
          {getSelectedCount()} of {accounts.length} {t('accountsSelected') || 'accounts selected'}
        </span>
      </div>

      <div className="filter-sections">
        {/* Account Selection */}
        <div className="filter-section">
          <h4>{t('accounts') || 'Accounts'}</h4>
          
          {/* Quick Selection */}
          <div className="quick-selection">
            <select
              value={selectedAccounts === 'all' ? 'all' : 'custom'}
              onChange={handleAccountSelectionChange}
              className="form-control"
              style={{
                backgroundColor: 'white',
                color: '#1a202c',
                border: '1px solid #d1d5db'
              }}
            >
              <option value="all">{t('allAccounts') || 'All Accounts'}</option>
              <option value="custom">{t('selectAccounts') || 'Select Accounts'}</option>
            </select>
          </div>

          {/* Individual Account Selection */}
          {selectedAccounts !== 'all' && accounts.length > 0 && (
            <div className="account-list">
              {accountTypes.map(accountType => {
                const typeAccounts = accounts.filter(acc => acc.accountTypeId === accountType.id);
                if (typeAccounts.length === 0) return null;

                return (
                  <div key={accountType.id} className="account-type-group">
                    <h5 className="account-type-title">
                      {getAccountTypeName(accountType.id)}
                    </h5>
                    <div className="account-checkboxes">
                      {typeAccounts.map(account => (
                        <div key={account.id} className="account-checkbox">
                          <label className="checkbox-label">
                            <input
                              type="checkbox"
                              checked={isAccountSelected(account.id)}
                              onChange={() => handleAccountToggle(account.id)}
                              style={{
                                backgroundColor: 'white',
                                color: '#1a202c',
                                accentColor: '#1a202c',
                                border: '1px solid #d1d5db'
                              }}
                            />
                            <span className="account-name">{account.name}</span>
                            {account.description && (
                              <span className="account-description">
                                {account.description}
                              </span>
                            )}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* No Accounts Message */}
          {accounts.length === 0 && (
            <div className="no-accounts-message">
              <p>{t('noAccountsAvailable') || 'No accounts available for analytics'}</p>
              <p className="help-text">
                {t('analyticsAccountsHelp') || 'Only bank accounts and current liability accounts are included in analytics'}
              </p>
            </div>
          )}
        </div>

        {/* Transaction Type Filter (Future Enhancement) */}
        <div className="filter-section">
          <h4>{t('transactionTypes') || 'Transaction Types'}</h4>
          <div className="transaction-type-info">
            <p className="info-text">
              {t('analyticsTransactionTypes') || 'Analytics includes Income and Expense transactions only'}
            </p>
            <div className="included-types">
              <span className="type-badge type-income">
                {t('income') || 'Income'}
              </span>
              <span className="type-badge type-expense">
                {t('expenses') || 'Expenses'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Reset Filters */}
      <div className="filter-actions">
        <button
          className="btn-secondary btn-small"
          onClick={() => setSelectedAccounts('all')}
        >
          {t('resetFilters') || 'Reset Filters'}
        </button>
      </div>
    </div>
  );
};

export default FilterControls;