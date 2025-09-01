# Bank Configuration Field Mappings

This document lists all the fields available for mapping in the Bank Configuration screen, organized by category and importance.

## Overview

The Bank Configuration Field Mapping section allows you to map CSV columns from your bank's export files to the transaction fields used in the accounting system. This ensures that when you import transactions, all the data from your CSV files is properly categorized and structured.

---

## Required Fields ⚠️

These fields **must** be mapped for successful transaction import:

| Field | Label | Description | Example CSV Column |
|-------|-------|-------------|-------------------|
| `date` | **Date** | Transaction date | "Transaction Date", "Date", "Posted Date" |
| `description` | **Description** | Transaction description/memo | "Description", "Memo", "Transaction Details" |
| `amount` | **Amount** | Transaction amount (signed) | "Amount", "Transaction Amount", "Net Amount" |

---

## Account & Transfer Fields

These fields handle account information and transfer transactions:

| Field | Label | Description | Example CSV Column |
|-------|-------|-------------|-------------------|
| `account` | Account | Account number or name | "Account Number", "Account Name", "From Account" |
| `destinationAccountId` | Destination Account | Destination account for transfers/investments | "To Account", "Destination Account", "Transfer To" |
| `destinationAmount` | Destination Amount | Amount for destination account (investments) | "Destination Amount", "Transfer Amount", "To Amount" |

---

## Amount Handling (Alternative)

For banks that use separate debit/credit columns instead of signed amounts:

| Field | Label | Description | Example CSV Column |
|-------|-------|-------------|-------------------|
| `debit` | Debit | Debit amount (separate column) | "Debit", "Withdrawal", "Outgoing" |
| `credit` | Credit | Credit amount (separate column) | "Credit", "Deposit", "Incoming" |

---

## Transaction Classification

These fields help categorize and classify transactions:

| Field | Label | Description | Example CSV Column |
|-------|-------|-------------|-------------------|
| `transactionType` | Transaction Type | Transaction type (Income, Expenses, Transfer, etc.) | "Transaction Type", "Category Type", "Type" |
| `transactionGroup` | Transaction Group | Transaction group within the type | "Group", "Subcategory Type", "Classification" |
| `category` | Category | Transaction category (legacy) | "Category", "Transaction Category", "Class" |
| `subcategoryId` | Subcategory | Transaction subcategory | "Subcategory", "Detail Category", "Subclass" |

---

## Parties & Relationships

These fields identify who was involved in the transaction:

| Field | Label | Description | Example CSV Column |
|-------|-------|-------------|-------------------|
| `payee` | Payee | Payee name (for expenses/investments) | "Payee", "Merchant", "Vendor", "Paid To" |
| `payer` | Payer | Payer name (for income/investments) | "Payer", "From", "Received From", "Client" |

---

## Additional Information

These fields provide extra transaction details and metadata:

| Field | Label | Description | Example CSV Column |
|-------|-------|-------------|-------------------|
| `reference` | Reference | Transaction ID/reference | "Reference", "Transaction ID", "Check Number", "Ref" |
| `tag` | Tag | Transaction tag | "Tag", "Label", "Marker" |
| `notes` | Notes | Additional transaction notes | "Notes", "Comments", "Memo", "Additional Info" |

---

## Field Mapping Examples

Here are some common bank CSV formats and how they might be mapped:

### American Express
```csv
Date,Description,Card Member,Account #,Amount
01/15/2024,"GROCERY STORE","JOHN DOE","1234","-45.67"
```

**Suggested Mappings:**
- Date → `date`
- Description → `description`  
- Amount → `amount`
- Card Member → `payer` (for personal expenses)
- Account # → `reference`

### Citibank
```csv
Date,Description,Debit,Credit,Balance
01/15/2024,"PAYROLL DEPOSIT","","2500.00","5432.10"
```

**Suggested Mappings:**
- Date → `date`
- Description → `description`
- Debit → `debit` 
- Credit → `credit`
- Balance → (not mapped - calculated by system)

### Custom Business Account
```csv
Transaction Date,Vendor,Category,Amount,Reference,Account
01/15/2024,"Office Supplies Inc","Business Expenses","-125.50","INV-2024-001","Business Checking"
```

**Suggested Mappings:**
- Transaction Date → `date`
- Vendor → `payee`
- Category → `transactionGroup`
- Amount → `amount`
- Reference → `reference`
- Account → `account`

---

## Field Mapping Best Practices

### 1. Required Fields First
Always map the three required fields (`date`, `description`, `amount`) before any optional fields.

### 2. Amount Handling
Choose between:
- **Single Amount Column**: Use `amount` field for signed amounts (positive = income, negative = expenses)
- **Separate Debit/Credit**: Use `debit` and `credit` fields when bank provides separate columns

### 3. Transaction Classification
For best categorization, try to map in this order:
1. `transactionType` (Income, Expenses, Transfer)
2. `transactionGroup` (Salary, Office Expenses, etc.)  
3. `subcategoryId` (Specific subcategory)

### 4. Party Information
- Use `payee` for expenses (who you paid)
- Use `payer` for income (who paid you)
- For transfers, these might represent account names

### 5. Reference Information
Map reference numbers, check numbers, or transaction IDs to the `reference` field for better transaction tracking.

---

## Advanced Settings Impact

Some Advanced Settings affect how field mappings are processed:

### Date Format
- **MM/DD/YYYY**: American format (01/15/2024)
- **DD/MM/YYYY**: European format (15/01/2024)
- **YYYY-MM-DD**: ISO format (2024-01-15)

### Amount Handling
- **Single signed amount column**: Use `amount` field mapping
- **Separate debit/credit columns**: Use `debit` and `credit` field mappings

### Currency
The default currency from Advanced Settings is applied to all imported transactions.

---

## Visual Mapping Status

The Bank Configuration form provides visual feedback:

| Status | Icon | Meaning |
|--------|------|---------|
| ✅ **Mapped** | ✓ | Field is successfully mapped to a CSV column |
| ⚪ **Unmapped** | ○ | Field is not mapped (optional for most fields) |
| 🔴 **Required Missing** | ○ + Red background | Required field is not mapped |

---

## Validation Rules

### Required Field Validation
- **Date**: Must be mapped and result in valid dates
- **Description**: Must be mapped and not be empty
- **Amount**: Must be mapped and result in valid numbers
  - OR both Debit and Credit must be mapped if using separate columns

### Optional Field Validation  
- All optional fields can be left unmapped
- Invalid data in optional fields will be ignored (set to empty)
- Numeric fields (like amounts) will be parsed and default to 0 if invalid

---

## Troubleshooting Common Issues

### Issue: "Missing or invalid date"
- **Check**: Date field is mapped to correct CSV column
- **Check**: Date format in Advanced Settings matches your CSV format
- **Fix**: Verify CSV column contains valid dates

### Issue: "Invalid amount"  
- **Check**: Amount field is mapped correctly
- **Check**: Amount Handling setting matches your CSV structure
- **Fix**: Ensure CSV amount column contains valid numbers

### Issue: "No account mapping"
- **Info**: This is a warning, not an error
- **Means**: You'll need to manually assign accounts during transaction review
- **Fix**: Map the `account` field if your CSV has account information

---

## Summary

The Bank Configuration Field Mapping system supports **17 different fields** covering all aspects of transaction data:

- **3 Required fields** (date, description, amount)
- **3 Account fields** (account, destinationAccountId, destinationAmount)  
- **2 Amount handling fields** (debit, credit)
- **4 Classification fields** (transactionType, transactionGroup, category, subcategoryId)
- **2 Party fields** (payee, payer)
- **3 Additional fields** (reference, tag, notes)

This comprehensive mapping system ensures that all valuable data from your bank's CSV exports is captured and properly structured in your accounting system.