# Budget Setup Functionality Documentation

## Overview

The Budget Setup feature provides a comprehensive budget management system that allows users to create, configure, and manage budgets with multi-period calculations and single active budget enforcement.

## Core Features

### 🎯 **Two-Step Budget Creation Wizard**
1. **Step 1: Budget Selection** - Choose to create new or modify existing budget
2. **Step 2: Budget Configuration** - Add line items and configure budget details

### 💰 **Multi-Period Budget Calculations**
- Support for Weekly, Monthly, Quarterly, and Yearly budget periods
- Automatic normalization to monthly equivalents for consistent comparison
- Real-time conversion display across all time periods

### 📊 **Advanced Budget Analytics**
- Percentage analysis showing each line item's share of total budget
- Weekly, Monthly, and Yearly projections for each line item
- Total budget summaries with annual projections

### 🏷️ **Smart Budget Status Management**
- **Draft**: Work-in-progress budgets for experimentation
- **Active**: Currently operational budget (only ONE allowed system-wide)
- **Inactive**: Previously active budgets preserved for reference

## User Interface

### Step 1: Budget Selection Screen

#### **Create New Budget Option**
- Clean interface for starting fresh budget creation
- Name and description fields with validation
- Automatic status assignment as 'draft'

#### **Existing Budgets List**
- Visual budget cards showing:
  - Budget name and total monthly amount
  - Status badge (Draft/Active/Inactive) with color coding
  - Click-to-edit functionality

#### **Status Visual Indicators**
- 🟡 **Draft**: Yellow badge - Work in progress
- 🟢 **Active**: Green badge - Currently operational
- ⚫ **Inactive**: Gray badge - Previously active

### Step 2: Budget Configuration Screen

#### **Add Line Items Form**
- **Subcategory Selection**: Dropdown filtered to expense subcategories only
- **Amount Input**: With currency symbol positioned on the right
- **Period Selection**: Weekly, Monthly, Quarterly, Yearly options
- Real-time validation preventing duplicate subcategories

#### **Budget Table Columns**
| Column | Description |
|--------|-------------|
| Subcategory | Name of the expense category |
| Amount | Original amount as entered |
| Period | Time period for the amount |
| Weekly | Calculated weekly equivalent |
| Monthly | Calculated monthly equivalent |
| Yearly | Calculated yearly equivalent |
| % of Budget | Percentage of total monthly budget |
| Actions | Remove button for line item |

#### **Budget Summary Panel**
- Total monthly budget amount
- Annual projection calculation
- Formatted currency display using site-wide formatting

#### **Action Buttons**
- **Back**: Return to step 1
- **Save as Draft**: Save without activating
- **Save & Activate**: Save and make this budget active
- **Cancel**: Exit with unsaved changes warning

## Technical Implementation

### Database Schema

#### **Budgets Table**
```javascript
{
  id: 'BUDGET_123456789',           // Unique identifier
  name: 'Monthly Household Budget',  // User-defined name
  description: 'Family budget',      // Optional description
  status: 'active',                 // draft|active|inactive
  createdAt: '2024-01-15',          // Creation date
  lastModified: '2024-01-20'        // Last update date
}
```

#### **Budget Line Items Table**
```javascript
{
  id: 'LINE_ITEM_123456789',        // Unique identifier
  budgetId: 'BUDGET_123456789',     // Reference to parent budget
  subcategoryId: 'SUB_001',         // Reference to subcategory
  subcategoryName: 'Groceries',     // Cached subcategory name
  period: 'weekly',                 // weekly|monthly|quarterly|yearly
  amount: 150.00,                   // Original amount
  baseCurrency: 'CUR_001'           // Currency reference
}
```

### Business Logic

#### **Single Active Budget Enforcement**
```javascript
// When activating a budget, all other active budgets become inactive
if (status === 'active') {
  budgetTable = budgetTable.map(budget => {
    if (budget.status === 'active') {
      return { ...budget, status: 'inactive', lastModified: getCurrentDateString() };
    }
    return budget;
  });
}
```

#### **Period Normalization Calculations**
```javascript
const normalizeToMonthly = (amount, period) => {
  switch (period) {
    case 'weekly': return amount * (52 / 12);    // ~4.33 weeks per month
    case 'monthly': return amount;               // No conversion needed
    case 'quarterly': return amount / 3;         // 3 months per quarter
    case 'yearly': return amount / 12;           // 12 months per year
    default: return amount;
  }
};

const monthlyToWeekly = (monthlyAmount) => {
  return monthlyAmount * (12 / 52);              // ~0.23 months per week
};

const monthlyToYearly = (monthlyAmount) => {
  return monthlyAmount * 12;                     // 12 months per year
};
```

#### **Percentage Calculations**
```javascript
const percentage = (normalizeToMonthly(item.amount, item.period) / totals.monthly) * 100;
```

### Currency Formatting Integration

#### **Site-Wide Currency Formatting**
- Uses existing `numberFormatService.formatCurrency(amount, currencyId)`
- Respects user's currency format preferences from settings
- Automatic fallback formatting with error handling
- Consistent with application-wide currency display

#### **Implementation Example**
```javascript
const formatCurrency = (amount, currencyId = null) => {
  if (!currencyId) {
    const baseCurrency = getBaseCurrency();
    currencyId = baseCurrency ? baseCurrency.id : 'CUR_001';
  }

  if (numberFormatService) {
    return numberFormatService.formatCurrency(amount, currencyId);
  }
  
  // Fallback formatting
  const currency = currencies.find(c => c.id === currencyId) || getBaseCurrency();
  return `${currency?.symbol || '$'}${parseFloat(amount || 0).toFixed(2)}`;
};
```

### Data Validation

#### **Budget Creation Validation**
- ✅ Budget name is required and cannot be empty
- ✅ Budget names must be unique within the system
- ✅ Description is optional but recommended

#### **Line Item Validation**
- ✅ Subcategory selection is required
- ✅ Amount must be positive number
- ✅ Duplicate subcategories are prevented
- ✅ Period selection is required

#### **Business Rules**
- ✅ Only expense subcategories can be added to budgets
- ✅ Only one budget can be active at any time
- ✅ Draft budgets remain unchanged during activation of others
- ✅ Previous active budgets are preserved as inactive

## User Workflows

### Creating a New Budget

1. **Navigate to Budget Setup**
2. **Click "Create New Budget"**
3. **Enter budget name and description**
4. **Click "Create New"** (status: draft)
5. **Add line items:**
   - Select expense subcategory
   - Enter amount and select period
   - Click "Add" to add line item
6. **Review budget summary and totals**
7. **Choose save option:**
   - "Save as Draft" - keeps as draft
   - "Save & Activate" - makes active (deactivates others)

### Modifying an Existing Budget

1. **Navigate to Budget Setup**
2. **Click on existing budget from list**
3. **Modify line items as needed:**
   - Add new line items
   - Remove existing line items
4. **Review updated totals**
5. **Save changes:**
   - "Save as Draft" - updates without changing status
   - "Save & Activate" - activates this budget

### Budget Activation Workflow

```
User clicks "Save & Activate"
           ↓
Current budget → status: 'active'
           ↓
All other active budgets → status: 'inactive'
           ↓
Success message displayed
           ↓
Return to Step 1 (Budget Selection)
           ↓
Updated budget list shows new active budget
```

## Multi-Language Support

### Supported Languages
- **English**: Full support with all labels and messages
- **French**: Complete French translation (Français)

### Key Translations
| English | French | Usage |
|---------|--------|-------|
| Draft | Brouillon | Budget status |
| Active | Actif | Budget status |
| Inactive | Inactif | Budget status |
| Weekly | Hebdomadaire | Time period |
| Monthly | Mensuel | Time period |
| Quarterly | Trimestriel | Time period |
| Yearly | Annuel | Time period |
| % of Budget | % du Budget | Column header |

## Integration Points

### Database Integration
- **RelationalDatabase**: Core data management
- **RelationalFileStorage**: Persistent file storage
- **Table Management**: budgets and budget_line_items tables

### Context Integration
- **AccountingContext**: Database access and currency services
- **LanguageContext**: Multi-language support and translations

### Component Integration
- **Navigation**: Integrated with main application navigation
- **Currency Services**: Uses site-wide number formatting
- **Date Services**: Consistent date handling and formatting

## Testing Coverage

### Test Categories Available
- **Budget Setup - Database Schema**: Table structure validation
- **Budget Setup - CRUD Operations**: Create, read, update, delete testing
- **Budget Setup - Calculations**: Period normalization and percentage calculations
- **Budget Setup - Validation**: Input validation and business rules
- **Budget Setup - Status Management**: Single active budget enforcement

### Test Integration
- Integrated into Test Dashboard for visual test management
- Individual and group test execution capabilities
- Real-time test results with pass/fail status display

## File Structure

### Core Files
- **`src/components/BudgetSetup.jsx`** - Main component implementation
- **`src/components/BudgetSetup.css`** - Styling and visual design
- **`src/utils/budgetSetupTestRunner.test.js`** - Comprehensive test suite

### Translation Files
- **`src/translations/en.js`** - English translations
- **`src/translations/fr.js`** - French translations

### Documentation
- **`doc/BUDGET_SETUP_FUNCTIONALITY.md`** - This documentation
- **`doc/BUILD_NEW_FEATURE_GUIDE.md`** - Development guidelines reference

## Performance Considerations

### Optimization Features
- **Real-time Calculations**: Efficient period normalization algorithms
- **Memory Management**: Proper state management with React hooks
- **Database Efficiency**: Optimized table operations and batch updates
- **File Storage**: Asynchronous save operations with Promise.all()

### Responsive Design
- **Mobile-Friendly**: Compact design principles with max 12px spacing
- **Flexible Layout**: Responsive table and form layouts
- **Touch-Friendly**: Appropriate button sizing and touch targets

## Security & Data Integrity

### Data Protection
- **Input Validation**: All user inputs are validated before processing
- **Safe Database Operations**: Proper error handling and rollback capabilities
- **File Storage Security**: Secure file operations with error handling

### Business Rule Enforcement
- **Single Active Budget**: System-level enforcement prevents multiple active budgets
- **Referential Integrity**: Proper foreign key relationships maintained
- **Data Consistency**: Transactional updates ensure data consistency

## Future Enhancement Opportunities

### Potential Features
- **Budget Templates**: Predefined budget templates for quick setup
- **Budget Comparison**: Compare multiple budgets side-by-side
- **Budget vs Actual Reporting**: Track actual expenses against budget
- **Budget Alerts**: Notifications when approaching budget limits
- **Budget History**: Version history and change tracking
- **Recurring Budget Items**: Automatic line item suggestions
- **Budget Categories**: Group related line items together
- **Export/Import**: Budget data export and import capabilities

### Additional Status Types
- **`'archived'`**: For historical budgets no longer in use
- **`'pending_approval'`**: For multi-user approval workflows
- **`'template'`**: For reusable budget templates

## Troubleshooting

### Common Issues
1. **Currency not displaying**: Check numberFormatService availability
2. **Duplicate subcategories**: Validation prevents, but check for edge cases
3. **Percentage calculations incorrect**: Verify monthly normalization logic
4. **Status not updating**: Check database save operations
5. **Navigation issues**: Verify onNavigate prop functionality

### Error Handling
- All database operations wrapped in try-catch blocks
- User-friendly error messages with internationalization support
- Graceful fallbacks for service failures
- Console logging for debugging purposes

---

*Last Updated: January 2025*
*Version: 1.0*
*Author: Claude Code Assistant*