import React, { useState, useRef, useEffect } from 'react';
import { useAccounting } from '../contexts/AccountingContext';
import './BankConfigurationForm.css';

const PRESET_BANKS = [
  // Credit Cards
  { name: 'American Express', type: 'Credit Card', csvFormat: 'Date,Description,Card Member,Account #,Amount' },
  { name: 'Citibank', type: 'Major US Bank', csvFormat: 'Date,Description,Debit,Credit,Balance' },
  
  // Custom
  { name: 'Custom Configuration', type: 'Custom', csvFormat: 'Configure your own mapping' }
];

const SYSTEM_FIELDS = [
  { key: 'date', label: 'Date', required: true, description: 'Transaction date' },
  { key: 'description', label: 'Description', required: true, description: 'Transaction description/memo' },
  { key: 'amount', label: 'Amount', required: true, description: 'Transaction amount (signed)' },
  { key: 'debit', label: 'Debit', required: false, description: 'Debit amount (separate column)' },
  { key: 'credit', label: 'Credit', required: false, description: 'Credit amount (separate column)' },
  { key: 'account', label: 'Account', required: false, description: 'Account number or name' },
  { key: 'destinationAccountId', label: 'Destination Account', required: false, description: 'Destination account for transfers/investments' },
  { key: 'destinationAmount', label: 'Destination Amount', required: false, description: 'Amount for destination account (investments)' },
  { key: 'reference', label: 'Reference', required: false, description: 'Transaction ID/reference' },
  { key: 'transactionType', label: 'Transaction Type', required: false, description: 'Transaction type (Income, Expenses, Transfer, etc.)' },
  { key: 'transactionGroup', label: 'Transaction Group', required: false, description: 'Transaction group within the type' },
  { key: 'category', label: 'Category', required: false, description: 'Transaction category (legacy)' },
  { key: 'subcategoryId', label: 'Subcategory', required: false, description: 'Transaction subcategory' },
  { key: 'payee', label: 'Payee', required: false, description: 'Payee name (for expenses/investments)' },
  { key: 'payer', label: 'Payer', required: false, description: 'Payer name (for income/investments)' },
  { key: 'tag', label: 'Tag', required: false, description: 'Transaction tag' },
  { key: 'notes', label: 'Notes', required: false, description: 'Additional transaction notes' }
];

const CurrencySelect = ({ id, value, onChange }) => {
  const { getActiveCurrencies } = useAccounting();
  const activeCurrencies = getActiveCurrencies();

  return (
    <select
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      {activeCurrencies.map((currency) => (
        <option key={currency.id} value={currency.code}>
          {currency.code} - {currency.name}
        </option>
      ))}
    </select>
  );
};

const BankConfigurationForm = ({ initialData, onSave, onCancel, isEditing }) => {
  const [formData, setFormData] = useState(initialData || {
    name: '',
    type: '',
    fieldMapping: {},
    settings: {
      dateFormat: 'MM/DD/YYYY',
      currency: 'USD',
      delimiter: ',',
      hasHeaders: true,
      encoding: 'UTF-8',
      amountHandling: 'signed'
    }
  });
  
  const [selectedPreset, setSelectedPreset] = useState('');
  const [csvSample, setCsvSample] = useState('');
  const [csvColumns, setCsvColumns] = useState([]);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const fileInputRef = useRef(null);

  // Initialize form when editing - extract CSV columns from existing field mappings
  useEffect(() => {
    if (isEditing && initialData && initialData.fieldMapping) {
      // Extract all the CSV columns from existing mappings
      const existingColumns = Object.values(initialData.fieldMapping).filter(Boolean);
      // Remove duplicates and sort
      const uniqueColumns = [...new Set(existingColumns)].sort();
      
      if (uniqueColumns.length > 0) {
        setCsvColumns(uniqueColumns);
        setCsvSample(uniqueColumns.join(','));
      }
    }
  }, [isEditing, initialData]);

  const handlePresetChange = (presetName) => {
    setSelectedPreset(presetName);
    const preset = PRESET_BANKS.find(bank => bank.name === presetName);
    if (preset) {
      setFormData(prev => ({
        ...prev,
        name: preset.name,
        type: preset.type
      }));
      
      if (preset.csvFormat && preset.csvFormat !== 'Configure your own mapping') {
        const columns = preset.csvFormat.split(',').map(col => col.trim());
        setCsvColumns(columns);
        setCsvSample(preset.csvFormat);
      }
    }
  };

  const handleSampleUpload = (e) => {
    const file = e.target.files[0];
    if (file && file.type === 'text/csv') {
      const reader = new FileReader();
      reader.onload = (event) => {
        const csv = event.target.result;
        const lines = csv.split('\n');
        const firstLine = lines[0];
        setCsvSample(firstLine);
        
        const columns = firstLine.split(formData.settings.delimiter || ',').map(col => 
          col.trim().replace(/"/g, '')
        );
        setCsvColumns(columns);
      };
      reader.readAsText(file);
    }
  };

  const handleFieldMapping = (systemField, csvColumn) => {
    setFormData(prev => ({
      ...prev,
      fieldMapping: {
        ...prev.fieldMapping,
        [systemField]: csvColumn
      }
    }));
  };

  const handleSettingChange = (setting, value) => {
    setFormData(prev => ({
      ...prev,
      settings: {
        ...prev.settings,
        [setting]: value
      }
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Validate required fields
    if (!formData.name.trim()) {
      alert('Bank name is required');
      return;
    }

    const requiredFieldsMapped = SYSTEM_FIELDS
      .filter(field => field.required)
      .every(field => formData.fieldMapping[field.key]);

    if (!requiredFieldsMapped) {
      alert('Please map all required fields (Date, Description, and Amount)');
      return;
    }

    const bankConfig = {
      ...formData,
      id: isEditing ? initialData.id : Date.now().toString(),
      createdAt: isEditing ? initialData.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    onSave(bankConfig);
  };

  return (
    <div className="bank-configuration-form">
      <div className="form-header">
        <h3>{isEditing ? 'Edit' : 'Add'} Bank Configuration</h3>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Step 1: Choose Preset or Custom */}
        <div className="form-section">
          <h4>Step 1: Choose Bank Type</h4>
          <div className="preset-selection">
            <select 
              value={selectedPreset}
              onChange={(e) => handlePresetChange(e.target.value)}
              className="form-select"
            >
              <option value="">Select a preset bank or choose custom</option>
              {PRESET_BANKS.map((bank) => (
                <option key={bank.name} value={bank.name}>
                  {bank.name} ({bank.type})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Step 2: Basic Information */}
        <div className="form-section">
          <h4>Step 2: Basic Information</h4>
          <div className="form-grid">
            <div className="form-field">
              <label htmlFor="bank-name">Bank Name *</label>
              <input
                id="bank-name"
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter bank name"
                required
              />
            </div>
            <div className="form-field">
              <label htmlFor="bank-type">Type</label>
              <input
                id="bank-type"
                type="text"
                value={formData.type}
                onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value }))}
                placeholder="e.g., Major US Bank, Credit Union"
              />
            </div>
          </div>
        </div>

        {/* Step 3: CSV Sample */}
        <div className="form-section">
          <h4>Step 3: CSV Sample (Optional but Recommended)</h4>
          <p>Upload a sample CSV file to help with column mapping</p>
          
          <div className="file-upload-section">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleSampleUpload}
              style={{ display: 'none' }}
            />
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => fileInputRef.current?.click()}
            >
              Upload Sample CSV
            </button>
          </div>

          {csvSample && (
            <div className="csv-preview">
              <h5>CSV Preview:</h5>
              <div className="csv-sample">{csvSample}</div>
              <div className="detected-columns">
                <strong>Detected columns:</strong>
                <div className="column-tags">
                  {csvColumns.map((col, index) => (
                    <span key={index} className="column-tag">
                      {col || `Column ${index + 1}`}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Step 4: Field Mapping */}
        <div className="form-section">
          <h4>Step 4: Field Mapping</h4>
          
          {/* Mapping Progress Summary */}
          {csvColumns.length > 0 && (
            <div className="mapping-summary">
              {(() => {
                const totalFields = SYSTEM_FIELDS.length;
                const mappedFields = SYSTEM_FIELDS.filter(field => 
                  formData.fieldMapping[field.key] && formData.fieldMapping[field.key] !== ''
                ).length;
                const requiredFields = SYSTEM_FIELDS.filter(field => field.required).length;
                const mappedRequired = SYSTEM_FIELDS.filter(field => 
                  field.required && formData.fieldMapping[field.key] && formData.fieldMapping[field.key] !== ''
                ).length;
                
                return (
                  <div className="summary-stats">
                    <div className="stat-item">
                      <span className="stat-label">Total Mapped:</span>
                      <span className="stat-value">{mappedFields}/{totalFields}</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-label">Required Mapped:</span>
                      <span className={`stat-value ${mappedRequired === requiredFields ? 'complete' : 'incomplete'}`}>
                        {mappedRequired}/{requiredFields}
                      </span>
                    </div>
                    <div className="progress-bar">
                      <div 
                        className="progress-fill" 
                        style={{ width: `${(mappedFields / totalFields) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
          
          <div className="field-mapping-grid">
            {SYSTEM_FIELDS.map((field) => {
              const isMapped = formData.fieldMapping[field.key] && formData.fieldMapping[field.key] !== '';
              const isRequired = field.required;
              
              return (
                <div key={field.key} className={`mapping-row ${isMapped ? 'mapped' : 'unmapped'} ${isRequired && !isMapped ? 'required-unmapped' : ''}`}>
                  <div className="field-info">
                    <div className="field-header">
                      <span className={`mapping-status ${isMapped ? 'status-mapped' : 'status-unmapped'}`}>
                        {isMapped ? '✓' : '○'}
                      </span>
                      <label className={field.required ? 'required' : ''}>
                        {field.label}
                        {field.required && ' *'}
                      </label>
                    </div>
                    <p className="field-description">{field.description}</p>
                    {isMapped && (
                      <p className="mapping-info">
                        → Mapped to: <strong>"{formData.fieldMapping[field.key]}"</strong>
                      </p>
                    )}
                  </div>
                  <select
                    value={formData.fieldMapping[field.key] || ''}
                    onChange={(e) => handleFieldMapping(field.key, e.target.value)}
                    className={`mapping-select ${isMapped ? 'mapped-select' : 'unmapped-select'}`}
                  >
                    <option value="">Not mapped</option>
                    {csvColumns.map((col, index) => (
                      <option key={index} value={col}>
                        {col || `Column ${index + 1}`}
                      </option>
                    ))}
                  </select>
                </div>
              );
            })}
          </div>
        </div>

        {/* Advanced Settings */}
        <div className="form-section">
          <div className="advanced-toggle">
            <button
              type="button"
              className="toggle-btn"
              onClick={() => setShowAdvanced(!showAdvanced)}
            >
              {showAdvanced ? '▼' : '▶'} Advanced Settings
            </button>
          </div>

          {showAdvanced && (
            <div className="advanced-settings">
              <div className="form-grid">
                <div className="form-field">
                  <label htmlFor="date-format">Date Format</label>
                  <select
                    id="date-format"
                    value={formData.settings.dateFormat}
                    onChange={(e) => handleSettingChange('dateFormat', e.target.value)}
                  >
                    <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                    <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                    <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                    <option value="MM-DD-YYYY">MM-DD-YYYY</option>
                    <option value="DD-MM-YYYY">DD-MM-YYYY</option>
                  </select>
                </div>

                <div className="form-field">
                  <label htmlFor="currency">Default Currency</label>
                  <CurrencySelect
                    id="currency"
                    value={formData.settings.currency}
                    onChange={(value) => handleSettingChange('currency', value)}
                  />
                </div>

                <div className="form-field">
                  <label htmlFor="delimiter">CSV Delimiter</label>
                  <select
                    id="delimiter"
                    value={formData.settings.delimiter}
                    onChange={(e) => handleSettingChange('delimiter', e.target.value)}
                  >
                    <option value=",">Comma (,)</option>
                    <option value=";">Semicolon (;)</option>
                    <option value="\t">Tab</option>
                    <option value="|">Pipe (|)</option>
                  </select>
                </div>

                <div className="form-field">
                  <label htmlFor="amount-handling">Amount Handling</label>
                  <select
                    id="amount-handling"
                    value={formData.settings.amountHandling}
                    onChange={(e) => handleSettingChange('amountHandling', e.target.value)}
                  >
                    <option value="signed">Single signed amount column</option>
                    <option value="separate">Separate debit/credit columns</option>
                  </select>
                </div>
              </div>

              <div className="form-checkboxes">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={formData.settings.hasHeaders}
                    onChange={(e) => handleSettingChange('hasHeaders', e.target.checked)}
                  />
                  First row contains headers
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Form Actions */}
        <div className="form-actions">
          <button type="button" className="btn btn-secondary" onClick={onCancel}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary">
            {isEditing ? 'Update' : 'Save'} Configuration
          </button>
        </div>
      </form>
    </div>
  );
};

export default BankConfigurationForm;