import React, { useState, useMemo } from 'react';
import { useAccounting } from '../contexts/AccountingContext';
import { useLanguage } from '../contexts/LanguageContext';
import TransactionEditModal from './TransactionEditModal';
import './TransactionReviewQueue.css';

const TransactionReviewQueue = ({ transactions, onBack, onReset, ruleProcessingStats }) => {
  const { accounts, addTransaction, categories, currencies, transactionTypes, subcategories, transactionGroups, numberFormatService } = useAccounting();
  const { t } = useLanguage();
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
    if (transaction.status === 'error') return t('error');
    if (transaction.isDuplicate) return t('duplicate');
    if (transaction.status === 'warning') return t('needsAttention');
    return t('ready');
  };

  const formatAmount = (amount, currencyId = 'CUR_002') => {
    // Use the application's number format service
    if (numberFormatService && currencyId) {
      return numberFormatService.formatCurrency(amount, currencyId);
    }
    
    // Fallback to Intl.NumberFormat
    const currency = currencies.find(c => c.id === currencyId);
    const currencyCode = currency?.code || 'USD';
    
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode
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
    const selectedCategory = categories.find(c => c.id === transaction.categoryId);

    // Always required fields
    if (!transaction.date) {
      errors.push(t('missingOrInvalidDate'));
    }

    if (!transaction.description || transaction.description.trim() === '') {
      errors.push(t('missingDescription'));
    }

    if (transaction.amount === 0 || isNaN(transaction.amount)) {
      errors.push(t('invalidAmount'));
    }

    if (!transaction.subcategoryId) {
      errors.push(t('missingTransactionCategory'));
    }

    if (!transaction.categoryId) {
      errors.push(t('missingTransactionType'));
    }

    if (!transaction.transactionGroup) {
      errors.push(t('missingTransactionGroup'));
    }

    // Account validation
    if (!transaction.fromAccountId) {
      errors.push(t('accountRequired'));
    }

    // Transaction type specific validations
    if (selectedCategory) {
      const shouldShowDestinationAccount = selectedCategory.name === 'Transfer' || 
                                           selectedCategory.name === 'Investment - SELL' || 
                                           selectedCategory.name === 'Investment - BUY';
      
      const isInvestmentTransaction = selectedCategory.name === 'Investment - SELL' || 
                                      selectedCategory.name === 'Investment - BUY';

      if (shouldShowDestinationAccount && !transaction.destinationAccountId) {
        errors.push(t('destinationAccountRequired'));
      }

      if (isInvestmentTransaction && (!transaction.destinationAmount || transaction.destinationAmount === 0)) {
        errors.push(t('destinationAmountRequired'));
      }

      if (selectedCategory.name === 'Income' && !transaction.payer) {
        errors.push(t('payerRequiredForIncome'));
      }

      if (selectedCategory.name === 'Expenses' && !transaction.payee) {
        errors.push(t('payeeRequiredForExpenses'));
      }

      // Investment broker validation
      if (isInvestmentTransaction) {
        if (selectedCategory.name === 'Investment - SELL' && !transaction.payer) {
          errors.push('Payer (broker) is required');
        } else if (selectedCategory.name === 'Investment - BUY' && !transaction.payee) {
          errors.push('Payee (broker) is required');
        }
      }
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
          accountId: transaction.fromAccountId, // Map fromAccountId to accountId for database
          fromAccountId: transaction.fromAccountId,
          toAccountId: transaction.toAccountId,
          destinationAccountId: transaction.destinationAccountId,
          destinationAmount: transaction.destinationAmount,
          transactionType: transaction.transactionType,
          transactionGroup: transaction.transactionGroup,
          categoryId: transaction.categoryId,
          subcategoryId: transaction.subcategoryId,
          payee: transaction.payee,
          payer: transaction.payer,
          tag: transaction.tag,
          currencyId: transaction.currencyId || 'CUR_001',
          reference: transaction.reference,
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
          <h3>{t('reviewTransactions')}</h3>
          <p>{t('reviewAndApprove').replace('{count}', transactions.length)}</p>
        </div>
        <div className="review-actions">
          <button className="btn btn-secondary" onClick={onBack}>
            {t('back')}
          </button>
          <button className="btn btn-secondary" onClick={onReset}>
            {t('startOver')}
          </button>
        </div>
      </div>

      <div className="review-stats">
        <div className="stat-item">
          <span className="stat-icon">📊</span>
          <span className="stat-label">{t('total')}</span>
          <span className="stat-value">{transactions.length}</span>
        </div>
        <div className="stat-item ready">
          <span className="stat-icon">🟢</span>
          <span className="stat-label">{t('ready')}:</span>
          <span className="stat-value">{statusCounts.ready}</span>
        </div>
        <div className="stat-item warning">
          <span className="stat-icon">🟡</span>
          <span className="stat-label">{t('warning')}:</span>
          <span className="stat-value">{statusCounts.warning}</span>
        </div>
        <div className="stat-item error">
          <span className="stat-icon">🔴</span>
          <span className="stat-label">{t('error')}:</span>
          <span className="stat-value">{statusCounts.error}</span>
        </div>
        <div className="stat-item duplicate">
          <span className="stat-icon">🔵</span>
          <span className="stat-label">{t('duplicates')}</span>
          <span className="stat-value">{statusCounts.duplicate}</span>
        </div>
        {ruleProcessingStats && (
          <>
            <div className="stat-item rules-applied">
              <span className="stat-icon">⚙️</span>
              <span className="stat-label">{t('rulesApplied')}</span>
              <span className="stat-value">{ruleProcessingStats.totalRulesApplied}</span>
            </div>
            <div className="stat-item transactions-processed">
              <span className="stat-icon">🔄</span>
              <span className="stat-label">{t('processed')}:</span>
              <span className="stat-value">{ruleProcessingStats.transactionsWithRules}</span>
            </div>
            <div className="stat-item skipped">
              <span className="stat-icon">🚫</span>
              <span className="stat-label">{t('skipped')}:</span>
              <span className="stat-value">{ruleProcessingStats.skippedTransactions}</span>
            </div>
          </>
        )}
      </div>

      <div className="review-controls">
        <div className="filter-controls">
          <select 
            value={filter} 
            onChange={(e) => setFilter(e.target.value)}
            className="filter-select"
          >
            <option value="all">{t('allTransactions')}</option>
            <option value="ready">{t('readyTransactions')} ({statusCounts.ready})</option>
            <option value="warning">{t('needsAttention')} ({statusCounts.warning})</option>
            <option value="error">{t('errorTransactions')} ({statusCounts.error})</option>
            <option value="duplicate">{t('duplicateTransactions')} ({statusCounts.duplicate})</option>
          </select>
        </div>

        <div className="bulk-controls">
          <button 
            className="btn btn-secondary btn-small"
            onClick={handleSelectAll}
          >
            {selectedIds.size === filteredTransactions.length ? t('deselectAll') : t('selectReady')}
          </button>
          <span className="selected-count">
            {selectedIds.size} {t('selected')}
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
                    <span className="transaction-reference">{t('ref')} {transaction.reference}</span>
                  )}
                  {transaction.rulesApplied && transaction.rulesApplied.length > 0 && (
                    <span className="transaction-rules-applied">
                      ⚙️ {transaction.rulesApplied.length} {transaction.rulesApplied.length > 1 ? t('rules') : t('rule')} {transaction.rulesApplied.length > 1 ? t('appliedPlural') : t('applied')}
                    </span>
                  )}
                  <span className="transaction-file">{t('file')} {transaction.fileName}</span>
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
                  {t('edit')}
                </button>
              </div>
            </div>
          ))}
        </div>

        {selectedTransaction && (
          <div className="transaction-preview">
            <h4>{t('transactionDetails')}</h4>
            <div className="preview-content">
              <div className="preview-field">
                <label>{t('date')}</label>
                <span>{selectedTransaction.date}</span>
              </div>
              <div className="preview-field">
                <label>{t('description')}</label>
                <span>{selectedTransaction.description}</span>
              </div>
              <div className="preview-field">
                <label>{t('amount')}</label>
                <span>{formatAmount(selectedTransaction.amount)}</span>
              </div>
              {selectedTransaction.reference && (
                <div className="preview-field">
                  <label>{t('reference')}</label>
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
            <p className="progress-text">{t('progressText').replace('{progress}', Math.round(importProgress))}</p>
          </div>
        )}

        <button 
          className="btn btn-primary btn-large"
          onClick={handleImportSelected}
          disabled={selectedIds.size === 0 || importing}
        >
          {importing ? t('importing') : t('importSelectedTransactions').replace('{count}', selectedIds.size)}
        </button>
      </div>

      {editingTransaction && (
        <TransactionEditModal
          transaction={editingTransaction}
          accounts={accounts}
          categories={categories}
          currencies={currencies}
          transactionTypes={transactionTypes}
          subcategories={subcategories}
          transactionGroups={transactionGroups}
          onSave={handleUpdateTransaction}
          onClose={() => setEditingTransaction(null)}
        />
      )}
    </div>
  );
};

export default TransactionReviewQueue;