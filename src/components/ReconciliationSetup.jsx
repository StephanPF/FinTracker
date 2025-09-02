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
    if (!formData.accountId) {
      alert('Please select an account first before generating a reference.');
      return;
    }

    const selectedAccount = getActiveAccountsWithTypes().find(acc => acc.id === formData.accountId);
    if (!selectedAccount) {
      alert('Selected account not found.');
      return;
    }

    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = String(now.getFullYear()).slice(-2); // Get last 2 digits of year
    const accountCode = selectedAccount.accountCode || 'XX'; // Use XX as fallback if no account code
    
    const reference = `${accountCode}${year}${month}`;
    setFormData(prev => ({ ...prev, reconciliationReference: reference }));
  };

  // Get currency info for the selected account
  const getSelectedAccountCurrency = () => {
    if (!formData.accountId) return null;
    
    const selectedAccount = getActiveAccountsWithTypes().find(acc => acc.id === formData.accountId);
    if (!selectedAccount) return null;
    
    const currency = currencies.find(c => c.id === selectedAccount.currencyId);
    return currency;
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
              style={{ maxWidth: '600px' }}
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
            <div className="reference-input-group" style={{ maxWidth: '400px' }}>
              <input
                id="reconciliationReference"
                type="text"
                value={formData.reconciliationReference}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  reconciliationReference: e.target.value 
                }))}
                placeholder="e.g., DA2501"
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
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', maxWidth: '200px' }}>
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
                style={{
                  paddingRight: getSelectedAccountCurrency() ? '28px' : '12px',
                  width: '100%'
                }}
              />
              {(() => {
                const currency = getSelectedAccountCurrency();
                return currency ? (
                  <span style={{
                    position: 'absolute',
                    right: '12px',
                    zIndex: 1,
                    color: '#6b7280',
                    fontSize: '1rem',
                    pointerEvents: 'none'
                  }}>
                    {currency.symbol}
                  </span>
                ) : null;
              })()}
            </div>
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
            <li><strong>Setup:</strong> Enter a reference (e.g., DA2501) and your bank statement total</li>
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