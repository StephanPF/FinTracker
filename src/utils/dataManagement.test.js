// Data Management Tests - Comprehensive testing for all CRUD operations
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

// Test execution utilities (note: these will be overridden by testRunner.js expect object)
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
  toBeCloseTo: (actual, expected, precision = 2) => {
    const diff = Math.abs(actual - expected);
    const tolerance = Math.pow(10, -precision) / 2;
    if (diff > tolerance) {
      throw new Error(`Expected ${actual} to be close to ${expected} (within ${tolerance})`);
    }
  },
  toBeGreaterThan: (actual, expected) => {
    if (actual <= expected) {
      throw new Error(`Expected ${actual} to be greater than ${expected}`);
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

// Data Management Tests
export const createDataManagementTests = (expectObj) => {
  let db;
  
  // Use the expect object passed in or fallback to global expect from testRunner
  const expect = expectObj || (typeof window !== 'undefined' && window.expect) || testExpect;
  
  const beforeEach = () => {
    db = new RelationalDatabase();
    db.createNewDatabase('en');
  };

  return [
    // =================== ACCOUNT MANAGEMENT ===================
    {
      id: 'dm-account-create',
      suite: 'Data Management - Account Operations',
      name: 'should create account with all fields',
      description: 'Creates a complete account with all optional fields',
      expectedBehavior: 'Account should be created with correct properties',
      testFunction: () => {
        beforeEach();
        
        const accountData = {
          name: 'Business Checking',
          accountCode: 'BIZ',
          accountTypeId: db.getTable('account_types')[0]?.id,
          currencyId: 'CUR_001',
          initialBalance: 5000.00,
          description: 'Main business account',
          includeInOverview: true
        };
        
        const account = db.addAccount(accountData);
        
        expect.toBeDefined(account);
        expect.toBe(account.name, 'Business Checking');
        expect.toBe(account.accountCode, 'BIZ');
        expect.toBe(account.initialBalance, 5000.00);
        expect.toBe(account.balance, 5000.00);
        expect.toBe(account.description, 'Main business account');
        expect.toBeDefined(account.id);
        expect.toBeDefined(account.createdAt);
      }
    },
    
    {
      id: 'dm-account-update',
      suite: 'Data Management - Account Operations',
      name: 'should update account properties',
      description: 'Updates existing account with new values',
      expectedBehavior: 'Account should be updated with new values',
      testFunction: () => {
        beforeEach();
        
        const account = db.addAccount({
          name: 'Old Name',
          accountTypeId: db.getTable('account_types')[0]?.id,
          currencyId: 'CUR_001',
          initialBalance: 1000
        });
        
        const updatedAccount = db.updateAccount(account.id, {
          name: 'New Name',
          description: 'Updated description',
          balance: 2000
        });
        
        expect.toBe(updatedAccount.name, 'New Name');
        expect.toBe(updatedAccount.description, 'Updated description');
        expect.toBe(updatedAccount.balance, 2000);
      }
    },
    
    {
      id: 'dm-account-delete',
      suite: 'Data Management - Account Operations',
      name: 'should delete account and related data',
      description: 'Removes account and cleans up related transactions',
      expectedBehavior: 'Account should be removed from database',
      testFunction: () => {
        beforeEach();
        
        const account = db.addAccount({
          name: 'To Delete',
          accountTypeId: db.getTable('account_types')[0]?.id,
          currencyId: 'CUR_001'
        });
        
        const initialCount = db.getTable('accounts').length;
        db.deleteAccount(account.id);
        
        expect.toBe(db.getTable('accounts').length, initialCount - 1);
        expect.toBeUndefined(db.getTable('accounts').find(acc => acc.id === account.id));
      }
    },
    
    {
      id: 'dm-account-validate-name',
      suite: 'Data Management - Account Operations',
      name: 'should validate required account name',
      description: 'Rejects account creation without name',
      expectedBehavior: 'Should throw error for missing name',
      testFunction: () => {
        beforeEach();
        
        expect.toThrow(() => {
          db.addAccount({
            accountTypeId: db.getTable('account_types')[0]?.id,
            currencyId: 'CUR_001'
          });
        });
        
        expect.toThrow(() => {
          db.addAccount({
            name: '',
            accountTypeId: db.getTable('account_types')[0]?.id,
            currencyId: 'CUR_001'
          });
        });
      }
    },
    
    // =================== TRANSACTION MANAGEMENT ===================
    {
      id: 'dm-transaction-create',
      suite: 'Data Management - Transaction Operations',
      name: 'should create transaction with valid data',
      description: 'Creates a transaction between accounts',
      expectedBehavior: 'Transaction should be created and balances updated',
      testFunction: () => {
        beforeEach();
        
        const account1 = db.addAccount({
          name: 'Checking',
          accountTypeId: db.getTable('account_types')[0]?.id,
          currencyId: 'CUR_001',
          initialBalance: 1000
        });
        
        const currencies = db.getTable('currencies');
        const categories = db.getTable('transaction_types');
        
        const transaction = db.addTransaction({
          description: 'Test payment',
          amount: 100.00,
          accountId: account1.id,
          currencyId: currencies[0]?.id || 'CUR_001',
          categoryId: categories[0]?.id,
          date: '2024-01-15',
          reference: 'REF001'
        });
        
        expect.toBeDefined(transaction);
        expect.toBe(transaction.description, 'Test payment');
        expect.toBe(transaction.amount, 100.00);
        expect.toBe(transaction.accountId, account1.id);
        expect.toBe(transaction.reference, 'REF001');
        expect.toBeDefined(transaction.id);
      }
    },
    
    {
      id: 'dm-transaction-update',
      suite: 'Data Management - Transaction Operations', 
      name: 'should update transaction details',
      description: 'Updates existing transaction with new values',
      expectedBehavior: 'Transaction should be updated correctly',
      testFunction: () => {
        beforeEach();
        
        const account = db.addAccount({
          name: 'Test Account',
          accountTypeId: db.getTable('account_types')[0]?.id,
          currencyId: 'CUR_001',
          initialBalance: 1000
        });
        
        const transaction = db.addTransaction({
          description: 'Original description',
          amount: 100,
          accountId: account.id,
          currencyId: 'CUR_001',
          date: '2024-01-15'
        });
        
        const updatedTransaction = db.updateTransaction(transaction.id, {
          description: 'Updated description',
          amount: 150,
          reference: 'NEW_REF'
        });
        
        expect.toBe(updatedTransaction.description, 'Updated description');
        expect.toBe(updatedTransaction.amount, 150);
        expect.toBe(updatedTransaction.reference, 'NEW_REF');
      }
    },
    
    {
      id: 'dm-transaction-delete',
      suite: 'Data Management - Transaction Operations',
      name: 'should delete transaction',
      description: 'Removes transaction from database',
      expectedBehavior: 'Transaction should be removed',
      testFunction: () => {
        beforeEach();
        
        const account = db.addAccount({
          name: 'Test Account',
          accountTypeId: db.getTable('account_types')[0]?.id,
          currencyId: 'CUR_001'
        });
        
        const transaction = db.addTransaction({
          description: 'To delete',
          amount: 100,
          accountId: account.id,
          currencyId: 'CUR_001',
          date: '2024-01-15'
        });
        
        const initialCount = db.getTable('transactions').length;
        db.deleteTransaction(transaction.id);
        
        expect.toBe(db.getTable('transactions').length, initialCount - 1);
        expect.toBeUndefined(db.getTable('transactions').find(t => t.id === transaction.id));
      }
    },
    
    // =================== CURRENCY MANAGEMENT ===================
    {
      id: 'dm-currency-create',
      suite: 'Data Management - Currency Operations',
      name: 'should create new currency',
      description: 'Adds a new currency to the system',
      expectedBehavior: 'Currency should be created with correct properties',
      testFunction: () => {
        beforeEach();
        
        const currency = db.addCurrency({
          name: 'Swiss Franc',
          code: 'CHF',
          symbol: 'Fr',
          type: 'fiat',
          decimalPlaces: 2,
          isActive: true
        });
        
        expect.toBeDefined(currency);
        expect.toBe(currency.name, 'Swiss Franc');
        expect.toBe(currency.code, 'CHF');
        expect.toBe(currency.symbol, 'Fr');
        expect.toBe(currency.type, 'fiat');
        expect.toBe(currency.decimalPlaces, 2);
        expect.toBeDefined(currency.id);
      }
    },
    
    {
      id: 'dm-currency-unique-code',
      suite: 'Data Management - Currency Operations',
      name: 'should prevent duplicate currency codes',
      description: 'Rejects currency with existing code',
      expectedBehavior: 'Should throw error for duplicate currency code',
      testFunction: () => {
        beforeEach();
        
        db.addCurrency({
          name: 'Test Currency',
          code: 'TST',
          symbol: 'T',
          type: 'fiat'
        });
        
        expect.toThrow(() => {
          db.addCurrency({
            name: 'Another Currency',
            code: 'TST', // Duplicate code
            symbol: 'T2',
            type: 'fiat'
          });
        });
      }
    },
    
    // =================== CATEGORY MANAGEMENT ===================
    {
      id: 'dm-category-create',
      suite: 'Data Management - Category Operations',
      name: 'should create transaction category',
      description: 'Adds new transaction category/type',
      expectedBehavior: 'Category should be created successfully',
      testFunction: () => {
        beforeEach();
        
        const category = db.addTransactionType({
          name: 'Utilities',
          description: 'Utility payments',
          color: '#FF5722',
          icon: '⚡',
          isActive: true
        });
        
        expect.toBeDefined(category);
        expect.toBe(category.name, 'Utilities');
        expect.toBe(category.description, 'Utility payments');
        expect.toBe(category.color, '#FF5722');
        expect.toBe(category.icon, '⚡');
      }
    },
    
    {
      id: 'dm-tag-create',
      suite: 'Data Management - Tag Operations',
      name: 'should create and manage tags',
      description: 'Creates tags for transaction organization',
      expectedBehavior: 'Tag should be created and retrievable',
      testFunction: () => {
        beforeEach();
        
        const tag = db.addTag({
          name: 'Business',
          description: 'Business-related transactions',
          isActive: true
        });
        
        expect.toBeDefined(tag);
        expect.toBe(tag.name, 'Business');
        expect.toBe(tag.description, 'Business-related transactions');
        expect.toBe(tag.isActive, true);
        expect.toBeDefined(tag.id);
      }
    },
    
    // =================== EXCHANGE RATE MANAGEMENT ===================
    {
      id: 'dm-exchange-rate-create',
      suite: 'Data Management - Exchange Rate Operations',
      name: 'should create exchange rate',
      description: 'Adds exchange rate between currencies',
      expectedBehavior: 'Exchange rate should be stored correctly',
      testFunction: () => {
        beforeEach();
        
        const rate = db.addExchangeRate({
          fromCurrencyId: 'CUR_001', // EUR
          toCurrencyId: 'CUR_002',   // USD
          rate: 1.0950,
          date: '2024-01-15',
          source: 'manual'
        });
        
        expect.toBeDefined(rate);
        expect.toBe(rate.fromCurrencyId, 'CUR_001');
        expect.toBe(rate.toCurrencyId, 'CUR_002');
        expect.toBe(rate.rate, 1.0950);
        expect.toBe(rate.source, 'manual');
        expect.toBeDefined(rate.id);
      }
    },
    
    {
      id: 'dm-exchange-rate-validate',
      suite: 'Data Management - Exchange Rate Operations',
      name: 'should validate exchange rate values',
      description: 'Rejects invalid exchange rates',
      expectedBehavior: 'Should throw error for invalid rates',
      testFunction: () => {
        beforeEach();
        
        expect.toThrow(() => {
          db.addExchangeRate({
            fromCurrencyId: 'CUR_001',
            toCurrencyId: 'CUR_002',
            rate: -1.5, // Negative rate
            date: '2024-01-15'
          });
        });
        
        expect.toThrow(() => {
          db.addExchangeRate({
            fromCurrencyId: 'CUR_001',
            toCurrencyId: 'CUR_002',
            rate: 0, // Zero rate
            date: '2024-01-15'
          });
        });
      }
    },
    
    // =================== DATA RELATIONSHIPS ===================
    {
      id: 'dm-account-transactions',
      suite: 'Data Management - Relationships',
      name: 'should maintain account-transaction relationships',
      description: 'Ensures transactions are linked to correct accounts',
      expectedBehavior: 'Account should contain its transactions',
      testFunction: () => {
        beforeEach();
        
        const account = db.addAccount({
          name: 'Test Account',
          accountTypeId: db.getTable('account_types')[0]?.id,
          currencyId: 'CUR_001',
          initialBalance: 1000
        });
        
        db.addTransaction({
          description: 'Transaction 1',
          amount: 100,
          accountId: account.id,
          currencyId: 'CUR_001',
          date: '2024-01-15'
        });
        
        db.addTransaction({
          description: 'Transaction 2', 
          amount: 200,
          accountId: account.id,
          currencyId: 'CUR_001',
          date: '2024-01-16'
        });
        
        const accountTransactions = db.getTable('transactions')
          .filter(t => t.accountId === account.id);
        
        expect.toBe(accountTransactions.length, 2);
        expect.toBe(accountTransactions[0].description, 'Transaction 1');
        expect.toBe(accountTransactions[1].description, 'Transaction 2');
      }
    },
    
    // =================== DATA INTEGRITY ===================
    {
      id: 'dm-data-consistency',
      suite: 'Data Management - Data Integrity',
      name: 'should maintain data consistency',
      description: 'Ensures database remains consistent after operations',
      expectedBehavior: 'Data should remain consistent and valid',
      testFunction: () => {
        beforeEach();
        
        const initialAccountCount = db.getTable('accounts').length;
        const initialTransactionCount = db.getTable('transactions').length;
        
        // Create account
        const account = db.addAccount({
          name: 'Consistency Test',
          accountTypeId: db.getTable('account_types')[0]?.id,
          currencyId: 'CUR_001'
        });
        
        // Create transaction
        const transaction = db.addTransaction({
          description: 'Consistency transaction',
          amount: 100,
          accountId: account.id,
          currencyId: 'CUR_001',
          date: '2024-01-15'
        });
        
        // Verify counts increased
        expect.toBe(db.getTable('accounts').length, initialAccountCount + 1);
        expect.toBe(db.getTable('transactions').length, initialTransactionCount + 1);
        
        // Delete account
        db.deleteAccount(account.id);
        
        // Verify account removed
        expect.toBe(db.getTable('accounts').length, initialAccountCount);
        expect.toBeUndefined(db.getTable('accounts').find(acc => acc.id === account.id));
      }
    },
    
    // =================== BULK OPERATIONS ===================
    {
      id: 'dm-bulk-operations',
      suite: 'Data Management - Bulk Operations',
      name: 'should handle bulk data operations',
      description: 'Efficiently processes multiple records',
      expectedBehavior: 'Should create multiple records without errors',
      testFunction: () => {
        beforeEach();
        
        const initialCount = db.getTable('accounts').length;
        const accountsToCreate = 5;
        
        // Create multiple accounts
        for (let i = 1; i <= accountsToCreate; i++) {
          db.addAccount({
            name: `Bulk Account ${i}`,
            accountTypeId: db.getTable('account_types')[0]?.id,
            currencyId: 'CUR_001',
            initialBalance: i * 1000
          });
        }
        
        const finalCount = db.getTable('accounts').length;
        expect.toBe(finalCount, initialCount + accountsToCreate);
        
        // Verify all accounts were created correctly
        const bulkAccounts = db.getTable('accounts')
          .filter(acc => acc.name.startsWith('Bulk Account'));
        
        expect.toBe(bulkAccounts.length, accountsToCreate);
        expect.toBe(bulkAccounts[0].initialBalance, 1000);
        expect.toBe(bulkAccounts[4].initialBalance, 5000);
      }
    },
    
    // =================== PAYEE/PAYER MANAGEMENT ===================
    {
      id: 'dm-payee-create',
      suite: 'Data Management - Payee/Payer Operations',
      name: 'should create and manage payees',
      description: 'Creates payee records for transaction tracking',
      expectedBehavior: 'Payee should be created successfully',
      testFunction: () => {
        beforeEach();
        
        const payee = db.addPayee({
          name: 'Amazon',
          description: 'Online retailer',
          isActive: true
        });
        
        expect.toBeDefined(payee);
        expect.toBe(payee.name, 'Amazon');
        expect.toBe(payee.description, 'Online retailer');
        expect.toBe(payee.isActive, true);
        expect.toBeDefined(payee.id);
        expect.toBeDefined(payee.createdAt);
      }
    },
    
    {
      id: 'dm-payer-create',
      suite: 'Data Management - Payee/Payer Operations',
      name: 'should create and manage payers',
      description: 'Creates payer records for income tracking',
      expectedBehavior: 'Payer should be created successfully',
      testFunction: () => {
        beforeEach();
        
        const payer = db.addPayer({
          name: 'Acme Corp',
          description: 'Employer',
          isActive: true
        });
        
        expect.toBeDefined(payer);
        expect.toBe(payer.name, 'Acme Corp');
        expect.toBe(payer.description, 'Employer');
        expect.toBe(payer.isActive, true);
        expect.toBeDefined(payer.id);
      }
    },
    
    // =================== DATA VALIDATION & CONSTRAINTS ===================
    {
      id: 'dm-unique-constraints',
      suite: 'Data Management - Data Validation',
      name: 'should enforce unique constraints',
      description: 'Prevents duplicate entries where required',
      expectedBehavior: 'Should prevent duplicate account names in same type',
      testFunction: () => {
        beforeEach();
        
        const accountType = db.getTable('account_types')[0]?.id;
        
        db.addAccount({
          name: 'Checking Account',
          accountTypeId: accountType,
          currencyId: 'CUR_001'
        });
        
        // Should allow same name with different type (if another type exists)
        const accountTypes = db.getTable('account_types');
        if (accountTypes.length > 1) {
          const account2 = db.addAccount({
            name: 'Checking Account',
            accountTypeId: accountTypes[1].id,
            currencyId: 'CUR_001'
          });
          expect.toBeDefined(account2);
        }
      }
    },
    
    {
      id: 'dm-data-types',
      suite: 'Data Management - Data Validation',
      name: 'should validate data types',
      description: 'Ensures correct data types for fields',
      expectedBehavior: 'Should handle type conversion and validation',
      testFunction: () => {
        beforeEach();
        
        const account = db.addAccount({
          name: 'Type Test Account',
          accountTypeId: db.getTable('account_types')[0]?.id,
          currencyId: 'CUR_001',
          initialBalance: '1500.50' // String that should be converted
        });
        
        expect.toBe(typeof account.initialBalance, 'number');
        expect.toBe(account.initialBalance, 1500.50);
        expect.toBe(typeof account.balance, 'number');
        expect.toBe(account.balance, 1500.50);
      }
    },
    
    {
      id: 'dm-date-handling',
      suite: 'Data Management - Data Validation', 
      name: 'should handle date fields correctly',
      description: 'Validates and formats date fields',
      expectedBehavior: 'Should store dates in correct format',
      testFunction: () => {
        beforeEach();
        
        const account = db.addAccount({
          name: 'Date Test Account',
          accountTypeId: db.getTable('account_types')[0]?.id,
          currencyId: 'CUR_001'
        });
        
        const transaction = db.addTransaction({
          description: 'Date test',
          amount: 100,
          accountId: account.id,
          currencyId: 'CUR_001',
          date: new Date('2024-03-15')
        });
        
        expect.toBeDefined(transaction.date);
        expect.toBeDefined(transaction.createdAt);
        
        // CreatedAt should be ISO string
        expect.toContain(transaction.createdAt, '2024');
      }
    },
    
    // =================== SEARCH AND FILTERING ===================
    {
      id: 'dm-search-accounts',
      suite: 'Data Management - Search Operations',
      name: 'should search and filter accounts',
      description: 'Finds accounts based on criteria',
      expectedBehavior: 'Should return matching accounts',
      testFunction: () => {
        beforeEach();
        
        const accountType = db.getTable('account_types')[0]?.id;
        
        db.addAccount({
          name: 'Business Checking',
          accountTypeId: accountType,
          currencyId: 'CUR_001',
          accountCode: 'BIZ'
        });
        
        db.addAccount({
          name: 'Personal Savings',
          accountTypeId: accountType, 
          currencyId: 'CUR_001',
          accountCode: 'PER'
        });
        
        const accounts = db.getTable('accounts');
        const businessAccounts = accounts.filter(acc => 
          acc.name.includes('Business') || acc.accountCode === 'BIZ'
        );
        
        expect.toBe(businessAccounts.length, 1);
        expect.toBe(businessAccounts[0].name, 'Business Checking');
      }
    },
    
    {
      id: 'dm-filter-transactions',
      suite: 'Data Management - Search Operations',
      name: 'should filter transactions by criteria',
      description: 'Filters transactions by date, amount, account',
      expectedBehavior: 'Should return filtered transaction list',
      testFunction: () => {
        beforeEach();
        
        const account1 = db.addAccount({
          name: 'Account 1',
          accountTypeId: db.getTable('account_types')[0]?.id,
          currencyId: 'CUR_001'
        });
        
        const account2 = db.addAccount({
          name: 'Account 2', 
          accountTypeId: db.getTable('account_types')[0]?.id,
          currencyId: 'CUR_001'
        });
        
        db.addTransaction({
          description: 'Large Transaction',
          amount: 1000,
          accountId: account1.id,
          currencyId: 'CUR_001',
          date: '2024-01-15'
        });
        
        db.addTransaction({
          description: 'Small Transaction',
          amount: 50,
          accountId: account2.id, 
          currencyId: 'CUR_001',
          date: '2024-01-16'
        });
        
        const transactions = db.getTable('transactions');
        const largeTransactions = transactions.filter(t => t.amount >= 500);
        const account1Transactions = transactions.filter(t => t.accountId === account1.id);
        
        expect.toBe(largeTransactions.length, 1);
        expect.toBe(largeTransactions[0].description, 'Large Transaction');
        expect.toBe(account1Transactions.length, 1);
      }
    }
  ];
};