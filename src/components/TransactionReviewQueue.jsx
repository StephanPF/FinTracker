import React, { useState, useMemo } from 'react';
import { useAccounting } from '../contexts/AccountingContext';
import TransactionEditModal from './TransactionEditModal';
import './TransactionReviewQueue.css';

const TransactionReviewQueue = ({ transactions, onBack, onReset }) => {
  const { accounts, addTransaction, categories, currencies } = useAccounting();
  const [transactionsList, setTransactionsList] = useState(transactions);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [filter, setFilter] = useState('all');
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);

  // Filter transactions based on status
  const filteredTransactions = useMemo(() => {
    if (filter === 'all') return transactionsList;
    
    return transactionsList.filter(t => {
      switch (filter) {
        case 'ready': return t.status === 'ready';
        case 'warning': return t.status === 'warning';
        case 'error': return t.status === 'error';
        case 'duplicate': return t.isDuplicate;
        default: return true;
      }
    });
  }, [transactionsList, filter]);

  // Count transactions by status
  const statusCounts = useMemo(() => {
    const counts = { ready: 0, warning: 0, error: 0, duplicate: 0 };
    transactionsList.forEach(t => {
      if (t.status === 'ready') counts.ready++;
      if (t.status === 'warning') counts.warning++;
      if (t.status === 'error') counts.error++;
      if (t.isDuplicate) counts.duplicate++;
    });
    return counts;
  }, [transactionsList]);

  const getStatusIcon = (transaction) => {
    if (transaction.status === 'error') return '🔴';
    if (transaction.isDuplicate) return '🔵';
    if (transaction.status === 'warning') return '🟡';
    return '🟢';
  };

  const getStatusText = (transaction) => {
    if (transaction.status === 'error') return 'Error';
    if (transaction.isDuplicate) return 'Duplicate';
    if (transaction.status === 'warning') return 'Needs Attention';
    return 'Ready';
  };

  const formatAmount = (amount, currency = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount);
  };

  const handleSelectAll = () => {
    if (selectedIds.size === filteredTransactions.length) {
      setSelectedIds(new Set());
    } else {
      const readyIds = filteredTransactions
        .filter(t => t.status === 'ready')
        .map(t => t.id);
      setSelectedIds(new Set(readyIds));
    }
  };

  const handleSelectTransaction = (transactionId) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(transactionId)) {
      newSelected.delete(transactionId);
    } else {
      newSelected.add(transactionId);
    }
    setSelectedIds(newSelected);
  };

  const handleTransactionClick = (transaction) => {
    setSelectedTransaction(transaction);
  };

  const handleEditTransaction = (transaction) => {
    setEditingTransaction(transaction);
  };

  const validateTransactionForUpdate = (transaction) => {
    const errors = [];
    const warnings = [];

    if (!transaction.date) {
      errors.push('Missing or invalid date');
    }

    if (!transaction.description || transaction.description.trim() === '') {
      errors.push('Missing description');
    }

    if (transaction.amount === 0 || isNaN(transaction.amount)) {
      errors.push('Invalid amount');
    }

    if (!transaction.fromAccountId && !transaction.toAccountId) {
      warnings.push('No account mapping - will need manual assignment');
    }

    return { errors, warnings };
  };

  const handleUpdateTransaction = (updatedTransaction) => {
    // Re-validate the updated transaction
    const validation = validateTransactionForUpdate(updatedTransaction);
    
    // Update status based on validation
    let status = 'ready';
    if (validation.errors.length > 0) {
      status = 'error';
    } else if (validation.warnings.length > 0) {
      status = 'warning';
    }

    const finalTransaction = {
      ...updatedTransaction,
      status,
      validation,
      updatedAt: new Date().toISOString()
    };

    // Update the transaction in the list
    setTransactionsList(prevTransactions => 
      prevTransactions.map(t => 
        t.id === updatedTransaction.id ? finalTransaction : t
      )
    );
    
    // Update selected transaction if it's the same one
    if (selectedTransaction?.id === updatedTransaction.id) {
      setSelectedTransaction(finalTransaction);
    }
    
    setEditingTransaction(null);
  };

  const handleImportSelected = async () => {
    const selectedTransactions = transactionsList.filter(t => selectedIds.has(t.id));
    if (selectedTransactions.length === 0) {
      alert('Please select transactions to import');
      return;
    }

    // Validate that all selected transactions have required account assignments
    const transactionsWithoutAccounts = selectedTransactions.filter(t => 
      !t.fromAccountId && !t.toAccountId
    );

    if (transactionsWithoutAccounts.length > 0) {
      alert(`${transactionsWithoutAccounts.length} selected transactions are missing account assignments. Please edit them to assign accounts before importing.`);
      return;
    }

    setImporting(true);
    setImportProgress(0);

    try {
      for (let i = 0; i < selectedTransactions.length; i++) {
        const transaction = selectedTransactions[i];
        
        // Convert to database format
        const dbTransaction = {
          date: transaction.date,
          description: transaction.description,
          amount: transaction.amount,
          fromAccountId: transaction.fromAccountId,
          toAccountId: transaction.toAccountId,
          currencyId: transaction.currencyId || 'CUR_001',
          reference: transaction.reference,
          categoryId: transaction.categoryId,
          subcategoryId: transaction.subcategoryId,
          tags: transaction.tags || [],
          notes: transaction.notes || `Imported from ${transaction.fileName}`
        };

        await addTransaction(dbTransaction);
        setImportProgress(((i + 1) / selectedTransactions.length) * 100);
      }

      alert(`Successfully imported ${selectedTransactions.length} transactions!`);
      onReset(); // Go back to start
      
    } catch (error) {
      console.error('Error importing transactions:', error);
      alert('Error importing transactions: ' + error.message);
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="transaction-review-queue">
      <div className="review-header">
        <div className="review-title">
          <h3>Review Transactions</h3>
          <p>Review and approve {transactions.length} parsed transactions before importing</p>
        </div>
        <div className="review-actions">
          <button className="btn btn-secondary" onClick={onBack}>
            ← Back
          </button>
          <button className="btn btn-secondary" onClick={onReset}>
            Start Over
          </button>
        </div>
      </div>

      <div className="review-stats">
        <div className="stat-item">
          <span className="stat-icon">📊</span>
          <span className="stat-label">Total:</span>
          <span className="stat-value">{transactions.length}</span>
        </div>
        <div className="stat-item ready">
          <span className="stat-icon">🟢</span>
          <span className="stat-label">Ready:</span>
          <span className="stat-value">{statusCounts.ready}</span>
        </div>
        <div className="stat-item warning">
          <span className="stat-icon">🟡</span>
          <span className="stat-label">Warning:</span>
          <span className="stat-value">{statusCounts.warning}</span>
        </div>
        <div className="stat-item error">
          <span className="stat-icon">🔴</span>
          <span className="stat-label">Error:</span>
          <span className="stat-value">{statusCounts.error}</span>
        </div>
        <div className="stat-item duplicate">
          <span className="stat-icon">🔵</span>
          <span className="stat-label">Duplicates:</span>
          <span className="stat-value">{statusCounts.duplicate}</span>
        </div>
      </div>

      <div className="review-controls">
        <div className="filter-controls">
          <select 
            value={filter} 
            onChange={(e) => setFilter(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Transactions</option>
            <option value="ready">Ready ({statusCounts.ready})</option>
            <option value="warning">Needs Attention ({statusCounts.warning})</option>
            <option value="error">Errors ({statusCounts.error})</option>
            <option value="duplicate">Duplicates ({statusCounts.duplicate})</option>
          </select>
        </div>

        <div className="bulk-controls">
          <button 
            className="btn btn-secondary btn-small"
            onClick={handleSelectAll}
          >
            {selectedIds.size === filteredTransactions.length ? 'Deselect All' : 'Select Ready'}
          </button>
          <span className="selected-count">
            {selectedIds.size} selected
          </span>
        </div>
      </div>

      <div className="review-content">
        <div className="transactions-list">
          {filteredTransactions.map((transaction) => (
            <div 
              key={transaction.id}
              className={`transaction-item ${transaction.status} ${selectedTransaction?.id === transaction.id ? 'active' : ''}`}
              onClick={() => handleTransactionClick(transaction)}
            >
              <div className="transaction-checkbox">
                <input
                  type="checkbox"
                  checked={selectedIds.has(transaction.id)}
                  onChange={() => handleSelectTransaction(transaction.id)}
                  onClick={(e) => e.stopPropagation()}
                  disabled={transaction.status === 'error'}
                />
              </div>

              <div className="transaction-status">
                <span className="status-icon">{getStatusIcon(transaction)}</span>
              </div>

              <div className="transaction-details">
                <div className="transaction-primary">
                  <span className="transaction-date">{transaction.date}</span>
                  <span className="transaction-description">{transaction.description}</span>
                  <span className="transaction-amount">
                    {formatAmount(transaction.amount)}
                  </span>
                </div>
                <div className="transaction-secondary">
                  <span className="transaction-status-text">{getStatusText(transaction)}</span>
                  {transaction.reference && (
                    <span className="transaction-reference">Ref: {transaction.reference}</span>
                  )}
                  <span className="transaction-file">File: {transaction.fileName}</span>
                </div>
              </div>

              <div className="transaction-actions">
                <button 
                  className="btn btn-small btn-secondary"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEditTransaction(transaction);
                  }}
                >
                  Edit
                </button>
              </div>
            </div>
          ))}
        </div>

        {selectedTransaction && (
          <div className="transaction-preview">
            <h4>Transaction Details</h4>
            <div className="preview-content">
              <div className="preview-field">
                <label>Date:</label>
                <span>{selectedTransaction.date}</span>
              </div>
              <div className="preview-field">
                <label>Description:</label>
                <span>{selectedTransaction.description}</span>
              </div>
              <div className="preview-field">
                <label>Amount:</label>
                <span>{formatAmount(selectedTransaction.amount)}</span>
              </div>
              {selectedTransaction.reference && (
                <div className="preview-field">
                  <label>Reference:</label>
                  <span>{selectedTransaction.reference}</span>
                </div>
              )}
              {selectedTransaction.merchant && (
                <div className="preview-field">
                  <label>Merchant:</label>
                  <span>{selectedTransaction.merchant}</span>
                </div>
              )}
              <div className="preview-field">
                <label>Status:</label>
                <span className={`status-badge ${selectedTransaction.status}`}>
                  {getStatusIcon(selectedTransaction)} {getStatusText(selectedTransaction)}
                </span>
              </div>
              
              {selectedTransaction.validation?.errors?.length > 0 && (
                <div className="validation-errors">
                  <label>Errors:</label>
                  <ul>
                    {selectedTransaction.validation.errors.map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                </div>
              )}

              {selectedTransaction.validation?.warnings?.length > 0 && (
                <div className="validation-warnings">
                  <label>Warnings:</label>
                  <ul>
                    {selectedTransaction.validation.warnings.map((warning, index) => (
                      <li key={index}>{warning}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="preview-field">
                <label>Raw Data:</label>
                <pre className="raw-data">
                  {JSON.stringify(selectedTransaction.rawData, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="import-actions">
        {importing && (
          <div className="import-progress">
            <div className="progress-bar">
              <div 
                className="progress-fill" 
                style={{ width: `${importProgress}%` }}
              ></div>
            </div>
            <p className="progress-text">Importing... {Math.round(importProgress)}%</p>
          </div>
        )}

        <button 
          className="btn btn-primary btn-large"
          onClick={handleImportSelected}
          disabled={selectedIds.size === 0 || importing}
        >
          {importing ? 'Importing...' : `Import ${selectedIds.size} Selected Transactions`}
        </button>
      </div>

      {editingTransaction && (
        <TransactionEditModal
          transaction={editingTransaction}
          accounts={accounts}
          categories={categories}
          currencies={currencies}
          onSave={handleUpdateTransaction}
          onClose={() => setEditingTransaction(null)}
        />
      )}
    </div>
  );
};

export default TransactionReviewQueue;