# Multi-Currency Support Design

## Overview
This document outlines the design and implementation approach for adding multi-currency support to the Personal Finance Tracker application. The system needs to handle various currencies including fiat currencies (EUR, USD, MAD) and cryptocurrencies (ETH, BTC, etc.).

## Current State
- Single currency system (no currency field in accounts)
- All amounts stored as simple numbers
- No currency conversion or exchange rate handling

## Database Schema Changes

### Modified Tables

#### Accounts Table (`accounts.xlsx`)
```javascript
{
  id: 'ACC_001',
  name: 'Checking Account',
  accountTypeId: 'AT_001',
  balance: 1500.00,
  currency: 'EUR',                    // NEW: Currency code
  baseCurrencyValue: 1650.00,        // NEW: Value in base currency
  lastUpdated: '2025-08-21T10:00:00Z' // NEW: Last balance update
}
```

#### Transactions Table (`transactions.xlsx`)
```javascript
{
  id: 'TXN_001',
  date: '2025-08-21',
  description: 'Grocery shopping',
  amount: 75.50,
  currency: 'EUR',                    // NEW: Transaction currency
  exchangeRate: 1.10,                 // NEW: Rate used (if conversion)
  baseCurrencyAmount: 83.05,          // NEW: Amount in base currency
  debitAccountId: 'ACC_001',
  creditAccountId: 'ACC_002',
  // ... existing fields
}
```

### New Tables

#### Currencies Table (`currencies.xlsx`)
```javascript
{
  id: 'CUR_001',
  code: 'EUR',
  name: 'Euro',
  symbol: '€',
  type: 'fiat',                       // 'fiat' or 'crypto'
  decimalPlaces: 2,
  isActive: true,
  createdAt: '2025-08-21T10:00:00Z'
}
```

#### Exchange Rates Table (`exchange_rates.xlsx`)
```javascript
{
  id: 'ER_001',
  fromCurrency: 'EUR',
  toCurrency: 'USD',
  rate: 1.10,
  date: '2025-08-21',
  source: 'manual',                   // 'manual', 'api', 'calculated'
  createdAt: '2025-08-21T10:00:00Z'
}
```

#### Currency Settings Table (`currency_settings.xlsx`)
```javascript
{
  id: 'CS_001',
  userId: 'default',                  // For future multi-user support
  baseCurrency: 'USD',                // User's preferred base currency
  autoUpdateRates: false,             // Enable automatic rate updates
  rateUpdateFrequency: 'daily',       // 'manual', 'daily', 'hourly'
  lastRateUpdate: '2025-08-21T10:00:00Z',
  createdAt: '2025-08-21T10:00:00Z'
}
```

## Transaction Handling

### Transaction Types

1. **Same Currency Transactions**
   - Standard transactions within same currency
   - No conversion needed
   - Exchange rate = 1.0

2. **Cross-Currency Transactions**
   - Transfer between accounts with different currencies
   - Requires exchange rate at transaction time
   - Record both original and converted amounts

3. **Currency Exchange Transactions**
   - Dedicated transaction type for buying/selling currencies
   - Special handling for exchange fees
   - Update exchange rate records

### Implementation Approach

```javascript
// Example transaction creation with currency handling
const createTransaction = (transactionData) => {
  const debitAccount = getAccount(transactionData.debitAccountId);
  const creditAccount = getAccount(transactionData.creditAccountId);
  
  if (debitAccount.currency !== creditAccount.currency) {
    // Cross-currency transaction
    const exchangeRate = getCurrentExchangeRate(
      debitAccount.currency, 
      creditAccount.currency
    );
    
    // Calculate converted amount
    const convertedAmount = transactionData.amount * exchangeRate;
    
    // Store both original and converted amounts
    return {
      ...transactionData,
      currency: debitAccount.currency,
      exchangeRate: exchangeRate,
      convertedAmount: convertedAmount,
      baseCurrencyAmount: convertToBaseCurrency(transactionData.amount, debitAccount.currency)
    };
  }
  
  // Same currency transaction
  return {
    ...transactionData,
    currency: debitAccount.currency,
    exchangeRate: 1.0,
    baseCurrencyAmount: convertToBaseCurrency(transactionData.amount, debitAccount.currency)
  };
};
```

## Display & User Interface

### Account Display
```
Primary Display:    €1,500.00 EUR
Secondary Display:  (≈ $1,650.00 USD)
```

### Transaction List
- Show amounts in original currency by default
- Toggle option to view all amounts in base currency
- Clear indication when currency conversion occurred

### Summary/Reports
- Portfolio total always in base currency
- Breakdown by currency available
- Historical performance adjusted for exchange rate changes

## Exchange Rate Management

### Rate Sources
1. **Manual Entry**
   - Simple input form for exchange rates
   - Good for offline usage or custom rates
   - User responsible for accuracy

2. **API Integration** (Future Enhancement)
   - Integrate with services like ExchangeRate-API
   - Automatic daily/hourly updates
   - Historical rate storage

3. **Calculated Rates**
   - Cross-rate calculations (EUR→MAD via USD)
   - Useful when direct rates unavailable

### Special Considerations

#### Cryptocurrency Handling
- Higher volatility requires more frequent updates
- Consider real-time rate display warnings
- Multiple decimal places (8+ for some cryptos)

#### Offline Capability
- Cache recent exchange rates
- Graceful degradation when rates unavailable
- Manual rate entry as fallback

#### Historical Accuracy
- Store exchange rate used at transaction time
- Never retroactively change transaction amounts
- Separate current vs. historical rate views

## User Experience Features

### Currency Selection
```javascript
// Currency picker component
<CurrencySelector 
  value={selectedCurrency}
  onChange={setCurrency}
  filterBy="fiat" // or "crypto" or "all"
  showSymbol={true}
/>
```

### Base Currency Settings
- User preference for primary currency
- All portfolio totals shown in base currency
- Easy switching between currency views

### Exchange Rate Display
```
Current Rate: 1 EUR = 1.10 USD
Last Updated: 2025-08-21 10:00 AM
Source: Manual Entry
```

## Implementation Phases

### Phase 1: Basic Multi-Currency
- Add currency field to accounts
- Support manual exchange rates
- Update transaction forms
- Basic currency conversion

### Phase 2: Enhanced Features
- Exchange rate history
- Cross-currency transaction support
- Improved reporting with currency breakdown

### Phase 3: Advanced Features
- API integration for live rates
- Cryptocurrency support
- Advanced portfolio analytics
- Multi-currency budgeting

## Technical Considerations

### Data Migration
- Add currency field to existing accounts (default to USD)
- Backfill exchange rates for historical data
- Maintain backward compatibility

### Performance
- Cache frequently used exchange rates
- Optimize currency conversion calculations
- Consider indexing on currency fields

### Validation
- Ensure valid currency codes
- Validate exchange rates (positive, reasonable ranges)
- Handle edge cases (zero amounts, missing rates)

### Error Handling
- Graceful handling of missing exchange rates
- Clear error messages for currency mismatches
- Fallback to manual rate entry

## Sample Currency Data

### Common Fiat Currencies
```javascript
const commonCurrencies = [
  { code: 'EUR', name: 'Euro', symbol: '€', type: 'fiat', isBase: true },
  { code: 'USD', name: 'US Dollar', symbol: '$', type: 'fiat' },
  { code: 'AED', name: 'UAE Dirham', symbol: 'AED', type: 'fiat' },
  { code: 'GBP', name: 'British Pound', symbol: '£', type: 'fiat' },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$', type: 'fiat' }
];
```

### Common Cryptocurrencies
```javascript
const commonCryptos = [
  { code: 'BTC', name: 'Bitcoin', symbol: '₿', type: 'crypto', decimals: 8 },
  { code: 'ETH', name: 'Ethereum', symbol: 'Ξ', type: 'crypto', decimals: 18 },
  { code: 'ADA', name: 'Cardano', symbol: 'ADA', type: 'crypto', decimals: 6 }
];
```

## Future Enhancements

### Advanced Features
- Multi-currency budgeting
- Currency hedging tracking
- Real-time portfolio value updates
- Exchange rate alerts/notifications

### Integration Possibilities
- Banking API integration
- Crypto wallet connections
- Investment platform synchronization
- Tax reporting with currency conversion

### Analytics
- Currency exposure analysis
- Exchange rate impact on portfolio
- Best/worst performing currencies
- Historical currency trends

---

**Implementation Priority:** Medium-High
**Complexity:** High
**Dependencies:** UI updates, database schema changes, new business logic
**Estimated Development Time:** 3-4 weeks for Phase 1

This design provides a comprehensive foundation for multi-currency support while maintaining the simplicity and Excel-based storage approach of the current system.