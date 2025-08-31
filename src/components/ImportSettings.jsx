import React, { useState } from 'react';
import { useAccounting } from '../contexts/AccountingContext';
import BankConfigurationForm from './BankConfigurationForm';
import './ImportSettings.css';

const ImportSettings = () => {
  const { bankConfigurations = [], addBankConfiguration, removeBankConfiguration } = useAccounting();
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingBank, setEditingBank] = useState(null);

  const handleAddBank = (bankConfig) => {
    addBankConfiguration(bankConfig);
    setShowAddForm(false);
  };

  const handleEditBank = (bankConfig) => {
    setEditingBank(bankConfig);
    setShowAddForm(true);
  };

  const handleUpdateBank = (updatedConfig) => {
    // Remove old configuration and add updated one
    removeBankConfiguration(editingBank.id);
    addBankConfiguration(updatedConfig);
    setEditingBank(null);
    setShowAddForm(false);
  };

  const handleDeleteBank = (bankId) => {
    if (window.confirm('Are you sure you want to delete this bank configuration?')) {
      removeBankConfiguration(bankId);
    }
  };

  const handleCancelForm = () => {
    setShowAddForm(false);
    setEditingBank(null);
  };

  return (
    <div className="import-settings">
      <div className="settings-section">
        <div className="section-header">
          <div className="section-title">
            <h2>Bank Configurations</h2>
          </div>
          {!showAddForm && (
            <button 
              className="btn btn-primary"
              onClick={() => setShowAddForm(true)}
            >
              + Add Bank
            </button>
          )}
        </div>

        {showAddForm && (
          <div className="add-bank-form">
            <BankConfigurationForm
              initialData={editingBank}
              onSave={editingBank ? handleUpdateBank : handleAddBank}
              onCancel={handleCancelForm}
              isEditing={!!editingBank}
            />
          </div>
        )}

        {bankConfigurations.length === 0 && !showAddForm ? (
          <div className="no-banks">
            <div className="no-banks-icon">🏦</div>
            <h3>No Bank Configurations</h3>
            <p>Add your first bank configuration to start importing transactions.</p>
            <button 
              className="btn btn-primary"
              onClick={() => setShowAddForm(true)}
            >
              Add Your First Bank
            </button>
          </div>
        ) : (
          <div className="bank-configurations-list">
            {bankConfigurations.map((bank) => (
              <div key={bank.id} className="bank-config-card">
                <div className="bank-config-header">
                  <div className="bank-config-info">
                    <div className="bank-logo">🏦</div>
                    <div className="bank-details">
                      <h3>{bank.name}</h3>
                      <p className="bank-type">{bank.type || 'Custom Configuration'}</p>
                      <p className="bank-fields">
                        {Object.keys(bank.fieldMapping || {}).length} fields mapped
                      </p>
                    </div>
                  </div>
                  <div className="bank-config-actions">
                    <button 
                      className="btn btn-secondary btn-small"
                      onClick={() => handleEditBank(bank)}
                    >
                      Edit
                    </button>
                    <button 
                      className="btn btn-danger btn-small"
                      onClick={() => handleDeleteBank(bank.id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>

                <div className="bank-config-preview">
                  <h4>Field Mapping:</h4>
                  <div className="field-mappings">
                    {Object.entries(bank.fieldMapping || {}).map(([systemField, csvColumn]) => (
                      <div key={systemField} className="field-mapping">
                        <span className="system-field">{systemField}</span>
                        <span className="arrow">→</span>
                        <span className="csv-column">{csvColumn || 'Not mapped'}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {bank.settings && (
                  <div className="bank-config-settings">
                    <h4>Settings:</h4>
                    <div className="config-settings">
                      {bank.settings.dateFormat && (
                        <span className="setting-item">Date: {bank.settings.dateFormat}</span>
                      )}
                      {bank.settings.currency && (
                        <span className="setting-item">Currency: {bank.settings.currency}</span>
                      )}
                      {bank.settings.delimiter && (
                        <span className="setting-item">Delimiter: {bank.settings.delimiter}</span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="settings-section">
        <h2>Import History</h2>
        <p>View your transaction import history and logs</p>
        
        <div className="import-history-placeholder">
          <div className="placeholder-icon">📊</div>
          <p>Import history will appear here once you start importing transactions.</p>
        </div>
      </div>
    </div>
  );
};

export default ImportSettings;