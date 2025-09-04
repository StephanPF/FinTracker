// Reconciliation Tests - Comprehensive test coverage for bank reconciliation functionality
import RelationalDatabase from './relationalDatabase.js';

export const createReconciliationTests = () => {
  let db;
  let testAccount;
  let testTransactions;
  
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

    // Create test transactions for reconciliation
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
      })
    ];
  };

  // Helper function to convert Date to YYYY-MM-DD (timezone-safe)
  const dateToISOString = (date) => {
    if (!date) return '';
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Mock reconciliation state management
  const createReconciliationState = () => ({
    reconciliationReference: '',
    bankStatementTotal: 0,
    accountId: '',
    selectedTransactions: new Set(),
    runningTotal: 0,
    isActive: false,
    step: 1
  });

  const calculateRunningTotal = (selectedTransactionIds, allTransactions) => {
    const selectedTransactionsList = allTransactions.filter(t => selectedTransactionIds.has(t.id));
    return selectedTransactionsList.reduce((sum, t) => {
      const amount = t.amount || 0;
      const transactionType = db.getTable('transaction_types').find(type => type.id === t.categoryId);
      
      if (transactionType) {
        switch (transactionType.name) {
          case 'Income':
            return sum + amount; // Income adds to balance
          case 'Expenses':
            return sum - amount; // Expenses subtract from balance
          case 'Transfer':
            // For transfers, need to check if this account is source or destination
            return sum; // Simplified for now
          default:
            return sum + amount;
        }
      }
      return sum + amount;
    }, 0);
  };

  return [
    {
      id: 'reconciliation-setup-validation',
      suite: 'Reconciliation - Setup Validation',
      name: 'should validate reconciliation setup form fields',
      description: 'Validates required fields for starting reconciliation process',
      expectedBehavior: 'Setup form should require account, reference, and bank total',
      testFunction: () => {
        beforeEach();

        // Mock form validation function
        const validateReconciliationSetup = (formData) => {
          const errors = {};

          if (!formData.accountId) {
            errors.accountId = 'Account selection is required';
          }

          if (!formData.reconciliationReference.trim()) {
            errors.reconciliationReference = 'Reconciliation reference is required';
          }

          if (!formData.bankStatementTotal || isNaN(formData.bankStatementTotal)) {
            errors.bankStatementTotal = 'Valid bank statement total is required';
          }

          return { isValid: Object.keys(errors).length === 0, errors };
        };

        // Test valid form data
        const validFormData = {
          accountId: testAccount.id,
          reconciliationReference: 'CHK00125001',
          bankStatementTotal: '1350.00'
        };

        const validResult = validateReconciliationSetup(validFormData);
        expect.toBe(validResult.isValid, true);
        expect.toBe(Object.keys(validResult.errors).length, 0);

        // Test invalid form data
        const invalidFormData = {
          accountId: '',
          reconciliationReference: '',
          bankStatementTotal: 'invalid'
        };

        const invalidResult = validateReconciliationSetup(invalidFormData);
        expect.toBe(invalidResult.isValid, false);
        expect.toContain(invalidResult.errors.accountId, 'Account selection is required');
        expect.toContain(invalidResult.errors.reconciliationReference, 'Reconciliation reference is required');
        expect.toContain(invalidResult.errors.bankStatementTotal, 'Valid bank statement total is required');
      }
    },

    {
      id: 'reconciliation-reference-generation',
      suite: 'Reconciliation - Reference Generation',
      name: 'should generate reconciliation reference from account code and date',
      description: 'Creates standardized reconciliation reference using account code + year + month',
      expectedBehavior: 'Reference should follow format: AccountCode + YY + MM',
      testFunction: () => {
        beforeEach();

        // Mock reference generation function
        const generateReconciliationReference = (account) => {
          const now = new Date();
          const month = String(now.getMonth() + 1).padStart(2, '0');
          const year = String(now.getFullYear()).slice(-2);
          const accountCode = account.accountCode || 'XX';
          
          return `${accountCode}${year}${month}`;
        };

        const generatedRef = generateReconciliationReference(testAccount);
        
        // Should start with account code
        expect.toContain(generatedRef, 'CHK001');
        
        // Should include current year (last 2 digits) and month
        const now = new Date();
        const expectedMonth = String(now.getMonth() + 1).padStart(2, '0');
        const expectedYear = String(now.getFullYear()).slice(-2);
        
        expect.toContain(generatedRef, expectedYear);
        expect.toContain(generatedRef, expectedMonth);
        
        // Should have correct format length
        expect.toBe(generatedRef.length, testAccount.accountCode.length + 4); // AccountCode + YYMM
      }
    },

    {
      id: 'reconciliation-transaction-selection',
      suite: 'Reconciliation - Transaction Management',
      name: 'should manage transaction selection and running total',
      description: 'Handles transaction selection/deselection and calculates running totals',
      expectedBehavior: 'Running total should update based on selected transactions',
      testFunction: () => {
        beforeEach();

        let reconciliationState = createReconciliationState();
        reconciliationState.accountId = testAccount.id;

        // Mock transaction toggle function
        const handleTransactionToggle = (transaction, state) => {
          const newSelected = new Set(state.selectedTransactions);
          
          if (newSelected.has(transaction.id)) {
            newSelected.delete(transaction.id);
          } else {
            newSelected.add(transaction.id);
          }
          
          const newRunningTotal = calculateRunningTotal(newSelected, testTransactions);
          
          return {
            ...state,
            selectedTransactions: newSelected,
            runningTotal: newRunningTotal
          };
        };

        // Select first transaction (Deposit: +500.00)
        reconciliationState = handleTransactionToggle(testTransactions[0], reconciliationState);
        expect.toBe(reconciliationState.selectedTransactions.has(testTransactions[0].id), true);
        expect.toBe(reconciliationState.runningTotal, 500.00);

        // Select second transaction (ATM: -100.00, Total: 400.00)
        reconciliationState = handleTransactionToggle(testTransactions[1], reconciliationState);
        expect.toBe(reconciliationState.selectedTransactions.has(testTransactions[1].id), true);
        expect.toBe(reconciliationState.runningTotal, 400.00);

        // Deselect first transaction (Total: -100.00)
        reconciliationState = handleTransactionToggle(testTransactions[0], reconciliationState);
        expect.toBe(reconciliationState.selectedTransactions.has(testTransactions[0].id), false);
        expect.toBe(reconciliationState.runningTotal, -100.00);
      }
    },

    {
      id: 'reconciliation-balance-calculation',
      suite: 'Reconciliation - Balance Calculations',
      name: 'should calculate reconciliation difference and balance status',
      description: 'Computes difference between running total and bank statement total',
      expectedBehavior: 'Should identify balanced, over, and under scenarios correctly',
      testFunction: () => {
        beforeEach();

        // Mock balance calculation functions
        const calculateDifference = (runningTotal, bankStatementTotal) => {
          return runningTotal - bankStatementTotal;
        };

        const isBalanced = (difference, tolerance = 0.01) => {
          return Math.abs(difference) < tolerance;
        };

        const getBalanceStatus = (difference) => {
          if (Math.abs(difference) < 0.01) return 'balanced';
          if (difference > 0) return 'over';
          return 'under';
        };

        // Test balanced scenario
        const runningTotal = 350.00;
        const bankStatementTotal = 350.00;
        let difference = calculateDifference(runningTotal, bankStatementTotal);
        
        expect.toBe(difference, 0);
        expect.toBe(isBalanced(difference), true);
        expect.toBe(getBalanceStatus(difference), 'balanced');

        // Test over scenario (more selected than bank statement)
        const overRunningTotal = 400.00;
        const overBankTotal = 350.00;
        difference = calculateDifference(overRunningTotal, overBankTotal);
        
        expect.toBe(difference, 50.00);
        expect.toBe(isBalanced(difference), false);
        expect.toBe(getBalanceStatus(difference), 'over');

        // Test under scenario (less selected than bank statement)
        const underRunningTotal = 300.00;
        const underBankTotal = 350.00;
        difference = calculateDifference(underRunningTotal, underBankTotal);
        
        expect.toBe(difference, -50.00);
        expect.toBe(isBalanced(difference), false);
        expect.toBe(getBalanceStatus(difference), 'under');

        // Test floating point precision tolerance
        const fpRunningTotal = 350.001;
        const fpBankTotal = 350.00;
        difference = calculateDifference(fpRunningTotal, fpBankTotal);
        
        expect.toBe(isBalanced(difference), true); // Should be balanced within tolerance
      }
    },

    {
      id: 'reconciliation-database-operations',
      suite: 'Reconciliation - Database Operations',
      name: 'should reconcile and unreconcile transactions in database',
      description: 'Updates transaction records with reconciliation reference and timestamp',
      expectedBehavior: 'Transactions should be marked as reconciled with reference and timestamp',
      testFunction: () => {
        beforeEach();

        const testTransaction = testTransactions[0];
        const reconciliationReference = 'CHK00125001';

        // Test reconcile transaction
        const reconciledTransaction = db.reconcileTransaction(testTransaction.id, reconciliationReference);
        
        expect.toBe(reconciledTransaction.reconciliationReference, reconciliationReference);
        expect.toBeDefined(reconciledTransaction.reconciledAt);
        
        // Verify timestamp format (should be ISO string)
        const reconciledDate = new Date(reconciledTransaction.reconciledAt);
        expect.toBe(isNaN(reconciledDate.getTime()), false);

        // Verify transaction is marked as reconciled in database
        const updatedTransaction = db.getTable('transactions').find(t => t.id === testTransaction.id);
        expect.toBe(updatedTransaction.reconciliationReference, reconciliationReference);

        // Test unreconcile transaction
        const unreconciledTransaction = db.unreconcileTransaction(testTransaction.id);
        
        expect.toBe(unreconciledTransaction.reconciliationReference, null);
        expect.toBe(unreconciledTransaction.reconciledAt, null);

        // Verify transaction is no longer reconciled in database
        const finalTransaction = db.getTable('transactions').find(t => t.id === testTransaction.id);
        expect.toBe(finalTransaction.reconciliationReference, null);
      }
    },

    {
      id: 'reconciliation-unreconciled-transactions',
      suite: 'Reconciliation - Transaction Filtering',
      name: 'should retrieve unreconciled transactions for account',
      description: 'Filters transactions to show only unreconciled ones for selected account',
      expectedBehavior: 'Should return only transactions without reconciliation reference',
      testFunction: () => {
        beforeEach();

        // Initially all transactions should be unreconciled
        const unreconciledTransactions = db.getUnreconciledTransactions(testAccount.id);
        expect.toBe(unreconciledTransactions.length, 3);

        // Reconcile one transaction
        db.reconcileTransaction(testTransactions[0].id, 'CHK00125001');

        // Should now return 2 unreconciled transactions
        const remainingUnreconciled = db.getUnreconciledTransactions(testAccount.id);
        expect.toBe(remainingUnreconciled.length, 2);
        
        // Verify the reconciled transaction is not in the list
        const reconciledIds = remainingUnreconciled.map(t => t.id);
        expect.toBe(reconciledIds.includes(testTransactions[0].id), false);

        // Test without account filter (all accounts)
        const allUnreconciled = db.getUnreconciledTransactions();
        expect.toBe(allUnreconciled.length >= 2, true); // At least 2 from our test account
      }
    },

    {
      id: 'reconciliation-completion-validation',
      suite: 'Reconciliation - Process Completion',
      name: 'should validate reconciliation completion requirements',
      description: 'Ensures proper validation before allowing reconciliation completion',
      expectedBehavior: 'Should check balance status and require confirmation for unbalanced reconciliations',
      testFunction: () => {
        beforeEach();

        // Mock completion validation
        const validateReconciliationCompletion = (state) => {
          const difference = state.runningTotal - state.bankStatementTotal;
          const isBalanced = Math.abs(difference) < 0.01;
          
          return {
            canComplete: true, // Always allow completion but may require confirmation
            isBalanced,
            difference,
            requiresConfirmation: !isBalanced,
            selectedCount: state.selectedTransactions.size
          };
        };

        // Test balanced reconciliation
        let reconciliationState = {
          runningTotal: 350.00,
          bankStatementTotal: 350.00,
          selectedTransactions: new Set(['TXN_001', 'TXN_002']),
          reconciliationReference: 'CHK00125001'
        };

        let validation = validateReconciliationCompletion(reconciliationState);
        expect.toBe(validation.canComplete, true);
        expect.toBe(validation.isBalanced, true);
        expect.toBe(validation.requiresConfirmation, false);
        expect.toBe(validation.selectedCount, 2);

        // Test unbalanced reconciliation
        reconciliationState.runningTotal = 400.00; // $50 over
        
        validation = validateReconciliationCompletion(reconciliationState);
        expect.toBe(validation.canComplete, true);
        expect.toBe(validation.isBalanced, false);
        expect.toBe(validation.requiresConfirmation, true);
        expect.toBe(validation.difference, 50.00);
      }
    },

    {
      id: 'reconciliation-bulk-operations',
      suite: 'Reconciliation - Bulk Operations', 
      name: 'should perform bulk reconciliation of selected transactions',
      description: 'Reconciles multiple selected transactions in a single operation',
      expectedBehavior: 'All selected transactions should be reconciled with same reference',
      testFunction: () => {
        beforeEach();

        const reconciliationReference = 'CHK00125001';
        const selectedTransactionIds = [testTransactions[0].id, testTransactions[1].id];

        // Mock bulk reconciliation function
        const bulkReconcileTransactions = (transactionIds, reference) => {
          const results = [];
          
          for (const transactionId of transactionIds) {
            try {
              const reconciledTransaction = db.reconcileTransaction(transactionId, reference);
              results.push({ success: true, transaction: reconciledTransaction });
            } catch (error) {
              results.push({ success: false, transactionId, error: error.message });
            }
          }
          
          return results;
        };

        const results = bulkReconcileTransactions(selectedTransactionIds, reconciliationReference);
        
        // All operations should succeed
        expect.toBe(results.length, 2);
        expect.toBe(results.every(r => r.success), true);

        // Verify transactions are reconciled in database
        const reconciled1 = db.getTable('transactions').find(t => t.id === testTransactions[0].id);
        const reconciled2 = db.getTable('transactions').find(t => t.id === testTransactions[1].id);
        
        expect.toBe(reconciled1.reconciliationReference, reconciliationReference);
        expect.toBe(reconciled2.reconciliationReference, reconciliationReference);
        expect.toBeDefined(reconciled1.reconciledAt);
        expect.toBeDefined(reconciled2.reconciledAt);

        // Unreconciled count should be reduced
        const unreconciledTransactions = db.getUnreconciledTransactions(testAccount.id);
        expect.toBe(unreconciledTransactions.length, 1);
      }
    },

    {
      id: 'reconciliation-filtering-reconciled',
      suite: 'Reconciliation - Transaction Filtering',
      name: 'should filter between reconciled and unreconciled transactions',
      description: 'Provides filtering options to show/hide reconciled transactions',
      expectedBehavior: 'Filter should control visibility of reconciled vs unreconciled transactions',
      testFunction: () => {
        beforeEach();

        // Reconcile one transaction
        db.reconcileTransaction(testTransactions[0].id, 'CHK00125001');

        // Mock filtering function
        const filterTransactionsByReconciliation = (accountId, showReconciled) => {
          const allAccountTransactions = db.getTable('transactions').filter(t => t.accountId === accountId);
          
          if (showReconciled === 'show') {
            // Show all transactions (both reconciled and unreconciled)
            return allAccountTransactions;
          } else {
            // Show only unreconciled transactions
            return allAccountTransactions.filter(t => !t.reconciliationReference);
          }
        };

        // Test showing only unreconciled (default)
        const unreconciledOnly = filterTransactionsByReconciliation(testAccount.id, 'hide');
        expect.toBe(unreconciledOnly.length, 2);
        
        // Verify none have reconciliation reference
        expect.toBe(unreconciledOnly.every(t => !t.reconciliationReference), true);

        // Test showing all transactions
        const allTransactions = filterTransactionsByReconciliation(testAccount.id, 'show');
        expect.toBe(allTransactions.length, 3);
        
        // Should include both reconciled and unreconciled
        const reconciledCount = allTransactions.filter(t => t.reconciliationReference).length;
        const unreconciledCount = allTransactions.filter(t => !t.reconciliationReference).length;
        
        expect.toBe(reconciledCount, 1);
        expect.toBe(unreconciledCount, 2);
      }
    },

    {
      id: 'reconciliation-state-reset',
      suite: 'Reconciliation - State Management',
      name: 'should reset reconciliation state to initial values',
      description: 'Clears all reconciliation state when reset is triggered',
      expectedBehavior: 'All state values should return to initial empty/default values',
      testFunction: () => {
        beforeEach();

        // Create populated reconciliation state
        let reconciliationState = {
          reconciliationReference: 'CHK00125001',
          bankStatementTotal: 350.00,
          accountId: testAccount.id,
          selectedTransactions: new Set([testTransactions[0].id, testTransactions[1].id]),
          runningTotal: 400.00,
          isActive: true,
          step: 2
        };

        // Mock reset function
        const resetReconciliationState = () => ({
          reconciliationReference: '',
          bankStatementTotal: 0,
          accountId: '',
          selectedTransactions: new Set(),
          runningTotal: 0,
          isActive: false,
          step: 1
        });

        const resetState = resetReconciliationState();

        expect.toBe(resetState.reconciliationReference, '');
        expect.toBe(resetState.bankStatementTotal, 0);
        expect.toBe(resetState.accountId, '');
        expect.toBe(resetState.selectedTransactions.size, 0);
        expect.toBe(resetState.runningTotal, 0);
        expect.toBe(resetState.isActive, false);
        expect.toBe(resetState.step, 1);
      }
    },

    {
      id: 'reconciliation-currency-formatting',
      suite: 'Reconciliation - Currency Display',
      name: 'should format currency amounts based on account currency',
      description: 'Displays reconciliation amounts in account\'s native currency with proper formatting',
      expectedBehavior: 'Amounts should show currency symbol and correct decimal places',
      testFunction: () => {
        beforeEach();

        // Mock currency formatting function
        const formatReconciliationCurrency = (amount, account) => {
          // Get currency from account
          const currencies = db.getTable('currencies');
          const currency = currencies.find(c => c.id === account.currencyId);
          
          if (currency) {
            const decimalPlaces = currency.decimalPlaces || 2;
            return `${currency.symbol}${Math.abs(amount).toFixed(decimalPlaces)}`;
          }
          
          return amount.toFixed(2);
        };

        // Test positive amount
        const formattedPositive = formatReconciliationCurrency(1350.50, testAccount);
        expect.toContain(formattedPositive, '€'); // EUR symbol from test data
        expect.toContain(formattedPositive, '1350.50');

        // Test negative amount (should show absolute value)
        const formattedNegative = formatReconciliationCurrency(-150.25, testAccount);
        expect.toContain(formattedNegative, '€');
        expect.toContain(formattedNegative, '150.25');

        // Test zero amount
        const formattedZero = formatReconciliationCurrency(0, testAccount);
        expect.toContain(formattedZero, '€');
        expect.toContain(formattedZero, '0.00');
      }
    },

    {
      id: 'reconciliation-date-range-filtering',
      suite: 'Reconciliation - Advanced Filtering',
      name: 'should filter transactions by date range during reconciliation',
      description: 'Allows filtering of reconciliation transactions by date range',
      expectedBehavior: 'Only transactions within specified date range should be shown',
      testFunction: () => {
        beforeEach();

        // Mock date range filtering
        const filterTransactionsByDateRange = (transactions, dateFrom, dateTo) => {
          return transactions.filter(transaction => {
            if (!transaction.date) return false;
            
            const transactionDate = transaction.date;
            
            if (dateFrom && transactionDate < dateFrom) return false;
            if (dateTo && transactionDate > dateTo) return false;
            
            return true;
          });
        };

        const allTransactions = testTransactions;

        // Test filtering with date range
        const dateFrom = '2024-01-16';
        const dateTo = '2024-01-17';
        
        const filteredTransactions = filterTransactionsByDateRange(allTransactions, dateFrom, dateTo);
        expect.toBe(filteredTransactions.length, 2); // Should include 16th and 17th

        // Verify correct transactions are included
        const dates = filteredTransactions.map(t => t.date);
        expect.toBe(dates.includes('2024-01-16'), true);
        expect.toBe(dates.includes('2024-01-17'), true);
        expect.toBe(dates.includes('2024-01-15'), false); // Should be excluded

        // Test with only dateFrom
        const fromOnlyFiltered = filterTransactionsByDateRange(allTransactions, '2024-01-16', null);
        expect.toBe(fromOnlyFiltered.length, 2); // 16th and 17th

        // Test with only dateTo  
        const toOnlyFiltered = filterTransactionsByDateRange(allTransactions, null, '2024-01-16');
        expect.toBe(toOnlyFiltered.length, 2); // 15th and 16th
      }
    },

    {
      id: 'reconciliation-error-handling',
      suite: 'Reconciliation - Error Handling',
      name: 'should handle errors during reconciliation operations',
      description: 'Properly handles errors when reconciling invalid or non-existent transactions',
      expectedBehavior: 'Should throw appropriate errors and maintain data integrity',
      testFunction: () => {
        beforeEach();

        // Test reconciling non-existent transaction
        expect.toThrow(() => {
          db.reconcileTransaction('INVALID_ID', 'CHK00125001');
        });

        // Test unreconciling non-existent transaction
        expect.toThrow(() => {
          db.unreconcileTransaction('INVALID_ID');
        });

        // Test with invalid reconciliation reference (null/empty)
        const validTransaction = testTransactions[0];
        
        // Should handle empty reference gracefully
        try {
          const reconciledTransaction = db.reconcileTransaction(validTransaction.id, '');
          expect.toBe(reconciledTransaction.reconciliationReference, '');
        } catch (error) {
          // If implementation validates non-empty references, that's also acceptable
          expect.toContain(error.message.toLowerCase(), 'reference');
        }

        // Verify database integrity after error scenarios
        const unreconciledCount = db.getUnreconciledTransactions(testAccount.id).length;
        expect.toBe(unreconciledCount, 3); // Should still have all original transactions
      }
    },

    {
      id: 'reconciliation-timezone-safe-dates',
      suite: 'Reconciliation - Date Safety',
      name: 'should handle reconciliation dates safely across timezones',
      description: 'Uses timezone-safe date handling for reconciliation timestamps',
      expectedBehavior: 'Reconciliation dates should not be affected by timezone differences',
      testFunction: () => {
        beforeEach();

        const testTransaction = testTransactions[0];
        const reconciliationReference = 'CHK00125001';

        // Reconcile transaction
        const reconciledTransaction = db.reconcileTransaction(testTransaction.id, reconciliationReference);

        // Verify reconciledAt timestamp is valid ISO string
        const reconciledAtDate = new Date(reconciledTransaction.reconciledAt);
        expect.toBe(isNaN(reconciledAtDate.getTime()), false);

        // Test that the timestamp is recent (within last minute)
        const now = new Date();
        const timeDifference = Math.abs(now.getTime() - reconciledAtDate.getTime());
        expect.toBe(timeDifference < 60000, true); // Less than 1 minute difference

        // Test timezone-safe date utility function
        const testDate = new Date(2024, 0, 15, 12, 30, 45); // Jan 15, 2024 12:30:45
        const safeISOString = dateToISOString(testDate);
        expect.toBe(safeISOString, '2024-01-15');

        // Verify consistency across different times of day
        const midnightDate = new Date(2024, 0, 15, 0, 0, 0);
        const noonDate = new Date(2024, 0, 15, 12, 0, 0);
        
        expect.toBe(dateToISOString(midnightDate), '2024-01-15');
        expect.toBe(dateToISOString(noonDate), '2024-01-15');
      }
    }
  ];
};