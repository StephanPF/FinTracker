import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAccounting } from '../contexts/AccountingContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useDate } from '../hooks/useDate';
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

const TransactionList = ({ limit }) => {
  const { transactions, accounts, resetToSetup, getAccountsWithTypes, categories, subcategories, getSubcategoriesWithCategories, customers, vendors, tags, currencies, exchangeRateService, numberFormatService, getActiveCategories, getActiveTransactionGroups, database } = useAccounting();
  const { t } = useLanguage();
  const { formatDate } = useDate();
  const accountsWithTypes = getAccountsWithTypes();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAccount, setFilterAccount] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState(null);
  const [filterDateTo, setFilterDateTo] = useState(null);
  const [filterAmountMin, setFilterAmountMin] = useState('');
  const [filterAmountMax, setFilterAmountMax] = useState('');
  const [isFiltersExpanded, setIsFiltersExpanded] = useState(false);
  const [isRendering, setIsRendering] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });


  const getAccountName = (accountId) => {
    const account = accounts.find(acc => acc.id === accountId);
    return account ? account.name : t('unknownAccount');
  };

  const getToAccountDisplay = (transaction) => {
    // For new linked transactions (transfers and investments), check if there's a linked transaction
    if (transaction.linkedTransactionId && (transaction.categoryId === 'CAT_003' || transaction.categoryId === 'CAT_004' || transaction.categoryId === 'CAT_005')) {
      const linkedTransaction = transactions.find(t => t.id === transaction.linkedTransactionId);
      if (linkedTransaction) {
        return getAccountName(linkedTransaction.accountId);
      }
    }
    
    // For old-style transfers or other transactions with destinationAccountId
    if (transaction.destinationAccountId) {
      return getAccountName(transaction.destinationAccountId);
    }
    
    return '-';
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

  const getPayeePayerDisplay = (transaction) => {
    const transactionType = getTransactionType(transaction);
    
    // For investment transactions, use broker field for both payee and payer
    if ((transaction.categoryId === 'CAT_004' || transaction.categoryId === 'CAT_005') && transaction.broker) {
      return transaction.broker;
    }
    
    // Check if transaction type contains "Expenses" or "Income" (handles formatted strings like "💸 Expenses")
    if (transactionType.includes('Expenses') && transaction.payee) {
      return transaction.payee;
    } else if (transactionType.includes('Income') && transaction.payer) {
      return transaction.payer;
    }
    return '-';
  };

  const getTransactionTypeColor = (transaction) => {
    if (!transaction.categoryId) {
      return '#374151'; // Default gray color
    }
    
    const category = categories.find(cat => cat.id === transaction.categoryId);
    return category ? category.color : '#374151';
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

  const formatAmountSingleLine = (transaction) => {
    const currency = currencies.find(c => c.id === transaction.currencyId);
    
    // Use the transactionType field to determine if amount should show as negative
    const shouldShowNegative = transaction.transactionType === 'DEBIT';
    
    if (currency && exchangeRateService) {
      let primaryAmount = exchangeRateService.formatAmount(transaction.amount || 0, currency.id);
      
      // Add minus sign for expenses and transfer debits
      if (shouldShowNegative) {
        primaryAmount = primaryAmount.startsWith('-') ? primaryAmount : '-' + primaryAmount;
      }
      
      // If not in base currency, also show converted amount in brackets
      if (transaction.currencyId !== exchangeRateService.getBaseCurrencyId()) {
        const baseCurrency = currencies.find(c => c.id === exchangeRateService.getBaseCurrencyId());
        
        // Calculate base currency amount using the transaction's stored exchange rate
        let baseCurrencyAmount = transaction.amount || 0;
        if (transaction.exchangeRate && transaction.exchangeRate !== 1.0) {
          // Handle exchange rate as object or number
          const rate = typeof transaction.exchangeRate === 'object' && transaction.exchangeRate.rate !== undefined 
            ? transaction.exchangeRate.rate 
            : transaction.exchangeRate;
          baseCurrencyAmount = (transaction.amount || 0) * rate;
        }
        
        let convertedAmount = exchangeRateService.formatAmount(
          baseCurrencyAmount, 
          baseCurrency?.id
        );
        
        // Add minus sign for expenses and transfer debits in converted amount too
        if (shouldShowNegative) {
          convertedAmount = convertedAmount.startsWith('-') ? convertedAmount : '-' + convertedAmount;
        }
        
        return `${primaryAmount} (≈ ${convertedAmount})`;
      }
      return primaryAmount;
    }
    
    // Fallback formatting
    const amount = transaction.amount || 0;
    const displayAmount = shouldShowNegative && amount > 0 ? -amount : amount;
    return displayAmount.toFixed(2);
  };

  const formatAmountWithCurrency = (transaction) => {
    const currency = currencies.find(c => c.id === transaction.currencyId);
    
    // Use the transactionType field to determine if amount should show as negative
    const shouldShowNegative = transaction.transactionType === 'DEBIT';
    
    if (currency && exchangeRateService) {
      let primaryAmount = exchangeRateService.formatAmount(transaction.amount || 0, currency.id);
      
      // Add minus sign for expenses and transfer debits
      if (shouldShowNegative) {
        primaryAmount = primaryAmount.startsWith('-') ? primaryAmount : '-' + primaryAmount;
      }
      
      // If not in base currency, also show converted amount using stored exchange rate
      if (transaction.currencyId !== exchangeRateService.getBaseCurrencyId()) {
        const baseCurrency = currencies.find(c => c.id === exchangeRateService.getBaseCurrencyId());
        
        // Calculate base currency amount using the transaction's stored exchange rate
        let baseCurrencyAmount = transaction.amount || 0;
        if (transaction.exchangeRate && transaction.exchangeRate !== 1.0) {
          // Handle exchange rate as object or number
          const rate = typeof transaction.exchangeRate === 'object' && transaction.exchangeRate.rate !== undefined 
            ? transaction.exchangeRate.rate 
            : transaction.exchangeRate;
          baseCurrencyAmount = (transaction.amount || 0) * rate;
        }
        
        let convertedAmount = exchangeRateService.formatAmount(
          baseCurrencyAmount, 
          baseCurrency?.id
        );
        
        // Add minus sign for expenses and transfer debits in converted amount too
        if (shouldShowNegative) {
          convertedAmount = convertedAmount.startsWith('-') ? convertedAmount : '-' + convertedAmount;
        }
        
        return (
          <div className="amount-with-conversion" style={{ color: 'inherit' }}>
            <div className="primary-amount" style={{ color: 'inherit' }}>{primaryAmount}</div>
            <div className="converted-amount" style={{ color: 'inherit' }}>≈ {convertedAmount}</div>
          </div>
        );
      }
      return <div className="primary-amount" style={{ color: 'inherit' }}>{primaryAmount}</div>;
    }
    
    // Use numberFormatService with the transaction's currency if available
    if (numberFormatService && transaction.currencyId) {
      let formatted = numberFormatService.formatCurrency(transaction.amount || 0, transaction.currencyId);
      
      // Add minus sign for expenses and transfer debits
      if (shouldShowNegative) {
        formatted = formatted.startsWith('-') ? formatted : '-' + formatted;
      }
      
      return formatted;
    }
    
    // Fallback: basic formatting without currency symbol
    const basicAmount = (transaction.amount || 0).toFixed(2);
    return shouldShowNegative ? (basicAmount.startsWith('-') ? basicAmount : '-' + basicAmount) : basicAmount;
  };

  const filteredTransactions = useMemo(() => {
    let filtered = [...transactions];

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(transaction => {
        return transaction.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
          transaction.id.toString().includes(searchTerm) ||
          getAccountName(transaction.debitAccountId).toLowerCase().includes(searchTerm.toLowerCase()) ||
          getAccountName(transaction.creditAccountId).toLowerCase().includes(searchTerm.toLowerCase()) ||
          getCategoryName(transaction.categoryId).toLowerCase().includes(searchTerm.toLowerCase()) ||
          getSubcategoryName(transaction.subcategoryId).toLowerCase().includes(searchTerm.toLowerCase()) ||
          (transaction.reference && transaction.reference.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (transaction.notes && transaction.notes.toLowerCase().includes(searchTerm.toLowerCase()));
      });
    }

    // Apply account filter - show transactions where the selected account is the primary account
    if (filterAccount) {
      filtered = filtered.filter(transaction => 
        transaction.accountId === filterAccount
      );
    }

    // Apply date range filter
    if (filterDateFrom) {
      const fromDate = new Date(filterDateFrom);
      fromDate.setHours(0, 0, 0, 0);
      filtered = filtered.filter(transaction => 
        new Date(transaction.date) >= fromDate
      );
    }
    if (filterDateTo) {
      const toDate = new Date(filterDateTo);
      toDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter(transaction => 
        new Date(transaction.date) <= toDate
      );
    }

    // Apply amount range filter (convert to base currency for consistent comparison)
    if (filterAmountMin) {
      filtered = filtered.filter(transaction => {
        let baseAmount = parseFloat(transaction.amount) || 0;
        
        // Convert to base currency if needed
        if (transaction.currencyId !== exchangeRateService?.getBaseCurrencyId() && 
            transaction.exchangeRate && transaction.exchangeRate !== 1.0) {
          const rate = typeof transaction.exchangeRate === 'object' && transaction.exchangeRate.rate !== undefined 
            ? transaction.exchangeRate.rate 
            : transaction.exchangeRate;
          baseAmount = baseAmount * rate;
        }
        
        return baseAmount >= parseFloat(filterAmountMin);
      });
    }
    if (filterAmountMax) {
      filtered = filtered.filter(transaction => {
        let baseAmount = parseFloat(transaction.amount) || 0;
        
        // Convert to base currency if needed
        if (transaction.currencyId !== exchangeRateService?.getBaseCurrencyId() && 
            transaction.exchangeRate && transaction.exchangeRate !== 1.0) {
          const rate = typeof transaction.exchangeRate === 'object' && transaction.exchangeRate.rate !== undefined 
            ? transaction.exchangeRate.rate 
            : transaction.exchangeRate;
          baseAmount = baseAmount * rate;
        }
        
        return baseAmount <= parseFloat(filterAmountMax);
      });
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

  // Handle dropdown positioning
  const handleDropdownClick = (e, transactionId) => {
    e.stopPropagation();
    
    if (activeDropdown === transactionId) {
      setActiveDropdown(null);
      return;
    }

    const button = e.currentTarget;
    const rect = button.getBoundingClientRect();
    
    // Calculate dropdown dimensions
    const dropdownHeight = 60; // Approximate height for the dropdown
    const dropdownWidth = 120;
    
    // Check if dropdown would go off-screen if placed below
    const spaceBelow = window.innerHeight - rect.bottom;
    const shouldFlipUp = spaceBelow < dropdownHeight + 20; // Add extra margin for safety
    
    // Calculate fixed positioning for portal
    let top, left;
    
    if (shouldFlipUp) {
      top = rect.top - dropdownHeight - 4;
    } else {
      top = rect.bottom + 4;
    }
    
    // Position to the right of the button, but check for screen edges
    left = rect.left - dropdownWidth + rect.width;
    
    // Ensure it doesn't go off the left edge of screen
    if (left < 10) {
      left = rect.right - dropdownWidth;
    }
    
    // Ensure it doesn't go off the right edge of screen  
    if (left + dropdownWidth > window.innerWidth - 10) {
      left = window.innerWidth - dropdownWidth - 10;
    }
    
    setDropdownPosition({ top, left });
    setActiveDropdown(transactionId);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.transaction-actions') && !event.target.closest('.portal-dropdown')) {
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
    setFilterDateFrom(null);
    setFilterDateTo(null);
    setFilterAmountMin('');
    setFilterAmountMax('');
  };

  return (
    <div className="transaction-list">
      {!limit && (
        <div className="transaction-filters">
          <div className="filters-content">
            <div className="filter-row-single">
              <div className="filter-group">
                <input
                  type="text"
                  placeholder="🔍 Search..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="search-input"
                />
              </div>
              
              <div className="filter-group">
                <select
                  value={filterAccount}
                  onChange={(e) => setFilterAccount(e.target.value)}
                  className="filter-select"
                >
                  <option value="">📋 All Accounts</option>
                  {accountsWithTypes.map(account => (
                    <option key={account.id} value={account.id}>
                      {account.name}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="filter-group">
                <DatePicker
                  selected={filterDateFrom}
                  onChange={(date) => setFilterDateFrom(date)}
                  placeholderText="📅 From"
                  className="filter-input date-picker-filter"
                  dateFormat="dd/MM/yyyy"
                  isClearable
                />
              </div>
              
              <div className="filter-group">
                <DatePicker
                  selected={filterDateTo}
                  onChange={(date) => setFilterDateTo(date)}
                  placeholderText="📅 To"
                  className="filter-input date-picker-filter"
                  dateFormat="dd/MM/yyyy"
                  isClearable
                />
              </div>
              
              <div className="filter-group">
                <input
                  type="number"
                  step="0.01"
                  placeholder={`💰 Min (${(() => {
                    const baseCurrencyId = exchangeRateService?.getBaseCurrencyId();
                    const baseCurrency = currencies.find(c => c.id === baseCurrencyId);
                    return baseCurrency ? baseCurrency.code : 'EUR';
                  })()})`}
                  value={filterAmountMin}
                  onChange={(e) => setFilterAmountMin(e.target.value)}
                  className="filter-input"
                />
              </div>
              
              <div className="filter-group">
                <input
                  type="number"
                  step="0.01"
                  placeholder={`💰 Max (${(() => {
                    const baseCurrencyId = exchangeRateService?.getBaseCurrencyId();
                    const baseCurrency = currencies.find(c => c.id === baseCurrencyId);
                    return baseCurrency ? baseCurrency.code : 'EUR';
                  })()})`}
                  value={filterAmountMax}
                  onChange={(e) => setFilterAmountMax(e.target.value)}
                  className="filter-input"
                />
              </div>
              
              <div className="filter-actions">
                <button className="clear-filters-btn" onClick={clearFilters} title="Clear all filters">
                  🗑️
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {!limit && (
        <div className="transaction-count-display">
          Showing {displayTransactions.length} of {transactions.length} transactions
        </div>
      )}
      
      <div className="data-table">
        <table>
          <thead>
            <tr>
              <th>{t('date')}</th>
              <th>Type</th>
              <th>{t('description')}</th>
              <th>Account</th>
              <th>From/To Account</th>
              <th>Payee/Payer</th>
              <th>Reference</th>
              <th style={{ width: '100px', textAlign: 'right' }}>{t('amount')}</th>
              <th style={{ width: '60px', textAlign: 'center' }}>RR</th>
              <th style={{ width: '50px', textAlign: 'center' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {displayTransactions.map(transaction => (
              <tr 
                key={transaction.id}
                style={{
                  backgroundColor: transaction.reconciliationReference ? 'rgba(0, 123, 255, 0.1)' : 'transparent'
                }}
              >
                <td>{formatDate(transaction.date)}</td>
                <td>{getTransactionType(transaction)}</td>
                <td>
                  <div className="transaction-description">
                    {transaction.description}
                  </div>
                </td>
                <td>{getAccountName(transaction.accountId)}</td>
                <td>{getToAccountDisplay(transaction)}</td>
                <td>{getPayeePayerDisplay(transaction)}</td>
                <td>{transaction.reference || '-'}</td>
                <td 
                  className="transaction-amount" 
                  style={{ 
                    '--transaction-color': getTransactionTypeColor(transaction),
                    color: getTransactionTypeColor(transaction),
                    fontWeight: '600'
                  }}
                >
                  <div style={{ color: 'inherit' }}>
                    {formatAmountWithCurrency(transaction)}
                  </div>
                </td>
                <td style={{ textAlign: 'center', fontSize: '0.7rem', color: '#6c757d' }}>
                  {transaction.reconciliationReference || '-'}
                </td>
                <td style={{ textAlign: 'center' }}>
                  <div className="transaction-actions">
                    <button 
                      className="action-menu-btn"
                      onClick={(e) => handleDropdownClick(e, transaction.id)}
                    >
                      ⋮
                    </button>
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
              <div className="transaction-detail-grid-two-column">
                {/* Left Column */}
                <div className="detail-column">
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
                    <span className="detail-value">{formatAmountSingleLine(selectedTransaction)}</span>
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
                    <span className="detail-label">From/To Account:</span>
                    <span className="detail-value">
                      {selectedTransaction.destinationAccountId ? 
                        getAccountName(selectedTransaction.destinationAccountId) : 
                        '-'
                      }
                    </span>
                  </div>
                  {(selectedTransaction.payer || selectedTransaction.payee || selectedTransaction.broker) && (
                    <div className="detail-row">
                      <span className="detail-label">{selectedTransaction.broker ? 'Broker:' : selectedTransaction.payer ? 'Payer:' : 'Payee:'}</span>
                      <span className="detail-value">{selectedTransaction.broker || selectedTransaction.payer || selectedTransaction.payee}</span>
                    </div>
                  )}
                  {selectedTransaction.productId && (
                    <div className="detail-row">
                      <span className="detail-label">Tag:</span>
                      <span className="detail-value">
                        {(() => {
                          const tag = tags.find(t => t.id === selectedTransaction.productId);
                          return tag ? tag.name : selectedTransaction.productId;
                        })()}
                      </span>
                    </div>
                  )}
                </div>
                
                {/* Right Column */}
                <div className="detail-column">
                  <div className="detail-row">
                    <span className="detail-label">Transaction ID:</span>
                    <span className="detail-value">{selectedTransaction.id}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Currency:</span>
                    <span className="detail-value">
                      {(() => {
                        const currency = currencies.find(c => c.id === selectedTransaction.currencyId);
                        return currency ? `${currency.symbol} ${currency.name} (${currency.code})` : selectedTransaction.currencyId || '-';
                      })()}
                    </span>
                  </div>
                  {selectedTransaction.currencyId !== exchangeRateService?.getBaseCurrencyId() && (
                    <div className="detail-row">
                      <span className="detail-label">Exchange Rate:</span>
                      <span className="detail-value">
                        {(() => {
                          const rate = selectedTransaction.exchangeRate || 
                                       selectedTransaction.exchange_rate ||
                                       (selectedTransaction.currencyId === exchangeRateService?.getBaseCurrencyId() ? 1.0 : null);
                          
                          if (rate === null || rate === undefined) {
                            if (selectedTransaction.currencyId && exchangeRateService) {
                              const baseCurrencyId = exchangeRateService.getBaseCurrencyId();
                              if (selectedTransaction.currencyId === baseCurrencyId) {
                                return '1.0000';
                              } else {
                                try {
                                  const currentRate = exchangeRateService.getExchangeRate(selectedTransaction.currencyId, baseCurrencyId);
                                  return currentRate ? Number(currentRate).toFixed(4) : 'N/A';
                                } catch (error) {
                                  return 'N/A';
                                }
                              }
                            }
                            return '-';
                          }
                          
                          if (typeof rate === 'object' && rate.rate !== undefined) {
                            return Number(rate.rate).toFixed(4);
                          }
                          
                          return Number(rate).toFixed(4);
                        })()}
                      </span>
                    </div>
                  )}
                  <div className="detail-row">
                    <span className="detail-label">Transaction Type:</span>
                    <span className="detail-value">
                      <span className={`badge ${selectedTransaction.transactionType === 'DEBIT' ? 'badge-debit' : 'badge-credit'}`}>
                        {selectedTransaction.transactionType === 'DEBIT' ? '⬇️ DEBIT' : '⬆️ CREDIT'}
                      </span>
                    </span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Reference:</span>
                    <span className="detail-value">{selectedTransaction.reference || '-'}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Notes:</span>
                    <span className="detail-value">{selectedTransaction.notes || '-'}</span>
                  </div>
                  {selectedTransaction.linkedTransactionId && (
                    <div className="detail-row">
                      <span className="detail-label">Linked Transaction:</span>
                      <span className="detail-value">{selectedTransaction.linkedTransactionId}</span>
                    </div>
                  )}
                  <div className="detail-row">
                    <span className="detail-label">Created:</span>
                    <span className="detail-value">{selectedTransaction.createdAt ? formatDate(selectedTransaction.createdAt) : '-'}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Portal-rendered dropdown for transaction actions */}
      {activeDropdown && createPortal(
        <div 
          className="dropdown-menu portal-dropdown"
          style={{
            position: 'fixed',
            top: `${dropdownPosition.top}px`,
            left: `${dropdownPosition.left}px`,
            width: '120px',
            zIndex: 9999
          }}
        >
          <button 
            className="dropdown-item"
            onClick={() => {
              const transaction = transactions.find(t => t.id === activeDropdown);
              if (transaction) {
                setSelectedTransaction(transaction);
                setShowTransactionModal(true);
                setActiveDropdown(null);
              }
            }}
          >
            👁️ View details
          </button>
        </div>,
        document.body
      )}
    </div>
  );
};

export default TransactionList;