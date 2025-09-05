import React, { useState } from 'react';
import ReconciliationSetup from './ReconciliationSetup';
import ReconciliationSummary from './ReconciliationSummary';
import ReconciliationTransactionList from './ReconciliationTransactionList';
import { useAccounting } from '../contexts/AccountingContext';
import { useLanguage } from '../contexts/LanguageContext';
import './ReconciliationPage.css';

const ReconciliationPage = () => {
  const { getUnreconciledTransactions, reconcileTransaction, unreconcileTransaction, accounts, currencies, numberFormatService } = useAccounting();
  const { t } = useLanguage();
  
  // Helper function to get selected account with currency
  const getSelectedAccountWithCurrency = () => {
    if (!reconciliationState.accountId) return null;
    const account = accounts.find(a => a.id === reconciliationState.accountId);
    if (!account) return null;
    const currency = currencies.find(c => c.id === account.currencyId);
    return { ...account, currency };
  };
  
  // Reconciliation state
  const [reconciliationState, setReconciliationState] = useState({
    reconciliationReference: '',
    bankStatementTotal: 0,
    accountId: '',
    selectedTransactions: new Set(),
    runningTotal: 0,
    isActive: false,
    step: 1 // 1: Setup, 2: Transaction Selection
  });

  // Start reconciliation process
  const handleStartReconciliation = (reference, bankTotal, accountId) => {
    setReconciliationState(prev => ({
      ...prev,
      reconciliationReference: reference,
      bankStatementTotal: parseFloat(bankTotal) || 0,
      accountId: accountId,
      isActive: true,
      step: 2,
      selectedTransactions: new Set(),
      runningTotal: 0
    }));
  };

  // Toggle transaction selection (no database updates until Complete is clicked)
  const handleTransactionToggle = (transaction) => {
    const newSelected = new Set(reconciliationState.selectedTransactions);
    
    if (newSelected.has(transaction.id)) {
      // Unselect transaction
      newSelected.delete(transaction.id);
    } else {
      // Select transaction
      newSelected.add(transaction.id);
    }
    
    // Calculate new running total - get unreconciled transactions for this account and filter selected ones
    const allTransactions = getUnreconciledTransactions(reconciliationState.accountId);
    const selectedTransactionsList = allTransactions.filter(t => newSelected.has(t.id));
    const newRunningTotal = selectedTransactionsList.reduce((sum, t) => sum + (t.amount || 0), 0);
    
    setReconciliationState(prev => ({
      ...prev,
      selectedTransactions: newSelected,
      runningTotal: newRunningTotal
    }));
  };

  // Reset reconciliation
  const handleReset = () => {
    setReconciliationState({
      reconciliationReference: '',
      bankStatementTotal: 0,
      accountId: '',
      selectedTransactions: new Set(),
      runningTotal: 0,
      isActive: false,
      step: 1
    });
  };

  // Complete reconciliation
  const handleComplete = async () => {
    const difference = reconciliationState.runningTotal - reconciliationState.bankStatementTotal;
    const isBalanced = Math.abs(difference) < 0.01;
    
    // If not balanced, ask for confirmation
    if (!isBalanced) {
      const selectedAccount = getSelectedAccountWithCurrency();
      
      const formatCurrency = (amount) => {
        if (numberFormatService && selectedAccount?.currencyId) {
          return numberFormatService.formatCurrency(amount, selectedAccount.currencyId);
        }
        // Fallback to simple formatting
        const currencyCode = selectedAccount?.currency?.code || 'USD';
        const locale = selectedAccount?.currency?.locale || 'en-US';
        return new Intl.NumberFormat(locale, {
          style: 'currency',
          currency: currencyCode
        }).format(amount);
      };
      
      const confirmMessage = `The reconciliation is not balanced. There is a difference of ${formatCurrency(Math.abs(difference))}.\n\nDo you want to continue anyway?`;
      if (!window.confirm(confirmMessage)) {
        return; // User cancelled
      }
    }
    
    try {
      // Reconcile all selected transactions
      const selectedTransactionIds = Array.from(reconciliationState.selectedTransactions);
      for (const transactionId of selectedTransactionIds) {
        await reconcileTransaction(transactionId, reconciliationState.reconciliationReference);
      }
      
      // Show success message
      alert(`Reconciliation "${reconciliationState.reconciliationReference}" completed successfully!`);
      handleReset();
    } catch (error) {
      console.error('Error completing reconciliation:', error);
      alert('Error completing reconciliation. Please try again.');
    }
  };

  return (
    <div className="reconciliation-page">
      {reconciliationState.step === 1 && (
        <ReconciliationSetup
          onStart={handleStartReconciliation}
        />
      )}

      {reconciliationState.step === 2 && (
        <>
          <ReconciliationSummary
            reconciliationReference={reconciliationState.reconciliationReference}
            bankStatementTotal={reconciliationState.bankStatementTotal}
            runningTotal={reconciliationState.runningTotal}
            selectedCount={reconciliationState.selectedTransactions.size}
            onReset={handleReset}
            onComplete={handleComplete}
            selectedAccount={getSelectedAccountWithCurrency()}
          />
          
          <ReconciliationTransactionList
            selectedTransactions={reconciliationState.selectedTransactions}
            onTransactionToggle={handleTransactionToggle}
            accountId={reconciliationState.accountId}
            selectedAccount={getSelectedAccountWithCurrency()}
          />
        </>
      )}
    </div>
  );
};

export default ReconciliationPage;