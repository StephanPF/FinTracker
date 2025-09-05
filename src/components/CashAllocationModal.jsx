import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAccounting } from '../contexts/AccountingContext';
import { useLanguage } from '../contexts/LanguageContext';
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import './CashAllocationModal.css';

const CashAllocationModal = ({ isOpen, onClose, transaction }) => {
  const { 
    categories, 
    getActiveTransactionGroups, 
    getActiveSubcategories,
    database,
    currencies,
    numberFormatService,
    dateFormatService,
    addCashAllocation,
    getCashWithdrawalAllocations,
    deleteCashAllocationsByTransaction
  } = useAccounting();
  const { t } = useLanguage();

  const [allocations, setAllocations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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

  // Initialize with existing allocations when modal opens
  useEffect(() => {
    if (isOpen && transaction) {
      loadExistingAllocations();
    }
  }, [isOpen, transaction]);

  const loadExistingAllocations = async () => {
    if (!transaction) return;
    
    try {
      const existingAllocations = getCashWithdrawalAllocations(transaction.id);
      // Filter out automatic allocations - only show manual allocations in the UI
      const manualAllocations = existingAllocations.filter(allocation => !allocation.isAutomatic);
      
      if (manualAllocations.length > 0) {
        setAllocations(manualAllocations.map(allocation => ({
          id: allocation.id,
          categoryId: allocation.categoryId || 'CAT_002', // Default to Expenses
          transactionGroupId: allocation.transactionGroupId,
          subcategoryId: allocation.subcategoryId,
          amount: Math.abs(allocation.amount),
          description: allocation.description,
          dateSpent: allocation.dateSpent || ''
        })));
      } else {
        // Start with one empty allocation row
        addNewAllocationRow();
      }
    } catch (err) {
      console.error('Error loading existing allocations:', err);
      addNewAllocationRow();
    }
  };

  const addNewAllocationRow = () => {
    setAllocations(prev => [...prev, {
      id: null, // null means it's a new allocation
      categoryId: 'CAT_002', // Default to Expenses
      transactionGroupId: '',
      subcategoryId: '',
      amount: '',
      description: '',
      dateSpent: ''
    }]);
  };

  const removeAllocationRow = (index) => {
    setAllocations(prev => prev.filter((_, i) => i !== index));
  };

  const updateAllocation = (index, field, value) => {
    setAllocations(prev => prev.map((allocation, i) => {
      if (i === index) {
        const updated = { ...allocation, [field]: value };
        
        // Clear dependent fields when parent changes
        if (field === 'categoryId') {
          updated.transactionGroupId = '';
          updated.subcategoryId = '';
        } else if (field === 'transactionGroupId') {
          updated.subcategoryId = '';
        }
        
        return updated;
      }
      return allocation;
    }));
  };

  const getAvailableGroups = (categoryId) => {
    if (!categoryId) return [];
    return getActiveTransactionGroups().filter(group => 
      group.transactionTypeId === categoryId
    );
  };

  const getAvailableSubcategories = (transactionGroupId) => {
    if (!transactionGroupId) return [];
    return getActiveSubcategories().filter(sub => 
      sub.groupId === transactionGroupId
    );
  };

  const getTotalAllocated = () => {
    return allocations.reduce((total, allocation) => {
      const amount = parseFloat(allocation.amount) || 0;
      return total + amount;
    }, 0);
  };

  const getUnallocatedAmount = () => {
    if (!transaction) return 0;
    const originalAmount = Math.abs(transaction.amount);
    const allocated = getTotalAllocated();
    return originalAmount - allocated;
  };

  const getCurrencySymbol = () => {
    if (!transaction) return '$';
    
    console.log('Transaction currency ID:', transaction.currencyId);
    console.log('Available currencies:', currencies);
    
    const currency = currencies.find(c => c.id === transaction.currencyId);
    console.log('Found currency:', currency);
    
    if (currency) {
      return currency.symbol || currency.code || '$';
    }
    
    // Fallback to $ if no currency found
    return '$';
  };

  const formatCurrency = (amount) => {
    const numAmount = parseFloat(amount) || 0;
    
    if (!transaction) {
      return `$${numAmount.toFixed(2)}`;
    }
    
    // Find the currency for this transaction
    const currency = currencies.find(c => c.id === transaction.currencyId);
    
    if (currency && numberFormatService) {
      try {
        const formatted = numberFormatService.formatCurrency(numAmount, currency.code);
        // Check if the formatted result already contains currency symbol
        if (formatted.includes(currency.symbol || currency.code)) {
          return formatted;
        } else {
          // NumberFormatService returned just the number, add currency symbol
          return `${currency.symbol || currency.code}${formatted}`;
        }
      } catch (error) {
        console.warn('Error formatting currency with numberFormatService:', error);
        return `${currency.symbol || currency.code}${numAmount.toFixed(2)}`;
      }
    }
    
    // Fallback: use currency symbol if available
    if (currency) {
      const symbol = currency.symbol || currency.code;
      return `${symbol}${numAmount.toFixed(2)}`;
    }
    
    // Final fallback
    return `$${numAmount.toFixed(2)}`;
  };

  const validateAllocations = () => {
    const totalAllocated = getTotalAllocated();
    const originalAmount = Math.abs(transaction.amount);
    
    if (totalAllocated > originalAmount) {
      setError(t('totalAllocatedExceeds').replace('{allocated}', formatCurrency(totalAllocated)).replace('{withdrawal}', formatCurrency(originalAmount)));
      return false;
    }
    
    // Check for incomplete allocations
    const incompleteAllocations = allocations.filter(allocation => 
      allocation.amount && (!allocation.categoryId || !allocation.transactionGroupId)
    );
    
    if (incompleteAllocations.length > 0) {
      setError(t('completeAllocationRows'));
      return false;
    }
    
    setError('');
    return true;
  };

  const handleSave = async () => {
    console.log('=== SAVE ALLOCATION DEBUG ===');
    console.log('Current allocations:', allocations);
    
    if (!validateAllocations()) {
      console.log('Validation failed');
      return;
    }
    
    setLoading(true);
    try {
      // Filter out empty allocations
      const validAllocations = allocations.filter(allocation => 
        allocation.amount && parseFloat(allocation.amount) > 0
      );
      
      console.log('Valid allocations to save:', validAllocations);
      console.log('Transaction ID:', transaction.id);
      
      // Delete existing allocations
      console.log('Deleting existing allocations...');
      const deleteResult = deleteCashAllocationsByTransaction(transaction.id);
      console.log('Delete result:', deleteResult);
      
      // Add new allocations
      console.log('Adding new allocations...');
      for (const allocation of validAllocations) {
        const allocationData = {
          parentTransactionId: transaction.id,
          categoryId: allocation.categoryId,
          transactionGroupId: allocation.transactionGroupId,
          subcategoryId: allocation.subcategoryId,
          amount: -Math.abs(parseFloat(allocation.amount)), // Negative for expenses
          description: allocation.description,
          dateSpent: allocation.dateSpent,
          isAutomatic: false // Manual allocation
        };
        
        console.log('Saving allocation:', allocationData);
        const result = await addCashAllocation(allocationData);
        console.log('Allocation saved:', result);
      }
      
      // Create automatic allocation for any remaining unallocated amount
      const originalAmount = Math.abs(transaction.amount);
      const totalManuallyAllocated = validAllocations.reduce((total, allocation) => 
        total + Math.abs(parseFloat(allocation.amount)), 0
      );
      const unallocatedAmount = originalAmount - totalManuallyAllocated;
      
      if (unallocatedAmount > 0) {
        console.log('Creating automatic allocation for unallocated amount:', unallocatedAmount);
        
        // Get transactionGroupId from the subcategory of the parent transaction
        let transactionGroupId = null;
        if (transaction.subcategoryId) {
          const subcategory = getActiveSubcategories().find(sub => sub.id === transaction.subcategoryId);
          transactionGroupId = subcategory ? subcategory.groupId : null;
        }
        
        const automaticAllocationData = {
          parentTransactionId: transaction.id,
          categoryId: transaction.categoryId, // Inherit from parent transaction
          transactionGroupId: transactionGroupId, // Get from parent transaction's subcategory
          subcategoryId: transaction.subcategoryId, // Inherit from parent transaction
          amount: -Math.abs(unallocatedAmount), // Negative for expenses
          description: t('automaticAllocation'),
          dateSpent: transaction.date, // Use parent transaction date
          isAutomatic: true // Flag as automatic
        };
        
        console.log('Saving automatic allocation:', automaticAllocationData);
        const automaticResult = await addCashAllocation(automaticAllocationData);
        console.log('Automatic allocation saved:', automaticResult);
      }
      
      // Check what's in the database now
      console.log('Allocations in database after save:', database.getCashWithdrawalAllocations(transaction.id));
      
      onClose();
    } catch (err) {
      console.error('Error saving allocations:', err);
      setError('Failed to save allocations');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !transaction) return null;

  return createPortal(
    <div className="modal-overlay">
      <div className="cash-allocation-modal">
        <div className="modal-header">
          <h2>{t('allocateCashWithdrawal')}</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        
        <div className="modal-body">
          {/* Withdrawal Summary */}
          <div className="withdrawal-summary">
            <div className="summary-row">
              <span className="label">{t('totalWithdrawal')}</span>
              <span className="amount total">{formatCurrency(Math.abs(transaction.amount))}</span>
            </div>
            <div className="summary-row">
              <span className="label">{t('totalAllocated')}</span>
              <span className="amount allocated">{formatCurrency(getTotalAllocated())}</span>
            </div>
            <div className="summary-row">
              <span className="label">{t('unallocated')}</span>
              <span className={`amount unallocated ${getUnallocatedAmount() < 0 ? 'negative' : ''}`}>
                {formatCurrency(getUnallocatedAmount())}
              </span>
            </div>
          </div>

          {error && <div className="error-message">{error}</div>}

          {/* Allocation Rows */}
          <div className="allocations-container">
            <h3>{t('allocations')}</h3>
            {allocations.map((allocation, index) => (
              <div key={index} className="allocation-row">
                <div className="allocation-fields">
                  <div className="field-group date-field">
                    <DatePicker
                      selected={allocation.dateSpent ? new Date(allocation.dateSpent + 'T12:00:00') : null}
                      onChange={(date) => {
                        if (date) {
                          // Use local date to avoid timezone issues
                          const year = date.getFullYear();
                          const month = (date.getMonth() + 1).toString().padStart(2, '0');
                          const day = date.getDate().toString().padStart(2, '0');
                          const isoString = `${year}-${month}-${day}`;
                          updateAllocation(index, 'dateSpent', isoString);
                        } else {
                          updateAllocation(index, 'dateSpent', '');
                        }
                      }}
                      dateFormat={datePickerFormat}
                      className="date-picker-input"
                      placeholderText={t('when')}
                      showPopperArrow={false}
                    />
                  </div>

                  <div className="field-group transaction-category">
                    <label>{t('transactionCategory')}</label>
                    <select
                      value={allocation.categoryId}
                      onChange={(e) => updateAllocation(index, 'categoryId', e.target.value)}
                      disabled={true}
                      style={{
                        backgroundColor: '#ffffff',
                        color: '#6c757d',
                        opacity: 1,
                        cursor: 'not-allowed',
                        border: '1px solid #dee2e6'
                      }}
                    >
                      <option value="">{t('selectCategory')}</option>
                      {categories.filter(cat => cat.id !== 'CAT_003').map(category => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="field-group">
                    <select
                      value={allocation.transactionGroupId}
                      onChange={(e) => updateAllocation(index, 'transactionGroupId', e.target.value)}
                      disabled={!allocation.categoryId}
                    >
                      <option value="">{t('selectTransactionGroup')}</option>
                      {getAvailableGroups(allocation.categoryId).map(group => (
                        <option key={group.id} value={group.id}>
                          {group.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="field-group">
                    <select
                      value={allocation.subcategoryId}
                      onChange={(e) => updateAllocation(index, 'subcategoryId', e.target.value)}
                      disabled={!allocation.transactionGroupId}
                    >
                      <option value="">{t('selectSubcategory')}</option>
                      {getAvailableSubcategories(allocation.transactionGroupId).map(sub => (
                        <option key={sub.id} value={sub.id}>
                          {sub.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="field-group">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={allocation.amount}
                      onChange={(e) => updateAllocation(index, 'amount', e.target.value)}
                      placeholder={`0.00 ${getCurrencySymbol()}`}
                    />
                  </div>

                  <div className="field-group">
                    <input
                      type="text"
                      value={allocation.description}
                      onChange={(e) => updateAllocation(index, 'description', e.target.value)}
                      placeholder={t('whatWasThisFor')}
                    />
                  </div>

                  <div className="field-group">
                    <button
                      type="button"
                      className="remove-btn"
                      onClick={() => removeAllocationRow(index)}
                      disabled={allocations.length === 1}
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <button
            type="button"
            className="add-allocation-btn"
            onClick={addNewAllocationRow}
          >
            {t('addAllocation')}
          </button>
        </div>

        <div className="modal-footer">
          <button
            type="button"
            className="btn-secondary"
            onClick={onClose}
            disabled={loading}
          >
            {t('cancel')}
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={handleSave}
            disabled={loading || allocations.length === 0}
          >
            {loading ? t('saving') : t('saveAllocations')}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default CashAllocationModal;