import React, { useState } from 'react';
import { useAccounting } from '../contexts/AccountingContext';
import { useLanguage } from '../contexts/LanguageContext';

const DataManagement = () => {
  const { 
    accounts, 
    transactions, 
    customers, 
    vendors, 
    tags,
    addAccount,
    addCustomer,
    addVendor,
    addProduct,
    addTransaction,
    updateAccount,
    updateCustomer,
    updateVendor,
    updateProduct,
    updateTransaction,
    deleteAccount,
    deleteCustomer,
    deleteVendor,
    deleteTransaction,
    deleteProduct,
    resetToSetup,
    getAccountsWithTypes,
    getAccountTypes,
    categories,
    subcategories,
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
    deleteSubcategory
  } = useAccounting();
  const { t, formatCurrency } = useLanguage();
  const accountsWithTypes = getAccountsWithTypes();
  const accountTypes = getAccountTypes();
  
  const [activeTab, setActiveTab] = useState('accounts');
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({});
  const [editingId, setEditingId] = useState(null);
  const [showAccountTypeTooltip, setShowAccountTypeTooltip] = useState(false);

  const resetForm = () => {
    setFormData({});
    setShowForm(false);
    setEditingId(null);
    setShowAccountTypeTooltip(false);
  };

  const handleEdit = (record) => {
    setFormData(record);
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
          case 'customers':
            await updateCustomer(editingId, formData);
            break;
          case 'vendors':
            await updateVendor(editingId, formData);
            break;
          case 'transactions':
            await updateTransaction(editingId, formData);
            break;
          case 'products':
            await updateProduct(editingId, formData);
            break;
          case 'categories':
            await updateCategory(editingId, formData);
            break;
          case 'subcategories':
            await updateSubcategory(editingId, formData);
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
          case 'customers':
            await addCustomer(formData);
            break;
          case 'vendors':
            await addVendor(formData);
            break;
          case 'transactions':
            await addTransaction(formData);
            break;
          case 'products':
            await addProduct(formData);
            break;
          case 'categories':
            await addCategory(formData);
            break;
          case 'subcategories':
            await addSubcategory(formData);
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

  const handleDelete = async (record) => {
    // Get confirmation message based on record type
    let confirmMessage;
    switch (activeTab) {
      case 'accounts':
        confirmMessage = t('deleteAccountConfirm');
        break;
      case 'customers':
        confirmMessage = t('deleteCustomerConfirm');
        break;
      case 'vendors':
        confirmMessage = t('deleteVendorConfirm');
        break;
      case 'transactions':
        confirmMessage = t('deleteTransactionConfirm');
        break;
      case 'products':
        confirmMessage = t('deleteProductConfirm');
        break;
      case 'categories':
        confirmMessage = t('deleteCategoryConfirm');
        break;
      case 'subcategories':
        confirmMessage = t('deleteSubcategoryConfirm');
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
          case 'customers':
            await deleteCustomer(record.id);
            break;
          case 'vendors':
            await deleteVendor(record.id);
            break;
          case 'transactions':
            await deleteTransaction(record.id);
            break;
          case 'products':
            await deleteProduct(record.id);
            break;
          case 'categories':
            await deleteCategory(record.id);
            break;
          case 'subcategories':
            await deleteSubcategory(record.id);
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
            {columns.map(col => (
              <th key={col.key}>{col.label}</th>
            ))}
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row, index) => (
            <tr key={row.id || index}>
              {columns.map(col => (
                <td key={col.key}>
                  {col.render ? col.render(row[col.key], row) : row[col.key]}
                </td>
              ))}
              <td>
                <button 
                  onClick={() => handleEdit(row)}
                  className="btn-edit"
                  title={t('edit')}
                >
                  ✏️
                </button>
                <button 
                  onClick={() => handleDelete(row)}
                  className="btn-delete"
                  title={t('delete')}
                >
                  🗑️
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const renderAccountForm = () => (
    <form onSubmit={handleSubmit} className="data-form">
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
        <button type="button" onClick={resetForm} className="btn-secondary">{t('cancel')}</button>
      </div>
    </form>
  );

  const renderCustomerForm = () => (
    <form onSubmit={handleSubmit} className="data-form">
      <div className="form-group">
        <label>Customer Name</label>
        <input
          type="text"
          value={formData.name || ''}
          onChange={(e) => handleInputChange('name', e.target.value)}
          required
        />
      </div>
      <div className="form-group">
        <label>Email</label>
        <input
          type="email"
          value={formData.email || ''}
          onChange={(e) => handleInputChange('email', e.target.value)}
        />
      </div>
      <div className="form-group">
        <label>Phone</label>
        <input
          type="tel"
          value={formData.phone || ''}
          onChange={(e) => handleInputChange('phone', e.target.value)}
        />
      </div>
      <div className="form-group">
        <label>Address</label>
        <textarea
          value={formData.address || ''}
          onChange={(e) => handleInputChange('address', e.target.value)}
        />
      </div>
      <div className="form-actions">
        <button type="submit" className="btn-primary">
          {editingId ? t('updateCustomer') : t('addCustomer')}
        </button>
        <button type="button" onClick={resetForm} className="btn-secondary">{t('cancel')}</button>
      </div>
    </form>
  );

  const renderVendorForm = () => (
    <form onSubmit={handleSubmit} className="data-form">
      <div className="form-group">
        <label>Vendor Name</label>
        <input
          type="text"
          value={formData.name || ''}
          onChange={(e) => handleInputChange('name', e.target.value)}
          required
        />
      </div>
      <div className="form-group">
        <label>Contact Person</label>
        <input
          type="text"
          value={formData.contactPerson || ''}
          onChange={(e) => handleInputChange('contactPerson', e.target.value)}
        />
      </div>
      <div className="form-group">
        <label>Email</label>
        <input
          type="email"
          value={formData.email || ''}
          onChange={(e) => handleInputChange('email', e.target.value)}
        />
      </div>
      <div className="form-group">
        <label>Phone</label>
        <input
          type="tel"
          value={formData.phone || ''}
          onChange={(e) => handleInputChange('phone', e.target.value)}
        />
      </div>
      <div className="form-actions">
        <button type="submit" className="btn-primary">
          {editingId ? t('updateVendor') : t('addVendor')}
        </button>
        <button type="button" onClick={resetForm} className="btn-secondary">{t('cancel')}</button>
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
          value={formData.date || new Date().toISOString().split('T')[0]}
          onChange={(e) => handleInputChange('date', e.target.value)}
          required
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
        <label>Category</label>
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
        <div className="form-group">
          <label>{t('icon')}</label>
          <input
            type="text"
            value={formData.icon || ''}
            onChange={(e) => handleInputChange('icon', e.target.value)}
            placeholder="🏷️"
            maxLength="2"
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

  const getAddButtonText = () => {
    switch (activeTab) {
      case 'accounts':
        return t('addAccount');
      case 'customers':
        return t('addCustomer');
      case 'vendors':
        return t('addVendor');
      case 'transactions':
        return t('addTransactionButton');
      case 'products':
        return `${t('add')} Tag`;
      case 'categories':
        return t('addCategory');
      case 'subcategories':
        return t('addSubcategory');
      default:
        return t('add');
    }
  };

  const getEditButtonText = () => {
    switch (activeTab) {
      case 'accounts':
        return t('updateAccount');
      case 'customers':
        return t('updateCustomer');
      case 'vendors':
        return t('updateVendor');
      case 'transactions':
        return t('updateTransaction');
      case 'products':
        return `${t('update')} Tag`;
      case 'categories':
        return t('updateCategory');
      case 'subcategories':
        return t('updateSubcategory');
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
            { key: 'balance', label: t('balance'), render: (value) => formatCurrency(value || 0) }
          ]
        };
      case 'customers':
        return {
          data: customers,
          columns: [
            { key: 'id', label: t('id') },
            { key: 'name', label: t('name') },
            { key: 'email', label: t('email') },
            { key: 'phone', label: t('phone') }
          ]
        };
      case 'vendors':
        return {
          data: vendors,
          columns: [
            { key: 'id', label: t('id') },
            { key: 'name', label: t('name') },
            { key: 'contactPerson', label: t('contact') },
            { key: 'email', label: t('email') }
          ]
        };
      case 'transactions':
        return {
          data: transactions,
          columns: [
            { key: 'id', label: t('id') },
            { key: 'date', label: t('date') },
            { key: 'description', label: t('description') },
            { key: 'amount', label: t('amount'), render: (value) => formatCurrency(value || 0) },
            { key: 'debitAccountId', label: t('debit') },
            { key: 'creditAccountId', label: t('credit') }
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
      case 'categories':
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
      case 'subcategories':
        const subcategoriesWithCategories = getSubcategoriesWithCategories();
        return {
          data: subcategoriesWithCategories,
          columns: [
            { key: 'id', label: t('id') },
            { 
              key: 'icon', 
              label: t('icon'), 
              render: (value) => <span style={{fontSize: '1.2em'}}>{value}</span>
            },
            { key: 'name', label: t('name') },
            { 
              key: 'category', 
              label: t('category'), 
              render: (category) => category ? `${category.icon} ${category.name}` : 'N/A'
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
      default:
        return { data: [], columns: [] };
    }
  };

  const renderForm = () => {
    switch (activeTab) {
      case 'accounts':
        return renderAccountForm();
      case 'customers':
        return renderCustomerForm();
      case 'vendors':
        return renderVendorForm();
      case 'transactions':
        return renderTransactionForm();
      case 'products':
        return renderProductForm();
      case 'categories':
        return renderCategoryForm();
      case 'subcategories':
        return renderSubcategoryForm();
      default:
        return null;
    }
  };

  const { data, columns } = getTableData();

  return (
    <div className="data-management">
      <nav className="data-nav">
        {['accounts', 'categories', 'subcategories', 'vendors', 'products', 'transactions', 'customers'].map(tab => (
          <button
            key={tab}
            className={activeTab === tab ? 'nav-btn active' : 'nav-btn'}
            onClick={() => {
              setActiveTab(tab);
              resetForm();
              setShowAccountTypeTooltip(false);
            }}
          >
            {t(tab)}
          </button>
        ))}
      </nav>

      <div className="data-content">
        
        <div className="data-actions">
          <button 
            onClick={() => setShowForm(!showForm)}
            className="btn-primary"
          >
            {showForm ? t('cancel') : (editingId ? getEditButtonText() : getAddButtonText())}
          </button>
        </div>

        {showForm && (
          <div className="form-container">
            {renderForm()}
          </div>
        )}

        <div className="table-container">
          <h3>{activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} ({data.length})</h3>
          {data.length > 0 ? (
            renderTable(data, columns)
          ) : (
            <div className="empty-state">
              <p>No {t(activeTab)} {t('noDataFound')}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DataManagement;