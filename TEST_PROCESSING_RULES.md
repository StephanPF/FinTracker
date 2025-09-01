# Processing Rules Storage Test

This document describes how to test the newly implemented processing rules storage functionality.

## Test Steps

### 1. Database Structure Test
Open Developer Tools Console and run:
```javascript
// Check if processing_rules table exists
console.log('Processing rules table:', window.database?.tables?.processing_rules);
console.log('Processing rules schema:', window.database?.tableSchemas?.processing_rules);
```

### 2. Basic CRUD Operations Test

#### Create a Test Bank Configuration
```javascript
const testBankConfig = {
  id: 'test_bank_001',
  name: 'Test Bank',
  type: 'Test',
  fieldMapping: {
    date: 'Date',
    description: 'Description',
    amount: 'Amount'
  },
  settings: {
    dateFormat: 'MM/DD/YYYY',
    currency: 'USD'
  }
};

// Add bank configuration
const bankConfig = await window.context.addBankConfiguration(testBankConfig);
console.log('Added bank config:', bankConfig);
```

#### Create Test Processing Rules
```javascript
const testRule1 = {
  name: 'Convert negative amounts to positive',
  type: 'FIELD_TRANSFORM',
  active: true,
  ruleOrder: 1,
  conditions: [
    {
      field: 'amount',
      operator: 'lessThan',
      value: '0',
      dataType: 'number'
    }
  ],
  conditionLogic: 'ALL',
  actions: [
    {
      type: 'TRANSFORM_FIELD',
      field: 'amount',
      transform: 'absolute',
      targetField: 'amount'
    },
    {
      type: 'SET_FIELD',
      field: 'transactionType',
      value: 'Expenses'
    }
  ]
};

// Add rule
const rule1 = await window.context.addProcessingRule('test_bank_001', testRule1);
console.log('Added rule 1:', rule1);

const testRule2 = {
  name: 'Categorize groceries',
  type: 'FIELD_VALUE_SET',
  active: true,
  ruleOrder: 2,
  conditions: [
    {
      field: 'description',
      operator: 'contains',
      value: 'grocery',
      caseSensitive: false
    }
  ],
  conditionLogic: 'ANY',
  actions: [
    {
      type: 'SET_FIELD',
      field: 'transactionType',
      value: 'Expenses'
    },
    {
      type: 'SET_FIELD',
      field: 'transactionGroup',
      value: 'Food & Dining'
    }
  ]
};

// Add rule
const rule2 = await window.context.addProcessingRule('test_bank_001', testRule2);
console.log('Added rule 2:', rule2);
```

#### Test Reading Rules
```javascript
// Load rules for bank config
const rules = await window.context.loadProcessingRules('test_bank_001');
console.log('Loaded rules:', rules);

// Get rules from state
const stateRules = window.context.getProcessingRules('test_bank_001');
console.log('Rules from state:', stateRules);

// Get active rules only
const activeRules = window.context.getActiveProcessingRules('test_bank_001');
console.log('Active rules:', activeRules);
```

#### Test Updating Rules
```javascript
const updatedRule = await window.context.updateProcessingRule(rule1.id, {
  ...rule1,
  name: 'Convert negative amounts to positive (Updated)',
  active: false
}, 'test_bank_001');
console.log('Updated rule:', updatedRule);
```

#### Test Toggle Active
```javascript
const toggledRule = await window.context.toggleProcessingRuleActive(rule1.id, true, 'test_bank_001');
console.log('Toggled rule:', toggledRule);
```

#### Test Update Order
```javascript
const reorderedRule = await window.context.updateProcessingRuleOrder(rule2.id, 0, 'test_bank_001');
console.log('Reordered rule:', reorderedRule);
```

#### Test Delete Rules
```javascript
const deletedRule = await window.context.deleteProcessingRule(rule1.id, 'test_bank_001');
console.log('Deleted rule:', deletedRule);

// Verify deletion
const remainingRules = window.context.getProcessingRules('test_bank_001');
console.log('Remaining rules:', remainingRules);
```

### 3. File Storage Test
Check if the processing_rules table is saved to Excel file:
```javascript
// Check if table is in workbook
console.log('Processing rules workbook:', window.database?.workbooks?.processing_rules);

// Export and check buffer
const buffer = window.database?.exportTableToBuffer('processing_rules');
console.log('Processing rules buffer size:', buffer?.byteLength);
```

### 4. Relationship Test
Test foreign key relationship with bank_configurations:
```javascript
// Try to create rule with invalid bank config ID (should work in Excel-based system)
const invalidRule = {
  name: 'Test Invalid FK',
  type: 'FIELD_VALUE_SET',
  bankConfigId: 'nonexistent_bank',
  conditions: [],
  actions: []
};

try {
  const rule = await window.context.addProcessingRule('nonexistent_bank', invalidRule);
  console.log('Rule with invalid FK created (expected in Excel system):', rule);
} catch (error) {
  console.log('FK validation error:', error);
}
```

## Expected Results

1. ✅ Processing rules table should exist in database.tables
2. ✅ Rules should be created, updated, and deleted successfully
3. ✅ Rules should be sorted by ruleOrder
4. ✅ Active/inactive toggle should work
5. ✅ Rules should be saved to Excel file in file storage
6. ✅ Rules should be loaded correctly from database
7. ✅ Local state should update after each operation

## Test Data Structure Verification

Each rule should have this structure:
```javascript
{
  id: 'rule_[timestamp]_[random]',
  bankConfigId: 'test_bank_001',
  name: 'Rule Name',
  type: 'FIELD_TRANSFORM' | 'FIELD_VALUE_SET' | 'ROW_IGNORE',
  active: true | false,
  ruleOrder: number,
  conditions: [
    {
      field: 'string',
      operator: 'string',
      value: 'string',
      dataType: 'string' | 'number' | 'date',
      caseSensitive: boolean
    }
  ],
  conditionLogic: 'ALL' | 'ANY',
  actions: [
    {
      type: 'SET_FIELD' | 'TRANSFORM_FIELD',
      field: 'string',
      value: 'string', // for SET_FIELD
      transform: 'string', // for TRANSFORM_FIELD
      targetField: 'string' // for TRANSFORM_FIELD
    }
  ],
  createdAt: 'ISO string',
  updatedAt: 'ISO string'
}
```

## Troubleshooting

### If tests fail:
1. Check if `window.database` and `window.context` are available
2. Verify database initialization completed
3. Check browser console for errors
4. Ensure file storage permissions are granted
5. Verify RelationalDatabase class has processing rules methods

### Common issues:
- **"processing_rules table not found"**: Database not initialized properly
- **"Cannot read properties of undefined"**: Context not loaded or database not set
- **JSON parse errors**: Data corruption in storage, reinitialize database
- **File save errors**: Check file system permissions

## Cleanup
After testing, clean up test data:
```javascript
// Delete test bank configuration (will cascade delete rules in real DB)
await window.context.removeBankConfiguration('test_bank_001');
```