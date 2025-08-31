import React, { useState, useCallback } from 'react';
import { useAccounting } from '../contexts/AccountingContext';
import Papa from 'papaparse';
import TransactionReviewQueue from './TransactionReviewQueue';
import './ImportTransactions.css';

const ImportTransactions = () => {
  const { bankConfigurations = [], transactions = [] } = useAccounting();
  const [selectedBank, setSelectedBank] = useState(null);
  const [step, setStep] = useState(1);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [dragActive, setDragActive] = useState(false);
  const [parsedTransactions, setParsedTransactions] = useState([]);
  const [processing, setProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);

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

      return date.toISOString().split('T')[0]; // Return YYYY-MM-DD format
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

    if (!transaction.date) {
      errors.push('Missing or invalid date');
    }

    if (!transaction.description || transaction.description.trim() === '') {
      errors.push('Missing description');
    }

    if (transaction.amount === 0 || isNaN(transaction.amount)) {
      errors.push('Invalid amount');
    }

    if (!transaction.fromAccountId && !transaction.toAccountId) {
      warnings.push('No account mapping - will need manual assignment');
    }

    return { errors, warnings };
  };

  const processFiles = async () => {
    if (!selectedBank || uploadedFiles.length === 0) return;

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
                  // Map CSV fields to transaction fields
                  const mappedTransaction = {
                    id: `import_${Date.now()}_${fileIndex}_${index}`,
                    date: parseDate(row[selectedBank.fieldMapping.date], selectedBank.settings.dateFormat),
                    description: row[selectedBank.fieldMapping.description] || '',
                    amount: parseAmount(row, selectedBank),
                    reference: row[selectedBank.fieldMapping.reference] || '',
                    category: row[selectedBank.fieldMapping.category] || '',
                    checkNumber: row[selectedBank.fieldMapping.checkNumber] || '',
                    merchant: row[selectedBank.fieldMapping.merchant] || '',
                    balance: row[selectedBank.fieldMapping.balance] || '',
                    // Default values
                    fromAccountId: null,
                    toAccountId: null,
                    currencyId: 'CUR_001', // Default to base currency
                    tags: [],
                    notes: '',
                    // Processing metadata
                    fileName: file.name,
                    rowIndex: index,
                    rawData: row
                  };

                  // Validate and detect duplicates
                  const validation = validateTransaction(mappedTransaction);
                  const isDuplicate = detectDuplicates(mappedTransaction);

                  // Determine status
                  let status = 'ready';
                  if (validation.errors.length > 0) {
                    status = 'error';
                  } else if (validation.warnings.length > 0 || isDuplicate) {
                    status = 'warning';
                  }

                  return {
                    ...mappedTransaction,
                    status,
                    isDuplicate,
                    validation,
                    bankConfig: selectedBank
                  };
                });

                allParsedTransactions.push(...fileTransactions);
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
            Go to Settings
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="import-transactions">
      <div className="import-header">
        <h2>📥 Import Transactions</h2>
        {step > 1 && (
          <button className="btn btn-secondary" onClick={resetImport}>
            Start Over
          </button>
        )}
      </div>

      {step === 1 && (
        <div className="bank-selection">
          <h3>Step 1: Select Your Bank</h3>
          <p>Choose the bank configuration to use for importing your transactions.</p>
          
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
                  <p>{bank.type || 'Custom Configuration'}</p>
                </div>
                <div className="bank-arrow">→</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {step === 2 && selectedBank && (
        <div className="file-upload">
          <h3>Step 2: Upload Your Files</h3>
          <p>Upload CSV files from <strong>{selectedBank.name}</strong></p>
          
          <div className="expected-format">
            <h4>Expected Format:</h4>
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
                {dragActive ? 'Drop files here' : 'Drop CSV files here or click to browse'}
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
              {processing ? 'Processing...' : 'Process Files'}
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
        />
      )}
    </div>
  );
};

export default ImportTransactions;