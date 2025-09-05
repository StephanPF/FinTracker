import React, { useState, useCallback } from 'react';
import { useAccounting } from '../contexts/AccountingContext';
import { useLanguage } from '../contexts/LanguageContext';
import Papa from 'papaparse';
import TransactionReviewQueue from './TransactionReviewQueue';
import { applyProcessingRules } from '../utils/ruleProcessor';
import './ImportTransactions.css';

const ImportTransactions = () => {
  const { bankConfigurations = [], transactions = [], currencies = [], getActiveProcessingRules } = useAccounting();
  const { t } = useLanguage();

  // Helper function to convert Date object to YYYY-MM-DD string (timezone-safe)
  const dateToISOString = (date) => {
    if (!date) return '';
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [selectedBank, setSelectedBank] = useState(null);
  const [step, setStep] = useState(1);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [dragActive, setDragActive] = useState(false);
  const [parsedTransactions, setParsedTransactions] = useState([]);
  const [processing, setProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [ruleProcessingStats, setRuleProcessingStats] = useState(null);

  const handleBankSelect = (bank) => {
    setSelectedBank(bank);
    setStep(2);
  };

  const handleDragEnter = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  }, []);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = Array.from(e.dataTransfer.files);
    const validFiles = files.filter(file => 
      file.type === 'text/csv' || 
      file.name.endsWith('.csv') ||
      file.name.endsWith('.xls') ||
      file.name.endsWith('.xlsx')
    );

    if (validFiles.length > 0) {
      setUploadedFiles(prev => [...prev, ...validFiles]);
      setStep(3);
    }
  }, []);

  const handleFileInput = (e) => {
    const files = Array.from(e.target.files);
    const validFiles = files.filter(file => 
      file.type === 'text/csv' || 
      file.name.endsWith('.csv') ||
      file.name.endsWith('.xls') ||
      file.name.endsWith('.xlsx')
    );

    if (validFiles.length > 0) {
      setUploadedFiles(prev => [...prev, ...validFiles]);
      setStep(3);
    }
  };

  const removeFile = (index) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
    if (uploadedFiles.length === 1) {
      setStep(2);
    }
  };

  const resetImport = () => {
    setSelectedBank(null);
    setUploadedFiles([]);
    setParsedTransactions([]);
    setProcessing(false);
    setProcessingProgress(0);
    setStep(1);
  };

  const parseDate = (dateString, format) => {
    if (!dateString) return null;
    
    // Remove any quotes and trim
    const cleaned = dateString.replace(/['"]/g, '').trim();
    if (!cleaned) return null;

    try {
      // Handle different date formats
      let date;
      if (format === 'MM/DD/YYYY') {
        const [month, day, year] = cleaned.split('/');
        date = new Date(year, month - 1, day);
      } else if (format === 'DD/MM/YYYY') {
        const [day, month, year] = cleaned.split('/');
        date = new Date(year, month - 1, day);
      } else if (format === 'YYYY-MM-DD') {
        date = new Date(cleaned);
      } else {
        // Try to parse as is
        date = new Date(cleaned);
      }

      // Validate the date
      if (isNaN(date.getTime())) {
        return null;
      }

      return dateToISOString(date); // Return YYYY-MM-DD format (timezone-safe)
    } catch (error) {
      console.warn('Error parsing date:', dateString, error);
      return null;
    }
  };

  const parseAmount = (row, bankConfig) => {
    const { fieldMapping, settings } = bankConfig;
    
    if (settings.amountHandling === 'separate') {
      // Handle separate debit/credit columns
      const debitValue = row[fieldMapping.debit] || '0';
      const creditValue = row[fieldMapping.credit] || '0';
      
      const debit = parseFloat(debitValue.replace(/[^-0-9.]/g, '')) || 0;
      const credit = parseFloat(creditValue.replace(/[^-0-9.]/g, '')) || 0;
      
      // Return positive for credits (income), negative for debits (expenses)
      return credit > 0 ? credit : -debit;
    } else {
      // Handle single signed amount column
      const amountValue = row[fieldMapping.amount] || '0';
      return parseFloat(amountValue.replace(/[^-0-9.]/g, '')) || 0;
    }
  };

  const detectDuplicates = (newTransaction) => {
    // Simple duplicate detection based on amount, date, and description similarity
    const matches = transactions.filter(existing => {
      const amountMatch = Math.abs(existing.amount - newTransaction.amount) < 0.01;
      const dateMatch = existing.date === newTransaction.date;
      const descMatch = existing.description && newTransaction.description &&
        existing.description.toLowerCase().includes(newTransaction.description.toLowerCase().substring(0, 10));
      
      return amountMatch && dateMatch && descMatch;
    });

    return matches.length > 0;
  };

  const validateTransaction = (transaction) => {
    const errors = [];
    const warnings = [];

    // ========== ALWAYS REQUIRED FIELDS (ERROR if missing) ==========
    
    if (!transaction.date) {
      errors.push('Missing or invalid date - check date field mapping');
    }

    if (!transaction.description || transaction.description.trim() === '') {
      errors.push('Missing description - check description field mapping');
    }

    if (transaction.amount === 0 || isNaN(transaction.amount)) {
      errors.push('Invalid amount - check amount/debit/credit field mapping');
    }

    // CRITICAL: subcategoryId is always required in Add Transaction form
    if (!transaction.subcategoryId) {
      errors.push('Missing subcategory - transaction classification required');
    }

    // ========== CONDITIONALLY REQUIRED FIELDS (WARNING if missing) ==========

    // Account mapping - required for successful import but can be assigned during review
    if (!transaction.fromAccountId && !transaction.toAccountId && !transaction.accountId) {
      warnings.push('No account mapping - will need manual assignment during review');
    }

    // Transaction type-specific validations
    const transactionType = transaction.transactionType?.toLowerCase();
    
    // Income transactions require payer
    if (transactionType === 'income' && !transaction.payer) {
      warnings.push('Income transaction missing payer - required for Add Transaction form');
    }
    
    // Expenses transactions require payee
    if (transactionType === 'expenses' && !transaction.payee) {
      warnings.push('Expenses transaction missing payee - required for Add Transaction form');
    }
    
    // Transfer transactions require destination account
    if (transactionType === 'transfer') {
      if (!transaction.destinationAccountId) {
        warnings.push('Transfer transaction missing destination account');
      }
    }
    
    // Investment transactions require destination account and destination amount
    if (transactionType?.includes('investment')) {
      if (!transaction.destinationAccountId) {
        warnings.push('Investment transaction missing destination account');
      }
      if (!transaction.destinationAmount || transaction.destinationAmount === 0) {
        warnings.push('Investment transaction missing destination amount');
      }
      // Investment transactions need broker (via payee or payer)
      if (!transaction.payee && !transaction.payer) {
        warnings.push('Investment transaction missing broker information');
      }
    }

    // ========== INFORMATIONAL WARNINGS (show mapped fields) ==========
    
    // Show successfully mapped classification fields
    if (transaction.transactionType) {
      warnings.push(`✓ Transaction type mapped: ${transaction.transactionType}`);
    }
    
    if (transaction.transactionGroup) {
      warnings.push(`✓ Transaction group mapped: ${transaction.transactionGroup}`);
    }
    
    if (transaction.subcategoryId) {
      warnings.push(`✓ Subcategory mapped`);
    }
    
    // Show successfully mapped parties
    if (transaction.payee) {
      warnings.push(`✓ Payee mapped: ${transaction.payee}`);
    }
    
    if (transaction.payer) {
      warnings.push(`✓ Payer mapped: ${transaction.payer}`);
    }
    
    // Show additional mapped fields
    if (transaction.reference) {
      warnings.push(`✓ Reference mapped: ${transaction.reference}`);
    }
    
    if (transaction.tag) {
      warnings.push(`✓ Tag mapped: ${transaction.tag}`);
    }
    
    if (transaction.notes) {
      warnings.push(`✓ Notes mapped`);
    }

    return { errors, warnings };
  };

  const processFiles = async () => {
    if (!selectedBank || uploadedFiles.length === 0) return;

    // Initialize skipped transactions counter
    window.totalSkippedTransactions = 0;

    setProcessing(true);
    setProcessingProgress(0);
    
    try {
      const allParsedTransactions = [];
      
      for (let fileIndex = 0; fileIndex < uploadedFiles.length; fileIndex++) {
        const file = uploadedFiles[fileIndex];
        setProcessingProgress((fileIndex / uploadedFiles.length) * 50); // First 50% for parsing

        await new Promise((resolve, reject) => {
          Papa.parse(file, {
            header: selectedBank.settings.hasHeaders,
            delimiter: selectedBank.settings.delimiter || ',',
            encoding: selectedBank.settings.encoding || 'UTF-8',
            skipEmptyLines: true,
            complete: (results) => {
              try {
                const fileTransactions = results.data.map((row, index) => {
                  // Map CSV fields to transaction fields using persistent database field mappings
                  // This includes all the new fields: transactionType, transactionGroup, subcategoryId,
                  // payee, payer, tag, notes, destinationAccountId, etc.
                  const fieldMapping = selectedBank.fieldMapping || {};
                  
                  const mappedTransaction = {
                    id: `import_${Date.now()}_${fileIndex}_${index}`,
                    // Core required fields
                    date: parseDate(row[fieldMapping.date], selectedBank.settings.dateFormat),
                    description: row[fieldMapping.description] || '',
                    amount: parseAmount(row, selectedBank),
                    
                    // Account mappings
                    accountId: row[fieldMapping.account] || null, // Primary account from CSV
                    fromAccountId: null, // Will be assigned during review
                    toAccountId: null,   // Will be assigned during review
                    destinationAccountId: row[fieldMapping.destinationAccountId] || null,
                    destinationAmount: row[fieldMapping.destinationAmount] ? parseFloat(row[fieldMapping.destinationAmount]) : null,
                    
                    // Transaction classification
                    transactionType: row[fieldMapping.transactionType] || '',
                    transactionGroup: row[fieldMapping.transactionGroup] || '',
                    categoryId: row[fieldMapping.category] || '', // Legacy support
                    subcategoryId: row[fieldMapping.subcategoryId] || '',
                    
                    // Parties
                    payee: row[fieldMapping.payee] || '',
                    payer: row[fieldMapping.payer] || '',
                    
                    // Additional fields
                    reference: row[fieldMapping.reference] || '',
                    tag: row[fieldMapping.tag] || '',
                    notes: row[fieldMapping.notes] || '',
                    
                    // System defaults (use bank's currency setting)
                    currencyId: (() => {
                      if (selectedBank.settings?.currency) {
                        // Find the currency by code
                        const currency = currencies.find(c => c.code === selectedBank.settings.currency);
                        return currency ? currency.id : 'CUR_001';
                      }
                      return 'CUR_001'; // Default to base currency
                    })(),
                    tags: row[fieldMapping.tag] ? [row[fieldMapping.tag]] : [],
                    
                    // Processing metadata
                    fileName: file.name,
                    rowIndex: index,
                    rawData: row
                  };

                  // Apply processing rules
                  const activeRules = getActiveProcessingRules(selectedBank.id);
                  const ruleResult = applyProcessingRules(mappedTransaction, activeRules, selectedBank.fieldMapping);
                  
                  // If rule says to ignore this row, skip it
                  if (ruleResult.ignored) {
                    return null; // Will be filtered out later
                  }
                  
                  const processedTransaction = ruleResult.transaction;

                  // Validate and detect duplicates
                  const validation = validateTransaction(processedTransaction);
                  const isDuplicate = detectDuplicates(processedTransaction);

                  // Determine status
                  let status = 'ready';
                  if (validation.errors.length > 0) {
                    status = 'error';
                  } else if (validation.warnings.length > 0 || isDuplicate) {
                    status = 'warning';
                  }

                  return {
                    ...processedTransaction,
                    status,
                    isDuplicate,
                    validation,
                    bankConfig: selectedBank,
                    // Add rule processing metadata
                    rulesApplied: ruleResult.applied
                  };
                });

                // Count skipped (null) transactions before filtering
                const skippedCount = fileTransactions.filter(t => t === null).length;
                
                // Filter out null results (ignored rows) and add to collection
                const validFileTransactions = fileTransactions.filter(t => t !== null);
                allParsedTransactions.push(...validFileTransactions);
                
                // Track total skipped count across all files
                if (!window.totalSkippedTransactions) {
                  window.totalSkippedTransactions = 0;
                }
                window.totalSkippedTransactions += skippedCount;
                resolve();
              } catch (error) {
                reject(error);
              }
            },
            error: (error) => {
              reject(error);
            }
          });
        });
      }

      // Filter out completely invalid rows
      const validTransactions = allParsedTransactions.filter(t => 
        t.date && t.description && !isNaN(t.amount)
      );

      // Calculate rule processing statistics
      const totalRules = allParsedTransactions.reduce((sum, t) => sum + (t.rulesApplied?.length || 0), 0);
      const transactionsWithRules = allParsedTransactions.filter(t => t.rulesApplied && t.rulesApplied.length > 0).length;
      
      setRuleProcessingStats({
        totalTransactions: allParsedTransactions.length,
        validTransactions: validTransactions.length,
        transactionsWithRules,
        totalRulesApplied: totalRules,
        skippedTransactions: window.totalSkippedTransactions || 0
      });

      setProcessingProgress(100);
      setParsedTransactions(validTransactions);
      setStep(4); // Move to review step

    } catch (error) {
      console.error('Error processing files:', error);
      alert('Error processing files: ' + error.message);
    } finally {
      setProcessing(false);
    }
  };

  if (bankConfigurations.length === 0) {
    return (
      <div className="import-transactions">
        <div className="import-header">
          <h2>📥 Import Transactions</h2>
        </div>
        
        <div className="no-banks-configured">
          <div className="no-banks-icon">🏦</div>
          <h3>No Banks Configured</h3>
          <p>You need to configure at least one bank before importing transactions.</p>
          <button className="btn btn-primary">
            {t('goToSettings')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="import-transactions">
      <div className="import-header">
        <h2>📥 {t('importTransactionsTitle')}</h2>
        {step > 1 && (
          <button className="btn btn-secondary" onClick={resetImport}>
            {t('startOver')}
          </button>
        )}
      </div>

      {step === 1 && (
        <div className="bank-selection">
          <h3>{t('stepOne')}: {t('selectYourBank')}</h3>
          <p>{t('chooseBankConfig')}</p>
          
          <div className="bank-cards">
            {bankConfigurations.map((bank, index) => (
              <div 
                key={index}
                className="bank-card"
                onClick={() => handleBankSelect(bank)}
              >
                <div className="bank-logo">🏦</div>
                <div className="bank-info">
                  <h4>{bank.name}</h4>
                  <p>{bank.type || t('customConfiguration')}</p>
                </div>
                <div className="bank-arrow">→</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {step === 2 && selectedBank && (
        <div className="file-upload">
          <h3>{t('stepTwo')}: {t('uploadYourFiles')}</h3>
          <p>{t('uploadFromBank')} <strong>{selectedBank.name}</strong></p>
          
          <div className="expected-format">
            <h4>{t('expectedFormat')}:</h4>
            <div className="format-preview">
              <div className="format-fields">
                {selectedBank.fieldMapping && Object.entries(selectedBank.fieldMapping).map(([field, column]) => (
                  <span key={field} className="format-field">
                    {column || field}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div 
            className={`file-drop-zone ${dragActive ? 'drag-active' : ''}`}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
            <div className="drop-zone-content">
              <div className="bank-logo-large">🏦</div>
              <h3>{selectedBank.name}</h3>
              <p className="drop-text">
                {dragActive ? t('dropFilesHere') : t('dragDropFiles')}
              </p>
              <input
                type="file"
                multiple
                accept=".csv,.xls,.xlsx"
                onChange={handleFileInput}
                className="file-input-hidden"
                id="file-input"
              />
              <label htmlFor="file-input" className="btn btn-primary">
                Choose Files
              </label>
              <p className="supported-formats">
                Supported formats: CSV, XLS, XLSX
              </p>
            </div>
          </div>
        </div>
      )}

      {step === 3 && uploadedFiles.length > 0 && (
        <div className="file-processing">
          <h3>Step 3: Review Uploaded Files</h3>
          
          <div className="uploaded-files">
            {uploadedFiles.map((file, index) => (
              <div key={index} className="uploaded-file">
                <div className="file-info">
                  <span className="file-icon">📄</span>
                  <div className="file-details">
                    <span className="file-name">{file.name}</span>
                    <span className="file-size">{(file.size / 1024).toFixed(1)} KB</span>
                  </div>
                </div>
                <button 
                  className="btn btn-danger btn-small"
                  onClick={() => removeFile(index)}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>

          <div className="processing-actions">
            <button 
              className="btn btn-primary btn-large" 
              onClick={processFiles}
              disabled={processing}
            >
              {processing ? t('processing') : t('processFiles')}
            </button>
            {processing && (
              <div className="processing-progress">
                <div className="progress-bar">
                  <div 
                    className="progress-fill" 
                    style={{ width: `${processingProgress}%` }}
                  ></div>
                </div>
                <p className="progress-text">{processingProgress}% Complete</p>
              </div>
            )}
            <p className="processing-note">
              Files will be parsed and prepared for review before importing.
            </p>
          </div>
        </div>
      )}

      {step === 4 && parsedTransactions.length > 0 && (
        <TransactionReviewQueue
          transactions={parsedTransactions}
          onBack={() => setStep(3)}
          onReset={resetImport}
          ruleProcessingStats={ruleProcessingStats}
        />
      )}
    </div>
  );
};

export default ImportTransactions;