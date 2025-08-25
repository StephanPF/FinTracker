import React, { useState, useEffect } from 'react';
import { useAccounting } from '../contexts/AccountingContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useDate } from '../hooks/useDate';
import CurrencyManager from './CurrencyManager';

const DataManagement = () => {
  const { 
    accounts, 
    transactions, 
    tags,
    addAccount,
    addProduct,
    addTransaction,
    updateAccount,
    updateProduct,
    updateTransaction,
    deleteAccount,
    deleteTransaction,
    deleteProduct,
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
    numberFormatService
  } = useAccounting();
  const { t } = useLanguage();
  const { formatDate, formatForInput } = useDate();
  const accountsWithTypes = getAccountsWithTypes();
  const accountTypes = getAccountTypes();

  
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
      setFormData({ date: new Date().toISOString().split('T')[0] });
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
      const mappedData = {
        ...record,
        debitAccount: record.debitAccountId,
        creditAccount: record.creditAccountId
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
    const shouldFlipUp = spaceBelow < dropdownHeight;
    
    setDropdownUp(shouldFlipUp);
    setOpenDropdownId(rowId);
  };

  const handleDelete = async (record) => {
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
                    onMouseDown={(e) => console.log('Mouse down on handle')}
                    onMouseUp={(e) => console.log('Mouse up on handle')}
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
                  {openDropdownId === row.id && (
                    <div 
                      className={`dropdown-menu ${dropdownUp ? 'dropdown-up' : ''}`}
                    >
                      <button 
                        onClick={() => {
                          handleEdit(row);
                          setOpenDropdownId(null);
                        }}
                        className="dropdown-item"
                      >
                        ✏️ {t('edit')}
                      </button>
                      <button 
                        onClick={() => {
                          handleDelete(row);
                          setOpenDropdownId(null);
                        }}
                        className="dropdown-item"
                      >
                        🗑️ {t('delete')}
                      </button>
                    </div>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const renderAccountForm = () => (
    <form onSubmit={handleSubmit} className="data-form account-form">
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
          value={formData.balance || ''}
          onChange={(e) => handleInputChange('balance', parseFloat(e.target.value) || 0)}
        />
      </div>
      <div className="form-actions">
        <button type="submit" className="btn-primary">
          {editingId ? t('updateAccount') : t('addAccount')}
        </button>
      </div>
    </form>
  );



  const renderTransactionForm = () => (
    <form onSubmit={handleSubmit} className="data-form">
      <div className="form-group">
        <label>Description</label>
        <input
          type="text"
          value={formData.description || ''}
          onChange={(e) => handleInputChange('description', e.target.value)}
          required
        />
      </div>
      <div className="form-group">
        <label>Amount</label>
        <input
          type="number"
          step="0.01"
          value={formData.amount || ''}
          onChange={(e) => handleInputChange('amount', parseFloat(e.target.value) || 0)}
          required
        />
      </div>
      <div className="form-group">
        <label>Debit Account</label>
        <select
          value={formData.debitAccount || ''}
          onChange={(e) => handleInputChange('debitAccount', e.target.value)}
          required
        >
          <option value="">Select Account</option>
          {accountsWithTypes.map(account => (
            <option key={account.id} value={account.id}>
              {account.name} ({account.accountType ? account.accountType.type : 'Unknown'})
            </option>
          ))}
        </select>
      </div>
      <div className="form-group">
        <label>Credit Account</label>
        <select
          value={formData.creditAccount || ''}
          onChange={(e) => handleInputChange('creditAccount', e.target.value)}
          required
        >
          <option value="">Select Account</option>
          {accountsWithTypes.map(account => (
            <option key={account.id} value={account.id}>
              {account.name} ({account.accountType ? account.accountType.type : 'Unknown'})
            </option>
          ))}
        </select>
      </div>
      <div className="form-group">
        <label>Date</label>
        <input
          type="date"
          value={formData.date ? formatForInput(formData.date) : new Date().toISOString().split('T')[0]}
          onChange={(e) => handleInputChange('date', e.target.value)}
          required
        />
      </div>
      <div className="form-group">
        <label>{t('category')}</label>
        <select
          value={formData.categoryId || ''}
          onChange={(e) => handleInputChange('categoryId', e.target.value)}
        >
          <option value="">{t('selectCategory')}</option>
          {categories.map(category => (
            <option key={category.id} value={category.id}>
              {category.icon} {category.name}
            </option>
          ))}
        </select>
      </div>
      <div className="form-group">
        <label>{t('subcategory')}</label>
        <select
          value={formData.subcategoryId || ''}
          onChange={(e) => handleInputChange('subcategoryId', e.target.value)}
        >
          <option value="">{t('selectSubcategory')}</option>
          {subcategories.map(subcategory => (
            <option key={subcategory.id} value={subcategory.id}>
              {subcategory.name}
            </option>
          ))}
        </select>
      </div>
      <div className="form-group">
        <label>{t('productService')}</label>
        <select
          value={formData.productId || ''}
          onChange={(e) => handleInputChange('productId', e.target.value)}
        >
          <option value="">{t('selectProductService')}</option>
          {tags.map(tag => (
            <option key={tag.id} value={tag.id}>
              {tag.name}
            </option>
          ))}
        </select>
      </div>
      <div className="form-group">
        <label>{t('reference')}</label>
        <input
          type="text"
          value={formData.reference || ''}
          onChange={(e) => handleInputChange('reference', e.target.value)}
          placeholder={t('referencePlaceholder')}
        />
      </div>
      <div className="form-group">
        <label>{t('notes')}</label>
        <textarea
          value={formData.notes || ''}
          onChange={(e) => handleInputChange('notes', e.target.value)}
          placeholder={t('notesPlaceholder')}
          rows="3"
        />
      </div>
      <div className="form-actions">
        <button type="submit" className="btn-primary">
          {editingId ? t('updateTransaction') : t('addTransactionButton')}
        </button>
        <button type="button" onClick={resetForm} className="btn-secondary">{t('cancel')}</button>
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
    const activeCategoriesData = getActiveCategories();
    const activeTransactionGroupsData = getActiveTransactionGroups();
    
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
          <label>{t('category')}</label>
          <select
            value={formData.categoryId || ''}
            onChange={(e) => handleInputChange('categoryId', e.target.value)}
            required
          >
            <option value="">{t('selectCategory')}</option>
            {activeCategoriesData.map(category => (
              <option key={category.id} value={category.id}>
                {category.icon} {category.name}
              </option>
            ))}
          </select>
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
              key: 'balance', 
              label: t('balance'), 
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
            { key: 'description', label: t('description') },
            { 
              key: 'debitAccountId', 
              label: t('debitAccount'),
              render: (value) => {
                const account = accountsWithTypes.find(acc => acc.id === value);
                return account ? account.name : t('unknownAccount');
              }
            },
            { 
              key: 'creditAccountId', 
              label: t('creditAccount'),
              render: (value) => {
                const account = accountsWithTypes.find(acc => acc.id === value);
                return account ? account.name : t('unknownAccount');
              }
            },
            { 
              key: 'categoryId', 
              label: t('category'),
              render: (value, row) => {
                const categoryName = row.categoryId ? 
                  (categories.find(c => c.id === row.categoryId)?.name || '') : '';
                const subcategoryName = row.subcategoryId ? 
                  (subcategories.find(s => s.id === row.subcategoryId)?.name || '') : '';
                
                if (categoryName && subcategoryName) {
                  return `${categoryName} - ${subcategoryName}`;
                } else if (categoryName) {
                  return categoryName;
                } else if (subcategoryName) {
                  return `- ${subcategoryName}`;
                }
                return '-';
              }
            },
            { 
              key: 'productId', 
              label: t('productService'),
              render: (value) => {
                if (!value) return '-';
                const tag = tags.find(t => t.id === value);
                return tag ? tag.name : t('unknownAccount');
              }
            },
            { key: 'reference', label: t('reference'), render: (value) => value || '-' },
            { key: 'notes', label: t('notes'), render: (value) => value || '-' },
            { key: 'amount', label: t('amount'), render: (value, row) => {
              // For transactions, use the currency-aware formatting
              if (numberFormatService && row.currencyId) {
                return numberFormatService.formatCurrency(value || 0, row.currencyId);
              }
              return (value || 0).toFixed(2);
            }}
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
            { 
              key: 'category', 
              label: t('category'), 
              render: (category) => category ? `${category.icon} ${category.name}` : 'N/A'
            },
            { 
              key: 'group', 
              label: t('transactionGroup'), 
              render: (group) => group ? group.name : '-'
            },
            { key: 'description', label: t('description') },
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
    console.log('Drag started for account:', accountId);
    console.log('Drag event:', e);
    setDraggedId(accountId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', accountId);
    
    // Add some visual feedback
    e.dataTransfer.setDragImage(e.target, 10, 10);
  };

  const handleDragEnter = (e, accountId) => {
    e.preventDefault();
    console.log('Drag entered account:', accountId);
    
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
      console.log('Drag leave timeout for account:', accountId);
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
    console.log('Dropped on:', activeTab, targetId, 'dragged:', draggedId);
    
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
    console.log('Drag ended');
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
      console.log('Reordering accounts:', draggedId, 'to', targetId);
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
      console.log(`Updating order for ${accountsToUpdate.length} accounts`);
      
      // Batch update in parallel instead of sequential
      for (const accountData of accountsToUpdate) {
        updatePromises.push(updateAccount(accountData.id, accountData));
      }
      
      // Wait for all updates to complete in parallel
      await Promise.all(updatePromises);
      console.log('All account orders updated successfully');
      
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
      console.log('Reordering categories:', draggedId, 'to', targetId);
      console.log('Current categories before reorder:', categories.map(c => ({id: c.id, name: c.name, order: c.order})));
      setReorderingCategories(true);
      
      const categoriesList = [...categories];
      const draggedIndex = categoriesList.findIndex(cat => cat.id === draggedId);
      const targetIndex = categoriesList.findIndex(cat => cat.id === targetId);
      
      console.log('Dragged index:', draggedIndex, 'Target index:', targetIndex);
      
      if (draggedIndex === -1 || targetIndex === -1) {
        console.log('Invalid indices found');
        setReorderingCategories(false);
        return;
      }
      
      // Remove dragged item and insert at target position
      const [draggedItem] = categoriesList.splice(draggedIndex, 1);
      categoriesList.splice(targetIndex, 0, draggedItem);
      
      console.log('Categories after array reorder:', categoriesList.map(c => ({id: c.id, name: c.name, order: c.order})));
      
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
      console.log(`Updating order for ${categoriesToUpdate.length} categories`);
      
      // Batch update in parallel instead of sequential
      for (const categoryData of categoriesToUpdate) {
        updatePromises.push(updateCategory(categoryData.id, categoryData));
      }
      
      // Wait for all updates to complete in parallel
      await Promise.all(updatePromises);
      console.log('All category orders updated successfully');
      
      // Force immediate UI refresh
      setReorderingCategories(false);
      setRefreshKey(prev => prev + 1);
      
      // Add a small delay to ensure database state is fully updated before next operation
      setTimeout(() => {
        console.log('Categories after reorder:', getCategories());
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
      console.log('Reordering subcategories:', draggedId, 'to', targetId);
      console.log('Current subcategories before reorder:', subcategories.map(s => ({id: s.id, name: s.name, order: s.order})));
      setReorderingSubcategories(true);
      
      const subcategoriesList = [...subcategories];
      const draggedIndex = subcategoriesList.findIndex(sub => sub.id === draggedId);
      const targetIndex = subcategoriesList.findIndex(sub => sub.id === targetId);
      
      console.log('Dragged index:', draggedIndex, 'Target index:', targetIndex);
      
      if (draggedIndex === -1 || targetIndex === -1) {
        console.log('Invalid indices found');
        setReorderingSubcategories(false);
        return;
      }
      
      // Remove dragged item and insert at target position
      const [draggedItem] = subcategoriesList.splice(draggedIndex, 1);
      subcategoriesList.splice(targetIndex, 0, draggedItem);
      
      console.log('Subcategories after array reorder:', subcategoriesList.map(s => ({id: s.id, name: s.name, order: s.order})));
      
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
      console.log(`Updating order for ${subcategoriesToUpdate.length} subcategories`);
      
      // Batch update in parallel instead of sequential
      for (const subcategoryData of subcategoriesToUpdate) {
        updatePromises.push(updateSubcategory(subcategoryData.id, subcategoryData));
      }
      
      // Wait for all updates to complete in parallel
      await Promise.all(updatePromises);
      console.log('All subcategory orders updated successfully');
      
      // Force immediate UI refresh
      setReorderingSubcategories(false);
      setRefreshKey(prev => prev + 1);
      
      // Add a small delay to ensure database state is fully updated before next operation
      setTimeout(() => {
        console.log('Subcategories after reorder:', getSubcategories());
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
      console.log('Reordering transaction groups:', draggedId, 'to', targetId);
      console.log('Current transaction groups before reorder:', transactionGroups.map(g => ({id: g.id, name: g.name, order: g.order})));
      setReorderingTransactionGroups(true);
      
      const groupsList = [...transactionGroups];
      const draggedIndex = groupsList.findIndex(grp => grp.id === draggedId);
      const targetIndex = groupsList.findIndex(grp => grp.id === targetId);
      
      console.log('Dragged index:', draggedIndex, 'Target index:', targetIndex);
      
      if (draggedIndex === -1 || targetIndex === -1) {
        console.log('Invalid indices found');
        setReorderingTransactionGroups(false);
        return;
      }
      
      // Remove dragged item and insert at target position
      const [draggedItem] = groupsList.splice(draggedIndex, 1);
      groupsList.splice(targetIndex, 0, draggedItem);
      
      console.log('Transaction groups after array reorder:', groupsList.map(g => ({id: g.id, name: g.name, order: g.order})));
      
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
      console.log(`Updating order for ${groupsToUpdate.length} transaction groups`);
      
      // Batch update in parallel instead of sequential
      for (const groupData of groupsToUpdate) {
        updatePromises.push(updateTransactionGroup(groupData.id, groupData));
      }
      
      // Wait for all updates to complete in parallel
      await Promise.all(updatePromises);
      console.log('All transaction group orders updated successfully');
      
      // Force immediate UI refresh
      setReorderingTransactionGroups(false);
      setRefreshKey(prev => prev + 1);
      
      // Add a small delay to ensure database state is fully updated before next operation
      setTimeout(() => {
        console.log('Transaction groups after reorder:', getTransactionGroups());
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
        {['accounts', 'transaction_types', 'transaction_groups', 'subcategories', 'currencies', 'products', 'transactions'].map(tab => (
          <button
            key={tab}
            className={activeTab === tab ? 'nav-btn active' : 'nav-btn'}
            onClick={() => {
              setActiveTab(tab);
              resetForm();
              setShowAccountTypeTooltip(false);
              setSearchTerm('');
            }}
          >
            {t(tab)}
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
            <button 
              onClick={() => setShowForm(!showForm)}
              className="btn-primary"
            >
              {showForm ? t('cancel') : (editingId ? getEditButtonText() : getAddButtonText())}
            </button>
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
    </div>
  );
};

export default DataManagement;