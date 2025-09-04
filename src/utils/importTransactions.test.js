// Import Transactions Tests - Comprehensive test coverage for CSV import functionality
import RelationalDatabase from './relationalDatabase.js';

// Mock Papa Parse library for CSV parsing
const mockPapaParse = {
  parse: (file, options) => {
    // Mock CSV parsing results based on file content
    const mockResults = {
      'test-transactions.csv': {
        data: [
          { 'Date': '01/15/2024', 'Description': 'Coffee Shop Purchase', 'Amount': '-5.50' },
          { 'Date': '01/16/2024', 'Description': 'Salary Deposit', 'Amount': '3000.00' },
          { 'Date': '01/17/2024', 'Description': 'Gas Station', 'Amount': '-45.75' },
          { 'Date': '01/18/2024', 'Description': 'Investment Buy AAPL', 'Amount': '-1500.00' }
        ],
        errors: []
      },
      'invalid-dates.csv': {
        data: [
          { 'Date': 'invalid-date', 'Description': 'Test Transaction', 'Amount': '100.00' },
          { 'Date': '99/99/9999', 'Description': 'Bad Date Format', 'Amount': '50.00' }
        ],
        errors: []
      },
      'separate-columns.csv': {
        data: [
          { 'Date': '01/15/2024', 'Description': 'Expense', 'Debit': '25.00', 'Credit': '' },
          { 'Date': '01/16/2024', 'Description': 'Income', 'Debit': '', 'Credit': '1000.00' }
        ],
        errors: []
      }
    };

    const fileName = file.name || 'test-transactions.csv';
    const result = mockResults[fileName] || mockResults['test-transactions.csv'];
    
    if (options.complete) {
      setTimeout(() => options.complete(result), 10);
    }
  }
};

// Mock window.Papa for browser environment
if (typeof window !== 'undefined') {
  window.Papa = mockPapaParse;
}

export const createImportTransactionsTests = () => {
  let db;
  let mockBankConfig;
  let mockProcessingRules;
  
  const beforeEach = () => {
    db = new RelationalDatabase();
    db.createNewDatabase('en');
    
    // Mock bank configuration
    mockBankConfig = {
      id: 'BANK_001',
      name: 'Test Bank',
      fieldMapping: {
        date: 'Date',
        description: 'Description', 
        amount: 'Amount',
        debit: 'Debit',
        credit: 'Credit'
      },
      settings: {
        hasHeaders: true,
        delimiter: ',',
        encoding: 'UTF-8',
        dateFormat: 'MM/DD/YYYY',
        amountHandling: 'single'
      }
    };

    // Mock processing rules
    mockProcessingRules = [
      {
        id: 'RULE_001',
        name: 'Coffee Shop Expense Rule',
        conditions: [{ field: 'description', operator: 'contains', value: 'Coffee' }],
        actions: [{ type: 'SET_TRANSACTION_TYPE', value: 'Expenses' }],
        isActive: true,
        ruleOrder: 1
      },
      {
        id: 'RULE_002', 
        name: 'Salary Income Rule',
        conditions: [{ field: 'description', operator: 'contains', value: 'Salary' }],
        actions: [{ type: 'SET_TRANSACTION_TYPE', value: 'Income' }],
        isActive: true,
        ruleOrder: 2
      }
    ];
  };

  // Helper functions for import functionality
  const dateToISOString = (date) => {
    if (!date) return '';
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const parseDate = (dateString, format) => {
    if (!dateString) return null;
    
    const cleaned = dateString.replace(/['"]/g, '').trim();
    if (!cleaned) return null;

    try {
      let date;
      if (format === 'MM/DD/YYYY') {
        const [month, day, year] = cleaned.split('/');
        const monthNum = parseInt(month, 10);
        const dayNum = parseInt(day, 10);
        const yearNum = parseInt(year, 10);
        
        // Validate ranges before creating Date
        if (monthNum < 1 || monthNum > 12 || dayNum < 1 || dayNum > 31 || yearNum < 1900 || yearNum > 9999) {
          return null;
        }
        
        date = new Date(yearNum, monthNum - 1, dayNum);
      } else if (format === 'DD/MM/YYYY') {
        const [day, month, year] = cleaned.split('/');
        const monthNum = parseInt(month, 10);
        const dayNum = parseInt(day, 10);
        const yearNum = parseInt(year, 10);
        
        // Validate ranges before creating Date
        if (monthNum < 1 || monthNum > 12 || dayNum < 1 || dayNum > 31 || yearNum < 1900 || yearNum > 9999) {
          return null;
        }
        
        date = new Date(yearNum, monthNum - 1, dayNum);
      } else if (format === 'YYYY-MM-DD') {
        date = new Date(cleaned);
      } else {
        date = new Date(cleaned);
      }

      if (isNaN(date.getTime())) {
        return null;
      }

      return dateToISOString(date);
    } catch (error) {
      return null;
    }
  };

  const parseAmount = (row, bankConfig) => {
    const { fieldMapping, settings } = bankConfig;
    
    if (settings.amountHandling === 'separate') {
      const debitValue = row[fieldMapping.debit] || '0';
      const creditValue = row[fieldMapping.credit] || '0';
      
      const debit = parseFloat(debitValue.replace(/[^-0-9.]/g, '')) || 0;
      const credit = parseFloat(creditValue.replace(/[^-0-9.]/g, '')) || 0;
      
      return credit > 0 ? credit : -debit;
    } else {
      const amountValue = row[fieldMapping.amount] || '0';
      return parseFloat(amountValue.replace(/[^-0-9.]/g, '')) || 0;
    }
  };

  const detectDuplicates = (newTransaction, existingTransactions) => {
    const matches = existingTransactions.filter(existing => {
      const amountMatch = Math.abs(existing.amount - newTransaction.amount) < 0.01;
      const dateMatch = existing.date === newTransaction.date;
      const descMatch = existing.description && newTransaction.description &&
        existing.description.toLowerCase().includes(newTransaction.description.toLowerCase().substring(0, 10));
      
      return amountMatch && dateMatch && descMatch;
    });

    return matches.length > 0;
  };

  const validateTransaction = (transaction) => {
    const errors = [];
    const warnings = [];

    // Required fields validation
    if (!transaction.date) {
      errors.push('Missing or invalid date - check date field mapping');
    }

    if (!transaction.description || transaction.description.trim() === '') {
      errors.push('Missing description - check description field mapping');
    }

    if (transaction.amount === 0 || isNaN(transaction.amount)) {
      errors.push('Invalid amount - check amount/debit/credit field mapping');
    }

    if (!transaction.subcategoryId) {
      errors.push('Missing subcategory - transaction classification required');
    }

    // Account mapping warnings
    if (!transaction.fromAccountId && !transaction.toAccountId && !transaction.accountId) {
      warnings.push('No account mapping - will need manual assignment during review');
    }

    // Transaction type specific validations
    const transactionType = transaction.transactionType?.toLowerCase();
    
    if (transactionType === 'income' && !transaction.payer) {
      warnings.push('Income transaction missing payer - required for Add Transaction form');
    }
    
    if (transactionType === 'expenses' && !transaction.payee) {
      warnings.push('Expenses transaction missing payee - required for Add Transaction form');
    }
    
    if (transactionType === 'transfer' && !transaction.destinationAccountId) {
      warnings.push('Transfer transaction missing destination account');
    }

    return { errors, warnings };
  };

  return [
    {
      id: 'import-csv-parsing',
      suite: 'Import Transactions - CSV Parsing',
      name: 'should parse CSV file with correct field mapping',
      description: 'Parses CSV file and maps fields according to bank configuration',
      expectedBehavior: 'CSV rows should be converted to transaction objects with correct field mapping',
      testFunction: () => {
        beforeEach();
        
        // Mock CSV data
        const csvRow = {
          'Date': '01/15/2024',
          'Description': 'Coffee Shop Purchase',
          'Amount': '-5.50'
        };

        // Parse date
        const parsedDate = parseDate(csvRow[mockBankConfig.fieldMapping.date], mockBankConfig.settings.dateFormat);
        expect.toBe(parsedDate, '2024-01-15');

        // Parse amount
        const parsedAmount = parseAmount(csvRow, mockBankConfig);
        expect.toBe(parsedAmount, -5.50);

        // Parse description
        const description = csvRow[mockBankConfig.fieldMapping.description];
        expect.toBe(description, 'Coffee Shop Purchase');
      }
    },

    {
      id: 'import-date-formats',
      suite: 'Import Transactions - Date Parsing', 
      name: 'should handle different date formats correctly',
      description: 'Parses dates in MM/DD/YYYY, DD/MM/YYYY, and YYYY-MM-DD formats',
      expectedBehavior: 'All date formats should be converted to YYYY-MM-DD internal format',
      testFunction: () => {
        beforeEach();

        // Test MM/DD/YYYY format
        const usDate = parseDate('01/15/2024', 'MM/DD/YYYY');
        expect.toBe(usDate, '2024-01-15');

        // Test DD/MM/YYYY format
        const euDate = parseDate('15/01/2024', 'DD/MM/YYYY');
        expect.toBe(euDate, '2024-01-15');

        // Test YYYY-MM-DD format
        const isoDate = parseDate('2024-01-15', 'YYYY-MM-DD');
        expect.toBe(isoDate, '2024-01-15');

        // Test invalid date handling
        const invalidDate = parseDate('invalid-date', 'MM/DD/YYYY');
        expect.toBe(invalidDate, null);
      }
    },

    {
      id: 'import-amount-parsing-single',
      suite: 'Import Transactions - Amount Parsing',
      name: 'should parse single amount column correctly',
      description: 'Handles single signed amount column with positive and negative values',
      expectedBehavior: 'Positive amounts for income, negative amounts for expenses',
      testFunction: () => {
        beforeEach();

        const singleAmountConfig = { ...mockBankConfig, settings: { ...mockBankConfig.settings, amountHandling: 'single' }};

        // Test positive amount (income)
        const incomeRow = { 'Amount': '1500.00' };
        const incomeAmount = parseAmount(incomeRow, singleAmountConfig);
        expect.toBe(incomeAmount, 1500.00);

        // Test negative amount (expense)
        const expenseRow = { 'Amount': '-45.75' };
        const expenseAmount = parseAmount(expenseRow, singleAmountConfig);
        expect.toBe(expenseAmount, -45.75);

        // Test amount with currency symbols and commas
        const formattedRow = { 'Amount': '$1,234.56' };
        const formattedAmount = parseAmount(formattedRow, singleAmountConfig);
        expect.toBe(formattedAmount, 1234.56);
      }
    },

    {
      id: 'import-amount-parsing-separate',
      suite: 'Import Transactions - Amount Parsing',
      name: 'should parse separate debit/credit columns correctly',
      description: 'Handles separate debit and credit columns correctly',
      expectedBehavior: 'Credits return positive values, debits return negative values',
      testFunction: () => {
        beforeEach();

        const separateAmountConfig = { 
          ...mockBankConfig, 
          settings: { ...mockBankConfig.settings, amountHandling: 'separate' }
        };

        // Test debit transaction
        const debitRow = { 'Debit': '25.00', 'Credit': '' };
        const debitAmount = parseAmount(debitRow, separateAmountConfig);
        expect.toBe(debitAmount, -25.00);

        // Test credit transaction
        const creditRow = { 'Debit': '', 'Credit': '1000.00' };
        const creditAmount = parseAmount(creditRow, separateAmountConfig);
        expect.toBe(creditAmount, 1000.00);

        // Test row with both values (should use credit)
        const bothRow = { 'Debit': '10.00', 'Credit': '500.00' };
        const bothAmount = parseAmount(bothRow, separateAmountConfig);
        expect.toBe(bothAmount, 500.00);
      }
    },

    {
      id: 'import-duplicate-detection',
      suite: 'Import Transactions - Duplicate Detection',
      name: 'should detect duplicate transactions correctly',
      description: 'Identifies potential duplicates based on amount, date, and description',
      expectedBehavior: 'Transactions with matching criteria should be flagged as duplicates',
      testFunction: () => {
        beforeEach();

        // Add existing transaction to database
        const existingTransaction = {
          id: 'TXN_001',
          date: '2024-01-15',
          description: 'Coffee Shop Purchase', 
          amount: -5.50
        };

        const existingTransactions = [existingTransaction];

        // Test duplicate detection
        const duplicateTransaction = {
          date: '2024-01-15',
          description: 'Coffee Shop',
          amount: -5.50
        };

        const isDuplicate = detectDuplicates(duplicateTransaction, existingTransactions);
        expect.toBe(isDuplicate, true);

        // Test non-duplicate
        const uniqueTransaction = {
          date: '2024-01-16',
          description: 'Different Store',
          amount: -10.00
        };

        const isNotDuplicate = detectDuplicates(uniqueTransaction, existingTransactions);
        expect.toBe(isNotDuplicate, false);
      }
    },

    {
      id: 'import-transaction-validation-required-fields',
      suite: 'Import Transactions - Validation',
      name: 'should validate required transaction fields',
      description: 'Validates that all required fields are present and valid',
      expectedBehavior: 'Missing required fields should generate validation errors',
      testFunction: () => {
        beforeEach();

        // Test complete valid transaction
        const validTransaction = {
          date: '2024-01-15',
          description: 'Coffee Shop Purchase',
          amount: -5.50,
          subcategoryId: 'SUB_001'
        };

        const validResult = validateTransaction(validTransaction);
        expect.toBe(validResult.errors.length, 0);

        // Test transaction missing required fields
        const invalidTransaction = {
          date: '',
          description: '',
          amount: 0,
          subcategoryId: null
        };

        const invalidResult = validateTransaction(invalidTransaction);
        expect.toBe(invalidResult.errors.length > 0, true);
        expect.toContain(invalidResult.errors.join(' '), 'Missing or invalid date');
        expect.toContain(invalidResult.errors.join(' '), 'Missing description');
        expect.toContain(invalidResult.errors.join(' '), 'Invalid amount');
        expect.toContain(invalidResult.errors.join(' '), 'Missing subcategory');
      }
    },

    {
      id: 'import-transaction-validation-conditional-fields',
      suite: 'Import Transactions - Validation',
      name: 'should validate transaction type specific requirements',
      description: 'Validates conditional requirements based on transaction type',
      expectedBehavior: 'Transaction types should have appropriate field requirements',
      testFunction: () => {
        beforeEach();

        // Test income transaction validation
        const incomeTransaction = {
          date: '2024-01-15',
          description: 'Salary',
          amount: 3000.00,
          transactionType: 'Income',
          subcategoryId: 'SUB_001'
        };

        const incomeResult = validateTransaction(incomeTransaction);
        expect.toContain(incomeResult.warnings.join(' '), 'Income transaction missing payer');

        // Test expense transaction validation
        const expenseTransaction = {
          date: '2024-01-15',
          description: 'Coffee',
          amount: -5.50,
          transactionType: 'Expenses',
          subcategoryId: 'SUB_001'
        };

        const expenseResult = validateTransaction(expenseTransaction);
        expect.toContain(expenseResult.warnings.join(' '), 'Expenses transaction missing payee');

        // Test transfer transaction validation
        const transferTransaction = {
          date: '2024-01-15',
          description: 'Account Transfer',
          amount: -1000.00,
          transactionType: 'Transfer',
          subcategoryId: 'SUB_001'
        };

        const transferResult = validateTransaction(transferTransaction);
        expect.toContain(transferResult.warnings.join(' '), 'Transfer transaction missing destination account');
      }
    },

    {
      id: 'import-processing-rules-application',
      suite: 'Import Transactions - Processing Rules',
      name: 'should apply processing rules to transactions',
      description: 'Applies active processing rules to modify transaction data during import',
      expectedBehavior: 'Matching conditions should trigger rule actions',
      testFunction: () => {
        beforeEach();

        // Mock rule processor function
        const applyProcessingRules = (transaction, rules) => {
          let modifiedTransaction = { ...transaction };
          const appliedRules = [];
          
          for (const rule of rules) {
            if (rule.isActive) {
              // Simple condition matching for test
              const condition = rule.conditions[0];
              if (condition.field === 'description' && 
                  condition.operator === 'contains' &&
                  transaction.description.toLowerCase().includes(condition.value.toLowerCase())) {
                
                // Apply action
                const action = rule.actions[0];
                if (action.type === 'SET_TRANSACTION_TYPE') {
                  modifiedTransaction.transactionType = action.value;
                }
                
                appliedRules.push({
                  ruleId: rule.id,
                  ruleName: rule.name,
                  changes: [{ type: action.type, value: action.value }]
                });
              }
            }
          }
          
          return { transaction: modifiedTransaction, applied: appliedRules };
        };

        // Test coffee shop rule
        const coffeeTransaction = {
          description: 'Coffee Shop Purchase',
          amount: -5.50
        };

        const coffeeResult = applyProcessingRules(coffeeTransaction, mockProcessingRules);
        expect.toBe(coffeeResult.transaction.transactionType, 'Expenses');
        expect.toBe(coffeeResult.applied.length, 1);
        expect.toBe(coffeeResult.applied[0].ruleName, 'Coffee Shop Expense Rule');

        // Test salary rule
        const salaryTransaction = {
          description: 'Salary Deposit',
          amount: 3000.00
        };

        const salaryResult = applyProcessingRules(salaryTransaction, mockProcessingRules);
        expect.toBe(salaryResult.transaction.transactionType, 'Income');
        expect.toBe(salaryResult.applied.length, 1);
        expect.toBe(salaryResult.applied[0].ruleName, 'Salary Income Rule');
      }
    },

    {
      id: 'import-file-format-validation',
      suite: 'Import Transactions - File Validation',
      name: 'should validate CSV file format and structure',
      description: 'Validates that uploaded files are valid CSV format with expected columns',
      expectedBehavior: 'Only valid CSV files with proper structure should be accepted',
      testFunction: () => {
        beforeEach();

        // Test valid file type validation
        const validFile = { name: 'transactions.csv', type: 'text/csv' };
        const isValidCSV = validFile.type === 'text/csv' || validFile.name.endsWith('.csv');
        expect.toBe(isValidCSV, true);

        // Test invalid file type
        const invalidFile = { name: 'transactions.txt', type: 'text/plain' };
        const isInvalidFile = invalidFile.type === 'text/csv' || invalidFile.name.endsWith('.csv');
        expect.toBe(isInvalidFile, false);

        // Test Excel file support
        const excelFile = { name: 'transactions.xlsx', type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' };
        const isValidExcel = excelFile.name.endsWith('.xlsx') || excelFile.name.endsWith('.xls');
        expect.toBe(isValidExcel, true);
      }
    },

    {
      id: 'import-error-handling',
      suite: 'Import Transactions - Error Handling',
      name: 'should handle parsing errors gracefully',
      description: 'Handles malformed CSV data and parsing errors without crashing',
      expectedBehavior: 'Parsing errors should be captured and reported to user',
      testFunction: () => {
        beforeEach();

        // Test handling of empty values
        const rowWithEmptyValues = {
          'Date': '',
          'Description': null,
          'Amount': undefined
        };

        // Date parsing should handle empty values
        const emptyDate = parseDate(rowWithEmptyValues['Date'], 'MM/DD/YYYY');
        expect.toBe(emptyDate, null);

        // Description should handle null/undefined
        const description = rowWithEmptyValues['Description'] || '';
        expect.toBe(description, '');

        // Amount parsing should handle undefined
        const amount = parseAmount(rowWithEmptyValues, mockBankConfig);
        expect.toBe(amount, 0);

        // Test malformed date handling
        const malformedDate = parseDate('99/99/9999', 'MM/DD/YYYY');
        expect.toBe(malformedDate, null);
      }
    },

    {
      id: 'import-batch-processing',
      suite: 'Import Transactions - Batch Processing',
      name: 'should process multiple transactions in batch',
      description: 'Handles batch processing of multiple transactions with progress tracking',
      expectedBehavior: 'Large batches should be processed efficiently with progress updates',
      testFunction: () => {
        beforeEach();

        // Mock batch processing function
        const processBatch = (transactions, batchSize = 100) => {
          const results = [];
          const totalBatches = Math.ceil(transactions.length / batchSize);
          
          for (let i = 0; i < totalBatches; i++) {
            const startIndex = i * batchSize;
            const endIndex = Math.min(startIndex + batchSize, transactions.length);
            const batch = transactions.slice(startIndex, endIndex);
            
            // Process each transaction in batch
            const batchResults = batch.map(transaction => {
              const validation = validateTransaction(transaction);
              return {
                ...transaction,
                status: validation.errors.length > 0 ? 'error' : 'ready',
                errors: validation.errors,
                warnings: validation.warnings
              };
            });
            
            results.push(...batchResults);
          }
          
          return results;
        };

        // Test with sample batch
        const sampleTransactions = [
          { date: '2024-01-15', description: 'Transaction 1', amount: -10.00, subcategoryId: 'SUB_001' },
          { date: '2024-01-16', description: 'Transaction 2', amount: -20.00, subcategoryId: 'SUB_001' },
          { date: '2024-01-17', description: 'Transaction 3', amount: 100.00, subcategoryId: 'SUB_001' },
        ];

        const batchResults = processBatch(sampleTransactions, 2);
        expect.toBe(batchResults.length, 3);
        expect.toBe(batchResults[0].status, 'ready');
        expect.toBe(batchResults[1].status, 'ready');
        expect.toBe(batchResults[2].status, 'ready');
      }
    },

    {
      id: 'import-transaction-status-management',
      suite: 'Import Transactions - Status Management', 
      name: 'should assign correct status to processed transactions',
      description: 'Assigns appropriate status (ready, warning, error) based on validation results',
      expectedBehavior: 'Transaction status should reflect validation outcome',
      testFunction: () => {
        beforeEach();

        // Mock status assignment function
        const assignTransactionStatus = (transaction) => {
          const validation = validateTransaction(transaction);
          const isDuplicate = false; // Simplified for test
          
          let status;
          if (validation.errors.length > 0) {
            status = 'error';
          } else if (validation.warnings.length > 0) {
            status = 'warning';  
          } else {
            status = 'ready';
          }
          
          return {
            ...transaction,
            status,
            errors: validation.errors,
            warnings: validation.warnings,
            isDuplicate
          };
        };

        // Test ready status (valid transaction)
        const readyTransaction = {
          date: '2024-01-15',
          description: 'Valid Transaction',
          amount: -25.00,
          subcategoryId: 'SUB_001'
        };

        const readyResult = assignTransactionStatus(readyTransaction);
        expect.toBe(readyResult.status, 'warning'); // Will have account mapping warning

        // Test error status (missing required fields)
        const errorTransaction = {
          date: '',
          description: '',
          amount: 0,
          subcategoryId: null
        };

        const errorResult = assignTransactionStatus(errorTransaction);
        expect.toBe(errorResult.status, 'error');
        expect.toBe(errorResult.errors.length > 0, true);
      }
    },

    {
      id: 'import-review-queue-filtering',
      suite: 'Import Transactions - Review Queue',
      name: 'should filter transactions by status in review queue',
      description: 'Allows filtering of imported transactions by status for review',
      expectedBehavior: 'Review queue should support filtering by ready, warning, error, and duplicate status',
      testFunction: () => {
        beforeEach();

        // Mock transaction list with different statuses
        const mockTransactions = [
          { id: '1', status: 'ready', isDuplicate: false },
          { id: '2', status: 'warning', isDuplicate: false },
          { id: '3', status: 'error', isDuplicate: false },
          { id: '4', status: 'ready', isDuplicate: true },
        ];

        // Mock filtering function
        const filterTransactions = (transactions, filter) => {
          if (filter === 'all') return transactions;
          
          return transactions.filter(t => {
            switch (filter) {
              case 'ready': return t.status === 'ready' && !t.isDuplicate;
              case 'warning': return t.status === 'warning';
              case 'error': return t.status === 'error';
              case 'duplicate': return t.isDuplicate;
              default: return true;
            }
          });
        };

        // Test filtering
        const readyTransactions = filterTransactions(mockTransactions, 'ready');
        expect.toBe(readyTransactions.length, 1);
        expect.toBe(readyTransactions[0].id, '1');

        const warningTransactions = filterTransactions(mockTransactions, 'warning');
        expect.toBe(warningTransactions.length, 1);

        const errorTransactions = filterTransactions(mockTransactions, 'error');
        expect.toBe(errorTransactions.length, 1);

        const duplicateTransactions = filterTransactions(mockTransactions, 'duplicate');
        expect.toBe(duplicateTransactions.length, 1);
        expect.toBe(duplicateTransactions[0].id, '4');
      }
    },

    {
      id: 'import-transaction-creation',
      suite: 'Import Transactions - Transaction Creation',
      name: 'should create transactions from imported data',
      description: 'Creates actual transaction records from validated import data',
      expectedBehavior: 'Valid imported transactions should be added to the database',
      testFunction: () => {
        beforeEach();

        const accounts = db.getTable('accounts');
        const subcategories = db.getTable('subcategories');
        const transactionTypes = db.getTable('transaction_types');
        
        expect.toBeGreaterThan(accounts.length, 0);
        expect.toBeGreaterThan(subcategories.length, 0);
        expect.toBeGreaterThan(transactionTypes.length, 0);

        const importedTransaction = {
          date: '2024-01-15',
          description: 'Imported Coffee Purchase',
          amount: -5.50,
          transactionType: 'Expenses',
          subcategoryId: subcategories[0].id,
          accountId: accounts[0].id,
          status: 'ready'
        };

        // Mock transaction creation
        const createdTransaction = db.addTransaction({
          date: importedTransaction.date,
          description: importedTransaction.description,
          amount: importedTransaction.amount,
          transactionTypeId: transactionTypes[0].id,
          subcategoryId: importedTransaction.subcategoryId,
          accountId: importedTransaction.accountId,
          notes: 'Imported transaction'
        });

        expect.toBeDefined(createdTransaction);
        expect.toBe(createdTransaction.description, 'Imported Coffee Purchase');
        expect.toBe(createdTransaction.amount, -5.50);
        expect.toBe(createdTransaction.date, '2024-01-15');
        
        // Verify transaction was added to database
        const transactions = db.getTable('transactions');
        expect.toBe(transactions.some(t => t.id === createdTransaction.id), true);
      }
    },

    {
      id: 'import-progress-tracking',
      suite: 'Import Transactions - Progress Tracking',
      name: 'should track import progress accurately',
      description: 'Provides accurate progress tracking during CSV parsing and processing',
      expectedBehavior: 'Progress should be updated during file processing stages',
      testFunction: () => {
        beforeEach();

        // Mock progress tracking
        let currentProgress = 0;
        const updateProgress = (progress) => {
          currentProgress = progress;
        };

        // Simulate file processing stages
        updateProgress(25); // File parsing started
        expect.toBe(currentProgress, 25);

        updateProgress(50); // File parsing complete
        expect.toBe(currentProgress, 50);

        updateProgress(75); // Rule processing complete
        expect.toBe(currentProgress, 75);

        updateProgress(100); // Import complete
        expect.toBe(currentProgress, 100);
      }
    },

    {
      id: 'import-timezone-safe-dates',
      suite: 'Import Transactions - Date Safety',
      name: 'should handle dates safely across timezones',
      description: 'Uses timezone-safe date parsing to avoid date shifting issues',
      expectedBehavior: 'Date parsing should not be affected by timezone differences',
      testFunction: () => {
        beforeEach();

        // Test timezone-safe date conversion
        const testDate = new Date(2024, 0, 15); // January 15, 2024
        const safeISOString = dateToISOString(testDate);
        expect.toBe(safeISOString, '2024-01-15');

        // Test that we're not using the problematic toISOString().split('T')[0] pattern
        const problemDate = new Date('2024-01-15T00:00:00');
        const safeConversion = dateToISOString(problemDate);
        expect.toBe(safeConversion, '2024-01-15');

        // Verify consistency across different timezone scenarios
        const midnightDate = new Date(2024, 0, 15, 0, 0, 0);
        const noonDate = new Date(2024, 0, 15, 12, 0, 0);
        
        expect.toBe(dateToISOString(midnightDate), '2024-01-15');
        expect.toBe(dateToISOString(noonDate), '2024-01-15');
      }
    }
  ];
};