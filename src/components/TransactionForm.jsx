import React, { useState, useEffect } from 'react';
import { useAccounting } from '../contexts/AccountingContext';
import { useLanguage } from '../contexts/LanguageContext';

const TransactionForm = ({ onSuccess }) => {
  const { 
    accounts, 
    tags, 
    payees,
    addTransaction, 
    resetToSetup, 
    getAccountsWithTypes,
    getActiveSubcategories,
    getSubcategoriesWithCategories,
    getActiveCategories,
    getActivePayees,
    currencies,
    exchangeRateService,
    getActiveCurrencies 
  } = useAccounting();
  const { t } = useLanguage();
  const accountsWithTypes = getAccountsWithTypes();
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    description: '',
    debitAccount: '',
    creditAccount: '',
    amount: '',
    accountId: '', // New field for the default account
    destinationAccountId: '', // New field for destination account (transfers)
    currencyId: 'CUR_001', // Default to EUR (base currency)
    exchangeRate: 1.0,
    productId: '',
    reference: '',
    notes: '',
    subcategoryId: '',
    payee: '',
    tag: ''
  });
  const [isDescriptionUserModified, setIsDescriptionUserModified] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedTransactionType, setSelectedTransactionType] = useState(null);
  
  // Payee autocomplete state
  const [payeeInput, setPayeeInput] = useState('');
  const [showPayeeDropdown, setShowPayeeDropdown] = useState(false);
  const [filteredPayees, setFilteredPayees] = useState([]);
  
  // Tag autocomplete state
  const [tagInput, setTagInput] = useState('');
  const [showTagDropdown, setShowTagDropdown] = useState(false);
  const [filteredTags, setFilteredTags] = useState([]);

  // Initialize with first transaction type on load
  useEffect(() => {
    const activeCategories = getActiveCategories();
    if (activeCategories.length > 0 && !selectedTransactionType) {
      setSelectedTransactionType(activeCategories[0]);
    }
  }, [getActiveCategories, selectedTransactionType]);

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

  const handleChange = (e) => {
    const { name, value } = e.target;
    
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
    
    // Handle currency changes and update exchange rate
    if (name === 'currencyId' && exchangeRateService) {
      const baseCurrencyId = exchangeRateService.getBaseCurrencyId();
      const exchangeRate = value === baseCurrencyId ? 1.0 : 
        exchangeRateService.getExchangeRateWithFallback(value, baseCurrencyId, 1.0);
      
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
    
    if (!formData.description || !formData.debitAccount || !formData.creditAccount || !formData.amount) {
      setError(t('fillAllFields'));
      return;
    }

    if (formData.debitAccount === formData.creditAccount) {
      setError(t('differentAccounts'));
      return;
    }

    if (parseFloat(formData.amount) <= 0) {
      setError(t('amountGreaterZero'));
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      // Ensure date is always set to today if empty
      const transactionData = {
        ...formData,
        date: formData.date || new Date().toISOString().split('T')[0]
      };
      
      await addTransaction(transactionData);
      
      setFormData({
        date: new Date().toISOString().split('T')[0],
        description: '',
        debitAccount: '',
        creditAccount: '',
        amount: '',
        accountId: '',
        destinationAccountId: '',
        currencyId: 'CUR_001',
        exchangeRate: 1.0,
        customerId: '',
        vendorId: '',
        productId: '',
        reference: '',
        notes: '',
        subcategoryId: '',
        payee: '',
        tag: ''
      });
      setSelectedCategory(null);
      setIsDescriptionUserModified(false);
      setPayeeInput('');
      setShowPayeeDropdown(false);
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
    // Set default account, destination account, description and clear selected subcategory when transaction type changes
    setFormData(prev => ({
      ...prev,
      subcategoryId: '',
      accountId: transactionType.defaultAccountId || '',
      destinationAccountId: transactionType.destinationAccountId || '',
      description: isDescriptionUserModified ? prev.description : transactionType.name
    }));
    setSelectedCategory(null);
    // Only reset user modification flag if description wasn't manually changed
    if (!isDescriptionUserModified) {
      setIsDescriptionUserModified(false);
    }
  };

  // Filter subcategories based on selected transaction type
  const getSubcategoriesByTransactionType = () => {
    const subcategoriesWithCategories = getSubcategoriesWithCategories();
    
    if (!selectedTransactionType) {
      return subcategoriesWithCategories;
    }
    
    return subcategoriesWithCategories.filter(subcategory => {
      return subcategory.categoryId === selectedTransactionType.id;
    });
  };

  const handleSubcategorySelect = (subcategoryId) => {
    const subcategoriesWithCategories = getSubcategoriesWithCategories();
    const selectedSubcategory = subcategoriesWithCategories.find(sub => sub.id === subcategoryId);
    
    setFormData(prev => ({
      ...prev,
      subcategoryId: subcategoryId,
      description: isDescriptionUserModified ? prev.description : selectedSubcategory?.name || ''
    }));
    setSelectedCategory(selectedSubcategory?.category || null);
  };

  // Payee autocomplete handlers
  const handlePayeeInputChange = (e) => {
    const value = e.target.value;
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

      {/* Subcategory Selection Cards */}
      <div className="subcategory-cards">
        {getSubcategoriesByTransactionType().map(subcategory => (
          <div
            key={subcategory.id}
            className={`subcategory-card ${formData.subcategoryId === subcategory.id ? 'selected' : ''}`}
            onClick={() => handleSubcategorySelect(subcategory.id)}
            style={{
              background: formData.subcategoryId === subcategory.id && selectedTransactionType
                ? `linear-gradient(135deg, ${selectedTransactionType.color}20, ${selectedTransactionType.color}40)`
                : undefined,
              borderColor: formData.subcategoryId === subcategory.id && selectedTransactionType
                ? selectedTransactionType.color
                : undefined
            }}
          >
            <span className="subcategory-name">{subcategory.name}</span>
            <span className="subcategory-category">{subcategory.group?.name || 'No Group'}</span>
          </div>
        ))}
      </div>

      {/* Default Account and Amount Section */}
      {selectedTransactionType && (
        <div className="transaction-quick-entry">
          <div className="quick-entry-description">
            <input
              type="text"
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder={t('enterDescription')}
              className={!isDescriptionUserModified && formData.description ? 'default-description' : ''}
            />
          </div>
          <div className="quick-entry-row">
            <div className="quick-entry-account">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                {selectedTransactionType && selectedTransactionType.name === 'Transfer' && (
                  <span style={{ fontSize: '1.5rem' }}>
                    ⬇️
                  </span>
                )}
                <select
                  name="accountId" 
                  value={formData.accountId || selectedTransactionType.defaultAccountId || ''}
                  onChange={handleChange}
                  style={{ flex: 1 }}
                >
                  <option value="">Select Account</option>
                  {accountsWithTypes.map(account => (
                    <option key={account.id} value={account.id}>
                      {account.name}
                    </option>
                  ))}
                </select>
              </div>
              {selectedTransactionType && selectedTransactionType.name === 'Transfer' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontSize: '1.5rem' }}>
                    ➡️
                  </span>
                  <select
                    name="destinationAccountId"
                    value={formData.destinationAccountId || selectedTransactionType.destinationAccountId || ''}
                    onChange={handleChange}
                    style={{ flex: 1 }}
                  >
                    <option value="">Select Destination Account</option>
                    {accountsWithTypes.map(account => (
                      <option key={account.id} value={account.id}>
                        {account.name}
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
                  name="amount"
                  value={formData.amount}
                  onChange={handleChange}
                  placeholder="0.00"
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
            </div>
          </div>
        </div>
      )}

      {/* Payee Autocomplete Section */}
      {selectedTransactionType && (
        <div className="transaction-quick-entry">
          <div className="quick-entry-description">
            <div className="payee-autocomplete-container">
              <input
                type="text"
                id="payee"
                name="payee"
                value={payeeInput}
                onChange={handlePayeeInputChange}
                onBlur={handlePayeeInputBlur}
                onFocus={() => payeeInput.length > 0 && setShowPayeeDropdown(true)}
                placeholder="👤 Start typing payee name..."
              />
              
              {showPayeeDropdown && filteredPayees.length > 0 && (
                <div className="payee-dropdown">
                  {filteredPayees.map(payee => (
                    <div
                      key={payee.id}
                      className="payee-option"
                      onClick={() => handlePayeeSelect(payee)}
                    >
                      {payee.name}
                    </div>
                  ))}
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

    </div>
  );
};

export default TransactionForm;