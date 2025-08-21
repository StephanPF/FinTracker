import React, { useState, useMemo } from 'react';
import { useAccounting } from '../contexts/AccountingContext';
import { useLanguage } from '../contexts/LanguageContext';

const TransactionList = ({ limit }) => {
  const { transactions, accounts, resetToSetup, getAccountsWithTypes } = useAccounting();
  const { t, formatCurrency } = useLanguage();
  const accountsWithTypes = getAccountsWithTypes();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAccount, setFilterAccount] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [filterAmountMin, setFilterAmountMin] = useState('');
  const [filterAmountMax, setFilterAmountMax] = useState('');
  const [isFiltersExpanded, setIsFiltersExpanded] = useState(false);


  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getAccountName = (accountId) => {
    const account = accounts.find(acc => acc.id === accountId);
    return account ? account.name : t('unknownAccount');
  };

  const filteredTransactions = useMemo(() => {
    let filtered = [...transactions];

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(transaction => 
        transaction.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        transaction.id.toString().includes(searchTerm) ||
        getAccountName(transaction.debitAccount).toLowerCase().includes(searchTerm.toLowerCase()) ||
        getAccountName(transaction.creditAccount).toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply account filter
    if (filterAccount) {
      filtered = filtered.filter(transaction => 
        transaction.debitAccount === filterAccount || transaction.creditAccount === filterAccount
      );
    }

    // Apply date range filter
    if (filterDateFrom) {
      filtered = filtered.filter(transaction => 
        new Date(transaction.date) >= new Date(filterDateFrom)
      );
    }
    if (filterDateTo) {
      filtered = filtered.filter(transaction => 
        new Date(transaction.date) <= new Date(filterDateTo)
      );
    }

    // Apply amount range filter
    if (filterAmountMin) {
      filtered = filtered.filter(transaction => 
        parseFloat(transaction.amount) >= parseFloat(filterAmountMin)
      );
    }
    if (filterAmountMax) {
      filtered = filtered.filter(transaction => 
        parseFloat(transaction.amount) <= parseFloat(filterAmountMax)
      );
    }

    return filtered;
  }, [transactions, searchTerm, filterAccount, filterDateFrom, filterDateTo, filterAmountMin, filterAmountMax, accounts, t]);

  const displayTransactions = limit 
    ? filteredTransactions.slice(-limit).reverse() 
    : [...filteredTransactions].reverse();

  if (transactions.length === 0) {
    return (
      <div className="transaction-list empty">
        <div className="empty-state">
          <span className="empty-icon">📝</span>
          <h3>{t('noTransactionsYet')}</h3>
          <p>{t('addFirstTransaction')}</p>
        </div>
      </div>
    );
  }

  const clearFilters = () => {
    setSearchTerm('');
    setFilterAccount('');
    setFilterDateFrom('');
    setFilterDateTo('');
    setFilterAmountMin('');
    setFilterAmountMax('');
  };

  return (
    <div className="transaction-list">
      {!limit && (
        <div className="transaction-filters">
          <div className="filters-toggle">
            <button 
              className="toggle-filters-btn"
              onClick={() => setIsFiltersExpanded(!isFiltersExpanded)}
            >
              {isFiltersExpanded ? '▼' : '▶'} Search & Filter Transactions
            </button>
            <div className="transaction-count-summary">
              Showing {displayTransactions.length} of {transactions.length} transactions
            </div>
          </div>
          
          {isFiltersExpanded && (
            <div className="filters-content">
              <div className="filter-row">
            <div className="filter-group">
              <label>🔍 Search</label>
              <input
                type="text"
                placeholder="Search description, ID, or account..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
              />
            </div>
            
            <div className="filter-group">
              <label>📋 Account</label>
              <select
                value={filterAccount}
                onChange={(e) => setFilterAccount(e.target.value)}
                className="filter-select"
              >
                <option value="">All Accounts</option>
                {accountsWithTypes.map(account => (
                  <option key={account.id} value={account.id}>
                    {account.name} ({account.accountType ? account.accountType.type : 'Unknown'})
                  </option>
                ))}
              </select>
            </div>
          </div>
          
          <div className="filter-row">
            <div className="filter-group">
              <label>📅 Date From</label>
              <input
                type="date"
                value={filterDateFrom}
                onChange={(e) => setFilterDateFrom(e.target.value)}
                className="filter-input"
              />
            </div>
            
            <div className="filter-group">
              <label>📅 Date To</label>
              <input
                type="date"
                value={filterDateTo}
                onChange={(e) => setFilterDateTo(e.target.value)}
                className="filter-input"
              />
            </div>
            
            <div className="filter-group">
              <label>💰 Amount Min</label>
              <input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={filterAmountMin}
                onChange={(e) => setFilterAmountMin(e.target.value)}
                className="filter-input"
              />
            </div>
            
            <div className="filter-group">
              <label>💰 Amount Max</label>
              <input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={filterAmountMax}
                onChange={(e) => setFilterAmountMax(e.target.value)}
                className="filter-input"
              />
            </div>
          </div>
          
          <div className="filter-summary">
            <span>Showing {displayTransactions.length} of {transactions.length} transactions</span>
            <button className="clear-filters-btn" onClick={clearFilters}>
              🗑️ Clear Filters
            </button>
          </div>
            </div>
          )}
        </div>
      )}
      
      <div className="transactions-table">
        <div className="table-header">
          <div className="header-cell">{t('date')}</div>
          <div className="header-cell">{t('description')}</div>
          <div className="header-cell">{t('debit')}</div>
          <div className="header-cell">{t('credit')}</div>
          <div className="header-cell">{t('amount')}</div>
        </div>

        <div className="table-body">
          {displayTransactions.map(transaction => (
            <div key={transaction.id} className="table-row">
              <div className="table-cell date">
                {formatDate(transaction.date)}
              </div>
              
              <div className="table-cell description">
                <div className="transaction-description">
                  {transaction.description}
                </div>
                <div className="transaction-id">
                  ID: {transaction.id}
                </div>
              </div>
              
              <div className="table-cell debit">
                <span className="account-name">
                  {getAccountName(transaction.debitAccount)}
                </span>
              </div>
              
              <div className="table-cell credit">
                <span className="account-name">
                  {getAccountName(transaction.creditAccount)}
                </span>
              </div>
              
              <div className="table-cell amount">
                {formatCurrency(transaction.amount)}
              </div>
            </div>
          ))}
        </div>
      </div>

      {limit && filteredTransactions.length > limit && (
        <div className="view-all-notice">
          <p>{t('showingLastTransactions')} {limit} {t('totalTransactions')} {filteredTransactions.length}</p>
        </div>
      )}
    </div>
  );
};

export default TransactionList;