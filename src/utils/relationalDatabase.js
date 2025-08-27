import * as XLSX from 'xlsx';

class RelationalDatabase {
  constructor() {
    this.tables = {
      accounts: [],
      transactions: [],
      tags: [],
      todos: [],
      transaction_types: [],
      transaction_groups: [],
      subcategories: [],
      currencies: [],
      exchange_rates: [],
      currency_settings: [],
      user_preferences: [],
      api_usage: [],
      api_settings: [],
      database_info: [],
      payees: [],
      payers: []
    };
    this.workbooks = {};
    this.relationships = {
      transactions: {
        debitAccountId: { table: 'accounts', field: 'id' },
        creditAccountId: { table: 'accounts', field: 'id' },
        productId: { table: 'tags', field: 'id', optional: true },
        categoryId: { table: 'transaction_types', field: 'id', optional: true },
        subcategoryId: { table: 'subcategories', field: 'id', optional: true },
        currencyId: { table: 'currencies', field: 'id', optional: true }
      },
      accounts: {
        currencyId: { table: 'currencies', field: 'id', optional: true }
      },
      transaction_types: {
        defaultAccountId: { table: 'accounts', field: 'id', optional: true },
        destinationAccountId: { table: 'accounts', field: 'id', optional: true }
      },
      subcategories: {
        groupId: { table: 'transaction_groups', field: 'id', optional: true }
      },
      transaction_groups: {
        transactionTypeId: { table: 'transaction_types', field: 'id' }
      },
      exchange_rates: {
        fromCurrencyId: { table: 'currencies', field: 'id' },
        toCurrencyId: { table: 'currencies', field: 'id' }
      }
    };
  }

  async loadFromFiles(files) {
    try {
      for (const [tableName, file] of Object.entries(files)) {
        if (this.tables.hasOwnProperty(tableName)) {
          const arrayBuffer = await file.arrayBuffer();
          const workbook = XLSX.read(arrayBuffer, { type: 'array' });
          this.workbooks[tableName] = workbook;
          
          const worksheet = workbook.Sheets[workbook.SheetNames[0]];
          if (worksheet) {
            this.tables[tableName] = XLSX.utils.sheet_to_json(worksheet);
          }
        }
      }
      
      // Run migration for transaction types to add missing fields
      this.migrateTransactionTypes();
      this.migrateSubcategories();
      this.migrateTransactionGroups();
      this.migrateDefaultAccount();
      this.migrateTransactionTypeAccounts();
      this.migrateToSingleAccount();
      // Removed: this.migrateRemoveAllSubcategories(); - Now initializing subcategories instead
      this.migrateInitializeSubcategories();
      this.migrateReorderTransactionTypes();
      this.migrateRemoveSpecificTransactionGroups();
      
      this.validateRelationships();
      return true;
    } catch (error) {
      console.error('Error loading files into relational database:', error);
      return false;
    }
  }

  createNewDatabase(language = 'en') {
    // Generate language-specific default data
    const defaultData = this.generateDefaultData(language);
    
    this.tables = {
      accounts: defaultData.accounts,
      transactions: [],
      tags: defaultData.tags,
      todos: defaultData.todos,
      transaction_types: this.generateCategories(language),
      transaction_groups: this.generateTransactionGroups(language),
      subcategories: this.generateSubcategories(language),
      currencies: this.generateCurrencies(),
      exchange_rates: this.generateExchangeRates(),
      currency_settings: this.generateCurrencySettings(),
      user_preferences: this.generateUserPreferences(),
      api_usage: this.generateApiUsage(),
      api_settings: this.generateApiSettings(),
      payees: [],
      payers: [],
      
      database_info: [
        {
          id: 'DB_INFO_001',
          key: 'language',
          value: 'en', // Default to English, will be updated when database is created
          description: 'Database language setting',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: 'DB_INFO_002',
          key: 'version',
          value: '1.0.0',
          description: 'Database schema version',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: 'DB_INFO_003',
          key: 'type',
          value: 'personal_finance',
          description: 'Database type - personal finance tracking',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ]
    };

    this.initializeWorkbooks();
    
    // Run migration to ensure default account has correct name
    this.migrateDefaultAccount();
    
    // Run migration to update transaction type accounts
    this.migrateTransactionTypeAccounts();
    
    // Run migration to remove unwanted accounts
    this.migrateToSingleAccount();
    
    // Removed: Run migration to remove all subcategories - Now initializing subcategories instead
    // this.migrateRemoveAllSubcategories();
    
    // Run migration to initialize subcategories if they're empty
    this.migrateInitializeSubcategories();
    
    // Run migration to reorder transaction types (put Expenses first)
    this.migrateReorderTransactionTypes();
    
    // Run migration to remove specific transaction groups
    this.migrateRemoveSpecificTransactionGroups();
    
    return true;
  }

  // ID generation utility method
  generateId(prefix) {
    const table = this.tables[prefix.toLowerCase() === 'cur' ? 'currencies' : 'exchange_rates'];
    const existingIds = table.map(item => item.id).filter(id => id.startsWith(prefix));
    
    let maxNumber = 0;
    existingIds.forEach(id => {
      const match = id.match(new RegExp(`${prefix}_(\\d+)`));
      if (match) {
        maxNumber = Math.max(maxNumber, parseInt(match[1], 10));
      }
    });
    
    return `${prefix}_${String(maxNumber + 1).padStart(3, '0')}`;
  }

  initializeWorkbooks() {
    for (const tableName of Object.keys(this.tables)) {
      this.workbooks[tableName] = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet(this.tables[tableName]);
      XLSX.utils.book_append_sheet(this.workbooks[tableName], worksheet, tableName);
    }
  }

  validateRelationships() {
    const errors = [];
    
    for (const [tableName, relationships] of Object.entries(this.relationships)) {
      const records = this.tables[tableName];
      
      for (const record of records) {
        for (const [foreignKey, relationship] of Object.entries(relationships)) {
          const foreignKeyValue = record[foreignKey];
          
          if (foreignKeyValue && !relationship.optional) {
            const referencedTable = this.tables[relationship.table];
            const exists = referencedTable.some(r => r[relationship.field] === foreignKeyValue);
            
            if (!exists) {
              errors.push({
                table: tableName,
                record: record.id || record,
                error: `Foreign key ${foreignKey} value '${foreignKeyValue}' not found in ${relationship.table}.${relationship.field}`
              });
            }
          }
        }
      }
    }
    
    // Validate accounts against hardwired account types
    const accountRecords = this.tables['accounts'];
    const validAccountTypeIds = ['ACCT_TYPE_001', 'ACCT_TYPE_002', 'ACCT_TYPE_003', 'ACCT_TYPE_004', 'ACCT_TYPE_005', 'ACCT_TYPE_006', 'ACCT_TYPE_007'];
    
    for (const account of accountRecords) {
      if (account.accountTypeId && !validAccountTypeIds.includes(account.accountTypeId)) {
        errors.push({
          table: 'accounts',
          record: account.id || account,
          error: `Invalid accountTypeId '${account.accountTypeId}' - must be one of: ${validAccountTypeIds.join(', ')}`
        });
      }
    }
    
    if (errors.length > 0) {
      console.warn('Database relationship validation errors:', errors);
    }
    
    return errors;
  }

  addTransaction(transactionData) {
    if (!this.validateForeignKeys('transactions', transactionData)) {
      throw new Error('Invalid foreign key references in transaction');
    }

    const newTransaction = {
      id: 'TXN' + Date.now(),
      date: transactionData.date || new Date().toISOString().split('T')[0],
      description: transactionData.description,
      debitAccountId: transactionData.debitAccountId,
      creditAccountId: transactionData.creditAccountId,
      amount: parseFloat(transactionData.amount),
      productId: transactionData.productId || null,
      categoryId: transactionData.categoryId || null,
      subcategoryId: transactionData.subcategoryId || null,
      reference: transactionData.reference || '',
      notes: transactionData.notes || '',
      createdAt: new Date().toISOString()
    };
    
    this.tables.transactions.push(newTransaction);
    this.updateAccountBalances(newTransaction);
    this.saveTableToWorkbook('transactions');
    this.saveTableToWorkbook('accounts');

    return newTransaction;
  }

  validateForeignKeys(tableName, data) {
    const relationships = this.relationships[tableName];
    if (!relationships) return true;

    for (const [foreignKey, relationship] of Object.entries(relationships)) {
      const value = data[foreignKey];
      
      if (value && value !== '') {
        const referencedTable = this.tables[relationship.table];
        const exists = referencedTable.some(r => r[relationship.field] === value);
        
        if (!exists) {
          console.error(`Foreign key validation failed: ${foreignKey} = '${value}' not found in ${relationship.table}`);
          return false;
        }
      } else if (!relationship.optional) {
        console.error(`Required foreign key missing: ${foreignKey}`);
        return false;
      }
    }
    
    return true;
  }

  updateAccountBalances(transaction) {
    const debitAccount = this.tables.accounts.find(acc => acc.id === transaction.debitAccountId);
    const creditAccount = this.tables.accounts.find(acc => acc.id === transaction.creditAccountId);

    if (debitAccount) {
      debitAccount.balance = (parseFloat(debitAccount.balance) || 0) + transaction.amount;
    }

    if (creditAccount) {
      creditAccount.balance = (parseFloat(creditAccount.balance) || 0) - transaction.amount;
    }
  }

  addAccount(accountData) {
    if (!this.validateForeignKeys('accounts', accountData)) {
      throw new Error('Invalid foreign key references in account');
    }

    // Calculate next order value
    const maxOrder = Math.max(...this.tables.accounts.map(acc => acc.order || 0), 0);
    
    const newAccount = {
      id: 'ACC' + Date.now(),
      name: accountData.name,
      accountTypeId: accountData.accountTypeId,
      currencyId: accountData.currencyId || 'CUR_001', // Include currencyId with default fallback
      balance: parseFloat(accountData.balance) || 0,
      description: accountData.description || '',
      includeInOverview: accountData.includeInOverview !== undefined ? accountData.includeInOverview : true,
      order: accountData.order !== undefined ? accountData.order : maxOrder + 1,
      isActive: accountData.isActive !== undefined ? accountData.isActive : true,
      createdAt: new Date().toISOString()
    };

    this.tables.accounts.push(newAccount);
    this.saveTableToWorkbook('accounts');

    return newAccount;
  }


  addProduct(productData) {
    // Create new tag/product entry
    const newProduct = {
      id: 'TAG' + Date.now(),
      name: productData.name,
      description: productData.description || '',
      category: productData.category || '',
      isActive: true,
      createdAt: new Date().toISOString()
    };

    this.tables.tags.push(newProduct);
    this.saveTableToWorkbook('tags');
    return newProduct;
  }

  updateAccount(id, accountData) {
    const accountIndex = this.tables.accounts.findIndex(account => account.id === id);
    if (accountIndex === -1) {
      throw new Error(`Account with id ${id} not found`);
    }

    const updatedAccount = {
      ...this.tables.accounts[accountIndex],
      ...accountData,
      id: id // Ensure ID doesn't change
    };

    this.tables.accounts[accountIndex] = updatedAccount;
    this.saveTableToWorkbook('accounts');

    return updatedAccount;
  }


  updateProduct(id, productData) {
    const productIndex = this.tables.tags.findIndex(product => product.id === id);
    if (productIndex === -1) {
      throw new Error(`Product with id ${id} not found`);
    }

    const updatedProduct = {
      ...this.tables.products[productIndex],
      ...productData,
      id: id // Ensure ID doesn't change
    };

    this.tables.tags[productIndex] = updatedProduct;
    this.saveTableToWorkbook('tags');

    return updatedProduct;
  }

  updateTransaction(id, transactionData) {
    const transactionIndex = this.tables.transactions.findIndex(transaction => transaction.id === id);
    if (transactionIndex === -1) {
      throw new Error(`Transaction with id ${id} not found`);
    }

    // Validate foreign keys for the updated data
    if (!this.validateForeignKeys('transactions', transactionData)) {
      throw new Error('Invalid foreign key relationships in transaction data');
    }

    // Get the old transaction to reverse its balance effects
    const oldTransaction = { ...this.tables.transactions[transactionIndex] };

    // Reverse old transaction balance effects
    this.reverseAccountBalances(oldTransaction);

    // Process new transaction data
    const processedData = {
      ...transactionData,
      id: id,
      debitAccountId: transactionData.debitAccountId || transactionData.debitAccount,
      creditAccountId: transactionData.creditAccountId || transactionData.creditAccount
    };

    const updatedTransaction = {
      ...oldTransaction,
      ...processedData
    };

    this.tables.transactions[transactionIndex] = updatedTransaction;
    
    // Apply new transaction balance effects
    this.updateAccountBalances(updatedTransaction);
    
    this.saveTableToWorkbook('transactions');
    this.saveTableToWorkbook('accounts'); // Save accounts too due to balance changes

    return updatedTransaction;
  }

  reverseAccountBalances(transaction) {
    const debitAccount = this.tables.accounts.find(acc => acc.id === transaction.debitAccountId);
    const creditAccount = this.tables.accounts.find(acc => acc.id === transaction.creditAccountId);

    // Reverse the effects of the original transaction
    if (debitAccount) {
      debitAccount.balance = (parseFloat(debitAccount.balance) || 0) - transaction.amount;
    }

    if (creditAccount) {
      creditAccount.balance = (parseFloat(creditAccount.balance) || 0) + transaction.amount;
    }
  }

  saveTableToWorkbook(tableName) {
    if (!this.workbooks[tableName]) {
      this.workbooks[tableName] = XLSX.utils.book_new();
    }

    const worksheet = XLSX.utils.json_to_sheet(this.tables[tableName]);
    this.workbooks[tableName].Sheets[tableName] = worksheet;
    
    if (!this.workbooks[tableName].SheetNames.includes(tableName)) {
      this.workbooks[tableName].SheetNames.push(tableName);
    }
  }

  exportTableToBuffer(tableName) {
    if (!this.workbooks[tableName]) {
      this.workbooks[tableName] = XLSX.utils.book_new();
    }
    
    this.saveTableToWorkbook(tableName);
    return XLSX.write(this.workbooks[tableName], { bookType: 'xlsx', type: 'array' });
  }

  exportAllTablesToBuffers() {
    const buffers = {};
    
    for (const tableName of Object.keys(this.tables)) {
      // Ensure workbook exists before export
      if (!this.workbooks[tableName]) {
        this.workbooks[tableName] = XLSX.utils.book_new();
      }
      buffers[tableName] = this.exportTableToBuffer(tableName);
    }
    
    return buffers;
  }

  // Clear all data from all tables and reset to defaults
  clearAllData() {
    // Clear all table data
    this.tables.accounts = [];
    this.tables.transactions = [];
    this.tables.tags = [];
    this.tables.todos = [];
    this.tables.transaction_types = [];
    this.tables.transaction_groups = [];
    this.tables.subcategories = [];
    
    // PRESERVE currency data - do not reset currencies, exchange rates, or currency settings
    // Users' currency configurations should remain intact after reset
    
    // Reset other system tables to defaults (but preserve existing preferences if they exist)
    if (this.tables.user_preferences.length === 0) {
      this.tables.user_preferences = [...this.getDefaultUserPreferences()];
    }
    this.tables.api_usage = [];
    if (this.tables.api_settings.length === 0) {
      this.tables.api_settings = [...this.getDefaultApiSettings()];
    }
    
    // Update database info to reflect the reset
    const existingInfo = [...this.tables.database_info];
    this.tables.database_info = [...this.getDefaultDatabaseInfo()];
    
    // Preserve version if it exists
    const existingVersion = existingInfo.find(item => item.key === 'version');
    if (existingVersion) {
      const versionIndex = this.tables.database_info.findIndex(item => item.key === 'version');
      if (versionIndex !== -1) {
        this.tables.database_info[versionIndex].value = existingVersion.value;
      }
    }
    
    // Update lastModified to current time
    const modifiedIndex = this.tables.database_info.findIndex(item => item.key === 'lastModified');
    if (modifiedIndex !== -1) {
      this.tables.database_info[modifiedIndex].value = new Date().toISOString();
    }
    
    // Clear workbooks to force regeneration
    this.workbooks = {};
    
    console.log('All data cleared and reset to defaults (currencies preserved)');
  }

  // Helper methods to get default data
  getDefaultCurrencies() {
    return [
      { id: 'CUR_001', code: 'EUR', name: 'Euro', symbol: '€', type: 'fiat', decimalPlaces: 2, isActive: true },
      { id: 'CUR_002', code: 'USD', name: 'US Dollar', symbol: '$', type: 'fiat', decimalPlaces: 2, isActive: true },
      { id: 'CUR_003', code: 'GBP', name: 'British Pound', symbol: '£', type: 'fiat', decimalPlaces: 2, isActive: true },
      { id: 'CUR_004', code: 'JPY', name: 'Japanese Yen', symbol: '¥', type: 'fiat', decimalPlaces: 0, isActive: true },
      { id: 'CUR_005', code: 'CAD', name: 'Canadian Dollar', symbol: 'C$', type: 'fiat', decimalPlaces: 2, isActive: true },
      { id: 'CUR_006', code: 'AUD', name: 'Australian Dollar', symbol: 'A$', type: 'fiat', decimalPlaces: 2, isActive: true },
      { id: 'CUR_007', code: 'AED', name: 'UAE Dirham', symbol: 'د.إ', type: 'fiat', decimalPlaces: 2, isActive: true },
      { id: 'CUR_008', code: 'CHF', name: 'Swiss Franc', symbol: 'CHF', type: 'fiat', decimalPlaces: 2, isActive: true }
    ];
  }

  getDefaultExchangeRates() {
    return [
      { id: 'EXR_001', fromCurrencyId: 'CUR_002', toCurrencyId: 'CUR_001', rate: 0.85, rateDate: new Date().toISOString(), source: 'manual' },
      { id: 'EXR_002', fromCurrencyId: 'CUR_003', toCurrencyId: 'CUR_001', rate: 1.15, rateDate: new Date().toISOString(), source: 'manual' },
      { id: 'EXR_003', fromCurrencyId: 'CUR_004', toCurrencyId: 'CUR_001', rate: 0.0065, rateDate: new Date().toISOString(), source: 'manual' },
      { id: 'EXR_004', fromCurrencyId: 'CUR_005', toCurrencyId: 'CUR_001', rate: 0.68, rateDate: new Date().toISOString(), source: 'manual' },
      { id: 'EXR_005', fromCurrencyId: 'CUR_006', toCurrencyId: 'CUR_001', rate: 0.62, rateDate: new Date().toISOString(), source: 'manual' },
      { id: 'EXR_006', fromCurrencyId: 'CUR_007', toCurrencyId: 'CUR_001', rate: 0.25, rateDate: new Date().toISOString(), source: 'manual' },
      { id: 'EXR_007', fromCurrencyId: 'CUR_008', toCurrencyId: 'CUR_001', rate: 0.92, rateDate: new Date().toISOString(), source: 'manual' }
    ];
  }

  getDefaultCurrencySettings() {
    return [
      { id: 'CS_001', baseCurrencyId: 'CUR_001', autoUpdateRates: false, rateUpdateFrequency: 'daily', lastRateUpdate: null }
    ];
  }

  getDefaultUserPreferences() {
    return [
      { id: 'UP_001', key: 'dateFormat', value: 'YYYY-MM-DD' },
      { id: 'UP_002', key: 'numberFormat', value: 'en-US' },
      { id: 'UP_003', key: 'language', value: 'en' }
    ];
  }

  getDefaultApiSettings() {
    return [];
  }

  getDefaultDatabaseInfo() {
    return [
      { id: 'DI_001', key: 'version', value: '1.0' },
      { id: 'DI_002', key: 'createdAt', value: new Date().toISOString() },
      { id: 'DI_003', key: 'lastModified', value: new Date().toISOString() }
    ];
  }

  // Ensure all tables are saved to workbooks (including empty ones)
  saveAllTablesToWorkbooks() {
    // Ensure all required tables exist (for backwards compatibility)
    this.ensureAllTablesExist();
    
    for (const tableName of Object.keys(this.tables)) {
      this.saveTableToWorkbook(tableName);
    }
  }

  // Ensure all required tables exist, even for older databases
  ensureAllTablesExist() {
    const requiredTables = [
      'accounts', 'transactions', 'tags', 'todos', 'transaction_types',
      'transaction_groups', 'subcategories', 'currencies', 'exchange_rates',
      'currency_settings', 'user_preferences', 'api_usage', 'api_settings',
      'database_info', 'payees', 'payers'
    ];

    for (const tableName of requiredTables) {
      if (!this.tables[tableName]) {
        console.log(`Initializing missing table: ${tableName}`);
        this.tables[tableName] = [];
      }
    }
  }

  getTable(tableName) {
    return this.tables[tableName] || [];
  }

  getRecord(tableName, id) {
    const table = this.tables[tableName];
    return table ? table.find(record => record.id === id) : null;
  }

  getTransactionsWithDetails() {
    return this.tables.transactions.map(transaction => ({
      ...transaction,
      debitAccount: this.getRecord('accounts', transaction.debitAccountId),
      creditAccount: this.getRecord('accounts', transaction.creditAccountId),
      product: transaction.productId ? this.getRecord('tags', transaction.productId) : null
    }));
  }

  calculateAccountBalances() {
    const balances = {};
    const accountBalances = {};
    
    // Initialize account balances with initial balances
    this.tables.accounts.forEach(account => {
      accountBalances[account.id] = parseFloat(account.balance) || 0;
    });
    
    // Process all transactions to update account balances
    this.tables.transactions.forEach(transaction => {
      const amount = parseFloat(transaction.amount) || 0;
      
      // Debit account - increase the balance
      if (transaction.debitAccountId && accountBalances.hasOwnProperty(transaction.debitAccountId)) {
        accountBalances[transaction.debitAccountId] += amount;
      }
      
      // Credit account - decrease the balance  
      if (transaction.creditAccountId && accountBalances.hasOwnProperty(transaction.creditAccountId)) {
        accountBalances[transaction.creditAccountId] -= amount;
      }
    });
    
    // Sum balances by account type
    const accountTypes = this.getAccountTypes();
    this.tables.accounts.forEach(account => {
      const accountType = accountTypes.find(type => type.id === account.accountTypeId);
      if (accountType && accountBalances.hasOwnProperty(account.id)) {
        const type = accountType.type;
        let accountBalance = accountBalances[account.id];
        
        // For liability accounts, we need to consider the sign
        // In double-entry, these accounts have normal credit balances
        if (type === 'Liability') {
          accountBalance = -accountBalance;
        }
        
        balances[type] = (balances[type] || 0) + accountBalance;
      }
    });
    
    return balances;
  }

  getActiveAccounts() {
    return this.tables.accounts.filter(account => account.isActive);
  }

  calculateIndividualAccountBalances() {
    const accountBalances = {};
    
    // Initialize account balances with initial balances
    this.tables.accounts.forEach(account => {
      accountBalances[account.id] = parseFloat(account.balance) || 0;
    });
    
    // Process all transactions to update account balances
    this.tables.transactions.forEach(transaction => {
      const amount = parseFloat(transaction.amount) || 0;
      
      // Debit account - increase the balance
      if (transaction.debitAccountId && accountBalances.hasOwnProperty(transaction.debitAccountId)) {
        accountBalances[transaction.debitAccountId] += amount;
      }
      
      // Credit account - decrease the balance  
      if (transaction.creditAccountId && accountBalances.hasOwnProperty(transaction.creditAccountId)) {
        accountBalances[transaction.creditAccountId] -= amount;
      }
    });
    
    return accountBalances;
  }

  getAccountsWithTypes() {
    const accountBalances = this.calculateIndividualAccountBalances();
    const accountTypes = this.getAccountTypes();
    
    const accountsWithTypes = this.tables.accounts.map(account => {
      const accountType = accountTypes.find(type => type.id === account.accountTypeId);
      let calculatedBalance = accountBalances[account.id] || 0;
      
      // For liability accounts, display the credit balance as positive
      if (accountType && accountType.type === 'Liability') {
        calculatedBalance = -calculatedBalance;
      }
      
      return {
        ...account,
        balance: calculatedBalance,
        accountType: accountType
      };
    });
    
    // Sort by order field, then by name if order is not set
    return accountsWithTypes.sort((a, b) => {
      const orderA = a.order || 999999;
      const orderB = b.order || 999999;
      
      if (orderA !== orderB) {
        return orderA - orderB;
      }
      
      // If order is the same, sort by name
      return (a.name || '').localeCompare(b.name || '');
    });
  }

  getActiveAccountsWithTypes() {
    return this.getAccountsWithTypes().filter(account => account.isActive);
  }

  getActiveCustomers() {
    return this.tables.customers.filter(customer => customer.isActive);
  }

  getActiveVendors() {
    return this.tables.vendors.filter(vendor => vendor.isActive);
  }

  deleteAccount(id) {
    const accountIndex = this.tables.accounts.findIndex(account => account.id === id);
    if (accountIndex === -1) {
      throw new Error(`Account with id ${id} not found`);
    }

    // Check if account is used in transactions
    const usedInTransactions = this.tables.transactions.some(
      transaction => transaction.debitAccountId === id || transaction.creditAccountId === id
    );

    if (usedInTransactions) {
      throw new Error('Cannot delete account: it is used in transactions');
    }

    const deletedAccount = this.tables.accounts[accountIndex];
    this.tables.accounts.splice(accountIndex, 1);
    this.saveTableToWorkbook('accounts');

    return deletedAccount;
  }


  deleteTransaction(id) {
    const transactionIndex = this.tables.transactions.findIndex(transaction => transaction.id === id);
    if (transactionIndex === -1) {
      throw new Error(`Transaction with id ${id} not found`);
    }

    const deletedTransaction = { ...this.tables.transactions[transactionIndex] };
    
    // Reverse the account balance effects
    this.reverseAccountBalances(deletedTransaction);
    
    this.tables.transactions.splice(transactionIndex, 1);
    this.saveTableToWorkbook('transactions');
    this.saveTableToWorkbook('accounts'); // Save accounts too due to balance changes

    return deletedTransaction;
  }

  deleteProduct(id) {
    const productIndex = this.tables.tags.findIndex(product => product.id === id);
    if (productIndex === -1) {
      throw new Error(`Product with id ${id} not found`);
    }

    // Check if product is used in transactions
    const usedInTransactions = this.tables.transactions.some(
      transaction => transaction.productId === id
    );

    if (usedInTransactions) {
      throw new Error('Cannot delete product: it is used in transactions');
    }

    const deletedProduct = this.tables.tags[productIndex];
    this.tables.tags.splice(productIndex, 1);
    this.saveTableToWorkbook('tags');

    return deletedProduct;
  }

  // Todo CRUD methods
  addTodo(todoData) {
    const newTodo = {
      id: 'TODO' + Date.now(),
      title: todoData.title,
      description: todoData.description || '',
      category: todoData.category || 'General',
      status: todoData.status || 'pending',
      priority: todoData.priority || 'medium',
      estimatedHours: parseInt(todoData.estimatedHours) || 1,
      completedAt: todoData.completedAt || null,
      createdAt: new Date().toISOString()
    };

    this.tables.todos.push(newTodo);
    this.saveTableToWorkbook('todos');
    return newTodo;
  }

  updateTodo(id, todoData) {
    const todoIndex = this.tables.todos.findIndex(todo => todo.id === id);
    if (todoIndex === -1) {
      throw new Error(`Todo with id ${id} not found`);
    }

    const updatedTodo = {
      ...this.tables.todos[todoIndex],
      title: todoData.title !== undefined ? todoData.title : this.tables.todos[todoIndex].title,
      description: todoData.description !== undefined ? todoData.description : this.tables.todos[todoIndex].description,
      category: todoData.category !== undefined ? todoData.category : this.tables.todos[todoIndex].category,
      status: todoData.status !== undefined ? todoData.status : this.tables.todos[todoIndex].status,
      priority: todoData.priority !== undefined ? todoData.priority : this.tables.todos[todoIndex].priority,
      estimatedHours: todoData.estimatedHours !== undefined ? parseInt(todoData.estimatedHours) : this.tables.todos[todoIndex].estimatedHours,
      completedAt: todoData.completedAt !== undefined ? todoData.completedAt : this.tables.todos[todoIndex].completedAt
    };

    this.tables.todos[todoIndex] = updatedTodo;
    this.saveTableToWorkbook('todos');
    return updatedTodo;
  }

  deleteTodo(id) {
    const todoIndex = this.tables.todos.findIndex(todo => todo.id === id);
    if (todoIndex === -1) {
      throw new Error(`Todo with id ${id} not found`);
    }

    const deletedTodo = this.tables.todos[todoIndex];
    this.tables.todos.splice(todoIndex, 1);
    this.saveTableToWorkbook('todos');

    return deletedTodo;
  }

  // Account Types methods - now hardwired
  getAccountTypes() {
    // Get current database language to return appropriate account types
    const language = this.getDatabaseLanguage();
    return this.generateAccountTypes(language);
  }

  getAccountTypesByType(type) {
    const accountTypes = this.getAccountTypes();
    return accountTypes.filter(accountType => 
      accountType.type === type && accountType.isActive
    );
  }


  // Database Info methods
  getDatabaseInfo(key) {
    const info = this.tables.database_info.find(item => item.key === key);
    return info ? info.value : null;
  }

  setDatabaseInfo(key, value) {
    const infoIndex = this.tables.database_info.findIndex(item => item.key === key);
    if (infoIndex !== -1) {
      this.tables.database_info[infoIndex].value = value;
      this.tables.database_info[infoIndex].updatedAt = new Date().toISOString();
    } else {
      // Create new info entry
      const newInfo = {
        id: 'DB_INFO_' + Date.now(),
        key: key,
        value: value,
        description: `Database setting: ${key}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      this.tables.database_info.push(newInfo);
    }
    this.saveTableToWorkbook('database_info');
  }

  getDatabaseLanguage() {
    return this.getDatabaseInfo('language') || 'en';
  }

  setDatabaseLanguage(language) {
    this.setDatabaseInfo('language', language);
  }

  generateDefaultData(language) {
    if (language === 'fr') {
      return this.generateFrenchDefaultData();
    } else {
      return this.generateEnglishDefaultData();
    }
  }

  generateAccountTypes(language) {
    if (language === 'fr') {
      return this.generateFrenchAccountTypes();
    } else {
      return this.generateEnglishAccountTypes();
    }
  }

  generateEnglishAccountTypes() {
    return [
      {
        id: 'ACCT_TYPE_001',
        type: 'Asset',
        subtype: 'Bank account',
        description: 'Assets that can be easily converted to cash within one year',
        examples: 'Cash, Bank Accounts, Savings Accounts',
        normalBalance: 'Debit',
        isActive: true,
        createdAt: new Date().toISOString()
      },
      {
        id: 'ACCT_TYPE_002',
        type: 'Asset',
        subtype: 'Investment account',
        description: 'Long-term investments and securities',
        examples: 'Stocks, Bonds, Mutual Funds, Retirement Accounts',
        normalBalance: 'Debit',
        isActive: true,
        createdAt: new Date().toISOString()
      },
      {
        id: 'ACCT_TYPE_003',
        type: 'Asset',
        subtype: 'Fixed Assets',
        description: 'Long-term physical assets',
        examples: 'Real Estate, Vehicles, Equipment',
        normalBalance: 'Debit',
        isActive: true,
        createdAt: new Date().toISOString()
      },
      {
        id: 'ACCT_TYPE_004',
        type: 'Asset',
        subtype: 'Retirement account',
        description: 'Retirement savings and pension accounts',
        examples: '401k, IRA, Roth IRA, Pension Plans, 403b',
        normalBalance: 'Debit',
        isActive: true,
        createdAt: new Date().toISOString()
      },
      {
        id: 'ACCT_TYPE_005',
        type: 'Asset',
        subtype: 'Business account',
        description: 'Business-related asset accounts',
        examples: 'Business Checking, Business Savings, Corporate Accounts',
        normalBalance: 'Debit',
        isActive: true,
        createdAt: new Date().toISOString()
      },
      {
        id: 'ACCT_TYPE_006',
        type: 'Liability',
        subtype: 'Current Liability',
        description: 'Debts and obligations due within one year',
        examples: 'Credit Cards, Short-term Loans, Bills Payable',
        normalBalance: 'Credit',
        isActive: true,
        createdAt: new Date().toISOString()
      },
      {
        id: 'ACCT_TYPE_007',
        type: 'Liability',
        subtype: 'Long-term Liability',
        description: 'Debts and obligations due after one year',
        examples: 'Mortgage, Car Loans, Student Loans',
        normalBalance: 'Credit',
        isActive: true,
        createdAt: new Date().toISOString()
      }
    ];
  }

  generateFrenchAccountTypes() {
    return [
      {
        id: 'ACCT_TYPE_001',
        type: 'Actif',
        subtype: 'Compte bancaire',
        description: 'Actifs facilement convertibles en espèces dans un délai d\'un an',
        examples: 'Espèces, Comptes Bancaires, Comptes Épargne',
        normalBalance: 'Débit',
        isActive: true,
        createdAt: new Date().toISOString()
      },
      {
        id: 'ACCT_TYPE_002',
        type: 'Actif',
        subtype: 'Compte de placement',
        description: 'Investissements et valeurs mobilières à long terme',
        examples: 'Actions, Obligations, Fonds Communs, Comptes Retraite',
        normalBalance: 'Débit',
        isActive: true,
        createdAt: new Date().toISOString()
      },
      {
        id: 'ACCT_TYPE_003',
        type: 'Actif',
        subtype: 'Actifs immobilisés',
        description: 'Actifs physiques à long terme',
        examples: 'Immobilier, Véhicules, Équipements',
        normalBalance: 'Débit',
        isActive: true,
        createdAt: new Date().toISOString()
      },
      {
        id: 'ACCT_TYPE_004',
        type: 'Actif',
        subtype: 'Compte retraite',
        description: 'Comptes d\'épargne retraite et de pension',
        examples: 'REER, CELI, Fonds de pension, Régimes de retraite',
        normalBalance: 'Débit',
        isActive: true,
        createdAt: new Date().toISOString()
      },
      {
        id: 'ACCT_TYPE_005',
        type: 'Actif',
        subtype: 'Compte d\'entreprise',
        description: 'Comptes d\'actifs liés aux entreprises',
        examples: 'Compte Chèque Entreprise, Épargne Entreprise, Comptes Corporatifs',
        normalBalance: 'Débit',
        isActive: true,
        createdAt: new Date().toISOString()
      },
      {
        id: 'ACCT_TYPE_006',
        type: 'Passif',
        subtype: 'Passif courant',
        description: 'Dettes et obligations exigibles dans un délai d\'un an',
        examples: 'Cartes de Crédit, Prêts Court Terme, Factures à Payer',
        normalBalance: 'Crédit',
        isActive: true,
        createdAt: new Date().toISOString()
      },
      {
        id: 'ACCT_TYPE_007',
        type: 'Passif',
        subtype: 'Passif long terme',
        description: 'Dettes et obligations exigibles après un an',
        examples: 'Hypothèque, Prêts Auto, Prêts Étudiants',
        normalBalance: 'Crédit',
        isActive: true,
        createdAt: new Date().toISOString()
      }
    ];
  }

  generateEnglishDefaultData() {
    return {
      accounts: [
        { 
          id: 'ACC001', 
          name: 'Default Account', 
          accountTypeId: 'ACCT_TYPE_001',
          balance: 0,
          currencyId: 'CUR_001', // EUR (base currency)
          baseCurrencyValue: 0,
          description: 'Cash on hand',
          includeInOverview: true,
          isActive: true,
          createdAt: new Date().toISOString(),
          lastUpdated: new Date().toISOString()
        }
      ],
      tags: [],
      todos: [
        {
          id: 'TODO001',
          title: 'Add budget tracking feature',
          description: 'Allow users to set monthly budgets by category and track spending against them',
          category: 'Feature',
          status: 'pending',
          priority: 'high',
          estimatedHours: 8,
          createdAt: new Date().toISOString()
        },
        {
          id: 'TODO002',
          title: 'Implement recurring transactions',
          description: 'Add ability to set up recurring income/expenses (salary, rent, subscriptions)',
          category: 'Feature',
          status: 'pending',
          priority: 'medium',
          estimatedHours: 12,
          createdAt: new Date().toISOString()
        },
        {
          id: 'TODO003',
          title: 'Add financial reports and charts',
          description: 'Generate spending reports, net worth tracking, and visual charts',
          category: 'Enhancement',
          status: 'pending',
          priority: 'medium',
          estimatedHours: 16,
          createdAt: new Date().toISOString()
        },
        {
          id: 'TODO004',
          title: 'Implement multi-currency support',
          description: 'Allow users to track finances in multiple currencies with automatic conversion rates and currency-specific formatting',
          category: 'Feature',
          status: 'pending',
          priority: 'high',
          estimatedHours: 20,
          createdAt: new Date().toISOString()
        }
      ]
    };
  }

  generateFrenchDefaultData() {
    return {
      accounts: [
        { 
          id: 'ACC001', 
          name: 'Default Account', 
          accountTypeId: 'ACCT_TYPE_001',
          balance: 0,
          currencyId: 'CUR_001', // EUR (base currency)
          baseCurrencyValue: 0,
          description: 'Argent liquide disponible',
          includeInOverview: true,
          isActive: true,
          createdAt: new Date().toISOString(),
          lastUpdated: new Date().toISOString()
        }
      ],
      tags: [],
      todos: [
        {
          id: 'TODO001',
          title: 'Ajouter suivi des budgets',
          description: 'Permettre aux utilisateurs de définir des budgets mensuels par catégorie et suivre les dépenses',
          category: 'Fonctionnalité',
          status: 'pending',
          priority: 'high',
          estimatedHours: 8,
          createdAt: new Date().toISOString()
        },
        {
          id: 'TODO002',
          title: 'Implémenter transactions récurrentes',
          description: 'Ajouter la possibilité de configurer des revenus/dépenses récurrents (salaire, loyer, abonnements)',
          category: 'Fonctionnalité',
          status: 'pending',
          priority: 'medium',
          estimatedHours: 12,
          createdAt: new Date().toISOString()
        },
        {
          id: 'TODO003',
          title: 'Ajouter rapports et graphiques',
          description: 'Générer des rapports de dépenses, suivi du patrimoine net et graphiques visuels',
          category: 'Amélioration',
          status: 'pending',
          priority: 'medium',
          estimatedHours: 16,
          createdAt: new Date().toISOString()
        },
        {
          id: 'TODO004',
          title: 'Support multi-devises',
          description: 'Permettre le suivi des finances en plusieurs devises avec taux de change automatiques',
          category: 'Fonctionnalité',
          status: 'pending',
          priority: 'high',
          estimatedHours: 20,
          createdAt: new Date().toISOString()
        }
      ]
    };
  }

  // Category CRUD methods
  getCategories() {
    return this.tables.transaction_types.sort((a, b) => (a.order || 0) - (b.order || 0));
  }

  getActiveCategories() {
    return this.tables.transaction_types.filter(category => category.isActive).sort((a, b) => (a.order || 0) - (b.order || 0));
  }

  addCategory(categoryData) {
    if (!this.validateForeignKeys('transaction_types', categoryData)) {
      throw new Error('Invalid foreign key references in transaction type');
    }
    
    // Get next order value
    const maxOrder = Math.max(...this.tables.transaction_types.map(cat => cat.order || 0), 0);
    
    const newCategory = {
      id: 'CAT_' + Date.now(),
      name: categoryData.name,
      description: categoryData.description || '',
      color: categoryData.color || '#2196F3',
      icon: categoryData.icon || '💼',
      defaultAccountId: categoryData.defaultAccountId || null,
      destinationAccountId: categoryData.destinationAccountId || null,
      order: categoryData.order !== undefined ? categoryData.order : maxOrder + 1,
      isActive: categoryData.isActive !== undefined ? categoryData.isActive : true,
      createdAt: new Date().toISOString()
    };

    this.tables.transaction_types.push(newCategory);
    this.saveTableToWorkbook('transaction_types');
    return newCategory;
  }

  updateCategory(id, categoryData) {
    const categoryIndex = this.tables.transaction_types.findIndex(category => category.id === id);
    if (categoryIndex === -1) {
      throw new Error(`Category with id ${id} not found`);
    }

    if (categoryData.defaultAccountId !== undefined || categoryData.destinationAccountId !== undefined) {
      if (!this.validateForeignKeys('transaction_types', categoryData)) {
        throw new Error('Invalid foreign key references in transaction type');
      }
    }

    const updatedCategory = {
      ...this.tables.transaction_types[categoryIndex],
      ...categoryData,
      id: id // Ensure ID doesn't change
    };

    this.tables.transaction_types[categoryIndex] = updatedCategory;
    this.saveTableToWorkbook('transaction_types');
    return updatedCategory;
  }

  deleteCategory(id) {
    const categoryIndex = this.tables.transaction_types.findIndex(category => category.id === id);
    if (categoryIndex === -1) {
      throw new Error(`Category with id ${id} not found`);
    }

    // Check if category is used in subcategories or transactions
    const usedInSubcategories = this.tables.subcategories.some(subcategory => subcategory.categoryId === id);
    const usedInTransactions = this.tables.transactions.some(transaction => transaction.categoryId === id);

    if (usedInSubcategories || usedInTransactions) {
      throw new Error('Cannot delete category: it is used in subcategories or transactions');
    }

    const deletedCategory = this.tables.transaction_types[categoryIndex];
    this.tables.transaction_types.splice(categoryIndex, 1);
    this.saveTableToWorkbook('transaction_types');
    return deletedCategory;
  }

  // Transaction Group CRUD methods
  getTransactionGroups() {
    return this.tables.transaction_groups.sort((a, b) => (a.order || 0) - (b.order || 0));
  }

  getActiveTransactionGroups() {
    return this.tables.transaction_groups.filter(group => group.isActive).sort((a, b) => (a.order || 0) - (b.order || 0));
  }

  addTransactionGroup(groupData) {
    // Get next order value
    const maxOrder = Math.max(...this.tables.transaction_groups.map(grp => grp.order || 0), 0);

    const newGroup = {
      id: `GRP_${String(this.tables.transaction_groups.length + 1).padStart(3, '0')}`,
      name: groupData.name,
      description: groupData.description || '',
      color: groupData.color || '#6366f1',
      order: groupData.order !== undefined ? groupData.order : maxOrder + 1,
      isActive: groupData.isActive !== undefined ? groupData.isActive : true,
      transactionTypeId: groupData.transactionTypeId,
      createdAt: new Date().toISOString()
    };

    this.tables.transaction_groups.push(newGroup);
    this.saveTableToWorkbook('transaction_groups');
    return newGroup;
  }

  updateTransactionGroup(id, groupData) {
    const groupIndex = this.tables.transaction_groups.findIndex(group => group.id === id);
    if (groupIndex === -1) {
      throw new Error(`Transaction group with id ${id} not found`);
    }

    const updatedGroup = {
      ...this.tables.transaction_groups[groupIndex],
      ...groupData,
      id: id // Ensure ID doesn't change
    };

    this.tables.transaction_groups[groupIndex] = updatedGroup;
    this.saveTableToWorkbook('transaction_groups');
    return updatedGroup;
  }

  deleteTransactionGroup(id) {
    const groupIndex = this.tables.transaction_groups.findIndex(group => group.id === id);
    if (groupIndex === -1) {
      throw new Error(`Transaction group with id ${id} not found`);
    }

    // Check if group is used in subcategories
    const usedInSubcategories = this.tables.subcategories.some(subcategory => subcategory.groupId === id);

    if (usedInSubcategories) {
      throw new Error('Cannot delete transaction group: it is used in categories');
    }

    const deletedGroup = this.tables.transaction_groups[groupIndex];
    this.tables.transaction_groups.splice(groupIndex, 1);
    this.saveTableToWorkbook('transaction_groups');
    return deletedGroup;
  }

  // Subcategory CRUD methods
  getSubcategories() {
    return this.tables.subcategories.sort((a, b) => (a.order || 0) - (b.order || 0));
  }

  getActiveSubcategories() {
    return this.tables.subcategories.filter(subcategory => subcategory.isActive).sort((a, b) => (a.order || 0) - (b.order || 0));
  }

  getSubcategoriesByGroup(groupId) {
    return this.tables.subcategories.filter(subcategory => 
      subcategory.groupId === groupId && subcategory.isActive
    ).sort((a, b) => (a.order || 0) - (b.order || 0));
  }

  getSubcategoriesWithCategories() {
    return this.tables.subcategories.map(subcategory => ({
      ...subcategory,
      group: subcategory.groupId ? this.getRecord('transaction_groups', subcategory.groupId) : null
    })).sort((a, b) => (a.order || 0) - (b.order || 0));
  }

  addSubcategory(subcategoryData) {
    if (!this.validateForeignKeys('subcategories', subcategoryData)) {
      throw new Error('Invalid foreign key references in subcategory');
    }

    // Get next order value
    const maxOrder = Math.max(...this.tables.subcategories.map(sub => sub.order || 0), 0);

    const newSubcategory = {
      id: 'SUBCAT_' + Date.now(),
      groupId: subcategoryData.groupId || null,
      name: subcategoryData.name,
      description: subcategoryData.description || '',
      order: subcategoryData.order !== undefined ? subcategoryData.order : maxOrder + 1,
      isActive: subcategoryData.isActive !== undefined ? subcategoryData.isActive : true,
      createdAt: new Date().toISOString()
    };

    this.tables.subcategories.push(newSubcategory);
    this.saveTableToWorkbook('subcategories');
    return newSubcategory;
  }

  updateSubcategory(id, subcategoryData) {
    if (subcategoryData.groupId && !this.validateForeignKeys('subcategories', subcategoryData)) {
      throw new Error('Invalid foreign key references in subcategory');
    }

    const subcategoryIndex = this.tables.subcategories.findIndex(subcategory => subcategory.id === id);
    if (subcategoryIndex === -1) {
      throw new Error(`Subcategory with id ${id} not found`);
    }

    const updatedSubcategory = {
      ...this.tables.subcategories[subcategoryIndex],
      ...subcategoryData,
      id: id // Ensure ID doesn't change
    };

    this.tables.subcategories[subcategoryIndex] = updatedSubcategory;
    this.saveTableToWorkbook('subcategories');
    return updatedSubcategory;
  }

  deleteSubcategory(id) {
    const subcategoryIndex = this.tables.subcategories.findIndex(subcategory => subcategory.id === id);
    if (subcategoryIndex === -1) {
      throw new Error(`Subcategory with id ${id} not found`);
    }

    // Check if subcategory is used in transactions
    const usedInTransactions = this.tables.transactions.some(transaction => transaction.subcategoryId === id);

    if (usedInTransactions) {
      throw new Error('Cannot delete subcategory: it is used in transactions');
    }

    const deletedSubcategory = this.tables.subcategories[subcategoryIndex];
    this.tables.subcategories.splice(subcategoryIndex, 1);
    this.saveTableToWorkbook('subcategories');
    return deletedSubcategory;
  }

  generateCategories(language) {
    if (language === 'fr') {
      return this.generateFrenchCategories();
    } else {
      return this.generateEnglishCategories();
    }
  }

  generateTransactionGroups(language) {
    if (language === 'fr') {
      return this.generateFrenchTransactionGroups();
    } else {
      return this.generateEnglishTransactionGroups();
    }
  }

  generateSubcategories(language) {
    if (language === 'fr') {
      return this.generateFrenchSubcategories();
    } else {
      return this.generateEnglishSubcategories();
    }
  }

  generateEnglishCategories() {
    return [
      {
        id: 'CAT_002',
        name: 'Expenses',
        description: 'Money going out',
        color: '#F44336',
        icon: '💸',
        defaultAccountId: 'ACC001', // Default Account - where expenses typically come from
        destinationAccountId: null, // Not relevant for expenses
        isActive: true,
        createdAt: new Date().toISOString()
      },
      {
        id: 'CAT_001',
        name: 'Income',
        description: 'Money coming in',
        color: '#4CAF50',
        icon: '💰',
        defaultAccountId: 'ACC001', // Default Account - where income typically goes
        destinationAccountId: null, // Not relevant for income
        isActive: true,
        createdAt: new Date().toISOString()
      },
      {
        id: 'CAT_003',
        name: 'Transfer',
        description: 'Money movement between accounts',
        color: '#2196F3',
        icon: '🔄',
        defaultAccountId: 'ACC002', // Bank Account - Checking - typical source
        destinationAccountId: 'ACC003', // Savings Account - typical destination
        isActive: true,
        createdAt: new Date().toISOString()
      },
      {
        id: 'CAT_004',
        name: 'Investment',
        description: 'Investment-related transactions',
        color: '#9C27B0',
        icon: '📈',
        defaultAccountId: 'ACC001', // Default Account - where investment money comes from
        destinationAccountId: null, // Not relevant for investment
        isActive: true,
        createdAt: new Date().toISOString()
      }
    ];
  }

  generateFrenchCategories() {
    return [
      {
        id: 'CAT_002',
        name: 'Dépenses',
        description: 'Argent qui sort',
        color: '#F44336',
        icon: '💸',
        defaultAccountId: 'ACC001', // Default Account - d'où viennent typiquement les dépenses
        destinationAccountId: null, // Non pertinent pour les dépenses
        isActive: true,
        createdAt: new Date().toISOString()
      },
      {
        id: 'CAT_001',
        name: 'Revenus',
        description: 'Argent qui rentre',
        color: '#4CAF50',
        icon: '💰',
        defaultAccountId: 'ACC001', // Default Account - où vont typiquement les revenus
        destinationAccountId: null, // Non pertinent pour les revenus
        isActive: true,
        createdAt: new Date().toISOString()
      },
      {
        id: 'CAT_003',
        name: 'Virement',
        description: 'Mouvement d\'argent entre comptes',
        color: '#2196F3',
        icon: '🔄',
        defaultAccountId: 'ACC002', // Bank Account - Checking - source typique
        destinationAccountId: 'ACC003', // Savings Account - destination typique
        isActive: true,
        createdAt: new Date().toISOString()
      },
      {
        id: 'CAT_004',
        name: 'Investissement',
        description: 'Transactions liées aux investissements',
        color: '#9C27B0',
        icon: '📈',
        defaultAccountId: 'ACC001', // Default Account - d'où vient l'argent pour les investissements
        destinationAccountId: null, // Non pertinent pour les investissements
        isActive: true,
        createdAt: new Date().toISOString()
      }
    ];
  }

  generateEnglishTransactionGroups() {
    return [
      {
        id: 'GRP_001',
        name: 'Essential Expenses',
        description: 'Basic needs and necessities',
        color: '#ef4444',
        isActive: true,
        transactionTypeId: 'CAT_002', // Expenses
        createdAt: new Date().toISOString()
      },
      {
        id: 'GRP_002',
        name: 'Lifestyle & Recreation',
        description: 'Entertainment and personal enjoyment',
        color: '#f97316',
        isActive: true,
        transactionTypeId: 'CAT_002', // Expenses
        createdAt: new Date().toISOString()
      },
      {
        id: 'GRP_003',
        name: 'Professional & Business',
        description: 'Work and business related income',
        color: '#eab308',
        isActive: true,
        transactionTypeId: 'CAT_001', // Income
        createdAt: new Date().toISOString()
      },
      {
        id: 'GRP_004',
        name: 'Investment & Savings',
        description: 'Financial growth and savings',
        color: '#22c55e',
        isActive: true,
        transactionTypeId: 'CAT_001', // Income (could be investment income or savings related)
        createdAt: new Date().toISOString()
      },
      {
        id: 'GRP_005',
        name: 'Bank Transfer',
        description: 'Internal bank transfers',
        color: '#2196F3',
        isActive: true,
        transactionTypeId: 'CAT_003', // Transfer
        createdAt: new Date().toISOString()
      },
      {
        id: 'GRP_006',
        name: 'Digital Assets',
        description: 'Crypto related investments',
        color: '#9C27B0',
        isActive: true,
        transactionTypeId: 'CAT_004', // Investment
        createdAt: new Date().toISOString()
      }
    ];
  }

  generateFrenchTransactionGroups() {
    return [
      {
        id: 'GRP_001',
        name: 'Dépenses Essentielles',
        description: 'Besoins de base et nécessités',
        color: '#ef4444',
        isActive: true,
        transactionTypeId: 'CAT_002', // Expenses
        createdAt: new Date().toISOString()
      },
      {
        id: 'GRP_002',
        name: 'Style de Vie et Loisirs',
        description: 'Divertissement et plaisir personnel',
        color: '#f97316',
        isActive: true,
        transactionTypeId: 'CAT_002', // Expenses
        createdAt: new Date().toISOString()
      },
      {
        id: 'GRP_003',
        name: 'Professionnel et Affaires',
        description: 'Revenus liés au travail et aux affaires',
        color: '#eab308',
        isActive: true,
        transactionTypeId: 'CAT_001', // Income
        createdAt: new Date().toISOString()
      },
      {
        id: 'GRP_004',
        name: 'Investissement et Épargne',
        description: 'Croissance financière et épargne',
        color: '#22c55e',
        isActive: true,
        transactionTypeId: 'CAT_001', // Income
        createdAt: new Date().toISOString()
      },
      {
        id: 'GRP_005',
        name: 'Virement Bancaire',
        description: 'Virements bancaires internes',
        color: '#2196F3',
        isActive: true,
        transactionTypeId: 'CAT_003', // Transfer
        createdAt: new Date().toISOString()
      },
      {
        id: 'GRP_006',
        name: 'Actifs Numériques',
        description: 'Investissements liés aux cryptomonnaies',
        color: '#9C27B0',
        isActive: true,
        transactionTypeId: 'CAT_004', // Investment
        createdAt: new Date().toISOString()
      }
    ];
  }

  generateEnglishSubcategories() {
    return [
      // GRP_001 - Essential Expenses (Expenses)
      { id: 'SUB_001', name: 'Groceries & Food', description: 'Food, beverages and grocery shopping', groupId: 'GRP_001', isActive: true, createdAt: new Date().toISOString() },
      { id: 'SUB_002', name: 'Housing & Utilities', description: 'Rent, mortgage, electricity, water, gas', groupId: 'GRP_001', isActive: true, createdAt: new Date().toISOString() },
      { id: 'SUB_003', name: 'Transportation & Fuel', description: 'Gas, public transport, car maintenance', groupId: 'GRP_001', isActive: true, createdAt: new Date().toISOString() },
      { id: 'SUB_004', name: 'Healthcare & Medical', description: 'Doctor visits, medications, health services', groupId: 'GRP_001', isActive: true, createdAt: new Date().toISOString() },
      { id: 'SUB_005', name: 'Insurance Premiums', description: 'Health, auto, home insurance payments', groupId: 'GRP_001', isActive: true, createdAt: new Date().toISOString() },
      { id: 'SUB_006', name: 'Debt Payments', description: 'Credit card, loan, mortgage payments', groupId: 'GRP_001', isActive: true, createdAt: new Date().toISOString() },
      
      // GRP_002 - Lifestyle & Recreation (Expenses)
      { id: 'SUB_007', name: 'Dining Out & Restaurants', description: 'Restaurant meals, takeout, food delivery', groupId: 'GRP_002', isActive: true, createdAt: new Date().toISOString() },
      { id: 'SUB_008', name: 'Entertainment & Movies', description: 'Cinema, concerts, shows, events', groupId: 'GRP_002', isActive: true, createdAt: new Date().toISOString() },
      { id: 'SUB_009', name: 'Travel & Vacation', description: 'Hotels, flights, vacation expenses', groupId: 'GRP_002', isActive: true, createdAt: new Date().toISOString() },
      { id: 'SUB_010', name: 'Hobbies & Sports', description: 'Sports equipment, hobby supplies, activities', groupId: 'GRP_002', isActive: true, createdAt: new Date().toISOString() },
      { id: 'SUB_011', name: 'Shopping & Personal Items', description: 'Clothing, personal care, non-essential items', groupId: 'GRP_002', isActive: true, createdAt: new Date().toISOString() },
      { id: 'SUB_012', name: 'Subscriptions & Memberships', description: 'Netflix, gym, apps, magazine subscriptions', groupId: 'GRP_002', isActive: true, createdAt: new Date().toISOString() },
      
      // GRP_003 - Professional & Business (Income)
      { id: 'SUB_013', name: 'Salary & Wages', description: 'Regular employment income, wages', groupId: 'GRP_003', isActive: true, createdAt: new Date().toISOString() },
      { id: 'SUB_014', name: 'Freelance & Consulting', description: 'Independent contractor, consulting income', groupId: 'GRP_003', isActive: true, createdAt: new Date().toISOString() },
      { id: 'SUB_015', name: 'Business Revenue', description: 'Business sales, revenue, profits', groupId: 'GRP_003', isActive: true, createdAt: new Date().toISOString() },
      { id: 'SUB_016', name: 'Bonuses & Commissions', description: 'Performance bonuses, sales commissions', groupId: 'GRP_003', isActive: true, createdAt: new Date().toISOString() },
      { id: 'SUB_017', name: 'Professional Services Income', description: 'Professional services, expertise income', groupId: 'GRP_003', isActive: true, createdAt: new Date().toISOString() },
      
      // GRP_004 - Investment & Savings (Investment)
      { id: 'SUB_018', name: 'Stock Investments', description: 'Individual stocks, equity investments', groupId: 'GRP_004', isActive: true, createdAt: new Date().toISOString() },
      { id: 'SUB_019', name: 'Bond Investments', description: 'Government, corporate bonds, fixed income', groupId: 'GRP_004', isActive: true, createdAt: new Date().toISOString() },
      { id: 'SUB_020', name: 'Real Estate Investment', description: 'Property investment, REITs', groupId: 'GRP_004', isActive: true, createdAt: new Date().toISOString() },
      { id: 'SUB_021', name: 'Retirement Savings', description: '401k, IRA, pension contributions', groupId: 'GRP_004', isActive: true, createdAt: new Date().toISOString() },
      { id: 'SUB_022', name: 'Emergency Fund', description: 'Emergency savings, rainy day fund', groupId: 'GRP_004', isActive: true, createdAt: new Date().toISOString() },
      { id: 'SUB_023', name: 'Investment Returns', description: 'Dividends, interest, capital gains', groupId: 'GRP_004', isActive: true, createdAt: new Date().toISOString() },
      
      // GRP_005 - Bank Transfer (Transfer)
      { id: 'SUB_024', name: 'Account to Account Transfer', description: 'Internal transfers between own accounts', groupId: 'GRP_005', isActive: true, createdAt: new Date().toISOString() },
      { id: 'SUB_025', name: 'External Bank Transfer', description: 'Transfers to/from other banks', groupId: 'GRP_005', isActive: true, createdAt: new Date().toISOString() },
      { id: 'SUB_026', name: 'Wire Transfers', description: 'Domestic and international wire transfers', groupId: 'GRP_005', isActive: true, createdAt: new Date().toISOString() },
      { id: 'SUB_027', name: 'ATM Transfers', description: 'ATM cash deposits and transfers', groupId: 'GRP_005', isActive: true, createdAt: new Date().toISOString() },
      
      // GRP_006 - Digital Assets (Investment)
      { id: 'SUB_028', name: 'Bitcoin Investment', description: 'Bitcoin purchases and investments', groupId: 'GRP_006', isActive: true, createdAt: new Date().toISOString() },
      { id: 'SUB_029', name: 'Ethereum Investment', description: 'Ethereum purchases and investments', groupId: 'GRP_006', isActive: true, createdAt: new Date().toISOString() },
      { id: 'SUB_030', name: 'Altcoin Investment', description: 'Alternative cryptocurrency investments', groupId: 'GRP_006', isActive: true, createdAt: new Date().toISOString() },
      { id: 'SUB_031', name: 'Crypto Trading', description: 'Cryptocurrency trading activities', groupId: 'GRP_006', isActive: true, createdAt: new Date().toISOString() },
      { id: 'SUB_032', name: 'DeFi & Staking', description: 'DeFi protocols, staking rewards', groupId: 'GRP_006', isActive: true, createdAt: new Date().toISOString() }
    ];
  }

  generateFrenchSubcategories() {
    return [
      // GRP_001 - Dépenses Essentielles (Expenses)
      { id: 'SUB_001', name: 'Alimentation & Courses', description: 'Nourriture, boissons et courses alimentaires', groupId: 'GRP_001', isActive: true, createdAt: new Date().toISOString() },
      { id: 'SUB_002', name: 'Logement & Services Publics', description: 'Loyer, hypothèque, électricité, eau, gaz', groupId: 'GRP_001', isActive: true, createdAt: new Date().toISOString() },
      { id: 'SUB_003', name: 'Transport & Carburant', description: 'Essence, transports publics, entretien auto', groupId: 'GRP_001', isActive: true, createdAt: new Date().toISOString() },
      { id: 'SUB_004', name: 'Santé & Médical', description: 'Visites médicales, médicaments, services santé', groupId: 'GRP_001', isActive: true, createdAt: new Date().toISOString() },
      { id: 'SUB_005', name: 'Primes d\'Assurance', description: 'Assurance santé, auto, habitation', groupId: 'GRP_001', isActive: true, createdAt: new Date().toISOString() },
      { id: 'SUB_006', name: 'Remboursement de Dettes', description: 'Carte crédit, prêt, remboursement hypothèque', groupId: 'GRP_001', isActive: true, createdAt: new Date().toISOString() },
      
      // GRP_002 - Style de Vie et Loisirs (Expenses)
      { id: 'SUB_007', name: 'Restaurants & Sortie', description: 'Repas restaurant, commandes, livraison', groupId: 'GRP_002', isActive: true, createdAt: new Date().toISOString() },
      { id: 'SUB_008', name: 'Divertissement & Cinéma', description: 'Cinéma, concerts, spectacles, événements', groupId: 'GRP_002', isActive: true, createdAt: new Date().toISOString() },
      { id: 'SUB_009', name: 'Voyage & Vacances', description: 'Hôtels, vols, dépenses vacances', groupId: 'GRP_002', isActive: true, createdAt: new Date().toISOString() },
      { id: 'SUB_010', name: 'Loisirs & Sports', description: 'Équipement sport, fournitures loisirs', groupId: 'GRP_002', isActive: true, createdAt: new Date().toISOString() },
      { id: 'SUB_011', name: 'Achats & Articles Personnels', description: 'Vêtements, soins personnels, articles non-essentiels', groupId: 'GRP_002', isActive: true, createdAt: new Date().toISOString() },
      { id: 'SUB_012', name: 'Abonnements & Adhésions', description: 'Netflix, salle sport, apps, abonnements magazine', groupId: 'GRP_002', isActive: true, createdAt: new Date().toISOString() },
      
      // GRP_003 - Professionnel et Affaires (Income)
      { id: 'SUB_013', name: 'Salaire & Rémunération', description: 'Revenus emploi régulier, salaires', groupId: 'GRP_003', isActive: true, createdAt: new Date().toISOString() },
      { id: 'SUB_014', name: 'Freelance & Conseil', description: 'Travailleur indépendant, revenus conseil', groupId: 'GRP_003', isActive: true, createdAt: new Date().toISOString() },
      { id: 'SUB_015', name: 'Revenus d\'Entreprise', description: 'Ventes entreprise, chiffre affaires, profits', groupId: 'GRP_003', isActive: true, createdAt: new Date().toISOString() },
      { id: 'SUB_016', name: 'Bonus & Commissions', description: 'Bonus performance, commissions ventes', groupId: 'GRP_003', isActive: true, createdAt: new Date().toISOString() },
      { id: 'SUB_017', name: 'Revenus de Services Professionnels', description: 'Services professionnels, revenus expertise', groupId: 'GRP_003', isActive: true, createdAt: new Date().toISOString() },
      
      // GRP_004 - Investissement et Épargne (Investment)
      { id: 'SUB_018', name: 'Investissements Actions', description: 'Actions individuelles, investissements actions', groupId: 'GRP_004', isActive: true, createdAt: new Date().toISOString() },
      { id: 'SUB_019', name: 'Investissements Obligations', description: 'Obligations gouvernementales, entreprises', groupId: 'GRP_004', isActive: true, createdAt: new Date().toISOString() },
      { id: 'SUB_020', name: 'Investissement Immobilier', description: 'Investissement propriété, REITs', groupId: 'GRP_004', isActive: true, createdAt: new Date().toISOString() },
      { id: 'SUB_021', name: 'Épargne Retraite', description: 'Contributions retraite, pension', groupId: 'GRP_004', isActive: true, createdAt: new Date().toISOString() },
      { id: 'SUB_022', name: 'Fonds d\'Urgence', description: 'Épargne urgence, fonds précaution', groupId: 'GRP_004', isActive: true, createdAt: new Date().toISOString() },
      { id: 'SUB_023', name: 'Rendements d\'Investissement', description: 'Dividendes, intérêts, gains capital', groupId: 'GRP_004', isActive: true, createdAt: new Date().toISOString() },
      
      // GRP_005 - Virement Bancaire (Transfer)
      { id: 'SUB_024', name: 'Virement Compte à Compte', description: 'Virements internes entre comptes', groupId: 'GRP_005', isActive: true, createdAt: new Date().toISOString() },
      { id: 'SUB_025', name: 'Virement Bancaire Externe', description: 'Virements vers/depuis autres banques', groupId: 'GRP_005', isActive: true, createdAt: new Date().toISOString() },
      { id: 'SUB_026', name: 'Virements Télégraphiques', description: 'Virements nationaux et internationaux', groupId: 'GRP_005', isActive: true, createdAt: new Date().toISOString() },
      { id: 'SUB_027', name: 'Virements DAB', description: 'Dépôts et virements DAB', groupId: 'GRP_005', isActive: true, createdAt: new Date().toISOString() },
      
      // GRP_006 - Actifs Numériques (Investment)
      { id: 'SUB_028', name: 'Investissement Bitcoin', description: 'Achats et investissements Bitcoin', groupId: 'GRP_006', isActive: true, createdAt: new Date().toISOString() },
      { id: 'SUB_029', name: 'Investissement Ethereum', description: 'Achats et investissements Ethereum', groupId: 'GRP_006', isActive: true, createdAt: new Date().toISOString() },
      { id: 'SUB_030', name: 'Investissement Altcoin', description: 'Investissements cryptomonnaies alternatives', groupId: 'GRP_006', isActive: true, createdAt: new Date().toISOString() },
      { id: 'SUB_031', name: 'Trading Crypto', description: 'Activités trading cryptomonnaies', groupId: 'GRP_006', isActive: true, createdAt: new Date().toISOString() },
      { id: 'SUB_032', name: 'DeFi & Staking', description: 'Protocoles DeFi, récompenses staking', groupId: 'GRP_006', isActive: true, createdAt: new Date().toISOString() }
    ];
  }

  // Stress test method to generate bulk transactions
  generateStressTestTransactions(count = 1000) {
    console.log(`Starting stress test: generating ${count} transactions...`);
    
    const startTime = performance.now();
    const transactions = [];
    
    // Get available accounts
    const accounts = this.tables.accounts.filter(acc => acc.isActive);
    const categories = this.tables.transaction_types;
    const subcategories = this.tables.subcategories;
    const tags = this.tables.tags;
    
    if (accounts.length < 2) {
      throw new Error('Need at least 2 active accounts for stress testing');
    }
    
    // Sample transaction descriptions
    const descriptions = [
      'Grocery Shopping', 'Gas Station Purchase', 'Online Shopping', 'Restaurant Meal',
      'Coffee Shop', 'Utility Payment', 'Rent Payment', 'Salary Deposit',
      'Investment Purchase', 'Bank Fee', 'ATM Withdrawal', 'Medical Expense',
      'Insurance Payment', 'Phone Bill', 'Internet Service', 'Subscription Service',
      'Car Repair', 'Home Maintenance', 'Entertainment', 'Travel Expense',
      'Gift Purchase', 'Charity Donation', 'Tax Payment', 'Loan Payment',
      'Credit Card Payment', 'Dividend Income', 'Interest Income', 'Freelance Income',
      'Refund Received', 'Cash Back Reward'
    ];
    
    const references = [
      'INV-2024-001', 'CHK-1001', 'TXN-AUTO-001', 'REF-12345',
      'ORD-98765', 'BILL-2024001', 'PAY-001234', 'DEP-SALARY-001'
    ];
    
    const notes = [
      'Regular monthly expense', 'One-time purchase', 'Business expense',
      'Personal expense', 'Emergency fund', 'Investment income',
      'Routine payment', 'Special occasion', 'Maintenance cost',
      'Annual payment', '', '' // Some empty notes
    ];
    
    // Generate transactions
    for (let i = 0; i < count; i++) {
      // Random date within last 2 years
      const randomDate = new Date();
      randomDate.setDate(randomDate.getDate() - Math.floor(Math.random() * 730));
      
      // Random accounts (ensure they're different)
      const debitAccount = accounts[Math.floor(Math.random() * accounts.length)];
      let creditAccount;
      do {
        creditAccount = accounts[Math.floor(Math.random() * accounts.length)];
      } while (creditAccount.id === debitAccount.id);
      
      // Random amount between $5 and $5000
      const amount = (Math.random() * 4995 + 5).toFixed(2);
      
      const transaction = {
        id: `STRESS_TXN_${i}_${Date.now()}`,
        date: randomDate.toISOString().split('T')[0],
        description: descriptions[Math.floor(Math.random() * descriptions.length)] + ` #${i + 1}`,
        debitAccountId: debitAccount.id,
        creditAccountId: creditAccount.id,
        amount: parseFloat(amount),
        productId: Math.random() > 0.8 && tags.length > 0 ? 
          tags[Math.floor(Math.random() * tags.length)].id : null,
        categoryId: Math.random() > 0.5 && categories.length > 0 ? 
          categories[Math.floor(Math.random() * categories.length)].id : null,
        subcategoryId: Math.random() > 0.5 && subcategories.length > 0 ? 
          subcategories[Math.floor(Math.random() * subcategories.length)].id : null,
        reference: Math.random() > 0.7 ? 
          references[Math.floor(Math.random() * references.length)] : '',
        notes: notes[Math.floor(Math.random() * notes.length)],
        createdAt: new Date().toISOString()
      };
      
      transactions.push(transaction);
    }
    
    // Add all transactions to the database
    this.tables.transactions.push(...transactions);
    
    // Update account balances for all transactions
    transactions.forEach(transaction => {
      this.updateAccountBalances(transaction);
    });
    
    // Update workbooks
    this.saveTableToWorkbook('transactions');
    this.saveTableToWorkbook('accounts');
    
    const endTime = performance.now();
    const duration = (endTime - startTime).toFixed(2);
    
    console.log(`Stress test completed: Generated ${count} transactions in ${duration}ms`);
    console.log(`Total transactions in database: ${this.tables.transactions.length}`);
    console.log(`Average time per transaction: ${(duration / count).toFixed(3)}ms`);
    
    return {
      generated: count,
      total: this.tables.transactions.length,
      duration: duration,
      averageTime: (duration / count).toFixed(3)
    };
  }

  // Clear all stress test transactions
  clearStressTestTransactions() {
    const initialCount = this.tables.transactions.length;
    this.tables.transactions = this.tables.transactions.filter(
      txn => !txn.id.startsWith('STRESS_TXN_')
    );
    const removed = initialCount - this.tables.transactions.length;
    
    // Recalculate all account balances
    this.tables.accounts.forEach(account => {
      account.balance = account.initialBalance || 0;
    });
    
    this.tables.transactions.forEach(transaction => {
      this.updateAccountBalances(transaction);
    });
    
    this.saveTableToWorkbook('transactions');
    this.saveTableToWorkbook('accounts');
    
    console.log(`Cleared ${removed} stress test transactions`);
    return removed;
  }

  generateCurrencies() {
    return [
      {
        id: 'CUR_001',
        code: 'EUR',
        name: 'Euro',
        symbol: '€',
        type: 'fiat',
        decimalPlaces: 2,
        isActive: true,
        isBase: true,
        createdAt: new Date().toISOString()
      },
      {
        id: 'CUR_002',
        code: 'USD',
        name: 'US Dollar',
        symbol: '$',
        type: 'fiat',
        decimalPlaces: 2,
        isActive: true,
        isBase: false,
        createdAt: new Date().toISOString()
      },
      {
        id: 'CUR_003',
        code: 'AED',
        name: 'UAE Dirham',
        symbol: 'AED',
        type: 'fiat',
        decimalPlaces: 2,
        isActive: true,
        isBase: false,
        createdAt: new Date().toISOString()
      },
      {
        id: 'CUR_004',
        code: 'GBP',
        name: 'British Pound',
        symbol: '£',
        type: 'fiat',
        decimalPlaces: 2,
        isActive: true,
        isBase: false,
        createdAt: new Date().toISOString()
      },
      {
        id: 'CUR_005',
        code: 'AUD',
        name: 'Australian Dollar',
        symbol: 'A$',
        type: 'fiat',
        decimalPlaces: 2,
        isActive: true,
        isBase: false,
        createdAt: new Date().toISOString()
      },
      {
        id: 'CUR_006',
        code: 'BTC',
        name: 'Bitcoin',
        symbol: '₿',
        type: 'crypto',
        decimalPlaces: 4,
        isActive: true,
        isBase: false,
        createdAt: new Date().toISOString()
      },
      {
        id: 'CUR_007',
        code: 'ETH',
        name: 'Ethereum',
        symbol: 'Ξ',
        type: 'crypto',
        decimalPlaces: 4,
        isActive: true,
        isBase: false,
        createdAt: new Date().toISOString()
      },
      {
        id: 'CUR_008',
        code: 'CHF',
        name: 'Swiss Franc',
        symbol: 'CHF',
        type: 'fiat',
        decimalPlaces: 2,
        isActive: true,
        isBase: false,
        createdAt: new Date().toISOString()
      }
    ];
  }

  generateExchangeRates() {
    const today = new Date().toISOString().split('T')[0];
    return [
      {
        id: 'ER_001',
        fromCurrencyId: 'CUR_002', // USD
        toCurrencyId: 'CUR_001',   // EUR (base)
        rate: 0.91,
        date: today,
        source: 'manual',
        createdAt: new Date().toISOString()
      },
      {
        id: 'ER_002',
        fromCurrencyId: 'CUR_003', // AED
        toCurrencyId: 'CUR_001',   // EUR (base)
        rate: 0.25,
        date: today,
        source: 'manual',
        createdAt: new Date().toISOString()
      },
      {
        id: 'ER_003',
        fromCurrencyId: 'CUR_004', // GBP
        toCurrencyId: 'CUR_001',   // EUR (base)
        rate: 1.15,
        date: today,
        source: 'manual',
        createdAt: new Date().toISOString()
      },
      {
        id: 'ER_004',
        fromCurrencyId: 'CUR_005', // AUD
        toCurrencyId: 'CUR_001',   // EUR (base)
        rate: 0.62,
        date: today,
        source: 'manual',
        createdAt: new Date().toISOString()
      },
      {
        id: 'ER_005',
        fromCurrencyId: 'CUR_006', // BTC
        toCurrencyId: 'CUR_001',   // EUR (base)
        rate: 40900,
        date: today,
        source: 'manual',
        createdAt: new Date().toISOString()
      },
      {
        id: 'ER_006',
        fromCurrencyId: 'CUR_007', // ETH
        toCurrencyId: 'CUR_001',   // EUR (base)
        rate: 2270,
        date: today,
        source: 'manual',
        createdAt: new Date().toISOString()
      },
      {
        id: 'ER_007',
        fromCurrencyId: 'CUR_008', // CHF
        toCurrencyId: 'CUR_001',   // EUR (base)
        rate: 0.93,
        date: today,
        source: 'manual',
        createdAt: new Date().toISOString()
      }
    ];
  }

  generateCurrencySettings() {
    return [
      {
        id: 'CS_001',
        userId: 'default',
        baseCurrencyId: 'CUR_001', // EUR (base currency)
        autoUpdateRates: false,
        rateUpdateFrequency: 'manual',
        lastRateUpdate: new Date().toISOString(),
        createdAt: new Date().toISOString()
      }
    ];
  }

  generateUserPreferences() {
    const currencies = this.generateCurrencies();
    const preferences = [];
    
    // Create per-currency formatting preferences with smart defaults
    currencies.forEach((currency, index) => {
      let defaultSettings = {};
      
      if (currency.code === 'EUR') {
        // European convention
        defaultSettings = {
          currencySymbolPosition: 'after',
          decimalSeparator: 'comma',
          thousandsSeparator: 'space',
          decimalPrecision: 'auto',
          negativeDisplay: 'minus',
          largeNumberNotation: 'full',
          currencyCodeDisplay: 'symbol-only'
        };
      } else if (currency.code === 'USD' || currency.code === 'GBP') {
        // Anglo convention
        defaultSettings = {
          currencySymbolPosition: 'before',
          decimalSeparator: 'dot',
          thousandsSeparator: 'comma',
          decimalPrecision: 'auto',
          negativeDisplay: 'minus',
          largeNumberNotation: 'full',
          currencyCodeDisplay: 'symbol-only'
        };
      } else if (currency.code === 'CHF') {
        // Swiss convention
        defaultSettings = {
          currencySymbolPosition: 'before',
          decimalSeparator: 'dot',
          thousandsSeparator: 'apostrophe',
          decimalPrecision: 'auto',
          negativeDisplay: 'minus',
          largeNumberNotation: 'full',
          currencyCodeDisplay: 'symbol-only'
        };
      } else if (currency.type === 'crypto') {
        // Crypto convention
        defaultSettings = {
          currencySymbolPosition: 'after',
          decimalSeparator: 'dot',
          thousandsSeparator: 'comma',
          decimalPrecision: 'auto',
          negativeDisplay: 'minus',
          largeNumberNotation: 'full',
          currencyCodeDisplay: 'symbol-only'
        };
      } else {
        // Default for other currencies
        defaultSettings = {
          currencySymbolPosition: 'before',
          decimalSeparator: 'dot',
          thousandsSeparator: 'comma',
          decimalPrecision: 'auto',
          negativeDisplay: 'minus',
          largeNumberNotation: 'full',
          currencyCodeDisplay: 'symbol-only'
        };
      }
      
      preferences.push({
        id: `PREF_CURRENCY_${String(index + 1).padStart(3, '0')}`,
        userId: 'default',
        category: 'currency_formatting',
        currencyId: currency.id,
        settings: JSON.stringify(defaultSettings),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    });
    
    // Add date formatting preference
    preferences.push({
      id: 'PREF_DATE_001',
      userId: 'default',
      category: 'date_formatting',
      settings: JSON.stringify({
        dateFormat: 'DD/MM/YYYY',
        timeFormat: '24h',
        timezone: 'local',
        showSeconds: false,
        showTimeZone: false,
        relativeTime: false,
        firstDayOfWeek: 'monday'
      }),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    
    return preferences;
  }

  generateApiUsage() {
    return [
      {
        id: 'USAGE_001',
        currentMonth: new Date().toISOString().slice(0, 7), // YYYY-MM
        requestCount: 0,
        monthlyLimit: 1500, // Free tier default
        lastRequest: null,
        createdAt: new Date().toISOString()
      }
    ];
  }

  generateApiSettings() {
    return [
      {
        id: 'API_001',
        provider: 'exchangerate-api',
        apiKey: '', // User needs to set this
        isActive: false,
        autoUpdate: false,
        frequency: 'manual', // 'manual', 'hourly', 'daily'
        baseCurrency: 'EUR',
        lastUpdate: null,
        settings: {
          retries: 3,
          timeout: 30000
        },
        createdAt: new Date().toISOString()
      }
    ];
  }

  // Currency management methods
  addCurrency(currencyData) {
    const id = this.generateId('CUR');
    const newCurrency = {
      id,
      ...currencyData,
      isActive: currencyData.isActive !== undefined ? currencyData.isActive : true,
      createdAt: new Date().toISOString()
    };

    this.tables.currencies.push(newCurrency);
    this.saveTableToWorkbook('currencies');
    return newCurrency;
  }

  updateCurrency(id, currencyData) {
    const currencyIndex = this.tables.currencies.findIndex(currency => currency.id === id);
    if (currencyIndex === -1) {
      throw new Error(`Currency with id ${id} not found`);
    }

    const updatedCurrency = {
      ...this.tables.currencies[currencyIndex],
      ...currencyData,
      id: id // Ensure ID doesn't change
    };

    this.tables.currencies[currencyIndex] = updatedCurrency;
    this.saveTableToWorkbook('currencies');
    return updatedCurrency;
  }

  deleteCurrency(id) {
    const currencyIndex = this.tables.currencies.findIndex(currency => currency.id === id);
    if (currencyIndex === -1) {
      throw new Error(`Currency with id ${id} not found`);
    }

    // Check if currency is used in accounts or transactions
    const usedInAccounts = this.tables.accounts.some(account => account.currencyId === id);
    const usedInTransactions = this.tables.transactions.some(transaction => transaction.currencyId === id);

    if (usedInAccounts || usedInTransactions) {
      throw new Error('Cannot delete currency: it is used in accounts or transactions');
    }

    const deletedCurrency = this.tables.currencies[currencyIndex];
    this.tables.currencies.splice(currencyIndex, 1);
    this.saveTableToWorkbook('currencies');
    return deletedCurrency;
  }

  // Exchange rate management methods
  addExchangeRate(rateData) {
    const id = this.generateId('ER');
    const newRate = {
      id,
      ...rateData,
      date: rateData.date || new Date().toISOString().split('T')[0],
      source: rateData.source || 'manual',
      createdAt: new Date().toISOString()
    };

    this.tables.exchange_rates.push(newRate);
    this.saveTableToWorkbook('exchange_rates');
    return newRate;
  }

  // Currency settings management methods
  updateCurrencySettings(settingsData) {
    let settings = this.tables.currency_settings.find(s => s.userId === 'default');
    
    if (settings) {
      Object.assign(settings, settingsData);
    } else {
      settings = {
        id: 'CS_001',
        userId: 'default',
        ...settingsData,
        createdAt: new Date().toISOString()
      };
      this.tables.currency_settings.push(settings);
    }

    this.saveTableToWorkbook('currency_settings');
    return settings;
  }

  // User Preferences CRUD methods
  getUserPreferences(userId = 'default') {
    return this.tables.user_preferences.filter(pref => pref.userId === userId);
  }

  updateUserPreferences(category, settings, userId = 'default') {
    let preferences = this.tables.user_preferences.find(p => p.userId === userId && p.category === category);
    
    if (preferences) {
      // Parse existing settings from JSON string, merge with new settings, then stringify back
      const existingSettings = typeof preferences.settings === 'string' 
        ? JSON.parse(preferences.settings) 
        : preferences.settings;
      preferences.settings = JSON.stringify({ ...existingSettings, ...settings });
      preferences.updatedAt = new Date().toISOString();
    } else {
      preferences = {
        id: `PREF_${Date.now()}`,
        userId: userId,
        category: category,
        settings: JSON.stringify(settings),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      this.tables.user_preferences.push(preferences);
    }

    this.saveTableToWorkbook('user_preferences');
    return preferences;
  }

  getCurrencyFormatPreferences(currencyId, userId = 'default') {
    const prefs = this.tables.user_preferences.find(p => 
      p.userId === userId && 
      p.category === 'currency_formatting' && 
      p.currencyId === currencyId
    );
    
    if (prefs) {
      return typeof prefs.settings === 'string' ? JSON.parse(prefs.settings) : prefs.settings;
    }
    
    // Return smart defaults if no preferences found
    const currency = this.tables.currencies.find(c => c.id === currencyId);
    if (!currency) {
      return this.getDefaultCurrencyFormatSettings();
    }
    
    if (currency.code === 'EUR') {
      return {
        currencySymbolPosition: 'after',
        decimalSeparator: 'comma',
        thousandsSeparator: 'space',
        decimalPrecision: 'auto',
        negativeDisplay: 'minus',
        largeNumberNotation: 'full',
        currencyCodeDisplay: 'symbol-only'
      };
    } else if (currency.code === 'USD' || currency.code === 'GBP') {
      return {
        currencySymbolPosition: 'before',
        decimalSeparator: 'dot',
        thousandsSeparator: 'comma',
        decimalPrecision: 'auto',
        negativeDisplay: 'minus',
        largeNumberNotation: 'full',
        currencyCodeDisplay: 'symbol-only'
      };
    } else if (currency.type === 'crypto') {
      return {
        currencySymbolPosition: 'after',
        decimalSeparator: 'dot',
        thousandsSeparator: 'comma',
        decimalPrecision: 'auto',
        negativeDisplay: 'minus',
        largeNumberNotation: 'full',
        currencyCodeDisplay: 'symbol-only'
      };
    }
    
    return this.getDefaultCurrencyFormatSettings();
  }

  getDefaultCurrencyFormatSettings() {
    return {
      currencySymbolPosition: 'before',
      decimalSeparator: 'dot',
      thousandsSeparator: 'comma',
      decimalPrecision: 'auto',
      negativeDisplay: 'minus',
      largeNumberNotation: 'full',
      currencyCodeDisplay: 'symbol-only'
    };
  }

  getAllCurrencyFormatPreferences(userId = 'default') {
    const prefs = this.tables.user_preferences.filter(p => 
      p.userId === userId && p.category === 'currency_formatting'
    );
    
    const result = {};
    prefs.forEach(pref => {
      result[pref.currencyId] = typeof pref.settings === 'string' ? 
        JSON.parse(pref.settings) : pref.settings;
    });
    
    return result;
  }

  updateCurrencyFormatPreferences(currencyId, settings, userId = 'default') {
    let preferences = this.tables.user_preferences.find(p => 
      p.userId === userId && 
      p.category === 'currency_formatting' && 
      p.currencyId === currencyId
    );
    
    if (preferences) {
      const existingSettings = typeof preferences.settings === 'string' 
        ? JSON.parse(preferences.settings) 
        : preferences.settings;
      preferences.settings = JSON.stringify({ ...existingSettings, ...settings });
      preferences.updatedAt = new Date().toISOString();
    } else {
      preferences = {
        id: `PREF_CURRENCY_${Date.now()}`,
        userId: userId,
        category: 'currency_formatting',
        currencyId: currencyId,
        settings: JSON.stringify(settings),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      this.tables.user_preferences.push(preferences);
    }

    this.saveTableToWorkbook('user_preferences');
    return preferences;
  }

  getDateFormatPreferences(userId = 'default') {
    const prefs = this.tables.user_preferences.find(p => p.userId === userId && p.category === 'date_formatting');
    if (prefs) {
      return typeof prefs.settings === 'string' ? JSON.parse(prefs.settings) : prefs.settings;
    }
    return {
      dateFormat: 'DD/MM/YYYY',
      timeFormat: '24h',
      timezone: 'local',
      showSeconds: false,
      showTimeZone: false,
      relativeTime: false,
      firstDayOfWeek: 'monday'
    };
  }

  deleteExchangeRate(id) {
    const index = this.tables.exchange_rates.findIndex(rate => rate.id === id);
    if (index !== -1) {
      const deletedRate = this.tables.exchange_rates.splice(index, 1)[0];
      this.saveTableToWorkbook('exchange_rates');
      return deletedRate;
    }
    return null;
  }

  updateRecord(tableName, id, updateData) {
    const table = this.tables[tableName];
    if (!table) {
      throw new Error(`Table ${tableName} not found`);
    }
    
    const record = table.find(item => item.id === id);
    if (!record) {
      throw new Error(`Record with id ${id} not found in ${tableName}`);
    }
    
    Object.assign(record, updateData);
    this.saveTableToWorkbook(tableName);
    return record;
  }

  addRecord(tableName, recordData) {
    const table = this.tables[tableName];
    if (!table) {
      throw new Error(`Table ${tableName} not found`);
    }
    
    const newRecord = {
      ...recordData,
      createdAt: recordData.createdAt || new Date().toISOString()
    };
    
    table.push(newRecord);
    this.saveTableToWorkbook(tableName);
    return newRecord;
  }

  // Migration method to add missing fields to existing transaction types
  migrateTransactionTypes() {
    if (this.tables.transaction_types && Array.isArray(this.tables.transaction_types)) {
      let migrationNeeded = false;
      
      this.tables.transaction_types = this.tables.transaction_types.map((transactionType, index) => {
        let updated = { ...transactionType };
        
        // Add missing defaultAccountId field
        if (updated.defaultAccountId === undefined) {
          updated.defaultAccountId = null;
          migrationNeeded = true;
        }
        
        // Add missing destinationAccountId field
        if (updated.destinationAccountId === undefined) {
          updated.destinationAccountId = null;
          migrationNeeded = true;
        }
        
        // Add missing order field
        if (updated.order === undefined) {
          updated.order = index + 1;
          migrationNeeded = true;
        }
        
        return updated;
      });
      
      // Save if migration was needed
      if (migrationNeeded) {
        console.log('Migrated transaction types to include account fields and order');
        this.saveTableToWorkbook('transaction_types');
      }
    }
  }

  // Migration method to add missing fields to existing subcategories
  migrateSubcategories() {
    if (this.tables.subcategories && Array.isArray(this.tables.subcategories)) {
      let migrationNeeded = false;
      
      this.tables.subcategories = this.tables.subcategories.map((subcategory, index) => {
        let updated = { ...subcategory };
        
        // Add missing order field
        if (updated.order === undefined) {
          updated.order = index + 1;
          migrationNeeded = true;
        }
        
        // Remove categoryId field if it exists (no longer needed)
        if (updated.categoryId !== undefined) {
          delete updated.categoryId;
          migrationNeeded = true;
        }
        
        return updated;
      });
      
      // Save if migration was needed
      if (migrationNeeded) {
        console.log('Migrated subcategories to include order field and remove categoryId');
        this.saveTableToWorkbook('subcategories');
      }
    }
  }

  // Migration method to add missing fields to existing transaction groups
  migrateTransactionGroups() {
    if (this.tables.transaction_groups && Array.isArray(this.tables.transaction_groups)) {
      let migrationNeeded = false;
      
      this.tables.transaction_groups = this.tables.transaction_groups.map((group, index) => {
        let updated = { ...group };
        
        // Add missing order field
        if (updated.order === undefined) {
          updated.order = index + 1;
          migrationNeeded = true;
        }
        
        // Add missing transactionTypeId field - default to Expenses (CAT_002)
        if (updated.transactionTypeId === undefined) {
          // Assign based on group name patterns or default to Expenses
          if (updated.name && (updated.name.toLowerCase().includes('income') || 
                               updated.name.toLowerCase().includes('investment') || 
                               updated.name.toLowerCase().includes('savings') ||
                               updated.name.toLowerCase().includes('épargne') ||
                               updated.name.toLowerCase().includes('investissement'))) {
            updated.transactionTypeId = 'CAT_001'; // Income
          } else {
            updated.transactionTypeId = 'CAT_002'; // Expenses (default)
          }
          migrationNeeded = true;
        }
        
        return updated;
      });
      
      // Save if migration was needed
      if (migrationNeeded) {
        console.log('Migrated transaction groups to include order field and transactionTypeId');
        this.saveTableToWorkbook('transaction_groups');
      }
    }
  }

  // Migration method to update default account (ACC001) name and balance
  migrateDefaultAccount() {
    if (this.tables.accounts && Array.isArray(this.tables.accounts)) {
      const defaultAccount = this.tables.accounts.find(account => account.id === 'ACC001');
      if (defaultAccount) {
        let migrationNeeded = false;
        
        // Update name if needed
        if (defaultAccount.name === 'Cash' || defaultAccount.name === 'Espèces') {
          console.log('Migrating default account (ACC001) name from "' + defaultAccount.name + '" to "Default Account"');
          defaultAccount.name = 'Default Account';
          migrationNeeded = true;
        }
        
        // Reset balance to 0
        if (defaultAccount.balance !== 0) {
          console.log('Migrating default account (ACC001) balance from ' + defaultAccount.balance + ' to 0');
          defaultAccount.balance = 0;
          migrationNeeded = true;
        }
        
        // Reset base currency value to 0
        if (defaultAccount.baseCurrencyValue !== 0) {
          console.log('Migrating default account (ACC001) base currency value from ' + defaultAccount.baseCurrencyValue + ' to 0');
          defaultAccount.baseCurrencyValue = 0;
          migrationNeeded = true;
        }
        
        if (migrationNeeded) {
          this.saveTableToWorkbook('accounts');
        }
      }
    }
  }

  // Migration method to update transaction type default accounts to ACC001
  migrateTransactionTypeAccounts() {
    if (this.tables.transaction_types && Array.isArray(this.tables.transaction_types)) {
      let migrationNeeded = false;
      
      // Update CAT_001, CAT_002, and CAT_004 to use ACC001 as defaultAccountId
      const categoriesToUpdate = ['CAT_001', 'CAT_002', 'CAT_004'];
      
      categoriesToUpdate.forEach(categoryId => {
        const category = this.tables.transaction_types.find(cat => cat.id === categoryId);
        if (category && category.defaultAccountId !== 'ACC001') {
          console.log(`Migrating transaction type ${categoryId} default account from ${category.defaultAccountId} to ACC001`);
          category.defaultAccountId = 'ACC001';
          migrationNeeded = true;
        }
      });
      
      // For CAT_003 (Transfer), we need to also update destinationAccountId if it's pointing to a removed account
      const transferCategory = this.tables.transaction_types.find(cat => cat.id === 'CAT_003');
      if (transferCategory) {
        // Only update if pointing to removed accounts (ACC002, ACC003, etc.)
        if (transferCategory.defaultAccountId && transferCategory.defaultAccountId !== 'ACC001') {
          console.log(`Migrating CAT_003 default account from ${transferCategory.defaultAccountId} to ACC001`);
          transferCategory.defaultAccountId = 'ACC001';
          migrationNeeded = true;
        }
        if (transferCategory.destinationAccountId && transferCategory.destinationAccountId !== 'ACC001') {
          console.log(`Migrating CAT_003 destination account from ${transferCategory.destinationAccountId} to ACC001`);
          transferCategory.destinationAccountId = 'ACC001';
          migrationNeeded = true;
        }
      }
      
      if (migrationNeeded) {
        this.saveTableToWorkbook('transaction_types');
        console.log('Migration completed: transaction type accounts updated to ACC001');
      }
    }
  }

  // Migration method to remove all accounts except ACC001
  migrateToSingleAccount() {
    if (this.tables.accounts && Array.isArray(this.tables.accounts)) {
      const initialCount = this.tables.accounts.length;
      
      // Check if we have more than just ACC001
      if (initialCount > 1) {
        // Check if any non-ACC001 accounts are used in transactions
        const nonDefaultAccounts = this.tables.accounts.filter(account => account.id !== 'ACC001');
        let hasTransactions = false;
        
        if (this.tables.transactions && Array.isArray(this.tables.transactions)) {
          hasTransactions = this.tables.transactions.some(transaction => 
            nonDefaultAccounts.some(acc => 
              transaction.debitAccountId === acc.id || 
              transaction.creditAccountId === acc.id ||
              transaction.accountId === acc.id ||
              transaction.destinationAccountId === acc.id
            )
          );
        }
        
        if (!hasTransactions) {
          console.log(`Migrating database to single account: removing ${initialCount - 1} accounts, keeping only ACC001`);
          
          // Keep only ACC001
          this.tables.accounts = this.tables.accounts.filter(account => account.id === 'ACC001');
          
          // Ensure ACC001 exists and has correct properties
          if (this.tables.accounts.length === 0) {
            this.tables.accounts.push({
              id: 'ACC001',
              name: 'Default Account',
              accountTypeId: 'ACCT_TYPE_001',
              balance: 0,
              currencyId: 'CUR_001',
              baseCurrencyValue: 0,
              description: 'Default account for transactions',
              includeInOverview: true,
              isActive: true,
              createdAt: new Date().toISOString(),
              lastUpdated: new Date().toISOString()
            });
          }
          
          this.saveTableToWorkbook('accounts');
          console.log('Migration completed: database now has only ACC001');
        } else {
          console.log('Migration skipped: other accounts are referenced in transactions');
        }
      }
    }
  }

  // Migration method to remove all subcategories
  migrateRemoveAllSubcategories() {
    if (this.tables.subcategories && Array.isArray(this.tables.subcategories)) {
      const initialCount = this.tables.subcategories.length;
      
      if (initialCount > 0) {
        console.log(`Migrating database: removing all ${initialCount} subcategories`);
        this.tables.subcategories = [];
        this.saveTableToWorkbook('subcategories');
        console.log('Migration completed: all subcategories removed');
      }
    }
  }

  // Migration method to initialize subcategories if they don't exist
  migrateInitializeSubcategories() {
    if (!this.tables.subcategories || !Array.isArray(this.tables.subcategories)) {
      this.tables.subcategories = [];
    }
    
    if (this.tables.subcategories.length === 0) {
      console.log('Migrating database: initializing subcategories');
      
      // Determine language based on existing data
      let language = 'en';
      if (this.tables.transaction_groups && this.tables.transaction_groups.length > 0) {
        const firstGroup = this.tables.transaction_groups[0];
        // Check if French name pattern exists
        if (firstGroup.name && (firstGroup.name.includes('Dépenses') || firstGroup.name.includes('Essentielles'))) {
          language = 'fr';
        }
      }
      
      // Initialize subcategories with appropriate language
      this.tables.subcategories = this.generateSubcategories(language);
      this.saveTableToWorkbook('subcategories');
      console.log(`Migration completed: initialized ${this.tables.subcategories.length} subcategories in ${language}`);
    }
  }

  // Migration method to reorder transaction types (put CAT_002 Expenses first)
  migrateReorderTransactionTypes() {
    if (!this.tables.transaction_types || !Array.isArray(this.tables.transaction_types)) {
      return;
    }
    
    // Check if CAT_002 is already first
    if (this.tables.transaction_types.length > 0 && this.tables.transaction_types[0].id === 'CAT_002') {
      return; // Already in correct order
    }
    
    // Find CAT_002 (Expenses)
    const expensesIndex = this.tables.transaction_types.findIndex(type => type.id === 'CAT_002');
    
    if (expensesIndex > 0) { // Found and not already first
      console.log('Migrating database: reordering transaction types to put Expenses (CAT_002) first');
      
      // Remove CAT_002 from current position
      const expensesType = this.tables.transaction_types.splice(expensesIndex, 1)[0];
      
      // Insert CAT_002 at the beginning
      this.tables.transaction_types.unshift(expensesType);
      
      this.saveTableToWorkbook('transaction_types');
      console.log('Migration completed: CAT_002 (Expenses) moved to first position');
    }
  }

  // Migration method to update transaction groups (GRP_003 and GRP_005)
  migrateRemoveSpecificTransactionGroups() {
    if (this.tables.transaction_groups && Array.isArray(this.tables.transaction_groups)) {
      let migrationNeeded = false;
      
      // Update existing GRP_003 to new Income-focused version if it exists
      const grp003 = this.tables.transaction_groups.find(group => group.id === 'GRP_003');
      if (grp003) {
        // Check if it's the old expenses-focused version
        if (grp003.transactionTypeId === 'CAT_002' || grp003.description.includes('expenses')) {
          console.log('Migrating GRP_003 from expenses to income focus');
          grp003.name = 'Professional & Business';
          grp003.description = 'Work and business related income';
          grp003.transactionTypeId = 'CAT_001'; // Income
          migrationNeeded = true;
        }
      } else {
        // Add the new GRP_003 if it doesn't exist
        console.log('Adding new GRP_003 Professional & Business income group');
        this.tables.transaction_groups.push({
          id: 'GRP_003',
          name: 'Professional & Business',
          description: 'Work and business related income',
          color: '#eab308',
          isActive: true,
          transactionTypeId: 'CAT_001', // Income
          createdAt: new Date().toISOString()
        });
        migrationNeeded = true;
      }
      
      // Update existing GRP_005 to new Transfer-focused version if it exists and is old version
      const grp005 = this.tables.transaction_groups.find(group => group.id === 'GRP_005');
      if (grp005) {
        // Check if it's the old health/wellness version
        if (grp005.name === 'Health & Wellness' || grp005.transactionTypeId === 'CAT_002') {
          console.log('Migrating GRP_005 from Health & Wellness to Bank Transfer');
          grp005.name = 'Bank Transfer';
          grp005.description = 'Internal bank transfers';
          grp005.color = '#2196F3';
          grp005.transactionTypeId = 'CAT_003'; // Transfer
          migrationNeeded = true;
        }
      } else {
        // Add the new GRP_005 if it doesn't exist
        console.log('Adding new GRP_005 Bank Transfer group');
        this.tables.transaction_groups.push({
          id: 'GRP_005',
          name: 'Bank Transfer',
          description: 'Internal bank transfers',
          color: '#2196F3',
          isActive: true,
          transactionTypeId: 'CAT_003', // Transfer
          createdAt: new Date().toISOString()
        });
        migrationNeeded = true;
      }
      
      // Add GRP_006 if it doesn't exist
      const grp006 = this.tables.transaction_groups.find(group => group.id === 'GRP_006');
      if (!grp006) {
        console.log('Adding new GRP_006 Digital Assets group');
        this.tables.transaction_groups.push({
          id: 'GRP_006',
          name: 'Digital Assets',
          description: 'Crypto related investments',
          color: '#9C27B0',
          isActive: true,
          transactionTypeId: 'CAT_004', // Investment
          createdAt: new Date().toISOString()
        });
        migrationNeeded = true;
      }
      
      if (migrationNeeded) {
        this.saveTableToWorkbook('transaction_groups');
        console.log('Migration completed: transaction groups updated');
      }
    }
  }

  // Payees CRUD methods
  addPayee(payeeData) {
    // Initialize payees table if it doesn't exist
    if (!this.tables.payees) {
      this.tables.payees = [];
    }
    
    const id = this.generateId('PAY');
    const newPayee = {
      id,
      name: payeeData.name,
      isActive: payeeData.isActive !== undefined ? payeeData.isActive : true,
      createdAt: new Date().toISOString()
    };

    this.tables.payees.push(newPayee);
    this.saveTableToWorkbook('payees');
    return newPayee;
  }

  updatePayee(id, payeeData) {
    // Initialize payees table if it doesn't exist
    if (!this.tables.payees) {
      this.tables.payees = [];
    }
    
    const payeeIndex = this.tables.payees.findIndex(payee => payee.id === id);
    if (payeeIndex === -1) {
      throw new Error(`Payee with id ${id} not found`);
    }

    const updatedPayee = {
      ...this.tables.payees[payeeIndex],
      ...payeeData,
      id: id // Ensure ID doesn't change
    };

    this.tables.payees[payeeIndex] = updatedPayee;
    this.saveTableToWorkbook('payees');
    return updatedPayee;
  }

  deletePayee(id) {
    // Initialize payees table if it doesn't exist
    if (!this.tables.payees) {
      this.tables.payees = [];
    }
    
    const payeeIndex = this.tables.payees.findIndex(payee => payee.id === id);
    if (payeeIndex === -1) {
      throw new Error(`Payee with id ${id} not found`);
    }

    const deletedPayee = this.tables.payees.splice(payeeIndex, 1)[0];
    this.saveTableToWorkbook('payees');
    return deletedPayee;
  }

  getPayees() {
    // Initialize payees table if it doesn't exist
    if (!this.tables.payees) {
      this.tables.payees = [];
    }
    return this.tables.payees;
  }

  getActivePayees() {
    return this.getPayees().filter(payee => payee.isActive);
  }

  // Payers CRUD methods
  addPayer(payerData) {
    // Initialize payers table if it doesn't exist
    if (!this.tables.payers) {
      this.tables.payers = [];
    }
    
    const id = this.generateId('PAYER');
    const newPayer = {
      id,
      name: payerData.name,
      isActive: payerData.isActive !== undefined ? payerData.isActive : true,
      createdAt: new Date().toISOString()
    };

    this.tables.payers.push(newPayer);
    this.saveTableToWorkbook('payers');
    return newPayer;
  }

  updatePayer(id, payerData) {
    // Initialize payers table if it doesn't exist
    if (!this.tables.payers) {
      this.tables.payers = [];
    }
    
    const payerIndex = this.tables.payers.findIndex(payer => payer.id === id);
    if (payerIndex === -1) {
      throw new Error(`Payer with id ${id} not found`);
    }

    const updatedPayer = {
      ...this.tables.payers[payerIndex],
      ...payerData,
      id: id // Ensure ID doesn't change
    };

    this.tables.payers[payerIndex] = updatedPayer;
    this.saveTableToWorkbook('payers');
    return updatedPayer;
  }

  deletePayer(id) {
    // Initialize payers table if it doesn't exist
    if (!this.tables.payers) {
      this.tables.payers = [];
    }
    
    const payerIndex = this.tables.payers.findIndex(payer => payer.id === id);
    if (payerIndex === -1) {
      throw new Error(`Payer with id ${id} not found`);
    }

    const deletedPayer = this.tables.payers.splice(payerIndex, 1)[0];
    this.saveTableToWorkbook('payers');
    return deletedPayer;
  }

  getPayers() {
    // Initialize payers table if it doesn't exist
    if (!this.tables.payers) {
      this.tables.payers = [];
    }
    return this.tables.payers;
  }

  getActivePayers() {
    return this.getPayers().filter(payer => payer.isActive);
  }
}

export default RelationalDatabase;