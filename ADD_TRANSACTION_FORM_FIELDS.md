# Add Transaction Form - Required vs Optional Fields

This document analyzes the Add Transaction form validation logic to identify which fields are required vs optional, and under what conditions. This analysis is based on the actual form validation logic in `TransactionForm.jsx`.

---

## Always Required Fields ⚠️

These fields are **always required** regardless of transaction type:

| Field | FormData Key | Validation Logic | UI Indicator |
|-------|-------------|------------------|--------------|
| **Date** | `date` | Always required (handled by DatePicker) | Placeholder shows `*` |
| **Description** | `description` | `!formData.description` | Placeholder shows `*` |
| **Account** | `accountId` | `!formData.accountId` | Form validation error highlighting |
| **Amount** | `amount` | `!formData.amount` | Required for all transactions |
| **Subcategory** | `subcategoryId` | `!formData.subcategoryId` | Always required for classification |

---

## Conditionally Required Fields 🔄

These fields are required based on the selected **Transaction Type**:

### Transfer & Investment Transactions
| Field | FormData Key | Required When | Validation Logic |
|-------|-------------|---------------|------------------|
| **Destination Account** | `destinationAccountId` | Transfer, Investment-SELL, Investment-BUY | `shouldShowDestinationAccount(selectedTransactionType) && !formData.destinationAccountId` |

### Investment Transactions Only  
| Field | FormData Key | Required When | Validation Logic |
|-------|-------------|---------------|------------------|
| **Destination Amount** | `destinationAmount` | Investment-SELL, Investment-BUY | `isInvestmentTransaction(selectedTransactionType) && !formData.destinationAmount` |

### Transaction Type Specific Parties
| Field | FormData Key | Required When | Validation Logic |
|-------|-------------|---------------|------------------|
| **Payee** | `payee` | Expenses, Investment-BUY | `selectedTransactionType.name === 'Expenses' && !formData.payee` |
| **Payer** | `payer` | Income, Investment-SELL | `selectedTransactionType.name === 'Income' && !formData.payer` |

---

## Optional Fields (Never Required) ✅

These fields are **always optional** and will never cause validation errors:

| Field | FormData Key | Purpose | UI Behavior |
|-------|-------------|---------|-------------|
| **Reference** | `reference` | Transaction ID/reference number | Optional input field |
| **Notes** | `notes` | Additional transaction notes | Optional textarea |
| **Tag** | `tag` | Transaction tagging/categorization | Optional with autocomplete |
| **Broker** | `broker` | Investment broker information | Optional field |
| **Currency ID** | `currencyId` | Auto-set based on selected account | System managed |
| **Exchange Rate** | `exchangeRate` | Auto-calculated for multi-currency | System managed |

---

## Transaction Type Dependencies

### Helper Functions
The form uses these helper functions to determine field requirements:

```javascript
// Determines if destination account should be shown/required
const shouldShowDestinationAccount = (transactionType) => {
  return transactionType.name === 'Transfer' || 
         transactionType.name === 'Investment - SELL' || 
         transactionType.name === 'Investment - BUY';
};

// Determines if this is an investment transaction
const isInvestmentTransaction = (transactionType) => {
  return transactionType.name === 'Investment - SELL' || 
         transactionType.name === 'Investment - BUY';
};
```

### Field Requirements by Transaction Type

| Transaction Type | Required Fields | Additional Requirements |
|------------------|----------------|-------------------------|
| **Income** | Date, Description, Account, Amount, Subcategory, **Payer** | - |
| **Expenses** | Date, Description, Account, Amount, Subcategory, **Payee** | - |
| **Transfer** | Date, Description, Account, Amount, Subcategory, **Destination Account** | Source ≠ Destination, Same currency |
| **Investment-SELL** | Date, Description, Account, Amount, Subcategory, **Destination Account**, **Destination Amount**, **Payer** (broker) | Different currencies |
| **Investment-BUY** | Date, Description, Account, Amount, Subcategory, **Destination Account**, **Destination Amount**, **Payee** (broker) | Different currencies |

---

## Validation Logic Implementation

The form validation occurs in the `handleSubmit` function:

```javascript
const handleSubmit = async (e) => {
  // Check for missing required fields
  const missing = [];
  
  // Always required
  if (!formData.description) missing.push('description');
  if (!formData.accountId) missing.push('accountId');
  if (!formData.amount) missing.push('amount');
  if (!formData.subcategoryId) missing.push('subcategoryId');
  
  // Conditionally required based on transaction type
  if (shouldShowDestinationAccount(selectedTransactionType) && !formData.destinationAccountId) {
    missing.push('destinationAccountId');
  }
  if (isInvestmentTransaction(selectedTransactionType) && !formData.destinationAmount) {
    missing.push('destinationAmount');
  }
  if (selectedTransactionType.name === 'Income' && !formData.payer) {
    missing.push('payer');
  }
  if (selectedTransactionType.name === 'Expenses' && !formData.payee) {
    missing.push('payee');
  }
  // Investment broker validation
  if (isInvestmentTransaction(selectedTransactionType) && !formData.payee && !formData.payer) {
    if (selectedTransactionType.name === 'Investment - SELL') {
      missing.push('payer');
    } else if (selectedTransactionType.name === 'Investment - BUY') {
      missing.push('payee');
    }
  }
  
  // Set missing fields for UI error highlighting
  setMissingFields(missing);
  
  // Prevent submission if required fields are missing
  if (missing.length > 0) {
    setError('Please fill in all required fields');
    return;
  }
};
```

---

## Additional Validation Rules

### Currency Validation
- **Transfers**: Source and destination accounts must have the **same currency**
- **Investments**: Source and destination accounts must have **different currencies**

### Amount Validation  
- **All transactions**: Amount must be greater than zero
- **Investment transactions**: Destination amount must also be greater than zero

### Account Validation
- **Transfers/Investments**: Source account must be different from destination account

---

## UI Error Highlighting

Fields with missing required data receive the `field-error` CSS class:

```javascript
className={missingFields.includes('fieldName') ? 'field-error' : ''}
```

The `missingFields` state array contains the keys of all fields that failed validation.

---

## Summary for Import Transaction Status Logic

Based on this analysis, the **Import Transaction Review status logic should be updated** to align with the Add Transaction form requirements:

### ❌ ERROR Status (Cannot Import)
- Missing or invalid **date**
- Missing or invalid **description**  
- Missing or invalid **amount**
- Missing **subcategoryId** (transaction classification)

### ⚠️ WARNING Status (Requires Review)
- Missing **accountId** (will need manual account assignment)
- Transaction type-specific requirements missing:
  - Missing **payee** for Expenses
  - Missing **payer** for Income  
  - Missing **destinationAccountId** for Transfers/Investments
  - Missing **destinationAmount** for Investments
- Potential duplicates detected
- Additional mapped fields present (informational)

### ✅ READY Status (Can Import)  
- All required fields present and valid
- No validation warnings
- No duplicates detected
- Transaction meets all type-specific requirements

This alignment ensures that imported transactions will successfully pass through the Add Transaction form validation logic.