import RelationalDatabase from './relationalDatabase.js';

describe('Transaction Template System Tests', () => {
  let database;
  let testCurrencyId1, testCurrencyId2;
  let testAccountId1, testAccountId2;
  let testSubcategoryId;
  let testGroupId;

  beforeEach(() => {
    database = new RelationalDatabase();
    database.createNewDatabase();
    
    // Add test currencies (each test gets fresh database so no conflicts)
    const currency1 = database.addCurrency({
      code: 'USD',
      name: 'US Dollar',
      symbol: '$',
      decimalPlaces: 2,
      isActive: true
    });
    testCurrencyId1 = currency1.id;
    
    const currency2 = database.addCurrency({
      code: 'EUR',
      name: 'Euro',
      symbol: '€',
      decimalPlaces: 2,
      isActive: true
    });
    testCurrencyId2 = currency2.id;
    
    // Add test accounts
    const account1 = database.addAccount({
      name: 'Checking Account',
      accountType: { type: 'Asset', subtype: 'Current Asset' },
      currencyId: testCurrencyId1,
      initialBalance: 1000,
      isActive: true
    });
    testAccountId1 = account1.id;
    
    const account2 = database.addAccount({
      name: 'Savings Account',
      accountType: { type: 'Asset', subtype: 'Current Asset' },
      currencyId: testCurrencyId1,
      initialBalance: 5000,
      isActive: true
    });
    testAccountId2 = account2.id;
    
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
    testSubcategoryId = subcategory.id;
    
    // Add test transaction group
    const group = database.addTransactionGroup({
      name: 'Monthly Bills',
      description: 'Recurring monthly expenses',
      isActive: true
    });
    testGroupId = group.id;
  });

  describe('Template CRUD Operations', () => {
    test('should create a new transaction template', () => {
      const templateData = {
        name: 'Monthly Electric Bill',
        description: 'Recurring electricity payment',
        amount: 150.00,
        accountId: testAccountId1,
        destinationAccountId: testAccountId2,
        currencyId: testCurrencyId1,
        subcategoryId: testSubcategoryId,
        groupId: testGroupId,
        payee: 'Electric Company',
        payer: 'John Doe',
        reference: 'ELEC-001',
        notes: 'Monthly electricity bill',
        tag: 'utilities'
      };

      const template = database.addTransactionTemplate(templateData);
      
      expect(template).toBeDefined();
      expect(template.id).toMatch(/^TT-\d+$/);
      expect(template.name).toBe('Monthly Electric Bill');
      expect(template.description).toBe('Recurring electricity payment');
      expect(template.amount).toBe(150.00);
      expect(template.accountId).toBe(testAccountId1);
      expect(template.destinationAccountId).toBe(testAccountId2);
      expect(template.currencyId).toBe(testCurrencyId1);
      expect(template.subcategoryId).toBe(testSubcategoryId);
      expect(template.groupId).toBe(testGroupId);
      expect(template.payee).toBe('Electric Company');
      expect(template.payer).toBe('John Doe');
      expect(template.reference).toBe('ELEC-001');
      expect(template.notes).toBe('Monthly electricity bill');
      expect(template.tag).toBe('utilities');
      expect(template.usageCount).toBe(0);
      expect(template.isActive).toBe(true);
      expect(template.createdAt).toBeDefined();
    });

    test('should create minimal template with only required fields', () => {
      const templateData = {
        name: 'Simple Template'
      };

      const template = database.addTransactionTemplate(templateData);
      
      expect(template).toBeDefined();
      expect(template.id).toMatch(/^TT-\d+$/);
      expect(template.name).toBe('Simple Template');
      expect(template.description).toBe('');
      expect(template.amount).toBe('');
      expect(template.usageCount).toBe(0);
      expect(template.isActive).toBe(true);
    });

    test('should retrieve all transaction templates', () => {
      database.addTransactionTemplate({ name: 'Template 1' });
      database.addTransactionTemplate({ name: 'Template 2' });
      database.addTransactionTemplate({ name: 'Template 3', isActive: false });

      const allTemplates = database.getTransactionTemplates();
      const activeTemplates = database.getActiveTransactionTemplates();

      expect(allTemplates).toHaveLength(3);
      expect(activeTemplates).toHaveLength(2);
      expect(activeTemplates.every(t => t.isActive)).toBe(true);
    });

    test('should update transaction template', () => {
      const template = database.addTransactionTemplate({
        name: 'Original Name',
        amount: 100
      });

      const updatedTemplate = database.updateTransactionTemplate(template.id, {
        name: 'Updated Name',
        amount: 200,
        description: 'Updated description'
      });

      expect(updatedTemplate.name).toBe('Updated Name');
      expect(updatedTemplate.amount).toBe(200);
      expect(updatedTemplate.description).toBe('Updated description');
      expect(updatedTemplate.id).toBe(template.id);
    });

    test('should delete transaction template', () => {
      const template = database.addTransactionTemplate({
        name: 'To Delete'
      });

      expect(database.getTransactionTemplates()).toHaveLength(1);
      
      const deleted = database.deleteTransactionTemplate(template.id);
      
      expect(deleted).toBe(true);
      expect(database.getActiveTransactionTemplates()).toHaveLength(0);
      expect(database.getTransactionTemplates()).toHaveLength(1);
      expect(database.getTransactionTemplates()[0].isActive).toBe(false);
    });

    test('should handle deleting non-existent template', () => {
      const result = database.deleteTransactionTemplate('TT-999');
      expect(result).toBe(false);
    });
  });

  describe('Template Usage Tracking', () => {
    test('should increment usage count when template is used', () => {
      const template = database.addTransactionTemplate({
        name: 'Usage Test Template'
      });

      expect(template.usageCount).toBe(0);
      expect(template.lastUsed).toBeUndefined();

      const usedTemplate = database.useTransactionTemplate(template.id);
      
      expect(usedTemplate.usageCount).toBe(1);
      expect(usedTemplate.lastUsed).toBeDefined();
      expect(new Date(usedTemplate.lastUsed)).toBeInstanceOf(Date);
    });

    test('should increment usage count multiple times', () => {
      const template = database.addTransactionTemplate({
        name: 'Multiple Usage Template'
      });

      database.useTransactionTemplate(template.id);
      database.useTransactionTemplate(template.id);
      const finalTemplate = database.useTransactionTemplate(template.id);
      
      expect(finalTemplate.usageCount).toBe(3);
    });

    test('should handle using non-existent template', () => {
      const result = database.useTransactionTemplate('TT-999');
      expect(result).toBeNull();
    });
  });

  describe('Template Search and Filtering', () => {
    beforeEach(() => {
      database.addTransactionTemplate({
        name: 'Electric Bill',
        description: 'Monthly electricity',
        payee: 'Power Company',
        tag: 'utilities'
      });
      
      database.addTransactionTemplate({
        name: 'Gas Bill',
        description: 'Monthly gas',
        payee: 'Gas Company',
        tag: 'utilities'
      });
      
      database.addTransactionTemplate({
        name: 'Grocery Shopping',
        description: 'Weekly groceries',
        payee: 'Supermarket',
        tag: 'food'
      });
    });

    test('should find template by name', () => {
      const template = database.getTransactionTemplateByName('Electric Bill');
      
      expect(template).toBeDefined();
      expect(template.name).toBe('Electric Bill');
      expect(template.description).toBe('Monthly electricity');
    });

    test('should handle case-insensitive name search', () => {
      const template = database.getTransactionTemplateByName('electric bill');
      
      expect(template).toBeDefined();
      expect(template.name).toBe('Electric Bill');
    });

    test('should return null for non-existent template name', () => {
      const template = database.getTransactionTemplateByName('Non-existent');
      expect(template).toBeNull();
    });

    test('should sort templates by usage frequency', () => {
      // Use templates different number of times
      database.useTransactionTemplate('TT-1'); // Electric Bill - 1 use
      database.useTransactionTemplate('TT-1');
      database.useTransactionTemplate('TT-1'); // Electric Bill - 3 uses total
      
      database.useTransactionTemplate('TT-2'); // Gas Bill - 1 use
      
      // TT-3 (Grocery Shopping) - 0 uses
      
      const templates = database.getActiveTransactionTemplates();
      
      // Should be sorted by usage count (descending)
      expect(templates[0].name).toBe('Electric Bill');
      expect(templates[0].usageCount).toBe(3);
      expect(templates[1].name).toBe('Gas Bill');
      expect(templates[1].usageCount).toBe(1);
      expect(templates[2].name).toBe('Grocery Shopping');
      expect(templates[2].usageCount).toBe(0);
    });
  });

  describe('Template Data Validation', () => {
    test('should require template name', () => {
      expect(() => {
        database.addTransactionTemplate({
          description: 'No name template'
        });
      }).toThrow();
    });

    test('should handle empty strings as valid values', () => {
      const template = database.addTransactionTemplate({
        name: 'Empty Fields Template',
        description: '',
        payee: '',
        notes: ''
      });
      
      expect(template.description).toBe('');
      expect(template.payee).toBe('');
      expect(template.notes).toBe('');
    });

    test('should handle numeric amount validation', () => {
      const template1 = database.addTransactionTemplate({
        name: 'Valid Amount',
        amount: 123.45
      });
      
      const template2 = database.addTransactionTemplate({
        name: 'String Amount',
        amount: '678.90'
      });
      
      expect(template1.amount).toBe(123.45);
      expect(template2.amount).toBe('678.90'); // Should preserve type as entered
    });
  });

  describe('Template Integration with Related Entities', () => {
    test('should maintain references to accounts', () => {
      const template = database.addTransactionTemplate({
        name: 'Account Template',
        accountId: 'ACC-1',
        destinationAccountId: 'ACC-2'
      });
      
      expect(template.accountId).toBe('ACC-1');
      expect(template.destinationAccountId).toBe('ACC-2');
      
      // Verify accounts exist
      const accounts = database.getAccounts();
      expect(accounts.find(a => a.id === 'ACC-1')).toBeDefined();
      expect(accounts.find(a => a.id === 'ACC-2')).toBeDefined();
    });

    test('should maintain references to categories and subcategories', () => {
      const template = database.addTransactionTemplate({
        name: 'Category Template',
        subcategoryId: 'SUB-1'
      });
      
      expect(template.subcategoryId).toBe('SUB-1');
      
      // Verify subcategory exists
      const subcategories = database.getSubcategories();
      expect(subcategories.find(s => s.id === 'SUB-1')).toBeDefined();
    });

    test('should maintain references to transaction groups', () => {
      const template = database.addTransactionTemplate({
        name: 'Group Template',
        groupId: 'TG-1'
      });
      
      expect(template.groupId).toBe('TG-1');
      
      // Verify transaction group exists
      const groups = database.getTransactionGroups();
      expect(groups.find(g => g.id === 'TG-1')).toBeDefined();
    });

    test('should handle references to non-existent entities', () => {
      // Should not throw error for non-existent references
      const template = database.addTransactionTemplate({
        name: 'Invalid References',
        accountId: 'ACC-999',
        subcategoryId: 'SUB-999',
        groupId: 'TG-999'
      });
      
      expect(template.accountId).toBe('ACC-999');
      expect(template.subcategoryId).toBe('SUB-999');
      expect(template.groupId).toBe('TG-999');
    });
  });

  describe('Template Edge Cases', () => {
    test('should handle duplicate template names', () => {
      database.addTransactionTemplate({ name: 'Duplicate Name' });
      
      // Should allow duplicate names
      const template2 = database.addTransactionTemplate({ name: 'Duplicate Name' });
      
      expect(template2).toBeDefined();
      expect(template2.name).toBe('Duplicate Name');
      expect(database.getActiveTransactionTemplates()).toHaveLength(2);
    });

    test('should handle very long template names', () => {
      const longName = 'A'.repeat(1000);
      const template = database.addTransactionTemplate({ name: longName });
      
      expect(template.name).toBe(longName);
      expect(template.name.length).toBe(1000);
    });

    test('should handle special characters in template data', () => {
      const template = database.addTransactionTemplate({
        name: 'Special Chars: !@#$%^&*()_+{}|:"<>?[]\\;\',./',
        description: 'Unicode: 🎉💰🏦📊',
        payee: 'Company & Co.',
        notes: 'Multi\nline\nnotes'
      });
      
      expect(template.name).toContain('!@#$%^&*()');
      expect(template.description).toContain('🎉💰🏦📊');
      expect(template.payee).toBe('Company & Co.');
      expect(template.notes).toContain('\n');
    });

    test('should maintain data integrity during updates', () => {
      const template = database.addTransactionTemplate({
        name: 'Original',
        amount: 100,
        usageCount: 5,
        isActive: true
      });
      
      const originalId = template.id;
      const originalCreatedAt = template.createdAt;
      
      database.updateTransactionTemplate(template.id, {
        name: 'Updated',
        amount: 200
      });
      
      const updated = database.getTransactionTemplates().find(t => t.id === originalId);
      
      expect(updated.id).toBe(originalId);
      expect(updated.createdAt).toBe(originalCreatedAt);
      expect(updated.usageCount).toBe(5); // Should preserve usage count
      expect(updated.isActive).toBe(true); // Should preserve active status
      expect(updated.name).toBe('Updated');
      expect(updated.amount).toBe(200);
    });
  });

  describe('Performance and Memory Tests', () => {
    test('should handle large number of templates efficiently', () => {
      const startTime = Date.now();
      
      // Create 1000 templates
      for (let i = 0; i < 1000; i++) {
        database.addTransactionTemplate({
          name: `Template ${i}`,
          description: `Description ${i}`,
          amount: i * 10
        });
      }
      
      const createTime = Date.now() - startTime;
      expect(createTime).toBeLessThan(5000); // Should complete within 5 seconds
      
      const retrieveStart = Date.now();
      const templates = database.getActiveTransactionTemplates();
      const retrieveTime = Date.now() - retrieveStart;
      
      expect(templates).toHaveLength(1000);
      expect(retrieveTime).toBeLessThan(1000); // Should retrieve within 1 second
    });

    test('should handle frequent usage tracking updates', () => {
      const template = database.addTransactionTemplate({
        name: 'Frequent Use Template'
      });
      
      const startTime = Date.now();
      
      // Use template 100 times
      for (let i = 0; i < 100; i++) {
        database.useTransactionTemplate(template.id);
      }
      
      const updateTime = Date.now() - startTime;
      expect(updateTime).toBeLessThan(2000); // Should complete within 2 seconds
      
      const finalTemplate = database.getTransactionTemplates().find(t => t.id === template.id);
      expect(finalTemplate.usageCount).toBe(100);
    });
  });
});