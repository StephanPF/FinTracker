import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import './TransactionEditModal.css';

const TransactionEditModal = ({ transaction, accounts, categories = [], currencies = [], transactionTypes = [], subcategories = [], transactionGroups = [], onSave, onClose }) => {
  const [formData, setFormData] = useState({
    date: transaction.date || '',
    description: transaction.description || '',
    amount: transaction.amount || 0,
    fromAccountId: transaction.fromAccountId || '',
    toAccountId: transaction.toAccountId || '',
    destinationAccountId: transaction.destinationAccountId || '',
    destinationAmount: transaction.destinationAmount || '',
    transactionType: transaction.transactionType || '',
    transactionGroup: transaction.transactionGroup || '',
    categoryId: transaction.categoryId || '',
    subcategoryId: transaction.subcategoryId || '',
    payee: transaction.payee || '',
    payer: transaction.payer || '',
    tag: transaction.tag || '',
    currencyId: transaction.currencyId || 'CUR_001',
    reference: transaction.reference || '',
    notes: transaction.notes || ''
  });

  // Format account balance in native currency for dropdown
  const formatAccountBalance = (account) => {
    const balance = account.balance || 0;
    const currency = currencies.find(c => c.id === account.currencyId);
    if (currency) {
      return `${currency.symbol}${balance.toFixed(currency.decimalPlaces || 2)}`;
    }
    return balance.toFixed(2);
  };
  
  const [errors, setErrors] = useState({});

  // Convert transactionType string to categoryId when modal loads
  useEffect(() => {
    if (transaction.transactionType && !formData.categoryId && categories.length > 0) {
      const matchingCategory = categories.find(cat => 
        cat.name === transaction.transactionType || 
        cat.name.toLowerCase() === transaction.transactionType.toLowerCase()
      );
      
      if (matchingCategory) {
        setFormData(prev => ({
          ...prev,
          categoryId: matchingCategory.id
        }));
        
        console.log(`✅ Converted transactionType "${transaction.transactionType}" to categoryId "${matchingCategory.id}"`);
      } else {
        console.warn(`⚠️ Could not find category matching transactionType "${transaction.transactionType}". Available categories:`, categories.map(c => c.name));
      }
    }
  }, [transaction.transactionType, categories, formData.categoryId]);

  // Helper functions to determine field requirements based on transaction type
  const shouldShowDestinationAccount = (categoryId) => {
    const category = categories.find(c => c.id === categoryId);
    return category && (
      category.name === 'Transfer' || 
      category.name === 'Investment - SELL' || 
      category.name === 'Investment - BUY'
    );
  };

  const isInvestmentTransaction = (categoryId) => {
    const category = categories.find(c => c.id === categoryId);
    return category && (
      category.name === 'Investment - SELL' || 
      category.name === 'Investment - BUY'
    );
  };

  // Filter transaction groups based on selected transaction type
  const getFilteredTransactionGroups = () => {
    if (!formData.categoryId) return transactionGroups;
    
    const selectedCategory = categories.find(c => c.id === formData.categoryId);
    if (!selectedCategory) return transactionGroups;

    // Filter transaction groups based on the transaction type
    return transactionGroups.filter(group => {
      // If the group has a transactionTypeId property, match it
      if (group.transactionTypeId) {
        return group.transactionTypeId === formData.categoryId;
      }
      
      // If groups have a 'type' field that matches category name
      if (group.type) {
        return group.type === selectedCategory.name;
      }
      
      // If groups have category relationship through categoryId
      if (group.categoryId) {
        return group.categoryId === formData.categoryId;
      }
      
      // Fallback: show all groups if no filtering criteria found
      return true;
    });
  };

  // Filter subcategories based on selected transaction group
  const getFilteredSubcategories = () => {
    if (!formData.transactionGroup) return subcategories;
    
    const selectedGroup = transactionGroups.find(g => g.id === formData.transactionGroup);
    if (!selectedGroup) return subcategories;

    // Filter subcategories based on the transaction group
    return subcategories.filter(subcategory => {
      // If the subcategory has a transactionGroupId property, match it
      if (subcategory.transactionGroupId) {
        return subcategory.transactionGroupId === formData.transactionGroup;
      }
      
      // If subcategories have a 'groupId' field
      if (subcategory.groupId) {
        return subcategory.groupId === formData.transactionGroup;
      }
      
      // If subcategories have group relationship through parentId
      if (subcategory.parentId) {
        return subcategory.parentId === formData.transactionGroup;
      }
      
      // If subcategories have a 'group' field that matches group name
      if (subcategory.group && selectedGroup.name) {
        return subcategory.group === selectedGroup.name;
      }
      
      // Fallback: show all subcategories if no filtering criteria found
      return true;
    });
  };

  const validateForm = () => {
    const newErrors = {};
    const selectedCategory = categories.find(c => c.id === formData.categoryId);

    // Always required fields
    if (!formData.date) {
      newErrors.date = 'Date is required';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    }

    if (!formData.amount || formData.amount === 0 || isNaN(formData.amount)) {
      newErrors.amount = 'Valid amount is required';
    }

    if (!formData.subcategoryId) {
      newErrors.subcategoryId = 'Transaction Category is required';
    }

    if (!formData.categoryId) {
      newErrors.categoryId = 'Transaction Type is required';
    }

    if (!formData.transactionGroup) {
      newErrors.transactionGroup = 'Transaction Group is required';
    }

    // Account validation (always required)
    if (!formData.fromAccountId) {
      newErrors.accounts = 'Account is required';
    }

    // Conditionally required fields based on transaction type
    if (selectedCategory) {
      // Destination Account required for Transfers and Investments
      if (shouldShowDestinationAccount(formData.categoryId) && !formData.destinationAccountId) {
        newErrors.destinationAccountId = 'Destination Account is required';
      }

      // Destination Amount required for Investments
      if (isInvestmentTransaction(formData.categoryId) && (!formData.destinationAmount || formData.destinationAmount === 0)) {
        newErrors.destinationAmount = 'Destination Amount is required';
      }

      // Payee required for Expenses and Investment-BUY
      if ((selectedCategory.name === 'Expenses' || selectedCategory.name === 'Investment - BUY') && !formData.payee) {
        newErrors.payee = 'Payee is required';
      }

      // Payer required for Income and Investment-SELL
      if ((selectedCategory.name === 'Income' || selectedCategory.name === 'Investment - SELL') && !formData.payer) {
        newErrors.payer = 'Payer is required';
      }
    }

    return newErrors;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const newErrors = validateForm();
    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      return; // Don't submit if there are errors
    }

    onSave({
      ...transaction,
      ...formData,
      amount: parseFloat(formData.amount),
      destinationAmount: formData.destinationAmount ? parseFloat(formData.destinationAmount) : null
    });
  };

  const handleChange = (field, value) => {
    const updatedFormData = {
      ...formData,
      [field]: value
    };

    // Clear transaction group if transaction type changes and current group is not valid for new type
    if (field === 'categoryId') {
      const selectedCategory = categories.find(c => c.id === value);
      
      // Sync categoryId to transactionType
      if (selectedCategory) {
        updatedFormData.transactionType = selectedCategory.name;
        console.log(`🔄 Synced categoryId "${value}" to transactionType "${selectedCategory.name}"`);
      }
      
      if (selectedCategory && formData.transactionGroup) {
        // Check if current transaction group is still valid for new transaction type
        const filteredGroups = transactionGroups.filter(group => {
          if (group.transactionTypeId) {
            return group.transactionTypeId === value;
          }
          if (group.type) {
            return group.type === selectedCategory.name;
          }
          if (group.categoryId) {
            return group.categoryId === value;
          }
          return true;
        });
        
        const isCurrentGroupValid = filteredGroups.some(g => g.id === formData.transactionGroup);
        if (!isCurrentGroupValid) {
          updatedFormData.transactionGroup = '';
          updatedFormData.subcategoryId = ''; // Also clear subcategory when group is cleared
        }
      }
    }

    // Clear subcategory if transaction group changes and current subcategory is not valid for new group
    if (field === 'transactionGroup') {
      const selectedGroup = transactionGroups.find(g => g.id === value);
      if (selectedGroup && formData.subcategoryId) {
        // Check if current subcategory is still valid for new transaction group
        const filteredSubcategories = subcategories.filter(subcategory => {
          if (subcategory.transactionGroupId) {
            return subcategory.transactionGroupId === value;
          }
          if (subcategory.groupId) {
            return subcategory.groupId === value;
          }
          if (subcategory.parentId) {
            return subcategory.parentId === value;
          }
          if (subcategory.group && selectedGroup.name) {
            return subcategory.group === selectedGroup.name;
          }
          return true;
        });
        
        const isCurrentSubcategoryValid = filteredSubcategories.some(s => s.id === formData.subcategoryId);
        if (!isCurrentSubcategoryValid) {
          updatedFormData.subcategoryId = '';
        }
      } else if (!value) {
        // Clear subcategory when transaction group is cleared
        updatedFormData.subcategoryId = '';
      }
    }

    setFormData(updatedFormData);
    
    // Clear error for this field when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: undefined
      }));
    }
    
    // Clear account error when either account is selected
    if ((field === 'fromAccountId' || field === 'toAccountId') && value && errors.accounts) {
      setErrors(prev => ({
        ...prev,
        accounts: undefined
      }));
    }
  };

  return createPortal(
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Edit Transaction</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {Object.keys(errors).length > 0 && (
              <div className="form-errors">
                <h4>Please fix the following errors:</h4>
                <ul>
                  {Object.entries(errors).map(([field, error]) => (
                    <li key={field}>{error}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="form-columns">
              <div className="form-column">
                
                <div className="form-field">
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => handleChange('date', e.target.value)}
                    className={errors.date ? 'error' : 'date-picker'}
                    title="Date *"
                    required
                    placeholder="Select date"
                  />
                  {errors.date && <span className="field-error">{errors.date}</span>}
                </div>

                <div className="form-field">
                  <select
                    value={formData.categoryId}
                    onChange={(e) => handleChange('categoryId', e.target.value)}
                    className={errors.categoryId ? 'error' : ''}
                    title="Transaction Type *"
                    required
                  >
                    <option value="">Transaction Type *</option>
                    {categories.map(category => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                  {errors.categoryId && <span className="field-error">{errors.categoryId}</span>}
                </div>

                <div className="form-field">
                  <select
                    value={formData.transactionGroup}
                    onChange={(e) => handleChange('transactionGroup', e.target.value)}
                    className={errors.transactionGroup ? 'error' : ''}
                    title="Transaction Group *"
                    disabled={!formData.categoryId}
                    required
                  >
                    <option value="">
                      {!formData.categoryId ? 'Select Transaction Type first' : 'Transaction Group *'}
                    </option>
                    {getFilteredTransactionGroups().map(group => (
                      <option key={group.id} value={group.id}>
                        {group.name}
                      </option>
                    ))}
                  </select>
                  {errors.transactionGroup && <span className="field-error">{errors.transactionGroup}</span>}
                </div>

                <div className="form-field">
                  <select
                    value={formData.subcategoryId}
                    onChange={(e) => handleChange('subcategoryId', e.target.value)}
                    className={errors.subcategoryId ? 'error' : ''}
                    title="Transaction Category *"
                    required
                    disabled={!formData.transactionGroup}
                  >
                    <option value="">
                      {!formData.transactionGroup ? 'Select Transaction Group first' : 'Transaction Category *'}
                    </option>
                    {getFilteredSubcategories().map(subcategory => (
                      <option key={subcategory.id} value={subcategory.id}>
                        {subcategory.name}
                      </option>
                    ))}
                  </select>
                  {errors.subcategoryId && <span className="field-error">{errors.subcategoryId}</span>}
                </div>

                <div className="form-field">
                  <input
                    type="text"
                    value={formData.description}
                    onChange={(e) => handleChange('description', e.target.value)}
                    className={errors.description ? 'error' : ''}
                    placeholder="Description *"
                    required
                  />
                  {errors.description && <span className="field-error">{errors.description}</span>}
                </div>

                <div className="form-field">
                  <input
                    type="number"
                    step="0.01"
                    value={formData.amount}
                    onChange={(e) => handleChange('amount', e.target.value)}
                    className={errors.amount ? 'error' : ''}
                    placeholder="Amount *"
                    required
                  />
                  {errors.amount && <span className="field-error">{errors.amount}</span>}
                </div>

                {shouldShowDestinationAccount(formData.categoryId) && (
                  <div className="form-field">
                    <select
                      value={formData.destinationAccountId}
                      onChange={(e) => handleChange('destinationAccountId', e.target.value)}
                      className={errors.destinationAccountId ? 'error' : ''}
                      title="Destination Account *"
                    >
                      <option value="">Destination Account *</option>
                      {accounts.map(account => (
                        <option key={account.id} value={account.id}>
                          {account.name} ({account.type}) ({formatAccountBalance(account)})
                        </option>
                      ))}
                    </select>
                    {errors.destinationAccountId && <span className="field-error">{errors.destinationAccountId}</span>}
                  </div>
                )}

                {isInvestmentTransaction(formData.categoryId) && (
                  <div className="form-field">
                    <input
                      type="number"
                      step="0.01"
                      value={formData.destinationAmount}
                      onChange={(e) => handleChange('destinationAmount', e.target.value)}
                      className={errors.destinationAmount ? 'error' : ''}
                      placeholder="Destination Amount *"
                    />
                    {errors.destinationAmount && <span className="field-error">{errors.destinationAmount}</span>}
                  </div>
                )}

              </div>

              <div className="form-column">
                
                <div className="form-field">
                  <select
                    value={formData.fromAccountId}
                    onChange={(e) => handleChange('fromAccountId', e.target.value)}
                    className={errors.accounts ? 'error' : ''}
                    title="Account *"
                  >
                    <option value="">Account *</option>
                    {accounts.map(account => (
                      <option key={account.id} value={account.id}>
                        {account.name} ({account.type}) ({formatAccountBalance(account)})
                      </option>
                    ))}
                  </select>
                  {errors.accounts && <span className="field-error">{errors.accounts}</span>}
                </div>

                {(() => {
                  const selectedCategory = categories.find(c => c.id === formData.categoryId);
                  const shouldShowPayee = selectedCategory && (selectedCategory.name === 'Expenses' || selectedCategory.name === 'Investment - BUY');
                  const shouldShowPayer = selectedCategory && (selectedCategory.name === 'Income' || selectedCategory.name === 'Investment - SELL');
                  
                  return (
                    <>
                      {shouldShowPayee && (
                        <div className="form-field">
                          <input
                            type="text"
                            value={formData.payee}
                            onChange={(e) => handleChange('payee', e.target.value)}
                            className={errors.payee ? 'error' : ''}
                            placeholder="Payee *"
                          />
                          {errors.payee && <span className="field-error">{errors.payee}</span>}
                        </div>
                      )}
                      
                      {shouldShowPayer && (
                        <div className="form-field">
                          <input
                            type="text"
                            value={formData.payer}
                            onChange={(e) => handleChange('payer', e.target.value)}
                            className={errors.payer ? 'error' : ''}
                            placeholder="Payer *"
                          />
                          {errors.payer && <span className="field-error">{errors.payer}</span>}
                        </div>
                      )}
                    </>
                  );
                })()}
                
                <div className="form-field">
                  <input
                    type="text"
                    value={formData.tag}
                    onChange={(e) => handleChange('tag', e.target.value)}
                    className="optional"
                    placeholder="Tag"
                  />
                </div>

                <div className="form-field">
                  <input
                    type="text"
                    value={formData.reference}
                    onChange={(e) => handleChange('reference', e.target.value)}
                    className="optional"
                    placeholder="Reference"
                  />
                </div>

                <div className="form-field">
                  <textarea
                    value={formData.notes}
                    onChange={(e) => handleChange('notes', e.target.value)}
                    className="optional"
                    rows="3"
                    placeholder="Notes"
                  />
                </div>
              </div>
            </div>

          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};

export default TransactionEditModal;