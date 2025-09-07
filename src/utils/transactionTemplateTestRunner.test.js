import RelationalDatabase from './relationalDatabase.js';

export const createTransactionTemplateTests = () => {
  // Updated: Fixed method name from getCurrencies to getTable('currencies')
  const tests = [];

  // Helper function to create a fresh database with test data
  const setupTestDatabase = () => {
    const database = new RelationalDatabase();
    database.createNewDatabase('en');
    
    // Use existing default currencies (created by createNewDatabase)
    const currencies = database.getTable('currencies');
    const currency1 = currencies.find(c => c.code === 'USD'); // Should be CUR_002
    const currency2 = currencies.find(c => c.code === 'EUR'); // Should be CUR_001
    
    if (!currency1 || !currency2) {
      throw new Error(`Missing default currencies. Found: ${currencies.map(c => c.code).join(', ')}`);
    }
    
    // Add test accounts
    const account1 = database.addAccount({
      name: 'Checking Account',
      accountType: { type: 'Asset', subtype: 'Current Asset' },
      currencyId: currency1.id,
      initialBalance: 1000,
      isActive: true
    });
    
    const account2 = database.addAccount({
      name: 'Savings Account',
      accountType: { type: 'Asset', subtype: 'Current Asset' },
      currencyId: currency1.id,
      initialBalance: 5000,
      isActive: true
    });
    
    // Add test categories
    const category = database.addCategory({
      name: 'Utilities',
      icon: '⚡',
      color: '#FF6B6B',
      isActive: true
    });
    
    const subcategory = database.addSubcategory({
      categoryId: category.id,
      name: 'Electricity',
      isActive: true
    });
    
    // Add test transaction group
    const group = database.addTransactionGroup({
      name: 'Monthly Bills',
      description: 'Recurring monthly expenses',
      isActive: true
    });
    
    return {
      database,
      testData: {
        currencyId1: currency1.id,
        currencyId2: currency2.id,
        accountId1: account1.id,
        accountId2: account2.id,
        subcategoryId: subcategory.id,
        groupId: group.id
      }
    };
  };

  // Template CRUD Tests
  tests.push({
    id: 'template-crud-001',
    suite: 'Transaction Templates',
    category: 'CRUD Operations',
    name: 'Create New Transaction Template',
    description: 'Should successfully create a new transaction template with all fields',
    expectedBehavior: 'Template is created with correct data and auto-generated ID',
    testFunction: () => {
      const { database, testData } = setupTestDatabase();
      
      const templateData = {
        name: 'Monthly Electric Bill',
        description: 'Recurring electricity payment',
        amount: 150.00,
        accountId: testData.accountId1,
        destinationAccountId: testData.accountId2,
        currencyId: testData.currencyId1,
        subcategoryId: testData.subcategoryId,
        groupId: testData.groupId,
        payee: 'Electric Company',
        payer: 'John Doe',
        reference: 'ELEC-001',
        notes: 'Monthly electricity bill',
        tag: 'utilities'
      };

      const template = database.addTransactionTemplate(templateData);
      
      expect.toBeDefined(template);
      expect.toBe(template.name, 'Monthly Electric Bill');
      expect.toBe(template.description, 'Recurring electricity payment');
      expect.toBe(template.amount, 150.00);
      expect.toBe(template.accountId, testData.accountId1);
      expect.toBe(template.currencyId, testData.currencyId1);
      expect.toBe(template.usageCount, 0);
      expect.toBe(template.isActive, true);
      expect.toBeDefined(template.createdAt);
      expect.toContain(template.id, 'TT_');
    }
  });

  tests.push({
    id: 'template-crud-002',
    suite: 'Transaction Templates',
    category: 'CRUD Operations',
    name: 'Create Minimal Template',
    description: 'Should create template with only required fields',
    expectedBehavior: 'Template is created with minimal data and default values',
    testFunction: () => {
      const { database } = setupTestDatabase();
      
      const templateData = {
        name: 'Simple Template'
      };

      const template = database.addTransactionTemplate(templateData);
      
      expect.toBeDefined(template);
      expect.toBe(template.name, 'Simple Template');
      expect.toBe(template.description, '');
      expect.toBe(template.amount, '');
      expect.toBe(template.usageCount, 0);
      expect.toBe(template.isActive, true);
    }
  });

  tests.push({
    id: 'template-crud-003',
    suite: 'Transaction Templates',
    category: 'CRUD Operations',
    name: 'Retrieve All Templates',
    description: 'Should retrieve all templates including active/inactive',
    expectedBehavior: 'Returns correct number of active and total templates',
    testFunction: () => {
      const { database } = setupTestDatabase();
      
      database.addTransactionTemplate({ name: 'Template 1' });
      database.addTransactionTemplate({ name: 'Template 2' });
      database.addTransactionTemplate({ name: 'Template 3', isActive: false });

      const allTemplates = database.getTransactionTemplates();
      const activeTemplates = database.getActiveTransactionTemplates();

      expect.toBe(allTemplates.length, 3);
      expect.toBe(activeTemplates.length, 2);
      expect.toBe(activeTemplates.every(t => t.isActive), true);
    }
  });

  tests.push({
    id: 'template-crud-004',
    suite: 'Transaction Templates',
    category: 'CRUD Operations',
    name: 'Update Template',
    description: 'Should successfully update existing template',
    expectedBehavior: 'Template is updated with new values while preserving ID',
    testFunction: () => {
      const { database } = setupTestDatabase();
      
      const template = database.addTransactionTemplate({
        name: 'Original Name',
        amount: 100
      });

      const updatedTemplate = database.updateTransactionTemplate(template.id, {
        name: 'Updated Name',
        amount: 200,
        description: 'Updated description'
      });

      expect.toBe(updatedTemplate.name, 'Updated Name');
      expect.toBe(updatedTemplate.amount, 200);
      expect.toBe(updatedTemplate.description, 'Updated description');
      expect.toBe(updatedTemplate.id, template.id);
    }
  });

  tests.push({
    id: 'template-crud-005',
    suite: 'Transaction Templates',
    category: 'CRUD Operations',
    name: 'Delete Template',
    description: 'Should hard delete template (remove from database)',
    expectedBehavior: 'Template is removed from database and deleted object is returned',
    testFunction: () => {
      const { database } = setupTestDatabase();
      
      const template = database.addTransactionTemplate({
        name: 'To Delete'
      });

      expect.toBe(database.getTransactionTemplates().length, 1);
      
      const deletedTemplate = database.deleteTransactionTemplate(template.id);
      
      expect.toBeDefined(deletedTemplate);
      expect.toBe(deletedTemplate.id, template.id);
      expect.toBe(deletedTemplate.name, 'To Delete');
      expect.toBe(database.getTransactionTemplates().length, 0);
    }
  });

  // Usage Tracking Tests
  tests.push({
    id: 'template-usage-001',
    suite: 'Transaction Templates',
    category: 'Usage Tracking',
    name: 'Track Template Usage',
    description: 'Should increment usage count when template is used',
    expectedBehavior: 'Usage count increases and lastUsed is updated',
    testFunction: () => {
      const { database } = setupTestDatabase();
      
      const template = database.addTransactionTemplate({
        name: 'Usage Test Template'
      });

      expect.toBe(template.usageCount, 0);
      expect.toBe(template.lastUsed, null);

      const usedTemplate = database.useTransactionTemplate(template.id);
      
      expect.toBe(usedTemplate.usageCount, 1);
      expect.toBeDefined(usedTemplate.lastUsed);
    }
  });

  tests.push({
    id: 'template-usage-002',
    suite: 'Transaction Templates',
    category: 'Usage Tracking',
    name: 'Multiple Usage Increments',
    description: 'Should correctly track multiple uses of same template',
    expectedBehavior: 'Usage count increases with each use',
    testFunction: () => {
      const { database } = setupTestDatabase();
      
      const template = database.addTransactionTemplate({
        name: 'Multiple Usage Template'
      });

      database.useTransactionTemplate(template.id);
      database.useTransactionTemplate(template.id);
      const finalTemplate = database.useTransactionTemplate(template.id);
      
      expect.toBe(finalTemplate.usageCount, 3);
    }
  });

  // Search and Filtering Tests
  tests.push({
    id: 'template-search-001',
    suite: 'Transaction Templates',
    category: 'Search & Filter',
    name: 'Find Template by Name',
    description: 'Should find template by exact name match',
    expectedBehavior: 'Returns correct template or null if not found',
    testFunction: () => {
      const { database } = setupTestDatabase();
      
      database.addTransactionTemplate({
        name: 'Electric Bill',
        description: 'Monthly electricity',
      });

      const template = database.getTransactionTemplateByName('Electric Bill');
      
      expect.toBeDefined(template);
      expect.toBe(template.name, 'Electric Bill');
      expect.toBe(template.description, 'Monthly electricity');
      
      const notFound = database.getTransactionTemplateByName('Non-existent');
      expect.toBeUndefined(notFound);
    }
  });

  tests.push({
    id: 'template-search-002',
    suite: 'Transaction Templates',
    category: 'Search & Filter',
    name: 'Sort by Usage Frequency',
    description: 'Should sort templates by usage count descending',
    expectedBehavior: 'Templates ordered by most used first',
    testFunction: () => {
      const { database } = setupTestDatabase();
      
      database.addTransactionTemplate({ name: 'Electric Bill' });
      database.addTransactionTemplate({ name: 'Gas Bill' });
      database.addTransactionTemplate({ name: 'Grocery Shopping' });
      
      // Use templates different amounts
      const templates = database.getActiveTransactionTemplates();
      database.useTransactionTemplate(templates[0].id); // Electric - 3 uses
      database.useTransactionTemplate(templates[0].id);
      database.useTransactionTemplate(templates[0].id);
      
      database.useTransactionTemplate(templates[1].id); // Gas - 1 use
      // Grocery - 0 uses
      
      const sortedTemplates = database.getActiveTransactionTemplates();
      
      expect.toBe(sortedTemplates[0].name, 'Electric Bill');
      expect.toBe(sortedTemplates[0].usageCount, 3);
      expect.toBe(sortedTemplates[1].name, 'Gas Bill');
      expect.toBe(sortedTemplates[1].usageCount, 1);
      expect.toBe(sortedTemplates[2].name, 'Grocery Shopping');
      expect.toBe(sortedTemplates[2].usageCount, 0);
    }
  });

  // Validation Tests
  tests.push({
    id: 'template-validation-001',
    suite: 'Transaction Templates',
    category: 'Data Validation',
    name: 'Handle Missing Template Name',
    description: 'Should handle template creation without name (allows undefined name)',
    expectedBehavior: 'Template is created with undefined name',
    testFunction: () => {
      const { database } = setupTestDatabase();
      
      const template = database.addTransactionTemplate({
        description: 'No name template'
      });
      
      expect.toBeDefined(template);
      expect.toBeUndefined(template.name);
      expect.toBe(template.description, 'No name template');
    }
  });

  tests.push({
    id: 'template-validation-002',
    suite: 'Transaction Templates',
    category: 'Data Validation',
    name: 'Handle Empty String Values',
    description: 'Should accept empty strings as valid values',
    expectedBehavior: 'Empty strings are preserved as entered',
    testFunction: () => {
      const { database } = setupTestDatabase();
      
      const template = database.addTransactionTemplate({
        name: 'Empty Fields Template',
        description: '',
        payee: '',
        notes: ''
      });
      
      expect.toBe(template.description, '');
      expect.toBe(template.payee, '');
      expect.toBe(template.notes, '');
    }
  });

  // Integration Tests  
  tests.push({
    id: 'template-integration-001',
    suite: 'Transaction Templates',
    category: 'Entity References',
    name: 'Maintain Account References',
    description: 'Should maintain references to source and destination accounts',
    expectedBehavior: 'Account references are preserved and valid',
    testFunction: () => {
      const { database, testData } = setupTestDatabase();
      
      const template = database.addTransactionTemplate({
        name: 'Account Template',
        accountId: testData.accountId1,
        destinationAccountId: testData.accountId2
      });
      
      expect.toBe(template.accountId, testData.accountId1);
      expect.toBe(template.destinationAccountId, testData.accountId2);
      
      // Verify accounts exist
      const accounts = database.getTable('accounts');
      expect.toBeTruthy(accounts.find(a => a.id === testData.accountId1));
      expect.toBeTruthy(accounts.find(a => a.id === testData.accountId2));
    }
  });

  tests.push({
    id: 'template-integration-002',
    suite: 'Transaction Templates',
    category: 'Entity References',
    name: 'Maintain Category References',
    description: 'Should maintain references to categories and subcategories',
    expectedBehavior: 'Category references are preserved and valid',
    testFunction: () => {
      const { database, testData } = setupTestDatabase();
      
      const template = database.addTransactionTemplate({
        name: 'Category Template',
        subcategoryId: testData.subcategoryId
      });
      
      expect.toBe(template.subcategoryId, testData.subcategoryId);
      
      // Verify subcategory exists
      const subcategories = database.getSubcategories();
      expect.toBeTruthy(subcategories.find(s => s.id === testData.subcategoryId));
    }
  });

  // Edge Case Tests
  tests.push({
    id: 'template-edge-001',
    suite: 'Transaction Templates',
    category: 'Edge Cases',
    name: 'Handle Duplicate Names',
    description: 'Should allow multiple templates with same name',
    expectedBehavior: 'Duplicate names are permitted',
    testFunction: () => {
      const { database } = setupTestDatabase();
      
      database.addTransactionTemplate({ name: 'Duplicate Name' });
      const template2 = database.addTransactionTemplate({ name: 'Duplicate Name' });
      
      expect.toBeDefined(template2);
      expect.toBe(template2.name, 'Duplicate Name');
      expect.toBe(database.getActiveTransactionTemplates().length, 2);
    }
  });

  tests.push({
    id: 'template-edge-002',
    suite: 'Transaction Templates',
    category: 'Edge Cases',
    name: 'Handle Special Characters',
    description: 'Should handle special characters and unicode in template data',
    expectedBehavior: 'Special characters are preserved correctly',
    testFunction: () => {
      const { database } = setupTestDatabase();
      
      const template = database.addTransactionTemplate({
        name: 'Special: !@#$%^&*()',
        description: 'Unicode: 🎉💰🏦',
        payee: 'Company & Co.',
        notes: 'Multi\nline\nnotes'
      });
      
      expect.toContain(template.name, '!@#$%^&*()');
      expect.toContain(template.description, '🎉💰🏦');
      expect.toBe(template.payee, 'Company & Co.');
      expect.toContain(template.notes, '\n');
    }
  });

  // Performance Tests
  tests.push({
    id: 'template-performance-001',
    suite: 'Transaction Templates',
    category: 'Performance',
    name: 'Handle Large Number of Templates',
    description: 'Should efficiently create and retrieve many templates',
    expectedBehavior: 'Operations complete within reasonable time',
    testFunction: () => {
      const { database } = setupTestDatabase();
      
      const startTime = Date.now();
      
      // Create 100 templates (reduced from 1000 for browser testing)
      for (let i = 0; i < 100; i++) {
        database.addTransactionTemplate({
          name: `Template ${i}`,
          description: `Description ${i}`,
          amount: i * 10
        });
      }
      
      const createTime = Date.now() - startTime;
      expect.toBeLessThan(createTime, 5000); // Should complete within 5 seconds
      
      const retrieveStart = Date.now();
      const templates = database.getActiveTransactionTemplates();
      const retrieveTime = Date.now() - retrieveStart;
      
      expect.toBe(templates.length, 100);
      expect.toBeLessThan(retrieveTime, 1000); // Should retrieve within 1 second
    }
  });

  return tests;
};