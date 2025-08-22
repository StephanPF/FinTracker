class CryptoRateService {
  constructor(database) {
    this.database = database;
    this.apiUrl = 'https://api.coingecko.com/api/v3/simple/price';
    this.lastUpdate = null;
    this.maxRetries = 3;
    this.isUpdating = false;
    this.lastAttempt = null;
    this.lastAttemptResult = null;
    
    // Map database currency codes to CoinGecko IDs
    this.currencyMap = {
      'BTC': 'bitcoin',
      'ETH': 'ethereum'
    };
  }

  // Get supported crypto currencies from database
  getSupportedCryptos() {
    const cryptos = this.database.getTable('currencies')
      .filter(currency => currency.type === 'crypto' && this.currencyMap[currency.code]);
    return cryptos;
  }

  // Fetch live crypto rates from CoinGecko
  async fetchCryptoRates(baseCurrencyCode = 'EUR', retryCount = 0) {
    const supportedCryptos = this.getSupportedCryptos();
    
    if (supportedCryptos.length === 0) {
      const result = { success: false, error: 'No supported cryptocurrencies found', retryCount: 0 };
      this.updateLastAttempt(result);
      return result;
    }

    try {
      this.isUpdating = true;
      if (retryCount === 0) {
        this.lastAttempt = new Date();
        this.lastAttemptResult = { status: 'attempting', retryCount: 0 };
      } else {
        this.lastAttemptResult = { status: 'retrying', retryCount };
      }

      // Build CoinGecko coin IDs list
      const coinIds = supportedCryptos
        .map(crypto => this.currencyMap[crypto.code])
        .join(',');

      // Build vs_currencies (base currency for conversion)
      const vsCurrency = baseCurrencyCode.toLowerCase();
      
      const url = `${this.apiUrl}?ids=${coinIds}&vs_currencies=${vsCurrency}&include_24hr_change=true&include_last_updated_at=true`;
      
      console.log('🪙 Fetching crypto rates from CoinGecko:', url);
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`CoinGecko API request failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      if (Object.keys(data).length > 0) {
        const ratesCount = await this.storeCryptoRates(data, baseCurrencyCode);
        this.lastUpdate = new Date();
        
        const result = {
          success: true,
          rates: data,
          timestamp: new Date().toISOString(),
          ratesCount: ratesCount,
          retryCount,
          source: 'coingecko'
        };
        this.updateLastAttempt(result);
        return result;
      } else {
        throw new Error('No crypto rate data received from CoinGecko');
      }
    } catch (error) {
      console.error('Failed to fetch crypto rates:', error);
      
      // Retry logic
      if (retryCount < this.maxRetries) {
        console.log(`Retrying crypto rates... (${retryCount + 1}/${this.maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, 2000 * (retryCount + 1))); // Exponential backoff
        return this.fetchCryptoRates(baseCurrencyCode, retryCount + 1);
      }
      
      const result = {
        success: false,
        error: error.message,
        fallbackUsed: true,
        retryCount,
        source: 'coingecko'
      };
      this.updateLastAttempt(result);
      return result;
    } finally {
      this.isUpdating = false;
    }
  }

  // Store crypto rates in database
  async storeCryptoRates(coinGeckoData, baseCurrencyCode) {
    const baseCurrency = this.getCurrencyByCode(baseCurrencyCode);
    if (!baseCurrency) {
      console.warn(`Base currency ${baseCurrencyCode} not found`);
      return 0;
    }

    const currentDate = new Date().toISOString().split('T')[0];
    const timestamp = new Date().toISOString();
    let ratesStored = 0;

    for (const [coinGeckoId, priceData] of Object.entries(coinGeckoData)) {
      // Find the crypto currency by CoinGecko ID
      const cryptoCode = Object.keys(this.currencyMap).find(
        code => this.currencyMap[code] === coinGeckoId
      );
      
      if (!cryptoCode) continue;
      
      const cryptoCurrency = this.getCurrencyByCode(cryptoCode);
      if (!cryptoCurrency) continue;

      const rate = priceData[baseCurrencyCode.toLowerCase()];
      if (!rate || rate <= 0) continue;

      // Remove old crypto rates for this pair (keep only latest)
      await this.removeOldCryptoRates(cryptoCurrency.id, baseCurrency.id);
      
      // Add new crypto rate
      await this.database.addExchangeRate({
        fromCurrencyId: cryptoCurrency.id,
        toCurrencyId: baseCurrency.id,
        rate: rate,
        date: currentDate,
        source: 'crypto-api',
        timestamp: timestamp,
        provider: 'coingecko',
        metadata: {
          change_24h: priceData[`${baseCurrencyCode.toLowerCase()}_24h_change`] || null,
          last_updated: priceData.last_updated_at || null
        }
      });
      
      ratesStored++;
      console.log(`💰 Stored ${cryptoCode}/${baseCurrencyCode} rate: ${rate}`);
    }

    return ratesStored;
  }

  // Remove old crypto API rates for a currency pair
  async removeOldCryptoRates(fromCurrencyId, toCurrencyId) {
    const existingRates = this.database.getTable('exchange_rates')
      .filter(rate => 
        rate.fromCurrencyId === fromCurrencyId && 
        rate.toCurrencyId === toCurrencyId && 
        rate.source === 'crypto-api'
      );
    
    for (const rate of existingRates) {
      this.database.deleteExchangeRate(rate.id);
    }
  }

  // Update last attempt tracking
  updateLastAttempt(result) {
    this.lastAttempt = new Date();
    this.lastAttemptResult = {
      ...result,
      timestamp: this.lastAttempt
    };
  }

  // Get currency by code
  getCurrencyByCode(code) {
    return this.database.getTable('currencies').find(currency => currency.code === code);
  }

  // Get service status
  getStatus() {
    const supportedCryptos = this.getSupportedCryptos();
    
    return {
      isConfigured: supportedCryptos.length > 0,
      isUpdating: this.isUpdating,
      lastUpdate: this.lastUpdate,
      lastAttempt: this.lastAttempt,
      lastAttemptResult: this.lastAttemptResult,
      supportedCryptos: supportedCryptos.map(c => c.code),
      provider: 'CoinGecko (Free)',
      rateLimit: '30-100 requests/minute'
    };
  }

  // Get rate freshness for crypto rates
  getCryptoRateFreshness() {
    const cryptoRates = this.database.getTable('exchange_rates')
      .filter(rate => rate.source === 'crypto-api');
    
    if (cryptoRates.length === 0) {
      return { status: 'no-crypto-rates', message: 'No live crypto rates available' };
    }

    const freshRates = cryptoRates.filter(rate => this.isRateFresh(rate, 1)).length;
    const recentRates = cryptoRates.filter(rate => this.isRateFresh(rate, 24)).length;
    
    if (freshRates === cryptoRates.length) {
      return { status: 'fresh', message: 'All crypto rates are current (< 1 hour)' };
    } else if (recentRates > 0) {
      return { status: 'recent', message: `${recentRates}/${cryptoRates.length} crypto rates are recent (< 24 hours)` };
    } else {
      return { status: 'stale', message: 'Crypto rates are outdated (> 24 hours)' };
    }
  }

  // Check if rate is fresh
  isRateFresh(rate, maxAgeHours = 24) {
    if (!rate.timestamp) return false;
    const rateTime = new Date(rate.timestamp);
    const now = new Date();
    const ageHours = (now - rateTime) / (1000 * 60 * 60);
    return ageHours < maxAgeHours;
  }
}

export default CryptoRateService;