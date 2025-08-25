import * as XLSX from 'xlsx';

class RelationalDatabase {
  constructor() {
    this.tables = {
      accounts: [],
      transactions: [],
      customers: [],
      vendors: [],
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
      database_info: []
    };
    this.workbooks = {};
    this.relationships = {
      transactions: {
        debitAccountId: { table: 'accounts', field: 'id' },
        creditAccountId: { table: 'accounts', field: 'id' },
        customerId: { table: 'customers', field: 'id', optional: true },
        vendorId: { table: 'vendors', field: 'id', optional: true },
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
        categoryId: { table: 'transaction_types', field: 'id' },
        groupId: { table: 'transaction_groups', field: 'id', optional: true }
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
      
      this.validateRelationships();
      return true;
    } catch (error) {
      console.error('Error loading files into relational database:', error);
      return false;
    }
  }

  createNewDatabase(language = 'en') {
    // Generate language-specific sample data
    const sampleData = this.generateSampleData(language);
    
    this.tables = {
      accounts: sampleData.accounts,
      transactions: [],
      customers: sampleData.customers,
      vendors: sampleData.vendors,
      tags: sampleData.tags,
      todos: sampleData.todos,
      transaction_types: this.generateCategories(language),
      transaction_groups: this.generateTransactionGroups(language),
      subcategories: this.generateSubcategories(language),
      currencies: this.generateCurrencies(),
      exchange_rates: this.generateExchangeRates(),
      currency_settings: this.generateCurrencySettings(),
      user_preferences: this.generateUserPreferences(),
      api_usage: this.generateApiUsage(),
      api_settings: this.generateApiSettings(),
      
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
    const validAccountTypeIds = ['ACCT_TYPE_001', 'ACCT_TYPE_002', 'ACCT_TYPE_003', 'ACCT_TYPE_004', 'ACCT_TYPE_005'];
    
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
      customerId: transactionData.customerId || null,
      vendorId: transactionData.vendorId || null,
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

  addCustomer(customerData) {
    const newCustomer = {
      id: 'CUST' + Date.now(),
      name: customerData.name,
      email: customerData.email || '',
      phone: customerData.phone || '',
      address: customerData.address || '',
      isActive: customerData.isActive !== undefined ? customerData.isActive : true,
      createdAt: new Date().toISOString()
    };

    this.tables.customers.push(newCustomer);
    this.saveTableToWorkbook('customers');

    return newCustomer;
  }

  addVendor(vendorData) {
    const newVendor = {
      id: 'VEND' + Date.now(),
      name: vendorData.name,
      email: vendorData.email || '',
      phone: vendorData.phone || '',
      address: vendorData.address || '',
      category: vendorData.category || '',
      isActive: vendorData.isActive !== undefined ? vendorData.isActive : true,
      createdAt: new Date().toISOString()
    };

    this.tables.vendors.push(newVendor);
    this.saveTableToWorkbook('vendors');

    return newVendor;
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

  updateCustomer(id, customerData) {
    const customerIndex = this.tables.customers.findIndex(customer => customer.id === id);
    if (customerIndex === -1) {
      throw new Error(`Customer with id ${id} not found`);
    }

    const updatedCustomer = {
      ...this.tables.customers[customerIndex],
      ...customerData,
      id: id // Ensure ID doesn't change
    };

    this.tables.customers[customerIndex] = updatedCustomer;
    this.saveTableToWorkbook('customers');

    return updatedCustomer;
  }

  updateVendor(id, vendorData) {
    const vendorIndex = this.tables.vendors.findIndex(vendor => vendor.id === id);
    if (vendorIndex === -1) {
      throw new Error(`Vendor with id ${id} not found`);
    }

    const updatedVendor = {
      ...this.tables.vendors[vendorIndex],
      ...vendorData,
      id: id // Ensure ID doesn't change
    };

    this.tables.vendors[vendorIndex] = updatedVendor;
    this.saveTableToWorkbook('vendors');

    return updatedVendor;
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
      return null;
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

  // Ensure all tables are saved to workbooks (including empty ones)
  saveAllTablesToWorkbooks() {
    for (const tableName of Object.keys(this.tables)) {
      this.saveTableToWorkbook(tableName);
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
      customer: transaction.customerId ? this.getRecord('customers', transaction.customerId) : null,
      vendor: transaction.vendorId ? this.getRecord('vendors', transaction.vendorId) : null,
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

  deleteCustomer(id) {
    const customerIndex = this.tables.customers.findIndex(customer => customer.id === id);
    if (customerIndex === -1) {
      throw new Error(`Customer with id ${id} not found`);
    }

    // Check if customer is used in transactions
    const usedInTransactions = this.tables.transactions.some(
      transaction => transaction.customerId === id
    );

    if (usedInTransactions) {
      throw new Error('Cannot delete customer: it is used in transactions');
    }

    const deletedCustomer = this.tables.customers[customerIndex];
    this.tables.customers.splice(customerIndex, 1);
    this.saveTableToWorkbook('customers');

    return deletedCustomer;
  }

  deleteVendor(id) {
    const vendorIndex = this.tables.vendors.findIndex(vendor => vendor.id === id);
    if (vendorIndex === -1) {
      throw new Error(`Vendor with id ${id} not found`);
    }

    // Check if vendor is used in transactions
    const usedInTransactions = this.tables.transactions.some(
      transaction => transaction.vendorId === id
    );

    if (usedInTransactions) {
      throw new Error('Cannot delete vendor: it is used in transactions');
    }

    const deletedVendor = this.tables.vendors[vendorIndex];
    this.tables.vendors.splice(vendorIndex, 1);
    this.saveTableToWorkbook('vendors');

    return deletedVendor;
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

  generateSampleData(language) {
    if (language === 'fr') {
      return this.generateFrenchSampleData();
    } else {
      return this.generateEnglishSampleData();
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
        type: 'Liability',
        subtype: 'Current Liability',
        description: 'Debts and obligations due within one year',
        examples: 'Credit Cards, Short-term Loans, Bills Payable',
        normalBalance: 'Credit',
        isActive: true,
        createdAt: new Date().toISOString()
      },
      {
        id: 'ACCT_TYPE_006',
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
        type: 'Passif',
        subtype: 'Passif courant',
        description: 'Dettes et obligations exigibles dans un délai d\'un an',
        examples: 'Cartes de Crédit, Prêts Court Terme, Factures à Payer',
        normalBalance: 'Crédit',
        isActive: true,
        createdAt: new Date().toISOString()
      },
      {
        id: 'ACCT_TYPE_006',
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

  generateEnglishSampleData() {
    return {
      accounts: [
        { 
          id: 'ACC001', 
          name: 'Cash', 
          accountTypeId: 'ACCT_TYPE_001',
          balance: 900,
          currencyId: 'CUR_001', // EUR (base currency)
          baseCurrencyValue: 900,
          description: 'Cash on hand',
          includeInOverview: true,
          isActive: true,
          createdAt: new Date().toISOString(),
          lastUpdated: new Date().toISOString()
        },
        { 
          id: 'ACC002', 
          name: 'Bank Account - Checking', 
          accountTypeId: 'ACCT_TYPE_001',
          balance: 4500,
          currencyId: 'CUR_001', // EUR (base currency)
          baseCurrencyValue: 4500,
          description: 'Main checking account',
          includeInOverview: true,
          isActive: true,
          createdAt: new Date().toISOString(),
          lastUpdated: new Date().toISOString()
        },
        { 
          id: 'ACC003', 
          name: 'Savings Account', 
          accountTypeId: 'ACCT_TYPE_001',
          balance: 9000,
          currencyId: 'CUR_001', // EUR (base currency)
          baseCurrencyValue: 9000,
          description: 'Emergency savings',
          includeInOverview: true,
          isActive: true,
          createdAt: new Date().toISOString(),
          lastUpdated: new Date().toISOString()
        },
        { 
          id: 'ACC004', 
          name: 'Investment Portfolio', 
          accountTypeId: 'ACCT_TYPE_002',
          balance: 22500,
          currencyId: 'CUR_001', // EUR (base currency)
          baseCurrencyValue: 22500,
          description: 'Retirement and investment accounts',
          includeInOverview: true,
          isActive: true,
          createdAt: new Date().toISOString(),
          lastUpdated: new Date().toISOString()
        },
        { 
          id: 'ACC005', 
          name: 'House', 
          accountTypeId: 'ACCT_TYPE_003',
          balance: 227000,
          currencyId: 'CUR_001', // EUR (base currency)
          baseCurrencyValue: 227000,
          description: 'Primary residence',
          includeInOverview: true,
          isActive: true,
          createdAt: new Date().toISOString(),
          lastUpdated: new Date().toISOString()
        },
        { 
          id: 'ACC006', 
          name: 'Credit Card', 
          accountTypeId: 'ACCT_TYPE_004',
          balance: 2250,
          currencyId: 'CUR_001', // EUR (base currency)
          baseCurrencyValue: 2250,
          description: 'Main credit card debt',
          includeInOverview: true,
          isActive: true,
          createdAt: new Date().toISOString(),
          lastUpdated: new Date().toISOString()
        },
        { 
          id: 'ACC007', 
          name: 'Mortgage', 
          accountTypeId: 'ACCT_TYPE_005',
          balance: 163500,
          currencyId: 'CUR_001', // EUR (base currency)
          baseCurrencyValue: 163500,
          description: 'Home mortgage loan',
          includeInOverview: true,
          isActive: true,
          createdAt: new Date().toISOString(),
          lastUpdated: new Date().toISOString()
        }
      ],
      customers: [
        {
          id: 'CUST001',
          name: 'John Smith',
          email: 'john.smith@email.com',
          phone: '+1-555-0123',
          address: '123 Main Street, Anytown, USA',
          category: 'Individual',
          isActive: true,
          createdAt: new Date().toISOString()
        },
        {
          id: 'CUST002',
          name: 'Sarah Johnson',
          email: 'sarah.johnson@email.com',
          phone: '+1-555-0456',
          address: '456 Oak Avenue, Springfield, USA',
          category: 'Individual',
          isActive: true,
          createdAt: new Date().toISOString()
        }
      ],
      vendors: [
        {
          id: 'VEND001',
          name: 'Local Grocery Store',
          email: 'info@localgrocery.com',
          phone: '+1-555-0789',
          address: '789 Commercial Blvd, City, USA',
          category: 'Retail',
          isActive: true,
          createdAt: new Date().toISOString()
        },
        {
          id: 'VEND002',
          name: 'City Utilities',
          email: 'billing@cityutilities.gov',
          phone: '+1-555-0321',
          address: '321 Municipal Plaza, City, USA',
          category: 'Utilities',
          isActive: true,
          createdAt: new Date().toISOString()
        }
      ],
      tags: [
        {
          id: 'TAG001',
          name: 'Groceries',
          description: 'Food and household items',
          category: 'Essential',
          isActive: true,
          createdAt: new Date().toISOString()
        },
        {
          id: 'TAG002',
          name: 'Entertainment',
          description: 'Movies, games, leisure activities',
          category: 'Lifestyle',
          isActive: true,
          createdAt: new Date().toISOString()
        },
        {
          id: 'TAG003',
          name: 'Transportation',
          description: 'Gas, public transit, car maintenance',
          category: 'Essential',
          isActive: true,
          createdAt: new Date().toISOString()
        }
      ],
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

  generateFrenchSampleData() {
    return {
      accounts: [
        { 
          id: 'ACC001', 
          name: 'Espèces', 
          accountTypeId: 'ACCT_TYPE_001',
          balance: 900,
          currencyId: 'CUR_001', // EUR (base currency)
          baseCurrencyValue: 900,
          description: 'Argent liquide disponible',
          includeInOverview: true,
          isActive: true,
          createdAt: new Date().toISOString(),
          lastUpdated: new Date().toISOString()
        },
        { 
          id: 'ACC002', 
          name: 'Compte Courant', 
          accountTypeId: 'ACCT_TYPE_001',
          balance: 4500,
          currencyId: 'CUR_001', // EUR (base currency)
          baseCurrencyValue: 4500,
          description: 'Compte bancaire principal',
          includeInOverview: true,
          isActive: true,
          createdAt: new Date().toISOString(),
          lastUpdated: new Date().toISOString()
        },
        { 
          id: 'ACC003', 
          name: 'Compte Épargne', 
          accountTypeId: 'ACCT_TYPE_001',
          balance: 9000,
          currencyId: 'CUR_001', // EUR (base currency)
          baseCurrencyValue: 9000,
          description: 'Épargne de précaution',
          includeInOverview: true,
          isActive: true,
          createdAt: new Date().toISOString(),
          lastUpdated: new Date().toISOString()
        },
        { 
          id: 'ACC004', 
          name: 'Portefeuille de Placement', 
          accountTypeId: 'ACCT_TYPE_002',
          balance: 22500,
          currencyId: 'CUR_001', // EUR (base currency)
          baseCurrencyValue: 22500,
          description: 'Comptes retraite et investissements',
          includeInOverview: true,
          isActive: true,
          createdAt: new Date().toISOString(),
          lastUpdated: new Date().toISOString()
        },
        { 
          id: 'ACC005', 
          name: 'Maison', 
          accountTypeId: 'ACCT_TYPE_003',
          balance: 227000,
          currencyId: 'CUR_001', // EUR (base currency)
          baseCurrencyValue: 227000,
          description: 'Résidence principale',
          includeInOverview: true,
          isActive: true,
          createdAt: new Date().toISOString(),
          lastUpdated: new Date().toISOString()
        },
        { 
          id: 'ACC006', 
          name: 'Carte de Crédit', 
          accountTypeId: 'ACCT_TYPE_004',
          balance: 2250,
          currencyId: 'CUR_001', // EUR (base currency)
          baseCurrencyValue: 2250,
          description: 'Dette carte de crédit principale',
          includeInOverview: true,
          isActive: true,
          createdAt: new Date().toISOString(),
          lastUpdated: new Date().toISOString()
        },
        { 
          id: 'ACC007', 
          name: 'Hypothèque', 
          accountTypeId: 'ACCT_TYPE_005',
          balance: 163500,
          currencyId: 'CUR_001', // EUR (base currency)
          baseCurrencyValue: 163500,
          description: 'Prêt hypothécaire résidentiel',
          includeInOverview: true,
          isActive: true,
          createdAt: new Date().toISOString(),
          lastUpdated: new Date().toISOString()
        }
      ],
      customers: [
        {
          id: 'CUST001',
          name: 'Jean Dupont',
          email: 'jean.dupont@email.fr',
          phone: '+33-1-23-45-67-89',
          address: '123 Rue de la Paix, Paris, France',
          category: 'Particulier',
          isActive: true,
          createdAt: new Date().toISOString()
        },
        {
          id: 'CUST002',
          name: 'Marie Martin',
          email: 'marie.martin@email.fr',
          phone: '+33-1-98-76-54-32',
          address: '456 Avenue des Champs, Lyon, France',
          category: 'Particulier',
          isActive: true,
          createdAt: new Date().toISOString()
        }
      ],
      vendors: [
        {
          id: 'VEND001',
          name: 'Supermarché Local',
          email: 'info@supermarchelocal.fr',
          phone: '+33-1-11-22-33-44',
          address: '789 Boulevard Commercial, Ville, France',
          category: 'Commerce',
          isActive: true,
          createdAt: new Date().toISOString()
        },
        {
          id: 'VEND002',
          name: 'Services Municipaux',
          email: 'facturation@ville.fr',
          phone: '+33-1-55-66-77-88',
          address: '321 Place de la Mairie, Ville, France',
          category: 'Services Publics',
          isActive: true,
          createdAt: new Date().toISOString()
        }
      ],
      tags: [
        {
          id: 'TAG001',
          name: 'Alimentation',
          description: 'Nourriture et produits ménagers',
          category: 'Essentiel',
          isActive: true,
          createdAt: new Date().toISOString()
        },
        {
          id: 'TAG002',
          name: 'Divertissement',
          description: 'Cinéma, jeux, activités de loisirs',
          category: 'Lifestyle',
          isActive: true,
          createdAt: new Date().toISOString()
        },
        {
          id: 'TAG003',
          name: 'Transport',
          description: 'Essence, transports publics, entretien véhicule',
          category: 'Essentiel',
          isActive: true,
          createdAt: new Date().toISOString()
        }
      ],
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
    return this.tables.transaction_groups;
  }

  getActiveTransactionGroups() {
    return this.tables.transaction_groups.filter(group => group.isActive);
  }

  addTransactionGroup(groupData) {
    const newGroup = {
      id: `GRP_${String(this.tables.transaction_groups.length + 1).padStart(3, '0')}`,
      name: groupData.name,
      description: groupData.description || '',
      color: groupData.color || '#6366f1',
      isActive: groupData.isActive !== undefined ? groupData.isActive : true,
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
    return this.tables.subcategories;
  }

  getActiveSubcategories() {
    return this.tables.subcategories.filter(subcategory => subcategory.isActive);
  }

  getSubcategoriesByCategory(categoryId) {
    return this.tables.subcategories.filter(subcategory => 
      subcategory.categoryId === categoryId && subcategory.isActive
    );
  }

  getSubcategoriesWithCategories() {
    return this.tables.subcategories.map(subcategory => ({
      ...subcategory,
      category: this.getRecord('transaction_types', subcategory.categoryId),
      group: subcategory.groupId ? this.getRecord('transaction_groups', subcategory.groupId) : null
    }));
  }

  addSubcategory(subcategoryData) {
    if (!this.validateForeignKeys('subcategories', subcategoryData)) {
      throw new Error('Invalid foreign key references in subcategory');
    }

    const newSubcategory = {
      id: 'SUBCAT_' + Date.now(),
      categoryId: subcategoryData.categoryId,
      name: subcategoryData.name,
      description: subcategoryData.description || '',
      isActive: subcategoryData.isActive !== undefined ? subcategoryData.isActive : true,
      createdAt: new Date().toISOString()
    };

    this.tables.subcategories.push(newSubcategory);
    this.saveTableToWorkbook('subcategories');
    return newSubcategory;
  }

  updateSubcategory(id, subcategoryData) {
    if (subcategoryData.categoryId && !this.validateForeignKeys('subcategories', subcategoryData)) {
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
        id: 'CAT_001',
        name: 'Income',
        description: 'Money coming in',
        color: '#4CAF50',
        icon: '💰',
        defaultAccountId: 'ACC002', // Bank Account - Checking - where income typically goes
        destinationAccountId: null, // Not relevant for income
        isActive: true,
        createdAt: new Date().toISOString()
      },
      {
        id: 'CAT_002',
        name: 'Expenses',
        description: 'Money going out',
        color: '#F44336',
        icon: '💸',
        defaultAccountId: 'ACC002', // Bank Account - Checking - where expenses typically come from
        destinationAccountId: null, // Not relevant for expenses
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
        defaultAccountId: 'ACC002', // Bank Account - Checking - where investment money comes from
        destinationAccountId: null, // Not relevant for investment
        isActive: true,
        createdAt: new Date().toISOString()
      }
    ];
  }

  generateFrenchCategories() {
    return [
      {
        id: 'CAT_001',
        name: 'Revenus',
        description: 'Argent qui rentre',
        color: '#4CAF50',
        icon: '💰',
        defaultAccountId: 'ACC002', // Bank Account - Checking - où vont typiquement les revenus
        destinationAccountId: null, // Non pertinent pour les revenus
        isActive: true,
        createdAt: new Date().toISOString()
      },
      {
        id: 'CAT_002',
        name: 'Dépenses',
        description: 'Argent qui sort',
        color: '#F44336',
        icon: '💸',
        defaultAccountId: 'ACC002', // Bank Account - Checking - d'où viennent typiquement les dépenses
        destinationAccountId: null, // Non pertinent pour les dépenses
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
        defaultAccountId: 'ACC002', // Bank Account - Checking - d'où vient l'argent pour les investissements
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
        createdAt: new Date().toISOString()
      },
      {
        id: 'GRP_002',
        name: 'Lifestyle & Recreation',
        description: 'Entertainment and personal enjoyment',
        color: '#f97316',
        isActive: true,
        createdAt: new Date().toISOString()
      },
      {
        id: 'GRP_003',
        name: 'Professional & Business',
        description: 'Work and business related expenses',
        color: '#eab308',
        isActive: true,
        createdAt: new Date().toISOString()
      },
      {
        id: 'GRP_004',
        name: 'Investment & Savings',
        description: 'Financial growth and savings',
        color: '#22c55e',
        isActive: true,
        createdAt: new Date().toISOString()
      },
      {
        id: 'GRP_005',
        name: 'Health & Wellness',
        description: 'Medical and wellness expenses',
        color: '#06b6d4',
        isActive: true,
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
        createdAt: new Date().toISOString()
      },
      {
        id: 'GRP_002',
        name: 'Style de Vie et Loisirs',
        description: 'Divertissement et plaisir personnel',
        color: '#f97316',
        isActive: true,
        createdAt: new Date().toISOString()
      },
      {
        id: 'GRP_003',
        name: 'Professionnel et Affaires',
        description: 'Dépenses liées au travail et aux affaires',
        color: '#eab308',
        isActive: true,
        createdAt: new Date().toISOString()
      },
      {
        id: 'GRP_004',
        name: 'Investissement et Épargne',
        description: 'Croissance financière et épargne',
        color: '#22c55e',
        isActive: true,
        createdAt: new Date().toISOString()
      },
      {
        id: 'GRP_005',
        name: 'Santé et Bien-être',
        description: 'Dépenses médicales et de bien-être',
        color: '#06b6d4',
        isActive: true,
        createdAt: new Date().toISOString()
      }
    ];
  }

  generateEnglishSubcategories() {
    return [
      // Income Subcategories
      {
        id: 'SUBCAT_001',
        categoryId: 'CAT_001',
        groupId: 'GRP_001', // Work Income
        name: 'Salary/Wages',
        description: 'Regular employment income',
        isActive: true,
        createdAt: new Date().toISOString()
      },
      {
        id: 'SUBCAT_002',
        categoryId: 'CAT_001',
        groupId: 'GRP_001', // Work Income
        name: 'Freelance/Consulting',
        description: 'Independent work income',
        isActive: true,
        createdAt: new Date().toISOString()
      },
      {
        id: 'SUBCAT_003',
        categoryId: 'CAT_001',
        groupId: 'GRP_002', // Investment Income
        name: 'Investment Returns',
        description: 'Dividends, interest, capital gains',
        isActive: true,
        createdAt: new Date().toISOString()
      },
      {
        id: 'SUBCAT_004',
        categoryId: 'CAT_001',
        groupId: 'GRP_001', // Work Income
        name: 'Side Business',
        description: 'Income from side business or gig work',
        isActive: true,
        createdAt: new Date().toISOString()
      },
      {
        id: 'SUBCAT_005',
        categoryId: 'CAT_001',
        groupId: 'GRP_003', // Other Income
        name: 'Gifts/Bonuses',
        description: 'Gifts, bonuses, and unexpected income',
        isActive: true,
        createdAt: new Date().toISOString()
      },
      
      // Expense Subcategories
      {
        id: 'SUBCAT_006',
        categoryId: 'CAT_002',
        groupId: 'GRP_004', // Essential Expenses
        name: 'Housing',
        description: 'Rent, mortgage, utilities, maintenance',
        isActive: true,
        createdAt: new Date().toISOString()
      },
      {
        id: 'SUBCAT_007',
        categoryId: 'CAT_002',
        groupId: 'GRP_004', // Essential Expenses
        name: 'Transportation',
        description: 'Gas, car payments, public transit',
        isActive: true,
        createdAt: new Date().toISOString()
      },
      {
        id: 'SUBCAT_008',
        categoryId: 'CAT_002',
        groupId: 'GRP_004', // Essential Expenses
        name: 'Food & Dining',
        description: 'Groceries, restaurants, takeout',
        isActive: true,
        createdAt: new Date().toISOString()
      },
      {
        id: 'SUBCAT_009',
        categoryId: 'CAT_002',
        groupId: 'GRP_004', // Essential Expenses
        name: 'Healthcare',
        description: 'Medical expenses, insurance, medications',
        isActive: true,
        createdAt: new Date().toISOString()
      },
      {
        id: 'SUBCAT_010',
        categoryId: 'CAT_002',
        groupId: 'GRP_005', // Lifestyle Expenses
        name: 'Entertainment',
        description: 'Movies, subscriptions, hobbies, travel',
        isActive: true,
        createdAt: new Date().toISOString()
      },
      {
        id: 'SUBCAT_011',
        categoryId: 'CAT_002',
        groupId: 'GRP_005', // Lifestyle Expenses
        name: 'Shopping',
        description: 'Clothing, electronics, home goods',
        isActive: true,
        createdAt: new Date().toISOString()
      },
      {
        id: 'SUBCAT_012',
        categoryId: 'CAT_002',
        groupId: 'GRP_004', // Essential Expenses
        name: 'Bills & Utilities',
        description: 'Phone, internet, insurance, subscriptions',
        isActive: true,
        createdAt: new Date().toISOString()
      },
      
      // Transfer Subcategories
      {
        id: 'SUBCAT_013',
        categoryId: 'CAT_003',
        groupId: null, // No group for transfers
        name: 'Account Transfer',
        description: 'Transfer between bank accounts',
        isActive: true,
        createdAt: new Date().toISOString()
      },
      {
        id: 'SUBCAT_014',
        categoryId: 'CAT_003',
        groupId: null, // No group for transfers
        name: 'Cash Withdrawal',
        description: 'ATM withdrawals and cash transactions',
        isActive: true,
        createdAt: new Date().toISOString()
      },
      {
        id: 'SUBCAT_015',
        categoryId: 'CAT_003',
        groupId: null, // No group for transfers
        name: 'Cash Deposit',
        description: 'Depositing cash into accounts',
        isActive: true,
        createdAt: new Date().toISOString()
      },
      
      // Investment Subcategories
      {
        id: 'SUBCAT_016',
        categoryId: 'CAT_004',
        groupId: 'GRP_002', // Investment Income
        name: 'Stock Purchase',
        description: 'Buying individual stocks',
        isActive: true,
        createdAt: new Date().toISOString()
      },
      {
        id: 'SUBCAT_017',
        categoryId: 'CAT_004',
        groupId: 'GRP_002', // Investment Income
        name: 'Fund Investment',
        description: 'Mutual funds, ETFs, index funds',
        isActive: true,
        createdAt: new Date().toISOString()
      },
      {
        id: 'SUBCAT_018',
        categoryId: 'CAT_004',
        groupId: 'GRP_002', // Investment Income
        name: 'Bond Purchase',
        description: 'Government and corporate bonds',
        isActive: true,
        createdAt: new Date().toISOString()
      },
      {
        id: 'SUBCAT_019',
        categoryId: 'CAT_004',
        groupId: 'GRP_002', // Investment Income
        name: 'Cryptocurrency',
        description: 'Digital currency investments',
        isActive: true,
        createdAt: new Date().toISOString()
      },
      {
        id: 'SUBCAT_020',
        categoryId: 'CAT_004',
        groupId: 'GRP_002', // Investment Income
        name: 'Investment Fees',
        description: 'Brokerage fees, management fees',
        isActive: true,
        createdAt: new Date().toISOString()
      }
    ];
  }

  generateFrenchSubcategories() {
    return [
      // Subcategories Revenus
      {
        id: 'SUBCAT_001',
        categoryId: 'CAT_001',
        groupId: 'GRP_001', // Work Income
        name: 'Salaire/Rémunération',
        description: 'Revenus d\'emploi régulier',
        isActive: true,
        createdAt: new Date().toISOString()
      },
      {
        id: 'SUBCAT_002',
        categoryId: 'CAT_001',
        groupId: 'GRP_001', // Work Income
        name: 'Freelance/Conseil',
        description: 'Revenus de travail indépendant',
        isActive: true,
        createdAt: new Date().toISOString()
      },
      {
        id: 'SUBCAT_003',
        categoryId: 'CAT_001',
        groupId: 'GRP_002', // Investment Income
        name: 'Revenus de Placement',
        description: 'Dividendes, intérêts, plus-values',
        isActive: true,
        createdAt: new Date().toISOString()
      },
      {
        id: 'SUBCAT_004',
        categoryId: 'CAT_001',
        groupId: 'GRP_001', // Work Income
        name: 'Activité Secondaire',
        description: 'Revenus d\'activité secondaire ou travail à la demande',
        isActive: true,
        createdAt: new Date().toISOString()
      },
      {
        id: 'SUBCAT_005',
        categoryId: 'CAT_001',
        groupId: 'GRP_003', // Other Income
        name: 'Cadeaux/Primes',
        description: 'Cadeaux, primes et revenus inattendus',
        isActive: true,
        createdAt: new Date().toISOString()
      },
      
      // Subcategories Dépenses
      {
        id: 'SUBCAT_006',
        categoryId: 'CAT_002',
        groupId: 'GRP_004', // Essential Expenses
        name: 'Logement',
        description: 'Loyer, hypothèque, services publics, entretien',
        isActive: true,
        createdAt: new Date().toISOString()
      },
      {
        id: 'SUBCAT_007',
        categoryId: 'CAT_002',
        groupId: 'GRP_004', // Essential Expenses
        name: 'Transport',
        description: 'Essence, paiements auto, transport public',
        isActive: true,
        createdAt: new Date().toISOString()
      },
      {
        id: 'SUBCAT_008',
        categoryId: 'CAT_002',
        name: 'Alimentation',
        description: 'Épicerie, restaurants, plats à emporter',
        isActive: true,
        createdAt: new Date().toISOString()
      },
      {
        id: 'SUBCAT_009',
        categoryId: 'CAT_002',
        name: 'Santé',
        description: 'Dépenses médicales, assurance, médicaments',
        isActive: true,
        createdAt: new Date().toISOString()
      },
      {
        id: 'SUBCAT_010',
        categoryId: 'CAT_002',
        name: 'Divertissement',
        description: 'Cinéma, abonnements, loisirs, voyages',
        isActive: true,
        createdAt: new Date().toISOString()
      },
      {
        id: 'SUBCAT_011',
        categoryId: 'CAT_002',
        name: 'Achats',
        description: 'Vêtements, électronique, articles ménagers',
        isActive: true,
        createdAt: new Date().toISOString()
      },
      {
        id: 'SUBCAT_012',
        categoryId: 'CAT_002',
        name: 'Factures et Services',
        description: 'Téléphone, internet, assurance, abonnements',
        isActive: true,
        createdAt: new Date().toISOString()
      },
      
      // Subcategories Virement
      {
        id: 'SUBCAT_013',
        categoryId: 'CAT_003',
        name: 'Virement de Compte',
        description: 'Virement entre comptes bancaires',
        isActive: true,
        createdAt: new Date().toISOString()
      },
      {
        id: 'SUBCAT_014',
        categoryId: 'CAT_003',
        name: 'Retrait Espèces',
        description: 'Retraits DAB et transactions en espèces',
        isActive: true,
        createdAt: new Date().toISOString()
      },
      {
        id: 'SUBCAT_015',
        categoryId: 'CAT_003',
        name: 'Dépôt Espèces',
        description: 'Dépôt d\'espèces dans les comptes',
        isActive: true,
        createdAt: new Date().toISOString()
      },
      
      // Subcategories Investissement
      {
        id: 'SUBCAT_016',
        categoryId: 'CAT_004',
        name: 'Achat d\'Actions',
        description: 'Achat d\'actions individuelles',
        isActive: true,
        createdAt: new Date().toISOString()
      },
      {
        id: 'SUBCAT_017',
        categoryId: 'CAT_004',
        name: 'Investissement Fonds',
        description: 'Fonds communs, FNB, fonds indiciels',
        isActive: true,
        createdAt: new Date().toISOString()
      },
      {
        id: 'SUBCAT_018',
        categoryId: 'CAT_004',
        name: 'Achat d\'Obligations',
        description: 'Obligations gouvernementales et corporatives',
        isActive: true,
        createdAt: new Date().toISOString()
      },
      {
        id: 'SUBCAT_019',
        categoryId: 'CAT_004',
        name: 'Cryptomonnaie',
        description: 'Investissements en monnaie numérique',
        isActive: true,
        createdAt: new Date().toISOString()
      },
      {
        id: 'SUBCAT_020',
        categoryId: 'CAT_004',
        name: 'Frais d\'Investissement',
        description: 'Frais de courtage, frais de gestion',
        isActive: true,
        createdAt: new Date().toISOString()
      }
    ];
  }

  // Stress test method to generate bulk transactions
  generateStressTestTransactions(count = 1000) {
    console.log(`Starting stress test: generating ${count} transactions...`);
    
    const startTime = performance.now();
    const transactions = [];
    
    // Get available accounts
    const accounts = this.tables.accounts.filter(acc => acc.isActive);
    const vendors = this.tables.vendors;
    const customers = this.tables.customers;
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
        customerId: Math.random() > 0.7 && customers.length > 0 ? 
          customers[Math.floor(Math.random() * customers.length)].id : null,
        vendorId: Math.random() > 0.6 && vendors.length > 0 ? 
          vendors[Math.floor(Math.random() * vendors.length)].id : null,
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
}

export default RelationalDatabase;