/**
 * Secure Credential Manager for Personal Accounting Application
 * 
 * This module provides secure storage and retrieval of sensitive credentials
 * such as API keys for external services, while being appropriate for 
 * personal use applications with local data storage.
 */

class CredentialManager {
  constructor() {
    this.storageKey = 'accounting_app_credentials';
    this.masterKey = null;
  }

  /**
   * Initialize credential manager with a master key derived from user input
   * For personal use, this could be a simple password or derived from system info
   */
  async initialize(masterPassword = null) {
    if (!masterPassword) {
      // For personal use, generate a simple key based on system/user info
      // This is more secure than plain text but not enterprise-level security
      masterPassword = this.generatePersonalMasterKey();
    }
    
    this.masterKey = await this.deriveKey(masterPassword);
    return this.masterKey;
  }

  /**
   * Generate a simple master key for personal use
   * This provides basic protection against casual access to credentials
   */
  generatePersonalMasterKey() {
    // Simple approach for personal use - combines user agent and hostname
    const userAgent = navigator.userAgent.slice(0, 20);
    const hostname = window.location.hostname || 'localhost';
    const timestamp = Date.now().toString().slice(-8);
    return `${userAgent}-${hostname}-${timestamp}`;
  }

  /**
   * Derive a key from the master password using a simple but effective method
   */
  async deriveKey(password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hash = await crypto.subtle.digest('SHA-256', data);
    return new Uint8Array(hash);
  }

  /**
   * Encrypt a credential using AES-GCM
   */
  async encryptCredential(plaintext) {
    if (!this.masterKey) {
      throw new Error('CredentialManager not initialized. Call initialize() first.');
    }

    const encoder = new TextEncoder();
    const data = encoder.encode(plaintext);
    
    // Generate a random IV for each encryption
    const iv = crypto.getRandomValues(new Uint8Array(12));
    
    // Import the master key for AES-GCM
    const key = await crypto.subtle.importKey(
      'raw',
      this.masterKey,
      { name: 'AES-GCM' },
      false,
      ['encrypt', 'decrypt']
    );
    
    // Encrypt the data
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: iv },
      key,
      data
    );
    
    // Combine IV and encrypted data
    const result = new Uint8Array(iv.length + encrypted.byteLength);
    result.set(iv, 0);
    result.set(new Uint8Array(encrypted), iv.length);
    
    // Convert to base64 for storage
    return btoa(String.fromCharCode.apply(null, result));
  }

  /**
   * Decrypt a credential
   */
  async decryptCredential(encryptedData) {
    if (!this.masterKey) {
      throw new Error('CredentialManager not initialized. Call initialize() first.');
    }

    try {
      // Convert from base64
      const data = new Uint8Array(
        atob(encryptedData).split('').map(char => char.charCodeAt(0))
      );
      
      // Extract IV and encrypted data
      const iv = data.slice(0, 12);
      const encrypted = data.slice(12);
      
      // Import the master key
      const key = await crypto.subtle.importKey(
        'raw',
        this.masterKey,
        { name: 'AES-GCM' },
        false,
        ['encrypt', 'decrypt']
      );
      
      // Decrypt the data
      const decrypted = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: iv },
        key,
        encrypted
      );
      
      // Convert back to string
      const decoder = new TextDecoder();
      return decoder.decode(decrypted);
    } catch (error) {
      console.error('Failed to decrypt credential:', error);
      throw new Error('Failed to decrypt credential. Invalid master key or corrupted data.');
    }
  }

  /**
   * Store encrypted credentials in localStorage
   */
  async storeCredentials(credentials) {
    const encrypted = {};
    
    for (const [key, value] of Object.entries(credentials)) {
      if (value && value.trim() !== '') {
        encrypted[key] = await this.encryptCredential(value);
      } else {
        encrypted[key] = ''; // Don't encrypt empty values
      }
    }
    
    localStorage.setItem(this.storageKey, JSON.stringify(encrypted));
    return encrypted;
  }

  /**
   * Retrieve and decrypt credentials from localStorage
   */
  async retrieveCredentials() {
    const stored = localStorage.getItem(this.storageKey);
    if (!stored) {
      return {};
    }

    try {
      const encrypted = JSON.parse(stored);
      const decrypted = {};
      
      for (const [key, value] of Object.entries(encrypted)) {
        if (value && value !== '') {
          decrypted[key] = await this.decryptCredential(value);
        } else {
          decrypted[key] = ''; // Empty values are not encrypted
        }
      }
      
      return decrypted;
    } catch (error) {
      console.error('Failed to retrieve credentials:', error);
      return {};
    }
  }

  /**
   * Store a single credential
   */
  async storeCredential(key, value) {
    const existing = await this.retrieveCredentials();
    existing[key] = value;
    return await this.storeCredentials(existing);
  }

  /**
   * Retrieve a single credential
   */
  async getCredential(key) {
    const credentials = await this.retrieveCredentials();
    return credentials[key] || '';
  }

  /**
   * Clear all stored credentials
   */
  clearCredentials() {
    localStorage.removeItem(this.storageKey);
  }

  /**
   * Check if credentials exist
   */
  hasStoredCredentials() {
    return localStorage.getItem(this.storageKey) !== null;
  }

  /**
   * Backup credentials to a file (encrypted)
   */
  async exportCredentials() {
    const credentials = localStorage.getItem(this.storageKey);
    if (!credentials) {
      throw new Error('No credentials to export');
    }

    const backup = {
      version: '1.0',
      timestamp: new Date().toISOString(),
      credentials: credentials,
      note: 'Encrypted credential backup for personal accounting application'
    };

    return JSON.stringify(backup, null, 2);
  }

  /**
   * Restore credentials from backup file
   */
  async importCredentials(backupData) {
    try {
      const backup = JSON.parse(backupData);
      if (backup.version !== '1.0' || !backup.credentials) {
        throw new Error('Invalid backup format');
      }

      localStorage.setItem(this.storageKey, backup.credentials);
      return true;
    } catch (error) {
      console.error('Failed to import credentials:', error);
      throw new Error('Failed to import credentials. Invalid backup file.');
    }
  }
}

// Export singleton instance for personal use
const credentialManager = new CredentialManager();
export default credentialManager;

// Also export the class for testing or advanced use
export { CredentialManager };