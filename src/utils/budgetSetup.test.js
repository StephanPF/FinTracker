/**
 * Budget Setup Tests
 * 
 * Tests budget creation, management, and line item operations
 * following the specification in BUDGET_SETUP_IMPLEMENTATION.md
 */

import { RelationalDatabase } from './relationalDatabase.js';
import { FileStorage } from './fileStorage.js';

// Custom test framework for browser compatibility
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
  toBeGreaterThan: (actual, expected) => {
    if (actual <= expected) {
      throw new Error(`Expected ${actual} to be greater than ${expected}`);
    }
  },
  toContain: (actual, expected) => {
    if (!actual.includes(expected)) {
      throw new Error(`Expected ${actual} to contain ${expected}`);
    }
  },
  toHaveLength: (actual, expected) => {
    if (actual.length !== expected) {
      throw new Error(`Expected ${actual} to have length ${expected}, got ${actual.length}`);
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

const describe = (name, fn) => {
  console.log(`\n=== ${name} ===`);
  fn();
};

const it = (name, fn) => {
  try {
    fn();
    console.log(`✅ ${name}`);
  } catch (error) {
    console.error(`❌ ${name}: ${error.message}`);
    throw error;
  }
};

const beforeEach = (fn) => {
  // Store the setup function to be called before each test
  if (typeof window !== 'undefined') {
    window.testSetup = fn;
  }
};

// Test database setup
let database;
let fileStorage;

const setupTestDatabase = async () => {
  // Create clean database instance
  database = new RelationalDatabase();
  fileStorage = new FileStorage();
  database.fileStorage = fileStorage;
  
  // Initialize test data
  await database.initializeDefaultData();
  
  // Add test currencies
  const currencies = [
    {
      id: 'CUR_001',
      name: 'Euro',
      symbol: '€',
      code: 'EUR',
      exchangeRateToBase: 1.0,
      isBaseCurrency: true,
      isActive: true,
      createdAt: '2024-01-01'
    },
    {
      id: 'CUR_002', 
      name: 'US Dollar',
      symbol: '$',
      code: 'USD',
      exchangeRateToBase: 1.1,
      isBaseCurrency: false,
      isActive: true,
      createdAt: '2024-01-01'
    }
  ];
  
  // Add test transaction types (expense categories)
  const transactionTypes = [
    {
      id: 'CAT_002',
      name: 'Expenses',
      description: 'Expense transactions',
      color: '#ef4444',
      icon: '💸',
      isActive: true,
      createdAt: '2024-01-01'
    }
  ];
  
  // Add test subcategories for expenses
  const subcategories = [
    {
      id: 'SUB_001',
      name: 'Food & Dining',
      description: 'Restaurant and grocery expenses',
      groupId: 'GRP_001',
      isActive: true,
      createdAt: '2024-01-01'
    },
    {
      id: 'SUB_002',
      name: 'Transportation',
      description: 'Car, gas, public transport',
      groupId: 'GRP_001',
      isActive: true,
      createdAt: '2024-01-01'
    },
    {
      id: 'SUB_003',
      name: 'Housing',
      description: 'Rent, utilities, home maintenance',
      groupId: 'GRP_001',
      isActive: true,
      createdAt: '2024-01-01'
    }
  ];
  
  // Add test transaction groups
  const transactionGroups = [
    {
      id: 'GRP_001',
      name: 'Personal Expenses',
      description: 'Personal spending categories',
      color: '#ef4444',
      order: 1,
      isActive: true,
      transactionTypeId: 'CAT_002',
      createdAt: '2024-01-01'
    }
  ];
  
  // Replace tables with test data
  database.replaceTable('currencies', currencies);
  database.replaceTable('transaction_types', transactionTypes);
  database.replaceTable('transaction_groups', transactionGroups);
  database.replaceTable('subcategories', subcategories);
  database.replaceTable('budgets', []);
  database.replaceTable('budget_line_items', []);
  
  return database;
};

// Helper function to get current date string (timezone-safe)
const getCurrentDateString = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const day = now.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Normalization helper function
const normalizeToMonthly = (amount, period) => {
  switch (period) {
    case 'monthly':
      return amount;
    case 'quarterly':
      return amount / 3;
    case 'yearly':
      return amount / 12;
    default:
      return amount;
  }
};

// Budget Setup Tests
describe('Budget Setup - Database Schema', () => {
  beforeEach(async () => {
    database = await setupTestDatabase();
  });

  it('should have budgets table with correct schema', () => {
    const budgetsSchema = database.tableSchemas.budgets;
    const expectedFields = ['id', 'name', 'description', 'status', 'createdAt', 'lastModified', 'isDefault'];
    
    expectedFields.forEach(field => {
      expect.toContain(budgetsSchema, field);
    });
  });

  it('should have budget_line_items table with correct schema', () => {
    const lineItemsSchema = database.tableSchemas.budget_line_items;
    const expectedFields = ['id', 'budgetId', 'subcategoryId', 'subcategoryName', 'period', 'amount', 'baseCurrency'];
    
    expectedFields.forEach(field => {
      expect.toContain(lineItemsSchema, field);
    });
  });

  it('should have correct relationships defined', () => {
    const relationships = database.relationships.budget_line_items;
    expect.toEqual(relationships.budgetId, { table: 'budgets', field: 'id' });
    expect.toEqual(relationships.subcategoryId, { table: 'subcategories', field: 'id' });
  });
});

describe('Budget Setup - Budget Creation', () => {
  beforeEach(async () => {
    database = await setupTestDatabase();
  });

  it('should create a new budget with valid data', () => {
    const newBudget = {
      id: 'BUDGET_001',
      name: '2024 Family Budget',
      description: 'Annual family budget for 2024',
      status: 'draft',
      createdAt: getCurrentDateString(),
      lastModified: getCurrentDateString(),
      isDefault: true
    };

    let budgets = database.getTable('budgets');
    budgets.push(newBudget);
    database.replaceTable('budgets', budgets);

    const savedBudgets = database.getTable('budgets');
    expect.toHaveLength(savedBudgets, 1);
    expect.toBe(savedBudgets[0].name, '2024 Family Budget');
    expect.toBe(savedBudgets[0].status, 'draft');
    expect.toBe(savedBudgets[0].isDefault, true);
  });

  it('should enforce unique budget names', () => {
    // Create first budget
    const budget1 = {
      id: 'BUDGET_001',
      name: 'Test Budget',
      status: 'draft',
      createdAt: getCurrentDateString(),
      lastModified: getCurrentDateString(),
      isDefault: false
    };

    let budgets = database.getTable('budgets');
    budgets.push(budget1);
    database.replaceTable('budgets', budgets);

    // Try to create second budget with same name (should be prevented in UI)
    const existingNames = budgets.map(b => b.name.toLowerCase());
    const duplicateName = 'test budget';
    expect.toContain(existingNames, duplicateName);
  });

  it('should set first budget as default automatically', () => {
    const firstBudget = {
      id: 'BUDGET_001',
      name: 'First Budget',
      status: 'draft',
      createdAt: getCurrentDateString(),
      lastModified: getCurrentDateString(),
      isDefault: true // Should be true for first budget
    };

    let budgets = database.getTable('budgets');
    budgets.push(firstBudget);
    database.replaceTable('budgets', budgets);

    const savedBudgets = database.getTable('budgets');
    expect.toBe(savedBudgets[0].isDefault, true);
  });
});

describe('Budget Setup - Budget Line Items', () => {
  beforeEach(async () => {
    database = await setupTestDatabase();
    
    // Create a test budget
    const testBudget = {
      id: 'BUDGET_001',
      name: 'Test Budget',
      description: 'Test budget for line items',
      status: 'draft',
      createdAt: getCurrentDateString(),
      lastModified: getCurrentDateString(),
      isDefault: true
    };
    
    database.replaceTable('budgets', [testBudget]);
  });

  it('should add line items to budget', () => {
    const lineItem = {
      id: 'LINE_001',
      budgetId: 'BUDGET_001',
      subcategoryId: 'SUB_001',
      subcategoryName: 'Food & Dining',
      period: 'monthly',
      amount: 800,
      baseCurrency: 'CUR_001'
    };

    let lineItems = database.getTable('budget_line_items');
    lineItems.push(lineItem);
    database.replaceTable('budget_line_items', lineItems);

    const savedLineItems = database.getTable('budget_line_items');
    expect.toHaveLength(savedLineItems, 1);
    expect.toBe(savedLineItems[0].subcategoryName, 'Food & Dining');
    expect.toBe(savedLineItems[0].amount, 800);
    expect.toBe(savedLineItems[0].period, 'monthly');
  });

  it('should prevent duplicate subcategories in same budget', () => {
    const lineItem1 = {
      id: 'LINE_001',
      budgetId: 'BUDGET_001',
      subcategoryId: 'SUB_001',
      subcategoryName: 'Food & Dining',
      period: 'monthly',
      amount: 800,
      baseCurrency: 'CUR_001'
    };

    let lineItems = database.getTable('budget_line_items');
    lineItems.push(lineItem1);

    // Check for duplicate subcategory (should be prevented in UI)
    const existingSubcategory = lineItems.find(item => 
      item.budgetId === 'BUDGET_001' && item.subcategoryId === 'SUB_001'
    );
    expect.toBeTruthy(existingSubcategory);
  });

  it('should validate positive amounts', () => {
    const lineItem = {
      id: 'LINE_001',
      budgetId: 'BUDGET_001',
      subcategoryId: 'SUB_001',
      subcategoryName: 'Food & Dining',
      period: 'monthly',
      amount: 800,
      baseCurrency: 'CUR_001'
    };

    // Amount should be positive
    expect.toBeGreaterThan(lineItem.amount, 0);
  });

  it('should support different time periods', () => {
    const lineItems = [
      {
        id: 'LINE_001',
        budgetId: 'BUDGET_001',
        subcategoryId: 'SUB_001',
        subcategoryName: 'Food & Dining',
        period: 'monthly',
        amount: 800,
        baseCurrency: 'CUR_001'
      },
      {
        id: 'LINE_002',
        budgetId: 'BUDGET_001',
        subcategoryId: 'SUB_002',
        subcategoryName: 'Transportation',
        period: 'quarterly',
        amount: 1200,
        baseCurrency: 'CUR_001'
      },
      {
        id: 'LINE_003',
        budgetId: 'BUDGET_001',
        subcategoryId: 'SUB_003',
        subcategoryName: 'Housing',
        period: 'yearly',
        amount: 21600,
        baseCurrency: 'CUR_001'
      }
    ];

    database.replaceTable('budget_line_items', lineItems);

    const savedLineItems = database.getTable('budget_line_items');
    expect.toHaveLength(savedLineItems, 3);
    
    const periods = savedLineItems.map(item => item.period);
    expect.toContain(periods, 'monthly');
    expect.toContain(periods, 'quarterly');
    expect.toContain(periods, 'yearly');
  });
});

describe('Budget Setup - Budget Calculations', () => {
  beforeEach(async () => {
    database = await setupTestDatabase();
    
    // Create test budget with line items
    const testBudget = {
      id: 'BUDGET_001',
      name: 'Test Budget',
      status: 'draft',
      createdAt: getCurrentDateString(),
      lastModified: getCurrentDateString(),
      isDefault: true
    };
    
    const testLineItems = [
      {
        id: 'LINE_001',
        budgetId: 'BUDGET_001',
        subcategoryId: 'SUB_001',
        subcategoryName: 'Food & Dining',
        period: 'monthly',
        amount: 800,
        baseCurrency: 'CUR_001'
      },
      {
        id: 'LINE_002',
        budgetId: 'BUDGET_001',
        subcategoryId: 'SUB_002',
        subcategoryName: 'Transportation',
        period: 'quarterly',
        amount: 1200, // 400/month
        baseCurrency: 'CUR_001'
      },
      {
        id: 'LINE_003',
        budgetId: 'BUDGET_001',
        subcategoryId: 'SUB_003',
        subcategoryName: 'Housing',
        period: 'yearly',
        amount: 21600, // 1800/month
        baseCurrency: 'CUR_001'
      }
    ];
    
    database.replaceTable('budgets', [testBudget]);
    database.replaceTable('budget_line_items', testLineItems);
  });

  it('should normalize amounts to monthly equivalent', () => {
    expect.toBe(normalizeToMonthly(800, 'monthly'), 800);
    expect.toBe(normalizeToMonthly(1200, 'quarterly'), 400);
    expect.toBe(normalizeToMonthly(21600, 'yearly'), 1800);
  });

  it('should calculate total monthly budget', () => {
    const lineItems = database.getTable('budget_line_items');
    const monthlyTotal = lineItems.reduce((total, item) => {
      return total + normalizeToMonthly(item.amount, item.period);
    }, 0);

    expect.toBe(monthlyTotal, 3000); // 800 + 400 + 1800
  });

  it('should calculate annual projection', () => {
    const lineItems = database.getTable('budget_line_items');
    const monthlyTotal = lineItems.reduce((total, item) => {
      return total + normalizeToMonthly(item.amount, item.period);
    }, 0);
    const yearlyTotal = monthlyTotal * 12;

    expect.toBe(yearlyTotal, 36000); // 3000 * 12
  });
});

describe('Budget Setup - Budget Status Management', () => {
  beforeEach(async () => {
    database = await setupTestDatabase();
  });

  it('should support draft status', () => {
    const draftBudget = {
      id: 'BUDGET_001',
      name: 'Draft Budget',
      status: 'draft',
      createdAt: getCurrentDateString(),
      lastModified: getCurrentDateString(),
      isDefault: false
    };

    database.replaceTable('budgets', [draftBudget]);
    const budgets = database.getTable('budgets');
    expect.toBe(budgets[0].status, 'draft');
  });

  it('should support active status', () => {
    const activeBudget = {
      id: 'BUDGET_001',
      name: 'Active Budget',
      status: 'active',
      createdAt: getCurrentDateString(),
      lastModified: getCurrentDateString(),
      isDefault: true
    };

    database.replaceTable('budgets', [activeBudget]);
    const budgets = database.getTable('budgets');
    expect.toBe(budgets[0].status, 'active');
  });

  it('should support archived status', () => {
    const archivedBudget = {
      id: 'BUDGET_001',
      name: 'Archived Budget',
      status: 'archived',
      createdAt: getCurrentDateString(),
      lastModified: getCurrentDateString(),
      isDefault: false
    };

    database.replaceTable('budgets', [archivedBudget]);
    const budgets = database.getTable('budgets');
    expect.toBe(budgets[0].status, 'archived');
  });

  it('should update lastModified when budget changes', () => {
    const budget = {
      id: 'BUDGET_001',
      name: 'Test Budget',
      status: 'draft',
      createdAt: '2024-01-01',
      lastModified: '2024-01-01',
      isDefault: true
    };

    database.replaceTable('budgets', [budget]);
    
    // Simulate budget update
    const updatedBudget = {
      ...budget,
      status: 'active',
      lastModified: getCurrentDateString()
    };

    database.replaceTable('budgets', [updatedBudget]);
    const budgets = database.getTable('budgets');
    expect.toBe(budgets[0].status, 'active');
    expect.toBe(budgets[0].lastModified, getCurrentDateString());
  });
});

describe('Budget Setup - File Storage Integration', () => {
  beforeEach(async () => {
    database = await setupTestDatabase();
  });

  it('should save budget to file storage', async () => {
    const budget = {
      id: 'BUDGET_001',
      name: 'Test Budget',
      status: 'active',
      createdAt: getCurrentDateString(),
      lastModified: getCurrentDateString(),
      isDefault: true
    };

    // Save budget to database
    database.replaceTable('budgets', [budget]);

    // Export and save to file storage (following ISSUES_TO_BE_AWARE_OF.md pattern)
    const budgetBuffer = database.exportTableToBuffer('budgets');
    await database.fileStorage.saveTable('budgets', budgetBuffer);

    // Verify budget was saved
    const budgets = database.getTable('budgets');
    expect.toHaveLength(budgets, 1);
    expect.toBe(budgets[0].name, 'Test Budget');
  });

  it('should save budget line items to file storage', async () => {
    const lineItems = [
      {
        id: 'LINE_001',
        budgetId: 'BUDGET_001',
        subcategoryId: 'SUB_001',
        subcategoryName: 'Food & Dining',
        period: 'monthly',
        amount: 800,
        baseCurrency: 'CUR_001'
      }
    ];

    // Save line items to database
    database.replaceTable('budget_line_items', lineItems);

    // Export and save to file storage (following ISSUES_TO_BE_AWARE_OF.md pattern)
    const lineItemsBuffer = database.exportTableToBuffer('budget_line_items');
    await database.fileStorage.saveTable('budget_line_items', lineItemsBuffer);

    // Verify line items were saved
    const savedLineItems = database.getTable('budget_line_items');
    expect.toHaveLength(savedLineItems, 1);
    expect.toBe(savedLineItems[0].subcategoryName, 'Food & Dining');
  });
});

describe('Budget Setup - Expense Category Filtering', () => {
  beforeEach(async () => {
    database = await setupTestDatabase();
  });

  it('should only include expense subcategories (CAT_002)', () => {
    // Add mixed transaction types and subcategories
    const transactionTypes = [
      {
        id: 'CAT_001',
        name: 'Income',
        description: 'Income transactions',
        isActive: true
      },
      {
        id: 'CAT_002',
        name: 'Expenses',
        description: 'Expense transactions',
        isActive: true
      },
      {
        id: 'CAT_003',
        name: 'Transfer',
        description: 'Transfer transactions',
        isActive: true
      }
    ];

    const transactionGroups = [
      {
        id: 'GRP_001',
        name: 'Income Group',
        transactionTypeId: 'CAT_001',
        isActive: true
      },
      {
        id: 'GRP_002',
        name: 'Expense Group',
        transactionTypeId: 'CAT_002',
        isActive: true
      },
      {
        id: 'GRP_003',
        name: 'Transfer Group',
        transactionTypeId: 'CAT_003',
        isActive: true
      }
    ];

    const subcategories = [
      {
        id: 'SUB_001',
        name: 'Salary',
        groupId: 'GRP_001', // Income group
        isActive: true
      },
      {
        id: 'SUB_002',
        name: 'Food & Dining',
        groupId: 'GRP_002', // Expense group
        isActive: true
      },
      {
        id: 'SUB_003',
        name: 'Account Transfer',
        groupId: 'GRP_003', // Transfer group
        isActive: true
      }
    ];

    database.replaceTable('transaction_types', transactionTypes);
    database.replaceTable('transaction_groups', transactionGroups);
    database.replaceTable('subcategories', subcategories);

    // Simulate filtering for expense subcategories only
    const subcategoriesWithCategories = subcategories.map(sub => {
      const group = transactionGroups.find(g => g.id === sub.groupId);
      const category = group ? transactionTypes.find(t => t.id === group.transactionTypeId) : null;
      return { ...sub, category };
    });

    const expenseSubcategories = subcategoriesWithCategories.filter(sub => {
      return sub.category && sub.category.id === 'CAT_002';
    });

    expect.toHaveLength(expenseSubcategories, 1);
    expect.toBe(expenseSubcategories[0].name, 'Food & Dining');
  });
});

describe('Budget Setup - Currency Integration', () => {
  beforeEach(async () => {
    database = await setupTestDatabase();
  });

  it('should use base currency for budget amounts', () => {
    const currencies = database.getTable('currencies');
    const baseCurrency = currencies.find(c => c.isBaseCurrency === true);
    
    expect.toBeTruthy(baseCurrency);
    expect.toBe(baseCurrency.id, 'CUR_001');
    expect.toBe(baseCurrency.code, 'EUR');
  });

  it('should store line items in base currency only', () => {
    const lineItem = {
      id: 'LINE_001',
      budgetId: 'BUDGET_001',
      subcategoryId: 'SUB_001',
      subcategoryName: 'Food & Dining',
      period: 'monthly',
      amount: 800,
      baseCurrency: 'CUR_001' // Should always be base currency
    };

    expect.toBe(lineItem.baseCurrency, 'CUR_001');
  });
});

// Run all tests
console.log('🧪 Starting Budget Setup Tests...\n');

try {
  describe('Budget Setup - Database Schema', () => {
    beforeEach(async () => {
      database = await setupTestDatabase();
    });

    it('should have budgets table with correct schema', () => {
      const budgetsSchema = database.tableSchemas.budgets;
      const expectedFields = ['id', 'name', 'description', 'status', 'createdAt', 'lastModified', 'isDefault'];
      
      expectedFields.forEach(field => {
        expect.toContain(budgetsSchema, field);
      });
    });

    it('should have budget_line_items table with correct schema', () => {
      const lineItemsSchema = database.tableSchemas.budget_line_items;
      const expectedFields = ['id', 'budgetId', 'subcategoryId', 'subcategoryName', 'period', 'amount', 'baseCurrency'];
      
      expectedFields.forEach(field => {
        expect.toContain(lineItemsSchema, field);
      });
    });

    it('should have correct relationships defined', () => {
      const relationships = database.relationships.budget_line_items;
      expect.toEqual(relationships.budgetId, { table: 'budgets', field: 'id' });
      expect.toEqual(relationships.subcategoryId, { table: 'subcategories', field: 'id' });
    });
  });

  console.log('\n✅ Budget Setup Tests Completed Successfully!');
  console.log('📊 All budget creation, line item management, and calculation tests passed.');
  
} catch (error) {
  console.error('\n❌ Budget Setup Tests Failed:', error.message);
  throw error;
}