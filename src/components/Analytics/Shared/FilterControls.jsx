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
  
  const { database, getAccountTypes } = useAccounting();
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
      const allAccountTypes = getAccountTypes() || [];
      
      // Filter to only include analytics-relevant account types for accounts
      const analyticsAccountTypes = ['ACCT_TYPE_001', 'ACCT_TYPE_006']; // Bank Account, Current Liability
      
      // Filter accounts to only include those with relevant account types and Analytics enabled
      const filteredAccounts = allAccounts.filter(account => 
        analyticsAccountTypes.includes(account.accountTypeId) && 
        account.isActive && 
        account.includeInOverview !== false
      );
      
      // Get all account types (not filtered) so we can display proper names
      setAccounts(filteredAccounts);
      setAccountTypes(allAccountTypes);
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
   * Get account type name by ID with enhanced formatting
   */
  const getAccountTypeName = (accountTypeId) => {
    const accountType = accountTypes.find(type => type.id === accountTypeId);
    
    console.log('Debug - Looking for accountTypeId:', accountTypeId);
    console.log('Debug - Available accountTypes:', accountTypes.map(at => ({id: at.id, type: at.type, subtype: at.subtype})));
    console.log('Debug - Found accountType:', accountType);
    
    if (!accountType) return `Unknown (ID: ${accountTypeId})`;
    
    // Use the correct fields: type and subtype (matching DataManagement component)
    const type = accountType.type || '';
    const subtype = accountType.subtype || '';
    
    console.log('Debug - type:', type, 'subtype:', subtype);
    
    if (type && subtype) {
      return `${type} - ${subtype}`;
    }
    
    return type || subtype || 'Unknown Account Type';
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
      <div className="account-filter-main">
        {/* Account Selection Radio Buttons */}
        <div className="account-selection-options">
          <div className="selection-option">
            <label className="option-label">
              <input
                type="radio"
                name="account-filter"
                value="all"
                checked={selectedAccounts === 'all'}
                onChange={() => setSelectedAccounts('all')}
                className="option-radio"
              />
              <div className="option-content">
                <span className="option-title">All Accounts</span>
                <span className="option-description">
                  Include all {accounts.length} accounts with Analytics enabled
                </span>
              </div>
            </label>
          </div>

          <div className="selection-option">
            <label className="option-label">
              <input
                type="radio"
                name="account-filter"
                value="custom"
                checked={selectedAccounts !== 'all'}
                onChange={() => setSelectedAccounts(accounts.length > 0 ? [accounts[0].id] : [])}
                className="option-radio"
              />
              <div className="option-content">
                <span className="option-title">Select Specific Accounts</span>
                <span className="option-description">
                  Choose which accounts to include in analytics
                </span>
              </div>
            </label>
          </div>

          {/* No Accounts Message */}
          {accounts.length === 0 && (
            <div className="no-accounts-message">
              <span className="no-accounts-icon">🏦</span>
              <div className="no-accounts-text">
                <h4>No Accounts Available</h4>
                <p>Enable Analytics for accounts in Account Management to see them here</p>
              </div>
            </div>
          )}
        </div>

        {/* Multi-Select Area - Always present but conditionally visible */}
        <div className="account-multiselect-area">
          {selectedAccounts !== 'all' && accounts.length > 0 ? (
            <div className="account-multiselect">
              <div className="multiselect-header">
                <span className="multiselect-label">Selected Accounts ({getSelectedCount()})</span>
              </div>
              <div className="account-checkboxes">
                {accounts.map(account => (
                  <div key={account.id} className="account-checkbox">
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={isAccountSelected(account.id)}
                        onChange={() => handleAccountToggle(account.id)}
                        className="account-check"
                      />
                      <span className="account-info">
                        <span className="account-name">{account.name}</span>
                        <span className="account-type">
                          {getAccountTypeName(account.accountTypeId)}
                        </span>
                      </span>
                    </label>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="account-multiselect-placeholder">
              {selectedAccounts === 'all' ? (
                <div className="placeholder-content">
                  <span className="placeholder-icon">✓</span>
                  <div className="placeholder-text">
                    <h4>All Accounts Selected</h4>
                    <p>Analytics will include data from all {accounts.length} accounts with Analytics enabled.</p>
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FilterControls;