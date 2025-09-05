import React, { useState, useRef, useEffect } from 'react';
import { useAccounting } from '../contexts/AccountingContext';
import { useLanguage } from '../contexts/LanguageContext';
import ProcessingRulesSection from './ProcessingRulesSection';
import RuleCreationModal from './RuleCreationModal';
import Papa from 'papaparse';
import './BankConfigurationForm.css';

const PRESET_BANKS = [
  // Credit Cards
  { name: 'American Express', type: 'Credit Card', csvFormat: 'Date,Description,Card Member,Account #,Amount' },
  { name: 'Citibank', type: 'Major US Bank', csvFormat: 'Date,Description,Debit,Credit,Balance' },
  
  // Custom
  { name: 'Custom Configuration', type: 'Custom', csvFormat: 'Configure your own mapping' }
];

const getSystemFields = (t) => [
  { key: 'date', label: t('date'), required: true, description: t('transactionDate') },
  { key: 'description', label: t('description'), required: true, description: t('transactionDescription') },
  { key: 'amount', label: t('amount'), required: true, description: t('transactionAmount') },
  { key: 'debit', label: t('debit'), required: false, description: t('debitAmount') },
  { key: 'credit', label: t('credit'), required: false, description: t('creditAmount') },
  { key: 'account', label: t('account'), required: false, description: t('accountNumber') },
  { key: 'destinationAccountId', label: t('destinationAccount'), required: false, description: t('destinationAccountField') },
  { key: 'destinationAmount', label: t('destinationAmount'), required: false, description: t('destinationAmountField') },
  { key: 'reference', label: t('reference'), required: false, description: t('transactionReference') },
  { key: 'transactionType', label: t('transactionType'), required: false, description: t('transactionTypeField') },
  { key: 'transactionGroup', label: t('transactionGroup'), required: false, description: t('transactionGroupField') },
  { key: 'category', label: t('category'), required: false, description: t('categoryField') },
  { key: 'subcategoryId', label: t('subcategory'), required: false, description: t('subcategoryField') },
  { key: 'payee', label: t('payee'), required: false, description: t('payeeField') },
  { key: 'payer', label: t('payer'), required: false, description: t('payerField') },
  { key: 'tag', label: t('tag'), required: false, description: t('tagField') },
  { key: 'notes', label: t('notes'), required: false, description: t('notesField') }
];


const BankConfigurationForm = ({ initialData, onSave, onCancel, isEditing }) => {
  const { addProcessingRule, updateProcessingRule, getActiveCurrencies } = useAccounting();
  const { t } = useLanguage();
  const SYSTEM_FIELDS = getSystemFields(t);
  
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
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const fileInputRef = useRef(null);

  // Parse CSV line using Papa Parse for consistency with transaction import
  const parseCsvLine = (line, delimiter = ',', hasHeaders = true) => {
    return new Promise((resolve) => {
      Papa.parse(line, {
        header: false, // Always parse as array since we're parsing a single line
        delimiter: delimiter,
        skipEmptyLines: false,
        complete: (results) => {
          resolve(results.data[0] || []);
        },
        error: (error) => {
          console.warn('CSV parsing error:', error);
          resolve([]);
        }
      });
    });
  };

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

  const handleSampleUpload = async (e) => {
    const file = e.target.files[0];
    if (file && file.type === 'text/csv') {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const csv = event.target.result;
        const lines = csv.split('\n');
        const firstLine = lines[0];
        setCsvSample(firstLine);
        
        const rawColumns = await parseCsvLine(firstLine, formData.settings.delimiter || ',');
        let columns;
        
        if (formData.settings.hasHeaders) {
          // Use actual column headers from the CSV
          columns = rawColumns.map(col => col.trim());
        } else {
          // Generate generic column names (Col A, Col B, etc.)
          columns = rawColumns.map((_, index) => {
            return `Col ${String.fromCharCode(65 + index)}`; // A, B, C, etc.
          });
        }
        
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

  const handleSettingChange = async (setting, value) => {
    setFormData(prev => ({
      ...prev,
      settings: {
        ...prev.settings,
        [setting]: value
      }
    }));
    
    // If hasHeaders or delimiter setting changed and we have a CSV sample, re-parse the columns
    if ((setting === 'hasHeaders' || setting === 'delimiter') && csvSample) {
      const delimiter = setting === 'delimiter' ? value : formData.settings.delimiter || ',';
      const hasHeaders = setting === 'hasHeaders' ? value : formData.settings.hasHeaders;
      const rawColumns = await parseCsvLine(csvSample, delimiter);
      let columns;
      
      if (hasHeaders) {
        // Use actual column headers from the CSV
        columns = rawColumns.map(col => col.trim());
      } else {
        // Generate generic column names (Col A, Col B, etc.)
        columns = rawColumns.map((_, index) => {
          return `Col ${String.fromCharCode(65 + index)}`; // A, B, C, etc.
        });
      }
      
      setCsvColumns(columns);
    }
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

  // Rule management handlers
  const handleCreateRule = () => {
    setEditingRule(null);
    setShowCreateModal(true);
  };

  const handleEditRule = (rule) => {
    setEditingRule(rule);
    setShowCreateModal(true);
  };

  const handleCloseModal = () => {
    setShowCreateModal(false);
    setEditingRule(null);
  };

  const handleSaveRule = async (ruleData) => {
    try {
      // Rules can only be created for existing bank configurations
      if (!isEditing || !initialData?.id) {
        throw new Error('Bank configuration must be saved before adding rules');
      }
      
      const bankConfigId = initialData.id;
      
      if (editingRule) {
        await updateProcessingRule(editingRule.id, ruleData, bankConfigId);
      } else {
        await addProcessingRule(bankConfigId, ruleData);
      }
      
      handleCloseModal();
      // Rules will auto-update via context state
    } catch (error) {
      console.error('Error saving rule:', error);
      throw error;
    }
  };


  return (
    <div className="bank-configuration-form">
      <div className="form-header">
        <h3>{isEditing ? t('editBankConfiguration') : t('addBankConfiguration')}</h3>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Step 1: Choose Preset or Custom */}
        <div className="form-section">
          <h4>{t('step1ChooseBankType')}</h4>
          <div className="preset-selection">
            <select 
              value={selectedPreset}
              onChange={(e) => handlePresetChange(e.target.value)}
              className="form-select"
            >
              <option value="">{t('selectPresetOrCustom')}</option>
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
          <h4>{t('step2BasicInformation')}</h4>
          <div className="form-grid">
            <div className="form-field">
              <label htmlFor="bank-name">{t('bankName')} *</label>
              <input
                id="bank-name"
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder={t('enterBankName')}
                required
              />
            </div>
            <div className="form-field">
              <label htmlFor="bank-type">{t('type')}</label>
              <input
                id="bank-type"
                type="text"
                value={formData.type}
                onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value }))}
                placeholder={t('bankTypeExample')}
              />
            </div>
          </div>
        </div>

        {/* Step 3: CSV Sample */}
        <div className="form-section">
          <h4>{t('step3CsvSample')}</h4>
          <p>{t('configureParsingSettings')}</p>
          
          <div className="csv-parsing-settings">
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
            
            <div className="form-grid" style={{ marginTop: '15px' }}>
              <div className="form-field">
                <label htmlFor="date-format">{t('dateFormat')}</label>
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
                <label htmlFor="currency">{t('defaultCurrency')}</label>
                <select
                  id="currency"
                  value={formData.settings.currency}
                  onChange={(e) => handleSettingChange('currency', e.target.value)}
                >
                  {getActiveCurrencies().map((currency) => (
                    <option key={currency.id} value={currency.code}>
                      {currency.code} - {currency.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-field">
                <label htmlFor="delimiter">{t('csvDelimiter')}</label>
                <select
                  id="delimiter"
                  value={formData.settings.delimiter}
                  onChange={(e) => handleSettingChange('delimiter', e.target.value)}
                >
                  <option value=",">{t('comma')}</option>
                  <option value=";">{t('semicolon')}</option>
                  <option value="\t">{t('tab')}</option>
                  <option value="|">{t('pipe')}</option>
                </select>
              </div>

              <div className="form-field">
                <label htmlFor="amount-handling">{t('amountHandling')}</label>
                <select
                  id="amount-handling"
                  value={formData.settings.amountHandling}
                  onChange={(e) => handleSettingChange('amountHandling', e.target.value)}
                  style={{ minWidth: '200px' }}
                >
                  <option value="signed">{t('singleSignedColumn')}</option>
                  <option value="separate">{t('separateDebitCredit')}</option>
                </select>
              </div>
            </div>
          </div>

          <div className="file-upload-section" style={{ marginTop: '20px' }}>
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
              <h5>{t('csvPreview')}</h5>
              <div className="csv-sample">{csvSample}</div>
              <div className="detected-columns">
                <strong>{t('detectedColumns')}</strong>
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
          <h4>{t('step4FieldMapping')}</h4>
          
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
                      <span className="stat-label">{t('totalMapped')}</span>
                      <span className="stat-value">{mappedFields}/{totalFields}</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-label">{t('requiredMapped')}</span>
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
                        → {t('mappedTo')} <strong>"{formData.fieldMapping[field.key]}"</strong>
                      </p>
                    )}
                  </div>
                  <select
                    value={formData.fieldMapping[field.key] || ''}
                    onChange={(e) => handleFieldMapping(field.key, e.target.value)}
                    className={`mapping-select ${isMapped ? 'mapped-select' : 'unmapped-select'}`}
                  >
                    <option value="">{t('notMapped')}</option>
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


        {/* Processing Rules */}
        <div className="form-section">
          <ProcessingRulesSection 
            bankConfigId={isEditing ? initialData?.id : null}
            fieldMappings={formData.fieldMapping}
            onCreateRule={handleCreateRule}
            onEditRule={handleEditRule}
          />
        </div>

        {/* Form Actions */}
        <div className="form-actions">
          <button type="button" className="btn btn-secondary" onClick={onCancel}>
            {t('cancel')}
          </button>
          <button type="submit" className="btn btn-primary">
            {isEditing ? t('updateConfiguration') : t('saveConfiguration')}
          </button>
        </div>
      </form>

      {/* Rule Creation Modal - Outside form to prevent positioning constraints */}
      <RuleCreationModal
        isOpen={showCreateModal}
        rule={editingRule}
        onClose={handleCloseModal}
        onSave={handleSaveRule}
        availableFields={[
          // CSV mapped fields (for conditions)
          ...Object.keys(formData.fieldMapping).filter(key => formData.fieldMapping[key]),
          // All system fields (for actions)
          ...SYSTEM_FIELDS.map(f => f.key)
        ].filter((value, index, self) => self.indexOf(value) === index)}
        isEditing={!!editingRule}
      />
    </div>
  );
};

export default BankConfigurationForm;