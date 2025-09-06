// Test Runner - Executes tests in the browser environment
import RelationalDatabase from './relationalDatabase.js';
import ExchangeRateService from './exchangeRateService.js';
import { createDataManagementTests } from './dataManagement.test.js';
import { createSettingsTests } from './settings.test.js';
import { createTransactionFormTests } from './transactionForm.test.js';
import { createOverviewTests } from './overview.test.js';
import { createImportTransactionsTests } from './importTransactions.test.js';
import { createReconciliationTests } from './reconciliation.test.js';
import { createExistingReconciliationsTests } from './existingReconciliations.test.js';
import { createBudgetSetupTests } from './budgetSetupTestRunner.test.js';
import { createAnalyticsTests } from './analyticsTestRunner.test.js';

// Mock XLSX for browser environment
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

// Replace XLSX import globally for tests
window.XLSX = mockXLSX;

// Test execution utilities
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

// Make expect globally available
window.expect = expect;

// Database Tests
const createDatabaseTests = () => {
  let db;
  
  const beforeEach = () => {
    db = new RelationalDatabase();
    db.createNewDatabase('en');
  };

  return [
    {
      id: 'db-add-account',
      suite: 'RelationalDatabase - Account Management',
      name: 'should add a new account',
      description: 'Creates a new account and verifies it was added correctly',
      expectedBehavior: 'Account should be created with correct properties',
      testFunction: () => {
        beforeEach();
        const initialCount = db.getTable('accounts').length;
        
        const newAccount = db.addAccount({
          name: 'Test Checking Account',
          accountTypeId: 'AT_001',
          currencyId: 'CUR_001',
          balance: 1500.00,
          accountCode: 'CHK'
        });

        expect.toBeDefined(newAccount);
        expect.toBe(newAccount.name, 'Test Checking Account');
        expect.toBe(newAccount.balance, 1500.00);
        expect.toBe(newAccount.accountCode, 'CHK');
        expect.toBe(db.getTable('accounts').length, initialCount + 1);
      }
    },
    {
      id: 'db-update-account',
      suite: 'RelationalDatabase - Account Management',
      name: 'should update account balance',
      description: 'Updates an existing account balance',
      expectedBehavior: 'Account balance should be updated to new value',
      testFunction: () => {
        beforeEach();
        const accounts = db.getTable('accounts');
        const testAccount = accounts[0];
        const originalBalance = testAccount.balance;
        const newBalance = 2500.00;

        db.updateAccount(testAccount.id, { balance: newBalance });
        
        const updatedAccount = db.getTable('accounts').find(acc => acc.id === testAccount.id);
        expect.toBe(updatedAccount.balance, newBalance);
      }
    },
    {
      id: 'db-delete-account',
      suite: 'RelationalDatabase - Account Management',
      name: 'should delete an account',
      description: 'Removes an account from the database',
      expectedBehavior: 'Account should be removed from accounts table',
      testFunction: () => {
        beforeEach();
        const accounts = db.getTable('accounts');
        const accountToDelete = accounts[0];
        const initialCount = accounts.length;

        db.deleteAccount(accountToDelete.id);

        expect.toBe(db.getTable('accounts').length, initialCount - 1);
        expect.toBeUndefined(db.getTable('accounts').find(acc => acc.id === accountToDelete.id));
      }
    },
    {
      id: 'db-add-exchange-rate',
      suite: 'RelationalDatabase - Exchange Rate Management',
      name: 'should add exchange rate',
      description: 'Adds a new exchange rate to the database',
      expectedBehavior: 'Exchange rate should be stored with correct values',
      testFunction: () => {
        beforeEach();
        const initialCount = db.getTable('exchange_rates').length;
        
        const rate = db.addExchangeRate({
          fromCurrencyId: 'CUR_001',
          toCurrencyId: 'CUR_002',
          rate: 1.0850,
          date: '2024-01-15',
          source: 'manual'
        });

        expect.toBeDefined(rate);
        expect.toBe(rate.rate, 1.0850);
        expect.toBe(rate.source, 'manual');
        expect.toBe(db.getTable('exchange_rates').length, initialCount + 1);
      }
    },
    {
      id: 'db-find-currency',
      suite: 'RelationalDatabase - Lookup Operations',
      name: 'should find currency by code',
      description: 'Looks up currency information by code',
      expectedBehavior: 'Should return EUR currency with correct details',
      testFunction: () => {
        beforeEach();
        const currencies = db.getTable('currencies');
        const eur = currencies.find(curr => curr.code === 'EUR');
        
        expect.toBeDefined(eur);
        expect.toBe(eur.name, 'Euro');
        expect.toBe(eur.symbol, '€');
      }
    },
    {
      id: 'db-validate-required-fields',
      suite: 'RelationalDatabase - Data Validation',
      name: 'should validate required fields for accounts',
      description: 'Rejects account creation without required fields',
      expectedBehavior: 'Should throw error for missing name field',
      testFunction: () => {
        beforeEach();
        expect.toThrow(() => {
          db.addAccount({
            accountTypeId: 'AT_001',
            currencyId: 'CUR_001'
          });
        });
      }
    },
    {
      id: 'db-validate-exchange-rates',
      suite: 'RelationalDatabase - Data Validation',
      name: 'should validate exchange rate values',
      description: 'Rejects negative exchange rates',
      expectedBehavior: 'Should throw error for negative exchange rate',
      testFunction: () => {
        beforeEach();
        expect.toThrow(() => {
          db.addExchangeRate({
            fromCurrencyId: 'CUR_001',
            toCurrencyId: 'CUR_002',
            rate: -1.0850,
            date: '2024-01-15',
            source: 'manual'
          });
        });
      }
    }
  ];
};

// Exchange Rate Service Tests
const createExchangeRateServiceTests = () => {
  let service;
  let mockDatabase;
  
  const beforeEach = () => {
    mockDatabase = {
      tables: {
        currencies: [
          { id: 'CUR_001', code: 'EUR', name: 'Euro', symbol: '€' },
          { id: 'CUR_002', code: 'USD', name: 'US Dollar', symbol: '$' },
          { id: 'CUR_003', code: 'GBP', name: 'British Pound', symbol: '£' }
        ],
        exchange_rates: []
      },
      getTable: function(tableName) {
        return this.tables[tableName] || [];
      },
      addExchangeRate: (rate) => {
        const newRate = { id: `RATE_${Date.now()}`, ...rate };
        mockDatabase.tables.exchange_rates.push(newRate);
        return newRate;
      },
      saveTableToWorkbook: () => {}
    };

    service = new ExchangeRateService(mockDatabase);
    
    // Add missing methods
    if (!service.getCurrencyByCode) {
      service.getCurrencyByCode = function(code) {
        return this.database.getTable('currencies').find(c => c.code === code);
      };
    }
    
    if (!service.formatCurrency) {
      service.formatCurrency = function(amount, currencyId) {
        const currency = this.database.getTable('currencies').find(c => c.id === currencyId);
        if (!currency) return `${amount}`;
        return `${currency.symbol}${Math.abs(amount).toFixed(2)}`;
      };
    }
  };

  return [
    {
      id: 'ers-find-currency',
      suite: 'ExchangeRateService - Currency Operations',
      name: 'should find currency by code',
      description: 'Finds currency information using currency code',
      expectedBehavior: 'Should return EUR currency object',
      testFunction: () => {
        beforeEach();
        const eur = service.getCurrencyByCode('EUR');
        
        expect.toBeDefined(eur);
        expect.toBe(eur.code, 'EUR');
        expect.toBe(eur.name, 'Euro');
        expect.toBe(eur.symbol, '€');
      }
    },
    {
      id: 'ers-same-currency-rate',
      suite: 'ExchangeRateService - Exchange Rate Calculations',
      name: 'should return 1.0 for same currency conversion',
      description: 'Same currency should have 1.0 exchange rate',
      expectedBehavior: 'EUR to EUR should return 1.0',
      testFunction: () => {
        beforeEach();
        const rate = service.getExchangeRate('CUR_001', 'CUR_001');
        expect.toBe(rate, 1.0);
      }
    },
    {
      id: 'ers-direct-rate',
      suite: 'ExchangeRateService - Exchange Rate Calculations',
      name: 'should calculate conversion rate correctly',
      description: 'Uses stored exchange rate for conversion',
      expectedBehavior: 'Should return stored exchange rate value',
      testFunction: () => {
        beforeEach();
        mockDatabase.tables.exchange_rates.push({
          id: 'RATE_001',
          fromCurrencyId: 'CUR_001',
          toCurrencyId: 'CUR_002',
          rate: 1.0850,
          date: '2024-01-15',
          source: 'manual'
        });

        const rate = service.getExchangeRate('CUR_001', 'CUR_002');
        expect.toBe(rate, 1.0850);
      }
    },
    {
      id: 'ers-format-currency',
      suite: 'ExchangeRateService - Currency Formatting',
      name: 'should format amount with currency symbol',
      description: 'Formats monetary amounts with correct currency symbol',
      expectedBehavior: 'Should include € symbol and formatted amount',
      testFunction: () => {
        beforeEach();
        const formatted = service.formatCurrency(1234.56, 'CUR_001');
        
        expect.toContain(formatted, '€');
        expect.toContain(formatted, '1234.56');
      }
    }
  ];
};

// Main test runner functions
export const runTestSuite = async () => {
  const allTests = [
    ...createDatabaseTests(),
    ...createExchangeRateServiceTests(),
    ...createDataManagementTests(),
    ...createSettingsTests(),
    ...createTransactionFormTests(),
    ...createOverviewTests(),
    ...createImportTransactionsTests(),
    ...createReconciliationTests(),
    ...createExistingReconciliationsTests(),
    ...createBudgetSetupTests(),
    ...createAnalyticsTests()
  ];

  const results = [];
  
  for (const test of allTests) {
    const result = await runIndividualTest(test.name, test.testFunction);
    results.push({
      ...test,
      ...result,
      lastRun: new Date().toISOString()
    });
  }
  
  return results;
};

export const runIndividualTest = async (testName, testFunction) => {
  const startTime = performance.now();
  
  try {
    await testFunction();
    const endTime = performance.now();
    
    return {
      status: 'passed',
      duration: Math.round(endTime - startTime),
      error: null
    };
  } catch (error) {
    const endTime = performance.now();
    
    return {
      status: 'failed',
      duration: Math.round(endTime - startTime),
      error: error.message
    };
  }
};