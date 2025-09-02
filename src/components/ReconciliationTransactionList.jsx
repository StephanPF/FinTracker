import React, { useState, useMemo, useEffect } from 'react';
import { useAccounting } from '../contexts/AccountingContext';
import { useDate } from '../hooks/useDate';
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import './ReconciliationTransactionList.css';

const ReconciliationTransactionList = ({ selectedTransactions, onTransactionToggle, accountId, selectedAccount }) => {
  const { getUnreconciledTransactions, transactions, accounts, categories, getActiveTransactionGroups, getActiveSubcategories, tags, numberFormatService } = useAccounting();
  const { formatDate } = useDate();
  
  // Filter state (reuse similar logic to TransactionList)
  // Pre-select the account filter with the selected account and make it non-editable
  const [filters, setFilters] = useState({
    search: '',
    accountId: accountId || '',
    categoryId: '',
    transactionGroupId: '',
    subcategoryId: '',
    dateFrom: '',
    dateTo: '',
    amountMin: '',
    amountMax: '',
    reconciliationReference: '',
    tagId: '',
    reference: '',
    showReconciled: 'hide'  // New filter: 'hide' or 'show' reconciled transactions
  });

  // Date picker states
  const [selectedDateFrom, setSelectedDateFrom] = useState(null);
  const [selectedDateTo, setSelectedDateTo] = useState(null);

  // Update filter when accountId prop changes
  useEffect(() => {
    setFilters(prev => ({ ...prev, accountId: accountId || '' }));
  }, [accountId]);

  // Handle date picker changes
  const handleDateFromChange = (date) => {
    setSelectedDateFrom(date);
    setFilters(prev => ({ 
      ...prev, 
      dateFrom: date ? date.toISOString().split('T')[0] : '' 
    }));
  };

  const handleDateToChange = (date) => {
    setSelectedDateTo(date);
    setFilters(prev => ({ 
      ...prev, 
      dateTo: date ? date.toISOString().split('T')[0] : '' 
    }));
  };

  // Get transactions for the selected account based on reconciliation filter
  const accountTransactions = useMemo(() => {
    if (filters.showReconciled === 'show') {
      // Show all transactions for this account (both reconciled and unreconciled)
      return transactions.filter(t => t.accountId === accountId);
    } else {
      // Show only unreconciled transactions (existing behavior)
      return getUnreconciledTransactions(accountId);
    }
  }, [transactions, accountId, filters.showReconciled, getUnreconciledTransactions]);

  // Filter transactions
  const filteredTransactions = useMemo(() => {
    return accountTransactions.filter(transaction => {
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
      if (filters.reconciliationReference) {
        const searchTerm = filters.reconciliationReference.toLowerCase();
        const transactionRef = (transaction.reconciliationReference || '').toLowerCase();
        if (!transactionRef.includes(searchTerm)) {
          return false;
        }
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
  }, [accountTransactions, filters]);

  const formatCurrency = (amount) => {
    // Use the application's number format service with the selected account's currency
    if (numberFormatService && selectedAccount?.currencyId) {
      return numberFormatService.formatCurrency(amount, selectedAccount.currencyId);
    }
    
    // Fallback to Intl.NumberFormat if services not available
    const currencyCode = selectedAccount?.currency?.code || 'USD';
    const locale = selectedAccount?.currency?.locale || 'en-US';
    
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currencyCode
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

  const handleSelectAll = () => {
    const allSelected = filteredTransactions.every(t => selectedTransactions.has(t.id));
    
    if (allSelected) {
      // Deselect all filtered transactions
      filteredTransactions.forEach(t => {
        if (selectedTransactions.has(t.id)) {
          onTransactionToggle(t);
        }
      });
    } else {
      // Select all unselected filtered transactions
      filteredTransactions.forEach(t => {
        if (!selectedTransactions.has(t.id)) {
          onTransactionToggle(t);
        }
      });
    }
  };

  return (
    <div className="reconciliation-transaction-list">
      {/* Filters */}
      <div className="transaction-filters">
        <div className="filter-row">
          <div className="filter-field">
            <input
              type="text"
              placeholder="Search transactions..."
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              className="filter-input"
            />
          </div>
          
          <div className="filter-field">
            <select
              value={filters.showReconciled}
              onChange={(e) => setFilters(prev => ({ ...prev, showReconciled: e.target.value }))}
              className="filter-select"
            >
              <option value="hide">Hide Reconciled Transactions</option>
              <option value="show">Show Reconciled Transactions</option>
            </select>
          </div>
          
          <div className="filter-field">
            <select
              value={filters.accountId}
              onChange={(e) => setFilters(prev => ({ ...prev, accountId: e.target.value }))}
              className="filter-select"
              disabled={true}
              style={{ 
                backgroundColor: '#f8f9fa', 
                color: '#6c757d',
                cursor: 'not-allowed'
              }}
            >
              {selectedAccount ? (
                <option value={selectedAccount.id}>
                  {selectedAccount.name} (Selected Account)
                </option>
              ) : (
                <option value="">No Account Selected</option>
              )}
            </select>
          </div>

          <div className="filter-field">
            <select
              value={filters.categoryId}
              onChange={(e) => setFilters(prev => ({ ...prev, categoryId: e.target.value }))}
              className="filter-select"
            >
              <option value="">All Transaction Types</option>
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
              <option value="">All Transaction Groups</option>
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
              <option value="">All Categories</option>
              {getActiveSubcategories().map(subcategory => (
                <option key={subcategory.id} value={subcategory.id}>
                  {subcategory.name}
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
              dateFormat="MM/dd/yyyy"
              className="filter-input"
              placeholderText="From Date"
              isClearable={true}
              showPopperArrow={false}
            />
          </div>

          <div className="filter-field">
            <DatePicker
              selected={selectedDateTo}
              onChange={handleDateToChange}
              dateFormat="MM/dd/yyyy"
              className="filter-input"
              placeholderText="To Date"
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
              placeholder="Min Amount"
            />
          </div>

          <div className="filter-field">
            <input
              type="number"
              step="0.01"
              value={filters.amountMax}
              onChange={(e) => setFilters(prev => ({ ...prev, amountMax: e.target.value }))}
              className="filter-input"
              placeholder="Max Amount"
            />
          </div>

          <div className="filter-field">
            <input
              type="text"
              value={filters.reconciliationReference}
              onChange={(e) => setFilters(prev => ({ ...prev, reconciliationReference: e.target.value }))}
              className="filter-input"
              placeholder="Reconciliation Reference"
            />
          </div>

          <div className="filter-field">
            <select
              value={filters.tagId}
              onChange={(e) => setFilters(prev => ({ ...prev, tagId: e.target.value }))}
              className="filter-select"
            >
              <option value="">All Tags</option>
              {tags.map(tag => (
                <option key={tag.id} value={tag.id}>
                  {tag.name}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-field">
            <input
              type="text"
              value={filters.reference}
              onChange={(e) => setFilters(prev => ({ ...prev, reference: e.target.value }))}
              className="filter-input"
              placeholder="Transaction Reference"
            />
          </div>
        </div>

      </div>

      {/* Transaction Table */}
      <div className="transactions-table">
        {filteredTransactions.length === 0 ? (
          <div className="no-transactions">
            <p>No {filters.showReconciled === 'show' ? '' : 'unreconciled '}transactions found with the current filters.</p>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Select</th>
                <th>Date</th>
                <th>Description</th>
                <th>Account</th>
                <th>Category</th>
                <th>Amount</th>
                <th>Reference</th>
                <th>Reconciled</th>
              </tr>
            </thead>
            <tbody>
              {filteredTransactions.map(transaction => (
                <tr 
                  key={transaction.id} 
                  className={`
                    ${selectedTransactions.has(transaction.id) ? 'selected' : ''}
                    ${transaction.reconciliationReference ? 'reconciled-row' : ''}
                  `.trim()}
                >
                  <td>
                    <input
                      type="checkbox"
                      checked={selectedTransactions.has(transaction.id)}
                      onChange={() => onTransactionToggle(transaction)}
                      disabled={!!transaction.reconciliationReference}
                      style={{
                        cursor: transaction.reconciliationReference ? 'not-allowed' : 'pointer',
                        opacity: transaction.reconciliationReference ? 0.5 : 1
                      }}
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
                  <td className={`amount-cell ${transaction.amount >= 0 ? 'positive' : 'negative'}`}>
                    {formatCurrency(transaction.amount)}
                  </td>
                  <td>{transaction.reference || '—'}</td>
                  <td>
                    {transaction.reconciliationReference ? (
                      <span className="reconciled-status reconciled">
                        ✓ {transaction.reconciliationReference}
                      </span>
                    ) : (
                      <span className="reconciled-status unreconciled">
                        — Not Reconciled
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default ReconciliationTransactionList;