# Rule-Based Processing System Proposal

## Overview

This document outlines the design and implementation approach for adding rule-based processing capabilities to the existing Bank Configuration system. This feature will allow users to create intelligent rules that automatically process CSV transactions during import, including auto-categorization, field value setting, and row filtering.

---

## Current System Analysis

The existing bank configuration system has:
- **Field Mapping**: Maps CSV columns to system fields (17 available fields)
- **Advanced Settings**: Date format, currency, CSV delimiter, amount handling
- **Static Configuration**: One-time setup per bank, no conditional logic

**Limitation**: All processing is manual during the transaction review phase, requiring users to individually edit each transaction.

---

## Proposed Rule Engine Architecture

### 1. Rule Types

```javascript
const RULE_TYPES = [
  {
    type: 'FIELD_VALUE_SET',
    label: 'Set Field Value',
    description: 'Automatically set a field value when conditions are met'
  },
  {
    type: 'ROW_IGNORE',
    label: 'Ignore Row',
    description: 'Skip importing rows that match conditions'
  },
  {
    type: 'FIELD_TRANSFORM',
    label: 'Transform Field',
    description: 'Modify field values during import'
  }
];
```

### 2. Condition Operators

```javascript
const CONDITION_OPERATORS = [
  { value: 'equals', label: 'equals' },
  { value: 'contains', label: 'contains' },
  { value: 'startsWith', label: 'starts with' },
  { value: 'endsWith', label: 'ends with' },
  { value: 'matches', label: 'matches (regex)' },
  { value: 'greaterThan', label: '>' },
  { value: 'lessThan', label: '<' },
  { value: 'isEmpty', label: 'is empty' },
  { value: 'isNotEmpty', label: 'is not empty' }
];
```

### 3. Transform Functions

For **FIELD_TRANSFORM** rule types, these functions can modify field values:

```javascript
const TRANSFORM_FUNCTIONS = [
  {
    key: 'absolute',
    label: 'Make Positive (Math.abs)',
    description: 'Convert negative amounts to positive values',
    dataTypes: ['number'],
    apply: (value) => Math.abs(parseFloat(value))
  },
  {
    key: 'negate',
    label: 'Change Sign (multiply by -1)',
    description: 'Convert positive to negative or vice versa',
    dataTypes: ['number'],
    apply: (value) => -parseFloat(value)
  },
  {
    key: 'multiply',
    label: 'Multiply by Value',
    description: 'Multiply the field by a constant',
    dataTypes: ['number'],
    requiresParameter: true,
    apply: (value, factor) => parseFloat(value) * parseFloat(factor)
  },
  {
    key: 'uppercase',
    label: 'Convert to Uppercase',
    description: 'Convert text to uppercase',
    dataTypes: ['string'],
    apply: (value) => value?.toString().toUpperCase()
  },
  {
    key: 'lowercase',
    label: 'Convert to Lowercase',
    description: 'Convert text to lowercase',
    dataTypes: ['string'],
    apply: (value) => value?.toString().toLowerCase()
  },
  {
    key: 'trim',
    label: 'Remove Extra Spaces',
    description: 'Remove leading and trailing whitespace',
    dataTypes: ['string'],
    apply: (value) => value?.toString().trim()
  }
];
```

### 4. Available Fields for Rules

All existing system fields can be used in conditions and actions:
- **CSV Fields**: Any mapped CSV column (description, amount, reference, etc.)
- **System Fields**: transactionType, transactionGroup, subcategoryId, payee, payer, tag, notes
- **Calculated Fields**: amount (numeric comparisons), date (date comparisons)

---

## UX Design

### Integration into Bank Configuration Form

The rules interface will be added as **Step 5** in the existing BankConfigurationForm, after Field Mapping:

```
┌─────────────────────────────────────────────────────────────┐
│ Step 5: Processing Rules (Optional)                         │
├─────────────────────────────────────────────────────────────┤
│ [Create rules to automatically process transactions]        │
│                                                             │
│ ┌─ Rule 1: Auto-categorize expenses ─────────────────────┐  │
│ │ When: description contains "grocery"                    │  │
│ │ Then: Set transactionType → "Expenses"                 │  │
│ │       Set transactionGroup → "Food & Dining"           │  │
│ │ [Edit] [Delete] [✓ Active]                              │  │
│ └─────────────────────────────────────────────────────────┘  │
│                                                             │
│ ┌─ Rule 2: Ignore internal transfers ───────────────────┐   │
│ │ When: description contains "TRANSFER TO"               │   │
│ │ Then: Ignore this row (don't import)                   │   │
│ │ [Edit] [Delete] [✓ Active]                              │   │
│ └─────────────────────────────────────────────────────────┘   │
│                                                             │
│ [+ Add New Rule]                                            │
└─────────────────────────────────────────────────────────────┘
```

### Rule Creation Modal

#### Set Field Value Rule
```
┌─────────────────────────────────────────────────────────────┐
│ Create Processing Rule                                 [×]  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ Rule Name: [Auto-categorize groceries               ]       │
│                                                             │
│ Rule Type: [Set Field Value          ▼]                    │
│                                                             │
│ ┌─ Conditions (When) ─────────────────────────────────────┐ │
│ │ [description ▼] [contains ▼] [grocery            ]      │ │
│ │                                      [+ Add Condition] │ │
│ │ Logic: ○ All conditions  ● Any condition              │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ ┌─ Actions (Then) ────────────────────────────────────────┐ │
│ │ Set [transactionType ▼] to [Expenses        ▼]         │ │
│ │ Set [transactionGroup▼] to [Food & Dining   ▼]         │ │
│ │                                      [+ Add Action]    │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ [Preview Rule] [Cancel] [Save Rule]                         │
└─────────────────────────────────────────────────────────────┘
```

#### Transform Field Rule (for Amount Conversion)
```
┌─────────────────────────────────────────────────────────────┐
│ Create Processing Rule                                 [×]  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ Rule Name: [Convert negative amounts to expenses     ]      │
│                                                             │
│ Rule Type: [Transform Field       ▼]                       │
│                                                             │
│ ┌─ Conditions (When) ─────────────────────────────────────┐ │
│ │ [amount ▼] [less than ▼] [0                       ]     │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ ┌─ Actions (Then) ────────────────────────────────────────┐ │
│ │ Transform [amount ▼] using [Make Positive ▼]            │ │
│ │ Set [transactionType ▼] to [Expenses ▼]                 │ │
│ │                                      [+ Add Action]    │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ [Preview Rule] [Cancel] [Save Rule]                         │
└─────────────────────────────────────────────────────────────┘
```

### Rule Management Features

- **Visual Rule Cards**: Each rule displayed as a card with summary
- **Enable/Disable Toggle**: Quick activation/deactivation without deletion
- **Rule Ordering**: Drag-and-drop to set rule execution order
- **Rule Preview**: Test rules against sample data before saving
- **Bulk Actions**: Enable/disable multiple rules at once

---

## Data Structure

### Extended Bank Configuration Schema

```javascript
const formData = {
  // ... existing fields (name, type, fieldMapping, settings)
  processingRules: [
    {
      id: 'rule_001',
      name: 'Auto-categorize groceries',
      type: 'FIELD_VALUE_SET',
      active: true,
      order: 1,
      conditions: [
        {
          field: 'description',
          operator: 'contains',
          value: 'grocery',
          caseSensitive: false
        }
      ],
      conditionLogic: 'ANY', // 'ALL' or 'ANY'
      actions: [
        {
          field: 'transactionType',
          value: 'Expenses'
        },
        {
          field: 'transactionGroup',
          value: 'Food & Dining'
        }
      ],
      createdAt: '2024-01-15T10:30:00Z',
      updatedAt: '2024-01-15T10:30:00Z'
    }
  ]
}
```

### Rule Condition Schema

```javascript
const condition = {
  field: 'description',        // CSV field or system field
  operator: 'contains',        // Comparison operator
  value: 'grocery',           // Comparison value
  caseSensitive: false,       // For text comparisons
  dataType: 'string'          // string, number, date
};
```

### Rule Action Schema

```javascript
// SET_FIELD action
const setFieldAction = {
  type: 'SET_FIELD',          // SET_FIELD, TRANSFORM_FIELD
  field: 'transactionType',   // Target field
  value: 'Expenses',          // Static value
  valueType: 'static'         // static, field, calculated
};

// TRANSFORM_FIELD action
const transformFieldAction = {
  type: 'TRANSFORM_FIELD',
  field: 'amount',            // Source field to transform
  transform: 'absolute',      // Transform function key
  targetField: 'amount',      // Target field (can be same as source)
  parameter: null             // Optional parameter for transforms like multiply
};
```

---

## Implementation Approach

### A. Component Structure

```
src/components/
├── BankConfigurationForm.jsx (existing - extended)
├── ProcessingRulesSection.jsx (new)
├── RuleCreationModal.jsx (new)
├── RuleItem.jsx (new)
├── RulePreview.jsx (new)
├── ConditionBuilder.jsx (new)
└── ActionBuilder.jsx (new)
```

### B. Rule Engine Core Logic

```javascript
// Main rule processing function
const applyProcessingRules = (transactions, rules) => {
  const activeRules = rules.filter(rule => rule.active).sort((a, b) => a.order - b.order);
  
  return transactions
    .filter(transaction => !shouldIgnoreRow(transaction, activeRules))
    .map(transaction => applyFieldRules(transaction, activeRules));
};

// Row filtering logic
const shouldIgnoreRow = (transaction, rules) => {
  return rules
    .filter(rule => rule.type === 'ROW_IGNORE')
    .some(rule => evaluateConditions(transaction, rule.conditions, rule.conditionLogic));
};

// Field value setting and transformation logic
const applyFieldRules = (transaction, rules) => {
  const applicableRules = rules.filter(rule => 
    (rule.type === 'FIELD_VALUE_SET' || rule.type === 'FIELD_TRANSFORM') && 
    evaluateConditions(transaction, rule.conditions, rule.conditionLogic)
  );
  
  let updatedTransaction = { ...transaction };
  
  applicableRules.forEach(rule => {
    rule.actions.forEach(action => {
      switch (action.type) {
        case 'SET_FIELD':
          updatedTransaction[action.field] = action.value;
          break;
          
        case 'TRANSFORM_FIELD':
          const currentValue = updatedTransaction[action.field];
          const transformFunc = TRANSFORM_FUNCTIONS.find(f => f.key === action.transform);
          if (transformFunc && currentValue !== undefined && currentValue !== null) {
            try {
              const transformedValue = transformFunc.requiresParameter 
                ? transformFunc.apply(currentValue, action.parameter)
                : transformFunc.apply(currentValue);
              updatedTransaction[action.targetField || action.field] = transformedValue;
            } catch (error) {
              console.warn(`Transform failed for field ${action.field}:`, error);
              // Keep original value if transform fails
            }
          }
          break;
      }
    });
  });
  
  return updatedTransaction;
};

// Condition evaluation logic
const evaluateConditions = (transaction, conditions, logic) => {
  if (conditions.length === 0) return true;
  
  const results = conditions.map(condition => evaluateCondition(transaction, condition));
  
  return logic === 'ALL' ? results.every(Boolean) : results.some(Boolean);
};

// Single condition evaluation
const evaluateCondition = (transaction, condition) => {
  const fieldValue = transaction[condition.field];
  const compareValue = condition.value;
  
  switch (condition.operator) {
    case 'equals':
      return condition.caseSensitive 
        ? fieldValue === compareValue
        : fieldValue?.toLowerCase() === compareValue?.toLowerCase();
    
    case 'contains':
      return condition.caseSensitive
        ? fieldValue?.includes(compareValue)
        : fieldValue?.toLowerCase().includes(compareValue?.toLowerCase());
    
    case 'startsWith':
      return condition.caseSensitive
        ? fieldValue?.startsWith(compareValue)
        : fieldValue?.toLowerCase().startsWith(compareValue?.toLowerCase());
    
    case 'endsWith':
      return condition.caseSensitive
        ? fieldValue?.endsWith(compareValue)
        : fieldValue?.toLowerCase().endsWith(compareValue?.toLowerCase());
    
    case 'matches':
      try {
        const regex = new RegExp(compareValue, condition.caseSensitive ? 'g' : 'gi');
        return regex.test(fieldValue);
      } catch (e) {
        return false;
      }
    
    case 'greaterThan':
      return parseFloat(fieldValue) > parseFloat(compareValue);
    
    case 'lessThan':
      return parseFloat(fieldValue) < parseFloat(compareValue);
    
    case 'isEmpty':
      return !fieldValue || fieldValue.toString().trim() === '';
    
    case 'isNotEmpty':
      return fieldValue && fieldValue.toString().trim() !== '';
    
    default:
      return false;
  }
};
```

### C. Integration Points

1. **CSV Import Processing**: Rules applied during `parseCSVFile` function
2. **Transaction Review Queue**: Show rule application results and allow override
3. **Bank Configuration Storage**: Rules saved with bank configuration
4. **Validation**: Ensure rule fields exist in field mapping

---

## Common Use Cases & Examples

### Example 1: Auto-categorize by Description
**Use Case**: Automatically categorize grocery transactions
- **When**: `description` contains "grocery" OR "supermarket" OR "walmart"
- **Then**: Set `transactionType` → "Expenses", Set `transactionGroup` → "Food & Dining"

### Example 2: Ignore Internal Transfers  
**Use Case**: Don't import internal bank transfers
- **When**: `description` starts with "TRANSFER TO" OR `description` contains "INTERNAL TRANSFER"
- **Then**: Ignore row (don't import)

### Example 3: Set Payee for Specific Merchants
**Use Case**: Auto-fill payee for known merchants
- **When**: `description` contains "AMAZON.COM"
- **Then**: Set `payee` → "Amazon", Set `transactionGroup` → "Online Shopping"

### Example 4: Handle Salary Deposits
**Use Case**: Automatically categorize payroll
- **When**: `description` equals "PAYROLL DEPOSIT" AND `amount` > 1000
- **Then**: Set `transactionType` → "Income", Set `payer` → "Employer", Set `transactionGroup` → "Salary"

### Example 5: Mark Large Transactions
**Use Case**: Flag transactions requiring review
- **When**: `amount` > 5000 OR `amount` < -5000  
- **Then**: Set `tag` → "Large Transaction", Set `notes` → "Requires review"

### Example 6: Handle Investment Transactions
**Use Case**: Auto-categorize investment purchases
- **When**: `description` contains "INVESTMENT PURCHASE" AND `payee` contains "FIDELITY"
- **Then**: Set `transactionType` → "Investment - BUY", Set `payer` → "Fidelity"

### Example 7: Convert Negative Amounts to Positive for Expenses
**Use Case**: Bank CSV has negative amounts for debits, but system needs positive amounts for expense categories
- **When**: `amount` less than `0`
- **Then**: Transform `amount` using "Make Positive", Set `transactionType` → "Expenses"

**Processing Example:**
```
CSV Input:    Date: 2024-01-15, Description: "Grocery Store", Amount: -45.67
              ↓
Rule Applied: Convert negative to positive + set as expense  
              ↓
Result:       Date: 2024-01-15, Description: "Grocery Store", Amount: 45.67, 
              TransactionType: "Expenses"
```

### Example 8: Clean Up Description Text
**Use Case**: Standardize merchant names
- **When**: `description` contains "AMAZON" 
- **Then**: Transform `payee` to "Amazon" (standardized)

---

## Persistent Storage

### Database Schema Extension

The processing rules need to be stored persistently with the bank configuration. Here's the proposed database schema extension:

#### Bank Configuration Table Update
```sql
-- Add rules column to existing bank_configurations table
ALTER TABLE bank_configurations 
ADD COLUMN processing_rules TEXT; -- JSON string of rules array
```

#### Alternative: Dedicated Rules Table (Recommended)
```sql
-- Create dedicated table for better normalization and querying
CREATE TABLE processing_rules (
  id TEXT PRIMARY KEY,
  bank_config_id TEXT NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL, -- 'FIELD_VALUE_SET', 'ROW_IGNORE', 'FIELD_TRANSFORM'
  active BOOLEAN DEFAULT true,
  rule_order INTEGER DEFAULT 0,
  conditions TEXT NOT NULL, -- JSON string of conditions array
  condition_logic TEXT DEFAULT 'ANY', -- 'ALL' or 'ANY'
  actions TEXT NOT NULL, -- JSON string of actions array
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (bank_config_id) REFERENCES bank_configurations(id) ON DELETE CASCADE
);

-- Index for performance
CREATE INDEX idx_processing_rules_bank_config ON processing_rules(bank_config_id);
CREATE INDEX idx_processing_rules_active ON processing_rules(active);
CREATE INDEX idx_processing_rules_order ON processing_rules(rule_order);
```

### Storage Implementation Options

#### Option 1: JSON in Bank Configuration (Simple)
Store rules as a JSON string in the existing bank configuration:

```javascript
// In relationalDatabase.js
const saveBankConfiguration = async (config) => {
  const configWithRules = {
    ...config,
    processing_rules: JSON.stringify(config.processingRules || [])
  };
  
  // Save to database
  const result = await db.run(`
    INSERT OR REPLACE INTO bank_configurations 
    (id, name, type, field_mapping, settings, processing_rules, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    config.id,
    config.name,
    config.type,
    JSON.stringify(config.fieldMapping),
    JSON.stringify(config.settings),
    JSON.stringify(config.processingRules || []),
    config.createdAt,
    new Date().toISOString()
  ]);
  
  return result;
};

const getBankConfiguration = async (id) => {
  const config = await db.get(`
    SELECT * FROM bank_configurations WHERE id = ?
  `, [id]);
  
  if (config) {
    return {
      ...config,
      fieldMapping: JSON.parse(config.field_mapping || '{}'),
      settings: JSON.parse(config.settings || '{}'),
      processingRules: JSON.parse(config.processing_rules || '[]')
    };
  }
  return null;
};
```

#### Option 2: Dedicated Rules Table (Recommended for Complex Scenarios)
Store rules in a separate table for better performance and querying:

```javascript
// In relationalDatabase.js
const saveProcessingRule = async (bankConfigId, rule) => {
  const result = await db.run(`
    INSERT OR REPLACE INTO processing_rules
    (id, bank_config_id, name, type, active, rule_order, conditions, condition_logic, actions, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    rule.id,
    bankConfigId,
    rule.name,
    rule.type,
    rule.active ? 1 : 0,
    rule.order || 0,
    JSON.stringify(rule.conditions),
    rule.conditionLogic,
    JSON.stringify(rule.actions),
    rule.createdAt || new Date().toISOString(),
    new Date().toISOString()
  ]);
  
  return result;
};

const getProcessingRules = async (bankConfigId) => {
  const rules = await db.all(`
    SELECT * FROM processing_rules 
    WHERE bank_config_id = ? 
    ORDER BY rule_order ASC, created_at ASC
  `, [bankConfigId]);
  
  return rules.map(rule => ({
    ...rule,
    active: Boolean(rule.active),
    conditions: JSON.parse(rule.conditions),
    actions: JSON.parse(rule.actions)
  }));
};

const deleteProcessingRule = async (ruleId) => {
  return await db.run(`
    DELETE FROM processing_rules WHERE id = ?
  `, [ruleId]);
};

const updateRuleOrder = async (ruleId, newOrder) => {
  return await db.run(`
    UPDATE processing_rules 
    SET rule_order = ?, updated_at = ?
    WHERE id = ?
  `, [newOrder, new Date().toISOString(), ruleId]);
};

const toggleRuleActive = async (ruleId, active) => {
  return await db.run(`
    UPDATE processing_rules 
    SET active = ?, updated_at = ?
    WHERE id = ?
  `, [active ? 1 : 0, new Date().toISOString(), ruleId]);
};
```

### Context Integration

Update the AccountingContext to handle processing rules:

```javascript
// In AccountingContext.jsx
const AccountingContext = createContext();

export const AccountingProvider = ({ children }) => {
  // ... existing state
  
  const [processingRules, setProcessingRules] = useState({});

  // Load processing rules for a bank configuration
  const loadProcessingRules = async (bankConfigId) => {
    try {
      const rules = await getProcessingRules(bankConfigId);
      setProcessingRules(prev => ({
        ...prev,
        [bankConfigId]: rules
      }));
      return rules;
    } catch (error) {
      console.error('Error loading processing rules:', error);
      return [];
    }
  };

  // Save a processing rule
  const saveProcessingRule = async (bankConfigId, rule) => {
    try {
      await saveProcessingRule(bankConfigId, rule);
      // Reload rules to update local state
      await loadProcessingRules(bankConfigId);
      return true;
    } catch (error) {
      console.error('Error saving processing rule:', error);
      return false;
    }
  };

  // Delete a processing rule
  const deleteProcessingRule = async (ruleId, bankConfigId) => {
    try {
      await deleteProcessingRule(ruleId);
      // Reload rules to update local state
      await loadProcessingRules(bankConfigId);
      return true;
    } catch (error) {
      console.error('Error deleting processing rule:', error);
      return false;
    }
  };

  const value = {
    // ... existing values
    processingRules,
    loadProcessingRules,
    saveProcessingRule,
    deleteProcessingRule,
    toggleRuleActive: async (ruleId, active, bankConfigId) => {
      try {
        await toggleRuleActive(ruleId, active);
        await loadProcessingRules(bankConfigId);
        return true;
      } catch (error) {
        console.error('Error toggling rule:', error);
        return false;
      }
    }
  };

  return (
    <AccountingContext.Provider value={value}>
      {children}
    </AccountingContext.Provider>
  );
};
```

### Data Migration

For existing bank configurations, add a migration script:

```javascript
// In relationalDatabase.js
const migrateProcessingRules = async () => {
  try {
    // Check if processing_rules column exists
    const tableInfo = await db.all(`PRAGMA table_info(bank_configurations)`);
    const hasRulesColumn = tableInfo.some(col => col.name === 'processing_rules');
    
    if (!hasRulesColumn) {
      // Add the column if using Option 1 (JSON in bank config)
      await db.run(`
        ALTER TABLE bank_configurations 
        ADD COLUMN processing_rules TEXT DEFAULT '[]'
      `);
      
      console.log('Added processing_rules column to bank_configurations');
    }
    
    // If using Option 2 (dedicated table), create the table
    await db.run(`
      CREATE TABLE IF NOT EXISTS processing_rules (
        id TEXT PRIMARY KEY,
        bank_config_id TEXT NOT NULL,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        active BOOLEAN DEFAULT true,
        rule_order INTEGER DEFAULT 0,
        conditions TEXT NOT NULL,
        condition_logic TEXT DEFAULT 'ANY',
        actions TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (bank_config_id) REFERENCES bank_configurations(id) ON DELETE CASCADE
      )
    `);
    
    // Create indexes
    await db.run(`CREATE INDEX IF NOT EXISTS idx_processing_rules_bank_config ON processing_rules(bank_config_id)`);
    await db.run(`CREATE INDEX IF NOT EXISTS idx_processing_rules_active ON processing_rules(active)`);
    await db.run(`CREATE INDEX IF NOT EXISTS idx_processing_rules_order ON processing_rules(rule_order)`);
    
    console.log('Processing rules database migration completed');
    
  } catch (error) {
    console.error('Error migrating processing rules:', error);
    throw error;
  }
};

// Call this in the database initialization
export const initializeDatabase = async () => {
  // ... existing initialization code
  
  // Run processing rules migration
  await migrateProcessingRules();
};
```

### Storage Considerations

#### Performance
- **Index on bank_config_id**: Fast lookup of rules for a specific bank
- **Index on active**: Quick filtering of active rules
- **Index on rule_order**: Efficient ordering for rule execution

#### Data Integrity
- **Foreign key constraints**: Ensure rules are deleted when bank config is deleted
- **JSON validation**: Validate JSON structure before storing
- **Rule validation**: Ensure field references exist in field mapping

#### Backup and Recovery
```javascript
// Export rules for backup
const exportProcessingRules = async (bankConfigId) => {
  const rules = await getProcessingRules(bankConfigId);
  return {
    bankConfigId,
    exportedAt: new Date().toISOString(),
    rules
  };
};

// Import rules from backup
const importProcessingRules = async (bankConfigId, rulesData) => {
  for (const rule of rulesData.rules) {
    const newRule = {
      ...rule,
      id: generateId(), // Generate new ID to avoid conflicts
      createdAt: new Date().toISOString()
    };
    await saveProcessingRule(bankConfigId, newRule);
  }
};
```

### Recommended Approach

**For this implementation, I recommend Option 2 (Dedicated Rules Table)** because:

✅ **Better Performance**: Indexes on rule-specific fields  
✅ **Easier Querying**: Can filter, sort, and search rules efficiently  
✅ **Better Scalability**: Handles large numbers of rules per bank  
✅ **Atomic Operations**: Can update individual rules without affecting others  
✅ **Better Backup**: Can export/import rules independently  
✅ **Audit Trail**: Easy to add timestamps and change tracking  

The dedicated table approach provides better long-term maintainability and performance as the number of rules and bank configurations grows.

---

## Implementation Phases

### Phase 1: Core Infrastructure
- [ ] **Database Setup**: Create processing_rules table and migration script
- [ ] **Storage Layer**: Implement database functions for rule CRUD operations  
- [ ] **Context Integration**: Add processing rules to AccountingContext
- [ ] Extend BankConfigurationForm data structure
- [ ] Create ProcessingRulesSection component
- [ ] Implement rule engine core logic

### Phase 2: Rule Builder UI
- [ ] Create RuleCreationModal with condition builder
- [ ] Add action builder interface
- [ ] Implement rule validation
- [ ] Add rule preview functionality

### Phase 3: Advanced Features
- [ ] Rule ordering and priority
- [ ] Rule templates and presets
- [ ] Bulk rule operations
- [ ] Rule performance optimization

### Phase 4: Integration & Testing
- [ ] Integrate with CSV import pipeline
- [ ] Add rule application logging
- [ ] Create comprehensive test suite
- [ ] Performance testing with large datasets

---

## Benefits

✅ **Automation**: Reduce manual transaction editing by 70-80%  
✅ **Consistency**: Ensure consistent categorization across imports  
✅ **Flexibility**: Support complex multi-condition rules  
✅ **User Control**: Non-technical users can create sophisticated rules  
✅ **Scalability**: Handle high-volume transaction imports efficiently  
✅ **Maintainability**: Modular architecture allows easy feature expansion  

---

## Technical Considerations

### Performance
- Rules processed in memory during import
- Order rules by complexity (simple first)
- Cache compiled regex patterns
- Consider rule indexing for large rule sets

### Validation
- Validate rule fields exist in field mapping
- Prevent circular dependencies
- Validate regex patterns before saving
- Check for conflicting rules

### Error Handling
- Graceful degradation if rule fails
- Detailed logging for debugging
- Rule rollback capability
- User notification of rule conflicts

---

## Future Enhancements

### Advanced Rule Types
- **Duplicate Detection**: Rules to identify and handle duplicates
- **Data Validation**: Rules to validate and clean imported data
- **Multi-Row Rules**: Rules that operate across multiple transactions
- **Calculated Fields**: Rules that perform calculations

### AI Integration
- **Smart Suggestions**: AI-powered rule recommendations
- **Pattern Recognition**: Automatic rule generation from user edits
- **Natural Language**: Create rules using plain English

### Import/Export
- **Rule Templates**: Shareable rule configurations
- **Bank-Specific Presets**: Pre-built rules for common banks
- **Community Rules**: Shared rule library

---

## Summary

This rule-based processing system will transform the static field mapping into a dynamic, intelligent import process. Users will be able to create sophisticated rules that automatically categorize transactions, filter unwanted data, and ensure consistent data quality - significantly reducing manual work during transaction imports while maintaining full control over the categorization logic.

The modular design ensures the system can grow with user needs while maintaining the simplicity and reliability of the existing bank configuration workflow.