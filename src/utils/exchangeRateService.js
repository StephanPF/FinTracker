class ExchangeRateService {
  constructor(database) {
    this.database = database;
    this.numberFormatService = null;
  }

  setNumberFormatService(service) {
    this.numberFormatService = service;
  }

  // Get the current exchange rate between two currencies
  getExchangeRate(fromCurrencyId, toCurrencyId, date = null) {
    if (fromCurrencyId === toCurrencyId) {
      return 1.0;
    }

    const targetDate = date || new Date().toISOString().split('T')[0];
    const exchangeRates = this.database.getTable('exchange_rates');
    
    // Find direct rate - use most recent rate available regardless of date
    const directRate = exchangeRates
      .filter(rate => 
        rate.fromCurrencyId === fromCurrencyId && 
        rate.toCurrencyId === toCurrencyId
      )
      .sort((a, b) => new Date(b.date) - new Date(a.date))[0]; // Most recent rate

    if (directRate) {
      return directRate.rate;
    }

    // Find inverse rate - use most recent rate available regardless of date
    const inverseRate = exchangeRates
      .filter(rate => 
        rate.fromCurrencyId === toCurrencyId && 
        rate.toCurrencyId === fromCurrencyId
      )
      .sort((a, b) => new Date(b.date) - new Date(a.date))[0]; // Most recent rate

    if (inverseRate) {
      return 1 / inverseRate.rate;
    }

    // Try to find rate through base currency (USD)
    const baseCurrencyId = this.getBaseCurrencyId();
    if (baseCurrencyId && fromCurrencyId !== baseCurrencyId && toCurrencyId !== baseCurrencyId) {
      const fromToBase = this.getExchangeRate(fromCurrencyId, baseCurrencyId, date);
      const baseToTarget = this.getExchangeRate(baseCurrencyId, toCurrencyId, date);
      
      if (fromToBase && baseToTarget) {
        return fromToBase * baseToTarget;
      }
    }

    // Return null if no rate found
    return null;
  }

  // Convert amount from one currency to another
  convertAmount(amount, fromCurrencyId, toCurrencyId, date = null) {
    const rate = this.getExchangeRate(fromCurrencyId, toCurrencyId, date);
    if (rate === null) {
      throw new Error(`Exchange rate not found for ${fromCurrencyId} to ${toCurrencyId}`);
    }
    return amount * rate;
  }

  // Convert amount to base currency
  convertToBaseCurrency(amount, fromCurrencyId, date = null) {
    const baseCurrencyId = this.getBaseCurrencyId();
    if (fromCurrencyId === baseCurrencyId) {
      return amount;
    }
    return this.convertAmount(amount, fromCurrencyId, baseCurrencyId, date);
  }

  // Convert amount from base currency
  convertFromBaseCurrency(amount, toCurrencyId, date = null) {
    const baseCurrencyId = this.getBaseCurrencyId();
    if (toCurrencyId === baseCurrencyId) {
      return amount;
    }
    return this.convertAmount(amount, baseCurrencyId, toCurrencyId, date);
  }

  // Get the base currency ID from settings
  getBaseCurrencyId() {
    const settings = this.database.getTable('currency_settings');
    const userSettings = settings.find(s => s.userId === 'default');
    return userSettings ? userSettings.baseCurrencyId : 'CUR_001'; // Default to EUR
  }

  // Get currency information by ID
  getCurrency(currencyId) {
    const currencies = this.database.getTable('currencies');
    return currencies.find(c => c.id === currencyId);
  }

  // Get all active currencies
  getActiveCurrencies() {
    const currencies = this.database.getTable('currencies');
    return currencies.filter(c => c.isActive);
  }

  // Get currencies by type (fiat or crypto)
  getCurrenciesByType(type) {
    const currencies = this.getActiveCurrencies();
    return currencies.filter(c => c.type === type);
  }

  // Format amount with currency symbol
  formatAmount(amount, currencyId) {
    const currency = this.getCurrency(currencyId);
    if (!currency) {
      return amount.toString();
    }

    // Use NumberFormatService if available for proper per-currency formatting
    if (this.numberFormatService) {
      return this.numberFormatService.formatCurrency(amount, currencyId);
    }
    
    // Fallback to simple formatting if NumberFormatService not available
    const formatted = amount.toFixed(currency.decimalPlaces || 2);
    
    // For crypto, show symbol after amount
    if (currency.type === 'crypto') {
      return `${formatted} ${currency.symbol}`;
    }
    
    // For EUR, show symbol after amount (European convention)
    if (currency.code === 'EUR') {
      return `${formatted} ${currency.symbol}`;
    }
    
    // For other fiat currencies, show symbol before amount
    return `${currency.symbol}${formatted}`;
  }

  // Add or update exchange rate
  addExchangeRate(fromCurrencyId, toCurrencyId, rate, date = null, source = 'manual') {
    const exchangeRates = this.database.getTable('exchange_rates');
    const targetDate = date || new Date().toISOString().split('T')[0];
    
    // Generate unique ID
    const id = 'ER_' + (Date.now().toString() + Math.random().toString(36).substr(2, 5)).toUpperCase();
    
    const newRate = {
      id,
      fromCurrencyId,
      toCurrencyId,
      rate,
      date: targetDate,
      source,
      createdAt: new Date().toISOString()
    };

    exchangeRates.push(newRate);
    this.database.saveTableToWorkbook('exchange_rates');
    
    return newRate;
  }

  // Get historical rates for a currency pair
  getHistoricalRates(fromCurrencyId, toCurrencyId, days = 30) {
    const exchangeRates = this.database.getTable('exchange_rates');
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - days);

    return exchangeRates
      .filter(rate => 
        rate.fromCurrencyId === fromCurrencyId && 
        rate.toCurrencyId === toCurrencyId &&
        new Date(rate.date) >= startDate &&
        new Date(rate.date) <= endDate
      )
      .sort((a, b) => new Date(a.date) - new Date(b.date));
  }

  // Update base currency setting
  setBaseCurrency(currencyId) {
    const settings = this.database.getTable('currency_settings');
    let userSettings = settings.find(s => s.userId === 'default');
    
    if (userSettings) {
      userSettings.baseCurrencyId = currencyId;
      userSettings.lastRateUpdate = new Date().toISOString();
    } else {
      // Create new settings if they don't exist
      userSettings = {
        id: 'CS_001',
        userId: 'default',
        baseCurrencyId: currencyId,
        autoUpdateRates: false,
        rateUpdateFrequency: 'manual',
        lastRateUpdate: new Date().toISOString(),
        createdAt: new Date().toISOString()
      };
      settings.push(userSettings);
    }
    
    this.database.saveTableToWorkbook('currency_settings');
    return userSettings;
  }

  // Calculate portfolio total in base currency
  calculatePortfolioTotal(accounts) {
    const baseCurrencyId = this.getBaseCurrencyId();
    let total = 0;
    
    for (const account of accounts) {
      if (account.currencyId === baseCurrencyId) {
        total += account.balance || 0;
      } else {
        try {
          const convertedAmount = this.convertToBaseCurrency(account.balance || 0, account.currencyId);
          total += convertedAmount;
        } catch (error) {
          console.warn(`Could not convert account ${account.name} balance: ${error.message}`);
          // Use baseCurrencyValue as fallback if conversion fails
          total += account.baseCurrencyValue || 0;
        }
      }
    }
    
    return total;
  }

  // Get exchange rate with fallback to manual entry
  getExchangeRateWithFallback(fromCurrencyId, toCurrencyId, fallbackRate = null) {
    try {
      const rate = this.getExchangeRate(fromCurrencyId, toCurrencyId);
      if (rate !== null) {
        return rate;
      }
    } catch (error) {
      console.warn('Error getting exchange rate:', error);
    }

    // If fallback rate provided, use it and save it
    if (fallbackRate !== null) {
      this.addExchangeRate(fromCurrencyId, toCurrencyId, fallbackRate, null, 'manual');
      return fallbackRate;
    }

    // Return 1.0 as last resort (same currency assumption)
    return 1.0;
  }

  // Validate exchange rate (basic validation)
  validateExchangeRate(rate) {
    if (typeof rate !== 'number' || isNaN(rate) || rate <= 0) {
      throw new Error('Exchange rate must be a positive number');
    }
    if (rate > 1000000) {
      throw new Error('Exchange rate seems unreasonably high');
    }
    return true;
  }
}

export default ExchangeRateService;