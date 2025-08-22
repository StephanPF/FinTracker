import React, { createContext, useContext, useState, useEffect } from 'react';
import RelationalFileStorage from '../utils/relationalFileStorage';
import RelationalDatabase from '../utils/relationalDatabase';
import ExchangeRateService from '../utils/exchangeRateService';
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
  const [isLoaded, setIsLoaded] = useState(false);
  const [accounts, setAccounts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [tags, setTags] = useState([]);
  const [products, setProducts] = useState([]);
  const [todos, setTodos] = useState([]);
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [currencies, setCurrencies] = useState([]);
  const [exchangeRates, setExchangeRates] = useState([]);
  const [currencySettings, setCurrencySettings] = useState([]);
  const [databaseInfo, setDatabaseInfo] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    initializeDatabase();
  }, []);

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

  const updateStateFromDatabase = () => {
    setAccounts(database.getTable('accounts'));
    setTransactions(database.getTable('transactions'));
    setCustomers(database.getTable('customers'));
    setVendors(database.getTable('vendors'));
    setTags(database.getTable('tags'));
    setProducts(database.getTable('products'));
    setTodos(database.getTable('todos'));
    setCategories(database.getTable('categories'));
    setSubcategories(database.getTable('subcategories'));
    setCurrencies(database.getTable('currencies'));
    setExchangeRates(database.getTable('exchange_rates'));
    setCurrencySettings(database.getTable('currency_settings'));
    setDatabaseInfo(database.getTable('database_info'));
    
    // Initialize or update exchange rate service
    setExchangeRateService(new ExchangeRateService(database));
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
        
        // Get database language and set UI language accordingly
        const dbLanguage = database.getDatabaseLanguage();
        if (dbLanguage && dbLanguage !== language) {
          changeLanguage(dbLanguage);
        }
        
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
      const processedData = {
        ...transactionData,
        debitAccountId: transactionData.debitAccount,
        creditAccountId: transactionData.creditAccount
      };
      
      const newTransaction = database.addTransaction(processedData);
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

  const addCustomer = async (customerData) => {
    try {
      const newCustomer = database.addCustomer(customerData);
      setCustomers(database.getTable('customers'));
      
      const buffer = database.exportTableToBuffer('customers');
      await fileStorage.saveTable('customers', buffer);
      
      return newCustomer;
    } catch (error) {
      console.error('Error adding customer:', error);
      throw error;
    }
  };

  const addVendor = async (vendorData) => {
    try {
      const newVendor = database.addVendor(vendorData);
      setVendors(database.getTable('vendors'));
      
      const buffer = database.exportTableToBuffer('vendors');
      await fileStorage.saveTable('vendors', buffer);
      
      return newVendor;
    } catch (error) {
      console.error('Error adding vendor:', error);
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

  const updateCustomer = async (id, customerData) => {
    try {
      const updatedCustomer = database.updateCustomer(id, customerData);
      setCustomers(database.getTable('customers'));
      
      const buffer = database.exportTableToBuffer('customers');
      await fileStorage.saveTable('customers', buffer);
      
      return updatedCustomer;
    } catch (error) {
      console.error('Error updating customer:', error);
      throw error;
    }
  };

  const updateVendor = async (id, vendorData) => {
    try {
      const updatedVendor = database.updateVendor(id, vendorData);
      setVendors(database.getTable('vendors'));
      
      const buffer = database.exportTableToBuffer('vendors');
      await fileStorage.saveTable('vendors', buffer);
      
      return updatedVendor;
    } catch (error) {
      console.error('Error updating vendor:', error);
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

  const deleteCustomer = async (id) => {
    try {
      const deletedCustomer = database.deleteCustomer(id);
      setCustomers([...database.getTable('customers')]); // Create new array to force re-render
      
      const buffer = database.exportTableToBuffer('customers');
      await fileStorage.saveTable('customers', buffer);
      
      return deletedCustomer;
    } catch (error) {
      console.error('Error deleting customer:', error);
      throw error;
    }
  };

  const deleteVendor = async (id) => {
    try {
      const deletedVendor = database.deleteVendor(id);
      setVendors([...database.getTable('vendors')]); // Create new array to force re-render
      
      const buffer = database.exportTableToBuffer('vendors');
      await fileStorage.saveTable('vendors', buffer);
      
      return deletedVendor;
    } catch (error) {
      console.error('Error deleting vendor:', error);
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
      customersCount: customers.length,
      vendorsCount: vendors.length,
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

  const closeDatabase = () => {
    setIsLoaded(false);
    setAccounts([]);
    setTransactions([]);
    setCustomers([]);
    setVendors([]);
    setTags([]);
    setTodos([]);
    setCategories([]);
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
        
        // Get database language and set UI language accordingly
        const dbLanguage = database.getDatabaseLanguage();
        if (dbLanguage && dbLanguage !== language) {
          changeLanguage(dbLanguage);
        }
        
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
    return database.getAccountsWithTypes();
  };

  const getActiveAccountsWithTypes = () => {
    return database.getActiveAccountsWithTypes();
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
      setCategories([...database.getTable('categories')]);
      
      const buffer = database.exportTableToBuffer('categories');
      await fileStorage.saveTable('categories', buffer);
      
      return newCategory;
    } catch (error) {
      console.error('Error adding category:', error);
      throw error;
    }
  };

  const updateCategory = async (id, categoryData) => {
    try {
      const updatedCategory = database.updateCategory(id, categoryData);
      setCategories([...database.getTable('categories')]);
      
      const buffer = database.exportTableToBuffer('categories');
      await fileStorage.saveTable('categories', buffer);
      
      return updatedCategory;
    } catch (error) {
      console.error('Error updating category:', error);
      throw error;
    }
  };

  const deleteCategory = async (id) => {
    try {
      const deletedCategory = database.deleteCategory(id);
      setCategories([...database.getTable('categories')]);
      
      const buffer = database.exportTableToBuffer('categories');
      await fileStorage.saveTable('categories', buffer);
      
      return deletedCategory;
    } catch (error) {
      console.error('Error deleting category:', error);
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
      setSubcategories([...database.getTable('subcategories')]);
      
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
      setSubcategories([...database.getTable('subcategories')]);
      
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
      setSubcategories([...database.getTable('subcategories')]);
      
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
    customers,
    vendors,
    tags,
    todos,
    categories,
    subcategories,
    currencies,
    exchangeRates,
    currencySettings,
    exchangeRateService,
    databaseInfo,
    isLoaded,
    loading,
    createNewDatabase,
    loadExistingDatabase,
    addTransaction,
    addAccount,
    addCustomer,
    addVendor,
    addProduct,
    updateTransaction,
    updateAccount,
    updateCustomer,
    updateVendor,
    updateProduct,
    deleteAccount,
    deleteCustomer,
    deleteVendor,
    deleteTransaction,
    deleteProduct,
    addTodo,
    updateTodo,
    deleteTodo,
    getSummary,
    getTransactionsWithDetails,
    resetToSetup,
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
    fileStorage
  };

  return (
    <AccountingContext.Provider value={value}>
      {children}
    </AccountingContext.Provider>
  );
};