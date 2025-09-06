/**
 * Analytics Test Runner
 * Test suite for Analytics Phase 1 components and utilities
 * Integrates with existing Test Dashboard
 */

import RelationalDatabase from './relationalDatabase.js';
import { AnalyticsDataService } from './analyticsDataService.js';
import { 
  calculateBudgetVariance, 
  getBudgetComplianceScore,
  normalizePeriodForComparison,
  generateBudgetInsights,
  calculatePeriodComparison 
} from './budgetCalculations.js';

// Mock XLSX module for browser environment
const mockXLSX = {
  utils: {
    json_to_sheet: () => ({}),
    book_new: () => ({}),
    book_append_sheet: () => {},
    sheet_to_json: () => ([])
  },
  write: () => new ArrayBuffer(0),
  writeFile: () => {}
};

if (typeof window !== 'undefined') {
  window.XLSX = mockXLSX;
}

// Fallback expect implementation for browser environment
const testExpect = {
  toBe: (actual, expected) => {
    if (actual !== expected) {
      throw new Error(`Expected ${actual} to be ${expected}`);
    }
  },
  toEqual: (actual, expected) => {
    const actualStr = JSON.stringify(actual);
    const expectedStr = JSON.stringify(expected);
    if (actualStr !== expectedStr) {
      throw new Error(`Expected ${actualStr} to equal ${expectedStr}`);
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
  },
  toContain: (array, item) => {
    if (!Array.isArray(array) || !array.includes(item)) {
      throw new Error(`Expected array to contain ${item}`);
    }
  }
};

/**
 * Create Analytics test suite for Test Dashboard integration
 */
export const createAnalyticsTests = (expectObj) => {
  let db;
  let analyticsService;
  let mockFileStorage;
  
  const expect = expectObj || (typeof window !== 'undefined' && window.expect) || testExpected;
  
  const beforeEach = () => {
    // Initialize test database
    db = new RelationalDatabase();
    db.createNewDatabase('en');
    
    // Mock file storage
    mockFileStorage = {
      saveTable: async () => true,
      loadTable: async () => new ArrayBuffer(0)
    };
    
    // Create analytics service
    analyticsService = new AnalyticsDataService(db, mockFileStorage);
    
    // Add test data
    setupTestData();
  };
  
  const setupTestData = () => {
    // Add test accounts
    const accounts = db.getTable('accounts');
    accounts.push({
      id: 'ACC_TEST_001',
      name: 'Test Bank Account',
      accountTypeId: 'ACCT_TYPE_001', // Bank Account
      balance: 1000,
      isActive: true
    });
    
    // Add test transactions
    const transactions = db.getTable('transactions');
    transactions.push(
      {
        id: 'TXN_001',
        date: '2024-01-15',
        amount: 500,
        transactionTypeId: 'CAT_001', // Income
        subcategoryId: 'SUB_001',
        accountId: 'ACC_TEST_001'
      },
      {
        id: 'TXN_002',
        date: '2024-01-16',
        amount: -200,
        transactionTypeId: 'CAT_002', // Expense
        subcategoryId: 'SUB_002',
        accountId: 'ACC_TEST_001'
      },
      {
        id: 'TXN_003',
        date: '2024-01-17',
        amount: -100,
        transactionTypeId: 'CAT_003', // Transfer (should be filtered out)
        subcategoryId: 'SUB_003',
        accountId: 'ACC_TEST_001'
      }
    );
    
    // Add test budget
    const budgets = db.getTable('budgets');
    budgets.push({
      id: 'BUDGET_TEST_001',
      name: 'Test Budget',
      status: 'active',
      createdAt: '2024-01-01',
      lastModified: '2024-01-01'
    });
    
    // Add test budget line items
    const budgetLineItems = db.getTable('budget_line_items');
    budgetLineItems.push({
      id: 'LINE_001',
      budgetId: 'BUDGET_TEST_001',
      subcategoryId: 'SUB_002',
      subcategoryName: 'Test Expense Category',
      period: 'monthly',
      amount: 300,
      baseCurrency: 'CUR_001'
    });
    
    // Add test subcategories
    const subcategories = db.getTable('subcategories');
    subcategories.push(
      {
        id: 'SUB_001',
        name: 'Test Income',
        isActive: true
      },
      {
        id: 'SUB_002', 
        name: 'Test Expense',
        isActive: true
      }
    );
  };

  return [
    // Analytics Data Service Tests
    {
      id: 'Analytics_DataService_001',
      category: 'Analytics',
      suite: 'Data Service',
      name: 'Should filter transactions for analytics',
      expectedBehavior: 'Only include CAT_001 (Income) and CAT_002 (Expense) transactions',
      testFunction: () => {
        beforeEach();
        const allTransactions = db.getTable('transactions');
        const filteredTransactions = analyticsService.applyAnalyticsFilters(allTransactions);
        
        expect.toBe(filteredTransactions.length, 2); // Should exclude transfer
        expect.toBe(filteredTransactions[0].transactionTypeId, 'CAT_001');
        expect.toBe(filteredTransactions[1].transactionTypeId, 'CAT_002');
      }
    },
    
    {
      id: 'Analytics_DataService_002',
      category: 'Analytics',
      suite: 'Data Service',
      name: 'Should get transactions for period',
      expectedBehavior: 'Return transactions within specified date range',
      testFunction: () => {
        beforeEach();
        const transactions = analyticsService.getTransactionsForPeriod('2024-01-15', '2024-01-16', 'cash');
        
        expect.toBe(transactions.length, 2); // Income and expense within range
        expect.toBe(transactions[0].id, 'TXN_001');
        expect.toBe(transactions[1].id, 'TXN_002');
      }
    },
    
    {
      id: 'Analytics_DataService_003', 
      category: 'Analytics',
      suite: 'Data Service',
      name: 'Should get active budget for analytics',
      expectedBehavior: 'Return active budget with line items',
      testFunction: async () => {
        beforeEach();
        const budget = await analyticsService.getActiveBudgetForAnalytics();
        
        expect.toBeTruthy(budget);
        expect.toBe(budget.id, 'BUDGET_TEST_001');
        expect.toBe(budget.status, 'active');
        expect.toBe(budget.lineItems.length, 1);
        expect.toBe(budget.lineItems[0].subcategoryId, 'SUB_002');
      }
    },
    
    {
      id: 'Analytics_DataService_004',
      category: 'Analytics', 
      suite: 'Data Service',
      name: 'Should normalize budget to view period',
      expectedBehavior: 'Convert budget amounts between different time periods',
      testFunction: () => {
        beforeEach();
        
        // Test monthly to yearly
        const yearly = analyticsService.normalizeBudgetToViewPeriod(100, 'monthly', 'yearly');
        expect.toBe(yearly, 1200);
        
        // Test weekly to monthly
        const monthly = analyticsService.normalizeBudgetToViewPeriod(50, 'weekly', 'monthly');
        expect.toBe(monthly, 50 * (52 / 12));
        
        // Test quarterly to monthly
        const quarterlyToMonthly = analyticsService.normalizeBudgetToViewPeriod(300, 'quarterly', 'monthly');
        expect.toBe(quarterlyToMonthly, 100);
      }
    },
    
    {
      id: 'Analytics_DataService_005',
      category: 'Analytics',
      suite: 'Data Service', 
      name: 'Should get income and expense totals',
      expectedBehavior: 'Calculate total income and expenses for period',
      testFunction: () => {
        beforeEach();
        const totals = analyticsService.getIncomeExpenseTotals('2024-01-15', '2024-01-17', 'cash');
        
        expect.toBe(totals.totalIncome, 500);
        expect.toBe(totals.totalExpenses, 200);
        expect.toBe(totals.netCashflow, 300);
      }
    },
    
    // Budget Calculations Tests
    {
      id: 'Analytics_Calculations_001',
      category: 'Analytics',
      suite: 'Budget Calculations',
      name: 'Should calculate budget variance correctly',
      expectedBehavior: 'Calculate variance and status between actual and budgeted amounts',
      testFunction: () => {
        beforeEach();
        
        // Test over budget
        const overBudget = calculateBudgetVariance(150, 100);
        expect.toBe(overBudget.variance, 50);
        expect.toBe(overBudget.variancePercentage, 50);
        expect.toBe(overBudget.status, 'over');
        expect.toBeTruthy(overBudget.isOverBudget);
        
        // Test under budget
        const underBudget = calculateBudgetVariance(75, 100);
        expect.toBe(underBudget.variance, -25);
        expect.toBe(underBudget.variancePercentage, -25);
        expect.toBe(underBudget.status, 'good');
        expect.toBeFalsy(underBudget.isOverBudget);
        
        // Test no budget
        const noBudget = calculateBudgetVariance(100, 0);
        expect.toBe(noBudget.status, 'no_budget');
        expect.toBe(noBudget.variancePercentage, null);
      }
    },
    
    {
      id: 'Analytics_Calculations_002',
      category: 'Analytics',
      suite: 'Budget Calculations',
      name: 'Should calculate budget compliance score',
      expectedBehavior: 'Calculate overall budget adherence percentage',
      testFunction: () => {
        beforeEach();
        
        const testData = [
          { hasBudget: true, budgetAmount: 100, actualSpent: 80, variance: -20 }, // On track
          { hasBudget: true, budgetAmount: 200, actualSpent: 220, variance: 20 }, // Over budget
          { hasBudget: false, budgetAmount: 0, actualSpent: 50, variance: 0 } // No budget
        ];
        
        const compliance = getBudgetComplianceScore(testData);
        expect.toBe(compliance.categoriesWithBudget, 2);
        expect.toBe(compliance.categoriesOnTrack, 1);
        expect.toBe(compliance.categoriesOverBudget, 1);
        expect.toBe(compliance.score, 50); // 50% compliance (1 of 2 budgeted categories on track)
        expect.toBe(compliance.totalBudgeted, 300);
        expect.toBe(compliance.totalSpent, 300);
      }
    },
    
    {
      id: 'Analytics_Calculations_003',
      category: 'Analytics',
      suite: 'Budget Calculations',
      name: 'Should normalize periods for comparison',
      expectedBehavior: 'Convert amounts between different time periods accurately',
      testFunction: () => {
        beforeEach();
        
        // Weekly to monthly
        const weeklyToMonthly = normalizePeriodForComparison(52, 'weekly', 'monthly');
        expect.toBe(weeklyToMonthly, 52 * (52 / 12));
        
        // Monthly to yearly
        const monthlyToYearly = normalizePeriodForComparison(100, 'monthly', 'yearly');
        expect.toBe(monthlyToYearly, 1200);
        
        // Same period
        const samePeriod = normalizePeriodForComparison(100, 'monthly', 'monthly');
        expect.toBe(samePeriod, 100);
      }
    },
    
    {
      id: 'Analytics_Calculations_004',
      category: 'Analytics', 
      suite: 'Budget Calculations',
      name: 'Should generate budget insights',
      expectedBehavior: 'Generate actionable insights based on budget performance',
      testFunction: () => {
        beforeEach();
        
        const testData = [
          { 
            subcategoryId: 'SUB_001', 
            subcategoryName: 'Groceries',
            hasBudget: true, 
            budgetAmount: 100, 
            actualSpent: 120, 
            variance: 20,
            variancePercentage: 120
          },
          { 
            subcategoryId: 'SUB_002',
            subcategoryName: 'Utilities', 
            hasBudget: true, 
            budgetAmount: 200, 
            actualSpent: 50, 
            variance: -150,
            variancePercentage: 25
          }
        ];
        
        const insights = generateBudgetInsights(testData, null);
        expect.toBeGreaterThan(insights.length, 0);
        
        // Should have over-budget insight
        const overBudgetInsight = insights.find(i => i.type === 'warning');
        expect.toBeTruthy(overBudgetInsight);
        
        // Should have savings opportunity insight
        const savingsInsight = insights.find(i => i.type === 'success');
        expect.toBeTruthy(savingsInsight);
      }
    },
    
    {
      id: 'Analytics_Calculations_005',
      category: 'Analytics',
      suite: 'Budget Calculations',
      name: 'Should calculate period-over-period comparison',
      expectedBehavior: 'Compare current period amounts to previous period',
      testFunction: () => {
        beforeEach();
        
        // Increase
        const increase = calculatePeriodComparison(120, 100);
        expect.toBe(increase.change, 20);
        expect.toBe(increase.changePercentage, 20);
        expect.toBe(increase.trend, 'up');
        
        // Decrease  
        const decrease = calculatePeriodComparison(80, 100);
        expect.toBe(decrease.change, -20);
        expect.toBe(decrease.changePercentage, -20);
        expect.toBe(decrease.trend, 'down');
        
        // Flat (less than 5% change)
        const flat = calculatePeriodComparison(102, 100);
        expect.toBe(flat.trend, 'flat');
        
        // No previous data
        const noPrevious = calculatePeriodComparison(100, 0);
        expect.toBe(noPrevious.changePercentage, null);
      }
    },
    
    // Integration Tests
    {
      id: 'Analytics_Integration_001',
      category: 'Analytics',
      suite: 'Integration',
      name: 'Should integrate transaction data with budget',
      expectedBehavior: 'Combine transaction data with budget context for analysis',
      testFunction: async () => {
        beforeEach();
        const data = await analyticsService.getTransactionDataWithBudget(
          'monthly', 
          'cash', 
          '2024-01-01', 
          '2024-01-31'
        );
        
        expect.toBeGreaterThan(data.length, 0);
        
        const expenseCategory = data.find(d => d.subcategoryId === 'SUB_002');
        expect.toBeTruthy(expenseCategory);
        expect.toBeTruthy(expenseCategory.hasBudget);
        expect.toBe(expenseCategory.budgetAmount, 300);
        expect.toBe(expenseCategory.actualSpent, 200);
        expect.toBe(expenseCategory.variance, -100); // Under budget
      }
    },
    
    {
      id: 'Analytics_Integration_002',
      category: 'Analytics',
      suite: 'Integration',
      name: 'Should handle missing budget gracefully',
      expectedBehavior: 'Work correctly when no active budget exists',
      testFunction: async () => {
        beforeEach();
        
        // Remove active budget
        const budgets = db.getTable('budgets');
        budgets[0].status = 'inactive';
        
        const budget = await analyticsService.getActiveBudgetForAnalytics();
        expect.toBeFalsy(budget);
        
        const data = await analyticsService.getTransactionDataWithBudget(
          'monthly',
          'cash',
          '2024-01-01', 
          '2024-01-31'
        );
        
        expect.toBeGreaterThan(data.length, 0);
        data.forEach(item => {
          expect.toBeFalsy(item.hasBudget);
          expect.toBe(item.budgetAmount, 0);
        });
      }
    },
    
    {
      id: 'Analytics_Integration_003',
      category: 'Analytics', 
      suite: 'Integration',
      name: 'Should filter by account type correctly',
      expectedBehavior: 'Only include transactions from bank and current liability accounts',
      testFunction: () => {
        beforeEach();
        
        // Add investment account transaction (should be filtered out)
        const transactions = db.getTable('transactions');
        transactions.push({
          id: 'TXN_INVEST',
          date: '2024-01-15',
          amount: 1000,
          transactionTypeId: 'CAT_001',
          subcategoryId: 'SUB_001',
          accountId: 'ACC_INVEST',
          accountTypeId: 'ACCT_TYPE_002' // Investment account
        });
        
        const filtered = analyticsService.applyAnalyticsFilters(transactions);
        
        // Should not include investment account transaction
        const investmentTxn = filtered.find(t => t.id === 'TXN_INVEST');
        expect.toBeFalsy(investmentTxn);
      }
    }
  ];
};

// Test execution helper for browser environment
if (typeof window !== 'undefined') {
  window.createAnalyticsTests = createAnalyticsTests;
}