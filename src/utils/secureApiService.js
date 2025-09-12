/**
 * Secure API Service Integration Example
 * 
 * This demonstrates how to integrate the credential manager with API services
 * that require authentication, while maintaining the personal use security model.
 */

import credentialManager from './credentialManager.js';

class SecureApiService {
  constructor() {
    this.initialized = false;
  }

  /**
   * Initialize the service with encrypted credential storage
   */
  async initialize() {
    if (!this.initialized) {
      await credentialManager.initialize();
      this.initialized = true;
    }
  }

  /**
   * Store API credentials securely
   */
  async setApiCredentials(provider, credentials) {
    await this.initialize();
    
    const credentialId = `api_${provider}_${Date.now()}`;
    await credentialManager.storeCredential(credentialId, JSON.stringify(credentials));
    
    return credentialId; // Return ID to store in database instead of raw credentials
  }

  /**
   * Retrieve API credentials securely
   */
  async getApiCredentials(credentialId) {
    if (!credentialId) {
      return null;
    }

    await this.initialize();
    
    const credentialsJson = await credentialManager.getCredential(credentialId);
    if (!credentialsJson) {
      return null;
    }

    try {
      return JSON.parse(credentialsJson);
    } catch (error) {
      console.error('Failed to parse stored credentials:', error);
      return null;
    }
  }

  /**
   * Make authenticated API call with secured credentials
   */
  async makeAuthenticatedRequest(credentialId, url, options = {}) {
    const credentials = await this.getApiCredentials(credentialId);
    if (!credentials) {
      throw new Error('No credentials found for API request');
    }

    // Add authentication to request options
    const authenticatedOptions = {
      ...options,
      headers: {
        ...options.headers,
        'Authorization': `Bearer ${credentials.apiKey}`,
        'X-API-Key': credentials.apiKey, // Alternative auth method
      }
    };

    return fetch(url, authenticatedOptions);
  }

  /**
   * Example: Secure exchange rate fetching with API key
   */
  async fetchSecureExchangeRates(credentialId, baseCurrency = 'USD') {
    try {
      const response = await this.makeAuthenticatedRequest(
        credentialId,
        `https://api.exchangerate-api.com/v4/latest/${baseCurrency}`
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return {
        success: true,
        rates: data.rates,
        base: data.base,
        timestamp: data.date
      };
    } catch (error) {
      console.error('Failed to fetch secure exchange rates:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Clear all stored credentials (for security or reset)
   */
  async clearAllCredentials() {
    await this.initialize();
    credentialManager.clearCredentials();
  }

  /**
   * Export encrypted credentials for backup
   */
  async exportCredentials() {
    await this.initialize();
    return credentialManager.exportCredentials();
  }

  /**
   * Import encrypted credentials from backup
   */
  async importCredentials(backupData) {
    await this.initialize();
    return credentialManager.importCredentials(backupData);
  }
}

// Example usage and integration guide
export const apiServiceUsageExample = {
  /**
   * How to integrate with existing API settings in the database
   */
  async updateDatabaseApiSettings(database, provider, apiKey) {
    const secureApi = new SecureApiService();
    
    // Store the API key securely and get a reference ID
    const credentialId = await secureApi.setApiCredentials(provider, {
      apiKey: apiKey,
      provider: provider
    });

    // Update database with credential reference instead of raw API key
    const apiSettings = database.getTable('api_settings');
    let setting = apiSettings.find(s => s.provider === provider);
    
    if (setting) {
      setting.credentialId = credentialId;
      setting.updatedAt = new Date().toISOString();
    } else {
      setting = {
        id: `API_${Date.now()}`,
        provider: provider,
        credentialId: credentialId,
        baseUrl: '',
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      apiSettings.push(setting);
    }

    database.saveTableToWorkbook('api_settings');
    return setting;
  },

  /**
   * How to use stored credentials for API calls
   */
  async makeApiCallWithStoredCredentials(database, provider) {
    const secureApi = new SecureApiService();
    
    // Get credential reference from database
    const apiSettings = database.getTable('api_settings');
    const setting = apiSettings.find(s => s.provider === provider);
    
    if (!setting || !setting.credentialId) {
      throw new Error(`No credentials configured for provider: ${provider}`);
    }

    // Use the secure API service to make authenticated calls
    return secureApi.fetchSecureExchangeRates(setting.credentialId);
  }
};

export default SecureApiService;