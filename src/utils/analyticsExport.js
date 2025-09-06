/**
 * Analytics Export Utility
 * Export analytics data in various formats (CSV, JSON, PDF report)
 * Follows BUILD_NEW_FEATURE_GUIDE.md principles
 */

/**
 * Export analytics data to CSV format
 * @param {Array} data - Array of data objects to export
 * @param {string} filename - Output filename
 * @param {Object} options - Export options
 */
export const exportToCSV = (data, filename = 'analytics-export.csv', options = {}) => {
  try {
    if (!data || data.length === 0) {
      throw new Error('No data to export');
    }

    // Determine columns from data structure
    const columns = options.columns || Object.keys(data[0]);
    
    // Create CSV header
    const csvHeader = columns.join(',');
    
    // Create CSV rows
    const csvRows = data.map(row => {
      return columns.map(column => {
        const value = row[column];
        
        // Handle various data types
        if (value === null || value === undefined) {
          return '';
        }
        
        // Escape commas and quotes in string values
        if (typeof value === 'string') {
          return `"${value.replace(/"/g, '""')}"`;
        }
        
        // Format numbers
        if (typeof value === 'number') {
          return value.toString();
        }
        
        // Handle dates
        if (value instanceof Date) {
          return `"${value.toISOString()}"`;
        }
        
        // Handle objects/arrays
        if (typeof value === 'object') {
          return `"${JSON.stringify(value).replace(/"/g, '""')}"`;
        }
        
        return value.toString();
      }).join(',');
    });
    
    // Combine header and rows
    const csvContent = [csvHeader, ...csvRows].join('\n');
    
    // Create and download file
    downloadFile(csvContent, filename, 'text/csv');
    
    return {
      success: true,
      message: `Exported ${data.length} records to ${filename}`,
      recordCount: data.length
    };
    
  } catch (error) {
    console.error('CSV export error:', error);
    return {
      success: false,
      message: error.message,
      error: error
    };
  }
};

/**
 * Export analytics data to JSON format
 * @param {Object} data - Data object to export
 * @param {string} filename - Output filename
 * @param {Object} options - Export options
 */
export const exportToJSON = (data, filename = 'analytics-export.json', options = {}) => {
  try {
    if (!data) {
      throw new Error('No data to export');
    }

    // Add metadata if requested
    const exportData = {
      ...data,
      ...(options.includeMetadata && {
        metadata: {
          exportDate: new Date().toISOString(),
          version: '1.0',
          source: 'Personal Finance Analytics',
          recordCount: Array.isArray(data) ? data.length : Object.keys(data).length
        }
      })
    };
    
    // Convert to JSON with formatting
    const jsonContent = JSON.stringify(exportData, null, options.minify ? 0 : 2);
    
    // Create and download file
    downloadFile(jsonContent, filename, 'application/json');
    
    return {
      success: true,
      message: `Exported data to ${filename}`,
      dataSize: jsonContent.length
    };
    
  } catch (error) {
    console.error('JSON export error:', error);
    return {
      success: false,
      message: error.message,
      error: error
    };
  }
};

/**
 * Export comprehensive cashflow analytics report
 * @param {Object} analyticsData - Complete analytics data
 * @param {Object} options - Export options
 */
export const exportCashflowReport = async (analyticsData, options = {}) => {
  try {
    const {
      dateRange,
      selectedPeriod,
      activeBudget,
      formatCurrency,
      transactions = [],
      metrics = {},
      waterfallData = [],
      calendarData = null,
      forecastData = null,
      patternAnalysis = null
    } = analyticsData;

    // Prepare comprehensive report data
    const reportData = {
      // Report metadata
      report: {
        title: 'Cashflow Analytics Report',
        period: selectedPeriod,
        dateRange: dateRange,
        generatedAt: new Date().toISOString(),
        budgetUsed: activeBudget ? activeBudget.name : 'No active budget'
      },

      // Executive summary
      summary: {
        totalIncome: metrics.totalIncome || 0,
        totalExpenses: metrics.totalExpenses || 0,
        netCashflow: metrics.netCashflow || 0,
        transactionCount: transactions.length,
        budgetAdherence: metrics.budgetComparison?.budgetAdherence || null,
        budgetStatus: getBudgetStatus(metrics.budgetComparison)
      },

      // Detailed metrics
      metrics: {
        income: {
          total: metrics.totalIncome || 0,
          budgeted: metrics.budgetComparison?.budgetedIncome || null,
          variance: metrics.budgetComparison?.incomeVariance || null
        },
        expenses: {
          total: metrics.totalExpenses || 0,
          budgeted: metrics.budgetComparison?.budgetedExpenses || null,
          variance: metrics.budgetComparison?.expenseVariance || null
        },
        netCashflow: {
          actual: metrics.netCashflow || 0,
          budgeted: metrics.budgetComparison?.budgetedNetCashflow || null,
          variance: metrics.budgetComparison?.netCashflowVariance || null
        }
      },

      // Transaction breakdown
      transactions: transactions.map(transaction => ({
        date: transaction.date,
        description: transaction.description || '',
        category: transaction.categoryId === 'CAT_001' ? 'Income' : 'Expense',
        subcategory: transaction.subcategoryName || 'Uncategorized',
        amount: transaction.amount,
        budgetImpact: calculateBudgetImpact(transaction, activeBudget)
      })),

      // Budget analysis (if available)
      ...(activeBudget && {
        budgetAnalysis: {
          budgetName: activeBudget.name,
          totalBudget: activeBudget.lineItems?.reduce((sum, item) => sum + item.amount, 0) || 0,
          categoriesTracked: activeBudget.lineItems?.length || 0,
          adherenceScore: metrics.budgetComparison?.budgetAdherence || null,
          overBudgetCategories: getOverBudgetCategories(metrics.budgetComparison, activeBudget),
          underBudgetCategories: getUnderBudgetCategories(metrics.budgetComparison, activeBudget)
        }
      }),

      // Pattern insights (if available)
      ...(patternAnalysis && {
        patterns: {
          seasonalPatterns: patternAnalysis.seasonalPatterns?.detected || false,
          recurringTransactions: patternAnalysis.recurringTransactions?.confirmed || 0,
          spendingTrend: patternAnalysis.spendingCycles?.monthlyCycle?.trend || 'unknown',
          sustainabilityScore: patternAnalysis.cashflowSustainability?.sustainabilityScore || null,
          anomaliesDetected: patternAnalysis.anomalies?.count || 0
        }
      }),

      // Forecast data (if available)
      ...(forecastData && {
        forecast: {
          currentTrajectory: forecastData.currentTrajectory?.trend || 'unknown',
          projectedSpending: forecastData.scenarios?.current?.projectedTotal || null,
          budgetProjection: forecastData.adherencePrediction?.current?.status || 'unknown',
          recommendationsCount: forecastData.recommendations?.length || 0,
          confidenceLevel: forecastData.confidence || 'unknown'
        }
      })
    };

    // Export based on requested format
    const format = options.format || 'json';
    
    if (format === 'csv') {
      return exportCashflowToCSV(reportData, options);
    } else if (format === 'json') {
      const filename = options.filename || `cashflow-report-${dateRange.startDate}-to-${dateRange.endDate}.json`;
      return exportToJSON(reportData, filename, { includeMetadata: true });
    } else {
      throw new Error(`Unsupported format: ${format}`);
    }

  } catch (error) {
    console.error('Cashflow report export error:', error);
    return {
      success: false,
      message: error.message,
      error: error
    };
  }
};

/**
 * Export cashflow data to CSV format
 */
const exportCashflowToCSV = (reportData, options) => {
  // Create multiple CSV sheets in a single download
  const sheets = [];
  
  // Summary sheet
  const summaryData = [
    { Metric: 'Total Income', Value: reportData.summary.totalIncome, Budget: reportData.metrics.income.budgeted || 'N/A', Variance: reportData.metrics.income.variance || 'N/A' },
    { Metric: 'Total Expenses', Value: reportData.summary.totalExpenses, Budget: reportData.metrics.expenses.budgeted || 'N/A', Variance: reportData.metrics.expenses.variance || 'N/A' },
    { Metric: 'Net Cashflow', Value: reportData.summary.netCashflow, Budget: reportData.metrics.netCashflow.budgeted || 'N/A', Variance: reportData.metrics.netCashflow.variance || 'N/A' },
    { Metric: 'Transaction Count', Value: reportData.summary.transactionCount, Budget: 'N/A', Variance: 'N/A' },
    { Metric: 'Budget Adherence', Value: reportData.summary.budgetAdherence ? `${reportData.summary.budgetAdherence.toFixed(1)}%` : 'N/A', Budget: '100%', Variance: reportData.summary.budgetAdherence ? `${(reportData.summary.budgetAdherence - 100).toFixed(1)}%` : 'N/A' }
  ];

  sheets.push({
    name: 'Summary',
    data: summaryData
  });

  // Transactions sheet
  sheets.push({
    name: 'Transactions',
    data: reportData.transactions
  });

  // Budget analysis sheet (if available)
  if (reportData.budgetAnalysis) {
    const budgetData = [
      { Category: 'Budget Name', Value: reportData.budgetAnalysis.budgetName },
      { Category: 'Total Budget', Value: reportData.budgetAnalysis.totalBudget },
      { Category: 'Categories Tracked', Value: reportData.budgetAnalysis.categoriesTracked },
      { Category: 'Adherence Score', Value: reportData.budgetAnalysis.adherenceScore ? `${reportData.budgetAnalysis.adherenceScore.toFixed(1)}%` : 'N/A' }
    ];
    
    sheets.push({
      name: 'Budget Analysis',
      data: budgetData
    });
  }

  // Export each sheet as separate CSV or combined
  const filename = options.filename || `cashflow-report-${reportData.report.dateRange.startDate}.csv`;
  
  if (options.separateSheets) {
    // Export multiple files
    const results = [];
    
    sheets.forEach(sheet => {
      const sheetFilename = filename.replace('.csv', `-${sheet.name.toLowerCase()}.csv`);
      const result = exportToCSV(sheet.data, sheetFilename);
      results.push(result);
    });
    
    return {
      success: results.every(r => r.success),
      message: `Exported ${sheets.length} sheets`,
      results: results
    };
  } else {
    // Export combined sheet
    return exportToCSV(sheets[0].data, filename); // Export summary by default
  }
};

/**
 * Export transaction data with budget context
 * @param {Array} transactions - Transaction data
 * @param {Object} activeBudget - Active budget data
 * @param {Object} options - Export options
 */
export const exportTransactionsWithBudget = (transactions, activeBudget, options = {}) => {
  try {
    // Enhance transactions with budget context
    const enhancedTransactions = transactions.map(transaction => {
      const budgetContext = getBudgetContextForTransaction(transaction, activeBudget);
      
      return {
        // Basic transaction data
        Date: transaction.date,
        Description: transaction.description || '',
        Category: transaction.categoryId === 'CAT_001' ? 'Income' : 'Expense',
        Subcategory: transaction.subcategoryName || 'Uncategorized',
        Amount: Math.abs(transaction.amount),
        'Amount Signed': transaction.amount,
        
        // Budget context
        'Budget Category': budgetContext.hasBudget ? 'Yes' : 'No',
        'Budgeted Amount': budgetContext.budgetAmount || 'N/A',
        'Budget Variance': budgetContext.variance || 'N/A',
        'Budget Status': budgetContext.status || 'N/A',
        
        // Additional metadata
        'Transaction Type': transaction.categoryId,
        'Account ID': transaction.accountId || '',
        Reference: transaction.reference || ''
      };
    });

    const filename = options.filename || `transactions-with-budget-${new Date().toISOString().split('T')[0]}.csv`;
    return exportToCSV(enhancedTransactions, filename, options);

  } catch (error) {
    console.error('Transaction export error:', error);
    return {
      success: false,
      message: error.message,
      error: error
    };
  }
};

/**
 * Helper function to download file
 */
const downloadFile = (content, filename, contentType) => {
  const blob = new Blob([content], { type: contentType });
  const url = window.URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  // Clean up the URL object
  window.URL.revokeObjectURL(url);
};

/**
 * Helper function to get budget status
 */
const getBudgetStatus = (budgetComparison) => {
  if (!budgetComparison) return 'No Budget';
  
  const adherence = budgetComparison.budgetAdherence;
  if (adherence >= 95) return 'On Track';
  if (adherence >= 80) return 'Slight Overage';
  if (adherence >= 50) return 'Over Budget';
  return 'Significantly Over Budget';
};

/**
 * Helper function to calculate budget impact for a transaction
 */
const calculateBudgetImpact = (transaction, activeBudget) => {
  if (!activeBudget || transaction.categoryId !== 'CAT_002') return 'N/A';
  
  const budgetItem = activeBudget.lineItems?.find(item => item.subcategoryId === transaction.subcategoryId);
  if (!budgetItem) return 'No Budget';
  
  const percentage = (Math.abs(transaction.amount) / budgetItem.amount) * 100;
  
  if (percentage > 50) return 'High Impact';
  if (percentage > 20) return 'Medium Impact';
  return 'Low Impact';
};

/**
 * Helper function to get over-budget categories
 */
const getOverBudgetCategories = (budgetComparison, activeBudget) => {
  if (!budgetComparison || !activeBudget) return [];
  
  // This would need to be implemented based on the actual budget comparison structure
  return [];
};

/**
 * Helper function to get under-budget categories
 */
const getUnderBudgetCategories = (budgetComparison, activeBudget) => {
  if (!budgetComparison || !activeBudget) return [];
  
  // This would need to be implemented based on the actual budget comparison structure
  return [];
};

/**
 * Helper function to get budget context for a transaction
 */
const getBudgetContextForTransaction = (transaction, activeBudget) => {
  if (!activeBudget || transaction.categoryId !== 'CAT_002') {
    return {
      hasBudget: false,
      budgetAmount: null,
      variance: null,
      status: 'N/A'
    };
  }
  
  const budgetItem = activeBudget.lineItems?.find(item => item.subcategoryId === transaction.subcategoryId);
  
  if (!budgetItem) {
    return {
      hasBudget: false,
      budgetAmount: null,
      variance: null,
      status: 'No Budget'
    };
  }
  
  const variance = Math.abs(transaction.amount) - budgetItem.amount;
  
  return {
    hasBudget: true,
    budgetAmount: budgetItem.amount,
    variance: variance,
    status: variance > 0 ? 'Over Budget' : 'Within Budget'
  };
};

export default {
  exportToCSV,
  exportToJSON,
  exportCashflowReport,
  exportTransactionsWithBudget
};