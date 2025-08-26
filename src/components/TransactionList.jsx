import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAccounting } from '../contexts/AccountingContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useDate } from '../hooks/useDate';

const TransactionList = ({ limit }) => {
  const { transactions, accounts, resetToSetup, getAccountsWithTypes, categories, subcategories, getSubcategoriesWithCategories, customers, vendors, tags, currencies, exchangeRateService, numberFormatService, getActiveCategories, getActiveTransactionGroups } = useAccounting();
  const { t } = useLanguage();
  const { formatDate } = useDate();
  const accountsWithTypes = getAccountsWithTypes();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAccount, setFilterAccount] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [filterAmountMin, setFilterAmountMin] = useState('');
  const [filterAmountMax, setFilterAmountMax] = useState('');
  const [isFiltersExpanded, setIsFiltersExpanded] = useState(false);
  const [isRendering, setIsRendering] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState(null);



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

  const getTransactionType = (transaction) => {
    // First try to get from subcategory -> transaction group -> transaction type hierarchy
    if (transaction.subcategoryId) {
      const subcategoriesWithCategories = getSubcategoriesWithCategories();
      const subcategory = subcategoriesWithCategories.find(sub => sub.id === transaction.subcategoryId);
      
      if (subcategory && subcategory.groupId) {
        // Find transaction group and get its transaction type
        const transactionGroups = getActiveTransactionGroups();
        const group = transactionGroups.find(g => g.id === subcategory.groupId);
        
        if (group && group.transactionTypeId) {
          const activeCategories = getActiveCategories();
          const transactionType = activeCategories.find(type => type.id === group.transactionTypeId);
          if (transactionType) {
            return `${transactionType.icon} ${transactionType.name}`;
          }
        }
      }
    }
    
    // Fallback: try direct category lookup
    if (transaction.categoryId) {
      const category = categories.find(cat => cat.id === transaction.categoryId);
      if (category) {
        return `${category.icon} ${category.name}`;
      }
    }
    
    // Another fallback: if accounts are different, it might be a transfer
    const account = accounts.find(acc => acc.id === transaction.accountId);
    const destinationAccount = accounts.find(acc => acc.id === transaction.destinationAccountId);
    
    if (account && destinationAccount && transaction.accountId !== transaction.destinationAccountId) {
      return '🔄 Transfer';
    }
    
    return '❓ Unknown';
  };

  const formatAmountWithCurrency = (transaction) => {
    const currency = currencies.find(c => c.id === transaction.currencyId);
    
    if (currency && exchangeRateService) {
      const primaryAmount = exchangeRateService.formatAmount(transaction.amount || 0, currency.id);
      
      // If not in base currency, also show converted amount
      if (transaction.currencyId !== exchangeRateService.getBaseCurrencyId()) {
        const baseCurrency = currencies.find(c => c.id === exchangeRateService.getBaseCurrencyId());
        const convertedAmount = exchangeRateService.formatAmount(
          transaction.baseCurrencyAmount || transaction.amount || 0, 
          baseCurrency?.id
        );
        return (
          <div className="amount-with-conversion">
            <div className="primary-amount">{primaryAmount}</div>
            <div className="converted-amount">≈ {convertedAmount}</div>
          </div>
        );
      }
      return <div className="primary-amount">{primaryAmount}</div>;
    }
    
    // Use numberFormatService with the transaction's currency if available
    if (numberFormatService && transaction.currencyId) {
      return numberFormatService.formatCurrency(transaction.amount || 0, transaction.currencyId);
    }
    
    // Fallback: basic formatting without currency symbol
    return (transaction.amount || 0).toFixed(2);
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

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.transaction-actions')) {
        setActiveDropdown(null);
      }
    };

    if (activeDropdown) {
      document.addEventListener('click', handleClickOutside);
    }

    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [activeDropdown]);

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
              <th>Transaction Type</th>
              <th>Category</th>
              <th>{t('amount')}</th>
              <th style={{ width: '50px' }}>Actions</th>
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
                <td>{getTransactionType(transaction)}</td>
                <td>{getSubcategoryName(transaction.subcategoryId)}</td>
                <td>{formatAmountWithCurrency(transaction)}</td>
                <td>
                  <div className="transaction-actions">
                    <button 
                      className="action-menu-btn"
                      onClick={() => setActiveDropdown(activeDropdown === transaction.id ? null : transaction.id)}
                    >
                      ⋮
                    </button>
                    {activeDropdown === transaction.id && (
                      <div className="action-dropdown">
                        <button 
                          className="dropdown-item"
                          onClick={() => {
                            setSelectedTransaction(transaction);
                            setShowTransactionModal(true);
                            setActiveDropdown(null);
                          }}
                        >
                          👁️ View
                        </button>
                      </div>
                    )}
                  </div>
                </td>
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

      {/* Transaction Details Modal - Rendered as Portal */}
      {showTransactionModal && selectedTransaction && createPortal(
        <div className="modal-overlay" onClick={() => setShowTransactionModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Transaction Details</h3>
              <button 
                className="modal-close-btn"
                onClick={() => setShowTransactionModal(false)}
              >
                ✕
              </button>
            </div>
            <div className="modal-body">
              <div className="transaction-detail-grid">
                <div className="detail-row">
                  <span className="detail-label">ID:</span>
                  <span className="detail-value">{selectedTransaction.id}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Date:</span>
                  <span className="detail-value">{formatDate(selectedTransaction.date)}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Description:</span>
                  <span className="detail-value">{selectedTransaction.description}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Amount:</span>
                  <span className="detail-value">{formatAmountWithCurrency(selectedTransaction)}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Transaction Type:</span>
                  <span className="detail-value">{getTransactionType(selectedTransaction)}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Category:</span>
                  <span className="detail-value">{getSubcategoryName(selectedTransaction.subcategoryId)}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Account:</span>
                  <span className="detail-value">{getAccountName(selectedTransaction.accountId)}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Destination Account:</span>
                  <span className="detail-value">{selectedTransaction.destinationAccountId ? getAccountName(selectedTransaction.destinationAccountId) : '-'}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Currency ID:</span>
                  <span className="detail-value">{selectedTransaction.currencyId || '-'}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Exchange Rate:</span>
                  <span className="detail-value">{selectedTransaction.exchangeRate || '-'}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Account ID:</span>
                  <span className="detail-value">{selectedTransaction.accountId || '-'}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Destination Account ID:</span>
                  <span className="detail-value">{selectedTransaction.destinationAccountId || '-'}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Subcategory ID:</span>
                  <span className="detail-value">{selectedTransaction.subcategoryId || '-'}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Category ID:</span>
                  <span className="detail-value">{selectedTransaction.categoryId || '-'}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Customer ID:</span>
                  <span className="detail-value">{selectedTransaction.customerId || '-'}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Vendor ID:</span>
                  <span className="detail-value">{selectedTransaction.vendorId || '-'}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Product ID:</span>
                  <span className="detail-value">{selectedTransaction.productId || '-'}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Payer:</span>
                  <span className="detail-value">{selectedTransaction.payer || '-'}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Payee:</span>
                  <span className="detail-value">{selectedTransaction.payee || '-'}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Reference:</span>
                  <span className="detail-value">{selectedTransaction.reference || '-'}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Notes:</span>
                  <span className="detail-value">{selectedTransaction.notes || '-'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default TransactionList;