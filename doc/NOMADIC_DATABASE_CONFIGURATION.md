# Nomadic Database Configuration

This document outlines the specialized database configuration designed for nomadic lifestyle financial management.

## Overview

The nomadic database preset is specifically tailored for digital nomads, remote workers, and travelers who need to track expenses across multiple locations and currencies while maintaining a location-independent lifestyle.

## Configuration Details

### Database Preset: `nomadic`

**Activation**: Selected during database creation via the Database Configuration Modal.

**Languages Supported**:
- English
- French (Français)

## Transaction Groups

The nomadic configuration includes **17 specialized transaction groups** organized into five main categories:

### 💸 Expense Groups (10 Groups)

All expense groups are linked to **Transaction Type: Expenses (`CAT_002`)**

| ID | Name | Description | Color |
|----|------|-------------|--------|
| `GRP_001` | **Housing & Accommodation** | Hotels, Airbnb, co-living spaces, temporary housing | `#ef4444` (Red) |
| `GRP_002` | **Transportation** | Flights, trains, buses, ride-sharing, car rentals | `#f97316` (Orange) |
| `GRP_003` | **Food & Dining** | Restaurants, groceries, delivery, local cuisines | `#eab308` (Yellow) |
| `GRP_004` | **Homeschooling & Education** | Online courses, tutoring, educational materials, skills development | `#22c55e` (Green) |
| `GRP_005` | **Health & Insurance** | Medical expenses, travel insurance, health services | `#06b6d4` (Cyan) |
| `GRP_006` | **Travel & Adventure** | Tourism, activities, experiences, entertainment | `#8b5cf6` (Purple) |
| `GRP_007` | **Personal & Family Expenses** | Personal care, family support, gifts, clothing | `#ec4899` (Pink) |
| `GRP_008` | **Technology & Connectivity** | Internet, mobile data, devices, software subscriptions | `#6366f1` (Indigo) |
| `GRP_009` | **Financial & Administrative** | Banking fees, taxes, legal services, bureaucracy | `#64748b` (Slate) |
| `GRP_010` | **Miscellaneous** | Other expenses, unexpected costs, emergency funds | `#78716c` (Stone) |

### 💰 Income Groups (2 Groups)

Both income groups are linked to **Transaction Type: Income (`CAT_001`)**

| ID | Name | Description | Color |
|----|------|-------------|--------|
| `GRP_011` | **Professional & Business** | Remote work, freelancing, consulting, business income | `#10b981` (Emerald) |
| `GRP_012` | **Investment & Savings** | Investment returns, dividends, savings interest | `#059669` (Emerald Dark) |

### 📈 Investment Sale Groups (2 Groups)

Investment Sale groups are linked to **Transaction Type: Investment Sale (`CAT_004`)**

| ID | Name | Description | Color |
|----|------|-------------|--------|
| `GRP_013` | **Crypto Sale** | Cryptocurrency sales, crypto to fiat conversions | `#f59e0b` (Amber) |
| `GRP_014` | **TradFi Sale** | Traditional finance sales, stocks, bonds, mutual funds | `#dc2626` (Red) |

### 📊 Investment Purchase Groups (2 Groups)

Investment Purchase groups are linked to **Transaction Type: Investment Purchase (`CAT_005`)**

| ID | Name | Description | Color |
|----|------|-------------|--------|
| `GRP_015` | **Crypto Purchase** | Cryptocurrency purchases, fiat to crypto conversions | `#16a34a` (Green) |
| `GRP_016` | **TradFi Purchase** | Traditional finance purchases, stocks, bonds, mutual funds | `#0d9488` (Teal) |

### 🔄 Transfer Groups (1 Group)

Transfer group is linked to **Transaction Type: Transfer (`CAT_003`)**

| ID | Name | Description | Color |
|----|------|-------------|--------|
| `GRP_017` | **Bank Transfer** | Internal transfers between accounts and currencies | `#2196F3` (Blue) |

## French Translation

The nomadic configuration supports French translations:

### Expense Groups (French)
- **Logement & Hébergement** - Housing & Accommodation
- **Transport** - Transportation  
- **Nourriture & Restauration** - Food & Dining
- **Éducation & Formation** - Homeschooling & Education
- **Santé & Assurance** - Health & Insurance
- **Voyage & Aventure** - Travel & Adventure
- **Dépenses Personnelles & Familiales** - Personal & Family Expenses
- **Technologie & Connectivité** - Technology & Connectivity
- **Financier & Administratif** - Financial & Administrative
- **Divers** - Miscellaneous

### Income Groups (French)
- **Professionnel & Affaires** - Professional & Business
- **Investissement & Épargne** - Investment & Savings

### Investment Sale Groups (French)
- **Vente Crypto** - Crypto Sale
- **Vente TradFi** - TradFi Sale

### Investment Purchase Groups (French)
- **Achat Crypto** - Crypto Purchase
- **Achat TradFi** - TradFi Purchase

### Transfer Groups (French)
- **Virement Bancaire** - Bank Transfer

## Key Features

### ✅ **Nomadic-Specific Categories**
- **Location Independence**: Categories designed for location-independent expenses
- **Multi-Currency Support**: Built for handling expenses across different countries
- **Remote Work Focus**: Dedicated categories for digital nomad income sources

### ✅ **Comprehensive Coverage**
- **Housing Flexibility**: Covers temporary accommodations (hotels, Airbnb, co-living)
- **Transportation**: All modes of nomadic transportation
- **Education**: Online learning and skill development for nomads
- **Technology**: Essential connectivity and digital tools
- **Health**: Travel insurance and international healthcare

### ✅ **Financial Management**
- **Administrative Costs**: Banking fees, taxes, visa costs
- **Emergency Planning**: Miscellaneous category for unexpected expenses
- **Investment Tracking**: Separate categories for different income sources

## Implementation Details

### Database Generation
```javascript
// Database creation with nomadic preset
createNewDatabase(language, 'nomadic')

// Transaction groups generation
generateTransactionGroups(language, 'nomadic')
```

### Preset Selection
Users can select the nomadic configuration through the **Database Configuration Modal** when creating a new database:

- **Default Configuration**: Standard categories for general use
- **Nomadic Configuration**: Specialized categories for nomadic lifestyle

### Subcategories
```javascript
// Nomadic subcategories are now fully implemented
generateSubcategories(language, 'nomadic') // Returns: 66 subcategories organized by transaction groups
```

The nomadic configuration includes **66 detailed subcategories** that provide granular expense tracking across all 17 transaction groups. Each subcategory is specifically designed for nomadic lifestyle needs.

#### Subcategory Structure

**Housing & Accommodation (3 subcategories)**
- Accommodation Rentals: Airbnb, VRBO, monthly leases, apartments, houses, and all accommodation rentals
- Utilities & Internet: Wi-Fi, hotspots, utility fees
- Accommodation Incidentals: Cleaning fees, deposits

**Transportation (6 subcategories)**
- Flights & Air Travel: International/domestic flights
- Ground Transport: Rental cars, rideshares, taxis
- Fuel: Gasoline and diesel for vehicles
- Public Transportation: Trains, metro, ferries
- Vehicle Maintenance: Repairs, insurance, oil changes
- Travel Insurance: Trip coverage and emergency protection

**Food & Dining (4 subcategories)**
- Groceries: Cooking supplies and food shopping
- Dining Out: Restaurants, cafes, street food
- Snacks & On-the-Go Food: Travel day meals
- Special Diets: Dietary restrictions and supplements

**Homeschooling & Education (5 subcategories)**
- Curriculum Materials: Textbooks, online courses
- School & Educational Tools: Laptops, tablets, apps
- Supplies: Notebooks, pens, art supplies
- Tutoring or Classes: Local classes, online tutors
- Field Trip Expenses: Museums, cultural experiences

**Health & Insurance (4 subcategories)**
- Health Insurance: Travel/international coverage
- Medical Expenses: Doctor visits, medications
- Preventive Care: Vaccines, health checkups
- Dental & Vision: Routine and emergency care

**Travel & Adventure (3 subcategories)**
- Activities & Excursions: Tours, adventure sports
- Entry Fees: Parks, attractions, local sites
- Gear & Equipment: Backpacks, camping gear

**Personal & Family Expenses (6 subcategories)**
- Clothing: Weather-appropriate travel gear
- Toiletries: Personal care items
- Laundry: Laundromat fees, detergent
- Gifts & Souvenirs: Destination mementos
- Family Gifts: Special occasion presents
- Birthdays: Celebration expenses

**Technology & Connectivity (4 subcategories)**
- Devices: Phone, tablet, laptop repairs
- Subscriptions: Streaming, cloud storage, VPNs
- Mobile Data & SIM Cards: Local/international connectivity
- Tech Accessories: Chargers, adapters, power banks

**Financial & Administrative (4 subcategories)**
- Banking Fees: Currency conversion, ATM fees
- Visas & Permits: Tourist visas, work permits
- Taxes & Legal Fees: Tax prep, legal services
- Emergency Fund: Unexpected expense savings

**Miscellaneous (3 subcategories)**
- Childcare & Entertainment: Toys, babysitting
- Charity & Donations: Local community contributions
- Unexpected Costs: Lost items, fines, misc expenses

**Professional & Business Income (4 subcategories)**
- Remote Work Salary: Regular employment income
- Freelancing: Project-based payments
- Consulting: Advisory service income
- Business Income: Online business revenue

**Investment & Savings Income (3 subcategories)**
- Investment Returns: Portfolio and fund returns
- Dividends: Stock dividend payments
- Savings Interest: Bank account interest

**Investment Sale Groups (7 subcategories)**
- **Crypto Sale**: Bitcoin Sales, Ethereum Sales, Altcoin Sales, Crypto-to-Fiat Conversions
- **TradFi Sale**: Stock Sales, Bond Sales, Mutual Fund Sales

**Investment Purchase Groups (7 subcategories)**
- **Crypto Purchase**: Bitcoin Purchases, Ethereum Purchases, Altcoin Purchases, Fiat-to-Crypto Conversions
- **TradFi Purchase**: Stock Purchases, Bond Purchases, Mutual Fund Purchases

**Bank Transfer (3 subcategories)**
- Account to Account Transfer: Internal account transfers
- Currency Exchange Transfer: Multi-currency transfers
- International Wire Transfer: Cross-border transfers

## Use Cases

### 🎯 **Perfect For:**
- Digital nomads and remote workers
- Frequent travelers and location-independent professionals
- People living temporarily in multiple countries
- Families traveling long-term or homeschooling while traveling
- Freelancers and consultants working from various locations

### 📊 **Tracking Benefits:**
- **Geographic Spending**: Track expenses by location and trip
- **Currency Management**: Handle multi-currency transactions
- **Tax Planning**: Separate business and personal expenses for tax purposes
- **Budget Planning**: Plan budgets for different countries and regions
- **Lifestyle Analysis**: Understand spending patterns across nomadic lifestyle

## Recent Enhancements

✅ **Subcategories Implemented**: 66 detailed subcategories now available across all transaction groups
✅ **Multi-Language Support**: Complete French translations for all subcategories  
✅ **Investment Categories**: Full crypto and traditional finance subcategories
✅ **Ethereum Support**: Dedicated Ethereum subcategories for both buying and selling

## Future Enhancements

- **Geographic Tagging**: Integration with location-based expense tracking
- **Currency Analytics**: Enhanced multi-currency reporting  
- **Travel Planning**: Budget forecasting for new destinations
- **Location-Specific Subcategories**: Country or region-specific expense categories
- **Seasonal Budgeting**: Budget templates for different travel seasons

---

*This configuration was specifically designed to meet the unique financial tracking needs of the nomadic lifestyle, providing comprehensive coverage for location-independent living expenses and income sources.*