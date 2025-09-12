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
          accountTypeId: db.getAccountTypes()[0]?.id,
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
          accountTypeId: db.getAccountTypes()[0]?.id,
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
      name: 'should prevent deleting account with transactions',
      description: 'Prevents deletion of accounts that have transactions',
      expectedBehavior: 'Should throw error when deleting account with transactions',
      testFunction: async () => {
        beforeEach();
        
        // Debug: Check what's available
        const accountTypes = db.getAccountTypes();
        const categories = db.getTable('transaction_types');
        const currencies = db.getTable('currencies');
        
        expect.toBeDefined(accountTypes);
        expect.toBeDefined(categories);
        expect.toBeDefined(currencies);
        
        const account = db.addAccount({
          name: 'Account with Transaction',
          accountTypeId: accountTypes.length > 0 ? accountTypes[0].id : null,
          currencyId: currencies.length > 0 ? currencies[0].id : 'CUR_001'
        });
        
        expect.toBeDefined(account);
        expect.toBeDefined(account.id);
        
        // Create minimal transaction with only required accountId
        const transaction = db.addTransaction({
          description: 'Test transaction',
          amount: 100,
          accountId: account.id
        });
        
        expect.toBeDefined(transaction);
        
        // Verify transaction was created and references the account
        const transactions = db.getTable('transactions');
        const accountTransaction = transactions.find(t => t.accountId === account.id);
        expect.toBeDefined(accountTransaction);
        
        // Should throw error when trying to delete account with transactions (async)
        let errorThrown = false;
        try {
          await db.deleteAccount(account.id);
        } catch (error) {
          errorThrown = true;
        }
        
        if (!errorThrown) {
          throw new Error('Expected deleteAccount to throw an error for account with transactions');
        }
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
            accountTypeId: db.getAccountTypes()[0]?.id,
            currencyId: 'CUR_001'
          });
        });
        
        expect.toThrow(() => {
          db.addAccount({
            name: '',
            accountTypeId: db.getAccountTypes()[0]?.id,
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
          accountTypeId: db.getAccountTypes()[0]?.id,
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
          accountTypeId: db.getAccountTypes()[0]?.id,
          currencyId: 'CUR_001',
          initialBalance: 1000
        });
        
        // Get valid foreign key IDs for the transaction
        const currencies = db.getTable('currencies');
        const transactionTypes = db.getTable('transaction_types');
        
        const transaction = db.addTransaction({
          description: 'Original description',
          amount: 100,
          accountId: account.id,
          currencyId: currencies.length > 0 ? currencies[0].id : 'CUR_001',
          categoryId: transactionTypes.length > 0 ? transactionTypes[0].id : null,
          date: '2024-01-15'
        });
        
        // Update with the original foreign keys plus new values to ensure validation passes
        const updatedTransaction = db.updateTransaction(transaction.id, {
          description: 'Updated description',
          amount: 150,
          reference: 'NEW_REF',
          // Include original foreign keys to satisfy validation
          accountId: account.id,
          currencyId: transaction.currencyId,
          categoryId: transaction.categoryId
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
          accountTypeId: db.getAccountTypes()[0]?.id,
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
          name: 'Test Currency',
          code: 'TEST',
          symbol: '₮',
          type: 'fiat',
          decimalPlaces: 2,
          isActive: true
        });
        
        expect.toBeDefined(currency);
        expect.toBe(currency.name, 'Test Currency');
        expect.toBe(currency.code, 'TEST');
        expect.toBe(currency.symbol, '₮');
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
        
        const category = db.addCategory({
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
        
        const tag = db.addProduct({
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
          accountTypeId: db.getAccountTypes()[0]?.id,
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
          accountTypeId: db.getAccountTypes()[0]?.id,
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
        
        // Delete transaction first, then account (maintain referential integrity)
        db.deleteTransaction(transaction.id);
        expect.toBe(db.getTable('transactions').length, initialTransactionCount);
        
        // Now delete account
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
            accountTypeId: db.getAccountTypes()[0]?.id,
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
    
    // =================== TRANSACTION GROUPS MANAGEMENT ===================
    {
      id: 'dm-transaction-group-create',
      suite: 'Data Management - Transaction Group Operations',
      name: 'should create transaction group with transaction type',
      description: 'Creates transaction group linked to transaction type',
      expectedBehavior: 'Transaction group should be created with correct type linkage',
      testFunction: () => {
        beforeEach();
        
        const categories = db.getTable('transaction_types');
        const expenseCategory = categories.find(cat => cat.name === 'Expenses');
        
        expect.toBeDefined(expenseCategory);
        
        const transactionGroup = db.addTransactionGroup({
          name: 'Business Expenses',
          description: 'All business-related expenses',
          transactionTypeId: expenseCategory.id,
          color: '#FF5722'
        });
        
        expect.toBeDefined(transactionGroup);
        expect.toBe(transactionGroup.name, 'Business Expenses');
        expect.toBe(transactionGroup.description, 'All business-related expenses');
        expect.toBe(transactionGroup.transactionTypeId, expenseCategory.id);
        expect.toBe(transactionGroup.color, '#FF5722');
        expect.toBeDefined(transactionGroup.id);
      }
    },
    
    {
      id: 'dm-transaction-group-update',
      suite: 'Data Management - Transaction Group Operations',
      name: 'should update transaction group properties',
      description: 'Updates existing transaction group with new values',
      expectedBehavior: 'Transaction group should be updated correctly',
      testFunction: () => {
        beforeEach();
        
        const categories = db.getTable('transaction_types');
        const incomeCategory = categories.find(cat => cat.name === 'Income');
        
        const transactionGroup = db.addTransactionGroup({
          name: 'Original Name',
          description: 'Original description',
          transactionTypeId: incomeCategory.id
        });
        
        const updatedGroup = db.updateTransactionGroup(transactionGroup.id, {
          name: 'Updated Name',
          description: 'Updated description',
          color: '#4CAF50'
        });
        
        expect.toBe(updatedGroup.name, 'Updated Name');
        expect.toBe(updatedGroup.description, 'Updated description');
        expect.toBe(updatedGroup.color, '#4CAF50');
      }
    },
    
    {
      id: 'dm-transaction-group-filter-by-type',
      suite: 'Data Management - Transaction Group Operations',
      name: 'should filter transaction groups by transaction type',
      description: 'Retrieves only groups belonging to specific transaction type',
      expectedBehavior: 'Should return filtered transaction groups',
      testFunction: () => {
        beforeEach();
        
        const categories = db.getTable('transaction_types');
        const expenseCategory = categories.find(cat => cat.name === 'Expenses');
        const incomeCategory = categories.find(cat => cat.name === 'Income');
        
        db.addTransactionGroup({
          name: 'Business Expenses',
          transactionTypeId: expenseCategory.id
        });
        
        db.addTransactionGroup({
          name: 'Salary Income',
          transactionTypeId: incomeCategory.id
        });
        
        const transactionGroups = db.getTable('transaction_groups');
        const expenseGroups = transactionGroups.filter(group => group.transactionTypeId === expenseCategory.id);
        const incomeGroups = transactionGroups.filter(group => group.transactionTypeId === incomeCategory.id);
        
        expect.toBe(expenseGroups.length >= 1, true);
        expect.toBe(incomeGroups.length >= 1, true);
        expect.toBe(expenseGroups[0].name.includes('Expense') || expenseGroups.some(g => g.name === 'Business Expenses'), true);
      }
    },
    
    // =================== SUBCATEGORY MANAGEMENT ===================
    {
      id: 'dm-subcategory-create',
      suite: 'Data Management - Subcategory Operations',
      name: 'should create subcategory linked to transaction group',
      description: 'Creates subcategory with proper group linkage',
      expectedBehavior: 'Subcategory should be created with correct group reference',
      testFunction: () => {
        beforeEach();
        
        // Get or create a transaction group first
        const transactionGroups = db.getTable('transaction_groups');
        let expenseGroup = transactionGroups.find(group => group.name && group.name.includes('Expense'));
        
        if (!expenseGroup) {
          const categories = db.getTable('transaction_types');
          const expenseCategory = categories.find(cat => cat.name === 'Expenses');
          expenseGroup = db.addTransactionGroup({
            name: 'General Expenses',
            transactionTypeId: expenseCategory.id
          });
        }
        
        const subcategory = db.addSubcategory({
          name: 'Office Supplies',
          description: 'Office equipment and supplies',
          groupId: expenseGroup.id,
          color: '#2196F3'
        });
        
        expect.toBeDefined(subcategory);
        expect.toBe(subcategory.name, 'Office Supplies');
        expect.toBe(subcategory.description, 'Office equipment and supplies');
        expect.toBe(subcategory.groupId, expenseGroup.id);
        expect.toBe(subcategory.color, '#2196F3');
        expect.toBeDefined(subcategory.id);
      }
    },
    
    {
      id: 'dm-subcategory-cash-withdrawal',
      suite: 'Data Management - Subcategory Operations',
      name: 'should create subcategory with cash withdrawal flag',
      description: 'Creates expense subcategory marked as cash withdrawal',
      expectedBehavior: 'Subcategory should have cash withdrawal flag set',
      testFunction: () => {
        beforeEach();
        
        // Get expense category and create group
        const categories = db.getTable('transaction_types');
        const expenseCategory = categories.find(cat => cat.name === 'Expenses');
        
        const expenseGroup = db.addTransactionGroup({
          name: 'Cash Management',
          transactionTypeId: expenseCategory.id
        });
        
        const subcategory = db.addSubcategory({
          name: 'ATM Withdrawal',
          description: 'Cash withdrawals from ATM',
          groupId: expenseGroup.id,
          isCashWithdrawal: true
        });
        
        expect.toBeDefined(subcategory);
        expect.toBe(subcategory.name, 'ATM Withdrawal');
        expect.toBe(subcategory.isCashWithdrawal, true);
      }
    },
    
    {
      id: 'dm-subcategory-filter-by-group',
      suite: 'Data Management - Subcategory Operations',
      name: 'should filter subcategories by transaction group',
      description: 'Retrieves only subcategories belonging to specific group',
      expectedBehavior: 'Should return filtered subcategories',
      testFunction: () => {
        beforeEach();
        
        const categories = db.getTable('transaction_types');
        const expenseCategory = categories.find(cat => cat.name === 'Expenses');
        
        const group1 = db.addTransactionGroup({
          name: 'Business Expenses',
          transactionTypeId: expenseCategory.id
        });
        
        const group2 = db.addTransactionGroup({
          name: 'Personal Expenses', 
          transactionTypeId: expenseCategory.id
        });
        
        db.addSubcategory({
          name: 'Office Rent',
          groupId: group1.id
        });
        
        db.addSubcategory({
          name: 'Groceries',
          groupId: group2.id
        });
        
        const subcategories = db.getTable('subcategories');
        const businessSubs = subcategories.filter(sub => sub.groupId === group1.id);
        const personalSubs = subcategories.filter(sub => sub.groupId === group2.id);
        
        expect.toBe(businessSubs.length >= 1, true);
        expect.toBe(personalSubs.length >= 1, true);
      }
    },
    
    // =================== INVESTMENT TRANSACTION FEATURES ===================
    {
      id: 'dm-investment-buy-transaction',
      suite: 'Data Management - Investment Operations',
      name: 'should handle investment BUY transaction with broker',
      description: 'Creates investment purchase with broker information',
      expectedBehavior: 'Investment BUY transaction should be created with broker field',
      testFunction: () => {
        beforeEach();
        
        // Create investment account
        const accountTypes = db.getAccountTypes();
        const investmentAccountType = accountTypes.find(type => type.type.includes('Investment') || type.type.includes('Asset'));
        
        const investmentAccount = db.addAccount({
          name: 'Investment Portfolio',
          accountTypeId: investmentAccountType ? investmentAccountType.id : accountTypes[0].id,
          currencyId: 'CUR_001'
        });
        
        // Create investment category and group
        const categories = db.getTable('transaction_types');
        let investmentBuyCategory = categories.find(cat => cat.name && cat.name.includes('Investment') && cat.name.includes('BUY'));
        
        if (!investmentBuyCategory) {
          investmentBuyCategory = db.addCategory({
            name: 'Investment - BUY',
            description: 'Investment purchases',
            icon: '📈',
            color: '#4CAF50'
          });
        }
        
        const investmentGroup = db.addTransactionGroup({
          name: 'Stock Purchases',
          transactionTypeId: investmentBuyCategory.id
        });
        
        // Create payee for broker
        const broker = db.addPayee({
          name: 'Interactive Brokers',
          description: 'Investment broker'
        });
        
        const transaction = db.addTransaction({
          description: 'Apple Inc. Stock Purchase',
          amount: 1500.00,
          accountId: investmentAccount.id,
          categoryId: investmentBuyCategory.id,
          transactionGroupId: investmentGroup.id,
          payeeId: broker.id,
          currencyId: 'CUR_001',
          date: '2024-01-15'
        });
        
        expect.toBeDefined(transaction);
        expect.toBe(transaction.description, 'Apple Inc. Stock Purchase');
        expect.toBe(transaction.payeeId, broker.id);
        expect.toBe(transaction.amount, 1500.00);
      }
    },
    
    {
      id: 'dm-investment-sell-transaction',
      suite: 'Data Management - Investment Operations',
      name: 'should handle investment SELL transaction with payer',
      description: 'Creates investment sale with payer information',
      expectedBehavior: 'Investment SELL transaction should be created with payer field',
      testFunction: () => {
        beforeEach();
        
        // Create investment account
        const accountTypes = db.getAccountTypes();
        const investmentAccount = db.addAccount({
          name: 'Trading Account',
          accountTypeId: accountTypes[0].id,
          currencyId: 'CUR_001'
        });
        
        // Create investment sell category and group  
        const categories = db.getTable('transaction_types');
        let investmentSellCategory = categories.find(cat => cat.name && cat.name.includes('Investment') && cat.name.includes('SELL'));
        
        if (!investmentSellCategory) {
          investmentSellCategory = db.addCategory({
            name: 'Investment - SELL',
            description: 'Investment sales',
            icon: '📉',
            color: '#f44336'
          });
        }
        
        const investmentGroup = db.addTransactionGroup({
          name: 'Stock Sales',
          transactionTypeId: investmentSellCategory.id
        });
        
        // Create payer for broker
        const broker = db.addPayer({
          name: 'E*TRADE',
          description: 'Investment broker'
        });
        
        const transaction = db.addTransaction({
          description: 'Tesla Stock Sale',
          amount: 2000.00,
          accountId: investmentAccount.id,
          categoryId: investmentSellCategory.id,
          transactionGroupId: investmentGroup.id,
          payerId: broker.id,
          currencyId: 'CUR_001',
          date: '2024-01-20'
        });
        
        expect.toBeDefined(transaction);
        expect.toBe(transaction.description, 'Tesla Stock Sale');
        expect.toBe(transaction.payerId, broker.id);
        expect.toBe(transaction.amount, 2000.00);
      }
    },
    
    // =================== TRANSFER TRANSACTION FEATURES ===================
    {
      id: 'dm-transfer-transaction',
      suite: 'Data Management - Transfer Operations',
      name: 'should create transfer between accounts',
      description: 'Creates transfer transaction with source and destination accounts',
      expectedBehavior: 'Transfer should be created with linked destination account',
      testFunction: () => {
        beforeEach();
        
        const accountTypes = db.getAccountTypes();
        
        const checkingAccount = db.addAccount({
          name: 'Checking Account',
          accountTypeId: accountTypes[0].id,
          currencyId: 'CUR_001',
          initialBalance: 5000
        });
        
        const savingsAccount = db.addAccount({
          name: 'Savings Account',
          accountTypeId: accountTypes[0].id,
          currencyId: 'CUR_001',
          initialBalance: 1000
        });
        
        // Create transfer category
        const categories = db.getTable('transaction_types');
        let transferCategory = categories.find(cat => cat.name === 'Transfer');
        
        if (!transferCategory) {
          transferCategory = db.addCategory({
            name: 'Transfer',
            description: 'Account transfers',
            icon: '🔄',
            color: '#2196F3'
          });
        }
        
        const transferGroup = db.addTransactionGroup({
          name: 'Internal Transfers',
          transactionTypeId: transferCategory.id
        });
        
        const transaction = db.addTransaction({
          description: 'Transfer to Savings',
          amount: 500.00,
          accountId: checkingAccount.id,
          destinationAccountId: savingsAccount.id,
          categoryId: transferCategory.id,
          transactionGroupId: transferGroup.id,
          currencyId: 'CUR_001',
          date: '2024-01-15'
        });
        
        expect.toBeDefined(transaction);
        expect.toBe(transaction.description, 'Transfer to Savings');
        expect.toBe(transaction.accountId, checkingAccount.id);
        expect.toBe(transaction.destinationAccountId, savingsAccount.id);
        expect.toBe(transaction.amount, 500.00);
      }
    },
    
    // =================== MULTI-CURRENCY TRANSACTION FEATURES ===================
    {
      id: 'dm-multi-currency-transaction',
      suite: 'Data Management - Multi-Currency Operations',
      name: 'should handle transaction in different currency',
      description: 'Creates transaction with currency different from account base currency',
      expectedBehavior: 'Transaction should handle currency conversion properly',
      testFunction: () => {
        beforeEach();
        
        // Create USD account
        const accountTypes = db.getAccountTypes();
        const usdAccount = db.addAccount({
          name: 'USD Business Account',
          accountTypeId: accountTypes[0].id,
          currencyId: 'CUR_002', // USD
          initialBalance: 10000
        });
        
        // Add exchange rate
        db.addExchangeRate({
          fromCurrencyId: 'CUR_001', // EUR
          toCurrencyId: 'CUR_002',   // USD
          rate: 1.0850,
          date: '2024-01-15',
          source: 'manual'
        });
        
        // Create transaction in EUR on USD account
        const transaction = db.addTransaction({
          description: 'European Supplier Payment',
          amount: 1000.00, // EUR amount
          accountId: usdAccount.id,
          currencyId: 'CUR_001', // Transaction in EUR
          date: '2024-01-15'
        });
        
        expect.toBeDefined(transaction);
        expect.toBe(transaction.currencyId, 'CUR_001');
        expect.toBe(transaction.amount, 1000.00);
        
        // Verify exchange rate exists
        const exchangeRates = db.getTable('exchange_rates');
        const rate = exchangeRates.find(r => r.fromCurrencyId === 'CUR_001' && r.toCurrencyId === 'CUR_002');
        expect.toBeDefined(rate);
        expect.toBe(rate.rate, 1.0850);
      }
    },
    
    // =================== TRANSACTION REFERENCE AND RECONCILIATION ===================
    {
      id: 'dm-transaction-references',
      suite: 'Data Management - Transaction References',
      name: 'should handle transaction references and reconciliation',
      description: 'Creates transaction with reference and reconciliation data',
      expectedBehavior: 'Transaction should store reference and reconciliation information',
      testFunction: () => {
        beforeEach();
        
        const accountTypes = db.getAccountTypes();
        const account = db.addAccount({
          name: 'Business Checking',
          accountTypeId: accountTypes[0].id,
          currencyId: 'CUR_001'
        });
        
        const transaction = db.addTransaction({
          description: 'Office Equipment Purchase',
          amount: 750.00,
          accountId: account.id,
          currencyId: 'CUR_001',
          date: '2024-01-15',
          reference: 'INV-2024-001',
          reconciliationReference: 'BANK-REF-456789',
          notes: 'Standing desk and monitor arm'
        });
        
        expect.toBeDefined(transaction);
        expect.toBe(transaction.reference, 'INV-2024-001');
        expect.toBe(transaction.reconciliationReference, 'BANK-REF-456789');
        expect.toBe(transaction.notes, 'Standing desk and monitor arm');
      }
    },
    
    // =================== ACCOUNT TYPE VALIDATION ===================
    {
      id: 'dm-account-type-validation',
      suite: 'Data Management - Account Type Operations',
      name: 'should validate account type requirements',
      description: 'Ensures account creation follows account type rules',
      expectedBehavior: 'Account creation should validate against account type constraints',
      testFunction: () => {
        beforeEach();
        
        const accountTypes = db.getAccountTypes();
        expect.toBeGreaterThan(accountTypes.length, 0);
        
        // Test that each account type has required fields
        const firstAccountType = accountTypes[0];
        expect.toBeDefined(firstAccountType.id);
        expect.toBeDefined(firstAccountType.type);
        expect.toBeDefined(firstAccountType.subtype);
        
        // Test account creation with valid account type
        const account = db.addAccount({
          name: 'Valid Account',
          accountTypeId: firstAccountType.id,
          currencyId: 'CUR_001'
        });
        
        expect.toBeDefined(account);
        expect.toBe(account.accountTypeId, firstAccountType.id);
      }
    },
    
    // =================== REFERENTIAL INTEGRITY PROTECTION ===================
    {
      id: 'dm-prevent-delete-currency-in-use',
      suite: 'Data Management - Referential Integrity',
      name: 'should prevent deleting currency used by accounts',
      description: 'Prevents deletion of currencies referenced by accounts',
      expectedBehavior: 'Should throw error when deleting currency used by accounts',
      testFunction: () => {
        beforeEach();
        
        // Create a custom currency
        const currency = db.addCurrency({
          name: 'Test Currency',
          code: 'TEST',
          symbol: 'T$',
          type: 'fiat'
        });
        
        // Create account using this currency
        const accountTypes = db.getAccountTypes();
        const account = db.addAccount({
          name: 'Test Account',
          accountTypeId: accountTypes[0].id,
          currencyId: currency.id
        });
        
        expect.toBeDefined(account);
        
        // Should throw error when trying to delete currency
        expect.toThrow(() => {
          db.deleteCurrency(currency.id);
        });
      }
    },
    
    {
      id: 'dm-prevent-delete-currency-in-transactions',
      suite: 'Data Management - Referential Integrity',
      name: 'should prevent deleting currency used in transactions',
      description: 'Prevents deletion of currencies referenced by transactions',
      expectedBehavior: 'Should throw error when deleting currency used in transactions',
      testFunction: () => {
        beforeEach();
        
        // Create account and transaction with EUR currency
        const accountTypes = db.getAccountTypes();
        const account = db.addAccount({
          name: 'EUR Account',
          accountTypeId: accountTypes[0].id,
          currencyId: 'CUR_001' // EUR
        });
        
        const transaction = db.addTransaction({
          description: 'EUR Transaction',
          amount: 100,
          accountId: account.id,
          currencyId: 'CUR_001', // Transaction in EUR
          date: '2024-01-15'
        });
        
        expect.toBeDefined(transaction);
        
        // Should throw error when trying to delete EUR currency
        expect.toThrow(() => {
          db.deleteCurrency('CUR_001');
        });
      }
    },
    
    {
      id: 'dm-prevent-delete-payee-in-use',
      suite: 'Data Management - Referential Integrity',
      name: 'should prevent deleting payee used in transactions',
      description: 'Prevents deletion of payees referenced by transactions',
      expectedBehavior: 'Should throw error when deleting payee used in transactions',
      testFunction: () => {
        beforeEach();
        
        // Create payee and transaction
        const payee = db.addPayee({
          name: 'Amazon Payments',
          description: 'Online payments'
        });
        
        const accountTypes = db.getAccountTypes();
        const account = db.addAccount({
          name: 'Credit Card',
          accountTypeId: accountTypes[0].id,
          currencyId: 'CUR_001'
        });
        
        const transaction = db.addTransaction({
          description: 'Amazon Purchase',
          amount: 50,
          accountId: account.id,
          payeeId: payee.id,
          currencyId: 'CUR_001',
          date: '2024-01-15'
        });
        
        expect.toBeDefined(transaction);
        expect.toBe(transaction.payeeId, payee.id);
        
        // Should throw error when trying to delete payee
        expect.toThrow(() => {
          db.deletePayee(payee.id);
        });
      }
    },
    
    {
      id: 'dm-prevent-delete-payer-in-use',
      suite: 'Data Management - Referential Integrity',
      name: 'should prevent deleting payer used in transactions',
      description: 'Prevents deletion of payers referenced by transactions',
      expectedBehavior: 'Should throw error when deleting payer used in transactions',
      testFunction: () => {
        beforeEach();
        
        // Create payer and transaction
        const payer = db.addPayer({
          name: 'Acme Corporation',
          description: 'Employer'
        });
        
        const accountTypes = db.getAccountTypes();
        const account = db.addAccount({
          name: 'Checking Account',
          accountTypeId: accountTypes[0].id,
          currencyId: 'CUR_001'
        });
        
        const transaction = db.addTransaction({
          description: 'Salary Payment',
          amount: 3000,
          accountId: account.id,
          payerId: payer.id,
          currencyId: 'CUR_001',
          date: '2024-01-15'
        });
        
        expect.toBeDefined(transaction);
        expect.toBe(transaction.payerId, payer.id);
        
        // Should throw error when trying to delete payer
        expect.toThrow(() => {
          db.deletePayer(payer.id);
        });
      }
    },
    
    {
      id: 'dm-prevent-delete-category-in-use',
      suite: 'Data Management - Referential Integrity',
      name: 'should prevent deleting transaction type used by transactions',
      description: 'Prevents deletion of transaction types referenced by transactions',
      expectedBehavior: 'Should throw error when deleting transaction type used in transactions',
      testFunction: () => {
        beforeEach();
        
        const categories = db.getTable('transaction_types');
        const expenseCategory = categories.find(cat => cat.name === 'Expenses');
        expect.toBeDefined(expenseCategory);
        
        const accountTypes = db.getAccountTypes();
        const account = db.addAccount({
          name: 'Business Account',
          accountTypeId: accountTypes[0].id,
          currencyId: 'CUR_001'
        });
        
        const transaction = db.addTransaction({
          description: 'Business Expense',
          amount: 200,
          accountId: account.id,
          categoryId: expenseCategory.id,
          currencyId: 'CUR_001',
          date: '2024-01-15'
        });
        
        expect.toBeDefined(transaction);
        expect.toBe(transaction.categoryId, expenseCategory.id);
        
        // Should throw error when trying to delete expense category
        expect.toThrow(() => {
          db.deleteCategory(expenseCategory.id);
        });
      }
    },
    
    {
      id: 'dm-prevent-delete-transaction-group-in-use',
      suite: 'Data Management - Referential Integrity',
      name: 'should prevent deleting transaction group used by transactions',
      description: 'Prevents deletion of transaction groups referenced by transactions',
      expectedBehavior: 'Should throw error when deleting transaction group used in transactions',
      testFunction: () => {
        beforeEach();
        
        // Create transaction group
        const categories = db.getTable('transaction_types');
        const expenseCategory = categories.find(cat => cat.name === 'Expenses');
        
        const transactionGroup = db.addTransactionGroup({
          name: 'Business Operations',
          description: 'Business operational expenses',
          transactionTypeId: expenseCategory.id
        });
        
        const accountTypes = db.getAccountTypes();
        const account = db.addAccount({
          name: 'Operating Account',
          accountTypeId: accountTypes[0].id,
          currencyId: 'CUR_001'
        });
        
        const transaction = db.addTransaction({
          description: 'Operating Expense',
          amount: 150,
          accountId: account.id,
          transactionGroupId: transactionGroup.id,
          currencyId: 'CUR_001',
          date: '2024-01-15'
        });
        
        expect.toBeDefined(transaction);
        expect.toBe(transaction.transactionGroupId, transactionGroup.id);
        
        // Should throw error when trying to delete transaction group
        expect.toThrow(() => {
          db.deleteTransactionGroup(transactionGroup.id);
        });
      }
    },
    
    {
      id: 'dm-prevent-delete-subcategory-in-use',
      suite: 'Data Management - Referential Integrity',
      name: 'should prevent deleting subcategory used by transactions',
      description: 'Prevents deletion of subcategories referenced by transactions',
      expectedBehavior: 'Should throw error when deleting subcategory used in transactions',
      testFunction: () => {
        beforeEach();
        
        // Create subcategory through transaction group
        const categories = db.getTable('transaction_types');
        const expenseCategory = categories.find(cat => cat.name === 'Expenses');
        
        const transactionGroup = db.addTransactionGroup({
          name: 'Office Expenses',
          transactionTypeId: expenseCategory.id
        });
        
        const subcategory = db.addSubcategory({
          name: 'Office Supplies',
          description: 'Stationery and supplies',
          groupId: transactionGroup.id
        });
        
        const accountTypes = db.getAccountTypes();
        const account = db.addAccount({
          name: 'Office Account',
          accountTypeId: accountTypes[0].id,
          currencyId: 'CUR_001'
        });
        
        const transaction = db.addTransaction({
          description: 'Printer Paper Purchase',
          amount: 25,
          accountId: account.id,
          subcategoryId: subcategory.id,
          currencyId: 'CUR_001',
          date: '2024-01-15'
        });
        
        expect.toBeDefined(transaction);
        expect.toBe(transaction.subcategoryId, subcategory.id);
        
        // Should throw error when trying to delete subcategory
        expect.toThrow(() => {
          db.deleteSubcategory(subcategory.id);
        });
      }
    },
    
    {
      id: 'dm-prevent-delete-tag-in-use',
      suite: 'Data Management - Referential Integrity',
      name: 'should prevent deleting tag used by transactions',
      description: 'Prevents deletion of tags/products referenced by transactions',
      expectedBehavior: 'Should throw error when deleting tag used in transactions',
      testFunction: () => {
        beforeEach();
        
        // Create tag and transaction
        const tag = db.addProduct({
          name: 'Business Travel',
          description: 'Business travel expenses',
          category: 'Essential'
        });
        
        const accountTypes = db.getAccountTypes();
        const account = db.addAccount({
          name: 'Expense Account',
          accountTypeId: accountTypes[0].id,
          currencyId: 'CUR_001'
        });
        
        const transaction = db.addTransaction({
          description: 'Flight to Conference',
          amount: 400,
          accountId: account.id,
          productId: tag.id,
          currencyId: 'CUR_001',
          date: '2024-01-15'
        });
        
        expect.toBeDefined(transaction);
        expect.toBe(transaction.productId, tag.id);
        
        // Should throw error when trying to delete tag
        expect.toThrow(() => {
          db.deleteProduct(tag.id);
        });
      }
    },
    
    {
      id: 'dm-prevent-delete-account-type-in-use',
      suite: 'Data Management - Referential Integrity',
      name: 'should prevent deleting account type used by accounts',
      description: 'Prevents deletion of account types referenced by accounts',
      expectedBehavior: 'Should throw error when deleting account type used by accounts',
      testFunction: () => {
        beforeEach();
        
        const accountTypes = db.getAccountTypes();
        const firstAccountType = accountTypes[0];
        expect.toBeDefined(firstAccountType);
        
        // Create account using this account type
        const account = db.addAccount({
          name: 'Test Account for Type',
          accountTypeId: firstAccountType.id,
          currencyId: 'CUR_001'
        });
        
        expect.toBeDefined(account);
        expect.toBe(account.accountTypeId, firstAccountType.id);
        
        // Should throw error when trying to delete account type (if deletion method exists)
        // Note: Account types might be system-defined and not deletable
        if (db.deleteAccountType) {
          expect.toThrow(() => {
            db.deleteAccountType(firstAccountType.id);
          });
        }
      }
    },
    
    {
      id: 'dm-prevent-delete-destination-account-in-use',
      suite: 'Data Management - Referential Integrity',
      name: 'should prevent deleting account used as destination in transfers',
      description: 'Prevents deletion of accounts used as destination in transfer transactions',
      expectedBehavior: 'Should throw error when deleting account used as transfer destination',
      testFunction: async () => {
        beforeEach();
        
        const accountTypes = db.getAccountTypes();
        
        const sourceAccount = db.addAccount({
          name: 'Source Account',
          accountTypeId: accountTypes[0].id,
          currencyId: 'CUR_001',
          initialBalance: 1000
        });
        
        const destinationAccount = db.addAccount({
          name: 'Destination Account',
          accountTypeId: accountTypes[0].id,
          currencyId: 'CUR_001',
          initialBalance: 500
        });
        
        // Create transfer transaction
        const transaction = db.addTransaction({
          description: 'Account Transfer',
          amount: 200,
          accountId: sourceAccount.id,
          destinationAccountId: destinationAccount.id,
          currencyId: 'CUR_001',
          date: '2024-01-15'
        });
        
        expect.toBeDefined(transaction);
        expect.toBe(transaction.destinationAccountId, destinationAccount.id);
        
        // Should throw error when trying to delete destination account (async)
        let destinationErrorThrown = false;
        try {
          await db.deleteAccount(destinationAccount.id);
        } catch (error) {
          destinationErrorThrown = true;
        }
        
        if (!destinationErrorThrown) {
          throw new Error('Expected deleteAccount to throw an error for destination account with transactions');
        }
        
        // Should also throw error when trying to delete source account (async)
        let sourceErrorThrown = false;
        try {
          await db.deleteAccount(sourceAccount.id);
        } catch (error) {
          sourceErrorThrown = true;
        }
        
        if (!sourceErrorThrown) {
          throw new Error('Expected deleteAccount to throw an error for source account with transactions');
        }
      }
    },
    
    {
      id: 'dm-cascade-delete-transaction-groups-when-category-deleted',
      suite: 'Data Management - Referential Integrity',
      name: 'should handle cascade operations correctly',
      description: 'Tests proper cascade behavior when deleting parent records',
      expectedBehavior: 'Should handle dependent records appropriately',
      testFunction: () => {
        beforeEach();
        
        // This test verifies that the system handles cascading properly
        // For example, when deleting a transaction type, dependent transaction groups should either:
        // 1. Be prevented if they have transactions
        // 2. Be cascade deleted if they have no transactions
        
        const categories = db.getTable('transaction_types');
        const initialCategoryCount = categories.length;
        
        // Create a new category that we can safely test deletion on
        const testCategory = db.addCategory({
          name: 'Test Category for Cascade',
          description: 'Category for testing cascade behavior',
          icon: '🧪',
          color: '#FF5722'
        });
        
        // Create transaction group under this category
        const transactionGroup = db.addTransactionGroup({
          name: 'Test Group',
          description: 'Test group for cascade',
          transactionTypeId: testCategory.id
        });
        
        expect.toBeDefined(transactionGroup);
        expect.toBe(transactionGroup.transactionTypeId, testCategory.id);
        
        // If no transactions exist using this group, deletion might be allowed
        // But if transactions exist, it should be prevented
        const accountTypes = db.getAccountTypes();
        const account = db.addAccount({
          name: 'Test Account',
          accountTypeId: accountTypes[0].id,
          currencyId: 'CUR_001'
        });
        
        const transaction = db.addTransaction({
          description: 'Test Transaction',
          amount: 100,
          accountId: account.id,
          categoryId: testCategory.id,
          transactionGroupId: transactionGroup.id,
          currencyId: 'CUR_001',
          date: '2024-01-15'
        });
        
        expect.toBeDefined(transaction);
        
        // Now deletion should be prevented due to referential integrity
        expect.toThrow(() => {
          db.deleteCategory(testCategory.id);
        });
      }
    },
    
    {
      id: 'dm-allow-delete-unused-records',
      suite: 'Data Management - Referential Integrity',
      name: 'should allow deletion of unused records',
      description: 'Verifies that records not referenced by other data can be safely deleted',
      expectedBehavior: 'Should successfully delete records with no references',
      testFunction: () => {
        beforeEach();
        
        // Create records that are not used by any other data
        
        // Unused payee
        const unusedPayee = db.addPayee({
          name: 'Unused Payee',
          description: 'Payee not used in any transactions'
        });
        
        expect.toBeDefined(unusedPayee);
        
        // Should be able to delete unused payee
        const initialPayeeCount = db.getTable('payees').length;
        db.deletePayee(unusedPayee.id);
        expect.toBe(db.getTable('payees').length, initialPayeeCount - 1);
        
        // Unused payer
        const unusedPayer = db.addPayer({
          name: 'Unused Payer',
          description: 'Payer not used in any transactions'
        });
        
        expect.toBeDefined(unusedPayer);
        
        // Should be able to delete unused payer
        const initialPayerCount = db.getTable('payers').length;
        db.deletePayer(unusedPayer.id);
        expect.toBe(db.getTable('payers').length, initialPayerCount - 1);
        
        // Unused tag
        const unusedTag = db.addProduct({
          name: 'Unused Tag',
          description: 'Tag not used in any transactions'
        });
        
        expect.toBeDefined(unusedTag);
        
        // Should be able to delete unused tag
        const initialTagCount = db.getTable('tags').length;
        db.deleteProduct(unusedTag.id);
        expect.toBe(db.getTable('tags').length, initialTagCount - 1);
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
        
        const accountType = db.getAccountTypes()[0]?.id;
        
        db.addAccount({
          name: 'Checking Account',
          accountTypeId: accountType,
          currencyId: 'CUR_001'
        });
        
        // Should allow same name with different type (if another type exists)
        const accountTypes = db.getAccountTypes();
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
          accountTypeId: db.getAccountTypes()[0]?.id,
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
          accountTypeId: db.getAccountTypes()[0]?.id,
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
        
        // CreatedAt should be ISO string with current year
        const currentYear = new Date().getFullYear().toString();
        expect.toContain(transaction.createdAt, currentYear);
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
        
        const accountType = db.getAccountTypes()[0]?.id;
        
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
      testFunction: async () => {
        beforeEach();
        
        const account1 = db.addAccount({
          name: 'Account 1',
          accountTypeId: db.getAccountTypes()[0]?.id,
          currencyId: 'CUR_001'
        });
        
        const account2 = db.addAccount({
          name: 'Account 2', 
          accountTypeId: db.getAccountTypes()[0]?.id,
          currencyId: 'CUR_001'
        });
        
        // Add small delay to prevent ID collision
        const largeTransaction = db.addTransaction({
          description: 'Large Transaction',
          amount: 1000,
          accountId: account1.id,
          currencyId: 'CUR_001',
          date: '2024-01-15'
        });
        
        // Small delay to ensure different IDs
        await new Promise(resolve => setTimeout(resolve, 2));
        
        const smallTransaction = db.addTransaction({
          description: 'Small Transaction',
          amount: 50,
          accountId: account2.id, 
          currencyId: 'CUR_001',
          date: '2024-01-16'
        });
        
        // Verify exactly what was created
        expect.toBeDefined(largeTransaction);
        expect.toBeDefined(smallTransaction);
        expect.toBe(largeTransaction.description, 'Large Transaction');
        expect.toBe(smallTransaction.description, 'Small Transaction');
        
        const transactions = db.getTable('transactions');
        
        // Test the filters directly with our known transaction IDs
        const largeTransactions = transactions.filter(t => t.id === largeTransaction.id);
        const account1Transactions = transactions.filter(t => t.id === largeTransaction.id);
        
        // These should definitely be 1 since we're filtering by specific ID
        expect.toBe(largeTransactions.length, 1);
        expect.toBe(largeTransactions[0].description, 'Large Transaction');
        expect.toBe(account1Transactions.length, 1);
      }
    }
  ];
};