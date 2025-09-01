import React from 'react';
import './ReconciliationSummary.css';

const ReconciliationSummary = ({ 
  reconciliationReference, 
  bankStatementTotal, 
  runningTotal, 
  selectedCount,
  onReset,
  onComplete,
  selectedAccount
}) => {
  const difference = runningTotal - bankStatementTotal;
  const isBalanced = Math.abs(difference) < 0.01; // Account for floating point precision

  const formatCurrency = (amount) => {
    // Use the selected account's currency, fallback to USD if not available
    const currencyCode = selectedAccount?.currency?.code || 'USD';
    const locale = selectedAccount?.currency?.locale || 'en-US';
    
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currencyCode
    }).format(amount);
  };

  const getDifferenceClass = () => {
    if (isBalanced) return 'balanced';
    if (difference > 0) return 'over';
    return 'under';
  };

  return (
    <div className="reconciliation-summary">
      <div className="summary-header">
        <div className="summary-title">
          <h3>Step 2. Reconciliation: {reconciliationReference}</h3>
          <div className="summary-actions">
            <button 
              className="btn btn-secondary btn-small"
              onClick={onReset}
            >
              Reset
            </button>
            <button 
              className="btn btn-primary btn-small"
              onClick={onComplete}
              disabled={selectedCount === 0}
              title={selectedCount === 0 ? 'Select at least one transaction to complete reconciliation' : 'Complete reconciliation'}
            >
              Complete
            </button>
          </div>
        </div>
      </div>

      <div className="summary-stats">
        <div className="stat-card">
          <div className="stat-label">Bank Statement Total</div>
          <div className="stat-value bank-total">
            {formatCurrency(bankStatementTotal)}
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-label">Selected Transactions</div>
          <div className="stat-value selected-total">
            {formatCurrency(runningTotal)}
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-label">Number of selected Transactions</div>
          <div className="stat-value">
            {selectedCount}
          </div>
        </div>

        <div className={`stat-card difference ${getDifferenceClass()}`}>
          <div className="stat-label">Difference</div>
          <div className="stat-value">
            {difference >= 0 ? '+' : ''}{formatCurrency(difference)}
          </div>
        </div>
      </div>

    </div>
  );
};

export default ReconciliationSummary;