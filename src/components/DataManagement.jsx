import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAccounting } from '../contexts/AccountingContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useDate } from '../hooks/useDate';
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import CurrencyManager from './CurrencyManager';
import Autocomplete from './Autocomplete';

const DataManagement = () => {
  const { 
    accounts, 
    transactions, 
    tags,
    payees,
    payers,
    addAccount,
    addProduct,
    addTransaction,
    updateAccount,
    updateProduct,
    updateTransaction,
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
    resetToSetup,
    getAccountsWithTypes,
    getAccountTypes,
    categories,
    subcategories,
    transactionGroups,
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
    getTransactionGroups,
    getActiveTransactionGroups,
    addTransactionGroup,
    updateTransactionGroup,
    deleteTransactionGroup,
    currencies,
    exchangeRates,
    exchangeRateService,
    getCurrencies,
    getActiveCurrencies,
    addCurrency,
    updateCurrency,
    deleteCurrency,
    addExchangeRate,
    numberFormatService,
    database
  } = useAccounting();
  const { t } = useLanguage();
  const { formatDate, formatForInput } = useDate();
  const accountsWithTypes = getAccountsWithTypes();
  const accountTypes = getAccountTypes();

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

  // Helper function to convert Date object to YYYY-MM-DD string (timezone-safe)
  const dateToISOString = (date) => {
    if (!date) return '';
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Helper functions for conditional field visibility
  const shouldShowDestinationAccount = (transactionGroupId) => {
    if (!transactionGroupId) return false;
    const transactionGroups = getActiveTransactionGroups();
    const group = transactionGroups.find(g => g.id === transactionGroupId);
    if (!group) return false;
    
    const activeCategories = getActiveCategories();
    const transactionType = activeCategories.find(type => type.id === group.transactionTypeId);
    if (!transactionType) return false;
    
    return transactionType.name === 'Transfer' || 
           transactionType.name === 'Investment - SELL' || 
           transactionType.name === 'Investment - BUY' ||
           transactionType.name === 'Investissement - VENTE' || 
           transactionType.name === 'Investissement - ACHAT';
  };

  const shouldShowPayee = (transactionGroupId) => {
    if (!transactionGroupId) return false;
    const transactionGroups = getActiveTransactionGroups();
    const group = transactionGroups.find(g => g.id === transactionGroupId);
    if (!group) return false;
    
    const activeCategories = getActiveCategories();
    const transactionType = activeCategories.find(type => type.id === group.transactionTypeId);
    if (!transactionType) return false;
    
    return transactionType.name === 'Expenses' || transactionType.name === 'Investment - BUY';
  };

  const shouldShowPayer = (transactionGroupId) => {
    if (!transactionGroupId) return false;
    const transactionGroups = getActiveTransactionGroups();
    const group = transactionGroups.find(g => g.id === transactionGroupId);
    if (!group) return false;
    
    const activeCategories = getActiveCategories();
    const transactionType = activeCategories.find(type => type.id === group.transactionTypeId);
    if (!transactionType) return false;
    
    return transactionType.name === 'Income' || transactionType.name === 'Investment - SELL';
  };

  const isInvestmentTransaction = (transactionGroupId) => {
    if (!transactionGroupId) return false;
    const transactionGroups = getActiveTransactionGroups();
    const group = transactionGroups.find(g => g.id === transactionGroupId);
    if (!group) return false;
    
    const activeCategories = getActiveCategories();
    const transactionType = activeCategories.find(type => type.id === group.transactionTypeId);
    if (!transactionType) return false;
    
    return transactionType.name === 'Investment - SELL' || 
           transactionType.name === 'Investment - BUY' ||
           transactionType.name === 'Investissement - VENTE' || 
           transactionType.name === 'Investissement - ACHAT';
  };

  // Helper function to get transaction groups filtered by selected transaction type
  const getFilteredTransactionGroups = (selectedCategoryId) => {
    if (!selectedCategoryId) return getActiveTransactionGroups();
    
    const transactionGroups = getActiveTransactionGroups();
    return transactionGroups.filter(group => group.transactionTypeId === selectedCategoryId);
  };

  // Helper function to get subcategories filtered by selected transaction group
  const getFilteredSubcategories = (selectedTransactionGroupId) => {
    if (!selectedTransactionGroupId) return subcategories;
    
    const subcategoriesWithCategories = getSubcategoriesWithCategories();
    return subcategoriesWithCategories.filter(subcategory => subcategory.groupId === selectedTransactionGroupId);
  };
  
  const [activeTab, setActiveTab] = useState('accounts');
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({});
  const [editingId, setEditingId] = useState(null);
  const [showAccountTypeTooltip, setShowAccountTypeTooltip] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(false);
  const [showAccountTypesExplanation, setShowAccountTypesExplanation] = useState(false);
  const [openDropdownId, setOpenDropdownId] = useState(null);
  const [dropdownUp, setDropdownUp] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
  
  // Drag & Drop state
  const [draggedId, setDraggedId] = useState(null);
  const [dragOverId, setDragOverId] = useState(null);
  const [dragLeaveTimeout, setDragLeaveTimeout] = useState(null);
  const [reorderingAccounts, setReorderingAccounts] = useState(false);
  const [reorderingCategories, setReorderingCategories] = useState(false);
  const [reorderingSubcategories, setReorderingSubcategories] = useState(false);
  const [reorderingTransactionGroups, setReorderingTransactionGroups] = useState(false);

  const resetForm = () => {
    // Initialize formData with default values for transactions
    if (activeTab === 'transactions' && !editingId) {
      setFormData({ date: dateToISOString(new Date()) });
    } else {
      setFormData({});
    }
    setShowForm(false);
    setEditingId(null);
    setShowAccountTypeTooltip(false);
  };

  const filterData = (data, searchTerm) => {
    if (!searchTerm.trim()) {
      return data;
    }

    const term = searchTerm.toLowerCase().trim();
    return data.filter(item => {
      // Search in all string values of the object
      return Object.values(item).some(value => {
        if (value === null || value === undefined) return false;
        
        // Handle nested objects (like accountType, category)
        if (typeof value === 'object') {
          return Object.values(value).some(nestedValue => 
            nestedValue !== null && 
            nestedValue !== undefined && 
            nestedValue.toString().toLowerCase().includes(term)
          );
        }
        
        return value.toString().toLowerCase().includes(term);
      });
    });
  };

  const handleEdit = (record) => {
    // Map transaction data to form field names
    if (activeTab === 'transactions') {
      // Get transaction group from subcategory if available
      let transactionGroupId = record.transactionGroupId;
      if (!transactionGroupId && record.subcategoryId) {
        const subcategoriesWithCategories = getSubcategoriesWithCategories();
        const subcategory = subcategoriesWithCategories.find(sub => sub.id === record.subcategoryId);
        if (subcategory && subcategory.groupId) {
          transactionGroupId = subcategory.groupId;
        }
      }

      const mappedData = {
        ...record,
        // Map the database fields to form field names
        transactionGroupId: transactionGroupId,
        payerId: record.payerId,
        payeeId: record.payeeId,
        accountId: record.accountId,
        destinationAccountId: record.destinationAccountId,
        destinationAmount: record.destinationAmount,
        categoryId: record.categoryId,
        subcategoryId: record.subcategoryId,
        productId: record.productId,
        reference: record.reference,
        reconciliationReference: record.reconciliationReference,
        notes: record.notes,
        description: record.description,
        amount: record.amount,
        date: record.date
      };
      setFormData(mappedData);
    } else {
      setFormData(record);
    }
    setEditingId(record.id);
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        // Update existing record
        switch (activeTab) {
          case 'accounts':
            await updateAccount(editingId, formData);
            break;
          case 'transactions':
            await updateTransaction(editingId, formData);
            break;
          case 'products':
            await updateProduct(editingId, formData);
            break;
          case 'payees':
            await updatePayee(editingId, formData);
            break;
          case 'payers':
            await updatePayer(editingId, formData);
            break;
          case 'transaction_types':
            await updateCategory(editingId, formData);
            break;
          case 'subcategories':
            await updateSubcategory(editingId, formData);
            break;
          case 'transaction_groups':
            await updateTransactionGroup(editingId, formData);
            break;
          case 'currencies':
            await updateCurrency(editingId, formData);
            break;
          default:
            break;
        }
      } else {
        // Add new record
        switch (activeTab) {
          case 'accounts':
            await addAccount(formData);
            break;
          case 'transactions':
            await addTransaction(formData);
            break;
          case 'products':
            await addProduct(formData);
            break;
          case 'payees':
            await addPayee(formData);
            break;
          case 'payers':
            await addPayer(formData);
            break;
          case 'transaction_types':
            await addCategory(formData);
            break;
          case 'subcategories':
            await addSubcategory(formData);
            break;
          case 'transaction_groups':
            await addTransactionGroup(formData);
            break;
          case 'currencies':
            await addCurrency(formData);
            break;
          default:
            break;
        }
      }
      resetForm();
    } catch (error) {
      console.error('Error saving data:', error);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleToggleOverview = async (accountId, currentValue) => {
    // Optimistic update: update UI immediately
    setRefreshKey(prev => prev + 1);
    
    try {
      // Update database in background
      await updateAccount(accountId, { includeInOverview: !currentValue });
    } catch (error) {
      console.error('Failed to toggle Overview inclusion:', error);
      alert('Failed to update account. Please try again.');
      // Revert the optimistic update on error
      setRefreshKey(prev => prev + 1);
    }
  };

  const handleDropdownClick = (e, rowId) => {
    e.stopPropagation();
    
    if (openDropdownId === rowId) {
      setOpenDropdownId(null);
      return;
    }
    
    const button = e.target;
    const rect = button.getBoundingClientRect();
    const dropdownHeight = 80; // Approximate height for 2 items
    
    
    // Check if dropdown would go off-screen if placed below
    const spaceBelow = window.innerHeight - rect.bottom;
    const shouldFlipUp = spaceBelow < dropdownHeight + 20; // Add extra margin for safety
    
    
    // Calculate fixed positioning for portal
    const dropdownWidth = 90;
    let top, left;
    
    if (shouldFlipUp) {
      top = rect.top - dropdownHeight - 4;
      left = rect.right - dropdownWidth;
    } else {
      top = rect.bottom + 4;
      left = rect.right - dropdownWidth;
    }
    
    // Ensure dropdown stays within viewport
    if (left < 0) {
      left = rect.left;
    }
    if (left + dropdownWidth > window.innerWidth) {
      left = window.innerWidth - dropdownWidth - 10;
    }
    
    setDropdownUp(shouldFlipUp);
    setDropdownPosition({ top, left });
    setOpenDropdownId(rowId);
  };

  const handleDelete = async (record) => {
    // Prevent deletion of default account (ACC001)
    if (activeTab === 'accounts' && record.id === 'ACC001') {
      alert('Cannot delete the default account. This account is required to ensure the system always has at least one account.');
      return;
    }

    // Get confirmation message based on record type
    let confirmMessage;
    switch (activeTab) {
      case 'accounts':
        confirmMessage = t('deleteAccountConfirm');
        break;
      case 'transactions':
        confirmMessage = t('deleteTransactionConfirm');
        break;
      case 'products':
        confirmMessage = t('deleteProductConfirm');
        break;
      case 'payees':
        confirmMessage = 'Are you sure you want to delete this payee?';
        break;
      case 'payers':
        confirmMessage = 'Are you sure you want to delete this payer?';
        break;
      case 'transaction_types':
        confirmMessage = t('deleteCategoryConfirm');
        break;
      case 'subcategories':
        confirmMessage = t('deleteSubcategoryConfirm');
        break;
      case 'transaction_groups':
        confirmMessage = t('deleteTransactionGroupConfirm');
        break;
      case 'currencies':
        confirmMessage = 'Are you sure you want to delete this currency?';
        break;
      default:
        confirmMessage = 'Are you sure you want to delete this record?';
    }

    // Show confirmation dialog
    if (window.confirm(`${confirmMessage}\n\n${record.name || record.description || `ID: ${record.id}`}`)) {
      try {
        switch (activeTab) {
          case 'accounts':
            await deleteAccount(record.id);
            break;
          case 'transactions':
            await deleteTransaction(record.id);
            break;
          case 'products':
            await deleteProduct(record.id);
            break;
          case 'payees':
            await deletePayee(record.id);
            break;
          case 'payers':
            await deletePayer(record.id);
            break;
          case 'transaction_types':
            await deleteCategory(record.id);
            break;
          case 'subcategories':
            await deleteSubcategory(record.id);
            break;
          case 'transaction_groups':
            await deleteTransactionGroup(record.id);
            break;
          case 'currencies':
            await deleteCurrency(record.id);
            break;
          default:
            break;
        }
        // Success - record is already updated in context
      } catch (error) {
        if (error.message.includes('is used in transactions')) {
          alert(t('deleteCannotDelete'));
        } else {
          alert(`${t('deleteError')}: ${error.message}`);
        }
      }
    }
  };

  const renderTable = (data, columns) => (
    <div className="data-table">
      <table>
        <thead>
          <tr>
            {(activeTab === 'accounts' || activeTab === 'transaction_types' || activeTab === 'subcategories' || activeTab === 'transaction_groups') && <th className="drag-handle-header">Order</th>}
            {columns.map(col => (
              <th key={col.key}>{col.label}</th>
            ))}
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row, index) => (
            <tr 
              key={row.id || index}
              className={`
                ${(activeTab === 'accounts' || activeTab === 'transaction_types' || activeTab === 'subcategories' || activeTab === 'transaction_groups') ? 'draggable-row' : ''}
                ${draggedId === row.id ? 'dragging' : ''}
                ${dragOverId === row.id ? 'drag-over' : ''}
              `.trim()}
              onDragEnter={(activeTab === 'accounts' || activeTab === 'transaction_types' || activeTab === 'subcategories' || activeTab === 'transaction_groups') ? (e) => handleDragEnter(e, row.id) : undefined}
              onDragOver={(activeTab === 'accounts' || activeTab === 'transaction_types' || activeTab === 'subcategories' || activeTab === 'transaction_groups') ? (e) => handleDragOver(e, row.id) : undefined}
              onDragLeave={(activeTab === 'accounts' || activeTab === 'transaction_types' || activeTab === 'subcategories' || activeTab === 'transaction_groups') ? (e) => handleDragLeave(e, row.id) : undefined}
              onDrop={(activeTab === 'accounts' || activeTab === 'transaction_types' || activeTab === 'subcategories' || activeTab === 'transaction_groups') ? (e) => handleDrop(e, row.id) : undefined}
            >
              {(activeTab === 'accounts' || activeTab === 'transaction_types' || activeTab === 'subcategories' || activeTab === 'transaction_groups') && (
                <td className="drag-handle-cell">
                  <div 
                    className="drag-handle" 
                    title="Drag to reorder"
                    draggable="true"
                    onDragStart={(e) => handleDragStart(e, row.id)}
                    onDragEnd={handleDragEnd}
                    onMouseDown={(e) => {}}
                    onMouseUp={(e) => {}}
                  >
                    ⋮⋮
                  </div>
                </td>
              )}
              {columns.map(col => (
                <td key={col.key}>
                  {col.render ? col.render(row[col.key], row) : row[col.key]}
                </td>
              ))}
              <td className="actions-cell">
                <div className="actions-dropdown">
                  <button 
                    onClick={(e) => handleDropdownClick(e, row.id)}
                    className="btn-dropdown"
                    title="More actions"
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
  );

  const renderAccountForm = () => (
    <>
      <form id="account-form" onSubmit={handleSubmit} className="data-form account-form">
        <div className="form-group">
          <label>Account Name</label>
          <input
            type="text"
            value={formData.name || ''}
            onChange={(e) => handleInputChange('name', e.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <label>Account Code</label>
          <input
            type="text"
            value={formData.accountCode || ''}
            onChange={(e) => handleInputChange('accountCode', e.target.value.toUpperCase())}
            placeholder="e.g., BNK, CSH, REV"
            maxLength="3"
            style={{ textTransform: 'uppercase' }}
          />
        </div>
        <div className="form-group">
          <label>Account Type</label>
          <select
            value={formData.accountTypeId || ''}
            onChange={(e) => handleInputChange('accountTypeId', e.target.value)}
            required
          >
            <option value="">Select Account Type</option>
            {accountTypes.map(accountType => (
              <option key={accountType.id} value={accountType.id}>
                {accountType.type} - {accountType.subtype}
              </option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label>{t('currency')}</label>
          <select
            value={formData.currencyId || 'CUR_001'}
            onChange={(e) => handleInputChange('currencyId', e.target.value)}
            required
          >
            {getActiveCurrencies().map(currency => (
              <option key={currency.id} value={currency.id}>
                {currency.symbol} {currency.name} ({currency.code})
              </option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label>Initial Balance</label>
          <input
            type="number"
            step="0.01"
            value={formData.initialBalance !== undefined ? formData.initialBalance : formData.balance || ''}
            onChange={(e) => handleInputChange('initialBalance', parseFloat(e.target.value) || 0)}
            style={{ textAlign: 'left' }}
            className="no-spinners"
          />
        </div>
      </form>
      <div className="form-actions" style={{ marginTop: '0.75rem', display: 'flex', justifyContent: 'flex-end' }}>
        <button type="submit" form="account-form" className="btn-primary">
          {editingId ? t('updateAccount') : t('addAccount')}
        </button>
      </div>
    </>
  );



  const renderTransactionForm = () => (
    <form onSubmit={handleSubmit} className="data-form">
      {/* 1. Date */}
      <div className="form-group">
        <label>Date *</label>
        <DatePicker
          selected={formData.date ? new Date(formData.date + 'T12:00:00') : new Date()}
          onChange={(date) => {
            if (date) {
              // Timezone-safe date handling
              const isoString = dateToISOString(date);
              handleInputChange('date', isoString);
            }
          }}
          dateFormat={datePickerFormat}
          className="form-control"
          placeholderText={`Select date (${userDateFormat}) *`}
          showPopperArrow={false}
          required
        />
      </div>

      {/* 2. Transaction Type (Category) */}
      <div className="form-group">
        <label>Transaction Type</label>
        <select
          value={formData.categoryId || ''}
          onChange={(e) => {
            handleInputChange('categoryId', e.target.value);
            // Clear transaction group when transaction type changes
            if (formData.transactionGroupId) {
              handleInputChange('transactionGroupId', '');
            }
          }}
          style={{ backgroundColor: '#f5f5f5', color: '#666' }}
        >
          <option value="">Select Transaction Type</option>
          {categories.map(category => (
            <option key={category.id} value={category.id}>
              {category.icon} {category.name}
            </option>
          ))}
        </select>
      </div>

      {/* 3. Transaction Group */}
      <div className="form-group">
        <label>Transaction Group</label>
        <select
          value={formData.transactionGroupId || ''}
          onChange={(e) => {
            handleInputChange('transactionGroupId', e.target.value);
            // Clear subcategory when transaction group changes
            if (formData.subcategoryId) {
              handleInputChange('subcategoryId', '');
            }
          }}
          disabled={!formData.categoryId}
        >
          <option value="">
            {formData.categoryId ? 'Select Transaction Group' : 'Select Transaction Type first'}
          </option>
          {getFilteredTransactionGroups(formData.categoryId).map(group => (
            <option key={group.id} value={group.id}>
              {group.name}
            </option>
          ))}
        </select>
      </div>

      {/* 4. Transaction Category (Subcategory) */}
      <div className="form-group">
        <label>Transaction Category</label>
        <select
          value={formData.subcategoryId || ''}
          onChange={(e) => handleInputChange('subcategoryId', e.target.value)}
          disabled={!formData.transactionGroupId}
        >
          <option value="">
            {formData.transactionGroupId ? 'Select Transaction Category' : 'Select Transaction Group first'}
          </option>
          {getFilteredSubcategories(formData.transactionGroupId).map(subcategory => (
            <option key={subcategory.id} value={subcategory.id}>
              {subcategory.name}
            </option>
          ))}
        </select>
      </div>

      {/* 5. Description */}
      <div className="form-group">
        <label>Description</label>
        <input
          type="text"
          value={formData.description || ''}
          onChange={(e) => handleInputChange('description', e.target.value)}
          required
        />
      </div>

      {/* 6. Account */}
      <div className="form-group">
        <label>Account</label>
        <select
          value={formData.accountId || ''}
          onChange={(e) => handleInputChange('accountId', e.target.value)}
          required
        >
          <option value="">Select Account</option>
          {accountsWithTypes.map(account => (
            <option key={account.id} value={account.id}>
              {account.name} ({account.accountType ? account.accountType.type : 'Unknown'}) ({formatAccountBalance(account)})
            </option>
          ))}
        </select>
      </div>

      {/* 7. Amount */}
      <div className="form-group">
        <label>Amount</label>
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <span style={{ 
            position: 'absolute', 
            left: '8px', 
            color: '#666', 
            fontSize: '14px',
            zIndex: 1,
            pointerEvents: 'none'
          }}>
            {(() => {
              if (formData.accountId) {
                const selectedAccount = accountsWithTypes.find(acc => acc.id === formData.accountId);
                if (selectedAccount && selectedAccount.currencyId) {
                  const accountCurrency = currencies.find(c => c.id === selectedAccount.currencyId);
                  return accountCurrency ? accountCurrency.symbol : '€';
                }
              }
              // Fallback to base currency if no account selected
              if (exchangeRateService) {
                const baseCurrencyId = exchangeRateService.getBaseCurrencyId();
                const baseCurrency = currencies.find(c => c.id === baseCurrencyId);
                return baseCurrency ? baseCurrency.symbol : '€';
              }
              return '€';
            })()}
          </span>
          <input
            type="number"
            step="0.01"
            value={formData.amount || ''}
            onChange={(e) => handleInputChange('amount', parseFloat(e.target.value) || 0)}
            required
            style={{ paddingLeft: '24px', width: '100%' }}
          />
        </div>
      </div>

      {/* 8. Tag */}
      <div className="form-group">
        <Autocomplete
          label="Tag"
          value={(() => {
            if (formData.productId) {
              const selectedTag = tags.find(tag => tag.id === formData.productId);
              return selectedTag ? selectedTag.name : '';
            }
            return '';
          })()}
          onChange={(value) => {
            // Handle freetext input - store as string in formData
            handleInputChange('productId', value);
          }}
          onSelect={(option, value, label) => {
            // Handle selection from dropdown - store ID
            handleInputChange('productId', value);
          }}
          options={tags.filter(tag => tag.isActive !== false)}
          placeholder="Select or enter tag"
          getOptionLabel={(option) => option.name}
          getOptionValue={(option) => option.id}
        />
      </div>

      {/* 9. Reference */}
      <div className="form-group">
        <label>Reference</label>
        <input
          type="text"
          value={formData.reference || ''}
          onChange={(e) => handleInputChange('reference', e.target.value)}
          placeholder="Enter reference"
          style={{ width: '100%' }}
        />
      </div>

      {/* 10. Reconciliation Reference */}
      <div className="form-group">
        <label>Reconciliation Reference</label>
        <input
          type="text"
          value={formData.reconciliationReference || ''}
          onChange={(e) => handleInputChange('reconciliationReference', e.target.value)}
          placeholder="Enter reconciliation reference"
          style={{ width: '100%' }}
        />
      </div>

      {/* 11. Notes */}
      <div className="form-group" style={{ 
        width: '200%',
        maxWidth: 'none'
      }}>
        <label>Notes</label>
        <input
          type="text"
          value={formData.notes || ''}
          onChange={(e) => handleInputChange('notes', e.target.value)}
          placeholder="Enter notes"
          style={{ width: '100%', boxSizing: 'border-box' }}
        />
      </div>


      {/* Payer/Payee fields (conditional) */}
      {shouldShowPayer(formData.transactionGroupId) && (
        <div className="form-group">
          <Autocomplete
            label={isInvestmentTransaction(formData.transactionGroupId) ? 'Broker/Exchange' : 'Payer'}
            value={(() => {
              if (formData.payerId) {
                const selectedPayer = getActivePayers().find(payer => payer.id === formData.payerId);
                return selectedPayer ? selectedPayer.name : '';
              }
              return '';
            })()}
            onChange={(value) => {
              // Handle freetext input - store as string in formData
              handleInputChange('payerId', value);
            }}
            onSelect={(option, value, label) => {
              // Handle selection from dropdown - store ID
              handleInputChange('payerId', value);
            }}
            options={getActivePayers()}
            placeholder={`Select or enter ${isInvestmentTransaction(formData.transactionGroupId) ? 'broker/exchange' : 'payer'}`}
            getOptionLabel={(option) => option.name}
            getOptionValue={(option) => option.id}
          />
        </div>
      )}
      {shouldShowPayee(formData.transactionGroupId) && (
        <div className="form-group">
          <Autocomplete
            label={isInvestmentTransaction(formData.transactionGroupId) ? 'Broker/Exchange' : 'Payee'}
            value={(() => {
              if (formData.payeeId) {
                const selectedPayee = getActivePayees().find(payee => payee.id === formData.payeeId);
                return selectedPayee ? selectedPayee.name : '';
              }
              return '';
            })()}
            onChange={(value) => {
              // Handle freetext input - store as string in formData
              handleInputChange('payeeId', value);
            }}
            onSelect={(option, value, label) => {
              // Handle selection from dropdown - store ID
              handleInputChange('payeeId', value);
            }}
            options={getActivePayees()}
            placeholder={`Select or enter ${isInvestmentTransaction(formData.transactionGroupId) ? 'broker/exchange' : 'payee'}`}
            getOptionLabel={(option) => option.name}
            getOptionValue={(option) => option.id}
          />
        </div>
      )}


      <div className="form-actions">
        <button type="submit" className="btn-primary">
          {editingId ? t('updateTransaction') : t('addTransactionButton')}
        </button>
      </div>
    </form>
  );

  const renderProductForm = () => (
    <form onSubmit={handleSubmit} className="data-form">
      <div className="form-group">
        <label>Tag Name</label>
        <input
          type="text"
          value={formData.name || ''}
          onChange={(e) => handleInputChange('name', e.target.value)}
          required
        />
      </div>
      <div className="form-group">
        <label>Description</label>
        <textarea
          value={formData.description || ''}
          onChange={(e) => handleInputChange('description', e.target.value)}
          placeholder="Optional description for this tag"
        />
      </div>
      <div className="form-group">
        <label>{t('category')}</label>
        <input
          type="text"
          value={formData.category || ''}
          onChange={(e) => handleInputChange('category', e.target.value)}
          placeholder="e.g., Essential, Lifestyle, Investment"
        />
      </div>
      <div className="form-actions">
        <button type="submit" className="btn-primary">
          {editingId ? `${t('update')} Tag` : `${t('add')} Tag`}
        </button>
        <button type="button" onClick={resetForm} className="btn-secondary">{t('cancel')}</button>
      </div>
    </form>
  );

  const renderPayeeForm = () => (
    <form onSubmit={handleSubmit} className="data-form">
      <div className="form-group">
        <label>Payee Name</label>
        <input
          type="text"
          value={formData.name || ''}
          onChange={(e) => handleInputChange('name', e.target.value)}
          required
          placeholder="Enter payee name"
          style={{ width: '100%' }}
        />
      </div>
      <div className="form-actions">
        <button type="submit" className="btn-primary">
          {editingId ? 'Update Payee' : 'Add Payee'}
        </button>
      </div>
    </form>
  );

  const renderPayerForm = () => (
    <form onSubmit={handleSubmit} className="data-form">
      <div className="form-group">
        <label>Payer Name</label>
        <input
          type="text"
          value={formData.name || ''}
          onChange={(e) => handleInputChange('name', e.target.value)}
          required
          placeholder="Enter payer name"
          style={{ width: '100%' }}
        />
      </div>
      <div className="form-actions">
        <button type="submit" className="btn-primary">
          {editingId ? 'Update Payer' : 'Add Payer'}
        </button>
      </div>
    </form>
  );

  const renderCategoryForm = () => (
    <form onSubmit={handleSubmit} className="data-form">
      <div className="form-group">
        <label>{t('categoryName')}</label>
        <input
          type="text"
          value={formData.name || ''}
          onChange={(e) => handleInputChange('name', e.target.value)}
          required
        />
      </div>
      <div className="form-group">
        <label>{t('description')}</label>
        <textarea
          value={formData.description || ''}
          onChange={(e) => handleInputChange('description', e.target.value)}
          placeholder={t('description')}
        />
      </div>
      <div className="form-group">
        <label>{t('color')}</label>
        <input
          type="color"
          value={formData.color || '#4CAF50'}
          onChange={(e) => handleInputChange('color', e.target.value)}
        />
      </div>
      <div className="form-group">
        <label>{t('icon')}</label>
        <input
          type="text"
          value={formData.icon || ''}
          onChange={(e) => handleInputChange('icon', e.target.value)}
          placeholder="💰"
          maxLength="2"
        />
      </div>
      <div className="form-group">
        <label>{t('defaultAccount')}</label>
        <select
          value={formData.defaultAccountId || ''}
          onChange={(e) => handleInputChange('defaultAccountId', e.target.value)}
        >
          <option value="">{t('selectDefaultAccount')}</option>
          {accountsWithTypes.map(account => (
            <option key={account.id} value={account.id}>
              {account.name} ({account.accountType ? account.accountType.type : 'Unknown'})
            </option>
          ))}
        </select>
      </div>
      <div className="form-group">
        <label>{t('destinationAccount')}</label>
        <select
          value={formData.destinationAccountId || ''}
          onChange={(e) => handleInputChange('destinationAccountId', e.target.value)}
        >
          <option value="">{t('selectDestinationAccount')}</option>
          {accountsWithTypes.map(account => (
            <option key={account.id} value={account.id}>
              {account.name} ({account.accountType ? account.accountType.type : 'Unknown'})
            </option>
          ))}
        </select>
        <small style={{color: '#666', fontSize: '0.9em', marginTop: '4px', display: 'block'}}>
          Only relevant for Transfer transaction types
        </small>
      </div>
      <div className="form-actions">
        <button type="submit" className="btn-primary">
          {editingId ? t('updateCategory') : t('addCategory')}
        </button>
        <button type="button" onClick={resetForm} className="btn-secondary">{t('cancel')}</button>
      </div>
    </form>
  );

  const renderSubcategoryForm = () => {
    const activeTransactionGroupsData = getActiveTransactionGroups();
    
    // Check if selected transaction group is linked to CAT_002 (Expenses)
    const selectedGroup = activeTransactionGroupsData.find(group => group.id === formData.groupId);
    const isExpenseGroup = selectedGroup?.transactionTypeId === 'CAT_002';
    
    return (
      <form onSubmit={handleSubmit} className="data-form">
        <div className="form-group">
          <label>{t('subcategoryName')}</label>
          <input
            type="text"
            value={formData.name || ''}
            onChange={(e) => handleInputChange('name', e.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <label>{t('transactionGroup')}</label>
          <select
            value={formData.groupId || ''}
            onChange={(e) => handleInputChange('groupId', e.target.value)}
          >
            <option value="">{t('selectTransactionGroup')}</option>
            {activeTransactionGroupsData.map(group => (
              <option key={group.id} value={group.id}>
                {group.name}
              </option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label>{t('description')}</label>
          <textarea
            value={formData.description || ''}
            onChange={(e) => handleInputChange('description', e.target.value)}
            placeholder={t('description')}
          />
        </div>
        <div className="form-group">
          <label>{t('color')}</label>
          <input
            type="color"
            value={formData.color || '#2196F3'}
            onChange={(e) => handleInputChange('color', e.target.value)}
          />
        </div>
        {isExpenseGroup && (
          <div className="form-group">
            <label>
              <input
                type="checkbox"
                checked={formData.isCashWithdrawal || false}
                onChange={(e) => handleInputChange('isCashWithdrawal', e.target.checked)}
              />
              Is this a cash withdrawal transaction
            </label>
          </div>
        )}
        <div className="form-actions">
          <button type="submit" className="btn-primary">
            {editingId ? t('updateSubcategory') : t('addSubcategory')}
          </button>
          <button type="button" onClick={resetForm} className="btn-secondary">{t('cancel')}</button>
        </div>
      </form>
    );
  };

  const renderTransactionGroupForm = () => (
    <form onSubmit={handleSubmit} className="data-form">
      <div className="form-group">
        <label>{t('transactionGroupName')}</label>
        <input
          type="text"
          value={formData.name || ''}
          onChange={(e) => handleInputChange('name', e.target.value)}
          required
        />
      </div>
      <div className="form-group">
        <label>{t('description')}</label>
        <textarea
          value={formData.description || ''}
          onChange={(e) => handleInputChange('description', e.target.value)}
          placeholder="Optional description for this transaction group"
        />
      </div>
      <div className="form-group">
        <label>Transaction Type</label>
        <select
          value={formData.transactionTypeId || ''}
          onChange={(e) => handleInputChange('transactionTypeId', e.target.value)}
          required
        >
          <option value="">Select Transaction Type</option>
          {getActiveCategories().map(category => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      </div>
      <div className="form-group">
        <label>{t('color')}</label>
        <input
          type="color"
          value={formData.color || '#6366f1'}
          onChange={(e) => handleInputChange('color', e.target.value)}
        />
      </div>
      <div className="form-actions">
        <button type="submit" className="btn-primary">
          {editingId ? t('updateTransactionGroup') : t('addTransactionGroup')}
        </button>
        <button type="button" onClick={resetForm} className="btn-secondary">{t('cancel')}</button>
      </div>
    </form>
  );

  const renderCurrencyForm = () => (
    <form onSubmit={handleSubmit} className="data-form">
      <div className="form-group">
        <label>Code *</label>
        <input
          type="text"
          value={formData.code || ''}
          onChange={(e) => handleInputChange('code', e.target.value.toUpperCase())}
          placeholder="EUR, USD, BTC..."
          maxLength={10}
          required
        />
      </div>
      
      <div className="form-group">
        <label>Name *</label>
        <input
          type="text"
          value={formData.name || ''}
          onChange={(e) => handleInputChange('name', e.target.value)}
          placeholder="Euro, US Dollar, Bitcoin..."
          required
        />
      </div>
      
      <div className="form-group">
        <label>Symbol *</label>
        <input
          type="text"
          value={formData.symbol || ''}
          onChange={(e) => handleInputChange('symbol', e.target.value)}
          placeholder="€, $, ₿..."
          maxLength={10}
          required
        />
      </div>
      
      <div className="form-group">
        <label>Type</label>
        <select
          value={formData.type || 'fiat'}
          onChange={(e) => handleInputChange('type', e.target.value)}
        >
          <option value="fiat">{t('fiat')}</option>
          <option value="crypto">{t('crypto')}</option>
        </select>
      </div>
      
      <div className="form-group">
        <label>{t('decimalPlaces')}</label>
        <input
          type="number"
          value={formData.decimalPlaces || 2}
          onChange={(e) => handleInputChange('decimalPlaces', parseInt(e.target.value))}
          min="0"
          max="18"
        />
      </div>
      
      <div className="form-group">
        <label>
          <input
            type="checkbox"
            checked={formData.isActive !== false}
            onChange={(e) => handleInputChange('isActive', e.target.checked)}
          />
          Active
        </label>
      </div>
      
      <div className="form-actions">
        <button type="submit" className="btn-primary">
          {editingId ? getEditButtonText() : getAddButtonText()}
        </button>
        <button type="button" onClick={resetForm} className="btn-secondary">Cancel</button>
      </div>
    </form>
  );

  const getAddButtonText = () => {
    switch (activeTab) {
      case 'accounts':
        return t('addAccount');
      case 'transactions':
        return t('addTransactionButton');
      case 'products':
        return `${t('add')} Tag`;
      case 'payees':
        return 'Add Payee';
      case 'payers':
        return 'Add Payer';
      case 'transaction_types':
        return t('addCategory');
      case 'subcategories':
        return t('addSubcategory');
      case 'transaction_groups':
        return t('addTransactionGroup');
      case 'currencies':
        return t('addCurrency');
      default:
        return t('add');
    }
  };

  const getEditButtonText = () => {
    switch (activeTab) {
      case 'accounts':
        return t('updateAccount');
      case 'transactions':
        return t('updateTransaction');
      case 'products':
        return `${t('update')} Tag`;
      case 'payees':
        return 'Update Payee';
      case 'payers':
        return 'Update Payer';
      case 'transaction_types':
        return t('updateCategory');
      case 'subcategories':
        return t('updateSubcategory');
      case 'transaction_groups':
        return t('updateTransactionGroup');
      case 'currencies':
        return t('updateCurrency');
      default:
        return t('update');
    }
  };

  const getTableData = () => {
    switch (activeTab) {
      case 'accounts':
        return {
          data: accountsWithTypes,
          columns: [
            { key: 'id', label: t('id') },
            { key: 'name', label: t('name') },
            { 
              key: 'accountType', 
              label: t('type'), 
              render: (accountType) => accountType ? `${accountType.type} - ${accountType.subtype}` : t('unknownAccount')
            },
            { key: 'accountCode', label: 'Code', render: (value) => value || '-' },
            { 
              key: 'currencyId', 
              label: t('currency'), 
              render: (currencyId) => {
                const currency = currencies.find(c => c.id === currencyId);
                return currency ? (
                  <span className="account-currency">
                    <span style={{fontSize: '1.1em'}}>{currency.symbol}</span>
                    <span className="currency-badge">{currency.code}</span>
                  </span>
                ) : 'N/A';
              }
            },
            { 
              key: 'initialBalance', 
              label: 'Initial Balance', 
              render: (value, row) => {
                const currency = currencies.find(c => c.id === row.currencyId);
                if (currency && exchangeRateService) {
                  return exchangeRateService.formatAmount(value || 0, currency.id);
                }
                // Fallback: use NumberFormatService with base currency or simple formatting
                if (numberFormatService && row.currencyId) {
                  return numberFormatService.formatCurrency(value || 0, row.currencyId);
                }
                return (value || 0).toFixed(2);
              }
            },
            { 
              key: 'balance', 
              label: 'Current Balance', 
              render: (value, row) => {
                const currency = currencies.find(c => c.id === row.currencyId);
                const currentBalance = value || 0;
                const initialBalance = row.initialBalance || 0;
                
                // Style based on whether current balance is positive or negative
                const isPositive = currentBalance >= 0;
                const style = {
                  color: isPositive ? '#059669' : '#dc2626',
                  fontWeight: '600'
                };
                
                let formattedAmount;
                if (currency && exchangeRateService) {
                  formattedAmount = exchangeRateService.formatAmount(currentBalance, currency.id);
                } else if (numberFormatService && row.currencyId) {
                  formattedAmount = numberFormatService.formatCurrency(currentBalance, row.currencyId);
                } else {
                  formattedAmount = currentBalance.toFixed(2);
                }
                
                return <span style={style}>{formattedAmount}</span>;
              }
            },
            {
              key: 'includeInOverview',
              label: 'Analytics',
              render: (value, row) => (
                <button
                  className={`toggle-switch ${value !== false ? 'enabled' : 'disabled'}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToggleOverview(row.id, value !== false);
                  }}
                  title={`Click to ${value !== false ? 'exclude from' : 'include in'} Analytics`}
                >
                  <span className="toggle-slider"></span>
                </button>
              )
            }
          ]
        };
      case 'transactions':
        return {
          data: transactions,
          columns: [
            { 
              key: 'date', 
              label: t('date'),
              render: (value) => formatDate(value)
            },
            { 
              key: 'categoryId', 
              label: 'Type',
              render: (value, row) => {
                // Get transaction type similar to main TransactionList
                if (row.subcategoryId) {
                  const subcategoriesWithCategories = getSubcategoriesWithCategories();
                  const subcategory = subcategoriesWithCategories.find(sub => sub.id === row.subcategoryId);
                  
                  if (subcategory && subcategory.groupId) {
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
                
                if (row.categoryId) {
                  const category = categories.find(cat => cat.id === row.categoryId);
                  if (category) {
                    return `${category.icon} ${category.name}`;
                  }
                }
                
                return '❓ Unknown';
              }
            },
            { key: 'description', label: t('description') },
            { 
              key: 'accountId', 
              label: 'Account',
              render: (value) => {
                const account = accountsWithTypes.find(acc => acc.id === value);
                return account ? account.name : t('unknownAccount');
              }
            },
            { 
              key: 'destinationAccountId', 
              label: 'From/To Account',
              render: (value, row) => {
                if (row.linkedTransactionId && (row.categoryId === 'CAT_003' || row.categoryId === 'CAT_004' || row.categoryId === 'CAT_005')) {
                  const linkedTransaction = transactions.find(t => t.id === row.linkedTransactionId);
                  if (linkedTransaction) {
                    const account = accountsWithTypes.find(acc => acc.id === linkedTransaction.accountId);
                    return account ? account.name : t('unknownAccount');
                  }
                }
                
                if (value) {
                  const account = accountsWithTypes.find(acc => acc.id === value);
                  return account ? account.name : t('unknownAccount');
                }
                
                return '-';
              }
            },
            { 
              key: 'payee', 
              label: 'Payee/Payer',
              render: (value, row) => {
                // For investment transactions, use broker field
                if ((row.categoryId === 'CAT_004' || row.categoryId === 'CAT_005') && row.broker) {
                  return row.broker;
                }
                
                // Get transaction type to determine if it's expenses or income
                let transactionType = '';
                if (row.subcategoryId) {
                  const subcategoriesWithCategories = getSubcategoriesWithCategories();
                  const subcategory = subcategoriesWithCategories.find(sub => sub.id === row.subcategoryId);
                  
                  if (subcategory && subcategory.groupId) {
                    const transactionGroups = getActiveTransactionGroups();
                    const group = transactionGroups.find(g => g.id === subcategory.groupId);
                    
                    if (group && group.transactionTypeId) {
                      const activeCategories = getActiveCategories();
                      const transactionTypeObj = activeCategories.find(type => type.id === group.transactionTypeId);
                      if (transactionTypeObj) {
                        transactionType = transactionTypeObj.name;
                      }
                    }
                  }
                }
                
                if (transactionType.includes('Expenses') && row.payee) {
                  return row.payee;
                } else if (transactionType.includes('Income') && row.payer) {
                  return row.payer;
                }
                return '-';
              }
            },
            { key: 'reference', label: 'Reference', render: (value) => value || '-' },
            { 
              key: 'amount', 
              label: t('amount'), 
              render: (value, row) => {
                // Currency-aware formatting similar to main TransactionList
                const currency = currencies.find(c => c.id === row.currencyId);
                const shouldShowNegative = row.transactionType === 'DEBIT';
                
                if (currency && exchangeRateService) {
                  const displayAmount = shouldShowNegative ? -(value || 0) : (value || 0);
                  return exchangeRateService.formatAmount(displayAmount, currency.id);
                }
                
                if (numberFormatService && row.currencyId) {
                  const displayAmount = shouldShowNegative ? -(value || 0) : (value || 0);
                  return numberFormatService.formatCurrency(displayAmount, row.currencyId);
                }
                
                const displayAmount = shouldShowNegative ? -(value || 0) : (value || 0);
                return displayAmount.toFixed(2);
              }
            },
            { 
              key: 'reconciliationReference', 
              label: 'RR', 
              render: (value) => value || '-' 
            }
          ]
        };
      case 'products':
        return {
          data: tags,
          columns: [
            { key: 'id', label: t('id') },
            { key: 'name', label: t('name') },
            { key: 'description', label: t('description') }
          ]
        };
      case 'payees':
        return {
          data: payees,
          columns: [
            { key: 'id', label: 'ID' },
            { key: 'name', label: 'Name' }
          ]
        };
      case 'payers':
        return {
          data: payers,
          columns: [
            { key: 'id', label: 'ID' },
            { key: 'name', label: 'Name' }
          ]
        };
      case 'transaction_types':
        return {
          data: categories,
          columns: [
            { key: 'id', label: t('id') },
            { 
              key: 'icon', 
              label: t('icon'), 
              render: (value) => <span style={{fontSize: '1.2em'}}>{value}</span>
            },
            { key: 'name', label: t('name') },
            { key: 'description', label: t('description') },
            { 
              key: 'defaultAccountId', 
              label: t('defaultAccount'), 
              render: (value, row) => {
                if (!value || value === undefined) return '-';
                const account = accountsWithTypes.find(acc => 
                  acc.id === value || 
                  acc.id === String(value) || 
                  String(acc.id) === String(value)
                );
                return account ? account.name : <span style={{color: '#ff6b6b', fontSize: '0.9em'}}>Account Not Found ({value})</span>;
              }
            },
            { 
              key: 'destinationAccountId', 
              label: t('destinationAccount'), 
              render: (value) => {
                if (!value || value === undefined) return '-';
                const account = accountsWithTypes.find(acc => 
                  acc.id === value || 
                  acc.id === String(value) || 
                  String(acc.id) === String(value)
                );
                return account ? account.name : <span style={{color: '#ff6b6b', fontSize: '0.9em'}}>Account Not Found ({value})</span>;
              }
            },
            { 
              key: 'color', 
              label: t('color'), 
              render: (value) => (
                <span style={{
                  display: 'inline-block',
                  width: '20px',
                  height: '20px',
                  backgroundColor: value,
                  borderRadius: '3px',
                  border: '1px solid #ccc'
                }}></span>
              )
            }
          ]
        };
      case 'subcategories': {
        const subcategoriesWithCategories = getSubcategoriesWithCategories();
        return {
          data: subcategoriesWithCategories,
          columns: [
            { key: 'id', label: t('id') },
            { key: 'name', label: t('name') },
            { key: 'description', label: t('description') },
            { 
              key: 'group', 
              label: t('transactionGroup'), 
              render: (group) => group ? group.name : '-'
            },
            { 
              key: 'color', 
              label: t('color'), 
              render: (value) => (
                <span style={{
                  display: 'inline-block',
                  width: '20px',
                  height: '20px',
                  backgroundColor: value,
                  borderRadius: '3px',
                  border: '1px solid #ccc'
                }}></span>
              )
            }
          ]
        };
      }
      case 'transaction_groups':
        return {
          data: transactionGroups,
          columns: [
            { key: 'id', label: t('id') },
            { key: 'name', label: t('name') },
            { key: 'description', label: t('description') },
            { 
              key: 'transactionTypeId', 
              label: 'Transaction Type',
              render: (value) => {
                const transactionType = categories.find(cat => cat.id === value);
                return transactionType ? (
                  <span>
                    <span style={{ marginRight: '0.5rem' }}>{transactionType.icon}</span>
                    {transactionType.name}
                  </span>
                ) : 'Unknown';
              }
            },
            { 
              key: 'color', 
              label: t('color'), 
              render: (value) => (
                <span style={{
                  display: 'inline-block',
                  width: '20px',
                  height: '20px',
                  backgroundColor: value,
                  borderRadius: '3px',
                  border: '1px solid #ccc'
                }}></span>
              )
            }
          ]
        };
      case 'currencies':
        return {
          data: currencies,
          columns: [
            { key: 'id', label: t('id') },
            { key: 'code', label: 'Code' },
            { key: 'name', label: t('name') },
            { 
              key: 'symbol', 
              label: 'Symbol', 
              render: (value) => <span style={{fontSize: '1.2em'}}>{value}</span>
            },
            { 
              key: 'type', 
              label: 'Type',
              render: (value) => (
                <span className={`badge ${value === 'crypto' ? 'badge-crypto' : 'badge-fiat'}`}>
                  {value === 'crypto' ? '₿ Crypto' : '💰 Fiat'}
                </span>
              )
            },
            { key: 'decimalPlaces', label: 'Decimals' },
            { 
              key: 'isActive', 
              label: 'Status',
              render: (value) => (
                <span className={`badge ${value ? 'badge-active' : 'badge-inactive'}`}>
                  {value ? 'Active' : 'Inactive'}
                </span>
              )
            }
          ]
        };
      default:
        return { data: [], columns: [] };
    }
  };

  const renderForm = () => {
    switch (activeTab) {
      case 'accounts':
        return renderAccountForm();
      case 'transactions':
        return renderTransactionForm();
      case 'products':
        return renderProductForm();
      case 'payees':
        return renderPayeeForm();
      case 'payers':
        return renderPayerForm();
      case 'transaction_types':
        return renderCategoryForm();
      case 'subcategories':
        return renderSubcategoryForm();
      case 'transaction_groups':
        return renderTransactionGroupForm();
      default:
        return null;
    }
  };

  // Handle loading state for transactions
  useEffect(() => {
    if (activeTab === 'transactions' && transactions.length > 1000) {
      setIsLoadingTransactions(true);
      const timer = setTimeout(() => {
        setIsLoadingTransactions(false);
      }, 100);
      return () => clearTimeout(timer);
    } else {
      setIsLoadingTransactions(false);
    }
  }, [activeTab, transactions]);

  // Handle clicks outside dropdown to close it
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.actions-dropdown')) {
        setOpenDropdownId(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Drag & Drop handlers
  const handleDragStart = (e, accountId) => {
    setDraggedId(accountId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', accountId);
    
    // Add some visual feedback
    e.dataTransfer.setDragImage(e.target, 10, 10);
  };

  const handleDragEnter = (e, accountId) => {
    e.preventDefault();
    
    // Clear any pending leave timeout
    if (dragLeaveTimeout) {
      clearTimeout(dragLeaveTimeout);
      setDragLeaveTimeout(null);
    }
    
    if (draggedId && draggedId !== accountId) {
      setDragOverId(accountId);
    }
  };

  const handleDragOver = (e, accountId) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    
    // Ensure the highlight stays on during drag over
    if (draggedId && draggedId !== accountId && dragOverId !== accountId) {
      setDragOverId(accountId);
    }
    
    return false; // Allow drop
  };

  const handleDragLeave = (e, accountId) => {
    // Use a timeout to prevent flickering when moving between child elements
    const timeout = setTimeout(() => {
      if (dragOverId === accountId) {
        setDragOverId(null);
      }
      setDragLeaveTimeout(null);
    }, 100); // 100ms delay
    
    setDragLeaveTimeout(timeout);
  };

  const handleDrop = (e, targetId) => {
    e.preventDefault();
    e.stopPropagation();
    
    setDragOverId(null);
    
    if (draggedId && draggedId !== targetId) {
      if (activeTab === 'accounts') {
        reorderAccounts(draggedId, targetId);
      } else if (activeTab === 'transaction_types') {
        reorderCategories(draggedId, targetId);
      } else if (activeTab === 'subcategories') {
        reorderSubcategories(draggedId, targetId);
      } else if (activeTab === 'transaction_groups') {
        reorderTransactionGroups(draggedId, targetId);
      }
    }
    setDraggedId(null);
  };

  const handleDragEnd = () => {
    setDraggedId(null);
    setDragOverId(null);
    
    // Clear any pending timeout
    if (dragLeaveTimeout) {
      clearTimeout(dragLeaveTimeout);
      setDragLeaveTimeout(null);
    }
  };

  const reorderAccounts = async (draggedId, targetId) => {
    try {
      setReorderingAccounts(true);
      
      const accountsList = [...accountsWithTypes];
      const draggedIndex = accountsList.findIndex(acc => acc.id === draggedId);
      const targetIndex = accountsList.findIndex(acc => acc.id === targetId);
      
      if (draggedIndex === -1 || targetIndex === -1) {
        setReorderingAccounts(false);
        return;
      }
      
      // Remove dragged item and insert at target position
      const [draggedItem] = accountsList.splice(draggedIndex, 1);
      accountsList.splice(targetIndex, 0, draggedItem);
      
      // Batch update all accounts that need reordering (async in background)
      const updatePromises = [];
      const accountsToUpdate = [];
      
      for (let i = 0; i < accountsList.length; i++) {
        const account = accountsList[i];
        const newOrder = i + 1;
        if (account.order !== newOrder) {
          accountsToUpdate.push({ ...account, order: newOrder });
        }
      }
      
      // Only update accounts that actually changed order
      
      // Batch update in parallel instead of sequential
      for (const accountData of accountsToUpdate) {
        updatePromises.push(updateAccount(accountData.id, accountData));
      }
      
      // Wait for all updates to complete in parallel
      await Promise.all(updatePromises);
      
      // Refresh UI after database operations complete
      setRefreshKey(prev => prev + 1);
      setReorderingAccounts(false);
      
    } catch (error) {
      console.error('Error reordering accounts:', error);
      // If there's an error, refresh to show the correct state
      setRefreshKey(prev => prev + 1);
      setReorderingAccounts(false);
    }
  };

  const reorderCategories = async (draggedId, targetId) => {
    try {
      setReorderingCategories(true);
      
      const categoriesList = [...categories];
      const draggedIndex = categoriesList.findIndex(cat => cat.id === draggedId);
      const targetIndex = categoriesList.findIndex(cat => cat.id === targetId);
      
      
      if (draggedIndex === -1 || targetIndex === -1) {
        setReorderingCategories(false);
        return;
      }
      
      // Remove dragged item and insert at target position
      const [draggedItem] = categoriesList.splice(draggedIndex, 1);
      categoriesList.splice(targetIndex, 0, draggedItem);
      
      
      // Batch update all categories that need reordering (async in background)
      const updatePromises = [];
      const categoriesToUpdate = [];
      
      for (let i = 0; i < categoriesList.length; i++) {
        const category = categoriesList[i];
        const newOrder = i + 1;
        if (category.order !== newOrder) {
          categoriesToUpdate.push({ ...category, order: newOrder });
        }
      }
      
      // Only update categories that actually changed order
      
      // Batch update in parallel instead of sequential
      for (const categoryData of categoriesToUpdate) {
        updatePromises.push(updateCategory(categoryData.id, categoryData));
      }
      
      // Wait for all updates to complete in parallel
      await Promise.all(updatePromises);
      
      // Force immediate UI refresh
      setReorderingCategories(false);
      setRefreshKey(prev => prev + 1);
      
      // Add a small delay to ensure database state is fully updated before next operation
      setTimeout(() => {
      }, 100);
      
    } catch (error) {
      console.error('Error reordering categories:', error);
      // If there's an error, refresh to show the correct state
      setRefreshKey(prev => prev + 1);
      setReorderingCategories(false);
    }
  };

  const reorderSubcategories = async (draggedId, targetId) => {
    try {
      setReorderingSubcategories(true);
      
      const subcategoriesList = [...subcategories];
      const draggedIndex = subcategoriesList.findIndex(sub => sub.id === draggedId);
      const targetIndex = subcategoriesList.findIndex(sub => sub.id === targetId);
      
      
      if (draggedIndex === -1 || targetIndex === -1) {
        setReorderingSubcategories(false);
        return;
      }
      
      // Remove dragged item and insert at target position
      const [draggedItem] = subcategoriesList.splice(draggedIndex, 1);
      subcategoriesList.splice(targetIndex, 0, draggedItem);
      
      
      // Batch update all subcategories that need reordering (async in background)
      const updatePromises = [];
      const subcategoriesToUpdate = [];
      
      for (let i = 0; i < subcategoriesList.length; i++) {
        const subcategory = subcategoriesList[i];
        const newOrder = i + 1;
        if (subcategory.order !== newOrder) {
          subcategoriesToUpdate.push({ ...subcategory, order: newOrder });
        }
      }
      
      // Only update subcategories that actually changed order
      
      // Batch update in parallel instead of sequential
      for (const subcategoryData of subcategoriesToUpdate) {
        updatePromises.push(updateSubcategory(subcategoryData.id, subcategoryData));
      }
      
      // Wait for all updates to complete in parallel
      await Promise.all(updatePromises);
      
      // Force immediate UI refresh
      setReorderingSubcategories(false);
      setRefreshKey(prev => prev + 1);
      
      // Add a small delay to ensure database state is fully updated before next operation
      setTimeout(() => {
      }, 100);
      
    } catch (error) {
      console.error('Error reordering subcategories:', error);
      // If there's an error, refresh to show the correct state
      setRefreshKey(prev => prev + 1);
      setReorderingSubcategories(false);
    }
  };

  const reorderTransactionGroups = async (draggedId, targetId) => {
    try {
      setReorderingTransactionGroups(true);
      
      const groupsList = [...transactionGroups];
      const draggedIndex = groupsList.findIndex(grp => grp.id === draggedId);
      const targetIndex = groupsList.findIndex(grp => grp.id === targetId);
      
      
      if (draggedIndex === -1 || targetIndex === -1) {
        setReorderingTransactionGroups(false);
        return;
      }
      
      // Remove dragged item and insert at target position
      const [draggedItem] = groupsList.splice(draggedIndex, 1);
      groupsList.splice(targetIndex, 0, draggedItem);
      
      
      // Batch update all transaction groups that need reordering (async in background)
      const updatePromises = [];
      const groupsToUpdate = [];
      
      for (let i = 0; i < groupsList.length; i++) {
        const group = groupsList[i];
        const newOrder = i + 1;
        if (group.order !== newOrder) {
          groupsToUpdate.push({ ...group, order: newOrder });
        }
      }
      
      // Only update transaction groups that actually changed order
      
      // Batch update in parallel instead of sequential
      for (const groupData of groupsToUpdate) {
        updatePromises.push(updateTransactionGroup(groupData.id, groupData));
      }
      
      // Wait for all updates to complete in parallel
      await Promise.all(updatePromises);
      
      // Force immediate UI refresh
      setReorderingTransactionGroups(false);
      setRefreshKey(prev => prev + 1);
      
      // Add a small delay to ensure database state is fully updated before next operation
      setTimeout(() => {
      }, 100);
      
    } catch (error) {
      console.error('Error reordering transaction groups:', error);
      // If there's an error, refresh to show the correct state
      setRefreshKey(prev => prev + 1);
      setReorderingTransactionGroups(false);
    }
  };

  const { data: rawData, columns } = getTableData();
  const data = filterData(rawData, searchTerm);


  return (
    <div className="data-management">
      <nav className="data-nav">
        {['accounts', 'transaction_types', 'transaction_groups', 'subcategories', 'currencies', 'products', 'payees', 'payers', 'transactions'].map(tab => (
          <button
            key={tab}
            className={activeTab === tab ? 'data-nav-btn active' : 'data-nav-btn'}
            onClick={() => {
              setActiveTab(tab);
              resetForm();
              setShowAccountTypeTooltip(false);
              setSearchTerm('');
            }}
          >
            {tab === 'payees' ? 'Payees' : tab === 'payers' ? 'Payers' : t(tab)}
          </button>
        ))}
      </nav>


      {activeTab === 'accounts' && (
        <div className="account-types-explanation">
          <div className="account-types-header">
            <h3>{t('accountTypesExplained') || 'Account Types Explained'}</h3>
            <button 
              className="toggle-explanation-btn"
              onClick={() => setShowAccountTypesExplanation(!showAccountTypesExplanation)}
              title={showAccountTypesExplanation ? 'Hide explanation' : 'Show explanation'}
            >
              {showAccountTypesExplanation ? '🔽' : '▶️'}
            </button>
          </div>
          {showAccountTypesExplanation && (
            <div className="account-types-grid">
              {accountTypes.map(accountType => (
                <div key={accountType.id} className="account-type-card">
                  <div className="account-type-header">
                    <strong>{accountType.type} - {accountType.subtype}</strong>
                  </div>
                  <div className="account-type-description">
                    {accountType.description}
                  </div>
                  <div className="account-type-examples">
                    <em>Examples: {accountType.examples}</em>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="data-content">
        
        {activeTab === 'currencies' ? (
          <div className="currency-manager-container">
            <CurrencyManager />
          </div>
        ) : (
          <>
            {showForm && (
              <div className="form-container">
                {renderForm()}
              </div>
            )}

            <div className="search-and-actions-container">
          <div className="search-container">
            <div className="search-input-wrapper">
              <input
                type="text"
                placeholder={`Search ${t(activeTab)}...`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
              />
              <span className="search-icon">🔍</span>
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="search-clear"
                  title="Clear search"
                >
                  ✕
                </button>
              )}
            </div>
            {searchTerm && (
              <div className="search-results-info">
                {data.length} of {rawData.length} {t(activeTab)} found
              </div>
            )}
          </div>
          
          <div className="data-actions">
            {activeTab !== 'transaction_types' && (
              <button 
                onClick={() => setShowForm(!showForm)}
                className="btn-primary"
              >
                {showForm ? t('cancel') : (editingId ? getEditButtonText() : getAddButtonText())}
              </button>
            )}
          </div>
        </div>

            <div className="table-container">
              <h3>
                {activeTab === 'transaction_types' ? 'Transaction Types' : activeTab === 'subcategories' ? 'Transaction Categories' : activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} ({data.length})
                {reorderingAccounts && activeTab === 'accounts' && (
                  <span className="reordering-indicator"> - Reordering...</span>
                )}
                {reorderingCategories && activeTab === 'transaction_types' && (
                  <span className="reordering-indicator"> - Reordering...</span>
                )}
                {reorderingSubcategories && activeTab === 'subcategories' && (
                  <span className="reordering-indicator"> - Reordering...</span>
                )}
                {reorderingTransactionGroups && activeTab === 'transaction_groups' && (
                  <span className="reordering-indicator"> - Reordering...</span>
                )}
              </h3>
              {isLoadingTransactions && activeTab === 'transactions' ? (
                <div className="loading-state">
                  <div className="spinner"></div>
                  <h3>Loading {transactions.length.toLocaleString()} transactions...</h3>
                  <p>This may take a moment for large datasets</p>
                </div>
              ) : data.length > 0 ? (
                renderTable(data, columns)
              ) : (
                <div className="empty-state">
                  <p>No {t(activeTab)} {t('noDataFound')}</p>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Portal-rendered dropdown */}
      {openDropdownId && createPortal(
        <div 
          className="dropdown-menu portal-dropdown"
          style={{
            position: 'fixed',
            top: `${dropdownPosition.top}px`,
            left: `${dropdownPosition.left}px`,
            width: '120px',
            zIndex: 9999
          }}
        >
          <button 
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              const currentRow = data.find(row => row.id === openDropdownId);
              if (currentRow) {
                handleEdit(currentRow);
                setOpenDropdownId(null);
              }
            }}
            className="dropdown-item"
          >
            ✏️ {t('edit')}
          </button>
          {/* Only show delete button if not protected records */}
          {(() => {
            // Check if this is a protected record
            const isProtectedAccount = activeTab === 'accounts' && openDropdownId === 'ACC001';
            const isProtectedTransactionType = activeTab === 'transaction_types' && ['CAT_001', 'CAT_002', 'CAT_003', 'CAT_004', 'CAT_005'].includes(openDropdownId);
            const isProtectedTransactionGroup = activeTab === 'transaction_groups' && ['GRP_001', 'GRP_002', 'GRP_003', 'GRP_004', 'GRP_005', 'GRP_006'].includes(openDropdownId);
            const isProtectedCurrency = activeTab === 'currencies' && ['CUR_001', 'CUR_002', 'CUR_003', 'CUR_004', 'CUR_005', 'CUR_006', 'CUR_007', 'CUR_008'].includes(openDropdownId); // Protect EUR, USD, AED, GBP, AUD, BTC, ETH, CHF
            
            
            // Show delete button only if not protected
            return !isProtectedAccount && !isProtectedTransactionType && !isProtectedTransactionGroup && !isProtectedCurrency;
          })() && (
            <button 
              onMouseUp={(e) => {
                e.preventDefault();
                e.stopPropagation();
                const currentRow = data.find(row => row.id === openDropdownId);
                if (currentRow) {
                  handleDelete(currentRow);
                  setOpenDropdownId(null);
                }
              }}
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              className="dropdown-item"
              type="button"
            >
              🗑️ {t('delete')}
            </button>
          )}
        </div>,
        document.body
      )}
    </div>
  );
};

export default DataManagement;