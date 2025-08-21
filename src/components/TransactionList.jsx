import React, { useState, useMemo, useEffect } from 'react';
import { useAccounting } from '../contexts/AccountingContext';
import { useLanguage } from '../contexts/LanguageContext';

const TransactionList = ({ limit }) => {
  const { transactions, accounts, resetToSetup, getAccountsWithTypes, categories, subcategories, getSubcategoriesWithCategories, customers, vendors, tags } = useAccounting();
  const { t, formatCurrency } = useLanguage();
  const accountsWithTypes = getAccountsWithTypes();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAccount, setFilterAccount] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [filterAmountMin, setFilterAmountMin] = useState('');
  const [filterAmountMax, setFilterAmountMax] = useState('');
  const [isFiltersExpanded, setIsFiltersExpanded] = useState(false);
  const [isRendering, setIsRendering] = useState(false);


  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Invalid Date';
    
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const getAccountName = (accountId) => {
    const account = accounts.find(acc => acc.id === accountId);
    return account ? account.name : t('unknownAccount');
  };

  const getCategoryName = (categoryId) => {
    if (!categoryId) return '-';
    const category = categories.find(cat => cat.id === categoryId);
    return category ? `${category.icon} ${category.name}` : '-';
  };

  const getSubcategoryName = (subcategoryId) => {
    if (!subcategoryId) return '-';
    const subcategory = subcategories.find(sub => sub.id === subcategoryId);
    return subcategory ? subcategory.name : '-';
  };

  const getCategorySubcategoryName = (transaction) => {
    const categoryName = transaction.categoryId ? 
      (categories.find(cat => cat.id === transaction.categoryId)?.name || '') : '';
    const subcategoryName = transaction.subcategoryId ? 
      (subcategories.find(sub => sub.id === transaction.subcategoryId)?.name || '') : '';
    
    if (categoryName && subcategoryName) {
      return `${categoryName} - ${subcategoryName}`;
    } else if (categoryName) {
      return categoryName;
    } else if (subcategoryName) {
      return `- ${subcategoryName}`;
    }
    return '-';
  };

  const filteredTransactions = useMemo(() => {
    let filtered = [...transactions];

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(transaction => {
        const customer = transaction.customerId ? customers.find(c => c.id === transaction.customerId) : null;
        const vendor = transaction.vendorId ? vendors.find(v => v.id === transaction.vendorId) : null;
        const tag = transaction.productId ? tags.find(t => t.id === transaction.productId) : null;
        
        return transaction.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
          transaction.id.toString().includes(searchTerm) ||
          getAccountName(transaction.debitAccountId).toLowerCase().includes(searchTerm.toLowerCase()) ||
          getAccountName(transaction.creditAccountId).toLowerCase().includes(searchTerm.toLowerCase()) ||
          getCategoryName(transaction.categoryId).toLowerCase().includes(searchTerm.toLowerCase()) ||
          getSubcategoryName(transaction.subcategoryId).toLowerCase().includes(searchTerm.toLowerCase()) ||
          (customer && customer.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (vendor && vendor.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (tag && tag.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (transaction.reference && transaction.reference.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (transaction.notes && transaction.notes.toLowerCase().includes(searchTerm.toLowerCase()));
      });
    }

    // Apply account filter
    if (filterAccount) {
      filtered = filtered.filter(transaction => 
        transaction.debitAccountId === filterAccount || transaction.creditAccountId === filterAccount
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
  }, [transactions, searchTerm, filterAccount, filterDateFrom, filterDateTo, filterAmountMin, filterAmountMax, accounts, categories, subcategories, customers, vendors, tags, t]);

  const displayTransactions = useMemo(() => {
    return limit 
      ? filteredTransactions.slice(-limit).reverse() 
      : [...filteredTransactions].reverse();
  }, [filteredTransactions, limit]);

  // Handle large datasets with loading state
  useEffect(() => {
    if (transactions.length > 1000) {
      setIsRendering(true);
      const timer = setTimeout(() => {
        setIsRendering(false);
      }, 100); // Small delay to show loading state
      return () => clearTimeout(timer);
    } else {
      setIsRendering(false);
    }
  }, [transactions, filteredTransactions]);

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

  if (isRendering && transactions.length > 1000) {
    return (
      <div className="transaction-list loading">
        <div className="loading-state">
          <div className="spinner"></div>
          <h3>Loading {transactions.length.toLocaleString()} transactions...</h3>
          <p>This may take a moment for large datasets</p>
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
                placeholder="Search description, accounts, categories, customers, vendors..."
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
      
      
      <div className="data-table">
        <table>
          <thead>
            <tr>
              <th>{t('date')}</th>
              <th>{t('description')}</th>
              <th>{t('debitAccount')}</th>
              <th>{t('creditAccount')}</th>
              <th>{t('category')}</th>
              <th>{t('vendor')}</th>
              <th>{t('productService')}</th>
              <th>{t('reference')}</th>
              <th>{t('notes')}</th>
              <th>{t('amount')}</th>
            </tr>
          </thead>
          <tbody>
            {displayTransactions.map(transaction => (
              <tr key={transaction.id}>
                <td>{formatDate(transaction.date)}</td>
                <td>
                  <div className="transaction-description">
                    {transaction.description}
                  </div>
                  <div className="transaction-id">
                    ID: {transaction.id}
                  </div>
                </td>
                <td>{getAccountName(transaction.debitAccountId)}</td>
                <td>{getAccountName(transaction.creditAccountId)}</td>
                <td>{getCategorySubcategoryName(transaction)}</td>
                <td>
                  {transaction.vendorId ? 
                    vendors.find(v => v.id === transaction.vendorId)?.name || '-' : '-'}
                </td>
                <td>
                  {transaction.productId ? 
                    tags.find(t => t.id === transaction.productId)?.name || '-' : '-'}
                </td>
                <td>{transaction.reference || '-'}</td>
                <td>{transaction.notes || '-'}</td>
                <td>{formatCurrency(transaction.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
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