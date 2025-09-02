import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAccounting } from '../contexts/AccountingContext';
import './CashAllocationModal.css';

const CashAllocationModal = ({ isOpen, onClose, transaction }) => {
  const { 
    categories, 
    getActiveTransactionGroups, 
    getActiveSubcategories,
    database,
    currencies,
    numberFormatService,
    addCashAllocation,
    getCashWithdrawalAllocations,
    deleteCashAllocationsByTransaction
  } = useAccounting();

  const [allocations, setAllocations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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
      if (existingAllocations.length > 0) {
        setAllocations(existingAllocations.map(allocation => ({
          id: allocation.id,
          categoryId: allocation.categoryId || 'CAT_002', // Default to Expenses
          transactionGroupId: allocation.transactionGroupId,
          subcategoryId: allocation.subcategoryId,
          amount: Math.abs(allocation.amount),
          description: allocation.description
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
      description: ''
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
      setError(`Total allocated amount (${formatCurrency(totalAllocated)}) exceeds withdrawal amount (${formatCurrency(originalAmount)})`);
      return false;
    }
    
    // Check for incomplete allocations
    const incompleteAllocations = allocations.filter(allocation => 
      allocation.amount && (!allocation.categoryId || !allocation.transactionGroupId)
    );
    
    if (incompleteAllocations.length > 0) {
      setError('Please complete all allocation rows with amounts');
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
          description: allocation.description
        };
        
        console.log('Saving allocation:', allocationData);
        const result = await addCashAllocation(allocationData);
        console.log('Allocation saved:', result);
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
          <h2>Allocate Cash Withdrawal</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        
        <div className="modal-body">
          {/* Withdrawal Summary */}
          <div className="withdrawal-summary">
            <div className="summary-row">
              <span className="label">Total Withdrawal:</span>
              <span className="amount total">{formatCurrency(Math.abs(transaction.amount))}</span>
            </div>
            <div className="summary-row">
              <span className="label">Total Allocated:</span>
              <span className="amount allocated">{formatCurrency(getTotalAllocated())}</span>
            </div>
            <div className="summary-row">
              <span className="label">Unallocated:</span>
              <span className={`amount unallocated ${getUnallocatedAmount() < 0 ? 'negative' : ''}`}>
                {formatCurrency(getUnallocatedAmount())}
              </span>
            </div>
          </div>

          {error && <div className="error-message">{error}</div>}

          {/* Allocation Rows */}
          <div className="allocations-container">
            <h3>Allocations</h3>
            {allocations.map((allocation, index) => (
              <div key={index} className="allocation-row">
                <div className="allocation-fields">
                  <div className="field-group transaction-category">
                    <label>Transaction Category</label>
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
                      <option value="">Select Category</option>
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
                      <option value="">Select Transaction Group</option>
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
                      <option value="">Select Category</option>
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
                      placeholder="What was this for?"
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
            + Add Allocation
          </button>
        </div>

        <div className="modal-footer">
          <button
            type="button"
            className="btn-secondary"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={handleSave}
            disabled={loading || allocations.length === 0}
          >
            {loading ? 'Saving...' : 'Save Allocations'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default CashAllocationModal;