import React, { createContext, useContext, useState, useEffect } from 'react';
import RelationalFileStorage from '../utils/relationalFileStorage';
import RelationalDatabase from '../utils/relationalDatabase';
import ExchangeRateService from '../utils/exchangeRateService';
import LiveExchangeRateService from '../utils/liveExchangeRateService';
import CryptoRateService from '../utils/cryptoRateService';
import NumberFormatService from '../utils/numberFormatService';
import DateFormatService from '../utils/dateFormatService';
import { useLanguage } from './LanguageContext';

const AccountingContext = createContext();

export const useAccounting = () => {
  const context = useContext(AccountingContext);
  if (!context) {
    throw new Error('useAccounting must be used within an AccountingProvider');
  }
  return context;
};

export const AccountingProvider = ({ children }) => {
  const { language, changeLanguage } = useLanguage();
  const [database, setDatabase] = useState(new RelationalDatabase());
  const [fileStorage, setFileStorage] = useState(new RelationalFileStorage());
  const [exchangeRateService, setExchangeRateService] = useState(null);
  const [cryptoRateService, setCryptoRateService] = useState(null);
  const [numberFormatService, setNumberFormatService] = useState(null);
  const [dateFormatService, setDateFormatService] = useState(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [accounts, setAccounts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [tags, setTags] = useState([]);
  const [products, setProducts] = useState([]);
  const [todos, setTodos] = useState([]);
  const [categories, setCategories] = useState([]);
  const [transactionGroups, setTransactionGroups] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [currencies, setCurrencies] = useState([]);
  const [exchangeRates, setExchangeRates] = useState([]);
  const [currencySettings, setCurrencySettings] = useState([]);
  const [userPreferences, setUserPreferences] = useState([]);
  const [apiSettings, setApiSettings] = useState([]);
  const [apiUsage, setApiUsage] = useState([]);
  const [databaseInfo, setDatabaseInfo] = useState([]);
  const [payees, setPayees] = useState([]);
  const [payers, setPayers] = useState([]);
  const [bankConfigurations, setBankConfigurations] = useState([]);
  const [processingRules, setProcessingRules] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    initializeDatabase();
  }, []);

  const loadBankConfigurations = () => {
    // Migration: Check for existing localStorage data and migrate to database
    try {
      const stored = localStorage.getItem('bankConfigurations');
      if (stored && database) {
        const configs = JSON.parse(stored);
        // Migrate each config to database if not already there
        configs.forEach(config => {
          const existingConfigs = database.getBankConfigurations();
          const exists = existingConfigs.find(existing => existing.id === config.id);
          if (!exists) {
            console.log('Migrating bank configuration to database:', config.name);
            database.addBankConfiguration(config);
          }
        });
        
        // Update state from database
        setBankConfigurations([...database.getBankConfigurations()]);
        
        // Clear localStorage after successful migration
        localStorage.removeItem('bankConfigurations');
        console.log('Bank configurations migrated from localStorage to database');
      } else if (database) {
        // No localStorage data, just load from database
        setBankConfigurations([...database.getBankConfigurations()]);
      }
    } catch (error) {
      console.error('Error loading bank configurations:', error);
    }
  };

  const initializeDatabase = async () => {
    try {
      setLoading(true);
      
      // Just finish loading - user will need to manually select database
      // This avoids the SecurityError from trying to show file pickers without user gesture
    } catch (error) {
      console.error('Error initializing database:', error);
    } finally {
      setLoading(false);
    }
  };

  // Ensure missing tables are initialized and saved to file storage
  const initializeMissingTables = async () => {
    try {
      const tablesBefore = Object.keys(database.tables).length;
      database.saveAllTablesToWorkbooks(); // This calls ensureAllTablesExist()
      const tablesAfter = Object.keys(database.tables).length;
      
      // If new tables were created, save them to file storage
      if (tablesAfter > tablesBefore) {
        console.log('New tables created, saving to file storage...');
        const buffers = database.exportAllTablesToBuffers();
        await fileStorage.saveAllTables(buffers);
      }
    } catch (error) {
      console.warn('Error initializing missing tables:', error);
    }
  };

  const updateStateFromDatabase = () => {
    // Ensure all tables have workbooks initialized (including new tables like payers)
    if (database.saveAllTablesToWorkbooks) {
      database.saveAllTablesToWorkbooks();
    }
    
    const accountsData = database.getTable('accounts');
    
    // Create new arrays to ensure React detects changes
    setAccounts([...accountsData]);
    setTransactions([...database.getTable('transactions')]);
    setTags([...database.getTable('tags')]);
    setProducts([...database.getTable('tags')]);
    setTodos([...database.getTable('todos')]);
    setPayees([...database.getTable('payees')]);
    setPayers([...database.getTable('payers')]);
    setBankConfigurations([...database.getBankConfigurations()]);
    
    // Load all processing rules for all bank configurations
    const allBankConfigs = database.getBankConfigurations();
    const allProcessingRules = {};
    allBankConfigs.forEach(bankConfig => {
      const rules = database.getProcessingRules(bankConfig.id);
      if (rules.length > 0) {
        allProcessingRules[bankConfig.id] = rules;
      }
    });
    setProcessingRules(allProcessingRules);
    
    setCategories([...database.getCategories()]);
    setTransactionGroups([...database.getTransactionGroups()]);
    setSubcategories([...database.getSubcategories()]);
    setCurrencies([...database.getTable('currencies')]);
    setExchangeRates([...database.getTable('exchange_rates')]);
    setCurrencySettings([...database.getTable('currency_settings')]);
    setUserPreferences([...database.getTable('user_preferences')]);
    setApiSettings([...database.getTable('api_settings')]);
    setApiUsage(database.getTable('api_usage'));
    setDatabaseInfo(database.getTable('database_info'));
    
    // Initialize number format service first (needed by other services)
    const formatService = new NumberFormatService(database);
    setNumberFormatService(formatService);
    
    // Initialize or update live exchange rate service
    const currentApiSettings = database.getTable('api_settings')[0];
    const liveService = new LiveExchangeRateService(database, currentApiSettings);
    liveService.setNumberFormatService(formatService); // Inject the format service
    setExchangeRateService(liveService);
    
    // Initialize crypto rate service
    const cryptoService = new CryptoRateService(database);
    setCryptoRateService(cryptoService);
    
    // Initialize date format service
    const dateService = new DateFormatService(database);
    setDateFormatService(dateService);
    
    // Start automatic updates if configured
    if (currentApiSettings && currentApiSettings.autoUpdate) {
      setTimeout(() => liveService.updateSchedule(), 1000); // Delay to ensure everything is loaded
    }
  };

  const createNewDatabase = async () => {
    try {
      const success = await fileStorage.createNewDatabase();
      if (!success) return false;
      
      database.createNewDatabase(language);
      // Set the database language to current UI language
      database.setDatabaseLanguage(language);
      updateStateFromDatabase();
      setIsLoaded(true);
      
      // Load bank configurations after database is created
      loadBankConfigurations();
      
      const buffers = database.exportAllTablesToBuffers();
      await fileStorage.saveAllTables(buffers);
      
      return true;
    } catch (error) {
      console.error('Error creating new database:', error);
      return false;
    }
  };

  const loadExistingDatabase = async () => {
    try {
      const files = await fileStorage.selectDatabaseFolder();
      if (files === null) {
        // User cancelled the selection
        return false;
      }
      if (files && await database.loadFromFiles(files)) {
        updateStateFromDatabase();
        
        // Initialize any missing tables (like payers for older databases)
        await initializeMissingTables();
        
        // Get database language and set UI language accordingly
        const dbLanguage = database.getDatabaseLanguage();
        if (dbLanguage && dbLanguage !== language) {
          changeLanguage(dbLanguage);
        }
        
        // Load bank configurations after database is loaded
        loadBankConfigurations();
        
        setIsLoaded(true);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error loading existing database:', error);
      return false;
    }
  };

  const addTransaction = async (transactionData) => {
    try {
      // Pass transaction data directly - database should use accountId and destinationAccountId
      const newTransaction = database.addTransaction(transactionData);
      updateStateFromDatabase();
      
      const buffers = {
        transactions: database.exportTableToBuffer('transactions'),
        accounts: database.exportTableToBuffer('accounts')
      };
      await fileStorage.saveAllTables(buffers);
      
      return newTransaction;
    } catch (error) {
      console.error('Error adding transaction:', error);
      throw error;
    }
  };

  const addAccount = async (accountData) => {
    try {
      const newAccount = database.addAccount(accountData);
      setAccounts(database.getTable('accounts'));
      
      const buffer = database.exportTableToBuffer('accounts');
      await fileStorage.saveTable('accounts', buffer);
      
      return newAccount;
    } catch (error) {
      console.error('Error adding account:', error);
      throw error;
    }
  };


  const addProduct = async (productData) => {
    try {
      const newProduct = database.addProduct(productData);
      setProducts(database.getTable('products'));
      
      const buffer = database.exportTableToBuffer('products');
      await fileStorage.saveTable('products', buffer);
      
      return newProduct;
    } catch (error) {
      console.error('Error adding product:', error);
      throw error;
    }
  };

  const updateAccount = async (id, accountData) => {
    try {
      if (!database || typeof database.updateAccount !== 'function') {
        throw new Error('Database is not properly initialized or updateAccount method is missing');
      }
      
      const updatedAccount = database.updateAccount(id, accountData);
      setAccounts(database.getTable('accounts'));
      
      const buffer = database.exportTableToBuffer('accounts');
      await fileStorage.saveTable('accounts', buffer);
      
      return updatedAccount;
    } catch (error) {
      console.error('Error updating account:', error);
      throw error;
    }
  };


  const updateProduct = async (id, productData) => {
    try {
      const updatedProduct = database.updateProduct(id, productData);
      setProducts(database.getTable('products'));
      
      const buffer = database.exportTableToBuffer('products');
      await fileStorage.saveTable('products', buffer);
      
      return updatedProduct;
    } catch (error) {
      console.error('Error updating product:', error);
      throw error;
    }
  };

  const deleteAccount = async (id) => {
    try {
      const deletedAccount = database.deleteAccount(id);
      setAccounts([...database.getTable('accounts')]); // Create new array to force re-render
      
      const buffer = database.exportTableToBuffer('accounts');
      await fileStorage.saveTable('accounts', buffer);
      
      return deletedAccount;
    } catch (error) {
      console.error('Error deleting account:', error);
      throw error;
    }
  };


  const deleteTransaction = async (id) => {
    try {
      const deletedTransaction = database.deleteTransaction(id);
      // Force re-render with new arrays for both transactions and accounts
      setTransactions([...database.getTable('transactions')]);
      setAccounts([...database.getTable('accounts')]);
      
      const buffers = {
        transactions: database.exportTableToBuffer('transactions'),
        accounts: database.exportTableToBuffer('accounts')
      };
      await fileStorage.saveAllTables(buffers);
      
      return deletedTransaction;
    } catch (error) {
      console.error('Error deleting transaction:', error);
      throw error;
    }
  };

  const deleteProduct = async (id) => {
    try {
      const deletedProduct = database.deleteProduct(id);
      setTags([...database.getTable('tags')]); // Create new array to force re-render
      
      const buffer = database.exportTableToBuffer('tags');
      await fileStorage.saveTable('tags', buffer);
      
      return deletedProduct;
    } catch (error) {
      console.error('Error deleting product:', error);
      throw error;
    }
  };

  // Payees CRUD methods
  const addPayee = async (payeeData) => {
    try {
      const newPayee = database.addPayee(payeeData);
      setPayees(database.getTable('payees'));
      
      const buffer = database.exportTableToBuffer('payees');
      await fileStorage.saveTable('payees', buffer);
      
      return newPayee;
    } catch (error) {
      console.error('Error adding payee:', error);
      throw error;
    }
  };

  const updatePayee = async (id, payeeData) => {
    try {
      const updatedPayee = database.updatePayee(id, payeeData);
      setPayees(database.getTable('payees'));
      
      const buffer = database.exportTableToBuffer('payees');
      await fileStorage.saveTable('payees', buffer);
      
      return updatedPayee;
    } catch (error) {
      console.error('Error updating payee:', error);
      throw error;
    }
  };

  const deletePayee = async (id) => {
    try {
      const deletedPayee = database.deletePayee(id);
      setPayees([...database.getTable('payees')]); // Create new array to force re-render
      
      const buffer = database.exportTableToBuffer('payees');
      await fileStorage.saveTable('payees', buffer);
      
      return deletedPayee;
    } catch (error) {
      console.error('Error deleting payee:', error);
      throw error;
    }
  };

  const getPayees = () => {
    return database.getPayees();
  };

  const getActivePayees = () => {
    return database.getActivePayees();
  };

  // Payers CRUD methods
  const addPayer = async (payerData) => {
    try {
      const newPayer = database.addPayer(payerData);
      setPayers(database.getTable('payers'));
      
      const buffer = database.exportTableToBuffer('payers');
      await fileStorage.saveTable('payers', buffer);
      
      return newPayer;
    } catch (error) {
      console.error('Error adding payer:', error);
      throw error;
    }
  };

  const updatePayer = async (id, payerData) => {
    try {
      const updatedPayer = database.updatePayer(id, payerData);
      setPayers(database.getTable('payers'));
      
      const buffer = database.exportTableToBuffer('payers');
      await fileStorage.saveTable('payers', buffer);
      
      return updatedPayer;
    } catch (error) {
      console.error('Error updating payer:', error);
      throw error;
    }
  };

  const deletePayer = async (id) => {
    try {
      const deletedPayer = database.deletePayer(id);
      setPayers([...database.getTable('payers')]); // Create new array to force re-render
      
      const buffer = database.exportTableToBuffer('payers');
      await fileStorage.saveTable('payers', buffer);
      
      return deletedPayer;
    } catch (error) {
      console.error('Error deleting payer:', error);
      throw error;
    }
  };

  const getPayers = () => {
    return database.getPayers();
  };

  const getActivePayers = () => {
    return database.getActivePayers();
  };

  // Bank Configuration functions
  const addBankConfiguration = async (bankConfig) => {
    try {
      const newConfig = database.addBankConfiguration(bankConfig);
      setBankConfigurations([...database.getBankConfigurations()]);
      
      const buffer = database.exportTableToBuffer('bank_configurations');
      await fileStorage.saveTable('bank_configurations', buffer);
      
      return newConfig;
    } catch (error) {
      console.error('Error adding bank configuration:', error);
      throw error;
    }
  };

  const updateBankConfiguration = async (id, updates) => {
    try {
      const updatedConfig = database.updateBankConfiguration(id, updates);
      setBankConfigurations([...database.getBankConfigurations()]);
      
      const buffer = database.exportTableToBuffer('bank_configurations');
      await fileStorage.saveTable('bank_configurations', buffer);
      
      return updatedConfig;
    } catch (error) {
      console.error('Error updating bank configuration:', error);
      throw error;
    }
  };

  const removeBankConfiguration = async (id) => {
    try {
      const deletedConfig = database.deleteBankConfiguration(id);
      setBankConfigurations([...database.getBankConfigurations()]);
      
      const buffer = database.exportTableToBuffer('bank_configurations');
      await fileStorage.saveTable('bank_configurations', buffer);
      
      return deletedConfig;
    } catch (error) {
      console.error('Error removing bank configuration:', error);
      throw error;
    }
  };

  const getBankConfigurations = () => {
    return database.getBankConfigurations();
  };

  // Processing Rules functions
  const loadProcessingRules = async (bankConfigId) => {
    try {
      const rules = database.getProcessingRules(bankConfigId);
      setProcessingRules(prev => ({
        ...prev,
        [bankConfigId]: rules
      }));
      return rules;
    } catch (error) {
      console.error('Error loading processing rules:', error);
      return [];
    }
  };

  const addProcessingRule = async (bankConfigId, rule) => {
    try {
      const newRule = database.addProcessingRule({ ...rule, bankConfigId });
      
      // Update local state
      const updatedRules = database.getProcessingRules(bankConfigId);
      setProcessingRules(prev => ({
        ...prev,
        [bankConfigId]: updatedRules
      }));
      
      // Save to file storage
      const buffer = database.exportTableToBuffer('processing_rules');
      await fileStorage.saveTable('processing_rules', buffer);
      
      return newRule;
    } catch (error) {
      console.error('Error adding processing rule:', error);
      throw error;
    }
  };

  const updateProcessingRule = async (ruleId, ruleData, bankConfigId) => {
    try {
      const updatedRule = database.updateProcessingRule(ruleId, ruleData);
      
      // Update local state
      const updatedRules = database.getProcessingRules(bankConfigId);
      setProcessingRules(prev => ({
        ...prev,
        [bankConfigId]: updatedRules
      }));
      
      // Save to file storage
      const buffer = database.exportTableToBuffer('processing_rules');
      await fileStorage.saveTable('processing_rules', buffer);
      
      return updatedRule;
    } catch (error) {
      console.error('Error updating processing rule:', error);
      throw error;
    }
  };

  const deleteProcessingRule = async (ruleId, bankConfigId) => {
    try {
      const deletedRule = database.deleteProcessingRule(ruleId);
      
      // Update local state
      const updatedRules = database.getProcessingRules(bankConfigId);
      setProcessingRules(prev => ({
        ...prev,
        [bankConfigId]: updatedRules
      }));
      
      // Save to file storage
      const buffer = database.exportTableToBuffer('processing_rules');
      await fileStorage.saveTable('processing_rules', buffer);
      
      return deletedRule;
    } catch (error) {
      console.error('Error deleting processing rule:', error);
      throw error;
    }
  };

  const toggleProcessingRuleActive = async (ruleId, active, bankConfigId) => {
    try {
      const updatedRule = database.toggleProcessingRuleActive(ruleId, active);
      
      // Update local state
      const updatedRules = database.getProcessingRules(bankConfigId);
      setProcessingRules(prev => ({
        ...prev,
        [bankConfigId]: updatedRules
      }));
      
      // Save to file storage
      const buffer = database.exportTableToBuffer('processing_rules');
      await fileStorage.saveTable('processing_rules', buffer);
      
      return updatedRule;
    } catch (error) {
      console.error('Error toggling processing rule:', error);
      throw error;
    }
  };

  const updateProcessingRuleOrder = async (ruleId, newOrder, bankConfigId) => {
    try {
      const updatedRule = database.updateProcessingRuleOrder(ruleId, newOrder);
      
      // Update local state
      const updatedRules = database.getProcessingRules(bankConfigId);
      setProcessingRules(prev => ({
        ...prev,
        [bankConfigId]: updatedRules
      }));
      
      // Save to file storage
      const buffer = database.exportTableToBuffer('processing_rules');
      await fileStorage.saveTable('processing_rules', buffer);
      
      return updatedRule;
    } catch (error) {
      console.error('Error updating processing rule order:', error);
      throw error;
    }
  };

  const getProcessingRules = (bankConfigId) => {
    return processingRules[bankConfigId] || [];
  };

  const getActiveProcessingRules = (bankConfigId) => {
    const rules = getProcessingRules(bankConfigId);
    return rules.filter(rule => rule.active !== false);
  };

  // Reconciliation functions
  const reconcileTransaction = async (id, reconciliationReference) => {
    try {
      const updatedTransaction = database.reconcileTransaction(id, reconciliationReference);
      updateStateFromDatabase();
      
      // Save to file storage
      const buffers = { transactions: database.exportTableToBuffer('transactions') };
      await fileStorage.saveAllTables(buffers);
      
      return updatedTransaction;
    } catch (error) {
      console.error('Error reconciling transaction:', error);
      throw error;
    }
  };

  const unreconcileTransaction = async (id) => {
    try {
      const updatedTransaction = database.unreconcileTransaction(id);
      updateStateFromDatabase();
      
      // Save to file storage
      const buffers = { transactions: database.exportTableToBuffer('transactions') };
      await fileStorage.saveAllTables(buffers);
      
      return updatedTransaction;
    } catch (error) {
      console.error('Error unreconciling transaction:', error);
      throw error;
    }
  };

  const getUnreconciledTransactions = (accountId = null) => {
    return database.getUnreconciledTransactions(accountId);
  };

  const getReconciledTransactions = (reconciliationReference) => {
    return database.getReconciledTransactions(reconciliationReference);
  };

  const getReconciliationSummary = (reconciliationReference) => {
    return database.getReconciliationSummary(reconciliationReference);
  };

  const getAllReconciliationReferences = () => {
    return database.getAllReconciliationReferences();
  };

  const updateTransaction = async (id, transactionData) => {
    try {
      const processedData = {
        ...transactionData,
        debitAccountId: transactionData.debitAccount || transactionData.debitAccountId,
        creditAccountId: transactionData.creditAccount || transactionData.creditAccountId
      };
      
      const updatedTransaction = database.updateTransaction(id, processedData);
      updateStateFromDatabase();
      
      const buffers = {
        transactions: database.exportTableToBuffer('transactions'),
        accounts: database.exportTableToBuffer('accounts')
      };
      await fileStorage.saveAllTables(buffers);
      
      return updatedTransaction;
    } catch (error) {
      console.error('Error updating transaction:', error);
      throw error;
    }
  };

  const getSummary = () => {
    const balances = database.calculateAccountBalances();
    return {
      totalAssets: balances.Asset || 0,
      totalLiabilities: balances.Liability || 0,
      totalIncome: balances.Income || 0,
      totalExpenses: balances.Expense || 0,
      accountsCount: accounts.length,
      transactionsCount: transactions.length,
      productsCount: tags.length,
      todosCount: todos.length
    };
  };

  const getTransactionsWithDetails = () => {
    return database.getTransactionsWithDetails();
  };

  const resetToSetup = () => {
    setIsLoaded(false);
    // Note: We don't clear the database data or localStorage here
    // This allows the user to return to setup while keeping the database active
    // So the recent databases list can show the current database as active
  };

  const resetDatabase = async () => {
    try {
      // Determine language based on current user preferences or default to 'en'
      let language = 'en';
      const userPrefs = database.tables.user_preferences;
      if (userPrefs && userPrefs.length > 0) {
        const langPref = userPrefs.find(pref => pref.key === 'language');
        if (langPref && langPref.value) {
          language = langPref.value;
        }
      }
      
      // Complete database reset to initial state (like creating new database)
      database.resetToInitialState(language);
      
      // Save all tables to files
      const tablesToSave = [
        'accounts', 'transactions', 'tags', 'todos',
        'transaction_types', 'transaction_groups', 'subcategories',
        'currencies', 'exchange_rates', 'currency_settings',
        'user_preferences', 'api_usage', 'api_settings', 'database_info',
        'payees', 'payers', 'bank_configurations'
      ];
      
      for (const tableName of tablesToSave) {
        const buffer = database.exportTableToBuffer(tableName);
        await fileStorage.saveTable(tableName, buffer);
      }
      
      // Completely reinitialize all state with fresh data
      await initializeDatabase();
      
      return true;
    } catch (error) {
      console.error('Error resetting database:', error);
      throw error;
    }
  };

  const closeDatabase = () => {
    setIsLoaded(false);
    setAccounts([]);
    setTransactions([]);
    setTags([]);
    setTodos([]);
    setCategories([]);
    setPayees([]);
    setPayers([]);
    setSubcategories([]);
    setDatabaseInfo([]);
    setDatabase(new RelationalDatabase());
    fileStorage.clearStoredDatabase();
  };

  const getRecentDatabases = () => {
    return fileStorage.getRecentDatabases();
  };

  const loadRecentDatabase = async (databaseInfo) => {
    try {
      setLoading(true);
      
      // Check if we're trying to load the same database that's currently active
      const currentDbInfo = localStorage.getItem('accounting_relational_db');
      
      if (currentDbInfo && isLoaded) {
        const current = JSON.parse(currentDbInfo);
        const isSameDatabase = (
          (databaseInfo.path && current.path === databaseInfo.path) ||
          (databaseInfo.files && current.files && 
           JSON.stringify(databaseInfo.files.sort()) === JSON.stringify(current.files.sort()))
        );
        
        // If it's the same database and we already have it loaded, just return success
        if (isSameDatabase) {
          console.log('Database is already loaded and active - no need to reload');
          // Update the timestamp in recent databases to show it was accessed
          fileStorage.addToRecentDatabases(databaseInfo);
          setLoading(false);
          return true;
        }
      }
      
      // Otherwise, proceed with normal loading
      const files = await fileStorage.loadRecentDatabase(databaseInfo);
      
      if (files && await database.loadFromFiles(files)) {
        updateStateFromDatabase();
        
        // Initialize any missing tables (like payers for older databases)
        await initializeMissingTables();
        
        // Get database language and set UI language accordingly
        const dbLanguage = database.getDatabaseLanguage();
        if (dbLanguage && dbLanguage !== language) {
          changeLanguage(dbLanguage);
        }
        
        // Load bank configurations after database is loaded
        loadBankConfigurations();
        
        setIsLoaded(true);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error loading recent database:', error);
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Todo CRUD methods
  const addTodo = async (todoData) => {
    try {
      const newTodo = database.addTodo(todoData);
      setTodos([...database.getTable('todos')]);
      
      const buffer = database.exportTableToBuffer('todos');
      await fileStorage.saveTable('todos', buffer);
      
      return newTodo;
    } catch (error) {
      console.error('Error adding todo:', error);
      throw error;
    }
  };

  const updateTodo = async (id, todoData) => {
    try {
      const updatedTodo = database.updateTodo(id, todoData);
      setTodos([...database.getTable('todos')]);
      
      const buffer = database.exportTableToBuffer('todos');
      await fileStorage.saveTable('todos', buffer);
      
      return updatedTodo;
    } catch (error) {
      console.error('Error updating todo:', error);
      throw error;
    }
  };

  const deleteTodo = async (id) => {
    try {
      const deletedTodo = database.deleteTodo(id);
      setTodos([...database.getTable('todos')]);
      
      const buffer = database.exportTableToBuffer('todos');
      await fileStorage.saveTable('todos', buffer);
      
      return deletedTodo;
    } catch (error) {
      console.error('Error deleting todo:', error);
      throw error;
    }
  };

  // Account types helper methods
  const getAccountTypes = () => {
    return database.getAccountTypes();
  };

  const getAccountTypesByType = (type) => {
    return database.getAccountTypesByType(type);
  };

  const getAccountsWithTypes = () => {
    // Use database method to get properly sorted accounts with types
    if (!database || typeof database.getAccountsWithTypes !== 'function') {
      // Fallback to context state if database is not available
      const accountTypes = database ? database.getAccountTypes() : [];
      return accounts.map(account => ({
        ...account,
        accountType: accountTypes.find(type => type.id === account.accountTypeId)
      }));
    }
    return database.getAccountsWithTypes();
  };

  const getActiveAccountsWithTypes = () => {
    // Use reactive Context state instead of direct database call
    const accountTypes = database.getAccountTypes();
    return accounts
      .filter(account => account.isActive)
      .map(account => ({
        ...account,
        accountType: accountTypes.find(type => type.id === account.accountTypeId)
      }));
  };

  // Category methods
  const getCategories = () => {
    return database.getCategories();
  };

  const getActiveCategories = () => {
    return database.getActiveCategories();
  };

  const addCategory = async (categoryData) => {
    try {
      const newCategory = database.addCategory(categoryData);
      setCategories([...database.getCategories()]);
      
      const buffer = database.exportTableToBuffer('transaction_types');
      await fileStorage.saveTable('transaction_types', buffer);
      
      return newCategory;
    } catch (error) {
      console.error('Error adding category:', error);
      throw error;
    }
  };

  const updateCategory = async (id, categoryData) => {
    try {
      const updatedCategory = database.updateCategory(id, categoryData);
      setCategories([...database.getCategories()]);
      
      const buffer = database.exportTableToBuffer('transaction_types');
      await fileStorage.saveTable('transaction_types', buffer);
      
      return updatedCategory;
    } catch (error) {
      console.error('Error updating category:', error);
      throw error;
    }
  };

  const deleteCategory = async (id) => {
    try {
      const deletedCategory = database.deleteCategory(id);
      setCategories([...database.getCategories()]);
      
      const buffer = database.exportTableToBuffer('transaction_types');
      await fileStorage.saveTable('transaction_types', buffer);
      
      return deletedCategory;
    } catch (error) {
      console.error('Error deleting category:', error);
      throw error;
    }
  };

  // Transaction Group methods
  const getTransactionGroups = () => {
    return database.getTransactionGroups();
  };

  const getActiveTransactionGroups = () => {
    return database.getActiveTransactionGroups();
  };

  const addTransactionGroup = async (groupData) => {
    try {
      const newGroup = database.addTransactionGroup(groupData);
      setTransactionGroups([...database.getTransactionGroups()]);
      
      const buffer = database.exportTableToBuffer('transaction_groups');
      await fileStorage.saveTable('transaction_groups', buffer);
      
      return newGroup;
    } catch (error) {
      console.error('Error adding transaction group:', error);
      throw error;
    }
  };

  const updateTransactionGroup = async (id, groupData) => {
    try {
      const updatedGroup = database.updateTransactionGroup(id, groupData);
      setTransactionGroups([...database.getTransactionGroups()]);
      
      const buffer = database.exportTableToBuffer('transaction_groups');
      await fileStorage.saveTable('transaction_groups', buffer);
      
      return updatedGroup;
    } catch (error) {
      console.error('Error updating transaction group:', error);
      throw error;
    }
  };

  const deleteTransactionGroup = async (id) => {
    try {
      const deletedGroup = database.deleteTransactionGroup(id);
      setTransactionGroups([...database.getTransactionGroups()]);
      
      const buffer = database.exportTableToBuffer('transaction_groups');
      await fileStorage.saveTable('transaction_groups', buffer);
      
      return deletedGroup;
    } catch (error) {
      console.error('Error deleting transaction group:', error);
      throw error;
    }
  };

  // Subcategory methods
  const getSubcategories = () => {
    return database.getSubcategories();
  };

  const getActiveSubcategories = () => {
    return database.getActiveSubcategories();
  };

  const getSubcategoriesByCategory = (categoryId) => {
    return database.getSubcategoriesByCategory(categoryId);
  };

  const getSubcategoriesWithCategories = () => {
    return database.getSubcategoriesWithCategories();
  };

  const addSubcategory = async (subcategoryData) => {
    try {
      const newSubcategory = database.addSubcategory(subcategoryData);
      setSubcategories([...database.getSubcategories()]);
      
      const buffer = database.exportTableToBuffer('subcategories');
      await fileStorage.saveTable('subcategories', buffer);
      
      return newSubcategory;
    } catch (error) {
      console.error('Error adding subcategory:', error);
      throw error;
    }
  };

  const updateSubcategory = async (id, subcategoryData) => {
    try {
      const updatedSubcategory = database.updateSubcategory(id, subcategoryData);
      setSubcategories([...database.getSubcategories()]);
      
      const buffer = database.exportTableToBuffer('subcategories');
      await fileStorage.saveTable('subcategories', buffer);
      
      return updatedSubcategory;
    } catch (error) {
      console.error('Error updating subcategory:', error);
      throw error;
    }
  };

  const deleteSubcategory = async (id) => {
    try {
      const deletedSubcategory = database.deleteSubcategory(id);
      setSubcategories([...database.getSubcategories()]);
      
      const buffer = database.exportTableToBuffer('subcategories');
      await fileStorage.saveTable('subcategories', buffer);
      
      return deletedSubcategory;
    } catch (error) {
      console.error('Error deleting subcategory:', error);
      throw error;
    }
  };

  // Database info methods
  const getDatabaseLanguage = () => {
    return database.getDatabaseLanguage();
  };

  const setDatabaseLanguage = (lang) => {
    database.setDatabaseLanguage(lang);
    changeLanguage(lang);
  };

  // Stress testing methods
  const generateStressTestTransactions = async (count = 1000) => {
    try {
      setLoading(true);
      const result = database.generateStressTestTransactions(count);
      updateStateFromDatabase();
      
      // Save to file storage
      const buffers = {
        transactions: database.exportTableToBuffer('transactions'),
        accounts: database.exportTableToBuffer('accounts')
      };
      await fileStorage.saveAllTables(buffers);
      
      return result;
    } catch (error) {
      console.error('Error generating stress test transactions:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const clearStressTestTransactions = async () => {
    try {
      setLoading(true);
      const result = database.clearStressTestTransactions();
      updateStateFromDatabase();
      
      // Save to file storage
      const buffers = {
        transactions: database.exportTableToBuffer('transactions'),
        accounts: database.exportTableToBuffer('accounts')
      };
      await fileStorage.saveAllTables(buffers);
      
      return result;
    } catch (error) {
      console.error('Error clearing stress test transactions:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Currency management methods
  const getCurrencies = () => database.getTable('currencies');
  const getActiveCurrencies = () => getCurrencies().filter(c => c.isActive);
  const getCurrenciesByType = (type) => getActiveCurrencies().filter(c => c.type === type);
  
  const addCurrency = async (currencyData) => {
    try {
      const newCurrency = database.addCurrency(currencyData);
      updateStateFromDatabase();
      
      const buffers = { currencies: database.exportTableToBuffer('currencies') };
      await fileStorage.saveAllTables(buffers);
      
      return newCurrency;
    } catch (error) {
      console.error('Error adding currency:', error);
      throw error;
    }
  };

  const updateCurrency = async (id, currencyData) => {
    try {
      const updatedCurrency = database.updateCurrency(id, currencyData);
      updateStateFromDatabase();
      
      const buffers = { currencies: database.exportTableToBuffer('currencies') };
      await fileStorage.saveAllTables(buffers);
      
      return updatedCurrency;
    } catch (error) {
      console.error('Error updating currency:', error);
      throw error;
    }
  };

  const deleteCurrency = async (id) => {
    try {
      const deletedCurrency = database.deleteCurrency(id);
      updateStateFromDatabase();
      
      const buffers = { currencies: database.exportTableToBuffer('currencies') };
      await fileStorage.saveAllTables(buffers);
      
      return deletedCurrency;
    } catch (error) {
      console.error('Error deleting currency:', error);
      throw error;
    }
  };

  // Exchange rate methods
  const getExchangeRates = () => database.getTable('exchange_rates');
  
  const addExchangeRate = async (rateData) => {
    try {
      const newRate = database.addExchangeRate(rateData);
      updateStateFromDatabase();
      
      const buffers = { exchange_rates: database.exportTableToBuffer('exchange_rates') };
      await fileStorage.saveAllTables(buffers);
      
      return newRate;
    } catch (error) {
      console.error('Error adding exchange rate:', error);
      throw error;
    }
  };

  // Currency settings methods
  const getCurrencySettings = () => database.getTable('currency_settings');
  
  const updateCurrencySettings = async (settingsData) => {
    try {
      const updatedSettings = database.updateCurrencySettings(settingsData);
      updateStateFromDatabase();
      
      const buffers = { currency_settings: database.exportTableToBuffer('currency_settings') };
      await fileStorage.saveAllTables(buffers);
      
      return updatedSettings;
    } catch (error) {
      console.error('Error updating currency settings:', error);
      throw error;
    }
  };

  // API Settings Management
  const updateApiSettings = async (newSettings) => {
    try {
      const currentSettings = database.getTable('api_settings')[0];
      let updatedSettings;
      
      if (currentSettings) {
        // Update existing settings
        updatedSettings = database.updateRecord('api_settings', currentSettings.id, newSettings);
      } else {
        // Create new settings if none exist
        updatedSettings = database.addRecord('api_settings', {
          id: 'API_001',
          provider: 'exchangerate-api',
          ...newSettings,
          settings: {
            retries: 3,
            timeout: 30000
          }
        });
      }
      
      setApiSettings(database.getTable('api_settings'));
      
      // Update the live service with new settings
      if (exchangeRateService && exchangeRateService.updateApiSettings) {
        exchangeRateService.updateApiSettings(updatedSettings);
      }
      
      const buffers = { api_settings: database.exportTableToBuffer('api_settings') };
      await fileStorage.saveAllTables(buffers);
      
      return updatedSettings;
    } catch (error) {
      console.error('Error updating API settings:', error);
      throw error;
    }
  };

  const getApiUsage = () => {
    return apiUsage[0] || {
      currentMonth: new Date().toISOString().slice(0, 7),
      requestCount: 0,
      monthlyLimit: 1500,
      lastRequest: null
    };
  };

  const saveExchangeRatesToFile = async () => {
    try {
      const buffers = { exchange_rates: database.exportTableToBuffer('exchange_rates') };
      await fileStorage.saveAllTables(buffers);
      console.log('💾 Exchange rates saved to exchange_rates.xlsx');
      return true;
    } catch (error) {
      console.error('❌ Failed to save exchange rates to file:', error);
      return false;
    }
  };

  const refreshExchangeRates = async () => {
    if (exchangeRateService && exchangeRateService.fetchLiveRates) {
      // Get current base currency for API call
      const currentSettings = currencySettings.find(s => s.userId === 'default');
      const baseCurrencyId = currentSettings ? currentSettings.baseCurrencyId : 'CUR_001';
      const baseCurrency = currencies.find(c => c.id === baseCurrencyId);
      const baseCurrencyCode = baseCurrency ? baseCurrency.code : 'EUR';
      
      console.log(`🔄 Refreshing rates with base currency: ${baseCurrencyCode}`);
      const result = await exchangeRateService.fetchLiveRates(baseCurrencyCode);
      if (result.success) {
        // Refresh the exchange rates state after successful update
        setExchangeRates([...database.getTable('exchange_rates')]);
        console.log('✅ Exchange rates state updated after API call');
        
        // Save to Excel file
        await saveExchangeRatesToFile();
      }
      return result;
    }
    throw new Error('Live exchange rate service not available');
  };

  const getRatesFreshness = () => {
    if (exchangeRateService && exchangeRateService.getRateFreshness) {
      return exchangeRateService.getRateFreshness();
    }
    return { status: 'unknown', message: 'Rate freshness unavailable' };
  };

  const getApiStatus = () => {
    if (exchangeRateService && exchangeRateService.getStatus) {
      return exchangeRateService.getStatus();
    }
    return { isConfigured: false, isScheduled: false, isUpdating: false };
  };

  // Get base currency object
  const getBaseCurrency = () => {
    const settings = currencySettings.find(s => s.userId === 'default');
    const baseCurrencyId = settings ? settings.baseCurrencyId : 'CUR_001';
    return currencies.find(c => c.id === baseCurrencyId) || currencies.find(c => c.code === 'EUR');
  };

  // Crypto rate methods
  const refreshCryptoRates = async () => {
    if (cryptoRateService && cryptoRateService.fetchCryptoRates) {
      const baseCurrency = getBaseCurrency();
      const baseCurrencyCode = baseCurrency ? baseCurrency.code : 'EUR';
      const result = await cryptoRateService.fetchCryptoRates(baseCurrencyCode);
      if (result.success) {
        setExchangeRates([...database.getTable('exchange_rates')]);
      }
      return result;
    }
    throw new Error('Crypto rate service not available');
  };

  const getCryptoStatus = () => {
    if (cryptoRateService && cryptoRateService.getStatus) {
      return cryptoRateService.getStatus();
    }
    return { isConfigured: false, isUpdating: false };
  };

  const getCryptoRateFreshness = () => {
    if (cryptoRateService && cryptoRateService.getCryptoRateFreshness) {
      return cryptoRateService.getCryptoRateFreshness();
    }
    return { status: 'unknown', message: 'Crypto rate freshness unavailable' };
  };

  // Multi-currency account methods
  const getAccountsWithCurrency = () => {
    return accounts.map(account => ({
      ...account,
      currency: currencies.find(c => c.id === account.currencyId)
    }));
  };

  const value = {
    database,
    accounts,
    transactions,
    tags,
    todos,
    categories,
    transactionGroups,
    subcategories,
    currencies,
    exchangeRates,
    currencySettings,
    userPreferences,
    exchangeRateService,
    databaseInfo,
    payees,
    payers,
    isLoaded,
    loading,
    createNewDatabase,
    loadExistingDatabase,
    addTransaction,
    addAccount,
    addProduct,
    updateTransaction,
    updateAccount,
    updateProduct,
    deleteAccount,
    deleteTransaction,
    deleteProduct,
    addPayee,
    updatePayee,
    deletePayee,
    getPayees,
    getActivePayees,
    addPayer,
    updatePayer,
    deletePayer,
    getPayers,
    getActivePayers,
    // Bank Configuration functions
    bankConfigurations,
    addBankConfiguration,
    updateBankConfiguration,
    removeBankConfiguration,
    getBankConfigurations,
    // Processing Rules functions
    processingRules,
    loadProcessingRules,
    addProcessingRule,
    updateProcessingRule,
    deleteProcessingRule,
    toggleProcessingRuleActive,
    updateProcessingRuleOrder,
    getProcessingRules,
    getActiveProcessingRules,
    // Reconciliation functions
    reconcileTransaction,
    unreconcileTransaction,
    getUnreconciledTransactions,
    getReconciledTransactions,
    getReconciliationSummary,
    getAllReconciliationReferences,
    addTodo,
    updateTodo,
    deleteTodo,
    getSummary,
    getTransactionsWithDetails,
    resetToSetup,
    resetDatabase,
    closeDatabase,
    getRecentDatabases,
    loadRecentDatabase,
    getAccountTypes,
    getAccountTypesByType,
    getAccountsWithTypes,
    getActiveAccountsWithTypes,
    getCategories,
    getActiveCategories,
    addCategory,
    updateCategory,
    deleteCategory,
    getTransactionGroups,
    getActiveTransactionGroups,
    addTransactionGroup,
    updateTransactionGroup,
    deleteTransactionGroup,
    getSubcategories,
    getActiveSubcategories,
    getSubcategoriesByCategory,
    getSubcategoriesWithCategories,
    addSubcategory,
    updateSubcategory,
    deleteSubcategory,
    getDatabaseLanguage,
    setDatabaseLanguage,
    generateStressTestTransactions,
    clearStressTestTransactions,
    getCurrencies,
    getActiveCurrencies,
    getCurrenciesByType,
    addCurrency,
    updateCurrency,
    deleteCurrency,
    getExchangeRates,
    addExchangeRate,
    getCurrencySettings,
    updateCurrencySettings,
    getAccountsWithCurrency,
    getBaseCurrency,
    // API Management
    apiSettings,
    apiUsage,
    updateApiSettings,
    getApiUsage,
    refreshExchangeRates,
    getRatesFreshness,
    getApiStatus,
    // Crypto Rate Management
    cryptoRateService,
    refreshCryptoRates,
    getCryptoStatus,
    getCryptoRateFreshness,
    // Number Format Service
    numberFormatService,
    getUserPreferences: () => database.getUserPreferences(),
    updateUserPreferences: (category, settings) => database.updateUserPreferences(category, settings),
    getCurrencyFormatPreferences: (currencyId) => database.getCurrencyFormatPreferences(currencyId),
    getAllCurrencyFormatPreferences: () => database.getAllCurrencyFormatPreferences(),
    updateCurrencyFormatPreferences: (currencyId, settings) => database.updateCurrencyFormatPreferences(currencyId, settings),
    getDateFormatPreferences: () => database.getDateFormatPreferences(),
    // Date Format Service
    dateFormatService,
    fileStorage,
    saveExchangeRatesToFile,
    // Cash Allocation methods
    addCashAllocation: async (allocationData) => {
      try {
        const newAllocation = database.addCashAllocation(allocationData);
        
        // Save to file
        const buffer = database.exportTableToBuffer('cash_allocations');
        await fileStorage.saveTable('cash_allocations', buffer);
        
        return newAllocation;
      } catch (error) {
        console.error('Error adding cash allocation:', error);
        throw error;
      }
    },
    getCashWithdrawalAllocations: (transactionId) => database.getCashWithdrawalAllocations(transactionId),
    getTotalAllocatedAmount: (transactionId) => database.getTotalAllocatedAmount(transactionId),
    getCashAllocationStatus: (transactionId) => database.getCashAllocationStatus(transactionId),
    deleteCashAllocationsByTransaction: async (transactionId) => {
      try {
        const result = database.deleteCashAllocationsByTransaction(transactionId);
        
        // Save to file if any deletions occurred
        if (result > 0) {
          const buffer = database.exportTableToBuffer('cash_allocations');
          await fileStorage.saveTable('cash_allocations', buffer);
        }
        
        return result;
      } catch (error) {
        console.error('Error deleting cash allocations:', error);
        throw error;
      }
    }
  };

  return (
    <AccountingContext.Provider value={value}>
      {children}
    </AccountingContext.Provider>
  );
};