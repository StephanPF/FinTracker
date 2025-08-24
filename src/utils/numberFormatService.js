class NumberFormatService {
  constructor(database) {
    this.database = database;
  }

  // Get user's currency formatting preferences for a specific currency
  getCurrencyPreferences(currencyId, userId = 'default') {
    return this.database.getCurrencyFormatPreferences(currencyId, userId);
  }

  // Get all currency formatting preferences
  getAllCurrencyPreferences(userId = 'default') {
    return this.database.getAllCurrencyFormatPreferences(userId);
  }

  // Update user's currency formatting preferences for a specific currency
  updateCurrencyPreferences(currencyId, settings, userId = 'default') {
    return this.database.updateCurrencyFormatPreferences(currencyId, settings, userId);
  }

  // Get currency by ID
  getCurrency(currencyId) {
    const currencies = this.database.getTable('currencies');
    return currencies.find(c => c.id === currencyId);
  }

  // Format a number with separators
  formatNumber(number, preferences) {
    const absNumber = Math.abs(number);
    let formattedNumber = '';

    // Handle large number notation
    if (preferences.largeNumberNotation === 'compact' && absNumber >= 1000) {
      return this.formatCompactNumber(number, preferences);
    } else if (preferences.largeNumberNotation === 'scientific' && absNumber >= 1000000) {
      return this.formatScientificNumber(number, preferences);
    }

    // Convert to string with appropriate decimal places
    const numberString = absNumber.toString();
    const parts = numberString.split('.');
    const integerPart = parts[0];
    const decimalPart = parts[1] || '';

    // Apply thousands separator
    const formattedInteger = this.applyThousandsSeparator(integerPart, preferences.thousandsSeparator);
    
    // Handle decimal part
    let formattedDecimal = decimalPart;
    if (formattedDecimal.length > 0) {
      const decimalSep = preferences.decimalSeparator === 'comma' ? ',' : '.';
      formattedNumber = formattedInteger + decimalSep + formattedDecimal;
    } else {
      formattedNumber = formattedInteger;
    }

    // Handle negative numbers
    if (number < 0) {
      formattedNumber = this.applyNegativeFormatting(formattedNumber, preferences.negativeDisplay);
    }

    return formattedNumber;
  }

  // Apply thousands separator
  applyThousandsSeparator(integerString, separatorType) {
    if (separatorType === 'none') return integerString;
    
    const separator = separatorType === 'comma' ? ',' : 
                     separatorType === 'dot' ? '.' : 
                     separatorType === 'space' ? ' ' : ',';
    
    return integerString.replace(/\B(?=(\d{3})+(?!\d))/g, separator);
  }

  // Apply negative number formatting
  applyNegativeFormatting(numberString, negativeDisplay) {
    switch (negativeDisplay) {
      case 'parentheses':
        return `(${numberString})`;
      case 'red':
        return `<span style="color: red;">-${numberString}</span>`;
      default:
        return `-${numberString}`;
    }
  }

  // Format compact numbers (1.23K, 1.23M, etc.)
  formatCompactNumber(number, preferences) {
    const absNumber = Math.abs(number);
    let value, suffix;
    
    if (absNumber >= 1e9) {
      value = number / 1e9;
      suffix = 'B';
    } else if (absNumber >= 1e6) {
      value = number / 1e6;
      suffix = 'M';
    } else if (absNumber >= 1e3) {
      value = number / 1e3;
      suffix = 'K';
    } else {
      return this.formatNumber(number, preferences);
    }

    const decimalSep = preferences.decimalSeparator === 'comma' ? ',' : '.';
    return value.toFixed(2).replace('.', decimalSep) + suffix;
  }

  // Format scientific notation
  formatScientificNumber(number, preferences) {
    const decimalSep = preferences.decimalSeparator === 'comma' ? ',' : '.';
    return number.toExponential(2).replace('.', decimalSep);
  }

  // Main currency formatting function
  formatCurrency(amount, currencyId, options = {}) {
    const currency = this.getCurrency(currencyId);
    if (!currency) {
      return amount.toString();
    }

    const preferences = this.getCurrencyPreferences(currencyId);
    
    // Apply any option overrides
    const formatOptions = {
      currencySymbolPosition: options.symbolPosition || preferences.currencySymbolPosition,
      decimalSeparator: options.decimalSeparator || preferences.decimalSeparator,
      thousandsSeparator: options.thousandsSeparator || preferences.thousandsSeparator,
      decimalPrecision: options.precision || preferences.decimalPrecision,
      negativeDisplay: options.negativeDisplay || preferences.negativeDisplay,
      largeNumberNotation: options.largeNumberNotation || preferences.largeNumberNotation,
      currencyCodeDisplay: options.currencyCodeDisplay || preferences.currencyCodeDisplay
    };

    // Determine decimal places
    let decimalPlaces;
    switch (formatOptions.decimalPrecision) {
      case 'fixed-2':
        decimalPlaces = 2;
        break;
      case 'fixed-4':
        decimalPlaces = 4;
        break;
      case 'smart':
        decimalPlaces = this.getSmartDecimalPlaces(amount);
        break;
      default: // 'auto'
        decimalPlaces = currency.decimalPlaces || 2;
    }

    // Format the number part
    const fixedAmount = parseFloat(amount).toFixed(decimalPlaces);
    const formattedAmount = this.formatNumber(parseFloat(fixedAmount), formatOptions);

    // Use the symbol position from preferences (no auto-detection needed)
    const symbolPosition = formatOptions.currencySymbolPosition;

    // Build currency symbol/code display
    let currencyDisplay = '';
    switch (formatOptions.currencyCodeDisplay) {
      case 'code-only':
        currencyDisplay = currency.code;
        break;
      case 'both':
        currencyDisplay = symbolPosition === 'before' ? 
          `${currency.symbol} (${currency.code})` : 
          `(${currency.code}) ${currency.symbol}`;
        break;
      case 'contextual':
        // Use symbol for base currency, code for others
        const baseCurrency = this.getBaseCurrency();
        currencyDisplay = (baseCurrency && currency.id === baseCurrency.id) ? 
          currency.symbol : currency.code;
        break;
      default: // 'symbol-only'
        currencyDisplay = currency.symbol;
    }

    // Combine amount with currency display
    if (symbolPosition === 'after') {
      return `${formattedAmount} ${currencyDisplay}`;
    } else {
      // Special case for AED - always include space after symbol when positioned before
      if (currency.code === 'AED') {
        return `${currencyDisplay} ${formattedAmount}`;
      }
      return `${currencyDisplay}${formattedAmount}`;
    }
  }

  // Get smart decimal places based on amount magnitude
  getSmartDecimalPlaces(amount) {
    const absAmount = Math.abs(amount);
    if (absAmount >= 1000) return 0;
    if (absAmount >= 100) return 1;
    if (absAmount >= 1) return 2;
    return 4;
  }

  // Get base currency from settings
  getBaseCurrency() {
    const currencySettings = this.database.getTable('currency_settings');
    const userSettings = currencySettings.find(s => s.userId === 'default');
    const baseCurrencyId = userSettings ? userSettings.baseCurrencyId : 'CUR_001';
    
    const currencies = this.database.getTable('currencies');
    return currencies.find(c => c.id === baseCurrencyId);
  }

  // Format amount for a specific locale preset
  formatWithLocalePreset(amount, currencyId, locale = 'US') {
    const presets = {
      'US': {
        currencySymbolPosition: 'before',
        decimalSeparator: 'dot',
        thousandsSeparator: 'comma',
        negativeDisplay: 'minus'
      },
      'EU': {
        currencySymbolPosition: 'after',
        decimalSeparator: 'comma',
        thousandsSeparator: 'dot',
        negativeDisplay: 'minus'
      },
      'UK': {
        currencySymbolPosition: 'before',
        decimalSeparator: 'dot',
        thousandsSeparator: 'comma',
        negativeDisplay: 'minus'
      },
      'IN': {
        currencySymbolPosition: 'before',
        decimalSeparator: 'dot',
        thousandsSeparator: 'comma',
        negativeDisplay: 'minus'
      }
    };

    const preset = presets[locale] || presets['US'];
    return this.formatCurrency(amount, currencyId, preset);
  }

  // Get formatting preview for a specific currency
  getCurrencyFormattingPreview(currencyId, amount = 1234.56) {
    try {
      return {
        positive: this.formatCurrency(Math.abs(amount), currencyId),
        negative: this.formatCurrency(-Math.abs(amount), currencyId),
        large: this.formatCurrency(1234567.89, currencyId),
        small: this.formatCurrency(0.1234, currencyId)
      };
    } catch (error) {
      console.error('Failed to generate currency preview:', error);
      return {
        positive: 'Error',
        negative: 'Error', 
        large: 'Error',
        small: 'Error'
      };
    }
  }

  // Get formatting preview for all currencies  
  getAllCurrencyFormattingPreviews() {
    const currencies = this.database.getTable('currencies');
    const previews = {};
    
    currencies.forEach(currency => {
      previews[currency.id] = this.getCurrencyFormattingPreview(currency.id);
    });
    
    return previews;
  }
}

export default NumberFormatService;