import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAccounting } from '../contexts/AccountingContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useDate } from '../hooks/useDate';
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import CashAllocationModal from './CashAllocationModal';
import PrepaidExpenseModal from './PrepaidExpenseModal';

const TransactionList = ({ limit, selectedAccountId }) => {
  const { transactions, accounts, resetToSetup, getAccountsWithTypes, categories, subcategories, getSubcategoriesWithCategories, customers, vendors, tags, currencies, exchangeRateService, numberFormatService, getActiveCategories, getActiveTransactionGroups, database, getCashAllocationStatus, updateTransactionPrepaidSettings, transactionTemplates, addTransactionTemplate, updateTransactionTemplate, getActiveTransactionTemplates, pendingTransactionSearch, setPendingTransactionSearch, markTransactionAsTemplated } = useAccounting();
  const { t } = useLanguage();
  const { formatDate } = useDate();
  const accountsWithTypes = getAccountsWithTypes();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAccount, setFilterAccount] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState(null);
  const [filterDateTo, setFilterDateTo] = useState(null);
  const [filterAmountMin, setFilterAmountMin] = useState('');
  const [filterAmountMax, setFilterAmountMax] = useState('');
  const [isFiltersExpanded, setIsFiltersExpanded] = useState(false);
  const [isRendering, setIsRendering] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [showAllocationModal, setShowAllocationModal] = useState(false);
  const [showPrepaidModal, setShowPrepaidModal] = useState(false);
  const [showSaveTemplateModal, setShowSaveTemplateModal] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [saveMode, setSaveMode] = useState('new');
  const [selectedExistingTemplate, setSelectedExistingTemplate] = useState('');
  const [templateNameError, setTemplateNameError] = useState('');
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });

  // Sorting state
  const [sortField, setSortField] = useState('date');
  const [sortDirection, setSortDirection] = useState('desc'); // Default to newest first

  // Get user's date format from database
  const getUserDateFormat = () => {
    if (database) {
      const datePrefs = database.getUserPreferences().find(p => p.category === 'date_formatting');
      if (datePrefs && datePrefs.settings && datePrefs.settings.dateFormat) {
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
      'DD-MM-YYYY': 'dd-MM-yyyy',
      'MMM DD, YYYY': 'MMM dd, yyyy',
      'DD MMM YYYY': 'dd MMM yyyy',
      'MMMM DD, YYYY': 'MMMM dd, yyyy'
    };
    return formatMap[settingsFormat] || 'dd/MM/yyyy';
  };

  const userDateFormat = getUserDateFormat();
  const datePickerFormat = convertToDatePickerFormat(userDateFormat);

  // Set account filter when selectedAccountId prop is provided
  useEffect(() => {
    if (selectedAccountId) {
      setFilterAccount(selectedAccountId);
    }
  }, [selectedAccountId]);

  // Check for pending search from notification context
  useEffect(() => {
    if (pendingTransactionSearch) {
      setSearchTerm(pendingTransactionSearch);
      // Clear the pending search after using it
      setPendingTransactionSearch(null);
    }
  }, [pendingTransactionSearch, setPendingTransactionSearch]);

  const getAccountName = (accountId) => {
    const account = accounts.find(acc => acc.id === accountId);
    return account ? account.name : t('unknownAccount');
  };

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

  const getToAccountDisplay = (transaction) => {
    // For new linked transactions (transfers and investments), check if there's a linked transaction
    if (transaction.linkedTransactionId && (transaction.categoryId === 'CAT_003' || transaction.categoryId === 'CAT_004' || transaction.categoryId === 'CAT_005')) {
      const linkedTransaction = transactions.find(t => t.id === transaction.linkedTransactionId);
      if (linkedTransaction) {
        return getAccountName(linkedTransaction.accountId);
      }
    }
    
    // For old-style transfers or other transactions with destinationAccountId
    if (transaction.destinationAccountId) {
      return getAccountName(transaction.destinationAccountId);
    }
    
    return '-';
  };

  const getCategoryName = (categoryId) => {
    if (!categoryId) return '-';
    const category = categories.find(cat => cat.id === categoryId);
    return category ? `${category.icon} ${category.name}` : '-';
  };

  const getSubcategoryName = (subcategoryId) => {
    if (!subcategoryId) return '-';
    const subcategory = subcategories.find(sub => sub.id === subcategoryId);
    return subcategory ? subcategory.name : '-';
  };

  const getPayeePayerDisplay = (transaction) => {
    const transactionType = getTransactionType(transaction);
    
    // For investment transactions, use broker field for both payee and payer
    if ((transaction.categoryId === 'CAT_004' || transaction.categoryId === 'CAT_005') && transaction.broker) {
      return transaction.broker;
    }
    
    // Check if transaction type contains "Expenses" or "Income" (handles formatted strings like "💸 Expenses")
    if (transactionType.includes('Expenses') && transaction.payee) {
      return transaction.payee;
    } else if (transactionType.includes('Income') && transaction.payer) {
      return transaction.payer;
    }
    return '-';
  };

  const getCashAllocationCssClass = (transaction) => {
    if (!transaction.cashWithdrawal) return '';
    
    const status = getCashAllocationStatus(transaction.id);
    if (status === 'none') return 'transaction-row unallocated-cash';
    if (status === 'partial') return 'transaction-row partially-allocated-cash';
    return 'transaction-row'; // fully allocated - no special styling
  };

  const getTransactionTypeColor = (transaction) => {
    if (!transaction.categoryId) {
      return '#374151'; // Default gray color
    }
    
    const category = categories.find(cat => cat.id === transaction.categoryId);
    return category ? category.color : '#374151';
  };

  const getCategorySubcategoryName = (transaction) => {
    const categoryName = transaction.categoryId ? 
      (categories.find(cat => cat.id === transaction.categoryId)?.name || '') : '';
    const subcategoryName = transaction.subcategoryId ? 
      (subcategories.find(sub => sub.id === transaction.subcategoryId)?.name || '') : '';
    
    if (categoryName && subcategoryName) {
      return `${categoryName} - ${subcategoryName}`;
    } else if (categoryName) {
      return categoryName;
    } else if (subcategoryName) {
      return `- ${subcategoryName}`;
    }
    return '-';
  };

  const getTransactionType = (transaction) => {
    // First try to get from subcategory -> transaction group -> transaction type hierarchy
    if (transaction.subcategoryId) {
      const subcategoriesWithCategories = getSubcategoriesWithCategories();
      const subcategory = subcategoriesWithCategories.find(sub => sub.id === transaction.subcategoryId);
      
      if (subcategory && subcategory.groupId) {
        // Find transaction group and get its transaction type
        const transactionGroups = getActiveTransactionGroups();
        const group = transactionGroups.find(g => g.id === subcategory.groupId);
        
        if (group && group.transactionTypeId) {
          const activeCategories = getActiveCategories();
          const transactionType = activeCategories.find(type => type.id === group.transactionTypeId);
          if (transactionType) {
            return `${transactionType.icon} ${transactionType.name}`;
          }
        }
      }
    }
    
    // Fallback: try direct category lookup
    if (transaction.categoryId) {
      const category = categories.find(cat => cat.id === transaction.categoryId);
      if (category) {
        return `${category.icon} ${category.name}`;
      }
    }
    
    // Another fallback: if accounts are different, it might be a transfer
    const account = accounts.find(acc => acc.id === transaction.accountId);
    const destinationAccount = accounts.find(acc => acc.id === transaction.destinationAccountId);
    
    if (account && destinationAccount && transaction.accountId !== transaction.destinationAccountId) {
      return '🔄 Transfer';
    }
    
    return '❓ Unknown';
  };

  const formatAmountSingleLine = (transaction) => {
    const currency = currencies.find(c => c.id === transaction.currencyId);
    
    // Use the transactionType field to determine if amount should show as negative
    const shouldShowNegative = transaction.transactionType === 'DEBIT';
    
    if (currency && exchangeRateService) {
      // Pass negative amount directly to the formatting service
      const displayAmount = shouldShowNegative ? -(transaction.amount || 0) : (transaction.amount || 0);
      let primaryAmount = exchangeRateService.formatAmount(displayAmount, currency.id);
      
      // If not in base currency, also show converted amount in brackets
      if (transaction.currencyId !== exchangeRateService.getBaseCurrencyId()) {
        const baseCurrency = currencies.find(c => c.id === exchangeRateService.getBaseCurrencyId());
        
        try {
          // Use live exchange rate service instead of stored transaction rate
          const convertedAmount = exchangeRateService.convertToBaseCurrency(
            transaction.amount || 0, 
            transaction.currencyId,
            transaction.date
          );
          
          // Apply negative sign if needed before formatting
          const displayBaseCurrencyAmount = shouldShowNegative ? -convertedAmount : convertedAmount;
          let formattedConvertedAmount = exchangeRateService.formatAmount(
            displayBaseCurrencyAmount, 
            baseCurrency?.id
          );
          
          return `${primaryAmount} (≈ ${formattedConvertedAmount})`;
        } catch (error) {
          // Suppress console spam - only log unique currency conversion errors
          if (!window.loggedCurrencyErrors) window.loggedCurrencyErrors = new Set();
          const errorKey = error.message;
          if (!window.loggedCurrencyErrors.has(errorKey)) {
            console.warn('Currency conversion failed for transaction:', transaction.id, error.message);
            window.loggedCurrencyErrors.add(errorKey);
          }
          return primaryAmount; // Show only primary currency if conversion fails
        }
      }
      return primaryAmount;
    }
    
    // Fallback formatting
    const amount = transaction.amount || 0;
    const displayAmount = shouldShowNegative && amount > 0 ? -amount : amount;
    return displayAmount.toFixed(2);
  };

  const formatAmountWithCurrency = (transaction) => {
    const currency = currencies.find(c => c.id === transaction.currencyId);
    
    // Use the transactionType field to determine if amount should show as negative
    const shouldShowNegative = transaction.transactionType === 'DEBIT';
    
    if (currency && exchangeRateService) {
      // Pass negative amount directly to the formatting service
      const displayAmount = shouldShowNegative ? -(transaction.amount || 0) : (transaction.amount || 0);
      let primaryAmount = exchangeRateService.formatAmount(displayAmount, currency.id);
      
      // If not in base currency, also show converted amount using live exchange rate
      if (transaction.currencyId !== exchangeRateService.getBaseCurrencyId()) {
        const baseCurrency = currencies.find(c => c.id === exchangeRateService.getBaseCurrencyId());
        
        try {
          // Use live exchange rate service instead of stored transaction rate
          const convertedAmount = exchangeRateService.convertToBaseCurrency(
            transaction.amount || 0, 
            transaction.currencyId,
            transaction.date
          );
          
          // Apply negative sign if needed before formatting
          const displayBaseCurrencyAmount = shouldShowNegative ? -convertedAmount : convertedAmount;
          let formattedConvertedAmount = exchangeRateService.formatAmount(
            displayBaseCurrencyAmount, 
            baseCurrency?.id
          );
          
          return (
            <div className="amount-with-conversion" style={{ color: 'inherit' }}>
              <div className="primary-amount" style={{ color: 'inherit' }}>{primaryAmount}</div>
              <div className="converted-amount" style={{ color: 'inherit' }}>≈ {formattedConvertedAmount}</div>
            </div>
          );
        } catch (error) {
          // Suppress console spam - only log unique currency conversion errors
          if (!window.loggedCurrencyErrors) window.loggedCurrencyErrors = new Set();
          const errorKey = error.message;
          if (!window.loggedCurrencyErrors.has(errorKey)) {
            console.warn('Currency conversion failed for transaction:', transaction.id, error.message);
            window.loggedCurrencyErrors.add(errorKey);
          }
          return (
            <div className="primary-amount" style={{ color: 'inherit' }}>{primaryAmount}</div>
          ); // Show only primary currency if conversion fails
        }
      }
      return <div className="primary-amount" style={{ color: 'inherit' }}>{primaryAmount}</div>;
    }
    
    // Use numberFormatService with the transaction's currency if available
    if (numberFormatService && transaction.currencyId) {
      // Pass negative amount directly to the formatting service
      const displayAmount = shouldShowNegative ? -(transaction.amount || 0) : (transaction.amount || 0);
      let formatted = numberFormatService.formatCurrency(displayAmount, transaction.currencyId);
      
      return formatted;
    }
    
    // Fallback: basic formatting without currency symbol
    const displayAmount = shouldShowNegative ? -(transaction.amount || 0) : (transaction.amount || 0);
    return displayAmount.toFixed(2);
  };

  const filteredTransactions = useMemo(() => {
    let filtered = [...transactions];

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(transaction => {
        return transaction.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
          transaction.id.toString().includes(searchTerm) ||
          getAccountName(transaction.debitAccountId).toLowerCase().includes(searchTerm.toLowerCase()) ||
          getAccountName(transaction.creditAccountId).toLowerCase().includes(searchTerm.toLowerCase()) ||
          getCategoryName(transaction.categoryId).toLowerCase().includes(searchTerm.toLowerCase()) ||
          getSubcategoryName(transaction.subcategoryId).toLowerCase().includes(searchTerm.toLowerCase()) ||
          (transaction.reference && transaction.reference.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (transaction.notes && transaction.notes.toLowerCase().includes(searchTerm.toLowerCase()));
      });
    }

    // Apply account filter - show transactions where the selected account is the primary account
    if (filterAccount) {
      filtered = filtered.filter(transaction => 
        transaction.accountId === filterAccount
      );
    }

    // Apply date range filter
    if (filterDateFrom) {
      const fromDate = new Date(filterDateFrom);
      fromDate.setHours(0, 0, 0, 0);
      filtered = filtered.filter(transaction => 
        new Date(transaction.date) >= fromDate
      );
    }
    if (filterDateTo) {
      const toDate = new Date(filterDateTo);
      toDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter(transaction => 
        new Date(transaction.date) <= toDate
      );
    }

    // Apply amount range filter (convert to base currency for consistent comparison)
    if (filterAmountMin) {
      filtered = filtered.filter(transaction => {
        let baseAmount = parseFloat(transaction.amount) || 0;
        
        // Convert to base currency using live exchange rate service
        if (transaction.currencyId !== exchangeRateService?.getBaseCurrencyId() && exchangeRateService) {
          try {
            baseAmount = exchangeRateService.convertToBaseCurrency(
              baseAmount, 
              transaction.currencyId,
              transaction.date
            );
          } catch (error) {
            // Suppress console spam - only log unique currency conversion errors
            if (!window.loggedCurrencyErrors) window.loggedCurrencyErrors = new Set();
            const errorKey = error.message;
            if (!window.loggedCurrencyErrors.has(errorKey)) {
              console.warn('Currency conversion failed for filtering:', transaction.id, error.message);
              window.loggedCurrencyErrors.add(errorKey);
            }
            // Use original amount if conversion fails
          }
        }
        
        return baseAmount >= parseFloat(filterAmountMin);
      });
    }
    if (filterAmountMax) {
      filtered = filtered.filter(transaction => {
        let baseAmount = parseFloat(transaction.amount) || 0;
        
        // Convert to base currency using live exchange rate service
        if (transaction.currencyId !== exchangeRateService?.getBaseCurrencyId() && exchangeRateService) {
          try {
            baseAmount = exchangeRateService.convertToBaseCurrency(
              baseAmount, 
              transaction.currencyId,
              transaction.date
            );
          } catch (error) {
            // Suppress console spam - only log unique currency conversion errors
            if (!window.loggedCurrencyErrors) window.loggedCurrencyErrors = new Set();
            const errorKey = error.message;
            if (!window.loggedCurrencyErrors.has(errorKey)) {
              console.warn('Currency conversion failed for filtering:', transaction.id, error.message);
              window.loggedCurrencyErrors.add(errorKey);
            }
            // Use original amount if conversion fails
          }
        }
        
        return baseAmount <= parseFloat(filterAmountMax);
      });
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue, bValue;

      switch (sortField) {
        case 'date':
          aValue = new Date(a.date);
          bValue = new Date(b.date);
          break;
        case 'description':
          aValue = a.description.toLowerCase();
          bValue = b.description.toLowerCase();
          break;
        case 'account':
          aValue = getAccountName(a.accountId).toLowerCase();
          bValue = getAccountName(b.accountId).toLowerCase();
          break;
        case 'amount':
          aValue = parseFloat(a.amount) || 0;
          bValue = parseFloat(b.amount) || 0;
          break;
        case 'type':
          aValue = getTransactionType(a).toLowerCase();
          bValue = getTransactionType(b).toLowerCase();
          break;
        case 'reference':
          aValue = (a.reference || '').toLowerCase();
          bValue = (b.reference || '').toLowerCase();
          break;
        case 'payee':
          aValue = getPayeePayer(a).toLowerCase();
          bValue = getPayeePayer(b).toLowerCase();
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [transactions, searchTerm, filterAccount, filterDateFrom, filterDateTo, filterAmountMin, filterAmountMax, accounts, categories, subcategories, customers, vendors, tags, t, sortField, sortDirection]);

  const displayTransactions = useMemo(() => {
    return limit
      ? filteredTransactions.slice(-limit)
      : filteredTransactions;
  }, [filteredTransactions, limit]);

  // Calculate total amount of displayed transactions
  const totalAmount = useMemo(() => {
    return displayTransactions.reduce((sum, transaction) => {
      let amount = parseFloat(transaction.amount) || 0;

      // Convert to base currency if needed for consistent totaling
      if (transaction.currencyId !== exchangeRateService?.getBaseCurrencyId() && exchangeRateService) {
        try {
          amount = exchangeRateService.convertToBaseCurrency(
            amount,
            transaction.currencyId,
            transaction.date
          );
        } catch (error) {
          // Use original amount if conversion fails
        }
      }

      // Apply correct sign based on transaction type
      if (transaction.transactionType === 'DEBIT') {
        amount = -amount;
      }

      return sum + amount;
    }, 0);
  }, [displayTransactions, exchangeRateService]);

  // Handle large datasets with loading state
  useEffect(() => {
    if (transactions.length > 1000) {
      setIsRendering(true);
      const timer = setTimeout(() => {
        setIsRendering(false);
      }, 100); // Small delay to show loading state
      return () => clearTimeout(timer);
    } else {
      setIsRendering(false);
    }
  }, [transactions, filteredTransactions]);

  // Handle dropdown positioning
  const handleDropdownClick = (e, transactionId) => {
    e.stopPropagation();
    
    if (activeDropdown === transactionId) {
      setActiveDropdown(null);
      return;
    }

    const button = e.currentTarget;
    const rect = button.getBoundingClientRect();
    
    // Calculate dropdown dimensions
    const dropdownHeight = 60; // Approximate height for the dropdown
    const dropdownWidth = 220;
    
    // Check if dropdown would go off-screen if placed below
    const spaceBelow = window.innerHeight - rect.bottom;
    const shouldFlipUp = spaceBelow < dropdownHeight + 20; // Add extra margin for safety
    
    // Calculate fixed positioning for portal
    let top, left;
    
    if (shouldFlipUp) {
      top = rect.top - dropdownHeight - 4;
    } else {
      top = rect.bottom + 4;
    }
    
    // Always position from the right edge of screen with margin
    left = window.innerWidth - dropdownWidth - 20;
    
    setDropdownPosition({ top, left });
    setActiveDropdown(transactionId);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.transaction-actions') && !event.target.closest('.portal-dropdown')) {
        setActiveDropdown(null);
      }
    };

    if (activeDropdown) {
      document.addEventListener('click', handleClickOutside);
    }

    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [activeDropdown]);

  // Handle prepaid expense save
  const handlePrepaidSave = async (transactionId, prepaidData) => {
    try {
      await updateTransactionPrepaidSettings(transactionId, prepaidData);
      setShowPrepaidModal(false);
      setSelectedTransaction(null);
    } catch (error) {
      console.error('Error saving prepaid settings:', error);
      alert('Error saving prepaid settings: ' + error.message);
    }
  };

  // Template handlers
  const resetTemplateModalState = () => {
    setShowSaveTemplateModal(false);
    setTemplateName('');
    setSaveMode('new');
    setSelectedExistingTemplate('');
    setTemplateNameError('');
  };

  const handleSaveAsTemplate = (transaction) => {
    setSelectedTransaction(transaction);
    setTemplateName(transaction.description);
    setShowSaveTemplateModal(true);
    setActiveDropdown(null);
  };

  // Handle table header sorting
  const handleSort = (field) => {
    if (sortField === field) {
      // Toggle direction if same field
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // Set new field with default direction
      setSortField(field);
      setSortDirection(field === 'date' ? 'desc' : 'asc'); // Date defaults to newest first
    }
  };

  // Render sort indicator
  const getSortIndicator = (field) => {
    if (sortField !== field) return ' ↕️'; // Neutral sort indicator
    return sortDirection === 'asc' ? ' ↑' : ' ↓';
  };

  const confirmSaveTemplate = async () => {
    // Clear any previous errors
    setTemplateNameError('');
    
    let templateNameToUse = '';
    
    try {
      if (saveMode === 'new') {
        // New template mode - validate name is provided and doesn't exist
        if (!templateName.trim()) {
          setTemplateNameError('Template name is required');
          return;
        }
        
        templateNameToUse = templateName.trim();
        
        // Check if template name already exists
        const existingTemplate = getActiveTransactionTemplates().find(
          template => template.name.toLowerCase() === templateNameToUse.toLowerCase()
        );
        
        if (existingTemplate) {
          setTemplateNameError('Template name already exists');
          return;
        }
      } else {
        // Replace existing template mode - validate selection
        if (!selectedExistingTemplate) {
          setTemplateNameError('Please select a template to replace');
          return;
        }
        
        const templateToReplace = getActiveTransactionTemplates().find(
          template => template.id === selectedExistingTemplate
        );
        
        if (!templateToReplace) {
          setTemplateNameError('Selected template not found');
          return;
        }
        
        templateNameToUse = templateToReplace.name;
      }
      
      // Create template data from selected transaction
      const templateData = {
        name: templateNameToUse,
        description: selectedTransaction.description,
        amount: selectedTransaction.amount,
        currencyId: selectedTransaction.currencyId,
        subcategoryId: selectedTransaction.subcategoryId,
        payee: selectedTransaction.payee,
        payer: selectedTransaction.payer,
        broker: selectedTransaction.broker,
        reference: selectedTransaction.reference,
        notes: selectedTransaction.notes,
        productId: selectedTransaction.productId,
        categoryId: selectedTransaction.categoryId
      };

      if (saveMode === 'new') {
        await addTransactionTemplate(templateData);

        // Mark the source transaction as templated
        if (selectedTransaction?.id) {
          const result = await markTransactionAsTemplated(selectedTransaction.id);
        } else {
          console.warn('⚠️ No selectedTransaction.id found for marking as templated');
        }
      } else {
        await updateTransactionTemplate(selectedExistingTemplate, templateData);

        // Also mark as templated when updating an existing template
        if (selectedTransaction?.id) {
          const result = await markTransactionAsTemplated(selectedTransaction.id);
        } else {
          console.warn('⚠️ No selectedTransaction.id found for marking as templated (update mode)');
        }
      }
      
      resetTemplateModalState();
      setSelectedTransaction(null);
    } catch (error) {
      console.error('Error saving template:', error);
      setTemplateNameError('Error saving template');
    }
  };

  if (transactions.length === 0) {
    return (
      <div className="transaction-list empty">
        <div className="empty-state">
          <span className="empty-icon">📝</span>
          <h3>{t('noTransactionsYet')}</h3>
          <p>{t('addFirstTransaction')}</p>
        </div>
      </div>
    );
  }

  if (isRendering && transactions.length > 1000) {
    return (
      <div className="transaction-list loading">
        <div className="loading-state">
          <div className="spinner"></div>
          <h3>Loading {transactions.length.toLocaleString()} transactions...</h3>
          <p>This may take a moment for large datasets</p>
        </div>
      </div>
    );
  }

  const clearFilters = () => {
    setSearchTerm('');
    setFilterAccount('');
    setFilterDateFrom(null);
    setFilterDateTo(null);
    setFilterAmountMin('');
    setFilterAmountMax('');
  };

  return (
    <div className="transaction-list">
      {!limit && (
        <div className="transaction-filters">
          <div className="filters-content">
            <div className="filter-row-single">
              <div className="filter-group">
                <input
                  type="text"
                  placeholder="🔍 Search..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="search-input"
                />
              </div>
              
              <div className="filter-group">
                <select
                  value={filterAccount}
                  onChange={(e) => setFilterAccount(e.target.value)}
                  className="filter-select"
                >
                  <option value="">📋 All Accounts</option>
                  {accountsWithTypes.map(account => (
                    <option key={account.id} value={account.id}>
                      {account.name} ({formatAccountBalance(account)})
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="filter-group">
                <DatePicker
                  selected={filterDateFrom}
                  onChange={(date) => setFilterDateFrom(date)}
                  placeholderText={`📅 From (${userDateFormat})`}
                  className="filter-input date-picker-filter"
                  dateFormat={datePickerFormat}
                  isClearable
                  showPopperArrow={false}
                />
              </div>
              
              <div className="filter-group">
                <DatePicker
                  selected={filterDateTo}
                  onChange={(date) => setFilterDateTo(date)}
                  placeholderText={`📅 To (${userDateFormat})`}
                  className="filter-input date-picker-filter"
                  dateFormat={datePickerFormat}
                  isClearable
                  showPopperArrow={false}
                />
              </div>
              
              <div className="filter-group">
                <input
                  type="number"
                  step="0.01"
                  placeholder={`💰 Min (${(() => {
                    const baseCurrencyId = exchangeRateService?.getBaseCurrencyId();
                    const baseCurrency = currencies.find(c => c.id === baseCurrencyId);
                    return baseCurrency ? baseCurrency.code : 'EUR';
                  })()})`}
                  value={filterAmountMin}
                  onChange={(e) => setFilterAmountMin(e.target.value)}
                  className="filter-input"
                  onWheel={(e) => e.target.blur()}
                />
              </div>
              
              <div className="filter-group">
                <input
                  type="number"
                  step="0.01"
                  placeholder={`💰 Max (${(() => {
                    const baseCurrencyId = exchangeRateService?.getBaseCurrencyId();
                    const baseCurrency = currencies.find(c => c.id === baseCurrencyId);
                    return baseCurrency ? baseCurrency.code : 'EUR';
                  })()})`}
                  value={filterAmountMax}
                  onChange={(e) => setFilterAmountMax(e.target.value)}
                  className="filter-input"
                  onWheel={(e) => e.target.blur()}
                />
              </div>
              
              <div className="filter-actions">
                <button className="clear-filters-btn" onClick={clearFilters} title="Clear all filters">
                  🗑️
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {!limit && (
        <div className="transaction-count-display">
          Showing {displayTransactions.length} of {transactions.length} transactions | Total: {(() => {
            if (exchangeRateService) {
              const baseCurrencyId = exchangeRateService.getBaseCurrencyId();
              return exchangeRateService.formatAmount(totalAmount, baseCurrencyId);
            }
            // Fallback formatting
            const baseCurrency = currencies.find(c => c.id === exchangeRateService?.getBaseCurrencyId());
            return `${baseCurrency?.symbol || '€'}${totalAmount.toFixed(2)}`;
          })()}
        </div>
      )}
      
      <div className="data-table">
        <table>
          <thead>
            <tr>
              <th
                style={{ cursor: 'pointer', userSelect: 'none' }}
                onClick={() => handleSort('date')}
                title="Click to sort by date"
              >
                {t('date')}{getSortIndicator('date')}
              </th>
              <th
                style={{ cursor: 'pointer', userSelect: 'none' }}
                onClick={() => handleSort('type')}
                title="Click to sort by type"
              >
                Type{getSortIndicator('type')}
              </th>
              <th
                style={{ cursor: 'pointer', userSelect: 'none' }}
                onClick={() => handleSort('description')}
                title="Click to sort by description"
              >
                {t('description')}{getSortIndicator('description')}
              </th>
              <th
                style={{ cursor: 'pointer', userSelect: 'none' }}
                onClick={() => handleSort('account')}
                title="Click to sort by account"
              >
                Account{getSortIndicator('account')}
              </th>
              <th>From/To Account</th>
              <th
                style={{ cursor: 'pointer', userSelect: 'none' }}
                onClick={() => handleSort('payee')}
                title="Click to sort by payee/payer"
              >
                Payee/Payer{getSortIndicator('payee')}
              </th>
              <th
                style={{ cursor: 'pointer', userSelect: 'none' }}
                onClick={() => handleSort('reference')}
                title="Click to sort by reference"
              >
                Reference{getSortIndicator('reference')}
              </th>
              <th
                style={{ width: '100px', textAlign: 'right', cursor: 'pointer', userSelect: 'none' }}
                onClick={() => handleSort('amount')}
                title="Click to sort by amount"
              >
                {t('amount')}{getSortIndicator('amount')}
              </th>
              <th style={{ width: '60px', textAlign: 'center' }}>RR</th>
              <th style={{ width: '50px', textAlign: 'center' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {displayTransactions.map(transaction => (
              <tr 
                key={transaction.id}
                className={getCashAllocationCssClass(transaction)}
                style={{
                  backgroundColor: 
                    transaction.cashWithdrawal && getCashAllocationStatus(transaction.id) === 'none' 
                      ? '' // Let CSS class handle unallocated cash color
                      : transaction.reconciliationReference 
                        ? 'rgba(0, 123, 255, 0.1)' 
                        : 'transparent'
                }}
              >
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    {formatDate(transaction.date)}
                    {transaction.isPrepaid && <span className="prepaid-icon">🕐</span>}
                  </div>
                </td>
                <td>{getTransactionType(transaction)}</td>
                <td>
                  <div className="transaction-description">
                    {transaction.cashWithdrawal && <span className="atm-icon">🏧 </span>}
                    {transaction.description}
                  </div>
                </td>
                <td>{getAccountName(transaction.accountId)}</td>
                <td>{getToAccountDisplay(transaction)}</td>
                <td>{getPayeePayerDisplay(transaction)}</td>
                <td>{transaction.reference || '-'}</td>
                <td 
                  className="transaction-amount" 
                  style={{ 
                    '--transaction-color': getTransactionTypeColor(transaction),
                    color: getTransactionTypeColor(transaction),
                    fontWeight: '600'
                  }}
                >
                  <div style={{ color: 'inherit' }}>
                    {formatAmountWithCurrency(transaction)}
                  </div>
                  {transaction.isPrepaid && (
                    <div style={{ fontSize: '0.7rem', marginTop: '2px' }}>
                      <span className={`prepaid-status status-${transaction.recognitionStatus || 'pending'}`}>
                        {(() => {
                          switch(transaction.recognitionStatus) {
                            case 'pending': return 'Pending';
                            case 'active': return 'Active';
                            case 'completed': return 'Completed';
                            default: return 'Pending';
                          }
                        })()}
                      </span>
                    </div>
                  )}
                </td>
                <td style={{ textAlign: 'center', fontSize: '0.7rem', color: '#6c757d' }}>
                  {transaction.reconciliationReference || '-'}
                </td>
                <td style={{ textAlign: 'center' }}>
                  <div className="transaction-actions">
                    <button 
                      className="action-menu-btn"
                      onClick={(e) => handleDropdownClick(e, transaction.id)}
                    >
                      ⋮
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {limit && filteredTransactions.length > limit && (
        <div className="view-all-notice">
          <p>{t('showingLastTransactions')} {limit} {t('totalTransactions')} {filteredTransactions.length}</p>
        </div>
      )}

      {/* Transaction Details Modal - Rendered as Portal */}
      {showTransactionModal && selectedTransaction && createPortal(
        <div className="modal-overlay" onClick={() => setShowTransactionModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Transaction Details</h3>
              <button 
                className="modal-close-btn"
                onClick={() => setShowTransactionModal(false)}
              >
                ✕
              </button>
            </div>
            <div className="modal-body">
              <div className="transaction-detail-grid-two-column">
                {/* Left Column */}
                <div className="detail-column">
                  <div className="detail-row">
                    <span className="detail-label">Date:</span>
                    <span className="detail-value">{formatDate(selectedTransaction.date)}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Description:</span>
                    <span className="detail-value">{selectedTransaction.description}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Amount:</span>
                    <span className="detail-value">{formatAmountSingleLine(selectedTransaction)}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Transaction Type:</span>
                    <span className="detail-value">{getTransactionType(selectedTransaction)}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Category:</span>
                    <span className="detail-value">{getSubcategoryName(selectedTransaction.subcategoryId)}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Account:</span>
                    <span className="detail-value">{getAccountName(selectedTransaction.accountId)}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">From/To Account:</span>
                    <span className="detail-value">
                      {selectedTransaction.destinationAccountId ? 
                        getAccountName(selectedTransaction.destinationAccountId) : 
                        '-'
                      }
                    </span>
                  </div>
                  {(selectedTransaction.payer || selectedTransaction.payee || selectedTransaction.broker) && (
                    <div className="detail-row">
                      <span className="detail-label">{selectedTransaction.broker ? 'Broker:' : selectedTransaction.payer ? 'Payer:' : 'Payee:'}</span>
                      <span className="detail-value">{selectedTransaction.broker || selectedTransaction.payer || selectedTransaction.payee}</span>
                    </div>
                  )}
                  {selectedTransaction.productId && (
                    <div className="detail-row">
                      <span className="detail-label">Tag:</span>
                      <span className="detail-value">
                        {(() => {
                          const tag = tags.find(t => t.id === selectedTransaction.productId);
                          return tag ? tag.name : selectedTransaction.productId;
                        })()}
                      </span>
                    </div>
                  )}
                </div>
                
                {/* Right Column */}
                <div className="detail-column">
                  <div className="detail-row">
                    <span className="detail-label">Transaction ID:</span>
                    <span className="detail-value">{selectedTransaction.id}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Currency:</span>
                    <span className="detail-value">
                      {(() => {
                        const currency = currencies.find(c => c.id === selectedTransaction.currencyId);
                        return currency ? `${currency.symbol} ${currency.name} (${currency.code})` : selectedTransaction.currencyId || '-';
                      })()}
                    </span>
                  </div>
                  {selectedTransaction.currencyId !== exchangeRateService?.getBaseCurrencyId() && (
                    <div className="detail-row">
                      <span className="detail-label">Exchange Rate:</span>
                      <span className="detail-value">
                        {(() => {
                          const rate = selectedTransaction.exchangeRate || 
                                       selectedTransaction.exchange_rate ||
                                       (selectedTransaction.currencyId === exchangeRateService?.getBaseCurrencyId() ? 1.0 : null);
                          
                          if (rate === null || rate === undefined) {
                            if (selectedTransaction.currencyId && exchangeRateService) {
                              const baseCurrencyId = exchangeRateService.getBaseCurrencyId();
                              if (selectedTransaction.currencyId === baseCurrencyId) {
                                return '1.0000';
                              } else {
                                try {
                                  const currentRate = exchangeRateService.getExchangeRate(selectedTransaction.currencyId, baseCurrencyId);
                                  return currentRate ? Number(currentRate).toFixed(4) : 'N/A';
                                } catch (error) {
                                  return 'N/A';
                                }
                              }
                            }
                            return '-';
                          }
                          
                          if (typeof rate === 'object' && rate.rate !== undefined) {
                            return Number(rate.rate).toFixed(4);
                          }
                          
                          return Number(rate).toFixed(4);
                        })()}
                      </span>
                    </div>
                  )}
                  <div className="detail-row">
                    <span className="detail-label">Transaction Type:</span>
                    <span className="detail-value">
                      <span className={`badge ${selectedTransaction.transactionType === 'DEBIT' ? 'badge-debit' : 'badge-credit'}`}>
                        {selectedTransaction.transactionType === 'DEBIT' ? '⬇️ DEBIT' : '⬆️ CREDIT'}
                      </span>
                    </span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Reference:</span>
                    <span className="detail-value">{selectedTransaction.reference || '-'}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Notes:</span>
                    <span className="detail-value">{selectedTransaction.notes || '-'}</span>
                  </div>
                  {selectedTransaction.linkedTransactionId && (
                    <div className="detail-row">
                      <span className="detail-label">Linked Transaction:</span>
                      <span className="detail-value">{selectedTransaction.linkedTransactionId}</span>
                    </div>
                  )}
                  <div className="detail-row">
                    <span className="detail-label">Created:</span>
                    <span className="detail-value">{selectedTransaction.createdAt ? formatDate(selectedTransaction.createdAt) : '-'}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Portal-rendered dropdown for transaction actions */}
      {activeDropdown && createPortal(
        <div 
          className="dropdown-menu portal-dropdown"
          style={{
            position: 'fixed',
            top: `${dropdownPosition.top}px`,
            left: `${dropdownPosition.left}px`,
            width: '220px !important',
            minWidth: '220px',
            zIndex: 9999
          }}
        >
          <button 
            className="dropdown-item"
            onClick={() => {
              const transaction = transactions.find(t => t.id === activeDropdown);
              if (transaction) {
                setSelectedTransaction(transaction);
                setShowTransactionModal(true);
                setActiveDropdown(null);
              }
            }}
          >
            👁️ View details
          </button>
          {(() => {
            const transaction = transactions.find(t => t.id === activeDropdown);
            return transaction?.cashWithdrawal && (
              <button 
                className="dropdown-item"
                onClick={() => {
                  setSelectedTransaction(transaction);
                  setShowAllocationModal(true);
                  setActiveDropdown(null);
                }}
              >
                💰 Allocate
              </button>
            );
          })()}
          {(() => {
            const transaction = transactions.find(t => t.id === activeDropdown);
            // Don't show prepaid option for transfers (CAT_003)
            if (transaction?.categoryId === 'CAT_003') return null;
            
            return (
              <button 
                className="dropdown-item"
                onClick={() => {
                  setSelectedTransaction(transaction);
                  setShowPrepaidModal(true);
                  setActiveDropdown(null);
                }}
              >
                {transaction?.isPrepaid ? '🕐 Edit Prepaid' : '🕐 Mark as Prepaid'}
              </button>
            );
          })()} 
          <button 
            className="dropdown-item"
            onClick={() => {
              const transaction = transactions.find(t => t.id === activeDropdown);
              if (transaction) {
                handleSaveAsTemplate(transaction);
              }
            }}
          >
            📝 Save As Template
          </button>
        </div>,
        document.body
      )}

      {/* Cash Allocation Modal */}
      <CashAllocationModal
        isOpen={showAllocationModal}
        onClose={() => {
          setShowAllocationModal(false);
          setSelectedTransaction(null);
        }}
        transaction={selectedTransaction}
      />

      {/* Prepaid Expense Modal */}
      <PrepaidExpenseModal
        isOpen={showPrepaidModal}
        transaction={selectedTransaction}
        onClose={() => {
          setShowPrepaidModal(false);
          setSelectedTransaction(null);
        }}
        onSave={handlePrepaidSave}
      />

      {/* Save As Template Modal */}
      {showSaveTemplateModal && selectedTransaction && createPortal(
        <div className="modal-overlay" onClick={() => resetTemplateModalState()} style={{ 
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '20px'
        }}>
          <div 
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '400px',
              maxWidth: 'calc(100vw - 80px)',
              backgroundColor: 'white',
              padding: '24px',
              borderRadius: '8px',
              color: '#1a202c',
              boxSizing: 'border-box'
            }}
          >
            <h3 style={{ margin: '0 0 20px 0' }}>Save as Template</h3>
            
            {/* Save Mode Selection */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ marginBottom: '12px' }}>
                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  cursor: 'pointer',
                  marginBottom: '8px'
                }}>
                  <input
                    type="radio"
                    name="saveMode"
                    value="new"
                    checked={saveMode === 'new'}
                    onChange={(e) => {
                      setSaveMode(e.target.value);
                      setTemplateNameError('');
                    }}
                    style={{ marginRight: '8px' }}
                  />
                  Save as new template
                </label>
              </div>
              
              <div>
                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  cursor: 'pointer'
                }}>
                  <input
                    type="radio"
                    name="saveMode"
                    value="replace"
                    checked={saveMode === 'replace'}
                    onChange={(e) => {
                      setSaveMode(e.target.value);
                      setTemplateNameError('');
                    }}
                    style={{ marginRight: '8px' }}
                  />
                  Replace existing template
                </label>
              </div>
            </div>
            
            {/* Input Field - Changes based on save mode */}
            {saveMode === 'new' ? (
              <div style={{ marginBottom: '16px' }}>
                <input
                  type="text"
                  value={templateName}
                  onChange={(e) => {
                    setTemplateName(e.target.value);
                    setTemplateNameError('');
                  }}
                  placeholder="Enter template name..."
                  style={{
                    width: '100%',
                    padding: '8px',
                    borderRadius: '6px',
                    border: templateNameError ? '1px solid #dc2626' : '1px solid #d1d5db',
                    backgroundColor: 'white',
                    color: '#1a202c'
                  }}
                  autoFocus
                />
                {templateNameError && (
                  <div style={{
                    color: '#dc2626',
                    fontSize: '12px',
                    marginTop: '4px'
                  }}>
                    {templateNameError}
                  </div>
                )}
              </div>
            ) : (
              <div style={{ marginBottom: '16px' }}>
                <select
                  value={selectedExistingTemplate}
                  onChange={(e) => {
                    setSelectedExistingTemplate(e.target.value);
                    setTemplateNameError('');
                  }}
                  style={{
                    width: '100%',
                    padding: '8px',
                    borderRadius: '6px',
                    border: templateNameError ? '1px solid #dc2626' : '1px solid #d1d5db',
                    backgroundColor: 'white',
                    color: '#1a202c'
                  }}
                >
                  <option value="">Select template to replace...</option>
                  {getActiveTransactionTemplates().map(template => (
                    <option key={template.id} value={template.id}>
                      {template.name}
                    </option>
                  ))}
                </select>
                {templateNameError && (
                  <div style={{
                    color: '#dc2626',
                    fontSize: '12px',
                    marginTop: '4px'
                  }}>
                    {templateNameError}
                  </div>
                )}
              </div>
            )}
            
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button
                onClick={resetTemplateModalState}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#f3f4f6',
                  color: '#374151',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                onClick={confirmSaveTemplate}
                disabled={(
                  saveMode === 'new' && !templateName.trim()
                ) || (
                  saveMode === 'replace' && !selectedExistingTemplate
                )}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#059669',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: ((
                    saveMode === 'new' && templateName.trim()
                  ) || (
                    saveMode === 'replace' && selectedExistingTemplate
                  )) ? 'pointer' : 'not-allowed',
                  opacity: ((
                    saveMode === 'new' && templateName.trim()
                  ) || (
                    saveMode === 'replace' && selectedExistingTemplate
                  )) ? 1 : 0.5
                }}
              >
                {saveMode === 'new' ? 'Save Template' : 'Replace Template'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default TransactionList;