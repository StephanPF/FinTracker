/**
 * Analytics Data Service
 * Provides data fetching and processing for analytics views with budget integration
 */

/**
 * Core data fetching and processing for analytics
 * Follows BUILD_NEW_FEATURE_GUIDE.md patterns
 */
export class AnalyticsDataService {
  constructor(database, fileStorage, exchangeRateService = null) {
    this.database = database;
    this.fileStorage = fileStorage;
    this.exchangeRateService = exchangeRateService;
  }

  /**
   * Get transactions for specified period with analytics filtering
   * @param {string} startDate - Start date in YYYY-MM-DD format
   * @param {string} endDate - End date in YYYY-MM-DD format
   * @param {string} viewType - 'cash' or 'accrual'
   * @returns {Array} Filtered transactions for analytics
   */
  getTransactionsForPeriod(startDate, endDate, viewType = 'cash') {
    try {
      const transactions = this.database.getTable('transactions') || [];
      
      // Apply analytics-specific filters
      const filteredTransactions = this.applyAnalyticsFilters(transactions);
      
      // Filter by date range
      const periodTransactions = filteredTransactions.filter(transaction => {
        const transactionDate = transaction.date;
        return transactionDate >= startDate && transactionDate <= endDate;
      });

      return periodTransactions;
    } catch (error) {
      console.error('Error fetching transactions for period:', error);
      return [];
    }
  }

  /**
   * Apply analytics-specific transaction filtering
   * CRITICAL: Only include CAT_001 (Income) and CAT_002 (Expenses)
   * Exclude: CAT_003 (Transfer), CAT_004 (Investment-SELL), CAT_005 (Investment-BUY)
   * Uses categoryId field (or transactionTypeId for compatibility)
   * @param {Array} transactions - Raw transaction data
   * @returns {Array} Filtered transactions for analytics
   */
  applyAnalyticsFilters(transactions) {
    try {
      const allowedTransactionTypes = ['CAT_001', 'CAT_002'];
      
      // Get accounts table to check account types and Analytics inclusion
      const accounts = this.database.getTable('accounts') || [];
      const allowedAccountTypes = ['ACCT_TYPE_001', 'ACCT_TYPE_006']; // Bank Account, Current Liability

      return transactions.filter(transaction => {
        // Filter by transaction type (Income and Expenses only)
        // Check both categoryId and transactionTypeId for compatibility
        const transactionType = transaction.categoryId || transaction.transactionTypeId;
        if (!allowedTransactionTypes.includes(transactionType)) {
          return false;
        }

        // Check Analytics inclusion toggle - exclude accounts where includeInOverview is false
        let relatedAccount = null;
        
        // Find the related account for Analytics inclusion check
        if (transaction.accountId) {
          relatedAccount = accounts.find(acc => acc.id === transaction.accountId);
        } else if (transaction.debitAccountId) {
          relatedAccount = accounts.find(acc => acc.id === transaction.debitAccountId);
        } else if (transaction.creditAccountId) {
          relatedAccount = accounts.find(acc => acc.id === transaction.creditAccountId);
        }
        
        // Exclude transaction if related account has Analytics toggle disabled
        if (relatedAccount && relatedAccount.includeInOverview === false) {
          return false;
        }

        // Check account types - handle both direct accountTypeId and lookup by accountId
        let accountTypeId = transaction.accountTypeId;
        
        // If no direct accountTypeId, look up by accountId (for regular transactions)
        if (!accountTypeId && transaction.accountId) {
          const account = accounts.find(acc => acc.id === transaction.accountId);
          accountTypeId = account?.accountTypeId;
        }
        
        // If no accountTypeId found, check debitAccountId/creditAccountId (for double-entry transactions)
        if (!accountTypeId) {
          const debitAccount = transaction.debitAccountId ? 
            accounts.find(acc => acc.id === transaction.debitAccountId) : null;
          const creditAccount = transaction.creditAccountId ? 
            accounts.find(acc => acc.id === transaction.creditAccountId) : null;
            
          // Use the account type from either debit or credit account that matches our criteria
          if (debitAccount && allowedAccountTypes.includes(debitAccount.accountTypeId)) {
            accountTypeId = debitAccount.accountTypeId;
          } else if (creditAccount && allowedAccountTypes.includes(creditAccount.accountTypeId)) {
            accountTypeId = creditAccount.accountTypeId;
          }
        }
        
        // Filter by account type if available
        if (accountTypeId && !allowedAccountTypes.includes(accountTypeId)) {
          return false;
        }
        
        return true;
      });
    } catch (error) {
      console.error('Error applying analytics filters:', error);
      return transactions; // Return unfiltered data as fallback
    }
  }

  /**
   * Get active budget for analytics integration
   * @returns {Object|null} Active budget with line items or null if no active budget
   */
  async getActiveBudgetForAnalytics() {
    try {
      const budgets = this.database.getTable('budgets') || [];
      const activeBudget = budgets.find(budget => budget.status === 'active');
      
      if (!activeBudget) {
        return null;
      }

      // Get budget line items for the active budget
      const budgetLineItems = this.database.getTable('budget_line_items') || [];
      const activeBudgetLineItems = budgetLineItems.filter(item => item.budgetId === activeBudget.id);

      return {
        ...activeBudget,
        lineItems: activeBudgetLineItems
      };
    } catch (error) {
      console.error('Error fetching active budget for analytics:', error);
      return null;
    }
  }

  /**
   * Normalize budget amount to specific view period
   * @param {number} budgetAmount - Original budget amount
   * @param {string} budgetPeriod - Original budget period (weekly, monthly, quarterly, yearly)
   * @param {string} viewPeriod - Target period for analytics view
   * @returns {number} Normalized amount for the view period
   */
  normalizeBudgetToViewPeriod(budgetAmount, budgetPeriod, viewPeriod) {
    try {
      // Convert to monthly first (using Budget Setup normalization logic)
      const monthlyAmount = this.normalizeToMonthly(budgetAmount, budgetPeriod);
      
      // Then convert to view period
      switch (viewPeriod) {
        case 'weekly':
          return monthlyAmount * (12 / 52); // ~0.23 months per week
        case 'monthly':
          return monthlyAmount;
        case 'quarterly':
          return monthlyAmount * 3; // 3 months per quarter
        case 'yearly':
          return monthlyAmount * 12; // 12 months per year
        default:
          return monthlyAmount;
      }
    } catch (error) {
      console.error('Error normalizing budget to view period:', error);
      return budgetAmount; // Return original amount as fallback
    }
  }

  /**
   * Normalize any period to monthly equivalent
   * Reuses Budget Setup logic for consistency
   * @param {number} amount - Amount to normalize
   * @param {string} period - Source period
   * @returns {number} Monthly equivalent amount
   */
  normalizeToMonthly(amount, period) {
    switch (period) {
      case 'weekly':
        return amount * (52 / 12); // ~4.33 weeks per month
      case 'monthly':
        return amount;
      case 'quarterly':
        return amount / 3; // 3 months per quarter
      case 'yearly':
        return amount / 12; // 12 months per year
      default:
        return amount;
    }
  }

  /**
   * Get transaction data enriched with budget context
   * @param {string} selectedPeriod - Period for analysis (weekly, monthly, quarterly, yearly)
   * @param {string} viewType - 'cash' or 'accrual'
   * @param {string} startDate - Start date in YYYY-MM-DD format
   * @param {string} endDate - End date in YYYY-MM-DD format
   * @returns {Array} Subcategories with actual spending and budget context
   */
  async getTransactionDataWithBudget(selectedPeriod, viewType, startDate, endDate) {
    try {
      // Get filtered transactions for the period
      const transactions = this.getTransactionsForPeriod(startDate, endDate, viewType);
      
      // Get active budget data
      const budgetData = await this.getActiveBudgetForAnalytics();
      
      // Group transactions by subcategory (expenses only for budget comparison)
      const expenseTransactions = transactions.filter(t => (t.categoryId || t.transactionTypeId) === 'CAT_002');
      
      const subcategoryTotals = expenseTransactions.reduce((acc, transaction) => {
        const subcategoryId = transaction.subcategoryId;

        if (!subcategoryId) {
          return acc;
        }

        // Calculate amount considering transaction type (DEBIT increases expenses, CREDIT decreases)
        let convertedAmount = Math.abs(transaction.amount);

        if (this.exchangeRateService && transaction.accountId) {
          // Get account currency from the transaction's account
          const accounts = this.database.getTable('accounts') || [];
          const account = accounts.find(a => a.id === transaction.accountId);

          if (account && account.currencyId) {
            convertedAmount = this.exchangeRateService.convertToBaseCurrency(
              Math.abs(transaction.amount),
              account.currencyId
            );

            // Debug logging for currency conversion
            if (typeof process !== 'undefined' && process.env.NODE_ENV === 'development') {
              const rate = this.exchangeRateService.getExchangeRate(account.currencyId);
              console.log(`Analytics Transaction Conversion:`);
              console.log(`Transaction: ${transaction.description} - ${Math.abs(transaction.amount)} (${account.currencyId})`);
              console.log(`Exchange Rate: ${rate}`);
              console.log(`Converted: ${convertedAmount}`);
            }
          }
        }

        // For expense transactions: DEBIT increases expenses, CREDIT decreases expenses
        if (transaction.transactionType === 'DEBIT') {
          acc[subcategoryId] = (acc[subcategoryId] || 0) + convertedAmount;
        } else if (transaction.transactionType === 'CREDIT') {
          acc[subcategoryId] = (acc[subcategoryId] || 0) - convertedAmount;
        }

        return acc;
      }, {});

      // Add budget context to each subcategory
      const subcategoriesWithBudget = Object.entries(subcategoryTotals).map(([subcategoryId, actualSpent]) => {
        const budgetItem = budgetData?.lineItems.find(item => item.subcategoryId === subcategoryId);
        const budgetAmount = budgetItem ? 
          this.normalizeBudgetToViewPeriod(budgetItem.amount, budgetItem.period, selectedPeriod) : 0;

        return {
          subcategoryId,
          subcategoryName: this.getSubcategoryName(subcategoryId),
          actualSpent,
          budgetAmount,
          hasBudget: !!budgetItem,
          variance: actualSpent - budgetAmount,
          variancePercentage: budgetAmount > 0 ? (actualSpent / budgetAmount) * 100 : null
        };
      });

      return subcategoriesWithBudget;
    } catch (error) {
      console.error('Error getting transaction data with budget:', error);
      return [];
    }
  }

  /**
   * Get subcategory name by ID
   * @param {string} subcategoryId - Subcategory ID
   * @returns {string} Subcategory name
   */
  getSubcategoryName(subcategoryId) {
    try {
      const subcategories = this.database.getTable('subcategories') || [];
      const subcategory = subcategories.find(sub => sub.id === subcategoryId);
      return subcategory?.name || 'Unknown';
    } catch (error) {
      console.error('Error getting subcategory name:', error);
      return 'Unknown';
    }
  }

  /**
   * Get income and expense totals for period
   * @param {string} startDate - Start date in YYYY-MM-DD format  
   * @param {string} endDate - End date in YYYY-MM-DD format
   * @param {string} viewType - 'cash' or 'accrual'
   * @returns {Object} Income and expense totals
   */
  getIncomeExpenseTotals(startDate, endDate, viewType = 'cash') {
    try {
      const transactions = this.getTransactionsForPeriod(startDate, endDate, viewType);
      const accounts = this.database.getTable('accounts') || [];
      
      const totals = transactions.reduce((acc, transaction) => {
        // Calculate amount considering transaction type (CREDIT = positive, DEBIT = negative)
        let amount = Math.abs(transaction.amount);

        // Convert to base currency if exchangeRateService is available
        if (this.exchangeRateService && transaction.accountId) {
          const account = accounts.find(a => a.id === transaction.accountId);
          if (account && account.currencyId) {
            amount = this.exchangeRateService.convertToBaseCurrency(amount, account.currencyId);
          }
        }

        const transactionType = transaction.categoryId || transaction.transactionTypeId;

        // For income transactions (CAT_001): CREDIT increases income, DEBIT decreases income
        // For expense transactions (CAT_002): DEBIT increases expenses, CREDIT decreases expenses
        if (transactionType === 'CAT_001') {
          if (transaction.transactionType === 'CREDIT') {
            acc.totalIncome += amount;
          } else if (transaction.transactionType === 'DEBIT') {
            acc.totalIncome -= amount;
          }
        } else if (transactionType === 'CAT_002') {
          if (transaction.transactionType === 'DEBIT') {
            acc.totalExpenses += amount;
          } else if (transaction.transactionType === 'CREDIT') {
            acc.totalExpenses -= amount;
          }
        }

        return acc;
      }, { totalIncome: 0, totalExpenses: 0 });

      totals.netCashflow = totals.totalIncome - totals.totalExpenses;
      
      return totals;
    } catch (error) {
      console.error('Error calculating income/expense totals:', error);
      return { totalIncome: 0, totalExpenses: 0, netCashflow: 0 };
    }
  }

  /**
   * Get largest expense transaction for period
   * @param {string} startDate - Start date in YYYY-MM-DD format
   * @param {string} endDate - End date in YYYY-MM-DD format
   * @returns {Object|null} Largest expense transaction
   */
  getLargestExpense(startDate, endDate) {
    try {
      const transactions = this.getTransactionsForPeriod(startDate, endDate, 'cash');
      const expenseTransactions = transactions.filter(t => (t.categoryId || t.transactionTypeId) === 'CAT_002');
      const accounts = this.database.getTable('accounts') || [];
      
      if (expenseTransactions.length === 0) {
        return null;
      }

      // Convert all transactions to base currency for comparison
      // Only consider DEBIT expense transactions (actual expenses)
      const debitExpenseTransactions = expenseTransactions.filter(t => t.transactionType === 'DEBIT');

      const convertedTransactions = debitExpenseTransactions.map(transaction => {
        let convertedAmount = Math.abs(transaction.amount);

        if (this.exchangeRateService && transaction.accountId) {
          const account = accounts.find(a => a.id === transaction.accountId);
          if (account && account.currencyId) {
            convertedAmount = this.exchangeRateService.convertToBaseCurrency(
              Math.abs(transaction.amount),
              account.currencyId
            );
          }
        }

        return {
          ...transaction,
          convertedAmount
        };
      });

      const largestExpense = convertedTransactions.reduce((largest, current) => {
        return current.convertedAmount > largest.convertedAmount ? current : largest;
      });

      return {
        ...largestExpense,
        subcategoryName: this.getSubcategoryName(largestExpense.subcategoryId),
        amount: largestExpense.convertedAmount
      };
    } catch (error) {
      console.error('Error getting largest expense:', error);
      return null;
    }
  }
}

/**
 * Factory function to create analytics data service
 * @param {Object} database - RelationalDatabase instance
 * @param {Object} fileStorage - RelationalFileStorage instance
 * @param {Object} exchangeRateService - ExchangeRateService instance for currency conversion
 * @returns {AnalyticsDataService} Analytics data service instance
 */
export const createAnalyticsDataService = (database, fileStorage, exchangeRateService = null) => {
  return new AnalyticsDataService(database, fileStorage, exchangeRateService);
};