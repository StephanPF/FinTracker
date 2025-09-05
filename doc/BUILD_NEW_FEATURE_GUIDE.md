# New Feature Development Guide

This guide provides essential requirements and patterns to follow when developing new features for the accounting application.

## 🎨 **UI/UX Design Requirements**

### Compact Interface Design
- **NO 24px padding** - Use compact spacing throughout the interface
- **NO 24px margins** - Maximum margin allowed is 12px
- **Preferred padding values**: 4px, 8px, 12px maximum
- **Preferred margin values**: 4px, 8px, 12px maximum
- **Form spacing**: Use 8px gaps between form elements
- **Card/container padding**: Maximum 12px internal padding
- **Button padding**: 0.75rem (12px) all sides for consistent button sizing
- **Button border-radius**: 6px for primary and secondary buttons, 8px for filter buttons

### Design Pattern Examples
```css
/* ✅ GOOD - Compact spacing */
.form-group {
  margin-bottom: 8px;
  padding: 4px;
}

.card-content {
  padding: 12px;
}

.button-primary {
  padding: 0.75rem;
  border-radius: 6px;
  font-size: 0.9rem;
}

.button-secondary {
  padding: 0.75rem;
  border-radius: 6px;
  font-size: 0.9rem;
  background-color: white;
  color: #1a202c;
  border: 1px solid #d1d5db;
}

.button-filter {
  padding: 0.75rem 1.25rem;
  border-radius: 8px;
  background: #f3f4f6;
  color: #374151;
  border: 1px solid #d1d5db;
}

/* ❌ AVOID - Excessive spacing */
.form-group {
  margin-bottom: 24px;  /* Too much margin - max 12px allowed */
  padding: 24px;        /* Too much padding - max 12px allowed */
}
```

### Form Field Styling Requirements
- **All input fields, select boxes, and checkboxes MUST have white background with dark foreground**
- **Required styling pattern**:
```css
/* ✅ MANDATORY - White background, dark text */
.form-control, input, select, textarea {
  background-color: white;
  color: #1a202c;
  border: 1px solid #d1d5db;
}

/* ✅ MANDATORY - Checkbox styling (COMPLETE IMPLEMENTATION) */
input[type="checkbox"] {
  background-color: white;
  color: #1a202c;
  accent-color: #1a202c;  /* Controls the checkmark color */
  border: 1px solid #d1d5db;
}

/* ✅ MANDATORY - React inline checkbox styling */
style={{
  backgroundColor: 'white',
  color: '#1a202c',
  accentColor: '#1a202c',
  border: '1px solid #d1d5db'
}}

/* ❌ AVOID - Colored backgrounds or light text */
input {
  background-color: #f3f4f6;  /* Avoid grey backgrounds */
  color: #9ca3af;             /* Avoid light text */
}

/* ❌ AVOID - Incomplete checkbox styling (causes dark background) */
input[type="checkbox"] {
  background-color: white;  /* Not sufficient alone! */
  color: '#1a202c';         /* Missing accent-color causes dark background */
}
```

## 💰 **Amount Field Requirements**

### Currency Symbol Display
- **ALL amount input fields MUST show appropriate currency symbol based on context**
- **Display currency symbol according to selected currency or account currency**
- **Required implementation patterns**:

#### Context-Based Currency Display
```jsx
// ✅ GOOD - Show currency based on selected account
const selectedAccount = accounts.find(acc => acc.id === formData.accountId);
const currency = currencies.find(c => c.id === selectedAccount?.currencyId);

<div className="amount-input-container">
  <span className="currency-symbol">{currency?.symbol || '$'}</span>
  <input 
    type="number" 
    className="amount-input"
    placeholder="0.00"
  />
</div>

// ✅ GOOD - Show currency based on form context
<div className="amount-field">
  <label>Amount {currency?.code && `(${currency.code})`}</label>
  <div className="input-with-currency">
    <span className="currency-prefix">{currency?.symbol}</span>
    <input type="number" />
  </div>
</div>
```

#### Multi-Currency Form Support
```jsx
// ✅ GOOD - Dynamic currency display for transfers/exchanges
const fromCurrency = currencies.find(c => c.id === fromCurrencyId);
const toCurrency = currencies.find(c => c.id === toCurrencyId);

<div className="currency-conversion">
  <div className="amount-from">
    <span className="currency-symbol">{fromCurrency?.symbol}</span>
    <input type="number" />
  </div>
  <div className="conversion-arrow">→</div>
  <div className="amount-to">
    <span className="currency-symbol">{toCurrency?.symbol}</span>
    <input type="number" />
  </div>
</div>
```

## 📅 **Date Field Requirements**

### Mandatory Calendar Implementation
- **ALL date fields MUST use react-datepicker with full calendar functionality**
- **Reference document**: `DATE_PICKER.md` - Read this file for complete implementation details
- **NO simple text inputs for dates**

### Required Implementation Pattern
```jsx
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

// Format conversion for react-datepicker
const datePickerFormat = userDateFormat.replace(/DD/g, 'dd').replace(/MM/g, 'MM').replace(/YYYY/g, 'yyyy');

<DatePicker
  selected={selectedDate}
  onChange={handleDateChange}
  dateFormat={datePickerFormat}
  className="form-control"
  placeholderText="Select date"
/>
```

### Integration Requirements
- ✅ Must integrate with user date format preferences from Settings
- ✅ Must use YYYY-MM-DD internal storage format
- ✅ Must handle timezone conversion properly (see ISSUES_TO_BE_AWARE_OF.md)
- ✅ Must display dates according to user's chosen format

## 🔍 **Pre-Development Checklist**

### Required Reading Before Starting
1. **Read `ISSUES_TO_BE_AWARE_OF.md`** - Critical known issues and how to avoid them
2. **Review `DATE_PICKER.md`** - If feature involves any date fields
3. **Check `TEST_CASES.md`** - Understand existing test patterns

### Common Pitfalls to Avoid
Based on `ISSUES_TO_BE_AWARE_OF.md`:

#### File Storage Persistence
- ✅ **Always save database changes to file storage**
- Follow this pattern for all database modifications:
```javascript
// 1. Update in-memory database
const result = database.updateSomeData(data);

// 2. Export table to buffer  
const buffer = database.exportTableToBuffer('table_name');

// 3. Save buffer to file storage
await fileStorage.saveTable('table_name', buffer);

return result;
```

#### Timezone-Safe Date Handling
- ❌ **NEVER use** `date.toISOString().split('T')[0]` for date storage
- ✅ **Always use** timezone-safe date conversion:
```javascript
const dateToISOString = (date) => {
  if (!date) return '';
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
};
```

## 🧪 **Testing Requirements**

### Mandatory Test Coverage
- **Write comprehensive tests** for all new functionality
- **Follow existing test patterns** from `TEST_CASES.md`
- **Include edge cases** and error scenarios
- **Test timezone handling** for any date-related functionality
- **⚠️ CRITICAL: Integrate tests into Test Dashboard for visibility**

### Test Integration Process
Every new feature MUST have tests integrated into the Test Dashboard. Follow this exact process:

#### Step 1: Create Test Module
Create a new test file following the naming pattern: `[featureName]TestRunner.test.js`

```javascript
// Example: budgetSetupTestRunner.test.js
import RelationalDatabase from './relationalDatabase.js';

// Mock XLSX module for browser environment
const mockXLSX = { /* standard mock implementation */ };
window.XLSX = mockXLSX;

// Fallback expect implementation
const testExpect = {
  toBe: (actual, expected) => { /* implementation */ },
  toEqual: (actual, expected) => { /* implementation */ },
  // ... other test utilities
};

// Export function that returns array of test objects
export const create[FeatureName]Tests = (expectObj) => {
  let db;
  
  const expect = expectObj || (typeof window !== 'undefined' && window.expect) || testExpected;
  
  const beforeEach = () => {
    db = new RelationalDatabase();
    db.createNewDatabase('en');
    // Initialize test data...
  };

  return [
    {
      id: 'FeatureName_Category_001',
      category: 'Feature Name',
      suite: 'Test Suite Name',
      name: 'Should perform specific test',
      expectedBehavior: 'Description of expected behavior',
      test: () => {
        beforeEach();
        // Test implementation...
        expect.toBe(actualValue, expectedValue);
      }
    },
    // ... more tests
  ];
};
```

#### Step 2: Update Test Runner
Add your test module to `src/utils/testRunner.js`:

```javascript
// 1. Add import statement
import { create[FeatureName]Tests } from './[featureName]TestRunner.test.js';

// 2. Add to allTests array in runTestSuite function
const allTests = [
  ...createDatabaseTests(),
  ...createExchangeRateServiceTests(),
  ...createDataManagementTests(),
  // ... existing tests
  ...create[FeatureName]Tests()  // ← Add your tests here
];
```

#### Step 3: Test Categories and Organization
Organize your tests using these guidelines:

**Category Naming**: Use descriptive feature names (e.g., "Budget Setup", "Import Transactions")
**Suite Naming**: Group related tests (e.g., "Database Schema", "Validation", "Calculations")
**Test ID Pattern**: `FeatureName_Category_###` (e.g., "BudgetSetup_Schema_001")

#### Step 4: Verification Checklist
After integration, verify:
- [ ] Tests appear in Test Dashboard under correct category
- [ ] All tests can be run individually 
- [ ] Tests can be run as a group by category/suite
- [ ] Test results display properly (pass/fail status)
- [ ] Test descriptions and expected behaviors are clear

### Test Framework Setup
```javascript
// Use browser-compatible test framework with custom expect implementation
const expect = {
  toBe: (actual, expected) => { /* implementation */ },
  toEqual: (actual, expected) => { /* implementation */ },
  toHaveLength: (actual, expected) => { /* implementation */ },
  toBeGreaterThan: (actual, expected) => { /* implementation */ },
  toBeTruthy: (actual) => { /* implementation */ },
  toBeFalsy: (actual) => { /* implementation */ },
  toContain: (actual, expected) => { /* implementation */ }
};
```

### Test Coverage Requirements
Each feature should include tests for:
- **Database schema validation** (if feature adds new tables)
- **CRUD operations** (create, read, update, delete)
- **Business logic validation** 
- **Error handling scenarios**
- **Edge cases and boundary conditions**
- **Integration with existing features**
- **UI validation rules** (if applicable)

### Example Test Implementation
```javascript
// Complete test example
{
  id: 'BudgetSetup_Schema_001',
  category: 'Budget Setup',
  suite: 'Database Schema', 
  name: 'Should have budgets table with correct schema',
  expectedBehavior: 'Budgets table should contain all required fields',
  test: () => {
    beforeEach();
    const budgetsSchema = db.tableSchemas.budgets;
    const expectedFields = ['id', 'name', 'description', 'status'];
    
    expectedFields.forEach(field => {
      expect.toContain(budgetsSchema, field);
    });
  }
}
```

## 📁 **File Organization**

### Component Structure
- **Components**: Place in `src/components/`
- **Utilities**: Place in `src/utils/`
- **Styles**: Create separate CSS files in `src/components/` for complex styling
- **Tests**: Place tests in `src/utils/` with `.test.js` extension

### Naming Conventions
- **Components**: PascalCase (e.g., `NewFeatureComponent.jsx`)
- **Utilities**: camelCase (e.g., `newFeatureService.js`)
- **Tests**: Match component name with `.test.js` suffix
- **CSS Files**: Match component name (e.g., `NewFeatureComponent.css`)

## 🔧 **Code Quality Standards**

### React Component Guidelines
- Use functional components with hooks
- Implement proper error handling
- Follow existing context usage patterns (`useAccounting`, `useLanguage`)
- Ensure components are responsive and accessible

### Database Integration
- Use existing `RelationalDatabase` class methods
- Follow referential integrity patterns
- Implement proper validation
- Handle errors gracefully

### Performance Considerations
- Minimize re-renders with proper dependency arrays
- Use React.memo for expensive components
- Implement pagination for large datasets
- Optimize database queries

## 🌐 **Internationalization**

### Language Support
- Use `useLanguage` hook for all text
- Add translation keys to language files
- Support all existing languages (English, French, Dutch, German, Spanish, Italian)
- Test with different languages to ensure UI doesn't break

## 📝 **Documentation Requirements**

### Code Documentation
- Add JSDoc comments for complex functions
- Document component props and expected behavior
- Include usage examples for utility functions

### User Documentation
- Update relevant help text if feature affects user workflows
- Create or update any relevant .md files
- Ensure feature is discoverable in the UI

## ✅ **Feature Completion Checklist**

Before considering a feature complete:

- [ ] UI follows compact design principles (no 24px padding or margins - max 12px)
- [ ] All form fields have white background with dark foreground
- [ ] Amount fields show appropriate currency symbols based on context
- [ ] Date fields use react-datepicker with calendar functionality
- [ ] All database changes persist to file storage
- [ ] Timezone handling is implemented safely
- [ ] Comprehensive tests are written and passing
- [ ] **⚠️ CRITICAL: Tests are integrated into Test Dashboard and visible**
- [ ] Tests can be run individually and as groups
- [ ] Test results display correctly in Test Dashboard
- [ ] Component is responsive and accessible
- [ ] Internationalization support is complete
- [ ] Error handling is implemented
- [ ] Performance has been considered and optimized
- [ ] Documentation is updated
- [ ] Feature integrates properly with existing workflows

## 📋 **Checkbox Implementation Best Practices**

### Complete Checkbox Styling Requirements
When implementing checkboxes, you MUST include ALL these style properties to prevent dark backgrounds:

```jsx
// ✅ COMPLETE - Prevents dark background issues
<input
  type="checkbox"
  style={{
    backgroundColor: 'white',     // White background
    color: '#1a202c',            // Dark text color  
    accentColor: '#1a202c',      // ⚠️ CRITICAL: Controls checkmark color
    border: '1px solid #d1d5db'  // Visible border
  }}
/>

// ❌ INCOMPLETE - Will cause dark background
<input
  type="checkbox"
  style={{
    backgroundColor: 'white',     // Not enough alone!
    color: '#1a202c'             // Missing accentColor causes issues
  }}
/>
```

### Checkbox Layout Best Practices
- **Vertical centering**: Use `verticalAlign: 'middle'` on table cells
- **Text alignment**: Use `textAlign: 'center'` for checkbox columns
- **Padding**: Use consistent 8px padding for checkbox cells
- **Column width**: Set explicit width (e.g., 100px) for checkbox columns

### Example Implementation
```jsx
// Table header checkbox
<th style={{ width: '100px', textAlign: 'center' }}>
  <div style={{ display: 'flex', alignItems: 'center', flexDirection: 'column', gap: '4px' }}>
    <span>Select All</span>
    <input
      type="checkbox"
      checked={allSelected}
      onChange={handleSelectAll}
      style={{
        backgroundColor: 'white',
        color: '#1a202c',
        accentColor: '#1a202c',
        border: '1px solid #d1d5db'
      }}
    />
  </div>
</th>

// Table row checkbox
<td style={{ textAlign: 'center', padding: '8px', verticalAlign: 'middle' }}>
  <input
    type="checkbox"
    checked={isSelected}
    onChange={handleSelect}
    style={{
      backgroundColor: 'white',
      color: '#1a202c',
      accentColor: '#1a202c',
      border: '1px solid #d1d5db'
    }}
  />
</td>
```

## 🚨 **Critical Reminders**

1. **No 24px padding anywhere in the UI**
2. **No 24px margins anywhere in the UI - maximum margin is 12px**
3. **All form fields must have white background with dark foreground**
4. **⚠️ NEW: All checkboxes must include accentColor property to prevent dark backgrounds**
5. **Amount fields must show appropriate currency symbols**
6. **All date fields must have calendar functionality**
7. **Read ISSUES_TO_BE_AWARE_OF.md before starting**
8. **Test timezone handling thoroughly**
9. **Ensure database changes persist to file storage**
10. **Write tests for all new functionality**

## 📞 **Questions or Issues**

If you encounter any issues or have questions:
1. Check `ISSUES_TO_BE_AWARE_OF.md` for known problems
2. Review existing similar components for patterns
3. Check `TEST_CASES.md` for testing examples
4. Ensure you're following the established architecture patterns

Remember: Consistency with existing patterns is key to maintainable code!