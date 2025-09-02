/**
 * Prepaid Expense Service
 * Handles recognition calculations, status updates, and validation for prepaid expenses
 */

/**
 * Calculate months between two dates
 * @param {string} startDate - ISO date string
 * @param {string} endDate - ISO date string
 * @returns {number} Number of months between dates (minimum 1)
 */
export const getMonthsBetween = (startDate, endDate) => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
  return Math.max(1, months); // Minimum 1 month
};

/**
 * Calculate recognized amount for a prepaid transaction
 * @param {Object} transaction - Transaction object
 * @param {string} currentDate - Current date as ISO string (YYYY-MM-DD)
 * @returns {number} Amount recognized to date
 */
export const calculateRecognizedAmount = (transaction, currentDate) => {
  if (!transaction.isPrepaid || !transaction.recognitionMethod) {
    return transaction.amount || 0;
  }

  const { amount, date, recognitionMethod, serviceStartDate, serviceEndDate } = transaction;
  const absoluteAmount = Math.abs(amount);
  const current = new Date(currentDate);
  
  switch (recognitionMethod) {
    case 'defer':
      if (!serviceStartDate) return 0;
      const serviceStart = new Date(serviceStartDate);
      return current >= serviceStart ? absoluteAmount : 0;
    
    case 'amortize': {
      if (!serviceEndDate) return 0;
      const transactionDate = new Date(date);
      const serviceEnd = new Date(serviceEndDate);
      
      if (current < transactionDate) return 0;
      if (current >= serviceEnd) return absoluteAmount;
      
      const totalMonths = getMonthsBetween(date, serviceEndDate);
      const elapsedMonths = getMonthsBetween(date, currentDate);
      const monthlyAmount = absoluteAmount / totalMonths;
      
      return Math.min(monthlyAmount * elapsedMonths, absoluteAmount);
    }
    
    case 'defer_and_amortize': {
      if (!serviceStartDate || !serviceEndDate) return 0;
      const serviceStart = new Date(serviceStartDate);
      const serviceEnd = new Date(serviceEndDate);
      
      if (current < serviceStart) return 0;
      if (current >= serviceEnd) return absoluteAmount;
      
      const totalMonths = getMonthsBetween(serviceStartDate, serviceEndDate);
      const elapsedMonths = getMonthsBetween(serviceStartDate, currentDate);
      const monthlyAmount = absoluteAmount / totalMonths;
      
      return Math.min(monthlyAmount * elapsedMonths, absoluteAmount);
    }
    
    default:
      return absoluteAmount;
  }
};

/**
 * Update recognition status for a prepaid transaction
 * @param {Object} transaction - Transaction object
 * @param {string} currentDate - Current date as ISO string (YYYY-MM-DD)
 * @returns {Object} Updated transaction with recognition fields
 */
export const updateRecognitionStatus = (transaction, currentDate) => {
  if (!transaction.isPrepaid) {
    return {
      ...transaction,
      recognitionStatus: null,
      recognizedToDate: 0,
      remainingToRecognize: null
    };
  }

  const recognizedAmount = calculateRecognizedAmount(transaction, currentDate);
  const absoluteAmount = Math.abs(transaction.amount);
  
  // Determine status
  let status;
  const effectiveStartDate = transaction.serviceStartDate || transaction.date;
  
  if (new Date(currentDate) < new Date(effectiveStartDate)) {
    status = 'pending';
  } else if (recognizedAmount < absoluteAmount) {
    status = 'active';
  } else {
    status = 'completed';
  }
  
  return {
    ...transaction,
    recognitionStatus: status,
    recognizedToDate: recognizedAmount,
    remainingToRecognize: absoluteAmount - recognizedAmount
  };
};

/**
 * Calculate preview information for prepaid settings
 * @param {number} amount - Transaction amount (absolute value)
 * @param {string} method - Recognition method
 * @param {string} transactionDate - Transaction date (ISO string)
 * @param {string} startDate - Service start date (ISO string)
 * @param {string} endDate - Service end date (ISO string)
 * @param {Function} formatCurrency - Currency formatting function
 * @param {Function} formatDate - Date formatting function
 * @returns {Object} Preview information
 */
export const calculatePreview = (amount, method, transactionDate, startDate, endDate, formatCurrency, formatDate) => {
  let description, monthlyAmount, months;
  
  switch (method) {
    case 'defer':
      if (!startDate) return null;
      description = `Full ${formatCurrency(amount)} will be recognized on ${formatDate(startDate)}`;
      monthlyAmount = amount;
      months = 1;
      break;
    
    case 'amortize':
      if (!endDate) return null;
      months = getMonthsBetween(transactionDate, endDate);
      monthlyAmount = amount / months;
      description = `${formatCurrency(monthlyAmount)}/month from ${formatDate(transactionDate)} to ${formatDate(endDate)}`;
      break;
    
    case 'defer_and_amortize':
      if (!startDate || !endDate) return null;
      months = getMonthsBetween(startDate, endDate);
      monthlyAmount = amount / months;
      description = `${formatCurrency(monthlyAmount)}/month from ${formatDate(startDate)} to ${formatDate(endDate)}`;
      break;
    
    default:
      return null;
  }
  
  return { description, monthlyAmount, months };
};

/**
 * Validate prepaid expense settings
 * @param {Object} transaction - Transaction object
 * @param {string} method - Recognition method
 * @param {string} startDate - Service start date (ISO string)
 * @param {string} endDate - Service end date (ISO string)
 * @returns {string[]} Array of error messages
 */
export const validatePrepaidDates = (transaction, method, startDate, endDate) => {
  const errors = [];
  
  if (!method) {
    errors.push('Recognition method is required');
    return errors;
  }

  // Don't allow prepaid on transfers
  if (transaction.categoryId === 'CAT_003') {
    errors.push('Transfer transactions cannot be marked as prepaid');
    return errors;
  }
  
  const transactionDate = new Date(transaction.date);
  
  // All service dates must be >= transaction date
  if (startDate) {
    const serviceStartDate = new Date(startDate);
    if (serviceStartDate < transactionDate) {
      errors.push('Service start date must be after transaction date');
    }
  }
  
  if (endDate) {
    const serviceEndDate = new Date(endDate);
    if (serviceEndDate < transactionDate) {
      errors.push('Service end date must be after transaction date');
    }
  }
  
  // End date must be after start date
  if (startDate && endDate) {
    const serviceStartDate = new Date(startDate);
    const serviceEndDate = new Date(endDate);
    if (serviceEndDate <= serviceStartDate) {
      errors.push('Service end date must be after start date');
    }
  }
  
  // Method-specific validation
  switch (method) {
    case 'defer':
      if (!startDate) errors.push('Service date is required');
      break;
    case 'amortize':
      if (!endDate) errors.push('Service end date is required');
      break;
    case 'defer_and_amortize':
      if (!startDate) errors.push('Service start date is required');
      if (!endDate) errors.push('Service end date is required');
      break;
  }
  
  return errors;
};

/**
 * Get all transactions that need recognition status updates
 * @param {Object[]} transactions - Array of transaction objects
 * @returns {Object[]} Array of prepaid transactions
 */
export const getPrepaidTransactions = (transactions) => {
  return transactions.filter(transaction => transaction.isPrepaid);
};

/**
 * Update all prepaid transactions with current recognition status
 * @param {Object[]} transactions - Array of transaction objects
 * @param {string} currentDate - Current date as ISO string (YYYY-MM-DD)
 * @returns {Object[]} Updated transactions array
 */
export const updateAllPrepaidStatuses = (transactions, currentDate = null) => {
  const current = currentDate || new Date().toISOString().split('T')[0];
  
  return transactions.map(transaction => {
    if (transaction.isPrepaid) {
      return updateRecognitionStatus(transaction, current);
    }
    return transaction;
  });
};

/**
 * Get prepaid transactions grouped by recognition status
 * @param {Object[]} transactions - Array of transaction objects
 * @param {string} currentDate - Current date as ISO string (YYYY-MM-DD)
 * @returns {Object} Object with pending, active, and completed arrays
 */
export const groupPrepaidTransactionsByStatus = (transactions, currentDate = null) => {
  const current = currentDate || new Date().toISOString().split('T')[0];
  const prepaidTransactions = getPrepaidTransactions(transactions);
  const updatedTransactions = prepaidTransactions.map(t => updateRecognitionStatus(t, current));
  
  return {
    pending: updatedTransactions.filter(t => t.recognitionStatus === 'pending'),
    active: updatedTransactions.filter(t => t.recognitionStatus === 'active'),
    completed: updatedTransactions.filter(t => t.recognitionStatus === 'completed')
  };
};

/**
 * Calculate total recognized and remaining amounts for prepaid transactions
 * @param {Object[]} transactions - Array of transaction objects
 * @param {string} currentDate - Current date as ISO string (YYYY-MM-DD)
 * @returns {Object} Summary with total recognized and remaining amounts
 */
export const calculatePrepaidSummary = (transactions, currentDate = null) => {
  const current = currentDate || new Date().toISOString().split('T')[0];
  const prepaidTransactions = getPrepaidTransactions(transactions);
  
  let totalPrepaid = 0;
  let totalRecognized = 0;
  let totalRemaining = 0;
  
  prepaidTransactions.forEach(transaction => {
    const updated = updateRecognitionStatus(transaction, current);
    const absoluteAmount = Math.abs(transaction.amount);
    
    totalPrepaid += absoluteAmount;
    totalRecognized += updated.recognizedToDate;
    totalRemaining += updated.remainingToRecognize;
  });
  
  return {
    totalPrepaid,
    totalRecognized,
    totalRemaining,
    count: prepaidTransactions.length
  };
};