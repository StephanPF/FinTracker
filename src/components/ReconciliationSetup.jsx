import React, { useState } from 'react';
import { useAccounting } from '../contexts/AccountingContext';
import './ReconciliationSetup.css';

const ReconciliationSetup = ({ onStart }) => {
  const { getActiveAccountsWithTypes, currencies, numberFormatService } = useAccounting();
  const [formData, setFormData] = useState({
    reconciliationReference: '',
    bankStatementTotal: '',
    accountId: ''
  });
  const [errors, setErrors] = useState({});

  // Format account balance in native currency for dropdown
  const formatAccountBalance = (account) => {
    const balance = account.balance || 0;
    if (numberFormatService && account.currencyId) {
      return numberFormatService.formatCurrency(balance, account.currencyId);
    }
    // Fallback formatting
    const currency = currencies.find(c => c.id === account.currencyId);
    if (currency) {
      return `${currency.symbol}${balance.toFixed(currency.decimalPlaces || 2)}`;
    }
    return balance.toFixed(2);
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.accountId) {
      newErrors.accountId = 'Account selection is required';
    }

    if (!formData.reconciliationReference.trim()) {
      newErrors.reconciliationReference = 'Reconciliation reference is required';
    }

    if (!formData.bankStatementTotal || isNaN(formData.bankStatementTotal)) {
      newErrors.bankStatementTotal = 'Valid bank statement total is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validateForm()) {
      onStart(formData.reconciliationReference, formData.bankStatementTotal, formData.accountId);
    }
  };

  const generateReference = () => {
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    const reference = `R${month}${year}`;
    setFormData(prev => ({ ...prev, reconciliationReference: reference }));
  };

  return (
    <div className="reconciliation-setup">
      <div className="setup-card">
        <h3>Step 1: Setup Reconciliation</h3>
        <p>Enter the reconciliation reference and total amount from your bank statement</p>
        
        <form onSubmit={handleSubmit} className="setup-form">
          <div className="form-field">
            <label htmlFor="accountId">
              Account *
            </label>
            <select
              id="accountId"
              value={formData.accountId}
              onChange={(e) => setFormData(prev => ({ 
                ...prev, 
                accountId: e.target.value 
              }))}
              className={errors.accountId ? 'error' : ''}
            >
              <option value="">Select an account...</option>
              {getActiveAccountsWithTypes().map(account => (
                <option key={account.id} value={account.id}>
                  {account.name} ({account.accountType?.type}) ({formatAccountBalance(account)})
                </option>
              ))}
            </select>
            {errors.accountId && (
              <span className="field-error">{errors.accountId}</span>
            )}
            <small>Choose the account you want to reconcile</small>
          </div>

          <div className="form-field">
            <label htmlFor="reconciliationReference">
              Reconciliation Reference *
            </label>
            <div className="reference-input-group">
              <input
                id="reconciliationReference"
                type="text"
                value={formData.reconciliationReference}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  reconciliationReference: e.target.value 
                }))}
                placeholder="e.g., R012025"
                className={errors.reconciliationReference ? 'error' : ''}
              />
              <button
                type="button"
                onClick={generateReference}
                className="btn btn-secondary btn-small"
                title="Generate reference for current month"
              >
                Generate
              </button>
            </div>
            {errors.reconciliationReference && (
              <span className="field-error">{errors.reconciliationReference}</span>
            )}
            <small>This reference will be attached to all reconciled transactions</small>
          </div>

          <div className="form-field">
            <label htmlFor="bankStatementTotal">
              Bank Statement Total *
            </label>
            <input
              id="bankStatementTotal"
              type="number"
              step="0.01"
              value={formData.bankStatementTotal}
              onChange={(e) => setFormData(prev => ({ 
                ...prev, 
                bankStatementTotal: e.target.value 
              }))}
              placeholder="0.00"
              className={errors.bankStatementTotal ? 'error' : ''}
            />
            {errors.bankStatementTotal && (
              <span className="field-error">{errors.bankStatementTotal}</span>
            )}
            <small>Total amount shown on your bank statement</small>
          </div>

          <div className="setup-actions">
            <button 
              type="submit" 
              className="btn btn-primary btn-large"
            >
              Start Reconciliation
            </button>
          </div>
        </form>
      </div>

      <div className="setup-info">
        <div className="info-card">
          <h4>📋 How Reconciliation Works</h4>
          <ol>
            <li><strong>Setup:</strong> Enter a reference (e.g., R012025) and your bank statement total</li>
            <li><strong>Select:</strong> Filter and tick transactions that appear on your bank statement</li>
            <li><strong>Match:</strong> Compare your running total with the bank statement total</li>
            <li><strong>Complete:</strong> When totals match, your reconciliation is complete</li>
          </ol>
        </div>
      </div>
    </div>
  );
};

export default ReconciliationSetup;