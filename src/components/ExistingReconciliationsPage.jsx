import React, { useState, useMemo, useEffect } from 'react';
import { useAccounting } from '../contexts/AccountingContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useDate } from '../hooks/useDate';
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import './ReconciliationTransactionList.css';
import Autocomplete from './Autocomplete';

const ExistingReconciliationsPage = () => {
  const { transactions, accounts, categories, getActiveTransactionGroups, getActiveSubcategories, tags, numberFormatService, database, unreconcileTransaction } = useAccounting();
  const { t } = useLanguage();
  const { formatDate } = useDate();

  // Get user's date format from database
  const getUserDateFormat = () => {
    if (database) {
      const datePrefs = database.getUserPreferences().find(p => p.category === 'date_formatting');
      if (datePrefs && datePrefs.settings && datePrefs.settings.dateFormat) {
        return datePrefs.settings.dateFormat;
      }
    }
    return 'DD/MM/YYYY'; // Default format
  };

  // Convert settings date format to react-datepicker format
  const convertToDatePickerFormat = (settingsFormat) => {
    const formatMap = {
      'DD/MM/YYYY': 'dd/MM/yyyy',
      'MM/DD/YYYY': 'MM/dd/yyyy',
      'YYYY-MM-DD': 'yyyy-MM-dd',
      'DD.MM.YYYY': 'dd.MM.yyyy',
      'DD-MM-YYYY': 'dd-MM-yyyy',
      'MMM DD, YYYY': 'MMM dd, yyyy',
      'DD MMM YYYY': 'dd MMM yyyy',
      'MMMM DD, YYYY': 'MMMM dd, yyyy'
    };
    return formatMap[settingsFormat] || 'dd/MM/yyyy';
  };

  // Helper function to convert Date object to YYYY-MM-DD string (timezone-safe)
  const dateToISOString = (date) => {
    if (!date) return '';
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const userDateFormat = getUserDateFormat();
  const datePickerFormat = convertToDatePickerFormat(userDateFormat);
  
  // Filter state - similar to ReconciliationTransactionList but showing only reconciled transactions
  const [filters, setFilters] = useState({
    search: '',
    accountId: '',
    categoryId: '',
    transactionGroupId: '',
    subcategoryId: '',
    dateFrom: '',
    dateTo: '',
    amountMin: '',
    amountMax: '',
    reconciliationReference: '',
    tagId: '',
    reference: ''
  });

  // Date picker states
  const [selectedDateFrom, setSelectedDateFrom] = useState(null);
  const [selectedDateTo, setSelectedDateTo] = useState(null);

  // State for selected transactions to un-reconcile
  const [selectedTransactions, setSelectedTransactions] = useState(new Set());
  const [isProcessing, setIsProcessing] = useState(false);

  // Handle date picker changes (timezone-safe)
  const handleDateFromChange = (date) => {
    setSelectedDateFrom(date);
    setFilters(prev => ({ 
      ...prev, 
      dateFrom: dateToISOString(date)
    }));
  };

  const handleDateToChange = (date) => {
    setSelectedDateTo(date);
    setFilters(prev => ({ 
      ...prev, 
      dateTo: dateToISOString(date)
    }));
  };

  // Get unique reconciliation references for dropdown
  const uniqueReconciliationReferences = useMemo(() => {
    const references = transactions
      .filter(t => t.reconciliationReference)
      .map(t => t.reconciliationReference);
    return [...new Set(references)].sort();
  }, [transactions]);

  // Get only reconciled transactions
  const reconciledTransactions = useMemo(() => {
    return transactions.filter(t => t.reconciliationReference);
  }, [transactions]);

  // Clear selections when filters change
  useEffect(() => {
    setSelectedTransactions(new Set());
  }, [filters]);

  // Filter transactions
  const filteredTransactions = useMemo(() => {
    return reconciledTransactions.filter(transaction => {
      // Search filter
      if (filters.search) {
        const searchTerm = filters.search.toLowerCase();
        const matchesSearch = 
          transaction.description?.toLowerCase().includes(searchTerm) ||
          transaction.reference?.toLowerCase().includes(searchTerm) ||
          transaction.payee?.toLowerCase().includes(searchTerm) ||
          transaction.payer?.toLowerCase().includes(searchTerm);
        if (!matchesSearch) return false;
      }

      // Account filter
      if (filters.accountId && transaction.accountId !== filters.accountId) {
        return false;
      }

      // Category filter  
      if (filters.categoryId && transaction.categoryId !== filters.categoryId) {
        return false;
      }

      // Transaction Group filter
      if (filters.transactionGroupId && transaction.transactionGroupId !== filters.transactionGroupId) {
        return false;
      }

      // Subcategory filter
      if (filters.subcategoryId && transaction.subcategoryId !== filters.subcategoryId) {
        return false;
      }

      // Date range filter
      if (filters.dateFrom && new Date(transaction.date) < new Date(filters.dateFrom)) {
        return false;
      }
      if (filters.dateTo && new Date(transaction.date) > new Date(filters.dateTo)) {
        return false;
      }

      // Amount range filter
      if (filters.amountMin && Math.abs(transaction.amount) < parseFloat(filters.amountMin)) {
        return false;
      }
      if (filters.amountMax && Math.abs(transaction.amount) > parseFloat(filters.amountMax)) {
        return false;
      }

      // Reconciliation reference filter
      if (filters.reconciliationReference && transaction.reconciliationReference !== filters.reconciliationReference) {
        return false;
      }

      // Tag filter
      if (filters.tagId && transaction.tagId !== filters.tagId) {
        return false;
      }

      // Reference filter
      if (filters.reference) {
        const searchTerm = filters.reference.toLowerCase();
        const transactionRef = (transaction.reference || '').toLowerCase();
        if (!transactionRef.includes(searchTerm)) {
          return false;
        }
      }

      return true;
    });
  }, [reconciledTransactions, filters]);

  const formatCurrency = (amount, transaction) => {
    // Get the account for this transaction to format with correct currency
    const account = accounts.find(a => a.id === transaction.accountId);
    
    if (numberFormatService && account?.currencyId) {
      return numberFormatService.formatCurrency(amount, account.currencyId);
    }
    
    // Fallback formatting
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const getAccountName = (accountId) => {
    const account = accounts.find(a => a.id === accountId);
    return account ? account.name : 'Unknown Account';
  };

  const getCategoryName = (categoryId) => {
    const category = categories.find(c => c.id === categoryId);
    return category ? category.name : 'Unknown Category';
  };

  const getTransactionGroupName = (transactionGroupId) => {
    const group = getActiveTransactionGroups().find(g => g.id === transactionGroupId);
    return group ? group.name : 'Unknown Group';
  };

  const getSubcategoryName = (subcategoryId) => {
    const subcategory = getActiveSubcategories().find(s => s.id === subcategoryId);
    return subcategory ? subcategory.name : 'Unknown Subcategory';
  };

  const getTagName = (tagId) => {
    const tag = tags.find(t => t.id === tagId);
    return tag ? tag.name : 'Unknown Tag';
  };

  // Handle transaction selection for un-reconcile
  const handleTransactionSelect = (transactionId) => {
    setSelectedTransactions(prev => {
      const newSelected = new Set(prev);
      if (newSelected.has(transactionId)) {
        newSelected.delete(transactionId);
      } else {
        newSelected.add(transactionId);
      }
      return newSelected;
    });
  };

  // Handle select all/none
  const handleSelectAll = () => {
    if (selectedTransactions.size === filteredTransactions.length) {
      // Deselect all
      setSelectedTransactions(new Set());
    } else {
      // Select all filtered transactions
      const allIds = new Set(filteredTransactions.map(t => t.id));
      setSelectedTransactions(allIds);
    }
  };

  // Handle complete un-reconcile operation
  const handleCompleteUnReconcile = async () => {
    if (selectedTransactions.size === 0) {
      alert('Please select transactions to un-reconcile.');
      return;
    }

    const confirmMessage = `Are you sure you want to un-reconcile ${selectedTransactions.size} transaction${selectedTransactions.size > 1 ? 's' : ''}? This will remove their reconciliation reference.`;
    if (!confirm(confirmMessage)) {
      return;
    }

    setIsProcessing(true);
    try {
      // Un-reconcile each selected transaction
      for (const transactionId of selectedTransactions) {
        await unreconcileTransaction(transactionId);
      }
      
      // Clear selection
      setSelectedTransactions(new Set());
      
      alert(`Successfully un-reconciled ${selectedTransactions.size} transaction${selectedTransactions.size > 1 ? 's' : ''}.`);
    } catch (error) {
      console.error('Error un-reconciling transactions:', error);
      alert('Error un-reconciling transactions. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBackToReconciliation = () => {
    window.location.hash = '#reconciliation';
  };

  // Calculate total amount of filtered transactions
  const totalAmount = useMemo(() => {
    return filteredTransactions.reduce((sum, transaction) => {
      const amount = transaction.amount || 0;
      // CREDIT transactions are positive, DEBIT transactions are negative
      if (transaction.transactionType === 'CREDIT') {
        return sum + Math.abs(amount);
      } else if (transaction.transactionType === 'DEBIT') {
        return sum - Math.abs(amount);
      } else {
        // For undefined transaction types, use the raw amount
        return sum + amount;
      }
    }, 0);
  }, [filteredTransactions]);

  return (
    <div className="reconciliation-page">
      <div style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <h2>{t('existingReconciliations')}</h2>
        <button 
          className="btn btn-secondary"
          onClick={handleBackToReconciliation}
          style={{ padding: '0.75rem', borderRadius: '6px' }}
        >
          {t('backToReconciliation')}
        </button>
        <button 
          className="btn btn-primary"
          onClick={handleCompleteUnReconcile}
          disabled={selectedTransactions.size === 0 || isProcessing}
          style={{ padding: '0.75rem', borderRadius: '6px' }}
        >
          {isProcessing ? t('processing') : `${t('unReconcile')} (${selectedTransactions.size})`}
        </button>
      </div>

      <div className="reconciliation-transaction-list">
        {/* Filters */}
        <div className="transaction-filters">
          <div className="filter-row">
            <div className="filter-field">
              <input
                type="text"
                placeholder={t('searchTransactions')}
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                className="filter-input"
              />
            </div>
            
            <div className="filter-field">
              <select
                value={filters.accountId}
                onChange={(e) => setFilters(prev => ({ ...prev, accountId: e.target.value }))}
                className="filter-select"
              >
                <option value="">{t('allAccounts')}</option>
                {accounts.map(account => (
                  <option key={account.id} value={account.id}>
                    {account.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="filter-field">
              <select
                value={filters.categoryId}
                onChange={(e) => setFilters(prev => ({ ...prev, categoryId: e.target.value }))}
                className="filter-select"
              >
                <option value="">{t('allTransactionTypes')}</option>
                {categories.map(category => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="filter-field">
              <select
                value={filters.transactionGroupId}
                onChange={(e) => setFilters(prev => ({ ...prev, transactionGroupId: e.target.value }))}
                className="filter-select"
              >
                <option value="">{t('allTransactionGroups')}</option>
                {getActiveTransactionGroups().map(group => (
                  <option key={group.id} value={group.id}>
                    {group.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="filter-field">
              <select
                value={filters.subcategoryId}
                onChange={(e) => setFilters(prev => ({ ...prev, subcategoryId: e.target.value }))}
                className="filter-select"
              >
                <option value="">{t('allCategories')}</option>
                {getActiveSubcategories().map(subcategory => (
                  <option key={subcategory.id} value={subcategory.id}>
                    {subcategory.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="filter-field">
              <select
                value={filters.reconciliationReference}
                onChange={(e) => setFilters(prev => ({ ...prev, reconciliationReference: e.target.value }))}
                className="filter-select"
              >
                <option value="">{t('allRefs')}</option>
                {uniqueReconciliationReferences.map(reference => (
                  <option key={reference} value={reference}>
                    {reference}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="filter-row">
            <div className="filter-field">
              <DatePicker
                selected={selectedDateFrom}
                onChange={handleDateFromChange}
                dateFormat={datePickerFormat}
                className="filter-input"
                placeholderText={`${t('fromDate')} (${userDateFormat})`}
                isClearable={true}
                showPopperArrow={false}
              />
            </div>

            <div className="filter-field">
              <DatePicker
                selected={selectedDateTo}
                onChange={handleDateToChange}
                dateFormat={datePickerFormat}
                className="filter-input"
                placeholderText={`${t('toDate')} (${userDateFormat})`}
                isClearable={true}
                showPopperArrow={false}
              />
            </div>

            <div className="filter-field">
              <input
                type="number"
                step="0.01"
                value={filters.amountMin}
                onChange={(e) => setFilters(prev => ({ ...prev, amountMin: e.target.value }))}
                className="filter-input"
                placeholder={t('minAmount')}
                onWheel={(e) => e.target.blur()}
              />
            </div>

            <div className="filter-field">
              <input
                type="number"
                step="0.01"
                value={filters.amountMax}
                onChange={(e) => setFilters(prev => ({ ...prev, amountMax: e.target.value }))}
                className="filter-input"
                placeholder={t('maxAmount')}
                onWheel={(e) => e.target.blur()}
              />
            </div>

            <div className="filter-field">
              <Autocomplete
                value={(() => {
                  if (filters.tagId) {
                    const selectedTag = tags.find(tag => tag.id === filters.tagId);
                    return selectedTag ? selectedTag.name : '';
                  }
                  return '';
                })()}
                onChange={(value) => {
                  if (value === '') {
                    setFilters(prev => ({ ...prev, tagId: '' }));
                  } else {
                    const matchedTag = tags.find(tag => tag.name.toLowerCase() === value.toLowerCase());
                    setFilters(prev => ({ ...prev, tagId: matchedTag ? matchedTag.id : '' }));
                  }
                }}
                onSelect={(option, value, label) => {
                  setFilters(prev => ({ ...prev, tagId: value }));
                }}
                options={[{ id: '', name: t('allTags') }, ...tags.filter(tag => tag.isActive !== false)]}
                placeholder={t('filterByTag')}
                getOptionLabel={(option) => option.name}
                getOptionValue={(option) => option.id}
                className="filter-input"
              />
            </div>

            <div className="filter-field">
              <input
                type="text"
                value={filters.reference}
                onChange={(e) => setFilters(prev => ({ ...prev, reference: e.target.value }))}
                className="filter-input"
                placeholder={t('transactionReference')}
              />
            </div>
          </div>

        </div>

        {/* Transaction Summary */}
        {filteredTransactions.length > 0 && (
          <div className="transaction-summary">
            <div className="summary-row">
              <span className="summary-label">
                Total of {filteredTransactions.length} reconciled transaction{filteredTransactions.length !== 1 ? 's' : ''}:
              </span>
              <span className={`summary-amount ${totalAmount < 0 ? 'negative' : 'positive'}`}>
                {formatCurrency(totalAmount, filteredTransactions[0])}
              </span>
            </div>
          </div>
        )}

        {/* Transaction Table */}
        <div className="transactions-table">
          {filteredTransactions.length === 0 ? (
            <div className="no-transactions">
              <p>{t('noReconciledTransactions')}</p>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th style={{ width: '100px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', flexDirection: 'column', gap: '4px' }}>
                      <span>{t('unReconcile')}</span>
                      <input
                        type="checkbox"
                        checked={selectedTransactions.size === filteredTransactions.length && filteredTransactions.length > 0}
                        onChange={handleSelectAll}
                        className="white-checkbox"
                      />
                    </div>
                  </th>
                  <th>{t('date')}</th>
                  <th>{t('description')}</th>
                  <th>{t('account')}</th>
                  <th>{t('category')}</th>
                  <th>{t('amount')}</th>
                  <th>{t('reference')}</th>
                  <th>{t('reconciliationRef')}</th>
                  <th>{t('reconciledDate')}</th>
                </tr>
              </thead>
              <tbody>
                {filteredTransactions.map(transaction => (
                  <tr 
                    key={transaction.id} 
                    className="reconciled-row"
                  >
                    <td style={{ textAlign: 'center', padding: '8px', verticalAlign: 'middle' }}>
                      <input
                        type="checkbox"
                        checked={selectedTransactions.has(transaction.id)}
                        onChange={() => handleTransactionSelect(transaction.id)}
                        className="white-checkbox"
                      />
                    </td>
                    <td>{formatDate(transaction.date)}</td>
                    <td className="description-cell">
                      <div className="description-main">{transaction.description}</div>
                      {transaction.payee && (
                        <div className="description-detail">To: {transaction.payee}</div>
                      )}
                      {transaction.payer && (
                        <div className="description-detail">From: {transaction.payer}</div>
                      )}
                    </td>
                    <td>{getAccountName(transaction.accountId)}</td>
                    <td>{getCategoryName(transaction.categoryId)}</td>
                    <td className={`amount-cell ${transaction.transactionType === 'CREDIT' ? 'positive' : transaction.transactionType === 'DEBIT' ? 'negative' : ''}`}>
                      {formatCurrency(transaction.amount, transaction)}
                    </td>
                    <td>{transaction.reference || '—'}</td>
                    <td>
                      <span className="reconciled-status reconciled">
                        {transaction.reconciliationReference}
                      </span>
                    </td>
                    <td>
                      {transaction.reconciledAt ? formatDate(transaction.reconciledAt) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default ExistingReconciliationsPage;