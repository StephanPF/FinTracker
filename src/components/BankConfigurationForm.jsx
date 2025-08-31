import React, { useState, useRef } from 'react';
import './BankConfigurationForm.css';

const PRESET_BANKS = [
  // Major US Banks
  { name: 'Chase Bank', type: 'Major US Bank', csvFormat: 'Date,Description,Amount,Type,Balance' },
  { name: 'Bank of America', type: 'Major US Bank', csvFormat: 'Date,Description,Amount,Running Bal.' },
  { name: 'Wells Fargo', type: 'Major US Bank', csvFormat: 'Date,Amount,*,*,Description' },
  { name: 'Citibank', type: 'Major US Bank', csvFormat: 'Date,Description,Debit,Credit,Balance' },
  { name: 'US Bank', type: 'Major US Bank', csvFormat: 'Date,Name,Memo,Amount' },
  
  // Credit Unions
  { name: 'Navy Federal', type: 'Credit Union', csvFormat: 'Date,Description,Amount,Balance' },
  { name: 'USAA', type: 'Credit Union', csvFormat: 'Date,Description,Original Description,Amount,Type' },
  { name: 'Alliant Credit Union', type: 'Credit Union', csvFormat: 'Date,Amount,Description' },
  
  // Online Banks
  { name: 'Ally Bank', type: 'Online Bank', csvFormat: 'Date,Time,Amount,Type,Description' },
  { name: 'Capital One 360', type: 'Online Bank', csvFormat: 'Account Number,Date,Card No.,Description,Amount' },
  { name: 'Marcus by Goldman Sachs', type: 'Online Bank', csvFormat: 'Date,Description,Amount,Balance' },
  
  // Credit Cards
  { name: 'American Express', type: 'Credit Card', csvFormat: 'Date,Description,Card Member,Account #,Amount' },
  { name: 'Discover Card', type: 'Credit Card', csvFormat: 'Trans. Date,Post Date,Description,Amount,Category' },
  { name: 'Capital One Credit Card', type: 'Credit Card', csvFormat: 'Transaction Date,Posted Date,Card No.,Description,Category,Debit,Credit' },
  
  // Investment
  { name: 'Fidelity', type: 'Investment', csvFormat: 'Run Date,Account,Action,Symbol,Security Description,Security Type,Quantity,Price ($),Commission ($),Fees ($),Accrued Interest ($),Amount ($),Settlement Date' },
  { name: 'Vanguard', type: 'Investment', csvFormat: 'Trade Date,Process Date,Settle Date,Account Number,Transaction Type,Transaction Description,Investment Name,Symbol,Shares,Price,Total Amount' },
  
  // Fintech
  { name: 'PayPal', type: 'Fintech', csvFormat: 'Date,Time,TimeZone,Name,Type,Status,Currency,Amount,Fee,Net' },
  { name: 'Venmo', type: 'Fintech', csvFormat: 'ID,Datetime,Type,Status,Note,From,To,Amount (total),Amount (fee)' },
  
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
  { key: 'reference', label: 'Reference', required: false, description: 'Transaction ID/reference' },
  { key: 'category', label: 'Category', required: false, description: 'Transaction category' },
  { key: 'balance', label: 'Balance', required: false, description: 'Running balance' },
  { key: 'checkNumber', label: 'Check Number', required: false, description: 'Check number' },
  { key: 'merchant', label: 'Merchant', required: false, description: 'Merchant/payee name' }
];

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
        <p>Configure how to import CSV files from your bank</p>
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
          <p>Map CSV columns to transaction fields</p>
          
          <div className="field-mapping-grid">
            {SYSTEM_FIELDS.map((field) => (
              <div key={field.key} className="mapping-row">
                <div className="field-info">
                  <label className={field.required ? 'required' : ''}>
                    {field.label}
                    {field.required && ' *'}
                  </label>
                  <p className="field-description">{field.description}</p>
                </div>
                <select
                  value={formData.fieldMapping[field.key] || ''}
                  onChange={(e) => handleFieldMapping(field.key, e.target.value)}
                  className="mapping-select"
                >
                  <option value="">Not mapped</option>
                  {csvColumns.map((col, index) => (
                    <option key={index} value={col}>
                      {col || `Column ${index + 1}`}
                    </option>
                  ))}
                </select>
              </div>
            ))}
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
                  <select
                    id="currency"
                    value={formData.settings.currency}
                    onChange={(e) => handleSettingChange('currency', e.target.value)}
                  >
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="GBP">GBP</option>
                    <option value="CAD">CAD</option>
                    <option value="AUD">AUD</option>
                  </select>
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