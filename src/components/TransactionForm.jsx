import React, { useState, useEffect } from 'react';
import { useAccounting } from '../contexts/AccountingContext';
import { useLanguage } from '../contexts/LanguageContext';

const TransactionForm = ({ onSuccess }) => {
  const { 
    accounts, 
    customers, 
    vendors, 
    tags, 
    addTransaction, 
    resetToSetup, 
    getAccountsWithTypes,
    getActiveSubcategories,
    getSubcategoriesWithCategories,
    getActiveCategories,
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
    customerId: '',
    vendorId: '',
    productId: '',
    reference: '',
    notes: '',
    subcategoryId: ''
  });
  const [isDescriptionUserModified, setIsDescriptionUserModified] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedTransactionType, setSelectedTransactionType] = useState(null);

  // Initialize with first transaction type on load
  useEffect(() => {
    const activeCategories = getActiveCategories();
    if (activeCategories.length > 0 && !selectedTransactionType) {
      setSelectedTransactionType(activeCategories[0]);
    }
  }, [getActiveCategories, selectedTransactionType]);

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
        subcategoryId: ''
      });
      setSelectedCategory(null);
      setIsDescriptionUserModified(false);
      
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
                    ⬅️
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

      <form onSubmit={handleSubmit} className="form">
        {error && (
          <div className="error-message">
            ⚠️ {error}
          </div>
        )}

        {/* Section 1: Basic Transaction Information */}
        <div className="form-section">
          <h4 className="section-title">📋 {t('transactionDetails')}</h4>
          
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="date">📅 {t('date')}</label>
              <input
                type="date"
                id="date"
                name="date"
                value={formData.date}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group amount-group">
              <label htmlFor="amount">💰 {t('amount')}</label>
              <input
                type="number"
                id="amount"
                name="amount"
                value={formData.amount}
                onChange={handleChange}
                placeholder="0.00"
                step="0.01"
                min="0.01"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="currencyId">💱 {t('currency')}</label>
              <select
                id="currencyId"
                name="currencyId"
                value={formData.currencyId}
                onChange={handleChange}
                required
              >
                {getActiveCurrencies().map(currency => (
                  <option key={currency.id} value={currency.id}>
                    {currency.symbol} {currency.name} ({currency.code})
                  </option>
                ))}
              </select>
              {formData.exchangeRate !== 1.0 && exchangeRateService && (
                <div className="exchange-rate-info">
                  <small>
                    {t('exchangeRate')}: 1 {currencies.find(c => c.id === formData.currencyId)?.code} = {formData.exchangeRate.toFixed(4)} {currencies.find(c => c.id === exchangeRateService.getBaseCurrencyId())?.code}
                  </small>
                  <small>
                    {t('amountInBaseCurrency')}: {exchangeRateService.formatAmount(
                      (parseFloat(formData.amount) || 0) * formData.exchangeRate, 
                      exchangeRateService.getBaseCurrencyId()
                    )}
                  </small>
                </div>
              )}
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="description">📝 {t('description')}</label>
            <input
              type="text"
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder={t('enterDescription')}
              required
            />
          </div>
        </div>

        {/* Section 2: Categorization */}
        <div className="form-section">
          <h4 className="section-title">🏷️ {t('categorization')}</h4>
          
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="subcategoryId">🏷️ {t('subcategory')}</label>
              <select
                id="subcategoryId"
                name="subcategoryId"
                value={formData.subcategoryId}
                onChange={handleChange}
              >
                <option value="">{t('selectSubcategory')}</option>
                {getSubcategoriesWithCategories().map(subcategory => (
                  <option key={subcategory.id} value={subcategory.id}>
                    {subcategory.name} ({subcategory.category?.name})
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="category">📂 {t('category')}</label>
              <input
                type="text"
                id="category"
                name="category"
                value={selectedCategory ? `${selectedCategory.icon} ${selectedCategory.name}` : ''}
                placeholder={t('selectSubcategory')}
                readOnly
                className="readonly-field"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Account Movement */}
        <div className="form-section">
          <h4 className="section-title">💫 {t('accountMovement')}</h4>
          
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="debitAccount">📤 {t('debitAccount')}</label>
              <select
                id="debitAccount"
                name="debitAccount"
                value={formData.debitAccount}
                onChange={handleChange}
                required
              >
                <option value="">{t('selectDebitAccount')}</option>
                {accountsWithTypes.map(account => (
                  <option key={account.id} value={account.id}>
                    {account.name} ({account.accountType ? account.accountType.type : 'Unknown'})
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="creditAccount">📥 {t('creditAccount')}</label>
              <select
                id="creditAccount"
                name="creditAccount"
                value={formData.creditAccount}
                onChange={handleChange}
                required
              >
                <option value="">{t('selectCreditAccount')}</option>
                {accountsWithTypes.map(account => (
                  <option key={account.id} value={account.id}>
                    {account.name} ({account.accountType ? account.accountType.type : 'Unknown'})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Section 4: Additional Details (Optional) */}
        <div className="form-section optional-section">
          <h4 className="section-title">📎 {t('additionalDetails')}</h4>
          
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="reference">🔗 {t('reference')}</label>
              <input
                type="text"
                id="reference"
                name="reference"
                value={formData.reference}
                onChange={handleChange}
                placeholder={t('referencePlaceholder')}
              />
            </div>

            <div className="form-group">
              <label htmlFor="vendorId">🏢 {t('vendor')}</label>
              <select
                id="vendorId"
                name="vendorId"
                value={formData.vendorId}
                onChange={handleChange}
              >
                <option value="">{t('selectVendor')}</option>
                {vendors.map(vendor => (
                  <option key={vendor.id} value={vendor.id}>
                    {vendor.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="customerId">👥 {t('customer')}</label>
              <select
                id="customerId"
                name="customerId"
                value={formData.customerId}
                onChange={handleChange}
              >
                <option value="">{t('selectCustomer')}</option>
                {customers.map(customer => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="productId">📦 {t('productService')}</label>
              <select
                id="productId"
                name="productId"
                value={formData.productId}
                onChange={handleChange}
              >
                <option value="">{t('selectProductService')}</option>
                {tags.map(tag => (
                  <option key={tag.id} value={tag.id}>
                    {tag.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="notes">📋 {t('notes')}</label>
            <textarea
              id="notes"
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              placeholder={t('notesPlaceholder')}
              rows="3"
            />
          </div>
        </div>

        <div className="double-entry-explanation">
          <h4>📊 {t('doubleEntryTitle')}</h4>
          <p>
            <strong>{t('debitAccount')}:</strong> {t('debitExplanation')}
            <br />
            <strong>{t('creditAccount')}:</strong> {t('creditExplanation')}
            <br />
            <strong>Foreign Keys:</strong> {t('foreignKeysExplanation')}
          </p>
        </div>

        <div className="form-actions">
          <button
            type="submit"
            disabled={loading}
            className="submit-btn"
          >
            {loading ? '💾 ' + t('saving') : '💾 ' + t('addTransactionBtn')}
          </button>
        </div>
      </form>
    </div>
  );
};

export default TransactionForm;