# Prepaid Expense Feature Implementation Guide

## Overview
Add prepaid expense tracking to allow users to defer or amortize expenses over time periods, providing accurate financial reporting based on when services are consumed rather than when payments are made.

## Database Schema Updates

### Add Fields to `transactions` Table
```javascript
{
  // Existing fields remain unchanged
  
  // New prepaid fields
  isPrepaid: false,                    // boolean (default: false)
  recognitionMethod: null,             // 'defer' | 'amortize' | 'defer_and_amortize'
  serviceStartDate: null,              // ISO date string (e.g., '2025-03-01')
  serviceEndDate: null,                // ISO date string (e.g., '2025-08-31')
  recognitionStatus: null,             // 'pending' | 'active' | 'completed'
  recognizedToDate: 0,                 // decimal (default: 0)
  remainingToRecognize: null           // decimal
}
```

## Recognition Methods

### 1. Defer
- **Use Case**: Flight booked in January for June travel
- **Recognition**: Full amount recognized on `serviceStartDate`
- **Required Fields**: `serviceStartDate`

### 2. Amortize
- **Use Case**: 4-month gym membership paid upfront
- **Recognition**: Spread evenly from transaction `date` to `serviceEndDate`
- **Required Fields**: `serviceEndDate`

### 3. Defer and Amortize
- **Use Case**: Annual insurance paid in January for March-February coverage
- **Recognition**: Spread evenly from `serviceStartDate` to `serviceEndDate`
- **Required Fields**: `serviceStartDate`, `serviceEndDate`

## UI Components

### 1. Transaction List Updates

#### Add Menu Option
```javascript
// In transaction row 3-dot menu
if (!transaction.isPrepaid) {
  menuOptions.push({
    label: 'Mark as Prepaid',
    icon: '🕐',
    onClick: () => openPrepaidModal(transaction)
  });
} else {
  menuOptions.push({
    label: 'Edit Prepaid',
    icon: '🕐',
    onClick: () => openPrepaidModal(transaction)
  });
}
```

#### Visual Indicators
- Add `🕐` icon next to amount for prepaid transactions
- Show status badge: `Pending` (gray), `Active` (blue), `Completed` (green)

### 2. Prepaid Modal Component

#### Modal State Management
```javascript
const [selectedMethod, setSelectedMethod] = useState(transaction.recognitionMethod || '');
const [serviceStartDate, setServiceStartDate] = useState(transaction.serviceStartDate || '');
const [serviceEndDate, setServiceEndDate] = useState(transaction.serviceEndDate || '');
const [preview, setPreview] = useState(null);
```

#### Modal Layout
```jsx
<Modal title="Configure Prepaid Expense">
  {/* Transaction Info (Read-only) */}
  <div className="transaction-info">
    <p>Transaction: {transaction.description}</p>
    <p>Amount: {formatCurrency(transaction.amount, transaction.currencyId)}</p>
    <p>Date: {formatDate(transaction.date)}</p>
  </div>

  {/* Recognition Method Selection */}
  <RadioGroup value={selectedMethod} onChange={setSelectedMethod}>
    <Radio value="defer">
      Defer expense
      <span className="help-text">Recognize full amount on service date</span>
    </Radio>
    <Radio value="amortize">
      Amortize expense
      <span className="help-text">Spread from payment date to service end</span>
    </Radio>
    <Radio value="defer_and_amortize">
      Defer and amortize
      <span className="help-text">Spread over service period</span>
    </Radio>
  </RadioGroup>

  {/* Dynamic Date Fields */}
  {selectedMethod === 'defer' && (
    <DatePicker
      label="Service Date"
      value={serviceStartDate}
      onChange={setServiceStartDate}
      min={transaction.date}
      required
    />
  )}

  {selectedMethod === 'amortize' && (
    <DatePicker
      label="Service End Date"
      value={serviceEndDate}
      onChange={setServiceEndDate}
      min={transaction.date}
      required
    />
  )}

  {selectedMethod === 'defer_and_amortize' && (
    <>
      <DatePicker
        label="Service Start Date"
        value={serviceStartDate}
        onChange={setServiceStartDate}
        min={transaction.date}
        required
      />
      <DatePicker
        label="Service End Date"
        value={serviceEndDate}
        onChange={setServiceEndDate}
        min={serviceStartDate || transaction.date}
        required
      />
    </>
  )}

  {/* Recognition Preview */}
  {preview && (
    <div className="preview-box">
      <h4>Recognition Preview</h4>
      <p>{preview.description}</p>
      <p>Monthly amount: {formatCurrency(preview.monthlyAmount)}</p>
      <p>Total months: {preview.months}</p>
    </div>
  )}

  {/* Action Buttons */}
  <div className="modal-actions">
    <Button onClick={onCancel}>Cancel</Button>
    {transaction.isPrepaid && (
      <Button onClick={removePrepaid} variant="secondary">
        Remove Prepaid
      </Button>
    )}
    <Button onClick={savePrepaid} variant="primary" disabled={!isValid}>
      Save
    </Button>
  </div>
</Modal>
```

## Recognition Calculation Logic

### Calculate Recognized Amount
```javascript
function calculateRecognizedAmount(transaction, currentDate) {
  const { amount, date, recognitionMethod, serviceStartDate, serviceEndDate } = transaction;
  
  switch (recognitionMethod) {
    case 'defer':
      return currentDate >= serviceStartDate ? amount : 0;
    
    case 'amortize': {
      const totalMonths = getMonthsBetween(date, serviceEndDate);
      const elapsedMonths = getMonthsBetween(date, currentDate);
      const monthlyAmount = amount / totalMonths;
      return Math.min(monthlyAmount * elapsedMonths, amount);
    }
    
    case 'defer_and_amortize': {
      if (currentDate < serviceStartDate) return 0;
      
      const totalMonths = getMonthsBetween(serviceStartDate, serviceEndDate);
      const elapsedMonths = getMonthsBetween(serviceStartDate, currentDate);
      const monthlyAmount = amount / totalMonths;
      return Math.min(monthlyAmount * elapsedMonths, amount);
    }
    
    default:
      return amount;
  }
}
```

### Update Recognition Status
```javascript
function updateRecognitionStatus(transaction, currentDate) {
  const recognizedAmount = calculateRecognizedAmount(transaction, currentDate);
  
  // Determine status
  let status;
  if (currentDate < (transaction.serviceStartDate || transaction.date)) {
    status = 'pending';
  } else if (recognizedAmount < transaction.amount) {
    status = 'active';
  } else {
    status = 'completed';
  }
  
  // Update transaction
  return {
    ...transaction,
    recognitionStatus: status,
    recognizedToDate: recognizedAmount,
    remainingToRecognize: transaction.amount - recognizedAmount
  };
}
```

### Preview Calculation
```javascript
function calculatePreview(amount, method, transactionDate, startDate, endDate) {
  let description, monthlyAmount, months;
  
  switch (method) {
    case 'defer':
      description = `Full ${formatCurrency(amount)} will be recognized on ${formatDate(startDate)}`;
      monthlyAmount = amount;
      months = 1;
      break;
    
    case 'amortize':
      months = getMonthsBetween(transactionDate, endDate);
      monthlyAmount = amount / months;
      description = `${formatCurrency(monthlyAmount)}/month from ${formatDate(transactionDate)} to ${formatDate(endDate)}`;
      break;
    
    case 'defer_and_amortize':
      months = getMonthsBetween(startDate, endDate);
      monthlyAmount = amount / months;
      description = `${formatCurrency(monthlyAmount)}/month from ${formatDate(startDate)} to ${formatDate(endDate)}`;
      break;
  }
  
  return { description, monthlyAmount, months };
}
```

## Validation Rules

### Date Validation
```javascript
function validatePrepaidDates(transaction, method, startDate, endDate) {
  const errors = [];
  
  // All service dates must be >= transaction date
  if (startDate && startDate < transaction.date) {
    errors.push('Service start date must be after transaction date');
  }
  
  if (endDate && endDate < transaction.date) {
    errors.push('Service end date must be after transaction date');
  }
  
  // End date must be after start date
  if (startDate && endDate && endDate <= startDate) {
    errors.push('Service end date must be after start date');
  }
  
  // Method-specific validation
  switch (method) {
    case 'defer':
      if (!startDate) errors.push('Service date is required');
      break;
    case 'amortize':
      if (!endDate) errors.push('Service end date is required');
      break;
    case 'defer_and_amortize':
      if (!startDate) errors.push('Service start date is required');
      if (!endDate) errors.push('Service end date is required');
      break;
  }
  
  return errors;
}
```

### Transaction Type Restrictions
```javascript
// Don't allow prepaid on transfers
if (transaction.categoryId === 'CAT_003') {
  throw new Error('Transfer transactions cannot be marked as prepaid');
}
```

## Save/Update Operations

### Save Prepaid Settings
```javascript
async function savePrepaidSettings(transactionId, prepaidData) {
  const updates = {
    isPrepaid: true,
    recognitionMethod: prepaidData.method,
    serviceStartDate: prepaidData.startDate || null,
    serviceEndDate: prepaidData.endDate || null,
    recognitionStatus: 'pending', // Will be recalculated
    recognizedToDate: 0,
    remainingToRecognize: null
  };
  
  // Update transaction
  await database.update('transactions', transactionId, updates);
  
  // Recalculate status
  const updated = await database.get('transactions', transactionId);
  const withStatus = updateRecognitionStatus(updated, new Date());
  await database.update('transactions', transactionId, withStatus);
}
```

### Remove Prepaid Settings
```javascript
async function removePrepaidSettings(transactionId) {
  const updates = {
    isPrepaid: false,
    recognitionMethod: null,
    serviceStartDate: null,
    serviceEndDate: null,
    recognitionStatus: null,
    recognizedToDate: 0,
    remainingToRecognize: null
  };
  
  await database.update('transactions', transactionId, updates);
}
```

## Batch Recognition Update
```javascript
// Run daily or on-demand to update all prepaid transaction statuses
async function updateAllPrepaidStatuses() {
  const prepaidTransactions = await database.query('transactions', {
    where: { isPrepaid: true }
  });
  
  const currentDate = new Date();
  
  for (const transaction of prepaidTransactions) {
    const updated = updateRecognitionStatus(transaction, currentDate);
    await database.update('transactions', transaction.id, {
      recognitionStatus: updated.recognitionStatus,
      recognizedToDate: updated.recognizedToDate,
      remainingToRecognize: updated.remainingToRecognize
    });
  }
}
```


## Testing Checklist

- [ ] Create transaction and mark as prepaid with each recognition method
- [ ] Verify date validation rules work correctly
- [ ] Test preview calculations for different date ranges
- [ ] Confirm recognition status updates correctly over time
- [ ] Test editing existing prepaid settings
- [ ] Test removing prepaid from transaction
- [ ] Verify prepaid fields export to Excel correctly
- [ ] Test importing transactions with prepaid settings
- [ ] Ensure Transfer transactions cannot be marked as prepaid
- [ ] Test batch status update function
- [ ] Verify visual indicators appear correctly in transaction list

## Future Enhancements

1. **Recurring Prepaid Templates**: Save common prepaid patterns (annual insurance, quarterly subscriptions)
2. **Recognition Reports**: Show upcoming recognition schedule and impact on future months
3. **Automated Detection**: Suggest prepaid treatment based on transaction descriptions
4. **Partial Recognition**: Allow manual adjustment of recognized amounts
5. **Multi-Currency Support**: Handle exchange rate changes over recognition period