import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { useAccounting } from '../contexts/AccountingContext';
import './PrepaidExpenseModal.css';

const PrepaidExpenseModal = ({ transaction, isOpen, onClose, onSave }) => {
  const { currencies, numberFormatService } = useAccounting();
  const [selectedMethod, setSelectedMethod] = useState(transaction?.recognitionMethod || '');
  const [serviceStartDate, setServiceStartDate] = useState(
    transaction?.serviceStartDate ? new Date(transaction.serviceStartDate) : null
  );
  const [serviceEndDate, setServiceEndDate] = useState(
    transaction?.serviceEndDate ? new Date(transaction.serviceEndDate) : null
  );
  const [preview, setPreview] = useState(null);
  const [errors, setErrors] = useState([]);

  // Initialize or reset state based on modal open/close and transaction
  useEffect(() => {
    if (isOpen && transaction) {
      // Populate with existing prepaid data when opening
      setSelectedMethod(transaction.recognitionMethod || '');
      setServiceStartDate(
        transaction.serviceStartDate ? new Date(transaction.serviceStartDate) : null
      );
      setServiceEndDate(
        transaction.serviceEndDate ? new Date(transaction.serviceEndDate) : null
      );
      setPreview(null);
      setErrors([]);
    } else if (!isOpen) {
      // Clear state when modal closes
      setSelectedMethod('');
      setServiceStartDate(null);
      setServiceEndDate(null);
      setPreview(null);
      setErrors([]);
    }
  }, [isOpen, transaction]);

  // Helper function to calculate months between dates
  const getMonthsBetween = (startDate, endDate) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
    return Math.max(1, months); // Minimum 1 month
  };

  // Helper function to format currency
  const formatCurrency = (amount, currencyId = null) => {
    if (numberFormatService && currencyId) {
      return numberFormatService.formatCurrency(amount, currencyId);
    }
    
    const currency = currencies.find(c => c.id === currencyId) || currencies.find(c => c.code === 'USD');
    const currencyCode = currency?.code || 'USD';
    
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode
    }).format(amount);
  };

  // Helper function to format date for display
  const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Calculate preview when method or dates change
  useEffect(() => {
    if (!selectedMethod || !transaction) {
      setPreview(null);
      return;
    }

    const amount = Math.abs(transaction.amount);
    const transactionDate = transaction.date;
    
    let description, monthlyAmount, months;
    
    switch (selectedMethod) {
      case 'defer':
        if (serviceStartDate) {
          const startDateStr = serviceStartDate.toISOString().split('T')[0];
          description = `Full ${formatCurrency(amount, transaction.currencyId)} will be recognized on ${formatDate(startDateStr)} (1 month)`;
          monthlyAmount = amount;
          months = 1;
        }
        break;
      
      case 'amortize':
        if (serviceEndDate) {
          const endDateStr = serviceEndDate.toISOString().split('T')[0];
          months = getMonthsBetween(transactionDate, endDateStr);
          monthlyAmount = amount / months;
          description = `${formatCurrency(monthlyAmount, transaction.currencyId)}/month from ${formatDate(transactionDate)} to ${formatDate(endDateStr)} (${months} months)`;
        }
        break;
      
      case 'defer_and_amortize':
        if (serviceStartDate && serviceEndDate) {
          const startDateStr = serviceStartDate.toISOString().split('T')[0];
          const endDateStr = serviceEndDate.toISOString().split('T')[0];
          months = getMonthsBetween(startDateStr, endDateStr);
          monthlyAmount = amount / months;
          description = `${formatCurrency(monthlyAmount, transaction.currencyId)}/month from ${formatDate(startDateStr)} to ${formatDate(endDateStr)} (${months} months)`;
        }
        break;
    }
    
    if (description) {
      setPreview({ description, monthlyAmount, months });
    } else {
      setPreview(null);
    }
  }, [selectedMethod, serviceStartDate, serviceEndDate, transaction, currencies, numberFormatService]);

  // Validate dates
  useEffect(() => {
    const newErrors = [];
    
    if (!selectedMethod || !transaction) {
      setErrors(newErrors);
      return;
    }

    const transactionDate = new Date(transaction.date);
    
    // All service dates must be >= transaction date
    if (serviceStartDate) {
      if (serviceStartDate < transactionDate) {
        newErrors.push('Service start date must be after transaction date');
      }
    }
    
    if (serviceEndDate) {
      if (serviceEndDate < transactionDate) {
        newErrors.push('Service end date must be after transaction date');
      }
    }
    
    // End date must be after start date
    if (serviceStartDate && serviceEndDate) {
      if (serviceEndDate <= serviceStartDate) {
        newErrors.push('Service end date must be after start date');
      }
    }
    
    // Method-specific validation
    switch (selectedMethod) {
      case 'defer':
        if (!serviceStartDate) newErrors.push('Service date is required');
        break;
      case 'amortize':
        if (!serviceEndDate) newErrors.push('Service end date is required');
        break;
      case 'defer_and_amortize':
        if (!serviceStartDate) newErrors.push('Service start date is required');
        if (!serviceEndDate) newErrors.push('Service end date is required');
        break;
    }
    
    setErrors(newErrors);
  }, [selectedMethod, serviceStartDate, serviceEndDate, transaction]);

  const handleSave = () => {
    if (errors.length > 0) return;

    // Calculate recognition status
    const currentDate = new Date();
    let recognitionStatus = 'pending';
    let recognizedToDate = 0;

    switch (selectedMethod) {
      case 'defer':
        if (currentDate >= new Date(serviceStartDate)) {
          recognitionStatus = 'completed';
          recognizedToDate = Math.abs(transaction.amount);
        }
        break;
      case 'amortize':
        if (currentDate >= new Date(transaction.date)) {
          const totalMonths = getMonthsBetween(transaction.date, serviceEndDate);
          const elapsedMonths = getMonthsBetween(transaction.date, currentDate.toISOString().split('T')[0]);
          const monthlyAmount = Math.abs(transaction.amount) / totalMonths;
          recognizedToDate = Math.min(monthlyAmount * elapsedMonths, Math.abs(transaction.amount));
          
          if (recognizedToDate >= Math.abs(transaction.amount)) {
            recognitionStatus = 'completed';
          } else if (recognizedToDate > 0) {
            recognitionStatus = 'active';
          }
        }
        break;
      case 'defer_and_amortize':
        if (currentDate >= new Date(serviceStartDate)) {
          const totalMonths = getMonthsBetween(serviceStartDate, serviceEndDate);
          const elapsedMonths = getMonthsBetween(serviceStartDate, currentDate.toISOString().split('T')[0]);
          const monthlyAmount = Math.abs(transaction.amount) / totalMonths;
          recognizedToDate = Math.min(monthlyAmount * elapsedMonths, Math.abs(transaction.amount));
          
          if (recognizedToDate >= Math.abs(transaction.amount)) {
            recognitionStatus = 'completed';
          } else if (recognizedToDate > 0) {
            recognitionStatus = 'active';
          }
        }
        break;
    }

    const prepaidData = {
      isPrepaid: true,
      recognitionMethod: selectedMethod,
      serviceStartDate: serviceStartDate ? serviceStartDate.toISOString().split('T')[0] : null,
      serviceEndDate: serviceEndDate ? serviceEndDate.toISOString().split('T')[0] : null,
      recognitionStatus,
      recognizedToDate,
      remainingToRecognize: Math.abs(transaction.amount) - recognizedToDate
    };

    onSave(transaction.id, prepaidData);
  };

  const handleRemovePrepaid = () => {
    const prepaidData = {
      isPrepaid: false,
      recognitionMethod: null,
      serviceStartDate: null,
      serviceEndDate: null,
      recognitionStatus: null,
      recognizedToDate: 0,
      remainingToRecognize: null
    };

    onSave(transaction.id, prepaidData);
  };

  const isValid = errors.length === 0 && selectedMethod && 
    ((selectedMethod === 'defer' && serviceStartDate) ||
     (selectedMethod === 'amortize' && serviceEndDate) ||
     (selectedMethod === 'defer_and_amortize' && serviceStartDate && serviceEndDate));

  if (!isOpen || !transaction) return null;

  // Don't allow prepaid on transfers
  if (transaction.categoryId === 'CAT_003') {
    return createPortal(
      <div className="modal-overlay" onClick={onClose}>
        <div className="prepaid-modal" onClick={e => e.stopPropagation()}>
          <div className="modal-header">
            <h3>Cannot Mark as Prepaid</h3>
            <button className="close-btn" onClick={onClose}>×</button>
          </div>
          <div className="modal-content">
            <p>Transfer transactions cannot be marked as prepaid expenses.</p>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={onClose}>
                Close
              </button>
            </div>
          </div>
        </div>
      </div>,
      document.body
    );
  }

  return createPortal(
    <div className="modal-overlay" onClick={onClose}>
      <div className="prepaid-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Configure Prepaid Expense</h3>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        
        <div className="modal-content">
          {/* Transaction Info */}
          <div className="transaction-info">
            <div className="info-row">
              <span className="label">Transaction:</span>
              <span className="value">{transaction.description}</span>
            </div>
            <div className="info-row">
              <span className="label">Amount:</span>
              <span className="value">{formatCurrency(Math.abs(transaction.amount), transaction.currencyId)}</span>
            </div>
            <div className="info-row">
              <span className="label">Date:</span>
              <span className="value">{formatDate(transaction.date)}</span>
            </div>
          </div>

          {/* Main Content - Two Column Layout */}
          <div className="modal-main-content">
            {/* Left Column - Recognition Method */}
            <div className="modal-left-column">
              <div className="form-section">
                <label htmlFor="recognitionMethod" className="section-label">Recognition Method</label>
                <select
                  id="recognitionMethod"
                  value={selectedMethod}
                  onChange={(e) => setSelectedMethod(e.target.value)}
                  className="recognition-select"
                >
                  <option value="">Select recognition method...</option>
                  <option value="defer">Defer expense</option>
                  <option value="amortize">Amortize expense</option>
                  <option value="defer_and_amortize">Defer and amortize</option>
                </select>
                
                {/* Explanatory text based on selection */}
                {selectedMethod && (
                  <div className="method-explanation">
                    {selectedMethod === 'defer' && (
                      <div className="explanation-content">
                        <div className="explanation-title">Defer expense</div>
                        <div className="explanation-text">
                          The full amount will be recognized as an expense on the service start date. 
                          Use this for payments made in advance for services that will be consumed on a specific future date.
                        </div>
                      </div>
                    )}
                    {selectedMethod === 'amortize' && (
                      <div className="explanation-content">
                        <div className="explanation-title">Amortize expense</div>
                        <div className="explanation-text">
                          The amount will be spread evenly from the transaction date to the service end date. 
                          Recognition begins immediately after payment.
                        </div>
                      </div>
                    )}
                    {selectedMethod === 'defer_and_amortize' && (
                      <div className="explanation-content">
                        <div className="explanation-title">Defer and amortize</div>
                        <div className="explanation-text">
                          The amount will be spread evenly over the specified service period only. 
                          No recognition occurs before the service start date.
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>


            </div>

            {/* Right Column - Date Fields */}
            <div className="modal-right-column">
              {selectedMethod && (
                <div className="dates-section">
                  
                  {/* Dynamic Date Fields */}
                  {selectedMethod === 'defer' && (
                    <div className="form-section">
                      <label>Service Date</label>
                      <DatePicker
                        selected={serviceStartDate}
                        onChange={(date) => setServiceStartDate(date)}
                        minDate={new Date(transaction.date)}
                        placeholderText="Select service date"
                        dateFormat="dd/MM/yyyy"
                        className="form-datepicker"
                        popperPlacement="bottom"
                        popperModifiers={[
                          {
                            name: 'preventOverflow',
                            options: {
                              enabled: false,
                            },
                          },
                          {
                            name: 'flip',
                            options: {
                              enabled: false,
                            },
                          },
                        ]}
                        required
                      />
                    </div>
                  )}

                  {selectedMethod === 'amortize' && (
                    <div className="form-section">
                      <label>Service End Date</label>
                      <DatePicker
                        selected={serviceEndDate}
                        onChange={(date) => setServiceEndDate(date)}
                        minDate={new Date(transaction.date)}
                        placeholderText="Select service end date"
                        dateFormat="dd/MM/yyyy"
                        className="form-datepicker"
                        popperPlacement="bottom"
                        popperModifiers={[
                          {
                            name: 'preventOverflow',
                            options: {
                              enabled: false,
                            },
                          },
                          {
                            name: 'flip',
                            options: {
                              enabled: false,
                            },
                          },
                        ]}
                        required
                      />
                    </div>
                  )}

                  {selectedMethod === 'defer_and_amortize' && (
                    <div className="date-fields-row">
                      <div className="form-section date-field">
                        <label>Service Start Date</label>
                        <DatePicker
                          selected={serviceStartDate}
                          onChange={(date) => setServiceStartDate(date)}
                          minDate={new Date(transaction.date)}
                          placeholderText="Select service start date"
                          dateFormat="dd/MM/yyyy"
                          className="form-datepicker"
                          popperPlacement="bottom"
                          popperModifiers={[
                            {
                              name: 'preventOverflow',
                              options: {
                                enabled: false,
                              },
                            },
                            {
                              name: 'flip',
                              options: {
                                enabled: false,
                              },
                            },
                          ]}
                          required
                        />
                      </div>
                      <div className="form-section date-field">
                        <label>Service End Date</label>
                        <DatePicker
                          selected={serviceEndDate}
                          onChange={(date) => setServiceEndDate(date)}
                          minDate={serviceStartDate || new Date(transaction.date)}
                          placeholderText="Select service end date"
                          dateFormat="dd/MM/yyyy"
                          className="form-datepicker"
                          popperPlacement="bottom"
                          popperModifiers={[
                            {
                              name: 'preventOverflow',
                              options: {
                                enabled: false,
                              },
                            },
                            {
                              name: 'flip',
                              options: {
                                enabled: false,
                              },
                            },
                          ]}
                          required
                        />
                      </div>
                    </div>
                  )}

                  {/* Validation Errors */}
                  {errors.length > 0 && (
                    <div className="error-section">
                      <h4>Please fix the following errors:</h4>
                      <ul>
                        {errors.map((error, index) => (
                          <li key={index}>{error}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
              {/* Recognition Preview */}
              {preview && (
                <div className="preview-section">
                  <h4>Recognition Preview</h4>
                  <p className="preview-description">{preview.description}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          {transaction.isPrepaid && (
            <button className="btn btn-outline" onClick={handleRemovePrepaid}>
              Remove Prepaid
            </button>
          )}
          <button 
            className="btn btn-primary" 
            onClick={handleSave} 
            disabled={!isValid}
          >
            Save
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default PrepaidExpenseModal;