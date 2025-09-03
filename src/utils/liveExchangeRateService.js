import ExchangeRateService from './exchangeRateService.js';

export class LiveExchangeRateService extends ExchangeRateService {
  constructor(database, apiSettings = null) {
    super(database);
    this.apiSettings = apiSettings;
    this.apiUrl = 'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies';
    this.fallbackUrl = 'https://latest.currency-api.pages.dev/v1/currencies';
    this.lastUpdate = null;
    this.updateInterval = 1000 * 60 * 60; // 1 hour default
    this.maxRetries = 3;
    this.intervalId = null;
    this.isUpdating = false;
    this.lastAttempt = null;
    this.lastAttemptResult = null;
  }

  // API Settings Management
  updateApiSettings(settings) {
    this.apiSettings = settings;
    this.updateSchedule();
  }

  isApiConfigured() {
    return true; // ExchangeRate.host requires no API key
  }

  // Rate Fetching
  async fetchLiveRates(baseCurrency = 'EUR', retryCount = 0) {
    try {
      this.isUpdating = true;
      if (retryCount === 0) {
        this.lastAttempt = new Date();
        this.lastAttemptResult = { status: 'attempting', retryCount: 0 };
      } else {
        this.lastAttemptResult = { status: 'retrying', retryCount };
      }
      
      const url = `${this.apiUrl}/${baseCurrency.toLowerCase()}.json`;
      console.log('🌐 Fetching forex rates from Currency-API (CORS-enabled):', url);
      
      // Simple fetch without custom headers to avoid CORS preflight
      let response = await fetch(url);
      
      // Try fallback URL if primary fails
      if (!response.ok && retryCount === 0) {
        console.log('⚠️ Primary URL failed, trying fallback...');
        const fallbackApiUrl = `${this.fallbackUrl}/${baseCurrency.toLowerCase()}.json`;
        response = await fetch(fallbackApiUrl);
      }
      
      console.log('📡 API Response Status:', response.status, response.statusText);
      
      if (!response.ok) {
        throw new Error(`Currency-API request failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log('📊 API Response Data:', data);
      console.log('📊 Rates object:', data[baseCurrency.toLowerCase()]);
      
      if (data && data[baseCurrency.toLowerCase()]) {
        const rates = data[baseCurrency.toLowerCase()];
        await this.storeLiveRates(rates, baseCurrency, new Date().toISOString());
        this.lastUpdate = new Date();
        
        const result = {
          success: true,
          rates: rates,
          timestamp: new Date().toISOString(),
          ratesCount: Object.keys(rates).length,
          retryCount,
          provider: 'Currency-API (GitHub)'
        };
        this.updateLastAttempt(result);
        return result;
      } else {
        console.error('❌ API Response Issue:', data);
        throw new Error(`API request failed - Invalid response format`);
      }
    } catch (error) {
      console.error('Failed to fetch live rates:', error);
      console.error('Error details:', error.message, error.stack);
      
      // Retry logic
      if (retryCount < this.maxRetries) {
        console.log(`Retrying... (${retryCount + 1}/${this.maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, 2000 * (retryCount + 1))); // Exponential backoff
        return this.fetchLiveRates(baseCurrency, retryCount + 1);
      }
      
      const result = {
        success: false,
        error: error.message,
        fallbackUsed: true,
        retryCount,
        provider: 'Currency-API (GitHub)'
      };
      this.updateLastAttempt(result);
      return result;
    } finally {
      this.isUpdating = false;
    }
  }

  updateLastAttempt(result) {
    this.lastAttempt = new Date();
    this.lastAttemptResult = {
      ...result,
      timestamp: this.lastAttempt
    };
  }

  async storeLiveRates(rates, baseCurrency, apiTimestamp) {
    const fromCurrency = this.getCurrencyByCode(baseCurrency);
    if (!fromCurrency) {
      console.warn(`❌ Base currency ${baseCurrency} not found in database`);
      return;
    }

    console.log(`💾 Storing rates for base currency: ${baseCurrency}`, fromCurrency);
    const currentDate = new Date().toISOString().split('T')[0];
    const timestamp = new Date().toISOString();
    
    // Remove ALL existing exchange rates for complete refresh
    await this.removeAllExchangeRates();
    
    let ratesStored = 0;

    for (const [currencyCode, rate] of Object.entries(rates)) {
      if (currencyCode === baseCurrency.toLowerCase()) continue; // Skip self-reference
      
      const toCurrency = this.getCurrencyByCode(currencyCode.toUpperCase());
      if (toCurrency) {
        console.log(`💰 Storing rate: ${baseCurrency} -> ${currencyCode.toUpperCase()} = ${rate}`);
        
        // Add new rate (unified API source for all currencies)
        await this.database.addExchangeRate({
          fromCurrencyId: fromCurrency.id,
          toCurrencyId: toCurrency.id,
          rate: rate,
          date: currentDate,
          source: 'api',
          timestamp: timestamp,
          apiTimestamp: apiTimestamp || timestamp,
          provider: 'Currency-API (GitHub)'
        });
        ratesStored++;
      } else {
        console.log(`⚠️ Currency ${currencyCode.toUpperCase()} not found in database, skipping...`);
      }
    }
    
    console.log(`✅ Stored ${ratesStored} exchange rates successfully`);
    
    // Final verification
    const finalRates = this.database.getTable('exchange_rates');
    console.log(`🔍 Final verification: ${finalRates.length} total rates in database`);
    console.log('📊 Final rates by source:', 
      finalRates.reduce((acc, rate) => {
        acc[rate.source] = (acc[rate.source] || 0) + 1;
        return acc;
      }, {})
    );
    
    return ratesStored;
  }

  async removeAllExchangeRates() {
    // Remove ALL exchange rates (API, manual, crypto-api - everything) for complete refresh
    const allExistingRates = this.database.getTable('exchange_rates');
    
    console.log(`🧹 Removing ALL ${allExistingRates.length} existing exchange rates before adding fresh ones`);
    console.log('📋 Existing rates by source:', 
      allExistingRates.reduce((acc, rate) => {
        acc[rate.source] = (acc[rate.source] || 0) + 1;
        return acc;
      }, {})
    );
    
    // Create a copy of the array to avoid iteration issues when deleting
    const ratesToDelete = [...allExistingRates];
    
    for (const rate of ratesToDelete) {
      console.log(`🗑️ Deleting rate: ${rate.id} (${rate.source})`);
      this.database.deleteExchangeRate(rate.id);
    }
    
    // Verify all rates are deleted
    const remainingRates = this.database.getTable('exchange_rates');
    console.log(`✅ After deletion: ${remainingRates.length} rates remaining`);
    if (remainingRates.length > 0) {
      console.warn('⚠️ Some rates were not deleted:', remainingRates);
    }
  }

  // Usage Tracking (not needed for free API, but kept for compatibility)
  incrementUsageCount() {
    // No-op - ExchangeRate.host is completely free
  }

  getApiUsageSettings() {
    // Return dummy data for compatibility
    return {
      currentMonth: new Date().toISOString().slice(0, 7),
      requestCount: 0,
      monthlyLimit: 999999, // Unlimited
      lastRequest: null
    };
  }

  saveApiUsageSettings(settings) {
    // No-op - no usage tracking needed
  }

  // Rate Freshness
  isRateFresh(rate, maxAgeHours = 24) {
    if (!rate.timestamp) return false;
    const rateTime = new Date(rate.timestamp);
    const now = new Date();
    const ageHours = (now - rateTime) / (1000 * 60 * 60);
    return ageHours < maxAgeHours;
  }

  getRateFreshness() {
    const apiRates = this.database.getTable('exchange_rates')
      .filter(rate => rate.source === 'api');
    
    if (apiRates.length === 0) {
      return { status: 'no-api-rates', message: 'No live rates available' };
    }

    const freshRates = apiRates.filter(rate => this.isRateFresh(rate, 1)).length;
    const recentRates = apiRates.filter(rate => this.isRateFresh(rate, 24)).length;
    
    if (freshRates === apiRates.length) {
      return { status: 'fresh', message: 'All rates are current (< 1 hour)' };
    } else if (recentRates > 0) {
      return { status: 'recent', message: `${recentRates}/${apiRates.length} rates are recent (< 24 hours)` };
    } else {
      return { status: 'stale', message: 'Rates are outdated (> 24 hours)' };
    }
  }

  // Enhanced Rate Retrieval with Fallbacks
  getExchangeRateWithFallback(fromCurrencyId, toCurrencyId, maxAgeHours = 24) {
    // 1. Try fresh API rate (< 1 hour)
    let rate = this.getApiRate(fromCurrencyId, toCurrencyId, 1);
    if (rate) return { rate: rate.rate, source: 'api-fresh', timestamp: rate.timestamp };

    // 2. Try recent API rate (< maxAgeHours)
    rate = this.getApiRate(fromCurrencyId, toCurrencyId, maxAgeHours);
    if (rate) return { rate: rate.rate, source: 'api-recent', timestamp: rate.timestamp };

    // 3. Fall back to manual rate
    rate = this.getManualRate(fromCurrencyId, toCurrencyId);
    if (rate) return { rate: rate.rate, source: 'manual', timestamp: rate.timestamp };

    // 4. Try reverse API rate
    rate = this.getApiRate(toCurrencyId, fromCurrencyId, maxAgeHours);
    if (rate && rate.rate > 0) return { rate: 1 / rate.rate, source: 'api-reverse', timestamp: rate.timestamp };

    // 5. Try reverse manual rate
    rate = this.getManualRate(toCurrencyId, fromCurrencyId);
    if (rate && rate.rate > 0) return { rate: 1 / rate.rate, source: 'manual-reverse', timestamp: rate.timestamp };

    return { rate: 1.0, source: 'fallback', timestamp: new Date().toISOString() };
  }

  getApiRate(fromCurrencyId, toCurrencyId, maxAgeHours) {
    const rates = this.database.getTable('exchange_rates')
      .filter(rate => 
        rate.fromCurrencyId === fromCurrencyId && 
        rate.toCurrencyId === toCurrencyId && 
        rate.source === 'api' &&
        this.isRateFresh(rate, maxAgeHours)
      );
    
    return rates.length > 0 ? rates.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0] : null;
  }

  getManualRate(fromCurrencyId, toCurrencyId) {
    const rates = this.database.getTable('exchange_rates')
      .filter(rate => 
        rate.fromCurrencyId === fromCurrencyId && 
        rate.toCurrencyId === toCurrencyId && 
        rate.source === 'manual'
      );
    
    return rates.length > 0 ? rates.sort((a, b) => new Date(b.date) - new Date(a.date))[0] : null;
  }

  getCurrencyByCode(code) {
    return this.database.getTable('currencies').find(currency => currency.code === code);
  }

  // Automatic Update Scheduling
  updateSchedule() {
    this.stopSchedule();
    
    if (!this.apiSettings || !this.apiSettings.autoUpdate) {
      return;
    }

    const intervals = {
      'hourly': 1000 * 60 * 60,      // 1 hour
      'daily': 1000 * 60 * 60 * 24,  // 24 hours
      'manual': null
    };

    const interval = intervals[this.apiSettings.frequency];
    if (interval) {
      console.log(`🕒 Scheduling automatic rate updates every ${this.apiSettings.frequency}`);
      this.intervalId = setInterval(() => {
        this.autoUpdateRates();
      }, interval);
      
      // Also update immediately if rates are stale
      const freshness = this.getRateFreshness();
      if (freshness.status === 'stale' || freshness.status === 'no-api-rates') {
        setTimeout(() => this.autoUpdateRates(), 5000); // Wait 5 seconds then update
      }
    }
  }

  stopSchedule() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('🛑 Stopped automatic rate updates');
    }
  }

  async autoUpdateRates() {
    if (this.isUpdating) {
      console.log('⏳ Rate update already in progress, skipping...');
      return;
    }

    console.log('🔄 Starting automatic rate update...');
    const result = await this.fetchLiveRates();
    
    if (result.success) {
      console.log(`✅ Updated ${result.ratesCount} exchange rates`);
    } else {
      console.error('❌ Automatic update failed:', result.error);
    }

    return result;
  }

  // Status and diagnostics
  getStatus() {
    const usage = this.getApiUsageSettings();
    const freshness = this.getRateFreshness();
    
    return {
      isConfigured: this.isApiConfigured(),
      isScheduled: this.intervalId !== null,
      isUpdating: this.isUpdating,
      lastUpdate: this.lastUpdate,
      lastAttempt: this.lastAttempt,
      lastAttemptResult: this.lastAttemptResult,
      usage: {
        current: usage.requestCount,
        limit: usage.monthlyLimit,
        percentage: 0 // Always 0 for unlimited
      },
      freshness: freshness,
      provider: 'Currency-API (GitHub)',
      apiKeyRequired: false,
      settings: this.apiSettings
    };
  }

  // Cleanup
  destroy() {
    this.stopSchedule();
  }
}

export default LiveExchangeRateService;