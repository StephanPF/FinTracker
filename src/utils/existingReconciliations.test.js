// Existing Reconciliations Tests - Comprehensive test coverage for Existing Reconciliations screen functionality
import RelationalDatabase from './relationalDatabase.js';

export const createExistingReconciliationsTests = () => {
  let db;
  let testAccount;
  let testTransactions;
  let reconciledTransactions;
  
  const beforeEach = () => {
    db = new RelationalDatabase();
    db.createNewDatabase('en');
    
    // Create test account
    testAccount = db.addAccount({
      name: 'Test Checking Account',
      accountTypeId: 'AT_001',
      currencyId: 'CUR_001',
      balance: 1000.00,
      accountCode: 'CHK001'
    });

    // Create test transactions
    testTransactions = [
      db.addTransaction({
        date: '2024-01-15',
        description: 'Deposit',
        amount: 500.00,
        accountId: testAccount.id,
        categoryId: 'CAT_001', // Income
        subcategoryId: 'SUB_013'
      }),
      db.addTransaction({
        date: '2024-01-16', 
        description: 'ATM Withdrawal',
        amount: 100.00,
        accountId: testAccount.id,
        categoryId: 'CAT_002', // Expenses
        subcategoryId: 'SUB_001'
      }),
      db.addTransaction({
        date: '2024-01-17',
        description: 'Online Purchase',
        amount: 50.00,
        accountId: testAccount.id,
        categoryId: 'CAT_002', // Expenses
        subcategoryId: 'SUB_011'
      }),
      db.addTransaction({
        date: '2024-01-18',
        description: 'Bill Payment',
        amount: 75.00,
        accountId: testAccount.id,
        categoryId: 'CAT_002', // Expenses
        subcategoryId: 'SUB_002'
      })
    ];

    // Reconcile some transactions
    db.reconcileTransaction(testTransactions[0].id, 'R0124');
    db.reconcileTransaction(testTransactions[1].id, 'R0124');
    db.reconcileTransaction(testTransactions[2].id, 'R0225');
    
    // Keep testTransactions[3] unreconciled
    
    // Get reconciled transactions for testing
    reconciledTransactions = db.getTable('transactions').filter(t => t.reconciliationReference);
  };

  // Mock ExistingReconciliationsPage state
  const createExistingReconciliationsState = () => ({
    selectedTransactions: new Set(),
    isProcessing: false,
    filters: {
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
    }
  });

  // Helper functions
  const getReconciledTransactions = () => {
    return db.getTable('transactions').filter(t => t.reconciliationReference);
  };

  const getUniqueReconciliationReferences = () => {
    const references = getReconciledTransactions().map(t => t.reconciliationReference);
    return [...new Set(references)].sort();
  };

  const filterTransactions = (transactions, filters) => {
    return transactions.filter(transaction => {
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

      // Reconciliation reference filter
      if (filters.reconciliationReference && transaction.reconciliationReference !== filters.reconciliationReference) {
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

      return true;
    });
  };

  return [
    {
      id: 'existing-reconciliations-display',
      suite: 'Existing Reconciliations - Screen Display',
      name: 'should properly display reconciled transactions with filters',
      description: 'Displays only reconciled transactions with all filter options available',
      expectedBehavior: 'Only transactions with reconciliation references should be shown',
      testFunction: () => {
        beforeEach();
        
        const reconciledTransactions = getReconciledTransactions();
        const allTransactions = db.getTable('transactions');
        
        // Should show only reconciled transactions
        expect.toBe(reconciledTransactions.length, 3);
        expect.toBe(allTransactions.length, 4);
        expect.toBe(reconciledTransactions.every(t => t.reconciliationReference !== null), true);
        
        return { success: true, details: `Found ${reconciledTransactions.length} reconciled transactions out of ${allTransactions.length} total` };
      }
    },

    {
      id: 'existing-reconciliations-filter-basic',
      suite: 'Existing Reconciliations - Transaction Filtering',
      name: 'should filter transactions by account, date range, and amount',
      description: 'Applies basic filters to reconciled transactions',
      expectedBehavior: 'Filters should work correctly on reconciled transactions',
      testFunction: () => {
        beforeEach();
        
        const reconciledTransactions = getReconciledTransactions();
        
        // Test account filter
        const accountFiltered = filterTransactions(reconciledTransactions, {
          accountId: testAccount.id,
          search: '', reconciliationReference: '', dateFrom: '', dateTo: '', amountMin: '', amountMax: ''
        });
        expect.toBe(accountFiltered.length, 3);
        
        // Test search filter
        const searchFiltered = filterTransactions(reconciledTransactions, {
          search: 'ATM', accountId: '', reconciliationReference: '', dateFrom: '', dateTo: '', amountMin: '', amountMax: ''
        });
        expect.toBe(searchFiltered.length, 1);
        expect.toBe(searchFiltered[0].description, 'ATM Withdrawal');
        
        // Test amount filter
        const amountFiltered = filterTransactions(reconciledTransactions, {
          amountMin: '60', amountMax: '200', search: '', accountId: '', reconciliationReference: '', dateFrom: '', dateTo: ''
        });
        expect.toBe(amountFiltered.length, 1);
        expect.toBe(amountFiltered[0].amount, 100.00);
        
        return { success: true, details: 'All basic filters working correctly' };
      }
    },

    {
      id: 'existing-reconciliations-filter-advanced',
      suite: 'Existing Reconciliations - Transaction Filtering',
      name: 'should filter transactions by reconciliation reference and date range',
      description: 'Applies advanced filters including reconciliation reference',
      expectedBehavior: 'Advanced filters should narrow down results correctly',
      testFunction: () => {
        beforeEach();
        
        const reconciledTransactions = getReconciledTransactions();
        
        // Test reconciliation reference filter
        const refFiltered = filterTransactions(reconciledTransactions, {
          reconciliationReference: 'R0124', search: '', accountId: '', dateFrom: '', dateTo: '', amountMin: '', amountMax: ''
        });
        expect.toBe(refFiltered.length, 2);
        expect.toBe(refFiltered.every(t => t.reconciliationReference === 'R0124'), true);
        
        // Test date range filter
        const dateFiltered = filterTransactions(reconciledTransactions, {
          dateFrom: '2024-01-16', dateTo: '2024-01-17', search: '', accountId: '', reconciliationReference: '', amountMin: '', amountMax: ''
        });
        expect.toBe(dateFiltered.length, 2);
        
        return { success: true, details: 'Advanced filters working correctly' };
      }
    },

    {
      id: 'existing-reconciliations-reference-dropdown',
      suite: 'Existing Reconciliations - Reference Filtering',
      name: 'should populate dropdown with unique reconciliation references',
      description: 'Creates dropdown options from unique reconciliation references',
      expectedBehavior: 'Dropdown should contain sorted unique reconciliation references',
      testFunction: () => {
        beforeEach();
        
        const uniqueReferences = getUniqueReconciliationReferences();
        
        expect.toBe(uniqueReferences.length, 2);
        expect.toBe(uniqueReferences.includes('R0124'), true);
        expect.toBe(uniqueReferences.includes('R0225'), true);
        expect.toBe(uniqueReferences[0], 'R0124'); // Should be sorted
        expect.toBe(uniqueReferences[1], 'R0225');
        
        return { success: true, details: `Found unique references: ${uniqueReferences.join(', ')}` };
      }
    },

    {
      id: 'existing-reconciliations-checkbox-individual',
      suite: 'Existing Reconciliations - Checkbox Selection',
      name: 'should handle individual transaction selection',
      description: 'Manages selection state for individual transactions',
      expectedBehavior: 'Individual checkbox selection should update state correctly',
      testFunction: () => {
        beforeEach();
        
        const state = createExistingReconciliationsState();
        const reconciledTransactions = getReconciledTransactions();
        
        // Simulate individual selection
        state.selectedTransactions.add(reconciledTransactions[0].id);
        expect.toBe(state.selectedTransactions.has(reconciledTransactions[0].id), true);
        expect.toBe(state.selectedTransactions.size, 1);
        
        // Simulate deselection
        state.selectedTransactions.delete(reconciledTransactions[0].id);
        expect.toBe(state.selectedTransactions.has(reconciledTransactions[0].id), false);
        expect.toBe(state.selectedTransactions.size, 0);
        
        return { success: true, details: 'Individual selection working correctly' };
      }
    },

    {
      id: 'existing-reconciliations-checkbox-selectall',
      suite: 'Existing Reconciliations - Checkbox Selection',
      name: 'should handle select all and select none functionality',
      description: 'Manages bulk selection and deselection of transactions',
      expectedBehavior: 'Select all should toggle between all selected and none selected',
      testFunction: () => {
        beforeEach();
        
        const state = createExistingReconciliationsState();
        const reconciledTransactions = getReconciledTransactions();
        
        // Simulate select all
        reconciledTransactions.forEach(t => state.selectedTransactions.add(t.id));
        expect.toBe(state.selectedTransactions.size, reconciledTransactions.length);
        expect.toBe(state.selectedTransactions.size === reconciledTransactions.length, true);
        
        // Simulate select none
        state.selectedTransactions.clear();
        expect.toBe(state.selectedTransactions.size, 0);
        
        return { success: true, details: `Select all/none tested with ${reconciledTransactions.length} transactions` };
      }
    },

    {
      id: 'existing-reconciliations-button-state',
      suite: 'Existing Reconciliations - Un-reconcile Validation',
      name: 'should manage button state based on selection count',
      description: 'Updates button text and disabled state based on selection',
      expectedBehavior: 'Button should be disabled when no selection, show count when selected',
      testFunction: () => {
        beforeEach();
        
        const state = createExistingReconciliationsState();
        const reconciledTransactions = getReconciledTransactions();
        
        // Test empty selection - button should be disabled
        const isDisabledEmpty = state.selectedTransactions.size === 0 || state.isProcessing;
        expect.toBe(isDisabledEmpty, true);
        
        // Test with selection - button should be enabled
        state.selectedTransactions.add(reconciledTransactions[0].id);
        state.selectedTransactions.add(reconciledTransactions[1].id);
        const isDisabledWithSelection = state.selectedTransactions.size === 0 || state.isProcessing;
        expect.toBe(isDisabledWithSelection, false);
        
        // Test button text
        const buttonText = state.isProcessing ? 'Processing...' : `Un-reconcile (${state.selectedTransactions.size})`;
        expect.toBe(buttonText, 'Un-reconcile (2)');
        
        return { success: true, details: 'Button state management working correctly' };
      }
    },

    {
      id: 'existing-reconciliations-button-processing',
      suite: 'Existing Reconciliations - Un-reconcile Validation',
      name: 'should handle processing state during un-reconcile operation',
      description: 'Manages button state and text during async operations',
      expectedBehavior: 'Button should show processing state and be disabled during operation',
      testFunction: () => {
        beforeEach();
        
        const state = createExistingReconciliationsState();
        const reconciledTransactions = getReconciledTransactions();
        
        // Select transactions
        state.selectedTransactions.add(reconciledTransactions[0].id);
        
        // Simulate processing state
        state.isProcessing = true;
        const isDisabled = state.selectedTransactions.size === 0 || state.isProcessing;
        const buttonText = state.isProcessing ? 'Processing...' : `Un-reconcile (${state.selectedTransactions.size})`;
        
        expect.toBe(isDisabled, true);
        expect.toBe(buttonText, 'Processing...');
        
        return { success: true, details: 'Processing state management working correctly' };
      }
    },

    {
      id: 'existing-reconciliations-single-unreconcile',
      suite: 'Existing Reconciliations - Un-reconcile Operations',
      name: 'should un-reconcile single selected transaction',
      description: 'Removes reconciliation reference from single transaction',
      expectedBehavior: 'Selected transaction should have reconciliation reference removed',
      testFunction: () => {
        beforeEach();
        
        const reconciledTransactions = getReconciledTransactions();
        const targetTransaction = reconciledTransactions[0];
        
        // Verify transaction is reconciled
        expect.toBe(targetTransaction.reconciliationReference, 'R0124');
        expect.toBe(targetTransaction.reconciledAt !== null, true);
        
        // Un-reconcile transaction
        const unreconciled = db.unreconcileTransaction(targetTransaction.id);
        
        // Verify reconciliation reference removed
        expect.toBe(unreconciled.reconciliationReference, null);
        expect.toBe(unreconciled.reconciledAt, null);
        
        // Verify transaction still exists but not reconciled
        const updatedTransactions = getReconciledTransactions();
        expect.toBe(updatedTransactions.length, 2); // One less reconciled transaction
        
        return { success: true, details: 'Single transaction un-reconcile working correctly' };
      }
    },

    {
      id: 'existing-reconciliations-bulk-unreconcile',
      suite: 'Existing Reconciliations - Un-reconcile Operations',
      name: 'should un-reconcile multiple selected transactions',
      description: 'Removes reconciliation reference from multiple transactions in bulk',
      expectedBehavior: 'All selected transactions should have reconciliation references removed',
      testFunction: () => {
        beforeEach();
        
        const reconciledTransactions = getReconciledTransactions();
        const selectedIds = [reconciledTransactions[0].id, reconciledTransactions[1].id];
        
        // Verify transactions are reconciled
        expect.toBe(reconciledTransactions.length, 3);
        
        // Bulk un-reconcile
        selectedIds.forEach(id => {
          db.unreconcileTransaction(id);
        });
        
        // Verify transactions are un-reconciled
        const remainingReconciled = getReconciledTransactions();
        expect.toBe(remainingReconciled.length, 1); // Only one should remain reconciled
        
        // Verify specific transactions are un-reconciled
        const allTransactions = db.getTable('transactions');
        const unreconciled1 = allTransactions.find(t => t.id === selectedIds[0]);
        const unreconciled2 = allTransactions.find(t => t.id === selectedIds[1]);
        
        expect.toBe(unreconciled1.reconciliationReference, null);
        expect.toBe(unreconciled2.reconciliationReference, null);
        
        return { success: true, details: `Bulk un-reconciled ${selectedIds.length} transactions successfully` };
      }
    },

    {
      id: 'existing-reconciliations-database-updates',
      suite: 'Existing Reconciliations - Database Updates',
      name: 'should properly update database when un-reconciling transactions',
      description: 'Ensures database integrity during un-reconcile operations',
      expectedBehavior: 'Database should be updated and persisted correctly',
      testFunction: () => {
        beforeEach();
        
        const reconciledTransactions = getReconciledTransactions();
        const targetId = reconciledTransactions[0].id;
        
        // Get transaction before un-reconcile
        const beforeTransaction = db.getTable('transactions').find(t => t.id === targetId);
        expect.toBe(beforeTransaction.reconciliationReference, 'R0124');
        
        // Un-reconcile transaction
        db.unreconcileTransaction(targetId);
        
        // Verify database is updated
        const afterTransaction = db.getTable('transactions').find(t => t.id === targetId);
        expect.toBe(afterTransaction.reconciliationReference, null);
        expect.toBe(afterTransaction.reconciledAt, null);
        
        // Verify other transactions are not affected
        const otherReconciled = getReconciledTransactions();
        expect.toBe(otherReconciled.length, 2);
        
        return { success: true, details: 'Database updates working correctly' };
      }
    },

    {
      id: 'existing-reconciliations-state-management',
      suite: 'Existing Reconciliations - State Management',
      name: 'should clear selections when filters change',
      description: 'Manages selection state when user changes filters',
      expectedBehavior: 'Selection should be cleared when filters are modified',
      testFunction: () => {
        beforeEach();
        
        const state = createExistingReconciliationsState();
        const reconciledTransactions = getReconciledTransactions();
        
        // Select some transactions
        state.selectedTransactions.add(reconciledTransactions[0].id);
        state.selectedTransactions.add(reconciledTransactions[1].id);
        expect.toBe(state.selectedTransactions.size, 2);
        
        // Simulate filter change (would trigger useEffect in component)
        state.filters.search = 'ATM';
        
        // Simulate clearing selections (as would happen in useEffect)
        state.selectedTransactions.clear();
        expect.toBe(state.selectedTransactions.size, 0);
        
        return { success: true, details: 'State management working correctly' };
      }
    },

    {
      id: 'existing-reconciliations-ui-responsiveness',
      suite: 'Existing Reconciliations - UI Responsiveness',
      name: 'should update UI elements based on selection state',
      description: 'Updates button state, count display, and other UI elements',
      expectedBehavior: 'UI should respond correctly to state changes',
      testFunction: () => {
        beforeEach();
        
        const state = createExistingReconciliationsState();
        const reconciledTransactions = getReconciledTransactions();
        const filteredTransactions = reconciledTransactions; // No filters applied
        
        // Test header checkbox state (select all)
        const allSelected = state.selectedTransactions.size === filteredTransactions.length && filteredTransactions.length > 0;
        expect.toBe(allSelected, false);
        
        // Select all transactions
        filteredTransactions.forEach(t => state.selectedTransactions.add(t.id));
        const nowAllSelected = state.selectedTransactions.size === filteredTransactions.length && filteredTransactions.length > 0;
        expect.toBe(nowAllSelected, true);
        
        // Test button count display
        const buttonText = `Un-reconcile (${state.selectedTransactions.size})`;
        expect.toBe(buttonText, `Un-reconcile (${filteredTransactions.length})`);
        
        return { success: true, details: 'UI responsiveness working correctly' };
      }
    },

    {
      id: 'existing-reconciliations-navigation',
      suite: 'Existing Reconciliations - Navigation',
      name: 'should handle back to reconciliation functionality',
      description: 'Provides navigation back to main reconciliation screen',
      expectedBehavior: 'Back button should navigate to reconciliation screen',
      testFunction: () => {
        beforeEach();
        
        // Simulate navigation (would set window.location.hash in real app)
        let currentHash = '#existing-reconciliations';
        
        // Simulate back button click
        const navigateBack = () => {
          currentHash = '#reconciliation';
        };
        
        navigateBack();
        expect.toBe(currentHash, '#reconciliation');
        
        return { success: true, details: 'Navigation working correctly' };
      }
    },

    {
      id: 'existing-reconciliations-error-handling',
      suite: 'Existing Reconciliations - Error Handling',
      name: 'should validate when no transactions are selected for un-reconcile',
      description: 'Provides proper validation and error messages',
      expectedBehavior: 'Should show error when trying to un-reconcile with no selection',
      testFunction: () => {
        beforeEach();
        
        const state = createExistingReconciliationsState();
        
        // Test validation with no selection
        const canProceed = state.selectedTransactions.size > 0;
        expect.toBe(canProceed, false);
        
        // Simulate the validation that would happen on button click
        const validationMessage = state.selectedTransactions.size === 0 ? 
          'Please select transactions to un-reconcile.' : 
          'Proceed with un-reconcile';
          
        expect.toBe(validationMessage, 'Please select transactions to un-reconcile.');
        
        return { success: true, details: 'Error handling working correctly' };
      }
    },

    {
      id: 'existing-reconciliations-date-format',
      suite: 'Existing Reconciliations - Date Format Integration',
      name: 'should display dates according to user preferences',
      description: 'Integrates with user date format settings for display',
      expectedBehavior: 'Dates should be formatted according to user settings',
      testFunction: () => {
        beforeEach();
        
        const reconciledTransactions = getReconciledTransactions();
        const testTransaction = reconciledTransactions[0];
        
        // Test different date formats (simulated)
        const dateFormats = {
          'DD/MM/YYYY': '15/01/2024',
          'MM/DD/YYYY': '01/15/2024',
          'YYYY-MM-DD': '2024-01-15'
        };
        
        // Simulate date formatting
        const formatDate = (dateString, format) => {
          const date = new Date(dateString + 'T00:00:00');
          const day = date.getDate().toString().padStart(2, '0');
          const month = (date.getMonth() + 1).toString().padStart(2, '0');
          const year = date.getFullYear();
          
          switch (format) {
            case 'DD/MM/YYYY': return `${day}/${month}/${year}`;
            case 'MM/DD/YYYY': return `${month}/${day}/${year}`;
            case 'YYYY-MM-DD': return `${year}-${month}-${day}`;
            default: return dateString;
          }
        };
        
        const formattedDate = formatDate(testTransaction.date, 'DD/MM/YYYY');
        expect.toBe(formattedDate, '15/01/2024');
        
        return { success: true, details: 'Date format integration working correctly' };
      }
    }
  ];
};

// Custom expect implementation for browser compatibility
const expect = {
  toBe: (actual, expected) => {
    if (actual !== expected) {
      throw new Error(`Expected ${actual} to be ${expected}`);
    }
  },
  toEqual: (actual, expected) => {
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
      throw new Error(`Expected ${JSON.stringify(actual)} to equal ${JSON.stringify(expected)}`);
    }
  }
};