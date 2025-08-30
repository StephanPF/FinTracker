# CSV Transaction Import Feature - UX Design

## Overview
A comprehensive transaction import system that allows users to import CSV files from their banks with drag-and-drop functionality, field mapping, queue management, and approval workflow.

## User Experience Flow

### 1. Bank Configuration Screen (One-time Setup)

**Access**: Located in Settings page (accessible via hamburger menu)

**Interface**: Card-based layout showing configured banks with "Add Bank" button

**Bank Setup Flow**:
- Select bank from comprehensive preset list or "Custom"
- Upload sample CSV to auto-detect column structure
- Visual field mapper with drag-and-drop columns to transaction fields
- Configure additional options (date format, amount handling, etc.)
- Preview mapping with sample data
- Save configuration with custom name

**Preset Bank Templates**:
- Major US Banks: Chase, Bank of America, Wells Fargo, Citibank, US Bank
- Credit Unions: Navy Federal, USAA, Alliant, Pentagon Federal
- Online Banks: Ally, Capital One 360, Marcus, Discover Bank
- Credit Cards: American Express, Discover, Capital One
- Investment: Fidelity, Vanguard, Charles Schwab, E*TRADE
- International: HSBC, Deutsche Bank, Royal Bank of Canada
- Fintech: PayPal, Venmo, Cash App, Zelle
- Business: QuickBooks, FreshBooks, Xero export formats

**Key Fields to Map**:
- Date (required)
- Description/Memo (required)
- Amount/Debit/Credit (required)
- Account Number
- Reference/Transaction ID
- Check Number
- Category/Type
- Balance (running balance)
- Merchant/Payee
- Location/Address

**Advanced Configuration Options**:
- **Date Format**: MM/DD/YYYY, DD/MM/YYYY, YYYY-MM-DD, custom format
- **Amount Handling**: 
  - Single signed amount column
  - Separate debit/credit columns
  - Positive = debit vs positive = credit
- **Currency Settings**:
  - Default currency for this bank
  - Multi-currency support (separate currency column)
- **Header Detection**: First row contains headers vs starts with data
- **Encoding**: UTF-8, Windows-1252, ASCII
- **Delimiter**: Comma, semicolon, tab, pipe
- **Text Qualifier**: Double quotes, single quotes, none
- **Skip Rows**: Number of rows to skip at beginning/end
- **Account Mapping**: Map bank account numbers to system accounts

### 2. Import Workflow (Main Process)

**Entry Point**: "+ Import Transactions" button in top navigation bar

**Import Page Layout**: Dedicated page that opens when clicking the import button

**Step 1 - Bank Selection**:
- Dropdown or card selection of preconfigured banks from Settings
- If no banks configured, show message with link to Settings page
- Selected bank shows preview of expected CSV format

**Step 2 - File Drop Zone**:
- Large drag-and-drop area showing selected bank's logo/name
- File validation with immediate feedback
- Support multiple files simultaneously
- File format validation (CSV, XLS, XLSX)
- Shows expected format based on selected bank configuration

**Step 3 - Auto-Processing**:
- Progress indicator during parsing
- Automatic duplicate detection against existing transactions
- Currency conversion using current rates
- Smart categorization based on description patterns

### 3. Review Queue Interface

**Layout**: Split view - imported transactions list (left) + preview pane (right)

**Color Coding**:
- 🟢 Green: Ready to import
- 🟡 Yellow: Needs attention (missing account mapping, etc.)
- 🔴 Red: Errors/conflicts
- 🔵 Blue: Duplicate detected

**Bulk Actions**:
- Select all checkbox
- Approve selected button
- Reject selected button
- Apply category to selected

**Individual Actions**:
- Edit button (pencil icon)
- Approve button (checkmark)
- Reject button (X)
- Skip button (forward arrow)

**Filters**:
- Status filter (All, Ready, Needs Attention, Errors, Duplicates)
- Date range filter
- Amount range filter

### 4. Transaction Preview & Editing

**Quick Edit Modal**: Click any transaction to modify fields

**Editable Fields**:
- Description
- Amount
- Category
- From/To Accounts
- Date
- Reference
- Notes
- Tags

**Smart Suggestions**:
- Auto-suggest accounts based on transaction patterns
- Category suggestions based on description keywords
- Duplicate detection with merge options

**Account Mapping**:
- If "from/to" accounts missing, provide dropdown with existing accounts
- Option to create new accounts on-the-fly
- Remember mappings for future imports

### 5. Final Import Confirmation

**Summary Screen**:
- Shows counts: Approved: X, Rejected: Y, Total: Z
- Total amount to be imported
- Currency breakdown
- Date range of transactions

**Final Review**:
- Expandable list of transactions to be imported
- Last chance to cancel before committing to database
- Option to save as draft for later completion

**Progress Feedback**:
- Import progress bar with success/error counts
- Success message with summary
- Option to view imported transactions

## Technical Considerations

### File Processing
- Support for various CSV formats and encodings
- Robust parsing with error handling
- Memory-efficient processing for large files

### Duplicate Detection
- Match on amount + date + description similarity
- Configurable matching rules
- Option to merge or skip duplicates

### Data Validation
- Required field validation
- Amount format validation
- Date format validation
- Account existence validation

### Error Handling
- Clear error messages with suggested fixes
- Partial import capability (import valid rows, flag invalid)
- Export error report for failed transactions

## Key UX Principles Applied

### Progressive Disclosure
Start simple (drop file) → gradually reveal options as needed

### Error Prevention
- Validation at each step before proceeding
- Clear visual indicators for transaction status
- Confirmation dialogs for destructive actions

### Feedback Loop
- Real-time validation feedback
- Progress indicators for long operations
- Success/error notifications

### Efficiency
- Bulk operations for power users
- Individual control when needed
- Keyboard shortcuts for common actions

### Accessibility
- Clear visual hierarchy
- Color coding with text labels
- Keyboard navigation support

## Implementation Phases

### Phase 1: Basic Import
- Simple CSV upload
- Manual field mapping
- Basic transaction creation

### Phase 2: Enhanced UX
- Drag-and-drop interface
- Bank configuration system
- Smart duplicate detection

### Phase 3: Advanced Features
- Bulk operations
- Advanced filtering
- Import history and audit trail

### Phase 4: Automation
- Scheduled imports
- API integration with banks
- Machine learning for categorization

## UI Mockup Structure

```
Import Settings Page:
┌─────────────────────────────────────────┐
│ [+ Add Bank Configuration]              │
│                                         │
│ ┌─────────┐ ┌─────────┐ ┌─────────┐    │
│ │ Chase   │ │Wells F. │ │ Custom  │    │
│ │ [Edit]  │ │ [Edit]  │ │ [Edit]  │    │
│ └─────────┘ └─────────┘ └─────────┘    │
└─────────────────────────────────────────┘

Import Page:
┌─────────────────────────────────────────┐
│ Select Bank: [Chase ▼]                  │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │     Drop CSV files here             │ │
│ │     or click to browse              │ │
│ └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘

Review Queue:
┌──────────────────┬──────────────────────┐
│ Transactions     │ Preview              │
│ [Filters ▼]      │                      │
│ ☑ Select All     │ Amount: $123.45      │
│                  │ Date: 2024-01-15     │
│ 🟢 Transaction 1 │ Description: Store   │
│ 🟡 Transaction 2 │ Category: [Select▼]  │
│ 🔴 Transaction 3 │ Account: Checking    │
│                  │ [Edit] [Approve]     │
└──────────────────┴──────────────────────┘
```

## Open Questions for Refinement

1. Should we support scheduled/automatic imports?
2. How should we handle multi-currency transactions?
3. What level of bank integration should we target?
4. Should we support importing from other accounting software?
5. How should we handle transaction splits/multi-line entries?