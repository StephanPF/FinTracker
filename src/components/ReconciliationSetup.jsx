import React, { useState } from 'react';
import { useAccounting } from '../contexts/AccountingContext';
import { useLanguage } from '../contexts/LanguageContext';
import './ReconciliationSetup.css';

const ReconciliationSetup = ({ onStart }) => {
  const { getActiveAccountsWithTypes, currencies, numberFormatService } = useAccounting();
  const { t } = useLanguage();
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
      newErrors.accountId = t('accountRequired');
    }

    if (!formData.reconciliationReference.trim()) {
      newErrors.reconciliationReference = t('reconciliationReferenceRequired');
    }

    if (!formData.bankStatementTotal || isNaN(formData.bankStatementTotal)) {
      newErrors.bankStatementTotal = t('validBankStatementTotalRequired');
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
      alert(t('selectAccountFirst'));
      return;
    }

    const selectedAccount = getActiveAccountsWithTypes().find(acc => acc.id === formData.accountId);
    if (!selectedAccount) {
      alert(t('selectedAccountNotFound'));
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
        <h3>{t('step1SetupReconciliation')}</h3>
        <p>{t('enterReconciliationReference')}</p>
        
        <form onSubmit={handleSubmit} className="setup-form">
          <div className="form-field">
            <label htmlFor="accountId">
              {t('account')} *
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
              <option value="">{t('selectAccount')}...</option>
              {getActiveAccountsWithTypes().map(account => (
                <option key={account.id} value={account.id}>
                  {account.name} ({account.accountType?.type}) ({formatAccountBalance(account)})
                </option>
              ))}
            </select>
            {errors.accountId && (
              <span className="field-error">{errors.accountId}</span>
            )}
            <small>{t('chooseAccountToReconcile')}</small>
          </div>

          <div className="form-field">
            <label htmlFor="reconciliationReference">
              {t('reconciliationReference')} *
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
                title={t('generateReferenceCurrentMonth')}
              >
                {t('generate')}
              </button>
            </div>
            {errors.reconciliationReference && (
              <span className="field-error">{errors.reconciliationReference}</span>
            )}
            <small>{t('referenceAttachedToTransactions')}</small>
          </div>

          <div className="form-field">
            <label htmlFor="bankStatementTotal">
              {t('bankStatementTotal')} *
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
                onWheel={(e) => e.target.blur()}
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
            <small>{t('totalAmountOnBankStatement')}</small>
          </div>

          <div className="setup-actions">
            <button 
              type="submit" 
              className="btn btn-primary btn-large"
            >
              {t('startReconciliation')}
            </button>
            <button 
              type="button" 
              className="btn btn-secondary btn-large"
              onClick={() => window.location.hash = '#reconciliation/existing'}
            >
              {t('showExistingReconciliations')}
            </button>
          </div>
        </form>
      </div>

      <div className="setup-info">
        <div className="info-card">
          <h4>📋 {t('howReconciliationWorks')}</h4>
          <ol>
            <li><strong>{t('setupStep')}:</strong> {t('enterReferenceAndTotal')}</li>
            <li><strong>{t('selectStep')}:</strong> {t('filterAndTickTransactions')}</li>
            <li><strong>{t('matchStep')}:</strong> {t('compareRunningTotalWithBank')}</li>
            <li><strong>{t('completeStep')}:</strong> {t('whenTotalsMatchComplete')}</li>
          </ol>
        </div>
      </div>
    </div>
  );
};

export default ReconciliationSetup;