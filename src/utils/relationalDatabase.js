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
      account_types: [],
      categories: [],
      subcategories: [],
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
        categoryId: { table: 'categories', field: 'id', optional: true },
        subcategoryId: { table: 'subcategories', field: 'id', optional: true }
      },
      accounts: {
        accountTypeId: { table: 'account_types', field: 'id' }
      },
      subcategories: {
        categoryId: { table: 'categories', field: 'id' }
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
      account_types: this.generateAccountTypes(language),
      categories: this.generateCategories(language),
      subcategories: this.generateSubcategories(language),
      
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

    const newAccount = {
      id: 'ACC' + Date.now(),
      name: accountData.name,
      accountTypeId: accountData.accountTypeId,
      balance: parseFloat(accountData.balance) || 0,
      description: accountData.description || '',
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
    if (!this.workbooks[tableName]) return null;
    
    this.saveTableToWorkbook(tableName);
    return XLSX.write(this.workbooks[tableName], { bookType: 'xlsx', type: 'array' });
  }

  exportAllTablesToBuffers() {
    const buffers = {};
    
    for (const tableName of Object.keys(this.tables)) {
      buffers[tableName] = this.exportTableToBuffer(tableName);
    }
    
    return buffers;
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
    this.tables.accounts.forEach(account => {
      const accountType = this.getRecord('account_types', account.accountTypeId);
      if (accountType && accountBalances.hasOwnProperty(account.id)) {
        const type = accountType.type;
        let accountBalance = accountBalances[account.id];
        
        // For liability, equity, and income accounts, we need to consider the sign
        // In double-entry, these accounts have normal credit balances
        if (type === 'Liability' || type === 'Equity' || type === 'Income') {
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
    
    return this.tables.accounts.map(account => {
      const accountType = this.getRecord('account_types', account.accountTypeId);
      let calculatedBalance = accountBalances[account.id] || 0;
      
      // For liability, equity, and income accounts, display the credit balance as positive
      if (accountType && (accountType.type === 'Liability' || accountType.type === 'Equity' || accountType.type === 'Income')) {
        calculatedBalance = -calculatedBalance;
      }
      
      return {
        ...account,
        balance: calculatedBalance,
        accountType: accountType
      };
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

  // Account Types methods
  getAccountTypes() {
    return this.tables.account_types;
  }

  getAccountTypesByType(type) {
    return this.tables.account_types.filter(accountType => 
      accountType.type === type && accountType.isActive
    );
  }

  addAccountType(accountTypeData) {
    const newAccountType = {
      id: 'ACCT_TYPE_' + Date.now(),
      type: accountTypeData.type,
      subtype: accountTypeData.subtype || '',
      description: accountTypeData.description || '',
      examples: accountTypeData.examples || '',
      normalBalance: accountTypeData.normalBalance || 'Debit',
      isActive: accountTypeData.isActive !== undefined ? accountTypeData.isActive : true,
      createdAt: new Date().toISOString()
    };

    this.tables.account_types.push(newAccountType);
    this.saveTableToWorkbook('account_types');
    return newAccountType;
  }

  updateAccountType(id, accountTypeData) {
    const accountTypeIndex = this.tables.account_types.findIndex(accountType => accountType.id === id);
    if (accountTypeIndex === -1) {
      throw new Error(`Account type with id ${id} not found`);
    }

    const updatedAccountType = {
      ...this.tables.account_types[accountTypeIndex],
      type: accountTypeData.type !== undefined ? accountTypeData.type : this.tables.account_types[accountTypeIndex].type,
      subtype: accountTypeData.subtype !== undefined ? accountTypeData.subtype : this.tables.account_types[accountTypeIndex].subtype,
      description: accountTypeData.description !== undefined ? accountTypeData.description : this.tables.account_types[accountTypeIndex].description,
      examples: accountTypeData.examples !== undefined ? accountTypeData.examples : this.tables.account_types[accountTypeIndex].examples,
      normalBalance: accountTypeData.normalBalance !== undefined ? accountTypeData.normalBalance : this.tables.account_types[accountTypeIndex].normalBalance,
      isActive: accountTypeData.isActive !== undefined ? accountTypeData.isActive : this.tables.account_types[accountTypeIndex].isActive
    };

    this.tables.account_types[accountTypeIndex] = updatedAccountType;
    this.saveTableToWorkbook('account_types');
    return updatedAccountType;
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
        subtype: 'Current Asset',
        description: 'Assets that can be easily converted to cash within one year',
        examples: 'Cash, Bank Accounts, Savings Accounts',
        normalBalance: 'Debit',
        isActive: true,
        createdAt: new Date().toISOString()
      },
      {
        id: 'ACCT_TYPE_002',
        type: 'Asset',
        subtype: 'Investment',
        description: 'Long-term investments and securities',
        examples: 'Stocks, Bonds, Mutual Funds, Retirement Accounts',
        normalBalance: 'Debit',
        isActive: true,
        createdAt: new Date().toISOString()
      },
      {
        id: 'ACCT_TYPE_003',
        type: 'Asset',
        subtype: 'Fixed Asset',
        description: 'Long-term physical assets',
        examples: 'Real Estate, Vehicles, Equipment',
        normalBalance: 'Debit',
        isActive: true,
        createdAt: new Date().toISOString()
      },
      {
        id: 'ACCT_TYPE_004',
        type: 'Liability',
        subtype: 'Current Liability',
        description: 'Debts and obligations due within one year',
        examples: 'Credit Cards, Short-term Loans, Bills Payable',
        normalBalance: 'Credit',
        isActive: true,
        createdAt: new Date().toISOString()
      },
      {
        id: 'ACCT_TYPE_005',
        type: 'Liability',
        subtype: 'Long-term Liability',
        description: 'Debts and obligations due after one year',
        examples: 'Mortgage, Car Loans, Student Loans',
        normalBalance: 'Credit',
        isActive: true,
        createdAt: new Date().toISOString()
      },
      {
        id: 'ACCT_TYPE_006',
        type: 'Income',
        subtype: 'Earned Income',
        description: 'Money earned from work and employment',
        examples: 'Salary, Wages, Tips, Bonuses',
        normalBalance: 'Credit',
        isActive: true,
        createdAt: new Date().toISOString()
      },
      {
        id: 'ACCT_TYPE_007',
        type: 'Income',
        subtype: 'Investment Income',
        description: 'Money earned from investments',
        examples: 'Dividends, Interest, Capital Gains',
        normalBalance: 'Credit',
        isActive: true,
        createdAt: new Date().toISOString()
      },
      {
        id: 'ACCT_TYPE_008',
        type: 'Income',
        subtype: 'Other Income',
        description: 'Other sources of income',
        examples: 'Rental Income, Side Business, Gifts',
        normalBalance: 'Credit',
        isActive: true,
        createdAt: new Date().toISOString()
      },
      {
        id: 'ACCT_TYPE_009',
        type: 'Expense',
        subtype: 'Essential Expenses',
        description: 'Necessary living expenses',
        examples: 'Housing, Utilities, Groceries, Insurance',
        normalBalance: 'Debit',
        isActive: true,
        createdAt: new Date().toISOString()
      },
      {
        id: 'ACCT_TYPE_010',
        type: 'Expense',
        subtype: 'Transportation',
        description: 'Transportation-related expenses',
        examples: 'Gas, Car Maintenance, Public Transit, Parking',
        normalBalance: 'Debit',
        isActive: true,
        createdAt: new Date().toISOString()
      },
      {
        id: 'ACCT_TYPE_011',
        type: 'Expense',
        subtype: 'Entertainment',
        description: 'Discretionary entertainment expenses',
        examples: 'Dining Out, Movies, Hobbies, Subscriptions',
        normalBalance: 'Debit',
        isActive: true,
        createdAt: new Date().toISOString()
      },
      {
        id: 'ACCT_TYPE_012',
        type: 'Expense',
        subtype: 'Healthcare',
        description: 'Medical and healthcare expenses',
        examples: 'Doctor Visits, Medications, Health Insurance',
        normalBalance: 'Debit',
        isActive: true,
        createdAt: new Date().toISOString()
      },
      {
        id: 'ACCT_TYPE_013',
        type: 'Equity',
        subtype: 'Net Worth',
        description: 'Personal equity and net worth',
        examples: 'Opening Balance, Retained Earnings',
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
        subtype: 'Actif Courant',
        description: 'Actifs facilement convertibles en espèces dans un délai d\'un an',
        examples: 'Espèces, Comptes Bancaires, Comptes Épargne',
        normalBalance: 'Débit',
        isActive: true,
        createdAt: new Date().toISOString()
      },
      {
        id: 'ACCT_TYPE_002',
        type: 'Actif',
        subtype: 'Investissement',
        description: 'Investissements et valeurs mobilières à long terme',
        examples: 'Actions, Obligations, Fonds Communs, Comptes Retraite',
        normalBalance: 'Débit',
        isActive: true,
        createdAt: new Date().toISOString()
      },
      {
        id: 'ACCT_TYPE_003',
        type: 'Actif',
        subtype: 'Actif Immobilisé',
        description: 'Actifs physiques à long terme',
        examples: 'Immobilier, Véhicules, Équipements',
        normalBalance: 'Débit',
        isActive: true,
        createdAt: new Date().toISOString()
      },
      {
        id: 'ACCT_TYPE_004',
        type: 'Passif',
        subtype: 'Passif Courant',
        description: 'Dettes et obligations exigibles dans un délai d\'un an',
        examples: 'Cartes de Crédit, Prêts Court Terme, Factures à Payer',
        normalBalance: 'Crédit',
        isActive: true,
        createdAt: new Date().toISOString()
      },
      {
        id: 'ACCT_TYPE_005',
        type: 'Passif',
        subtype: 'Passif Long Terme',
        description: 'Dettes et obligations exigibles après un an',
        examples: 'Hypothèque, Prêts Auto, Prêts Étudiants',
        normalBalance: 'Crédit',
        isActive: true,
        createdAt: new Date().toISOString()
      },
      {
        id: 'ACCT_TYPE_006',
        type: 'Revenus',
        subtype: 'Revenus du Travail',
        description: 'Revenus provenant du travail et de l\'emploi',
        examples: 'Salaire, Heures, Pourboires, Primes',
        normalBalance: 'Crédit',
        isActive: true,
        createdAt: new Date().toISOString()
      },
      {
        id: 'ACCT_TYPE_007',
        type: 'Revenus',
        subtype: 'Revenus de Placements',
        description: 'Revenus provenant des investissements',
        examples: 'Dividendes, Intérêts, Plus-values',
        normalBalance: 'Crédit',
        isActive: true,
        createdAt: new Date().toISOString()
      },
      {
        id: 'ACCT_TYPE_008',
        type: 'Revenus',
        subtype: 'Autres Revenus',
        description: 'Autres sources de revenus',
        examples: 'Revenus Locatifs, Activité Secondaire, Cadeaux',
        normalBalance: 'Crédit',
        isActive: true,
        createdAt: new Date().toISOString()
      },
      {
        id: 'ACCT_TYPE_009',
        type: 'Dépenses',
        subtype: 'Dépenses Essentielles',
        description: 'Dépenses de subsistance nécessaires',
        examples: 'Logement, Services Publics, Alimentation, Assurance',
        normalBalance: 'Débit',
        isActive: true,
        createdAt: new Date().toISOString()
      },
      {
        id: 'ACCT_TYPE_010',
        type: 'Dépenses',
        subtype: 'Transport',
        description: 'Dépenses liées au transport',
        examples: 'Essence, Entretien Auto, Transport Public, Stationnement',
        normalBalance: 'Débit',
        isActive: true,
        createdAt: new Date().toISOString()
      },
      {
        id: 'ACCT_TYPE_011',
        type: 'Dépenses',
        subtype: 'Divertissement',
        description: 'Dépenses de divertissement discrétionnaires',
        examples: 'Restaurants, Cinéma, Loisirs, Abonnements',
        normalBalance: 'Débit',
        isActive: true,
        createdAt: new Date().toISOString()
      },
      {
        id: 'ACCT_TYPE_012',
        type: 'Dépenses',
        subtype: 'Santé',
        description: 'Dépenses médicales et de santé',
        examples: 'Consultations, Médicaments, Assurance Santé',
        normalBalance: 'Débit',
        isActive: true,
        createdAt: new Date().toISOString()
      },
      {
        id: 'ACCT_TYPE_013',
        type: 'Équité',
        subtype: 'Patrimoine Net',
        description: 'Équité personnelle et patrimoine net',
        examples: 'Solde d\'Ouverture, Bénéfices Non Distribués',
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
          balance: 1000,
          description: 'Cash on hand',
          isActive: true,
          createdAt: new Date().toISOString()
        },
        { 
          id: 'ACC002', 
          name: 'Bank Account - Checking', 
          accountTypeId: 'ACCT_TYPE_001',
          balance: 5000,
          description: 'Main checking account',
          isActive: true,
          createdAt: new Date().toISOString()
        },
        { 
          id: 'ACC003', 
          name: 'Salary Income', 
          accountTypeId: 'ACCT_TYPE_006',
          balance: 0,
          description: 'Monthly salary',
          isActive: true,
          createdAt: new Date().toISOString()
        },
        { 
          id: 'ACC004', 
          name: 'Grocery Expenses', 
          accountTypeId: 'ACCT_TYPE_009',
          balance: 0,
          description: 'Food and household items',
          isActive: true,
          createdAt: new Date().toISOString()
        },
        { 
          id: 'ACC005', 
          name: 'Savings Account', 
          accountTypeId: 'ACCT_TYPE_001',
          balance: 10000,
          description: 'Emergency savings',
          isActive: true,
          createdAt: new Date().toISOString()
        },
        { 
          id: 'ACC006', 
          name: 'Credit Card', 
          accountTypeId: 'ACCT_TYPE_004',
          balance: 2500,
          description: 'Main credit card debt',
          isActive: true,
          createdAt: new Date().toISOString()
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
          balance: 1000,
          description: 'Argent liquide disponible',
          isActive: true,
          createdAt: new Date().toISOString()
        },
        { 
          id: 'ACC002', 
          name: 'Compte Courant', 
          accountTypeId: 'ACCT_TYPE_001',
          balance: 5000,
          description: 'Compte bancaire principal',
          isActive: true,
          createdAt: new Date().toISOString()
        },
        { 
          id: 'ACC003', 
          name: 'Revenus Salariaux', 
          accountTypeId: 'ACCT_TYPE_006',
          balance: 0,
          description: 'Salaire mensuel',
          isActive: true,
          createdAt: new Date().toISOString()
        },
        { 
          id: 'ACC004', 
          name: 'Dépenses Alimentaires', 
          accountTypeId: 'ACCT_TYPE_009',
          balance: 0,
          description: 'Alimentation et produits ménagers',
          isActive: true,
          createdAt: new Date().toISOString()
        },
        { 
          id: 'ACC005', 
          name: 'Compte Épargne', 
          accountTypeId: 'ACCT_TYPE_001',
          balance: 10000,
          description: 'Épargne de précaution',
          isActive: true,
          createdAt: new Date().toISOString()
        },
        { 
          id: 'ACC006', 
          name: 'Carte de Crédit', 
          accountTypeId: 'ACCT_TYPE_004',
          balance: 2500,
          description: 'Dette carte de crédit principale',
          isActive: true,
          createdAt: new Date().toISOString()
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
    return this.tables.categories;
  }

  getActiveCategories() {
    return this.tables.categories.filter(category => category.isActive);
  }

  addCategory(categoryData) {
    const newCategory = {
      id: 'CAT_' + Date.now(),
      name: categoryData.name,
      description: categoryData.description || '',
      color: categoryData.color || '#2196F3',
      icon: categoryData.icon || '💼',
      isActive: categoryData.isActive !== undefined ? categoryData.isActive : true,
      createdAt: new Date().toISOString()
    };

    this.tables.categories.push(newCategory);
    this.saveTableToWorkbook('categories');
    return newCategory;
  }

  updateCategory(id, categoryData) {
    const categoryIndex = this.tables.categories.findIndex(category => category.id === id);
    if (categoryIndex === -1) {
      throw new Error(`Category with id ${id} not found`);
    }

    const updatedCategory = {
      ...this.tables.categories[categoryIndex],
      ...categoryData,
      id: id // Ensure ID doesn't change
    };

    this.tables.categories[categoryIndex] = updatedCategory;
    this.saveTableToWorkbook('categories');
    return updatedCategory;
  }

  deleteCategory(id) {
    const categoryIndex = this.tables.categories.findIndex(category => category.id === id);
    if (categoryIndex === -1) {
      throw new Error(`Category with id ${id} not found`);
    }

    // Check if category is used in subcategories or transactions
    const usedInSubcategories = this.tables.subcategories.some(subcategory => subcategory.categoryId === id);
    const usedInTransactions = this.tables.transactions.some(transaction => transaction.categoryId === id);

    if (usedInSubcategories || usedInTransactions) {
      throw new Error('Cannot delete category: it is used in subcategories or transactions');
    }

    const deletedCategory = this.tables.categories[categoryIndex];
    this.tables.categories.splice(categoryIndex, 1);
    this.saveTableToWorkbook('categories');
    return deletedCategory;
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
      category: this.getRecord('categories', subcategory.categoryId)
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
        isActive: true,
        createdAt: new Date().toISOString()
      },
      {
        id: 'CAT_002',
        name: 'Expenses',
        description: 'Money going out',
        color: '#F44336',
        icon: '💸',
        isActive: true,
        createdAt: new Date().toISOString()
      },
      {
        id: 'CAT_003',
        name: 'Transfer',
        description: 'Money movement between accounts',
        color: '#2196F3',
        icon: '🔄',
        isActive: true,
        createdAt: new Date().toISOString()
      },
      {
        id: 'CAT_004',
        name: 'Investment',
        description: 'Investment-related transactions',
        color: '#9C27B0',
        icon: '📈',
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
        isActive: true,
        createdAt: new Date().toISOString()
      },
      {
        id: 'CAT_002',
        name: 'Dépenses',
        description: 'Argent qui sort',
        color: '#F44336',
        icon: '💸',
        isActive: true,
        createdAt: new Date().toISOString()
      },
      {
        id: 'CAT_003',
        name: 'Virement',
        description: 'Mouvement d\'argent entre comptes',
        color: '#2196F3',
        icon: '🔄',
        isActive: true,
        createdAt: new Date().toISOString()
      },
      {
        id: 'CAT_004',
        name: 'Investissement',
        description: 'Transactions liées aux investissements',
        color: '#9C27B0',
        icon: '📈',
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
        name: 'Salary/Wages',
        description: 'Regular employment income',
        isActive: true,
        createdAt: new Date().toISOString()
      },
      {
        id: 'SUBCAT_002',
        categoryId: 'CAT_001',
        name: 'Freelance/Consulting',
        description: 'Independent work income',
        isActive: true,
        createdAt: new Date().toISOString()
      },
      {
        id: 'SUBCAT_003',
        categoryId: 'CAT_001',
        name: 'Investment Returns',
        description: 'Dividends, interest, capital gains',
        isActive: true,
        createdAt: new Date().toISOString()
      },
      {
        id: 'SUBCAT_004',
        categoryId: 'CAT_001',
        name: 'Side Business',
        description: 'Income from side business or gig work',
        isActive: true,
        createdAt: new Date().toISOString()
      },
      {
        id: 'SUBCAT_005',
        categoryId: 'CAT_001',
        name: 'Gifts/Bonuses',
        description: 'Gifts, bonuses, and unexpected income',
        isActive: true,
        createdAt: new Date().toISOString()
      },
      
      // Expense Subcategories
      {
        id: 'SUBCAT_006',
        categoryId: 'CAT_002',
        name: 'Housing',
        description: 'Rent, mortgage, utilities, maintenance',
        isActive: true,
        createdAt: new Date().toISOString()
      },
      {
        id: 'SUBCAT_007',
        categoryId: 'CAT_002',
        name: 'Transportation',
        description: 'Gas, car payments, public transit',
        isActive: true,
        createdAt: new Date().toISOString()
      },
      {
        id: 'SUBCAT_008',
        categoryId: 'CAT_002',
        name: 'Food & Dining',
        description: 'Groceries, restaurants, takeout',
        isActive: true,
        createdAt: new Date().toISOString()
      },
      {
        id: 'SUBCAT_009',
        categoryId: 'CAT_002',
        name: 'Healthcare',
        description: 'Medical expenses, insurance, medications',
        isActive: true,
        createdAt: new Date().toISOString()
      },
      {
        id: 'SUBCAT_010',
        categoryId: 'CAT_002',
        name: 'Entertainment',
        description: 'Movies, subscriptions, hobbies, travel',
        isActive: true,
        createdAt: new Date().toISOString()
      },
      {
        id: 'SUBCAT_011',
        categoryId: 'CAT_002',
        name: 'Shopping',
        description: 'Clothing, electronics, home goods',
        isActive: true,
        createdAt: new Date().toISOString()
      },
      {
        id: 'SUBCAT_012',
        categoryId: 'CAT_002',
        name: 'Bills & Utilities',
        description: 'Phone, internet, insurance, subscriptions',
        isActive: true,
        createdAt: new Date().toISOString()
      },
      
      // Transfer Subcategories
      {
        id: 'SUBCAT_013',
        categoryId: 'CAT_003',
        name: 'Account Transfer',
        description: 'Transfer between bank accounts',
        isActive: true,
        createdAt: new Date().toISOString()
      },
      {
        id: 'SUBCAT_014',
        categoryId: 'CAT_003',
        name: 'Cash Withdrawal',
        description: 'ATM withdrawals and cash transactions',
        isActive: true,
        createdAt: new Date().toISOString()
      },
      {
        id: 'SUBCAT_015',
        categoryId: 'CAT_003',
        name: 'Cash Deposit',
        description: 'Depositing cash into accounts',
        isActive: true,
        createdAt: new Date().toISOString()
      },
      
      // Investment Subcategories
      {
        id: 'SUBCAT_016',
        categoryId: 'CAT_004',
        name: 'Stock Purchase',
        description: 'Buying individual stocks',
        isActive: true,
        createdAt: new Date().toISOString()
      },
      {
        id: 'SUBCAT_017',
        categoryId: 'CAT_004',
        name: 'Fund Investment',
        description: 'Mutual funds, ETFs, index funds',
        isActive: true,
        createdAt: new Date().toISOString()
      },
      {
        id: 'SUBCAT_018',
        categoryId: 'CAT_004',
        name: 'Bond Purchase',
        description: 'Government and corporate bonds',
        isActive: true,
        createdAt: new Date().toISOString()
      },
      {
        id: 'SUBCAT_019',
        categoryId: 'CAT_004',
        name: 'Cryptocurrency',
        description: 'Digital currency investments',
        isActive: true,
        createdAt: new Date().toISOString()
      },
      {
        id: 'SUBCAT_020',
        categoryId: 'CAT_004',
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
        name: 'Salaire/Rémunération',
        description: 'Revenus d\'emploi régulier',
        isActive: true,
        createdAt: new Date().toISOString()
      },
      {
        id: 'SUBCAT_002',
        categoryId: 'CAT_001',
        name: 'Freelance/Conseil',
        description: 'Revenus de travail indépendant',
        isActive: true,
        createdAt: new Date().toISOString()
      },
      {
        id: 'SUBCAT_003',
        categoryId: 'CAT_001',
        name: 'Revenus de Placement',
        description: 'Dividendes, intérêts, plus-values',
        isActive: true,
        createdAt: new Date().toISOString()
      },
      {
        id: 'SUBCAT_004',
        categoryId: 'CAT_001',
        name: 'Activité Secondaire',
        description: 'Revenus d\'activité secondaire ou travail à la demande',
        isActive: true,
        createdAt: new Date().toISOString()
      },
      {
        id: 'SUBCAT_005',
        categoryId: 'CAT_001',
        name: 'Cadeaux/Primes',
        description: 'Cadeaux, primes et revenus inattendus',
        isActive: true,
        createdAt: new Date().toISOString()
      },
      
      // Subcategories Dépenses
      {
        id: 'SUBCAT_006',
        categoryId: 'CAT_002',
        name: 'Logement',
        description: 'Loyer, hypothèque, services publics, entretien',
        isActive: true,
        createdAt: new Date().toISOString()
      },
      {
        id: 'SUBCAT_007',
        categoryId: 'CAT_002',
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
}

export default RelationalDatabase;