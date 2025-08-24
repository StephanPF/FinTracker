import React, { useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';

const Architecture = () => {
  const { t } = useLanguage();
  const [selectedTable, setSelectedTable] = useState(null);
  const [expandAll, setExpandAll] = useState(false);
  const [printMode, setPrintMode] = useState(false);

  const tables = {
    accounts: {
      name: 'accounts.xlsx',
      title: t('accounts'),
      icon: '🏦',
      color: '#4CAF50',
      fields: [
        { name: 'id', type: 'string', key: true, description: 'Unique identifier' },
        { name: 'name', type: 'string', required: true, description: 'Account name' },
        { name: 'accountTypeId', type: 'string', foreign: 'account_types.id', description: 'Reference to account type' },
        { name: 'balance', type: 'number', description: 'Current balance' }
      ],
      relationships: ['account_types', 'transactions']
    },
    transactions: {
      name: 'transactions.xlsx',
      title: t('transactions'),
      icon: '💰',
      color: '#2196F3',
      fields: [
        { name: 'id', type: 'string', key: true, description: 'Unique identifier' },
        { name: 'date', type: 'date', required: true, description: 'Transaction date' },
        { name: 'description', type: 'string', required: true, description: 'Transaction description' },
        { name: 'amount', type: 'number', required: true, description: 'Transaction amount' },
        { name: 'debitAccountId', type: 'string', foreign: 'accounts.id', description: 'Debit account reference' },
        { name: 'creditAccountId', type: 'string', foreign: 'accounts.id', description: 'Credit account reference' },
        { name: 'customerId', type: 'string', foreign: 'customers.id', optional: true, description: 'Customer reference' },
        { name: 'vendorId', type: 'string', foreign: 'vendors.id', optional: true, description: 'Vendor reference' },
        { name: 'productId', type: 'string', foreign: 'tags.id', optional: true, description: 'Tag/Product reference' },
        { name: 'subcategoryId', type: 'string', foreign: 'subcategories.id', optional: true, description: 'Subcategory reference' },
        { name: 'reference', type: 'string', optional: true, description: 'External reference' },
        { name: 'notes', type: 'string', optional: true, description: 'Additional notes' }
      ],
      relationships: ['accounts', 'customers', 'vendors', 'tags', 'subcategories']
    },
    account_types: {
      name: 'account_types.xlsx',
      title: t('accountTypes'),
      icon: '📊',
      color: '#9C27B0',
      fields: [
        { name: 'id', type: 'string', key: true, description: 'Unique identifier' },
        { name: 'type', type: 'string', required: true, description: 'Account type (Asset, Liability, etc.)' },
        { name: 'subtype', type: 'string', required: true, description: 'Account subtype' },
        { name: 'description', type: 'string', description: 'Type description' }
      ],
      relationships: ['accounts']
    },
    transaction_types: {
      name: 'transaction_types.xlsx',
      title: t('categories'),
      icon: '🏷️',
      color: '#FF9800',
      fields: [
        { name: 'id', type: 'string', key: true, description: 'Unique identifier' },
        { name: 'name', type: 'string', required: true, description: 'Category name' },
        { name: 'description', type: 'string', description: 'Category description' },
        { name: 'color', type: 'string', description: 'Display color' },
        { name: 'icon', type: 'string', description: 'Display icon' },
        { name: 'isActive', type: 'boolean', description: 'Active status' }
      ],
      relationships: ['subcategories']
    },
    subcategories: {
      name: 'subcategories.xlsx',
      title: t('subcategories'),
      icon: '🏷️',
      color: '#607D8B',
      fields: [
        { name: 'id', type: 'string', key: true, description: 'Unique identifier' },
        { name: 'name', type: 'string', required: true, description: 'Subcategory name' },
        { name: 'categoryId', type: 'string', foreign: 'transaction_types.id', description: 'Parent category reference' },
        { name: 'description', type: 'string', description: 'Subcategory description' },
        { name: 'color', type: 'string', description: 'Display color' },
        { name: 'isActive', type: 'boolean', description: 'Active status' }
      ],
      relationships: ['transaction_types', 'transactions']
    },
    customers: {
      name: 'customers.xlsx',
      title: t('customers'),
      icon: '👥',
      color: '#E91E63',
      fields: [
        { name: 'id', type: 'string', key: true, description: 'Unique identifier' },
        { name: 'name', type: 'string', required: true, description: 'Customer name' },
        { name: 'email', type: 'string', description: 'Email address' },
        { name: 'phone', type: 'string', description: 'Phone number' },
        { name: 'address', type: 'string', description: 'Physical address' }
      ],
      relationships: ['transactions']
    },
    vendors: {
      name: 'vendors.xlsx',
      title: t('vendors'),
      icon: '🏢',
      color: '#795548',
      fields: [
        { name: 'id', type: 'string', key: true, description: 'Unique identifier' },
        { name: 'name', type: 'string', required: true, description: 'Vendor name' },
        { name: 'contactPerson', type: 'string', description: 'Contact person' },
        { name: 'email', type: 'string', description: 'Email address' },
        { name: 'phone', type: 'string', description: 'Phone number' }
      ],
      relationships: ['transactions']
    },
    tags: {
      name: 'tags.xlsx',
      title: t('products'),
      icon: '📦',
      color: '#009688',
      fields: [
        { name: 'id', type: 'string', key: true, description: 'Unique identifier' },
        { name: 'name', type: 'string', required: true, description: 'Tag/Product name' },
        { name: 'description', type: 'string', description: 'Description' },
        { name: 'category', type: 'string', description: 'Tag category' }
      ],
      relationships: ['transactions']
    }
  };

  const isTableExpanded = (tableKey) => {
    return expandAll || printMode || selectedTable === tableKey;
  };

  const handleTableClick = (tableKey) => {
    if (!printMode && !expandAll) {
      setSelectedTable(selectedTable === tableKey ? null : tableKey);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const toggleExpandAll = () => {
    setExpandAll(!expandAll);
    if (!expandAll) {
      setSelectedTable(null); // Clear individual selection when expanding all
    }
  };

  const togglePrintMode = () => {
    setPrintMode(!printMode);
    if (!printMode) {
      setExpandAll(false);
      setSelectedTable(null);
    }
  };

  const renderTableCard = (tableKey, table) => (
    <div 
      key={tableKey}
      className={`table-card ${isTableExpanded(tableKey) ? 'selected' : ''} ${printMode ? 'print-mode' : ''}`}
      style={{ borderLeftColor: table.color }}
      onClick={() => handleTableClick(tableKey)}
    >
      <div className="table-header">
        <span className="table-icon" style={{ color: table.color }}>
          {table.icon}
        </span>
        <div className="table-info">
          <h3>{table.title}</h3>
          <span className="table-filename">{table.name}</span>
        </div>
        {!printMode && (
          <span className="expand-icon">
            {isTableExpanded(tableKey) ? '▼' : '▶'}
          </span>
        )}
      </div>
      
      {isTableExpanded(tableKey) && (
        <div className="table-details">
          <div className="fields-section">
            <h4>📋 {t('fields')}</h4>
            <div className="fields-list">
              {table.fields.map((field, index) => (
                <div key={index} className="field-item">
                  <div className="field-main">
                    <span className={`field-name ${field.key ? 'primary-key' : ''}`}>
                      {field.key && '🔑 '}{field.name}
                    </span>
                    <span className="field-type">{field.type}</span>
                    {field.foreign && (
                      <span className="foreign-key" title={`References ${field.foreign}`}>
                        🔗 {field.foreign}
                      </span>
                    )}
                  </div>
                  <div className="field-description">{field.description}</div>
                  <div className="field-attributes">
                    {field.required && <span className="attr required">Required</span>}
                    {field.optional && <span className="attr optional">Optional</span>}
                    {field.key && <span className="attr primary">Primary Key</span>}
                    {field.foreign && <span className="attr foreign">Foreign Key</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {table.relationships.length > 0 && (
            <div className="relationships-section">
              <h4>🔗 {t('relationships')}</h4>
              <div className="relationships-list">
                {table.relationships.map((rel, index) => (
                  <span 
                    key={index} 
                    className="relationship-tag"
                    style={{ backgroundColor: tables[rel]?.color + '20', borderColor: tables[rel]?.color }}
                  >
                    {tables[rel]?.icon} {tables[rel]?.title || rel}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );

  return (
    <div className={`architecture-page ${printMode ? 'print-mode' : ''}`}>
      <div className="page-header">
        <div className="header-content">
          <h2>🏗️ {t('databaseArchitecture')}</h2>
          <p>{t('architectureDescription')}</p>
        </div>
        
        {!printMode && (
          <div className="page-controls">
            <button 
              className={`control-btn ${expandAll ? 'active' : ''}`}
              onClick={toggleExpandAll}
              title={expandAll ? t('collapseAll') : t('expandAll')}
            >
              {expandAll ? '📋' : '📄'} {expandAll ? t('collapseAll') : t('expandAll')}
            </button>
            
            <button 
              className="control-btn print-btn"
              onClick={togglePrintMode}
              title={t('printMode')}
            >
              🖨️ {t('printMode')}
            </button>
          </div>
        )}

        {printMode && (
          <div className="print-controls">
            <button 
              className="control-btn print-btn"
              onClick={handlePrint}
            >
              🖨️ {t('print')}
            </button>
            
            <button 
              className="control-btn"
              onClick={togglePrintMode}
            >
              👁️ {t('exitPrintMode')}
            </button>
          </div>
        )}
      </div>

      <div className="architecture-overview">
        <div className="overview-stats">
          <div className="stat-item">
            <span className="stat-number">{Object.keys(tables).length}</span>
            <span className="stat-label">{t('tables')}</span>
          </div>
          <div className="stat-item">
            <span className="stat-number">
              {Object.values(tables).reduce((total, table) => 
                total + table.fields.filter(f => f.foreign).length, 0
              )}
            </span>
            <span className="stat-label">{t('foreignKeys')}</span>
          </div>
          <div className="stat-item">
            <span className="stat-number">
              {Object.values(tables).reduce((total, table) => 
                total + table.relationships.length, 0
              )}
            </span>
            <span className="stat-label">{t('relationships')}</span>
          </div>
        </div>

        <div className="architecture-principles">
          <h3>📐 {t('designPrinciples')}</h3>
          <ul>
            <li><strong>{t('relationalIntegrity')}:</strong> {t('relationalIntegrityDesc')}</li>
            <li><strong>{t('doubleEntry')}:</strong> {t('doubleEntryDesc')}</li>
            <li><strong>{t('fileBasedStorage')}:</strong> {t('fileBasedStorageDesc')}</li>
            <li><strong>{t('normalization')}:</strong> {t('normalizationDesc')}</li>
          </ul>
        </div>
      </div>

      <div className="tables-grid">
        {Object.entries(tables).map(([tableKey, table]) => 
          renderTableCard(tableKey, table)
        )}
      </div>

      <div className="architecture-notes">
        <div className="notes-section">
          <h3>📝 {t('implementationNotes')}</h3>
          <div className="note-item">
            <h4>🗃️ {t('excelStorage')}</h4>
            <p>{t('excelStorageNote')}</p>
          </div>
          <div className="note-item">
            <h4>🔗 {t('foreignKeyValidation')}</h4>
            <p>{t('foreignKeyValidationNote')}</p>
          </div>
          <div className="note-item">
            <h4>⚖️ {t('doubleEntryBookkeeping')}</h4>
            <p>{t('doubleEntryBookkeepingNote')}</p>
          </div>
          <div className="note-item">
            <h4>🔄 {t('dataConsistency')}</h4>
            <p>{t('dataConsistencyNote')}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Architecture;