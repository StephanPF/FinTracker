import React, { useState } from 'react';
import './TransactionEditModal.css';

const TransactionEditModal = ({ transaction, accounts, categories = [], currencies = [], onSave, onClose }) => {
  const [formData, setFormData] = useState({
    date: transaction.date || '',
    description: transaction.description || '',
    amount: transaction.amount || 0,
    fromAccountId: transaction.fromAccountId || '',
    toAccountId: transaction.toAccountId || '',
    categoryId: transaction.categoryId || '',
    currencyId: transaction.currencyId || 'CUR_001',
    reference: transaction.reference || '',
    notes: transaction.notes || ''
  });
  
  const [errors, setErrors] = useState({});

  const validateForm = () => {
    const newErrors = {};

    if (!formData.date) {
      newErrors.date = 'Date is required';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    }

    if (!formData.amount || formData.amount === 0 || isNaN(formData.amount)) {
      newErrors.amount = 'Valid amount is required';
    }

    if (!formData.fromAccountId && !formData.toAccountId) {
      newErrors.accounts = 'At least one account must be assigned';
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
      amount: parseFloat(formData.amount)
    });
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
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

  return (
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

            <div className="form-field">
              <label>Date *</label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => handleChange('date', e.target.value)}
                className={errors.date ? 'error' : ''}
                required
              />
              {errors.date && <span className="field-error">{errors.date}</span>}
            </div>

            <div className="form-field">
              <label>Description *</label>
              <input
                type="text"
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
                className={errors.description ? 'error' : ''}
                placeholder="Transaction description"
                required
              />
              {errors.description && <span className="field-error">{errors.description}</span>}
            </div>

            <div className="form-field">
              <label>Amount *</label>
              <input
                type="number"
                step="0.01"
                value={formData.amount}
                onChange={(e) => handleChange('amount', e.target.value)}
                className={errors.amount ? 'error' : ''}
                placeholder="0.00"
                required
              />
              {errors.amount && <span className="field-error">{errors.amount}</span>}
            </div>

            <div className="form-field">
              <label>From Account *</label>
              <select
                value={formData.fromAccountId}
                onChange={(e) => handleChange('fromAccountId', e.target.value)}
                className={errors.accounts ? 'error' : ''}
              >
                <option value="">Select from account...</option>
                {accounts.map(account => (
                  <option key={account.id} value={account.id}>
                    {account.name} ({account.type})
                  </option>
                ))}
              </select>
              {errors.accounts && <span className="field-error">{errors.accounts}</span>}
            </div>

            <div className="form-field">
              <label>To Account</label>
              <select
                value={formData.toAccountId}
                onChange={(e) => handleChange('toAccountId', e.target.value)}
              >
                <option value="">Select to account...</option>
                {accounts.map(account => (
                  <option key={account.id} value={account.id}>
                    {account.name} ({account.type})
                  </option>
                ))}
              </select>
            </div>

            <div className="form-field">
              <label>Category</label>
              <select
                value={formData.categoryId}
                onChange={(e) => handleChange('categoryId', e.target.value)}
              >
                <option value="">Select category...</option>
                {categories.map(category => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-field">
              <label>Reference</label>
              <input
                type="text"
                value={formData.reference}
                onChange={(e) => handleChange('reference', e.target.value)}
                placeholder="Transaction reference or ID"
              />
            </div>

            <div className="form-field">
              <label>Notes</label>
              <textarea
                value={formData.notes}
                onChange={(e) => handleChange('notes', e.target.value)}
                rows="3"
                placeholder="Additional notes about this transaction"
              />
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
    </div>
  );
};

export default TransactionEditModal;