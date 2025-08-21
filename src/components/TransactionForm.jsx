import React, { useState } from 'react';
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
    getSubcategoriesWithCategories 
  } = useAccounting();
  const { t, formatCurrency } = useLanguage();
  const accountsWithTypes = getAccountsWithTypes();
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    description: '',
    debitAccount: '',
    creditAccount: '',
    amount: '',
    customerId: '',
    vendorId: '',
    productId: '',
    reference: '',
    notes: '',
    subcategoryId: ''
  });
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // Handle subcategory selection and update category
    if (name === 'subcategoryId') {
      const subcategoriesWithCategories = getSubcategoriesWithCategories();
      const selectedSubcategory = subcategoriesWithCategories.find(sub => sub.id === value);
      setSelectedCategory(selectedSubcategory?.category || null);
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
        customerId: '',
        vendorId: '',
        productId: '',
        reference: '',
        notes: '',
        subcategoryId: ''
      });
      setSelectedCategory(null);
      
      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      setError(t('errorAddingTransaction') + ' ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="transaction-form">
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