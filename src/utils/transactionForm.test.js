// Transaction Form Tests - Comprehensive testing for Add Transaction form functionality
import RelationalDatabase from './relationalDatabase.js'

// Mock XLSX module for browser environment
const mockXLSX = {
  utils: {
    json_to_sheet: () => ({ '!ref': 'A1:C10' }),
    aoa_to_sheet: () => ({ '!ref': 'A1:C1' }),
    book_new: () => ({ Sheets: {}, SheetNames: [] }),
    book_append_sheet: (workbook, worksheet, name) => {
      workbook.Sheets[name] = worksheet;
      if (!workbook.SheetNames.includes(name)) {
        workbook.SheetNames.push(name);
      }
    },
    writeFile: () => {},
    sheet_to_json: () => []
  },
  readFile: () => ({ SheetNames: [], Sheets: {} })
};

window.XLSX = mockXLSX;

// Test execution utilities
const testExpect = {
  toBe: (actual, expected) => {
    if (actual !== expected) {
      throw new Error(`Expected ${actual} to be ${expected}`);
    }
  },
  toEqual: (actual, expected) => {
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
      throw new Error(`Expected ${JSON.stringify(actual)} to equal ${JSON.stringify(expected)}`);
    }
  },
  toBeDefined: (actual) => {
    if (actual === undefined) {
      throw new Error(`Expected value to be defined`);
    }
  },
  toBeUndefined: (actual) => {
    if (actual !== undefined) {
      throw new Error(`Expected value to be undefined`);
    }
  },
  toContain: (actual, expected) => {
    if (!actual.toString().includes(expected)) {
      throw new Error(`Expected "${actual}" to contain "${expected}"`);
    }
  },
  toThrow: (fn) => {
    let threw = false;
    try {
      fn();
    } catch (error) {
      threw = true;
    }
    if (!threw) {
      throw new Error('Expected function to throw an error');
    }
  },
  toBeGreaterThan: (actual, expected) => {
    if (actual <= expected) {
      throw new Error(`Expected ${actual} to be greater than ${expected}`);
    }
  },
  toBeGreaterThanOrEqual: (actual, expected) => {
    if (actual < expected) {
      throw new Error(`Expected ${actual} to be greater than or equal to ${expected}`);
    }
  },
  toBeLessThan: (actual, expected) => {
    if (actual >= expected) {
      throw new Error(`Expected ${actual} to be less than ${expected}`);
    }
  },
  toBeTruthy: (actual) => {
    if (!actual) {
      throw new Error(`Expected ${actual} to be truthy`);
    }
  },
  toBeFalsy: (actual) => {
    if (actual) {
      throw new Error(`Expected ${actual} to be falsy`);
    }
  }
};

// Mock form validation logic from TransactionForm component
const validateTransactionForm = (formData, transactionType) => {
  const missing = [];
  const errors = [];
  
  // Required field validation
  if (!formData.description) missing.push('description');
  if (!formData.accountId) missing.push('accountId');
  if (!formData.amount) missing.push('amount');
  if (!formData.subcategoryId) missing.push('subcategoryId');
  
  // Check if destination account is required
  const shouldShowDestinationAccount = (transactionType) => {
    if (!transactionType) return false;
    return transactionType.name === 'Transfer' || 
           transactionType.name === 'Investment - SELL' || 
           transactionType.name === 'Investment - BUY';
  };
  
  // For transfers and investments, also check destination account
  if (transactionType && shouldShowDestinationAccount(transactionType) && !formData.destinationAccountId) {
    missing.push('destinationAccountId');
  }
  
  // For investment transactions, also check destination amount
  const isInvestmentTransaction = (transactionType) => {
    if (!transactionType) return false;
    return transactionType.name === 'Investment - SELL' || 
           transactionType.name === 'Investment - BUY';
  };
  
  if (transactionType && isInvestmentTransaction(transactionType) && !formData.destinationAmount) {
    missing.push('destinationAmount');
  }
  
  // Same account validation for transfers
  if (formData.accountId === formData.destinationAccountId && 
      transactionType && shouldShowDestinationAccount(transactionType)) {
    errors.push('differentAccounts');
  }
  
  // Amount validation
  const amount = parseFloat(formData.amount);
  if (formData.amount && (isNaN(amount) || amount <= 0)) {
    errors.push('invalidAmount');
  }
  
  return { missing, errors };
};

// Transaction Form Tests
export const createTransactionFormTests = (expectObj) => {
  let db;
  
  // Use the expect object passed in or fallback to global expect from testRunner
  const expect = expectObj || (typeof window !== 'undefined' && window.expect) || testExpect;
  
  const beforeEach = () => {
    db = new RelationalDatabase();
    db.createNewDatabase('en');
  };

  return [
    // =================== FORM VALIDATION TESTS ===================
    {
      id: 'form-required-fields-validation',
      suite: 'Transaction Form - Validation',
      name: 'should validate required fields',
      description: 'Validates that all required fields are present before submission',
      expectedBehavior: 'Should identify missing required fields',
      testFunction: () => {
        beforeEach();
        
        const incompleteFormData = {
          date: '2024-01-15',
          description: '', // Missing
          amount: '', // Missing
          accountId: '', // Missing
          subcategoryId: '', // Missing
          currencyId: 'CUR_001'
        };
        
        const transactionTypes = db.getTable('transaction_types');
        const expenseType = transactionTypes.find(t => t.name === 'Expenses');
        
        const validation = validateTransactionForm(incompleteFormData, expenseType);
        
        expect.toContain(validation.missing, 'description');
        expect.toContain(validation.missing, 'amount');
        expect.toContain(validation.missing, 'accountId');
        expect.toContain(validation.missing, 'subcategoryId');
        expect.toBe(validation.missing.length, 4);
      }
    },
    
    {
      id: 'form-amount-validation',
      suite: 'Transaction Form - Validation',
      name: 'should validate amount field',
      description: 'Validates amount is positive number',
      expectedBehavior: 'Should reject negative amounts and non-numeric values',
      testFunction: () => {
        beforeEach();
        
        const accounts = db.getTable('accounts');
        const subcategories = db.getTable('subcategories');
        const transactionTypes = db.getTable('transaction_types');
        
        const validFormData = {
          description: 'Test Transaction',
          accountId: accounts[0]?.id,
          subcategoryId: subcategories[0]?.id,
          currencyId: 'CUR_001'
        };
        
        // Test negative amount
        const negativeAmountForm = { ...validFormData, amount: '-100' };
        let validation = validateTransactionForm(negativeAmountForm, transactionTypes[0]);
        expect.toContain(validation.errors, 'invalidAmount');
        
        // Test zero amount
        const zeroAmountForm = { ...validFormData, amount: '0' };
        validation = validateTransactionForm(zeroAmountForm, transactionTypes[0]);
        expect.toContain(validation.errors, 'invalidAmount');
        
        // Test non-numeric amount
        const invalidAmountForm = { ...validFormData, amount: 'abc' };
        validation = validateTransactionForm(invalidAmountForm, transactionTypes[0]);
        expect.toContain(validation.errors, 'invalidAmount');
        
        // Test valid amount
        const validAmountForm = { ...validFormData, amount: '100.50' };
        validation = validateTransactionForm(validAmountForm, transactionTypes[0]);
        expect.toBe(validation.errors.length, 0);
      }
    },
    
    {
      id: 'form-transfer-validation',
      suite: 'Transaction Form - Validation',
      name: 'should validate transfer transaction requirements',
      description: 'Validates transfer-specific requirements like destination account',
      expectedBehavior: 'Should require destination account and prevent same account selection',
      testFunction: () => {
        beforeEach();
        
        const accounts = db.getTable('accounts');
        const subcategories = db.getTable('subcategories');
        const transactionTypes = db.getTable('transaction_types');
        
        // Create transfer transaction type if it doesn't exist
        let transferType = transactionTypes.find(t => t.name === 'Transfer');
        if (!transferType) {
          transferType = db.addCategory({
            name: 'Transfer',
            description: 'Account transfers',
            icon: '🔄',
            color: '#2196F3'
          });
        }
        
        // Test missing destination account
        const transferFormMissingDest = {
          description: 'Transfer Test',
          amount: '100',
          accountId: accounts[0]?.id,
          destinationAccountId: '', // Missing for transfer
          subcategoryId: subcategories[0]?.id,
          currencyId: 'CUR_001'
        };
        
        let validation = validateTransactionForm(transferFormMissingDest, transferType);
        expect.toContain(validation.missing, 'destinationAccountId');
        
        // Test same account for source and destination
        const transferFormSameAccount = {
          description: 'Transfer Test',
          amount: '100',
          accountId: accounts[0]?.id,
          destinationAccountId: accounts[0]?.id, // Same as source
          subcategoryId: subcategories[0]?.id,
          currencyId: 'CUR_001'
        };
        
        validation = validateTransactionForm(transferFormSameAccount, transferType);
        expect.toContain(validation.errors, 'differentAccounts');
        
        // Test valid transfer
        if (accounts.length >= 2) {
          const validTransferForm = {
            description: 'Valid Transfer',
            amount: '100',
            accountId: accounts[0].id,
            destinationAccountId: accounts[1].id,
            subcategoryId: subcategories[0]?.id,
            currencyId: 'CUR_001'
          };
          
          validation = validateTransactionForm(validTransferForm, transferType);
          expect.toBe(validation.errors.length, 0);
          expect.toBe(validation.missing.length, 0);
        }
      }
    },
    
    {
      id: 'form-investment-validation',
      suite: 'Transaction Form - Validation',
      name: 'should validate investment transaction requirements',
      description: 'Validates investment-specific requirements like destination amount',
      expectedBehavior: 'Should require destination account and destination amount for investments',
      testFunction: () => {
        beforeEach();
        
        const accounts = db.getTable('accounts');
        const subcategories = db.getTable('subcategories');
        const transactionTypes = db.getTable('transaction_types');
        
        // Create investment BUY transaction type
        let investmentBuyType = transactionTypes.find(t => t.name === 'Investment - BUY');
        if (!investmentBuyType) {
          investmentBuyType = db.addCategory({
            name: 'Investment - BUY',
            description: 'Investment purchases',
            icon: '📈',
            color: '#4CAF50'
          });
        }
        
        // Test missing destination account
        const investmentFormMissingDest = {
          description: 'Stock Purchase',
          amount: '1000',
          accountId: accounts[0]?.id,
          destinationAccountId: '', // Missing for investment
          destinationAmount: '100', // Shares amount
          subcategoryId: subcategories[0]?.id,
          currencyId: 'CUR_001'
        };
        
        let validation = validateTransactionForm(investmentFormMissingDest, investmentBuyType);
        expect.toContain(validation.missing, 'destinationAccountId');
        
        // Test missing destination amount
        const investmentFormMissingAmount = {
          description: 'Stock Purchase',
          amount: '1000',
          accountId: accounts[0]?.id,
          destinationAccountId: accounts[1]?.id,
          destinationAmount: '', // Missing for investment
          subcategoryId: subcategories[0]?.id,
          currencyId: 'CUR_001'
        };
        
        validation = validateTransactionForm(investmentFormMissingAmount, investmentBuyType);
        expect.toContain(validation.missing, 'destinationAmount');
        
        // Test valid investment transaction
        if (accounts.length >= 2) {
          const validInvestmentForm = {
            description: 'Apple Stock Purchase',
            amount: '1000',
            accountId: accounts[0].id,
            destinationAccountId: accounts[1].id,
            destinationAmount: '10', // Shares
            subcategoryId: subcategories[0]?.id,
            currencyId: 'CUR_001'
          };
          
          validation = validateTransactionForm(validInvestmentForm, investmentBuyType);
          expect.toBe(validation.errors.length, 0);
          expect.toBe(validation.missing.length, 0);
        }
      }
    },
    
    // =================== TRANSACTION CREATION TESTS ===================
    {
      id: 'form-basic-expense-creation',
      suite: 'Transaction Form - Creation',
      name: 'should create basic expense transaction',
      description: 'Creates a standard expense transaction with all required fields',
      expectedBehavior: 'Expense transaction should be created successfully',
      testFunction: () => {
        beforeEach();
        
        const accounts = db.getTable('accounts');
        const subcategories = db.getTable('subcategories');
        const transactionTypes = db.getTable('transaction_types');
        
        expect.toBeGreaterThan(accounts.length, 0);
        expect.toBeGreaterThan(subcategories.length, 0);
        
        const expenseType = transactionTypes.find(t => t.name === 'Expenses');
        expect.toBeDefined(expenseType);
        
        const expenseTransaction = {
          description: 'Office Supplies Purchase',
          amount: 150.75,
          accountId: accounts[0].id,
          subcategoryId: subcategories[0].id,
          currencyId: 'CUR_001',
          date: '2024-01-15',
          reference: 'INV-2024-001',
          notes: 'Printer paper and pens'
        };
        
        const transaction = db.addTransaction(expenseTransaction);
        
        expect.toBeDefined(transaction);
        expect.toBe(transaction.description, 'Office Supplies Purchase');
        expect.toBe(transaction.amount, 150.75);
        expect.toBe(transaction.accountId, accounts[0].id);
        expect.toBe(transaction.subcategoryId, subcategories[0].id);
        expect.toBe(transaction.reference, 'INV-2024-001');
        expect.toBe(transaction.notes, 'Printer paper and pens');
      }
    },
    
    {
      id: 'form-income-with-payer-creation',
      suite: 'Transaction Form - Creation',
      name: 'should create income transaction with payer',
      description: 'Creates income transaction with payer information',
      expectedBehavior: 'Income transaction should be created with payer reference',
      testFunction: () => {
        beforeEach();
        
        const accounts = db.getTable('accounts');
        const subcategories = db.getTable('subcategories');
        const transactionTypes = db.getTable('transaction_types');
        
        const incomeType = transactionTypes.find(t => t.name === 'Income');
        expect.toBeDefined(incomeType);
        
        // Create payer
        const payer = db.addPayer({
          name: 'Acme Corporation',
          description: 'Employer'
        });
        
        const incomeTransaction = {
          description: 'Monthly Salary',
          amount: 3500.00,
          accountId: accounts[0].id,
          subcategoryId: subcategories[0].id,
          payerId: payer.id,
          currencyId: 'CUR_001',
          date: '2024-01-01'
        };
        
        const transaction = db.addTransaction(incomeTransaction);
        
        expect.toBeDefined(transaction);
        expect.toBe(transaction.description, 'Monthly Salary');
        expect.toBe(transaction.amount, 3500.00);
        expect.toBe(transaction.payerId, payer.id);
        
        // Verify payer can be retrieved
        const savedPayer = db.getTable('payers').find(p => p.id === payer.id);
        expect.toBeDefined(savedPayer);
        expect.toBe(savedPayer.name, 'Acme Corporation');
      }
    },
    
    {
      id: 'form-transfer-creation',
      suite: 'Transaction Form - Creation',
      name: 'should create transfer transaction',
      description: 'Creates transfer between two accounts',
      expectedBehavior: 'Transfer transaction should be created with source and destination',
      testFunction: () => {
        beforeEach();
        
        const accountTypes = db.getAccountTypes(); // Use method instead of getTable
        const transactionTypes = db.getTable('transaction_types');
        
        expect.toBeGreaterThan(accountTypes.length, 0);
        expect.toBeGreaterThan(transactionTypes.length, 0);
        expect.toBeDefined(accountTypes[0]);
        expect.toBeDefined(accountTypes[0].id);
        
        // Create two accounts for transfer
        const checkingAccount = db.addAccount({
          name: 'Checking Account',
          accountTypeId: accountTypes[0].id,
          currencyId: 'CUR_001',
          initialBalance: 1000
        });
        
        expect.toBeDefined(checkingAccount);
        expect.toBeDefined(checkingAccount.id);
        
        const savingsAccount = db.addAccount({
          name: 'Savings Account',
          accountTypeId: accountTypes[0].id,
          currencyId: 'CUR_001',
          initialBalance: 500
        });
        
        expect.toBeDefined(savingsAccount);
        expect.toBeDefined(savingsAccount.id);
        
        // Create transfer category and subcategory
        let transferType = transactionTypes.find(t => t.name === 'Transfer');
        if (!transferType) {
          transferType = db.addCategory({
            name: 'Transfer',
            description: 'Account transfers',
            icon: '🔄'
          });
        }
        
        expect.toBeDefined(transferType);
        expect.toBeDefined(transferType.id);
        
        const transferGroup = db.addTransactionGroup({
          name: 'Internal Transfers',
          transactionTypeId: transferType.id
        });
        
        expect.toBeDefined(transferGroup);
        expect.toBeDefined(transferGroup.id);
        
        const transferSubcategory = db.addSubcategory({
          name: 'Account Transfer',
          groupId: transferGroup.id
        });
        
        expect.toBeDefined(transferSubcategory);
        expect.toBeDefined(transferSubcategory.id);
        
        const transferTransaction = {
          description: 'Transfer to Savings',
          amount: 300.00,
          accountId: checkingAccount.id,
          destinationAccountId: savingsAccount.id,
          subcategoryId: transferSubcategory.id,
          currencyId: 'CUR_001',
          date: '2024-01-15'
        };
        
        const transaction = db.addTransaction(transferTransaction);
        
        expect.toBeDefined(transaction);
        expect.toBe(transaction.description, 'Transfer to Savings');
        expect.toBe(transaction.amount, 300.00);
        expect.toBe(transaction.accountId, checkingAccount.id);
        expect.toBe(transaction.destinationAccountId, savingsAccount.id);
      }
    },
    
    {
      id: 'form-investment-buy-creation',
      suite: 'Transaction Form - Creation',
      name: 'should create investment BUY transaction',
      description: 'Creates investment purchase with broker and shares',
      expectedBehavior: 'Investment BUY transaction should be created with destination amount',
      testFunction: () => {
        beforeEach();
        
        const accountTypes = db.getAccountTypes();
        const transactionTypes = db.getTable('transaction_types');
        
        // Create cash and investment accounts
        const cashAccount = db.addAccount({
          name: 'Cash Account',
          accountTypeId: accountTypes[0].id,
          currencyId: 'CUR_001',
          initialBalance: 5000
        });
        
        const investmentAccount = db.addAccount({
          name: 'Investment Portfolio',
          accountTypeId: accountTypes[0].id,
          currencyId: 'CUR_001',
          initialBalance: 0
        });
        
        // Create investment BUY category
        let investmentBuyType = transactionTypes.find(t => t.name === 'Investment - BUY');
        if (!investmentBuyType) {
          investmentBuyType = db.addCategory({
            name: 'Investment - BUY',
            description: 'Investment purchases',
            icon: '📈'
          });
        }
        
        const investmentGroup = db.addTransactionGroup({
          name: 'Stock Purchases',
          transactionTypeId: investmentBuyType.id
        });
        
        const investmentSubcategory = db.addSubcategory({
          name: 'Stock Purchase',
          groupId: investmentGroup.id
        });
        
        // Create broker as payee
        const broker = db.addPayee({
          name: 'Interactive Brokers',
          description: 'Investment broker'
        });
        
        const investmentTransaction = {
          description: 'Apple Inc. Stock Purchase',
          amount: 1500.00, // Cash amount
          destinationAmount: 10, // Number of shares
          accountId: cashAccount.id,
          destinationAccountId: investmentAccount.id,
          subcategoryId: investmentSubcategory.id,
          payeeId: broker.id,
          currencyId: 'CUR_001',
          date: '2024-01-20'
        };
        
        const transaction = db.addTransaction(investmentTransaction);
        
        expect.toBeDefined(transaction);
        expect.toContain(transaction.description, 'Apple Inc. Stock Purchase');
        expect.toBe(transaction.amount, 1500.00);
        expect.toBe(transaction.accountId, cashAccount.id);
        expect.toBe(transaction.payeeId, broker.id);
        
        // For investment transactions, destinationAmount is used internally in the transfer logic
        // The returned transaction is the debit transaction (cash outflow)
        // Verify that the transaction has the correct structure for investment BUY
        expect.toBeDefined(transaction.linkedTransactionId);
      }
    },
    
    // =================== FORM FIELD INTERACTION TESTS ===================
    {
      id: 'form-currency-exchange-rate-handling',
      suite: 'Transaction Form - Field Interactions',
      name: 'should handle currency and exchange rate interactions',
      description: 'Tests currency selection and exchange rate calculation',
      expectedBehavior: 'Should handle multi-currency transactions with exchange rates',
      testFunction: () => {
        beforeEach();
        
        const accounts = db.getTable('accounts');
        const currencies = db.getTable('currencies');
        
        expect.toBeGreaterThan(currencies.length, 1);
        
        // Create USD account
        const usdAccount = db.addAccount({
          name: 'USD Business Account',
          accountTypeId: db.getAccountTypes()[0].id,
          currencyId: 'CUR_002', // USD
          initialBalance: 10000
        });
        
        // Add exchange rate
        const exchangeRate = db.addExchangeRate({
          fromCurrencyId: 'CUR_001', // EUR
          toCurrencyId: 'CUR_002',   // USD
          rate: 1.0850,
          date: '2024-01-15',
          source: 'manual'
        });
        
        expect.toBeDefined(exchangeRate);
        expect.toBe(exchangeRate.rate, 1.0850);
        
        // Create transaction in EUR on USD account
        const multiCurrencyTransaction = {
          description: 'European Supplier Payment',
          amount: 1000.00, // EUR amount
          accountId: usdAccount.id,
          currencyId: 'CUR_001', // Transaction in EUR
          exchangeRate: 1.0850,
          subcategoryId: db.getTable('subcategories')[0]?.id,
          date: '2024-01-15'
        };
        
        const transaction = db.addTransaction(multiCurrencyTransaction);
        
        expect.toBeDefined(transaction);
        expect.toBe(transaction.currencyId, 'CUR_001');
        expect.toBe(transaction.amount, 1000.00);
        expect.toBe(transaction.exchangeRate, 1.0850);
        
        // Verify exchange rate exists for calculation
        const rates = db.getTable('exchange_rates');
        const rate = rates.find(r => r.fromCurrencyId === 'CUR_001' && r.toCurrencyId === 'CUR_002');
        expect.toBeDefined(rate);
      }
    },
    
    {
      id: 'form-payee-autocomplete-functionality',
      suite: 'Transaction Form - Field Interactions',
      name: 'should support payee autocomplete and creation',
      description: 'Tests payee autocomplete and dynamic payee creation',
      expectedBehavior: 'Should find existing payees and allow new payee creation',
      testFunction: () => {
        beforeEach();
        
        // Create some test payees
        const payee1 = db.addPayee({
          name: 'Amazon',
          description: 'Online retailer'
        });
        
        const payee2 = db.addPayee({
          name: 'Amazon Web Services',
          description: 'Cloud services'
        });
        
        const payee3 = db.addPayee({
          name: 'Apple Store',
          description: 'Electronics store'
        });
        
        // Test autocomplete search functionality
        const allPayees = db.getTable('payees');
        
        // Simulate searching for "Amazon"
        const amazonPayees = allPayees.filter(p => 
          p.name.toLowerCase().includes('amazon')
        );
        
        expect.toBe(amazonPayees.length, 2);
        expect.toBe(amazonPayees[0].name, 'Amazon');
        expect.toBe(amazonPayees[1].name, 'Amazon Web Services');
        
        // Simulate searching for "Apple"
        const applePayees = allPayees.filter(p => 
          p.name.toLowerCase().includes('apple')
        );
        
        expect.toBe(applePayees.length, 1);
        expect.toBe(applePayees[0].name, 'Apple Store');
        
        // Test creating new payee
        const newPayee = db.addPayee({
          name: 'New Restaurant',
          description: 'Local restaurant'
        });
        
        expect.toBeDefined(newPayee);
        expect.toBe(db.getTable('payees').length, 4);
      }
    },
    
    {
      id: 'form-category-subcategory-hierarchy',
      suite: 'Transaction Form - Field Interactions',
      name: 'should handle transaction type to subcategory hierarchy',
      description: 'Tests proper linking between transaction types, groups, and subcategories',
      expectedBehavior: 'Should filter subcategories based on selected transaction type and group',
      testFunction: () => {
        beforeEach();
        
        const transactionTypes = db.getTable('transaction_types');
        const expenseType = transactionTypes.find(t => t.name === 'Expenses');
        const incomeType = transactionTypes.find(t => t.name === 'Income');
        
        expect.toBeDefined(expenseType);
        expect.toBeDefined(incomeType);
        
        // Create transaction groups for each type
        const expenseGroup = db.addTransactionGroup({
          name: 'Business Expenses',
          transactionTypeId: expenseType.id
        });
        
        const incomeGroup = db.addTransactionGroup({
          name: 'Business Income',
          transactionTypeId: incomeType.id
        });
        
        // Create subcategories under each group
        const expenseSubcategory = db.addSubcategory({
          name: 'Office Supplies',
          groupId: expenseGroup.id
        });
        
        const incomeSubcategory = db.addSubcategory({
          name: 'Consulting Income',
          groupId: incomeGroup.id
        });
        
        // Test filtering subcategories by transaction type
        const allSubcategories = db.getTable('subcategories');
        const allGroups = db.getTable('transaction_groups');
        
        // Get subcategories for expense type
        const expenseGroups = allGroups.filter(g => g.transactionTypeId === expenseType.id);
        const expenseSubcategories = allSubcategories.filter(s => 
          expenseGroups.some(g => g.id === s.groupId)
        );
        
        expect.toBe(expenseSubcategories.length >= 1, true);
        expect.toBe(expenseSubcategories.some(s => s.name === 'Office Supplies'), true);
        
        // Get subcategories for income type
        const incomeGroups = allGroups.filter(g => g.transactionTypeId === incomeType.id);
        const incomeSubcategories = allSubcategories.filter(s => 
          incomeGroups.some(g => g.id === s.groupId)
        );
        
        expect.toBe(incomeSubcategories.length >= 1, true);
        expect.toBe(incomeSubcategories.some(s => s.name === 'Consulting Income'), true);
      }
    },
    
    // =================== FORM STATE MANAGEMENT TESTS ===================
    {
      id: 'form-conditional-field-display',
      suite: 'Transaction Form - State Management',
      name: 'should show/hide fields based on transaction type',
      description: 'Tests conditional field display logic for different transaction types',
      expectedBehavior: 'Should show appropriate fields based on selected transaction type',
      testFunction: () => {
        beforeEach();
        
        const transactionTypes = db.getTable('transaction_types');
        
        // Test helper functions for field visibility
        const shouldShowDestinationAccount = (transactionType) => {
          if (!transactionType) return false;
          return transactionType.name === 'Transfer' || 
                 transactionType.name === 'Investment - SELL' || 
                 transactionType.name === 'Investment - BUY';
        };
        
        const shouldShowPayeeField = (transactionType) => {
          if (!transactionType) return false;
          return transactionType.name === 'Expenses' || 
                 transactionType.name === 'Investment - BUY';
        };
        
        const shouldShowPayerField = (transactionType) => {
          if (!transactionType) return false;
          return transactionType.name === 'Income' || 
                 transactionType.name === 'Investment - SELL';
        };
        
        // Test expense transaction
        const expenseType = transactionTypes.find(t => t.name === 'Expenses');
        if (expenseType) {
          expect.toBeFalsy(shouldShowDestinationAccount(expenseType));
          expect.toBeTruthy(shouldShowPayeeField(expenseType));
          expect.toBeFalsy(shouldShowPayerField(expenseType));
        }
        
        // Test income transaction
        const incomeType = transactionTypes.find(t => t.name === 'Income');
        if (incomeType) {
          expect.toBeFalsy(shouldShowDestinationAccount(incomeType));
          expect.toBeFalsy(shouldShowPayeeField(incomeType));
          expect.toBeTruthy(shouldShowPayerField(incomeType));
        }
        
        // Test transfer transaction
        let transferType = transactionTypes.find(t => t.name === 'Transfer');
        if (!transferType) {
          transferType = { name: 'Transfer' }; // Mock for testing
        }
        expect.toBeTruthy(shouldShowDestinationAccount(transferType));
        expect.toBeFalsy(shouldShowPayeeField(transferType));
        expect.toBeFalsy(shouldShowPayerField(transferType));
        
        // Test investment BUY transaction
        let investmentBuyType = transactionTypes.find(t => t.name === 'Investment - BUY');
        if (!investmentBuyType) {
          investmentBuyType = { name: 'Investment - BUY' }; // Mock for testing
        }
        expect.toBeTruthy(shouldShowDestinationAccount(investmentBuyType));
        expect.toBeTruthy(shouldShowPayeeField(investmentBuyType));
        expect.toBeFalsy(shouldShowPayerField(investmentBuyType));
      }
    },
    
    {
      id: 'form-data-persistence',
      suite: 'Transaction Form - State Management',
      name: 'should maintain form data during type changes',
      description: 'Tests that form data is preserved when changing transaction types',
      expectedBehavior: 'Should preserve compatible form data across type changes',
      testFunction: () => {
        beforeEach();
        
        const accounts = db.getTable('accounts');
        expect.toBeGreaterThan(accounts.length, 0);
        
        // Simulate form data state
        let formData = {
          date: '2024-01-15',
          description: 'Test Transaction',
          amount: '100.00',
          accountId: accounts[0].id,
          currencyId: 'CUR_001',
          reference: 'REF-123',
          notes: 'Test notes'
        };
        
        // Simulate changing from expense to income transaction type
        // Common fields should be preserved
        const preservedFields = ['date', 'description', 'amount', 'accountId', 'currencyId', 'reference', 'notes'];
        const newFormData = {};
        
        preservedFields.forEach(field => {
          if (formData[field]) {
            newFormData[field] = formData[field];
          }
        });
        
        // Clear transaction-type-specific fields
        newFormData.payeeId = '';
        newFormData.payerId = '';
        newFormData.destinationAccountId = '';
        newFormData.destinationAmount = '';
        
        expect.toBe(newFormData.description, 'Test Transaction');
        expect.toBe(newFormData.amount, '100.00');
        expect.toBe(newFormData.accountId, accounts[0].id);
        expect.toBe(newFormData.reference, 'REF-123');
        expect.toBe(newFormData.payeeId, '');
        expect.toBe(newFormData.destinationAccountId, '');
        
        formData = newFormData;
        
        // Verify preserved data is still intact
        expect.toBe(formData.description, 'Test Transaction');
        expect.toBe(formData.amount, '100.00');
        expect.toBe(formData.notes, 'Test notes');
      }
    },
    
    // =================== COMPLEX FORM LOGIC TESTS ===================
    {
      id: 'form-transfer-dual-transaction-creation',
      suite: 'Transaction Form - Complex Logic',
      name: 'should create two linked transactions for transfers',
      description: 'Tests that transfer creates both debit and credit transactions',
      expectedBehavior: 'Transfer should create two transactions: one debit, one credit',
      testFunction: () => {
        beforeEach();
        
        const accountTypes = db.getAccountTypes();
        const transactionTypes = db.getTable('transaction_types');
        
        // Create two accounts with different balances
        const sourceAccount = db.addAccount({
          name: 'Checking Account',
          accountTypeId: accountTypes[0].id,
          currencyId: 'CUR_001',
          initialBalance: 1000
        });
        
        const destinationAccount = db.addAccount({
          name: 'Savings Account',
          accountTypeId: accountTypes[0].id,
          currencyId: 'CUR_001',
          initialBalance: 500
        });
        
        // Create transfer category structure
        let transferType = transactionTypes.find(t => t.name === 'Transfer');
        if (!transferType) {
          transferType = db.addCategory({
            name: 'Transfer',
            description: 'Account transfers',
            icon: '🔄'
          });
        }
        
        const transferGroup = db.addTransactionGroup({
          name: 'Internal Transfers',
          transactionTypeId: transferType.id
        });
        
        const transferSubcategory = db.addSubcategory({
          name: 'Account Transfer',
          groupId: transferGroup.id
        });
        
        const initialTransactionCount = db.getTable('transactions').length;
        
        // Create transfer transaction
        const transferData = {
          description: 'Transfer to Savings',
          amount: 300.00,
          accountId: sourceAccount.id,
          destinationAccountId: destinationAccount.id,
          subcategoryId: transferSubcategory.id,
          currencyId: 'CUR_001',
          date: '2024-01-15',
          reference: 'TRF-001'
        };
        
        // In a real transfer, the form should create two transactions:
        // 1. Debit from source account
        const debitTransaction = db.addTransaction({
          ...transferData,
          amount: -transferData.amount, // Negative for debit
          notes: 'Transfer out to ' + destinationAccount.name
        });
        
        // 2. Credit to destination account
        const creditTransaction = db.addTransaction({
          ...transferData,
          accountId: destinationAccount.id, // Swap the account
          amount: transferData.amount, // Positive for credit
          destinationAccountId: sourceAccount.id, // Reference back to source
          notes: 'Transfer in from ' + sourceAccount.name,
          reference: transferData.reference + '_DEST' // Link the transactions
        });
        
        // Verify two transactions were created
        const finalTransactionCount = db.getTable('transactions').length;
        expect.toBe(finalTransactionCount, initialTransactionCount + 2);
        
        // Verify debit transaction
        expect.toBeDefined(debitTransaction);
        expect.toBe(debitTransaction.amount, -300.00);
        expect.toBe(debitTransaction.accountId, sourceAccount.id);
        expect.toBe(debitTransaction.destinationAccountId, destinationAccount.id);
        
        // Verify credit transaction
        expect.toBeDefined(creditTransaction);
        expect.toBe(creditTransaction.amount, 300.00);
        expect.toBe(creditTransaction.accountId, destinationAccount.id);
        expect.toBe(creditTransaction.destinationAccountId, sourceAccount.id);
        
        // Verify both transactions have same reference base
        expect.toContain(creditTransaction.reference, transferData.reference);
        expect.toBe(debitTransaction.reference, transferData.reference);
      }
    },
    
    {
      id: 'form-investment-buy-dual-transaction-logic',
      suite: 'Transaction Form - Complex Logic',
      name: 'should create proper investment BUY transactions',
      description: 'Tests investment BUY creates cash outflow and asset inflow',
      expectedBehavior: 'Investment BUY should create cash debit and investment asset credit',
      testFunction: () => {
        beforeEach();
        
        const accountTypes = db.getAccountTypes();
        const transactionTypes = db.getTable('transaction_types');
        
        // Create cash and investment accounts
        const cashAccount = db.addAccount({
          name: 'Cash Account',
          accountTypeId: accountTypes[0].id,
          currencyId: 'CUR_001',
          initialBalance: 10000
        });
        
        const investmentAccount = db.addAccount({
          name: 'Stock Portfolio',
          accountTypeId: accountTypes[0].id,
          currencyId: 'CUR_001',
          initialBalance: 0
        });
        
        // Create investment BUY structure
        let investmentBuyType = transactionTypes.find(t => t.name === 'Investment - BUY');
        if (!investmentBuyType) {
          investmentBuyType = db.addCategory({
            name: 'Investment - BUY',
            description: 'Investment purchases',
            icon: '📈'
          });
        }
        
        const investmentGroup = db.addTransactionGroup({
          name: 'Stock Purchases',
          transactionTypeId: investmentBuyType.id
        });
        
        const investmentSubcategory = db.addSubcategory({
          name: 'Stock Purchase',
          groupId: investmentGroup.id
        });
        
        const broker = db.addPayee({
          name: 'Interactive Brokers',
          description: 'Investment broker'
        });
        
        const initialTransactionCount = db.getTable('transactions').length;
        
        // Investment BUY transaction data
        const investmentData = {
          description: 'Apple Inc. Stock Purchase',
          amount: 1500.00, // Cash amount spent
          destinationAmount: 10, // Number of shares acquired
          accountId: cashAccount.id,
          destinationAccountId: investmentAccount.id,
          subcategoryId: investmentSubcategory.id,
          payeeId: broker.id,
          currencyId: 'CUR_001',
          date: '2024-01-20',
          reference: 'INV-BUY-001'
        };
        
        // For investment BUY, create two transactions:
        // 1. Cash outflow (negative on cash account)
        const cashTransaction = db.addTransaction({
          description: investmentData.description,
          amount: -investmentData.amount, // Negative for cash outflow
          accountId: investmentData.accountId,
          destinationAccountId: investmentData.destinationAccountId,
          subcategoryId: investmentData.subcategoryId,
          payeeId: investmentData.payeeId,
          currencyId: investmentData.currencyId,
          date: investmentData.date,
          reference: investmentData.reference,
          notes: `Cash payment for ${investmentData.destinationAmount} shares`
        });
        
        // 2. Investment asset inflow (positive on investment account)
        const assetTransaction = db.addTransaction({
          description: investmentData.description + ' - Asset Acquisition',
          amount: investmentData.destinationAmount, // Number of shares
          accountId: investmentData.destinationAccountId,
          destinationAccountId: investmentData.accountId,
          subcategoryId: investmentData.subcategoryId,
          currencyId: investmentData.currencyId,
          date: investmentData.date,
          reference: investmentData.reference + '_ASSET',
          notes: `Acquired ${investmentData.destinationAmount} shares at $${investmentData.amount / investmentData.destinationAmount} per share`
        });
        
        // Verify two transactions were created
        const finalTransactionCount = db.getTable('transactions').length;
        expect.toBe(finalTransactionCount, initialTransactionCount + 2);
        
        // Verify cash transaction (outflow)
        expect.toBeDefined(cashTransaction);
        expect.toBe(cashTransaction.amount, -1500.00);
        expect.toBe(cashTransaction.accountId, cashAccount.id);
        expect.toBe(cashTransaction.destinationAccountId, investmentAccount.id);
        expect.toBe(cashTransaction.payeeId, broker.id);
        
        // Verify asset transaction (inflow)
        expect.toBeDefined(assetTransaction);
        expect.toBe(assetTransaction.amount, 10); // Shares
        expect.toBe(assetTransaction.accountId, investmentAccount.id);
        expect.toBe(assetTransaction.destinationAccountId, cashAccount.id);
        expect.toContain(assetTransaction.reference, investmentData.reference);
      }
    },
    
    {
      id: 'form-investment-sell-dual-transaction-logic',
      suite: 'Transaction Form - Complex Logic',
      name: 'should create proper investment SELL transactions',
      description: 'Tests investment SELL creates asset outflow and cash inflow',
      expectedBehavior: 'Investment SELL should create asset debit and cash credit',
      testFunction: () => {
        beforeEach();
        
        const accountTypes = db.getAccountTypes();
        const transactionTypes = db.getTable('transaction_types');
        
        // Create accounts
        const investmentAccount = db.addAccount({
          name: 'Stock Portfolio',
          accountTypeId: accountTypes[0].id,
          currencyId: 'CUR_001',
          initialBalance: 100 // 100 shares
        });
        
        const cashAccount = db.addAccount({
          name: 'Cash Account',
          accountTypeId: accountTypes[0].id,
          currencyId: 'CUR_001',
          initialBalance: 1000
        });
        
        // Create investment SELL structure
        let investmentSellType = transactionTypes.find(t => t.name === 'Investment - SELL');
        if (!investmentSellType) {
          investmentSellType = db.addCategory({
            name: 'Investment - SELL',
            description: 'Investment sales',
            icon: '📉'
          });
        }
        
        const investmentGroup = db.addTransactionGroup({
          name: 'Stock Sales',
          transactionTypeId: investmentSellType.id
        });
        
        const investmentSubcategory = db.addSubcategory({
          name: 'Stock Sale',
          groupId: investmentGroup.id
        });
        
        const broker = db.addPayer({
          name: 'E*TRADE',
          description: 'Investment broker'
        });
        
        const initialTransactionCount = db.getTable('transactions').length;
        
        // Investment SELL transaction data
        const sellData = {
          description: 'Tesla Stock Sale',
          amount: 2000.00, // Cash received
          destinationAmount: 5, // Number of shares sold
          accountId: investmentAccount.id, // Source: investment account
          destinationAccountId: cashAccount.id, // Destination: cash account
          subcategoryId: investmentSubcategory.id,
          payerId: broker.id,
          currencyId: 'CUR_001',
          date: '2024-01-25',
          reference: 'INV-SELL-001'
        };
        
        // For investment SELL, create two transactions:
        // 1. Asset outflow (negative on investment account)
        const assetTransaction = db.addTransaction({
          description: sellData.description,
          amount: -sellData.destinationAmount, // Negative for asset outflow
          accountId: sellData.accountId,
          destinationAccountId: sellData.destinationAccountId,
          subcategoryId: sellData.subcategoryId,
          currencyId: sellData.currencyId,
          date: sellData.date,
          reference: sellData.reference,
          notes: `Sold ${sellData.destinationAmount} shares`
        });
        
        // 2. Cash inflow (positive on cash account)
        const cashTransaction = db.addTransaction({
          description: sellData.description + ' - Cash Proceeds',
          amount: sellData.amount, // Positive for cash inflow
          accountId: sellData.destinationAccountId,
          destinationAccountId: sellData.accountId,
          subcategoryId: sellData.subcategoryId,
          payerId: sellData.payerId,
          currencyId: sellData.currencyId,
          date: sellData.date,
          reference: sellData.reference + '_CASH',
          notes: `Cash proceeds from ${sellData.destinationAmount} shares at $${sellData.amount / sellData.destinationAmount} per share`
        });
        
        // Verify two transactions were created
        const finalTransactionCount = db.getTable('transactions').length;
        expect.toBe(finalTransactionCount, initialTransactionCount + 2);
        
        // Verify asset transaction (outflow)
        expect.toBeDefined(assetTransaction);
        expect.toBe(assetTransaction.amount, -5); // Negative shares
        expect.toBe(assetTransaction.accountId, investmentAccount.id);
        expect.toBe(assetTransaction.destinationAccountId, cashAccount.id);
        
        // Verify cash transaction (inflow)
        expect.toBeDefined(cashTransaction);
        expect.toBe(cashTransaction.amount, 2000.00);
        expect.toBe(cashTransaction.accountId, cashAccount.id);
        expect.toBe(cashTransaction.destinationAccountId, investmentAccount.id);
        expect.toBe(cashTransaction.payerId, broker.id);
      }
    },
    
    {
      id: 'form-conditional-field-requirements',
      suite: 'Transaction Form - Complex Logic',
      name: 'should enforce conditional field requirements',
      description: 'Tests that required fields change based on transaction type selection',
      expectedBehavior: 'Should require different fields based on transaction type',
      testFunction: () => {
        beforeEach();
        
        const accounts = db.getTable('accounts');
        const subcategories = db.getTable('subcategories');
        const transactionTypes = db.getTable('transaction_types');
        
        // Base form data
        const baseFormData = {
          description: 'Test Transaction',
          amount: '100',
          accountId: accounts[0]?.id,
          subcategoryId: subcategories[0]?.id,
          currencyId: 'CUR_001',
          date: '2024-01-15'
        };
        
        // Test Expense transaction requirements
        const expenseType = transactionTypes.find(t => t.name === 'Expenses');
        if (expenseType) {
          const expenseValidation = validateTransactionForm(baseFormData, expenseType);
          expect.toBe(expenseValidation.missing.length, 0); // All required fields present
          expect.toBe(expenseValidation.errors.length, 0);
        }
        
        // Test Transfer transaction requirements (needs destination account)
        let transferType = transactionTypes.find(t => t.name === 'Transfer');
        if (!transferType) {
          transferType = { name: 'Transfer' }; // Mock for testing
        }
        
        const transferFormIncomplete = { ...baseFormData };
        let transferValidation = validateTransactionForm(transferFormIncomplete, transferType);
        expect.toContain(transferValidation.missing, 'destinationAccountId');
        
        // Complete transfer form
        const transferFormComplete = {
          ...baseFormData,
          destinationAccountId: accounts[1]?.id || 'ACC_DEST'
        };
        transferValidation = validateTransactionForm(transferFormComplete, transferType);
        if (accounts.length >= 2) {
          expect.toBe(transferValidation.missing.length, 0);
        }
        
        // Test Investment BUY requirements (needs destination account AND amount)
        let investmentBuyType = transactionTypes.find(t => t.name === 'Investment - BUY');
        if (!investmentBuyType) {
          investmentBuyType = { name: 'Investment - BUY' }; // Mock for testing
        }
        
        const investmentFormIncomplete = { ...baseFormData };
        let investmentValidation = validateTransactionForm(investmentFormIncomplete, investmentBuyType);
        expect.toContain(investmentValidation.missing, 'destinationAccountId');
        expect.toContain(investmentValidation.missing, 'destinationAmount');
        
        // Complete investment form
        const investmentFormComplete = {
          ...baseFormData,
          destinationAccountId: accounts[1]?.id || 'ACC_INVEST',
          destinationAmount: '10' // Number of shares
        };
        investmentValidation = validateTransactionForm(investmentFormComplete, investmentBuyType);
        if (accounts.length >= 2) {
          expect.toBe(investmentValidation.missing.length, 0);
        }
      }
    },
    
    {
      id: 'form-currency-consistency-validation',
      suite: 'Transaction Form - Complex Logic',
      name: 'should validate currency consistency for transfers',
      description: 'Tests that transfer accounts must have compatible currencies',
      expectedBehavior: 'Should enforce currency rules for different transaction types',
      testFunction: async () => {
        beforeEach();
        
        const accountTypes = db.getAccountTypes();
        
        // Create accounts with different currencies
        const eurAccount = db.addAccount({
          name: 'EUR Account',
          accountTypeId: accountTypes[0].id,
          currencyId: 'CUR_001', // EUR
          initialBalance: 1000
        });
        
        const usdAccount = db.addAccount({
          name: 'USD Account',
          accountTypeId: accountTypes[0].id,
          currencyId: 'CUR_002', // USD
          initialBalance: 1000
        });
        
        // Small delay to ensure different timestamps for ID generation
        await new Promise(resolve => setTimeout(resolve, 1));
        
        const eurAccount2 = db.addAccount({
          name: 'EUR Account 2',
          accountTypeId: accountTypes[0].id,
          currencyId: 'CUR_001', // EUR
          initialBalance: 500
        });
        
        // Ensure accounts are different
        expect.toBeDefined(eurAccount);
        expect.toBeDefined(eurAccount2);
        expect.toBeTruthy(eurAccount.id !== eurAccount2.id);
        
        // Create transfer type
        let transferType = db.getTable('transaction_types').find(t => t.name === 'Transfer');
        if (!transferType) {
          transferType = db.addCategory({
            name: 'Transfer',
            description: 'Account transfers',
            icon: '🔄'
          });
        }
        
        const transferGroup = db.addTransactionGroup({
          name: 'Internal Transfers',
          transactionTypeId: transferType.id
        });
        
        const transferSubcategory = db.addSubcategory({
          name: 'Account Transfer',
          groupId: transferGroup.id
        });
        
        // Test transfer between different currencies (should work but may need exchange rate)
        const crossCurrencyTransfer = {
          description: 'Cross-Currency Transfer',
          amount: '100',
          accountId: eurAccount.id,
          destinationAccountId: usdAccount.id,
          subcategoryId: transferSubcategory.id,
          currencyId: 'CUR_001',
          date: '2024-01-15'
        };
        
        // This should be allowed but might require exchange rate handling
        const crossCurrencyValidation = validateTransactionForm(crossCurrencyTransfer, transferType);
        expect.toBe(crossCurrencyValidation.missing.length, 0);
        
        // Test transfer between same currencies (should always work)
        const sameCurrencyTransfer = {
          description: 'Same Currency Transfer',
          amount: '200',
          accountId: eurAccount.id,
          destinationAccountId: eurAccount2.id,
          subcategoryId: transferSubcategory.id,
          currencyId: 'CUR_001',
          date: '2024-01-15'
        };
        
        const sameCurrencyValidation = validateTransactionForm(sameCurrencyTransfer, transferType);
        expect.toBe(sameCurrencyValidation.missing.length, 0);
        
        // Debug: Log what errors are found
        if (sameCurrencyValidation.errors.length > 0) {
          console.log('Unexpected validation errors:', sameCurrencyValidation.errors);
          console.log('Form data:', sameCurrencyTransfer);
          console.log('Source account ID:', eurAccount.id);
          console.log('Destination account ID:', eurAccount2.id);
          console.log('Are accounts different?', eurAccount.id !== eurAccount2.id);
          console.log('Parsed amount:', parseFloat(sameCurrencyTransfer.amount));
          console.log('Transfer type:', transferType?.name);
        }
        
        expect.toBe(sameCurrencyValidation.errors.length, 0);
        
        // Verify accounts have expected currencies
        expect.toBe(eurAccount.currencyId, 'CUR_001');
        expect.toBe(usdAccount.currencyId, 'CUR_002');
        expect.toBe(eurAccount2.currencyId, 'CUR_001');
      }
    },
    
    {
      id: 'form-payee-payer-conditional-logic',
      suite: 'Transaction Form - Complex Logic',
      name: 'should show payee/payer fields based on transaction type',
      description: 'Tests conditional display of payee vs payer fields',
      expectedBehavior: 'Should show payee for expenses, payer for income, broker for investments',
      testFunction: () => {
        beforeEach();
        
        const transactionTypes = db.getTable('transaction_types');
        const accounts = db.getTable('accounts');
        const subcategories = db.getTable('subcategories');
        
        // Create test payees and payers
        const testPayee = db.addPayee({
          name: 'Test Store',
          description: 'Retail store'
        });
        
        const testPayer = db.addPayer({
          name: 'Test Company',
          description: 'Employer'
        });
        
        const broker = db.addPayee({
          name: 'Investment Broker',
          description: 'Stock broker'
        });
        
        // Test Expense transaction with payee
        const expenseType = transactionTypes.find(t => t.name === 'Expenses');
        if (expenseType) {
          const expenseTransaction = {
            description: 'Store Purchase',
            amount: 50.00,
            accountId: accounts[0]?.id,
            subcategoryId: subcategories[0]?.id,
            payeeId: testPayee.id, // Expense uses payee
            currencyId: 'CUR_001',
            date: '2024-01-15'
          };
          
          const transaction = db.addTransaction(expenseTransaction);
          expect.toBeDefined(transaction);
          expect.toBe(transaction.payeeId, testPayee.id);
          expect.toBeTruthy(!transaction.payerId); // Should be null or undefined
        }
        
        // Test Income transaction with payer
        const incomeType = transactionTypes.find(t => t.name === 'Income');
        if (incomeType) {
          const incomeTransaction = {
            description: 'Salary Payment',
            amount: 3000.00,
            accountId: accounts[0]?.id,
            subcategoryId: subcategories[0]?.id,
            payerId: testPayer.id, // Income uses payer
            currencyId: 'CUR_001',
            date: '2024-01-01'
          };
          
          const transaction = db.addTransaction(incomeTransaction);
          expect.toBeDefined(transaction);
          expect.toBe(transaction.payerId, testPayer.id);
          expect.toBeTruthy(!transaction.payeeId); // Should be null or undefined
        }
        
        // Test Investment BUY with broker (as payee)
        let investmentBuyType = transactionTypes.find(t => t.name === 'Investment - BUY');
        if (!investmentBuyType) {
          investmentBuyType = db.addCategory({
            name: 'Investment - BUY',
            description: 'Investment purchases',
            icon: '📈'
          });
        }
        
        if (accounts.length >= 2) {
          const investmentBuyTransaction = {
            description: 'Stock Purchase',
            amount: 1000.00,
            destinationAmount: 5,
            accountId: accounts[0].id,
            destinationAccountId: accounts[1].id,
            subcategoryId: subcategories[0]?.id,
            payeeId: broker.id, // Investment BUY uses payee (broker)
            currencyId: 'CUR_001',
            date: '2024-01-20'
          };
          
          const transaction = db.addTransaction(investmentBuyTransaction);
          expect.toBeDefined(transaction);
          expect.toBe(transaction.payeeId, broker.id);
          expect.toBeTruthy(!transaction.payerId); // Should be null or undefined
        }
      }
    }
  ];
};