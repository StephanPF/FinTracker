# Currency Addition Impact Areas

When adding a new currency like the Swiss Franc, here are all the areas that will be impacted in your accounting system:

## Database/Storage Areas
- **Currency Table** - Add new CHF currency record with symbol, code, name, etc.
- **Exchange Rates Table** - Add exchange rate entries for CHF to base currency
- **Accounts Table** - Can assign CHF as currency for new accounts
- **Transactions Table** - Can use CHF in multi-currency transactions

## User Interface Areas
- **Data Management > Currencies** - Form to add/edit CHF currency
- **Data Management > Accounts** - CHF appears in currency dropdown when creating accounts
- **Add Transaction Form** - CHF appears in currency selector
- **Transaction Quick Entry** - CHF symbol shows in amount field when CHF account selected
- **Overview Page** - CHF amounts displayed with proper symbol and conversion
- **Account Balances** - CHF accounts show with CHF symbol
- **Transaction Lists** - CHF transactions display with CHF formatting

## Functionality Areas
- **Exchange Rate Service** - Handles CHF conversions and rate lookups
- **Currency Formatting** - CHF amounts formatted with proper decimal places and symbol
- **Multi-Currency Calculations** - CHF included in portfolio totals and conversions
- **Reporting** - CHF amounts converted to base currency for aggregated reports
- **Data Validation** - CHF validates against currency constraints

## Translation Areas
- **Currency Names** - "Swiss Franc" translations in English/French language files
- **Currency Display** - Proper formatting for CHF in different locales

## Notes
The system is already designed to handle multiple currencies, so adding CHF should work seamlessly through the existing Data Management > Currencies interface.