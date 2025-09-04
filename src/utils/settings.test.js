// Settings Tests - Comprehensive testing for all settings functionality
import RelationalDatabase from './relationalDatabase.js'

// Mock XLSX module for browser environment
const mockXLSX = {
  utils: {
    json_to_sheet: () => ({ '!ref': 'A1:C10' }),
    aoa_to_sheet: () => ({ '!ref': 'A1:C1' }),
    book_new: () => ({ Sheets: {}, SheetNames: [] }),
    book_append_sheet: (workbook, worksheet, name) => {
      workbook.Sheets[name] = worksheet;
      if (!workbook.SheetNames.includes(name)) {
        workbook.SheetNames.push(name);
      }
    },
    writeFile: () => {},
    sheet_to_json: () => []
  },
  readFile: () => ({ SheetNames: [], Sheets: {} })
};

window.XLSX = mockXLSX;

// Test execution utilities
const testExpect = {
  toBe: (actual, expected) => {
    if (actual !== expected) {
      throw new Error(`Expected ${actual} to be ${expected}`);
    }
  },
  toEqual: (actual, expected) => {
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
      throw new Error(`Expected ${JSON.stringify(actual)} to equal ${JSON.stringify(expected)}`);
    }
  },
  toBeDefined: (actual) => {
    if (actual === undefined) {
      throw new Error(`Expected value to be defined`);
    }
  },
  toBeUndefined: (actual) => {
    if (actual !== undefined) {
      throw new Error(`Expected value to be undefined`);
    }
  },
  toContain: (actual, expected) => {
    if (!actual.toString().includes(expected)) {
      throw new Error(`Expected "${actual}" to contain "${expected}"`);
    }
  },
  toThrow: (fn) => {
    let threw = false;
    try {
      fn();
    } catch (error) {
      threw = true;
    }
    if (!threw) {
      throw new Error('Expected function to throw an error');
    }
  },
  toBeGreaterThan: (actual, expected) => {
    if (actual <= expected) {
      throw new Error(`Expected ${actual} to be greater than ${expected}`);
    }
  },
  toBeTruthy: (actual) => {
    if (!actual) {
      throw new Error(`Expected ${actual} to be truthy`);
    }
  },
  toBeFalsy: (actual) => {
    if (actual) {
      throw new Error(`Expected ${actual} to be falsy`);
    }
  }
};

// Settings Tests
export const createSettingsTests = (expectObj) => {
  let db;
  
  // Use the expect object passed in or fallback to global expect from testRunner
  const expect = expectObj || (typeof window !== 'undefined' && window.expect) || testExpect;
  
  const beforeEach = () => {
    db = new RelationalDatabase();
    db.createNewDatabase('en');
  };

  return [
    // =================== DATE SETTINGS ===================
    {
      id: 'settings-date-format-update',
      suite: 'Settings - Date Settings',
      name: 'should update date format preferences',
      description: 'Updates date format and stores in user preferences',
      expectedBehavior: 'Date format preference should be saved and retrievable',
      testFunction: () => {
        beforeEach();
        
        const newPreferences = {
          dateFormat: 'MM/DD/YYYY',
          timeFormat: '12h',
          firstDayOfWeek: 'sunday',
          timezone: 'America/New_York'
        };
        
        // Update preferences
        db.updateUserPreferences('date_formatting', newPreferences);
        
        // Retrieve and verify
        const savedPrefs = db.getUserPreferences().find(p => p.category === 'date_formatting');
        expect.toBeDefined(savedPrefs);
        
        const settings = typeof savedPrefs.settings === 'string' 
          ? JSON.parse(savedPrefs.settings) 
          : savedPrefs.settings;
          
        expect.toBe(settings.dateFormat, 'MM/DD/YYYY');
        expect.toBe(settings.timeFormat, '12h');
        expect.toBe(settings.firstDayOfWeek, 'sunday');
        expect.toBe(settings.timezone, 'America/New_York');
      }
    },
    
    {
      id: 'settings-date-format-validation',
      suite: 'Settings - Date Settings',
      name: 'should validate date format options',
      description: 'Ensures only valid date formats are accepted',
      expectedBehavior: 'Should accept valid date formats and handle invalid ones',
      testFunction: () => {
        beforeEach();
        
        const validFormats = [
          'DD/MM/YYYY',
          'MM/DD/YYYY', 
          'YYYY-MM-DD',
          'DD.MM.YYYY',
          'DD-MM-YYYY',
          'MMM DD, YYYY',
          'DD MMM YYYY',
          'MMMM DD, YYYY'
        ];
        
        validFormats.forEach(format => {
          const preferences = {
            dateFormat: format,
            timeFormat: '24h',
            firstDayOfWeek: 'monday'
          };
          
          // Should not throw error for valid formats
          db.updateUserPreferences('date_formatting', preferences);
          
          const saved = db.getUserPreferences().find(p => p.category === 'date_formatting');
          const settings = typeof saved.settings === 'string' ? JSON.parse(saved.settings) : saved.settings;
          expect.toBe(settings.dateFormat, format);
        });
      }
    },
    
    {
      id: 'settings-time-format-toggle',
      suite: 'Settings - Date Settings',
      name: 'should toggle between 12h and 24h time formats',
      description: 'Allows switching between 12-hour and 24-hour time display',
      expectedBehavior: 'Time format should be switchable and persistent',
      testFunction: () => {
        beforeEach();
        
        // Set to 12h format
        db.updateUserPreferences('date_formatting', {
          dateFormat: 'DD/MM/YYYY',
          timeFormat: '12h'
        });
        
        let saved = db.getUserPreferences().find(p => p.category === 'date_formatting');
        let settings = typeof saved.settings === 'string' ? JSON.parse(saved.settings) : saved.settings;
        expect.toBe(settings.timeFormat, '12h');
        
        // Switch to 24h format
        db.updateUserPreferences('date_formatting', {
          dateFormat: 'DD/MM/YYYY',
          timeFormat: '24h'
        });
        
        saved = db.getUserPreferences().find(p => p.category === 'date_formatting');
        settings = typeof saved.settings === 'string' ? JSON.parse(saved.settings) : saved.settings;
        expect.toBe(settings.timeFormat, '24h');
      }
    },
    
    // =================== CURRENCY FORMAT SETTINGS ===================
    {
      id: 'settings-currency-format-update',
      suite: 'Settings - Currency Format Settings',
      name: 'should update currency format preferences',
      description: 'Updates number and currency display preferences for specific currencies',
      expectedBehavior: 'Currency format preferences should be saved per currency',
      testFunction: () => {
        beforeEach();
        
        const currencies = db.getTable('currencies');
        const euroCurrency = currencies.find(c => c.code === 'EUR');
        expect.toBeDefined(euroCurrency);
        
        const formatPrefs = {
          decimalSeparator: ',',
          thousandsSeparator: '.',
          decimalPlaces: 2,
          currencyPosition: 'after',
          spaceAfterSymbol: true,
          showCurrencyCode: false
        };
        
        // Update currency format preferences
        db.updateUserPreferences('currency_formatting', {
          currencyId: euroCurrency.id,
          preferences: formatPrefs
        });
        
        const saved = db.getUserPreferences().find(p => {
          if (p.category !== 'currency_formatting') return false;
          const settings = typeof p.settings === 'string' ? JSON.parse(p.settings) : p.settings;
          return settings.currencyId === euroCurrency.id;
        });
        
        expect.toBeDefined(saved);
        const savedSettings = typeof saved.settings === 'string' ? JSON.parse(saved.settings) : saved.settings;
        expect.toBe(savedSettings.preferences.decimalSeparator, ',');
        expect.toBe(savedSettings.preferences.thousandsSeparator, '.');
        expect.toBe(savedSettings.preferences.currencyPosition, 'after');
      }
    },
    
    {
      id: 'settings-number-format-validation',
      suite: 'Settings - Currency Format Settings',
      name: 'should validate number format settings',
      description: 'Ensures decimal places and separators are valid',
      expectedBehavior: 'Should accept valid number formats and handle edge cases',
      testFunction: () => {
        beforeEach();
        
        const currencies = db.getTable('currencies');
        const usdCurrency = currencies.find(c => c.code === 'USD');
        
        // Test valid decimal places (0-8)
        for (let decimals = 0; decimals <= 8; decimals++) {
          const formatPrefs = {
            decimalSeparator: '.',
            thousandsSeparator: ',',
            decimalPlaces: decimals,
            currencyPosition: 'before'
          };
          
          db.updateUserPreferences('currency_formatting', {
            currencyId: usdCurrency.id,
            preferences: formatPrefs
          });
          
          const saved = db.getUserPreferences().find(p => {
            if (p.category !== 'currency_formatting') return false;
            const settings = typeof p.settings === 'string' ? JSON.parse(p.settings) : p.settings;
            return settings.currencyId === usdCurrency.id;
          });
          
          const savedSettings = typeof saved.settings === 'string' ? JSON.parse(saved.settings) : saved.settings;
          expect.toBe(savedSettings.preferences.decimalPlaces, decimals);
        }
      }
    },
    
    {
      id: 'settings-multiple-currency-formats',
      suite: 'Settings - Currency Format Settings',
      name: 'should handle different formats for multiple currencies',
      description: 'Allows different formatting preferences for different currencies',
      expectedBehavior: 'Each currency should have independent format settings',
      testFunction: () => {
        beforeEach();
        
        const currencies = db.getTable('currencies');
        const euroCurrency = currencies.find(c => c.code === 'EUR');
        const usdCurrency = currencies.find(c => c.code === 'USD');
        
        // European format (comma for decimal, dot for thousands)
        const euroFormat = {
          decimalSeparator: ',',
          thousandsSeparator: '.',
          decimalPlaces: 2,
          currencyPosition: 'after'
        };
        
        // American format (dot for decimal, comma for thousands)
        const usdFormat = {
          decimalSeparator: '.',
          thousandsSeparator: ',',
          decimalPlaces: 2,
          currencyPosition: 'before'
        };
        
        db.updateUserPreferences('currency_formatting', {
          currencyId: euroCurrency.id,
          preferences: euroFormat
        });
        
        db.updateUserPreferences('currency_formatting', {
          currencyId: usdCurrency.id,
          preferences: usdFormat
        });
        
        const euroSaved = db.getUserPreferences().find(p => {
          if (p.category !== 'currency_formatting') return false;
          const settings = typeof p.settings === 'string' ? JSON.parse(p.settings) : p.settings;
          return settings.currencyId === euroCurrency.id;
        });
        
        const usdSaved = db.getUserPreferences().find(p => {
          if (p.category !== 'currency_formatting') return false;
          const settings = typeof p.settings === 'string' ? JSON.parse(p.settings) : p.settings;
          return settings.currencyId === usdCurrency.id;
        });
        
        const euroSettings = typeof euroSaved.settings === 'string' ? JSON.parse(euroSaved.settings) : euroSaved.settings;
        const usdSettings = typeof usdSaved.settings === 'string' ? JSON.parse(usdSaved.settings) : usdSaved.settings;
        
        expect.toBe(euroSettings.preferences.decimalSeparator, ',');
        expect.toBe(euroSettings.preferences.currencyPosition, 'after');
        
        expect.toBe(usdSettings.preferences.decimalSeparator, '.');
        expect.toBe(usdSettings.preferences.currencyPosition, 'before');
      }
    },
    
    // =================== DATA SETTINGS ===================
    {
      id: 'settings-backup-creation',
      suite: 'Settings - Data Settings',
      name: 'should create data backup',
      description: 'Creates backup of all database tables and user preferences',
      expectedBehavior: 'Backup should contain all data tables',
      testFunction: () => {
        beforeEach();
        
        // Add some test data
        const accountTypes = db.getAccountTypes();
        const account = db.addAccount({
          name: 'Backup Test Account',
          accountTypeId: accountTypes[0].id,
          currencyId: 'CUR_001'
        });
        
        const transaction = db.addTransaction({
          description: 'Backup Test Transaction',
          amount: 100,
          accountId: account.id,
          categoryId: 'CAT_002', // Expenses
          currencyId: 'CUR_001',
          date: '2024-01-15'
        });
        
        // Export data (simulating backup creation)
        const backupData = db.exportAllTablesToBuffers();
        
        expect.toBeDefined(backupData);
        expect.toBeDefined(backupData.accounts);
        expect.toBeDefined(backupData.transactions);
        expect.toBeDefined(backupData.user_preferences);
        
        // Verify backup contains our test data
        const accountsBuffer = backupData.accounts;
        expect.toBeDefined(accountsBuffer);
        
        const transactionsBuffer = backupData.transactions;  
        expect.toBeDefined(transactionsBuffer);
      }
    },
    
    {
      id: 'settings-database-reset',
      suite: 'Settings - Data Settings',
      name: 'should reset database to initial state',
      description: 'Resets all data while preserving system defaults',
      expectedBehavior: 'Database should return to initial state with default data only',
      testFunction: () => {
        beforeEach();
        
        // Add test data
        const initialAccountCount = db.getTable('accounts').length;
        const initialTransactionCount = db.getTable('transactions').length;
        
        const accountTypes = db.getAccountTypes();
        const testAccount = db.addAccount({
          name: 'Test Account for Reset',
          accountTypeId: accountTypes[0].id,
          currencyId: 'CUR_001'
        });
        
        const testTransaction = db.addTransaction({
          description: 'Test Transaction for Reset',
          amount: 100,
          accountId: testAccount.id,
          categoryId: 'CAT_002', // Expenses
          currencyId: 'CUR_001',
          date: '2024-01-15'
        });
        
        // Verify data was added
        expect.toBe(db.getTable('accounts').length, initialAccountCount + 1);
        expect.toBe(db.getTable('transactions').length, initialTransactionCount + 1);
        
        // Reset database (simulate reset)
        db.createNewDatabase('en'); // This simulates a reset
        
        // Verify data was reset but defaults remain
        expect.toBe(db.getTable('accounts').length, initialAccountCount);
        expect.toBe(db.getTable('transactions').length, initialTransactionCount);
        
        // Verify system data still exists
        expect.toBeGreaterThan(db.getTable('currencies').length, 0);
        expect.toBeGreaterThan(db.getTable('transaction_types').length, 0);
      }
    },
    
    {
      id: 'settings-user-preferences-persistence',
      suite: 'Settings - Data Settings',
      name: 'should persist user preferences across sessions',
      description: 'User preferences should survive database operations',
      expectedBehavior: 'Preferences should be maintained and retrievable',
      testFunction: () => {
        beforeEach();
        
        // Set various preferences
        db.updateUserPreferences('date_formatting', {
          dateFormat: 'YYYY-MM-DD',
          timeFormat: '24h'
        });
        
        db.updateUserPreferences('currency_formatting', {
          currencyId: 'CUR_001',
          preferences: {
            decimalSeparator: ',',
            thousandsSeparator: '.'
          }
        });
        
        db.updateUserPreferences('application_settings', {
          theme: 'dark',
          language: 'en'
        });
        
        // Verify preferences are saved
        const allPrefs = db.getUserPreferences();
        expect.toBeGreaterThan(allPrefs.length, 0);
        
        const datePrefs = allPrefs.find(p => p.category === 'date_formatting');
        const currencyPrefs = allPrefs.find(p => p.category === 'currency_formatting');
        const appPrefs = allPrefs.find(p => p.category === 'application_settings');
        
        expect.toBeDefined(datePrefs);
        expect.toBeDefined(currencyPrefs);
        expect.toBeDefined(appPrefs);
        
        const dateSettings = typeof datePrefs.settings === 'string' ? JSON.parse(datePrefs.settings) : datePrefs.settings;
        const appSettings = typeof appPrefs.settings === 'string' ? JSON.parse(appPrefs.settings) : appPrefs.settings;
        
        expect.toBe(dateSettings.dateFormat, 'YYYY-MM-DD');
        expect.toBe(appSettings.theme, 'dark');
      }
    },
    
    // =================== IMPORT SETTINGS ===================
    {
      id: 'settings-bank-configuration-add',
      suite: 'Settings - Import Settings',
      name: 'should add bank configuration',
      description: 'Adds new bank import configuration with column mappings',
      expectedBehavior: 'Bank configuration should be saved and retrievable',
      testFunction: () => {
        beforeEach();
        
        const bankConfig = {
          id: 'bank_test_001',
          bankName: 'Test Bank',
          description: 'Test bank for import settings',
          dateFormat: 'DD/MM/YYYY',
          columnMappings: {
            date: 'Date',
            description: 'Description', 
            amount: 'Amount',
            balance: 'Balance',
            reference: 'Reference'
          },
          csvSettings: {
            delimiter: ',',
            hasHeader: true,
            encoding: 'utf-8'
          },
          skipRows: 1,
          isActive: true
        };
        
        // Add bank configuration (simulating user preferences storage)
        db.updateUserPreferences('bank_configuration', bankConfig);
        
        // Verify it was saved
        const savedConfig = db.getUserPreferences().find(p => {
          if (p.category !== 'bank_configuration') return false;
          const settings = typeof p.settings === 'string' ? JSON.parse(p.settings) : p.settings;
          return settings.id === bankConfig.id;
        });
        
        expect.toBeDefined(savedConfig);
        const savedSettings = typeof savedConfig.settings === 'string' ? JSON.parse(savedConfig.settings) : savedConfig.settings;
        expect.toBe(savedSettings.bankName, 'Test Bank');
        expect.toBe(savedSettings.dateFormat, 'DD/MM/YYYY');
        expect.toBe(savedSettings.columnMappings.amount, 'Amount');
        expect.toBe(savedSettings.csvSettings.delimiter, ',');
      }
    },
    
    {
      id: 'settings-bank-configuration-update',
      suite: 'Settings - Import Settings',
      name: 'should update existing bank configuration',
      description: 'Updates bank configuration with new column mappings',
      expectedBehavior: 'Bank configuration should be updated with new values',
      testFunction: () => {
        beforeEach();
        
        const originalConfig = {
          id: 'bank_update_001',
          bankName: 'Original Bank Name',
          dateFormat: 'DD/MM/YYYY',
          columnMappings: {
            date: 'Date',
            description: 'Description'
          }
        };
        
        // Add original configuration
        db.updateUserPreferences('bank_configuration', originalConfig);
        
        // Update configuration
        const updatedConfig = {
          id: 'bank_update_001',
          bankName: 'Updated Bank Name',
          dateFormat: 'MM/DD/YYYY', 
          columnMappings: {
            date: 'Transaction Date',
            description: 'Transaction Description',
            amount: 'Amount'
          }
        };
        
        db.updateUserPreferences('bank_configuration', updatedConfig);
        
        // Verify update
        const saved = db.getUserPreferences().find(p => {
          if (p.category !== 'bank_configuration') return false;
          const settings = typeof p.settings === 'string' ? JSON.parse(p.settings) : p.settings;
          return settings.id === updatedConfig.id;
        });
        
        expect.toBeDefined(saved);
        const savedSettings = typeof saved.settings === 'string' ? JSON.parse(saved.settings) : saved.settings;
        expect.toBe(savedSettings.bankName, 'Updated Bank Name');
        expect.toBe(savedSettings.dateFormat, 'MM/DD/YYYY');
        expect.toBe(savedSettings.columnMappings.date, 'Transaction Date');
        expect.toBe(savedSettings.columnMappings.amount, 'Amount');
      }
    },
    
    {
      id: 'settings-bank-configuration-validation',
      suite: 'Settings - Import Settings',
      name: 'should validate bank configuration fields',
      description: 'Ensures required fields are present in bank configuration',
      expectedBehavior: 'Should validate required configuration fields',
      testFunction: () => {
        beforeEach();
        
        const requiredFields = ['id', 'bankName', 'dateFormat', 'columnMappings'];
        
        const validConfig = {
          id: 'valid_bank_001',
          bankName: 'Valid Bank',
          dateFormat: 'DD/MM/YYYY',
          columnMappings: {
            date: 'Date',
            description: 'Description',
            amount: 'Amount'
          }
        };
        
        // Test valid configuration
        db.updateUserPreferences('bank_configuration', validConfig);
        const saved = db.getUserPreferences().find(p => {
          if (p.category !== 'bank_configuration') return false;
          const settings = typeof p.settings === 'string' ? JSON.parse(p.settings) : p.settings;
          return settings.id === validConfig.id;
        });
        
        expect.toBeDefined(saved);
        const savedSettings = typeof saved.settings === 'string' ? JSON.parse(saved.settings) : saved.settings;
        
        // Verify all required fields are present
        requiredFields.forEach(field => {
          expect.toBeDefined(savedSettings[field]);
        });
        
        // Verify column mappings has required fields
        expect.toBeDefined(savedSettings.columnMappings.date);
        expect.toBeDefined(savedSettings.columnMappings.description);
        expect.toBeDefined(savedSettings.columnMappings.amount);
      }
    },
    
    {
      id: 'settings-multiple-bank-configurations',
      suite: 'Settings - Import Settings',
      name: 'should handle multiple bank configurations',
      description: 'Allows storing configurations for multiple banks',
      expectedBehavior: 'Should store and retrieve multiple bank configurations',
      testFunction: () => {
        beforeEach();
        
        const bank1Config = {
          id: 'multi_bank_001',
          bankName: 'Bank One',
          dateFormat: 'DD/MM/YYYY',
          columnMappings: { date: 'Date', amount: 'Amount' }
        };
        
        const bank2Config = {
          id: 'multi_bank_002', 
          bankName: 'Bank Two',
          dateFormat: 'MM/DD/YYYY',
          columnMappings: { date: 'Transaction Date', amount: 'Value' }
        };
        
        const bank3Config = {
          id: 'multi_bank_003',
          bankName: 'Bank Three',
          dateFormat: 'YYYY-MM-DD',
          columnMappings: { date: 'DATE', amount: 'AMOUNT' }
        };
        
        // Add all configurations (need unique categories to store multiple configs)
        db.updateUserPreferences('bank_configuration_1', bank1Config);
        db.updateUserPreferences('bank_configuration_2', bank2Config);
        db.updateUserPreferences('bank_configuration_3', bank3Config);
        
        // Retrieve all bank configurations
        const allBankConfigs = db.getUserPreferences().filter(p => 
          p.category.startsWith('bank_configuration')
        );
        
        expect.toBe(allBankConfigs.length, 3);
        
        const bank1Saved = allBankConfigs.find(c => {
          const settings = typeof c.settings === 'string' ? JSON.parse(c.settings) : c.settings;
          return settings.id === 'multi_bank_001';
        });
        const bank2Saved = allBankConfigs.find(c => {
          const settings = typeof c.settings === 'string' ? JSON.parse(c.settings) : c.settings;
          return settings.id === 'multi_bank_002';
        });
        const bank3Saved = allBankConfigs.find(c => {
          const settings = typeof c.settings === 'string' ? JSON.parse(c.settings) : c.settings;
          return settings.id === 'multi_bank_003';
        });
        
        expect.toBeDefined(bank1Saved);
        expect.toBeDefined(bank2Saved);
        expect.toBeDefined(bank3Saved);
        
        const bank1Settings = typeof bank1Saved.settings === 'string' ? JSON.parse(bank1Saved.settings) : bank1Saved.settings;
        const bank2Settings = typeof bank2Saved.settings === 'string' ? JSON.parse(bank2Saved.settings) : bank2Saved.settings;
        
        expect.toBe(bank1Settings.bankName, 'Bank One');
        expect.toBe(bank2Settings.bankName, 'Bank Two');
        
        const bank3Settings = typeof bank3Saved.settings === 'string' ? JSON.parse(bank3Saved.settings) : bank3Saved.settings;
        expect.toBe(bank3Settings.bankName, 'Bank Three');
      }
    },
    
    // =================== SETTINGS INTEGRATION ===================
    {
      id: 'settings-cross-section-consistency',
      suite: 'Settings - Integration',
      name: 'should maintain consistency across setting sections',
      description: 'Ensures settings from different sections work together',
      expectedBehavior: 'All settings should be compatible and accessible',
      testFunction: () => {
        beforeEach();
        
        // Set preferences across all sections
        const datePrefs = {
          dateFormat: 'YYYY-MM-DD',
          timeFormat: '24h'
        };
        
        const currencyPrefs = {
          currencyId: 'CUR_001',
          preferences: {
            decimalSeparator: '.',
            thousandsSeparator: ',',
            decimalPlaces: 2
          }
        };
        
        const bankPrefs = {
          id: 'integration_bank',
          bankName: 'Integration Bank',
          dateFormat: 'YYYY-MM-DD', // Should match date preferences
          columnMappings: { date: 'Date', amount: 'Amount' }
        };
        
        db.updateUserPreferences('date_formatting', datePrefs);
        db.updateUserPreferences('currency_formatting', currencyPrefs);
        db.updateUserPreferences('bank_configuration', bankPrefs);
        
        // Retrieve all preferences
        const allPrefs = db.getUserPreferences();
        
        const datePref = allPrefs.find(p => p.category === 'date_formatting');
        const currencyPref = allPrefs.find(p => {
          if (p.category !== 'currency_formatting') return false;
          const settings = typeof p.settings === 'string' ? JSON.parse(p.settings) : p.settings;
          return settings.currencyId === 'CUR_001';
        });
        const bankPref = allPrefs.find(p => p.category === 'bank_configuration');
        
        expect.toBeDefined(datePref);
        expect.toBeDefined(currencyPref);
        expect.toBeDefined(bankPref);
        
        const dateSettings = typeof datePref.settings === 'string' ? JSON.parse(datePref.settings) : datePref.settings;
        const currencySettings = typeof currencyPref.settings === 'string' ? JSON.parse(currencyPref.settings) : currencyPref.settings;
        const bankSettings = typeof bankPref.settings === 'string' ? JSON.parse(bankPref.settings) : bankPref.settings;
        
        // Verify date format consistency
        expect.toBe(dateSettings.dateFormat, bankSettings.dateFormat);
        
        // Verify all preferences are retrievable
        expect.toBe(dateSettings.timeFormat, '24h');
        expect.toBe(currencySettings.preferences.decimalPlaces, 2);
        expect.toBe(bankSettings.bankName, 'Integration Bank');
      }
    },
    
    {
      id: 'settings-preferences-export-import',
      suite: 'Settings - Integration',
      name: 'should export and import settings preferences',
      description: 'Settings should be included in data backup and restore',
      expectedBehavior: 'Settings should survive backup/restore operations',
      testFunction: () => {
        beforeEach();
        
        // Set comprehensive preferences
        db.updateUserPreferences('date_formatting', {
          dateFormat: 'DD.MM.YYYY',
          timeFormat: '12h'
        });
        
        db.updateUserPreferences('currency_formatting', {
          currencyId: 'CUR_002',
          preferences: { decimalSeparator: ',', thousandsSeparator: ' ' }
        });
        
        db.updateUserPreferences('application_settings', {
          theme: 'light',
          autoBackup: true,
          backupFrequency: 'daily'
        });
        
        // Export all data including preferences
        const exportData = db.exportAllTablesToBuffers();
        
        // Verify user preferences are included
        expect.toBeDefined(exportData.user_preferences);
        
        // Create new database and verify we can retrieve preferences
        const originalPrefs = db.getUserPreferences();
        expect.toBeGreaterThan(originalPrefs.length, 0);
        
        const datePrefs = originalPrefs.find(p => p.category === 'date_formatting');
        const currencyPrefs = originalPrefs.find(p => p.category === 'currency_formatting');
        const appPrefs = originalPrefs.find(p => p.category === 'application_settings');
        
        expect.toBeDefined(datePrefs);
        expect.toBeDefined(currencyPrefs);
        expect.toBeDefined(appPrefs);
        
        const dateSettings = typeof datePrefs.settings === 'string' ? JSON.parse(datePrefs.settings) : datePrefs.settings;
        const appSettings = typeof appPrefs.settings === 'string' ? JSON.parse(appPrefs.settings) : appPrefs.settings;
        
        expect.toBe(dateSettings.dateFormat, 'DD.MM.YYYY');
        expect.toBe(appSettings.autoBackup, true);
      }
    }
  ];
};