import React, { useState, useEffect, useRef } from 'react';
import { useAccounting } from '../contexts/AccountingContext';
import { useLanguage } from '../contexts/LanguageContext';
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

const TransactionForm = ({ onSuccess }) => {
  const { 
    accounts, 
    tags, 
    payees,
    payers,
    addTransaction, 
    resetToSetup, 
    getAccountsWithTypes,
    getActiveSubcategories,
    getSubcategoriesWithCategories,
    getActiveCategories,
    getActivePayees,
    getActivePayers,
    getActiveTransactionGroups,
    currencies,
    exchangeRateService,
    getActiveCurrencies,
    database,
    numberFormatService
  } = useAccounting();
  const { t } = useLanguage();
  const accountsWithTypes = getAccountsWithTypes();

  // Format account balance in native currency for dropdown
  const formatAccountBalance = (account) => {
    const balance = account.balance || 0;
    if (numberFormatService && account.currencyId) {
      return numberFormatService.formatCurrency(balance, account.currencyId);
    }
    // Fallback formatting
    const currency = currencies.find(c => c.id === account.currencyId);
    if (currency) {
      return `${currency.symbol}${balance.toFixed(currency.decimalPlaces || 2)}`;
    }
    return balance.toFixed(2);
  };

  // Helper function to convert Date object to YYYY-MM-DD string (timezone-safe)
  const dateToISOString = (date) => {
    if (!date) return '';
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Helper function to determine if destination account should be shown
  const shouldShowDestinationAccount = (transactionType) => {
    if (!transactionType) return false;
    return transactionType.name === 'Transfer' || 
           transactionType.name === 'Investment - SELL' || 
           transactionType.name === 'Investment - BUY' ||
           transactionType.name === 'Investissement - VENTE' || 
           transactionType.name === 'Investissement - ACHAT';
  };

  // Helper function to determine if this is an investment transaction
  const isInvestmentTransaction = (transactionType) => {
    if (!transactionType) return false;
    return transactionType.name === 'Investment - SELL' || 
           transactionType.name === 'Investment - BUY' ||
           transactionType.name === 'Investissement - VENTE' || 
           transactionType.name === 'Investissement - ACHAT';
  };
  const [formData, setFormData] = useState({
    date: dateToISOString(new Date()),
    description: '',
    amount: '',
    destinationAmount: '', // Amount for destination account (for investments)
    accountId: '', // Account field
    destinationAccountId: '', // Destination account (for transfers)
    currencyId: 'CUR_001', // Default to EUR (base currency)
    exchangeRate: 1.0,
    reference: '',
    notes: '',
    subcategoryId: '',
    payee: '',
    payer: '',
    broker: '',
    tag: ''
  });
  const [isDescriptionUserModified, setIsDescriptionUserModified] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [missingFields, setMissingFields] = useState([]);
  
  const [selectedTransactionType, setSelectedTransactionType] = useState(null);
  const [selectedTransactionGroup, setSelectedTransactionGroup] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  
  // Payee autocomplete state
  const [payeeInput, setPayeeInput] = useState('');
  const [showPayeeDropdown, setShowPayeeDropdown] = useState(false);
  const [filteredPayees, setFilteredPayees] = useState([]);
  
  // Payer autocomplete state
  const [payerInput, setPayerInput] = useState('');
  const [showPayerDropdown, setShowPayerDropdown] = useState(false);
  const [filteredPayers, setFilteredPayers] = useState([]);
  
  // Tag autocomplete state
  const [tagInput, setTagInput] = useState('');
  const [showTagDropdown, setShowTagDropdown] = useState(false);
  const [filteredTags, setFilteredTags] = useState([]);
  
  // Date input ref
  const dateInputRef = useRef(null);

  // Initialize with first transaction type and transaction group on load
  useEffect(() => {
    const activeCategories = getActiveCategories();
    if (activeCategories.length > 0 && !selectedTransactionType) {
      const firstTransactionType = activeCategories[0];
      setSelectedTransactionType(firstTransactionType);
      
      // Set default account and destination account for the initial transaction type
      const defaultAccount = accountsWithTypes.find(acc => acc.id === firstTransactionType.defaultAccountId);
      const currencyId = defaultAccount?.currencyId || 'CUR_001';
      
      // Update exchange rate based on the default account's currency
      let exchangeRate = 1.0;
      if (exchangeRateService) {
        const baseCurrencyId = exchangeRateService.getBaseCurrencyId();
        if (currencyId === baseCurrencyId) {
          exchangeRate = 1.0;
        } else {
          const rateData = exchangeRateService.getExchangeRateWithFallback(currencyId, baseCurrencyId, 1.0);
          exchangeRate = typeof rateData === 'object' && rateData.rate !== undefined 
            ? rateData.rate 
            : rateData;
        }
      }
      
      setFormData(prev => ({
        ...prev,
        accountId: firstTransactionType.defaultAccountId || '',
        destinationAccountId: firstTransactionType.destinationAccountId || '',
        currencyId: currencyId,
        exchangeRate: exchangeRate,
        description: firstTransactionType.name
      }));
      
      // Auto-select the first transaction group for the first transaction type
      const availableGroups = getActiveTransactionGroups().filter(group => 
        group.transactionTypeId === firstTransactionType.id
      );
      const firstGroup = availableGroups.length > 0 ? availableGroups[0] : null;
      setSelectedTransactionGroup(firstGroup);
    }
  }, [getActiveCategories, getActiveTransactionGroups, selectedTransactionType]);

  // Filter payees based on input
  useEffect(() => {
    if (payeeInput.length > 0) {
      const activePayees = getActivePayees();
      const filtered = activePayees.filter(payee => 
        payee.name.toLowerCase().includes(payeeInput.toLowerCase())
      );
      setFilteredPayees(filtered);
      setShowPayeeDropdown(true);
    } else {
      setFilteredPayees([]);
      setShowPayeeDropdown(false);
    }
  }, [payeeInput, getActivePayees]);

  // Filter payers based on input
  useEffect(() => {
    if (payerInput.length > 0) {
      const activePayers = getActivePayers();
      const filtered = activePayers.filter(payer => 
        payer.name.toLowerCase().includes(payerInput.toLowerCase())
      );
      setFilteredPayers(filtered);
      setShowPayerDropdown(true);
    } else {
      setFilteredPayers([]);
      setShowPayerDropdown(false);
    }
  }, [payerInput, getActivePayers]);

  // Filter tags based on input
  useEffect(() => {
    if (tagInput.length > 0) {
      const activeTags = tags.filter(tag => tag.isActive !== false); // Filter active tags
      const filtered = activeTags.filter(tag => 
        tag.name.toLowerCase().includes(tagInput.toLowerCase())
      );
      setFilteredTags(filtered);
      setShowTagDropdown(true);
    } else {
      setFilteredTags([]);
      setShowTagDropdown(false);
    }
  }, [tagInput, tags]);

  // Get user's preferred date format from settings
  const getUserDateFormat = () => {
    if (database) {
      const datePrefs = database.getUserPreferences().find(p => p.category === 'date_formatting');
      if (datePrefs && datePrefs.settings.dateFormat) {
        return datePrefs.settings.dateFormat;
      }
    }
    return 'DD/MM/YYYY'; // Default format
  };

  // Convert settings date format to react-datepicker format
  const convertToDatePickerFormat = (settingsFormat) => {
    const formatMap = {
      'DD/MM/YYYY': 'dd/MM/yyyy',
      'MM/DD/YYYY': 'MM/dd/yyyy', 
      'YYYY-MM-DD': 'yyyy-MM-dd',
      'DD.MM.YYYY': 'dd.MM.yyyy',
      'MMM DD, YYYY': 'MMM dd, yyyy'
    };
    return formatMap[settingsFormat] || 'dd/MM/yyyy';
  };

  const userDateFormat = getUserDateFormat();
  const datePickerFormat = convertToDatePickerFormat(userDateFormat);

  // Handle date picker changes
  const handleDateChange = (date) => {
    setSelectedDate(date);
    // Update formData with timezone-safe ISO date string
    if (date) {
      const dateString = dateToISOString(date);
      setFormData(prev => ({
        ...prev,
        date: dateString
      }));
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // Clear field from missing fields list when user starts typing
    if (missingFields.includes(name)) {
      setMissingFields(prev => prev.filter(field => field !== name));
    }
    
    // Track if user modifies description
    if (name === 'description') {
      setIsDescriptionUserModified(true);
    }
    
    // Handle subcategory selection and update category
    if (name === 'subcategoryId') {
      const subcategoriesWithCategories = getSubcategoriesWithCategories();
      const selectedSubcategory = subcategoriesWithCategories.find(sub => sub.id === value);
      setSelectedCategory(selectedSubcategory?.category || null);
    }
    
    // Handle account selection and update currency
    if (name === 'accountId') {
      const selectedAccount = accountsWithTypes.find(acc => acc.id === value);
      const currencyId = selectedAccount?.currencyId || 'CUR_001';
      
      // Update exchange rate based on the account's currency
      // For same currency as base, rate is 1.0
      // For other currencies, get the current market rate for that currency
      let exchangeRate = 1.0;
      if (exchangeRateService && currencyId) {
        const baseCurrencyId = exchangeRateService.getBaseCurrencyId();
        if (currencyId === baseCurrencyId) {
          exchangeRate = 1.0;
        } else {
          // Get the exchange rate for this currency pair
          const rateData = exchangeRateService.getExchangeRateWithFallback(currencyId, baseCurrencyId, 1.0);
          // Extract just the rate value if it's an object, otherwise use as-is
          exchangeRate = typeof rateData === 'object' && rateData.rate !== undefined 
            ? rateData.rate 
            : rateData;
        }
      }
      
      setFormData(prev => ({
        ...prev,
        [name]: value,
        currencyId: currencyId,
        exchangeRate: exchangeRate
      }));
      return;
    }
    
    // Handle currency changes and update exchange rate
    if (name === 'currencyId' && exchangeRateService) {
      const baseCurrencyId = exchangeRateService.getBaseCurrencyId();
      let exchangeRate = 1.0;
      if (value === baseCurrencyId) {
        exchangeRate = 1.0;
      } else {
        const rateData = exchangeRateService.getExchangeRateWithFallback(value, baseCurrencyId, 1.0);
        exchangeRate = typeof rateData === 'object' && rateData.rate !== undefined 
          ? rateData.rate 
          : rateData;
      }
      
      setFormData(prev => ({
        ...prev,
        [name]: value,
        exchangeRate: exchangeRate
      }));
      return;
    }
    
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Check for missing required fields
    const missing = [];
    if (!formData.description) missing.push('description');
    if (!formData.accountId) missing.push('accountId');
    if (!formData.amount) missing.push('amount');
    if (!formData.subcategoryId) missing.push('subcategoryId');
    // For transfers and investments, also check destination account
    if (selectedTransactionType && shouldShowDestinationAccount(selectedTransactionType) && !formData.destinationAccountId) {
      missing.push('destinationAccountId');
    }
    // For investment transactions, also check destination amount
    if (selectedTransactionType && isInvestmentTransaction(selectedTransactionType) && !formData.destinationAmount) {
      missing.push('destinationAmount');
    }
    // For Income transactions, require payer
    if (selectedTransactionType && selectedTransactionType.name === 'Income' && !formData.payer) {
      missing.push('payer');
    }
    // For Expenses transactions, require payee
    if (selectedTransactionType && selectedTransactionType.name === 'Expenses' && !formData.payee) {
      missing.push('payee');
    }
    // For Investment transactions, require broker via payee/payer fields
    if (selectedTransactionType && isInvestmentTransaction(selectedTransactionType) && 
        !formData.payee && !formData.payer) {
      if (selectedTransactionType.name === 'Investment - SELL') {
        missing.push('payer');
      } else if (selectedTransactionType.name === 'Investment - BUY') {
        missing.push('payee');
      }
    }
    
    if (missing.length > 0) {
      setMissingFields(missing);
      setError(t('fillAllFields'));
      return;
    }

    // Clear missing fields if validation passes
    setMissingFields([]);

    if (formData.accountId === formData.destinationAccountId && selectedTransactionType && shouldShowDestinationAccount(selectedTransactionType)) {
      setError(t('differentAccounts'));
      return;
    }

    // Currency validation based on transaction type
    if (selectedTransactionType && shouldShowDestinationAccount(selectedTransactionType)) {
      const sourceAccount = accountsWithTypes.find(acc => acc.id === formData.accountId);
      const destAccount = accountsWithTypes.find(acc => acc.id === formData.destinationAccountId);
      
      if (sourceAccount && destAccount) {
        if (selectedTransactionType.name === 'Transfer') {
          // For transfers: accounts must have the same currency
          if (sourceAccount.currencyId !== destAccount.currencyId) {
            setError('Transfer accounts must have the same currency');
            return;
          }
        } else if (isInvestmentTransaction(selectedTransactionType)) {
          // For investments: accounts must have different currencies
          if (sourceAccount.currencyId === destAccount.currencyId) {
            setError('Make sure from and to accounts have different currencies');
            return;
          }
        }
      }
    }

    if (parseFloat(formData.amount) <= 0) {
      setError(t('amountGreaterZero'));
      return;
    }

    // For investment transactions, also validate destination amount
    if (selectedTransactionType && isInvestmentTransaction(selectedTransactionType)) {
      if (parseFloat(formData.destinationAmount) <= 0) {
        setError('Destination amount must be greater than zero');
        return;
      }
    }

    try {
      setLoading(true);
      setError('');
      
      // Handle payer/payee - convert names to IDs or create new ones
      let payerId = null;
      let payeeId = null;
      
      if (formData.payer) {
        const existingPayer = getActivePayers().find(p => p.name === formData.payer);
        payerId = existingPayer ? existingPayer.id : null;
        // If payer doesn't exist, the database should handle creating a new one
      }
      
      if (formData.payee) {
        const existingPayee = getActivePayees().find(p => p.name === formData.payee);
        payeeId = existingPayee ? existingPayee.id : null;
        // If payee doesn't exist, the database should handle creating a new one
      }
      
      // Ensure currency is set based on selected account
      const selectedAccount = accountsWithTypes.find(acc => acc.id === formData.accountId);
      const finalCurrencyId = selectedAccount?.currencyId || formData.currencyId || 'CUR_001';
      
      // Prepare transaction data with accountId and destinationAccountId (no debit/credit mapping)
      const transactionData = {
        ...formData,
        date: formData.date || dateToISOString(new Date()),
        // Use the form's account fields directly
        accountId: formData.accountId,
        destinationAccountId: formData.destinationAccountId,
        destinationAmount: formData.destinationAmount, // Include destination amount for investments
        // Ensure currency is properly set
        currencyId: finalCurrencyId,
        // Include the selected transaction type as categoryId
        categoryId: selectedTransactionType?.id || null,
        payerId,
        payeeId,
        // For investment transactions, use broker field; otherwise use payee/payer
        broker: isInvestmentTransaction(selectedTransactionType) ? 
          (formData.payee || formData.payer) : formData.broker,
        payer: formData.payer,
        payee: formData.payee
      };
      
      // Get exchange rate for account currency to base currency
      if (exchangeRateService && transactionData.accountId) {
        const selectedAccount = accountsWithTypes.find(acc => acc.id === transactionData.accountId);
        const accountCurrency = selectedAccount?.currencyId;
        const baseCurrencyId = exchangeRateService.getBaseCurrencyId();
        
        if (accountCurrency === baseCurrencyId) {
          transactionData.exchangeRate = 1.0;
        } else if (accountCurrency) {
          const rateData = exchangeRateService.getExchangeRateWithFallback(
            accountCurrency, 
            baseCurrencyId, 
            1.0
          );
          // Extract just the rate value if it's an object, otherwise use as-is
          transactionData.exchangeRate = typeof rateData === 'object' && rateData.rate !== undefined 
            ? rateData.rate 
            : rateData;
        } else {
          transactionData.exchangeRate = 1.0;
        }
      } else {
        transactionData.exchangeRate = 1.0;
      }
      
      await addTransaction(transactionData);
      
      // Reset form data with proper currency from the current transaction type's default account
      const resetAccount = accountsWithTypes.find(acc => acc.id === selectedTransactionType?.defaultAccountId);
      const resetCurrencyId = resetAccount?.currencyId || 'CUR_001';
      let resetExchangeRate = 1.0;
      if (exchangeRateService) {
        const baseCurrencyId = exchangeRateService.getBaseCurrencyId();
        if (resetCurrencyId === baseCurrencyId) {
          resetExchangeRate = 1.0;
        } else {
          const rateData = exchangeRateService.getExchangeRateWithFallback(resetCurrencyId, baseCurrencyId, 1.0);
          resetExchangeRate = typeof rateData === 'object' && rateData.rate !== undefined 
            ? rateData.rate 
            : rateData;
        }
      }
      
      setFormData({
        date: dateToISOString(new Date()),
        description: '',
        amount: '',
        destinationAmount: '',
        accountId: '',
        destinationAccountId: '',
        currencyId: resetCurrencyId,
        exchangeRate: resetExchangeRate,
        reference: '',
        notes: '',
        subcategoryId: '',
        payee: '',
        payer: '',
        tag: ''
      });
      setSelectedCategory(null);
      setIsDescriptionUserModified(false);
      setMissingFields([]);
      setPayeeInput('');
      setShowPayeeDropdown(false);
      setPayerInput('');
      setShowPayerDropdown(false);
      setTagInput('');
      setShowTagDropdown(false);
      
      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      setError(t('errorAddingTransaction') + ' ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleTransactionTypeChange = (transactionType) => {
    setSelectedTransactionType(transactionType);
    
    // Clear validation errors and missing fields when switching transaction types
    setMissingFields([]);
    setError('');
    
    // Auto-select the first transaction group for this transaction type
    const availableGroups = getActiveTransactionGroups().filter(group => 
      group.transactionTypeId === transactionType.id
    );
    const firstGroup = availableGroups.length > 0 ? availableGroups[0] : null;
    setSelectedTransactionGroup(firstGroup);
    
    // Set default account, destination account, description and clear selected subcategory when transaction type changes
    const defaultAccount = accountsWithTypes.find(acc => acc.id === transactionType.defaultAccountId);
    const currencyId = defaultAccount?.currencyId || 'CUR_001';
    
    // Update exchange rate based on the default account's currency
    let exchangeRate = 1.0;
    if (exchangeRateService) {
      const baseCurrencyId = exchangeRateService.getBaseCurrencyId();
      if (currencyId === baseCurrencyId) {
        exchangeRate = 1.0;
      } else {
        const rateData = exchangeRateService.getExchangeRateWithFallback(currencyId, baseCurrencyId, 1.0);
        exchangeRate = typeof rateData === 'object' && rateData.rate !== undefined 
          ? rateData.rate 
          : rateData;
      }
    }
    
    setFormData(prev => ({
      ...prev,
      subcategoryId: '',
      accountId: transactionType.defaultAccountId || '',
      destinationAccountId: transactionType.destinationAccountId || '',
      currencyId: currencyId,
      exchangeRate: exchangeRate,
      description: isDescriptionUserModified ? prev.description : transactionType.name,
      payee: (transactionType.name !== 'Expenses' && transactionType.name !== 'Investment - BUY') ? '' : prev.payee, // Clear payee if not Expenses or Investment - BUY
      payer: (transactionType.name !== 'Income' && transactionType.name !== 'Investment - SELL') ? '' : prev.payer // Clear payer if not Income or Investment - SELL
    }));
    setSelectedCategory(null);
    
    // Clear payee input if not Expenses or Investment - BUY transaction type
    if (transactionType.name !== 'Expenses' && transactionType.name !== 'Investment - BUY') {
      setPayeeInput('');
      setShowPayeeDropdown(false);
    }
    
    // Clear payer input if not Income or Investment - SELL transaction type
    if (transactionType.name !== 'Income' && transactionType.name !== 'Investment - SELL') {
      setPayerInput('');
      setShowPayerDropdown(false);
    }
    
    // Only reset user modification flag if description wasn't manually changed
    if (!isDescriptionUserModified) {
      setIsDescriptionUserModified(false);
    }
  };

  // This function is no longer needed since we now filter by transaction group
  // Keeping it for backward compatibility but it will return empty array
  const getSubcategoriesByTransactionType = () => {
    return [];
  };

  const handleSubcategorySelect = (subcategoryId) => {
    const subcategoriesWithCategories = getSubcategoriesWithCategories();
    const selectedSubcategory = subcategoriesWithCategories.find(sub => sub.id === subcategoryId);
    
    // Clear field from missing fields list when user selects subcategory
    if (missingFields.includes('subcategoryId')) {
      setMissingFields(prev => prev.filter(field => field !== 'subcategoryId'));
    }
    
    setFormData(prev => ({
      ...prev,
      subcategoryId: subcategoryId,
      description: isDescriptionUserModified ? prev.description : selectedSubcategory?.name || ''
    }));
    setSelectedCategory(selectedSubcategory?.category || null);
  };

  // Filter transaction groups based on selected transaction type
  const getTransactionGroupsByType = () => {
    const allGroups = getActiveTransactionGroups();
    
    if (!selectedTransactionType) {
      return [];
    }
    
    return allGroups.filter(group => 
      group.transactionTypeId === selectedTransactionType.id
    );
  };

  const handleTransactionGroupSelect = (group) => {
    setSelectedTransactionGroup(group);
    // Clear selected subcategory when transaction group changes
    setFormData(prev => ({
      ...prev,
      subcategoryId: ''
    }));
  };

  // Update subcategories filter to also consider selected transaction group
  const getSubcategoriesByTransactionGroup = () => {
    const subcategoriesWithCategories = getSubcategoriesWithCategories();
    
    if (!selectedTransactionGroup) {
      return [];
    }
    
    return subcategoriesWithCategories.filter(subcategory => {
      return subcategory.groupId === selectedTransactionGroup.id;
    });
  };

  // Payee autocomplete handlers
  const handlePayeeInputChange = (e) => {
    const value = e.target.value;
    
    // Clear field from missing fields list when user starts typing
    if (missingFields.includes('payee')) {
      setMissingFields(prev => prev.filter(field => field !== 'payee'));
    }
    
    setPayeeInput(value);
    setFormData(prev => ({
      ...prev,
      payee: value
    }));
  };

  const handlePayeeSelect = (payee) => {
    setPayeeInput(payee.name);
    setFormData(prev => ({
      ...prev,
      payee: payee.name
    }));
    setShowPayeeDropdown(false);
  };

  const handlePayeeInputBlur = () => {
    // Delay hiding dropdown to allow for click events
    setTimeout(() => {
      setShowPayeeDropdown(false);
    }, 200);
  };

  // Payer autocomplete handlers
  const handlePayerInputChange = (e) => {
    const value = e.target.value;
    
    // Clear field from missing fields list when user starts typing
    if (missingFields.includes('payer')) {
      setMissingFields(prev => prev.filter(field => field !== 'payer'));
    }
    
    setPayerInput(value);
    setFormData(prev => ({
      ...prev,
      payer: value
    }));
  };

  const handlePayerSelect = (payer) => {
    setPayerInput(payer.name);
    setFormData(prev => ({
      ...prev,
      payer: payer.name
    }));
    setShowPayerDropdown(false);
  };

  const handlePayerInputBlur = () => {
    // Delay hiding dropdown to allow for click events
    setTimeout(() => {
      setShowPayerDropdown(false);
    }, 200);
  };

  // Tag autocomplete handlers
  const handleTagInputChange = (e) => {
    const value = e.target.value;
    setTagInput(value);
    setFormData(prev => ({
      ...prev,
      tag: value
    }));
  };

  const handleTagSelect = (tag) => {
    setTagInput(tag.name);
    setFormData(prev => ({
      ...prev,
      tag: tag.name
    }));
    setShowTagDropdown(false);
  };

  const handleTagInputBlur = () => {
    // Delay hiding dropdown to allow for click events
    setTimeout(() => {
      setShowTagDropdown(false);
    }, 200);
  };

  return (
    <div className="transaction-form">
      <div className="transaction-panel">
        {/* Date Field */}
        <div className="transaction-date-field">
          <DatePicker
            selected={selectedDate}
            onChange={handleDateChange}
            dateFormat={datePickerFormat}
            className="date-picker-input"
            placeholderText={`Select date (${userDateFormat}) *`}
            showPopperArrow={false}
            popperClassName="date-picker-popper"
            required
          />
        </div>

        {/* Transaction Type Selection Cards */}
      <div className="transaction-type-cards">
        {getActiveCategories().map(transactionType => (
          <div 
            key={transactionType.id}
            className={`transaction-type-card ${selectedTransactionType?.id === transactionType.id ? 'selected' : ''}`}
            onClick={() => handleTransactionTypeChange(transactionType)}
            style={{ 
              background: selectedTransactionType?.id === transactionType.id 
                ? `linear-gradient(135deg, ${transactionType.color}20, ${transactionType.color}40)` 
                : undefined 
            }}
          >
            <span className="card-icon">{transactionType.icon}</span>
            <span className="card-label">{transactionType.name}</span>
          </div>
        ))}
      </div>

      {/* Transaction Groups Selection Cards */}
      {selectedTransactionType && (
        <div className="transaction-groups-cards">
          {getTransactionGroupsByType().map(group => (
            <div
              key={group.id}
              className={`transaction-group-card ${selectedTransactionGroup?.id === group.id ? 'selected' : ''}`}
              onClick={() => handleTransactionGroupSelect(group)}
              style={{
                background: selectedTransactionGroup?.id === group.id && selectedTransactionType
                  ? `linear-gradient(135deg, ${selectedTransactionType.color}20, ${selectedTransactionType.color}40)`
                  : undefined,
                borderColor: selectedTransactionGroup?.id === group.id && selectedTransactionType
                  ? selectedTransactionType.color
                  : undefined
              }}
            >
              <span className="group-name">{group.name}</span>
            </div>
          ))}
        </div>
      )}

      {/* Subcategory Selection Cards */}
      <div className="subcategory-cards">
        {getSubcategoriesByTransactionGroup().map(subcategory => (
          <div
            key={subcategory.id}
            className={`subcategory-card ${formData.subcategoryId === subcategory.id ? 'selected' : ''} ${missingFields.includes('subcategoryId') ? 'field-error' : ''}`}
            onClick={() => handleSubcategorySelect(subcategory.id)}
            style={{
              background: formData.subcategoryId === subcategory.id && selectedTransactionType
                ? `linear-gradient(135deg, ${selectedTransactionType.color}20, ${selectedTransactionType.color}40)`
                : undefined,
              borderColor: formData.subcategoryId === subcategory.id && selectedTransactionType
                ? selectedTransactionType.color
                : missingFields.includes('subcategoryId') 
                ? '#ef4444' 
                : undefined
            }}
          >
            <span className="subcategory-name">{subcategory.name}</span>
          </div>
        ))}
      </div>

      {/* Description and Payee Fields Side by Side */}
      {selectedTransactionType && (
        <div className="transaction-quick-entry">
          <div className="description-payee-row">
            <div className="description-field">
              <input
                type="text"
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder={`${t('enterDescription')} *`}
                className={`${!isDescriptionUserModified && formData.description ? 'default-description' : ''} ${missingFields.includes('description') ? 'field-error' : ''}`.trim()}
              />
            </div>
            {(selectedTransactionType.name === 'Expenses' || selectedTransactionType.name === 'Investment - BUY') && (
              <div className="payee-field">
                <div className="payee-autocomplete-container">
                  <input
                    type="text"
                    id="payee"
                    name="payee"
                    value={payeeInput}
                    onChange={handlePayeeInputChange}
                    onBlur={handlePayeeInputBlur}
                    onFocus={() => payeeInput.length > 0 && setShowPayeeDropdown(true)}
                    placeholder={selectedTransactionType.name === 'Investment - BUY' ? "🏢 Start typing broker/exchange name... *" : "👤 Start typing payee name... *"}
                    className={missingFields.includes('payee') ? 'field-error' : ''}
                  />
                  
                  {showPayeeDropdown && filteredPayees.length > 0 && (
                    <div className="payee-dropdown">
                      {filteredPayees.map(payee => (
                        <div
                          key={payee.id}
                          className="payee-dropdown-item"
                          onClick={() => handlePayeeSelect(payee)}
                        >
                          {payee.name}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
            {(selectedTransactionType.name === 'Income' || selectedTransactionType.name === 'Investment - SELL') && (
              <div className="payee-field">
                <div className="payee-autocomplete-container">
                  <input
                    type="text"
                    id="payer"
                    name="payer"
                    value={payerInput}
                    onChange={handlePayerInputChange}
                    onBlur={handlePayerInputBlur}
                    onFocus={() => payerInput.length > 0 && setShowPayerDropdown(true)}
                    placeholder={selectedTransactionType.name === 'Investment - SELL' ? "🏢 Start typing broker/exchange name... *" : "💼 Start typing payer name... *"}
                    className={missingFields.includes('payer') ? 'field-error' : ''}
                  />
                  
                  {showPayerDropdown && filteredPayers.length > 0 && (
                    <div className="payee-dropdown">
                      {filteredPayers.map(payer => (
                        <div
                          key={payer.id}
                          className="payee-dropdown-item"
                          onClick={() => handlePayerSelect(payer)}
                        >
                          {payer.name}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
          <div className="quick-entry-row">
            <div className="quick-entry-account">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                {selectedTransactionType && shouldShowDestinationAccount(selectedTransactionType) && (
                  <span style={{ fontSize: '1.5rem' }}>
                    ⬇️
                  </span>
                )}
                <select
                  name="accountId" 
                  value={formData.accountId || selectedTransactionType.defaultAccountId || ''}
                  onChange={handleChange}
                  className={missingFields.includes('accountId') ? 'field-error' : ''}
                  style={{ flex: 1 }}
                >
                  <option value="">Select Account</option>
                  {accountsWithTypes.map(account => (
                    <option key={account.id} value={account.id}>
                      {account.name} ({formatAccountBalance(account)})
                    </option>
                  ))}
                </select>
              </div>
              {selectedTransactionType && shouldShowDestinationAccount(selectedTransactionType) && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontSize: '1.5rem' }}>
                    ➡️
                  </span>
                  <select
                    name="destinationAccountId"
                    value={formData.destinationAccountId || selectedTransactionType.destinationAccountId || ''}
                    onChange={handleChange}
                    className={missingFields.includes('destinationAccountId') ? 'field-error' : ''}
                    style={{ flex: 1 }}
                  >
                    <option value="">Select Destination Account</option>
                    {accountsWithTypes.map(account => (
                      <option key={account.id} value={account.id}>
                        {account.name} ({formatAccountBalance(account)})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
            <div className="quick-entry-amount">
              <div className="amount-input-container">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  name="amount"
                  value={formData.amount}
                  onChange={handleChange}
                  placeholder="0.00"
                  className={missingFields.includes('amount') ? 'field-error' : ''}
                />
                <span className="currency-symbol">
                  {(() => {
                    const selectedAccountId = formData.accountId || selectedTransactionType.defaultAccountId;
                    const selectedAccount = accountsWithTypes.find(acc => acc.id === selectedAccountId);
                    const currency = selectedAccount ? getActiveCurrencies().find(c => c.id === selectedAccount.currencyId) : null;
                    return currency ? currency.symbol : '';
                  })()}
                </span>
              </div>
              {/* Destination Amount for Investment Transactions - under default amount */}
              {selectedTransactionType && isInvestmentTransaction(selectedTransactionType) && (
                <div className="amount-input-container" style={{ marginTop: '0.5rem' }}>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    name="destinationAmount"
                    value={formData.destinationAmount}
                    onChange={handleChange}
                    placeholder="0.00"
                    className={missingFields.includes('destinationAmount') ? 'field-error' : ''}
                  />
                  <span className="currency-symbol">
                    {(() => {
                      const destAccount = accountsWithTypes.find(acc => acc.id === formData.destinationAccountId);
                      const currency = destAccount ? getActiveCurrencies().find(c => c.id === destAccount.currencyId) : null;
                      return currency ? currency.symbol : '';
                    })()}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}


      {/* Tag and Reference Side by Side Section */}
      {selectedTransactionType && (
        <div className="transaction-quick-entry">
          <div className="quick-entry-row">
            <div className="tag-reference-field">
              <div className="tag-autocomplete-container">
                <input
                  type="text"
                  id="tag"
                  name="tag"
                  value={tagInput}
                  onChange={handleTagInputChange}
                  onBlur={handleTagInputBlur}
                  onFocus={() => tagInput.length > 0 && setShowTagDropdown(true)}
                  placeholder="🏷️ Start typing tag name..."
                />
                
                {showTagDropdown && filteredTags.length > 0 && (
                  <div className="tag-dropdown">
                    {filteredTags.map(tag => (
                      <div
                        key={tag.id}
                        className="tag-option"
                        onClick={() => handleTagSelect(tag)}
                      >
                        {tag.name}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            
            <div className="tag-reference-field">
              <input
                type="text"
                id="reference"
                name="reference"
                value={formData.reference}
                onChange={handleChange}
                placeholder="📄 Enter reference (optional)..."
              />
            </div>
          </div>
        </div>
      )}

      {/* Notes Field Section */}
      {selectedTransactionType && (
        <div className="transaction-quick-entry">
          <div className="quick-entry-description">
            <textarea
              id="notes"
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              placeholder="📝 Add notes (optional)..."
              rows="3"
            />
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="error-message" style={{ 
          color: 'red', 
          backgroundColor: '#ffebee', 
          border: '1px solid #ffcdd2', 
          padding: '10px', 
          borderRadius: '4px', 
          margin: '10px 0' 
        }}>
          {error}
        </div>
      )}

      {/* Add Transaction Button */}
      {selectedTransactionType && (
        <div className="transaction-submit-section">
          <button 
            type="submit" 
            className="add-transaction-btn"
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? 'Adding Transaction...' : 'Add Transaction'}
          </button>
        </div>
      )}

      </div>
    </div>
  );
};

export default TransactionForm;