/**
 * Notification Service for Personal Accounting Application
 * 
 * Manages notification creation, triggers, and automation for financial alerts,
 * data issues, insights, and actionable prompts in the notification center.
 */

import { calculateBudgetVariance, getBudgetComplianceScore } from './budgetCalculations.js';

class NotificationService {
  constructor(database, persistentFunctions = null) {
    this.database = database;
    this.persistentFunctions = persistentFunctions; // Object with persistent functions for file persistence
    this.settings = this.loadSettings();
  }

  /**
   * Load notification settings from user preferences
   */
  loadSettings() {
    const preferences = this.database.getTable('user_preferences');
    const notificationPrefs = preferences.find(p => p.category === 'notifications');
    
    return {
      enabled: true,
      budgetAlerts: {
        enabled: true,
        thresholds: [80, 100, 120], // percentages
        largeTransactionAmount: 500
      },
      lowBalanceAlerts: {
        enabled: true,
        defaultThreshold: 500
      },
      reconciliationReminders: {
        enabled: true,
        daysOverdue: 7
      },
      dataIssues: {
        enabled: true
      },
      insights: {
        enabled: true
      },
      cleanupDays: 30, // Auto-delete notifications after 30 days
      ...notificationPrefs?.settings || {}
    };
  }

  /**
   * Create a new notification
   */
  async createNotification(type, title, message, data = {}, priority = 'medium', expiresAt = null) {
    if (!this.settings.enabled) return null;

    const notificationData = {
      type,
      priority,
      title,
      message,
      data,
      expiresAt
    };

    let notification;

    // Use persistent addNotification if available, otherwise fallback to database only
    if (this.persistentFunctions?.addNotification) {
      console.log('📢 Creating notification with file persistence');
      notification = await this.persistentFunctions.addNotification(notificationData);
    } else {
      console.log('📢 Creating notification in memory only');
      notification = this.database.addNotification(notificationData);
    }

    console.log(`📢 Notification created: ${title}`);
    return notification;
  }

  /**
   * Check for all notification triggers and create notifications as needed
   */
  checkAllTriggers() {
    if (!this.settings.enabled) return;

    try {
      this.checkBudgetTriggers();
      this.checkLowBalanceTriggers();
      this.checkReconciliationTriggers();
      this.checkDataConsistencyTriggers();
      this.checkInsightTriggers();
      this.checkActionableTriggers();
      this.cleanupExpiredNotifications();
    } catch (error) {
      console.error('Error checking notification triggers:', error);
    }
  }

  /**
   * Check budget-related triggers
   */
  checkBudgetTriggers() {
    if (!this.settings.budgetAlerts.enabled) return;

    const budgets = this.database.getTable('budgets');
    const activeBudget = budgets.find(b => b.status === 'active');
    if (!activeBudget) return;

    const budgetLineItems = this.database.getTable('budget_line_items')
      .filter(item => item.budgetId === activeBudget.id);

    const transactions = this.database.getTable('transactions');
    
    budgetLineItems.forEach(lineItem => {
      const spent = this.calculateSpentForBudgetItem(lineItem, transactions);
      const variance = calculateBudgetVariance(spent, lineItem.amount);
      
      if (variance.isOverBudget || variance.variancePercentage >= 80) {
        // Check if we already have a recent notification for this category
        if (this.hasRecentBudgetNotification(lineItem.subcategoryId)) return;

        const priority = variance.variancePercentage >= 120 ? 'high' : 
                        variance.variancePercentage >= 100 ? 'high' : 'medium';
        
        const title = variance.isOverBudget ? 
          `Budget Exceeded: ${lineItem.subcategoryName}` :
          `Budget Alert: ${lineItem.subcategoryName}`;

        this.createNotification(
          'budget_alert',
          title,
          `${lineItem.subcategoryName}: ${variance.description}. Spent: ${spent.toFixed(2)}, Budget: ${lineItem.amount.toFixed(2)}`,
          {
            subcategoryId: lineItem.subcategoryId,
            subcategoryName: lineItem.subcategoryName,
            spent,
            budget: lineItem.amount,
            variance: variance.variance,
            variancePercentage: variance.variancePercentage
          },
          priority
        );
      }
    });

    // Check for large transactions
    const recentTransactions = this.getRecentTransactions(7);
    recentTransactions.forEach(transaction => {
      if (Math.abs(transaction.amount) >= this.settings.budgetAlerts.largeTransactionAmount) {
        if (this.hasRecentLargeTransactionNotification(transaction.id)) return;

        this.createNotification(
          'large_transaction',
          'Large Transaction Detected',
          `Transaction of ${Math.abs(transaction.amount).toFixed(2)} at ${transaction.description || 'Unknown'} exceeds your ${this.settings.budgetAlerts.largeTransactionAmount} threshold`,
          {
            transactionId: transaction.id,
            amount: Math.abs(transaction.amount),
            threshold: this.settings.budgetAlerts.largeTransactionAmount,
            description: transaction.description
          },
          'medium'
        );
      }
    });
  }

  /**
   * Check low balance triggers
   */
  checkLowBalanceTriggers() {
    if (!this.settings.lowBalanceAlerts.enabled) return;

    const accounts = this.database.getTable('accounts').filter(a => a.isActive);
    
    accounts.forEach(account => {
      const threshold = account.lowBalanceThreshold || this.settings.lowBalanceAlerts.defaultThreshold;
      
      if (account.balance <= threshold && account.balance > 0) {
        if (this.hasRecentLowBalanceNotification(account.id)) return;

        this.createNotification(
          'low_balance',
          'Low Balance Warning',
          `${account.name} balance (${account.balance.toFixed(2)}) is below your threshold of ${threshold.toFixed(2)}`,
          {
            accountId: account.id,
            accountName: account.name,
            balance: account.balance,
            threshold
          },
          'medium'
        );
      }
    });
  }

  /**
   * Check reconciliation reminders
   */
  checkReconciliationTriggers() {
    if (!this.settings.reconciliationReminders.enabled) return;

    // Get account types to filter for bank accounts only
    const accountTypes = this.database.getAccountTypes();
    const bankAccountType = accountTypes.find(type =>
      type.type === 'Asset' && type.subtype === 'Bank account'
    );

    if (!bankAccountType) {
      console.warn('Bank account type not found, skipping reconciliation notifications');
      return;
    }

    // Filter for active bank accounts only
    const bankAccounts = this.database.getTable('accounts').filter(a =>
      a.isActive && a.accountTypeId === bankAccountType.id
    );

    console.log(`🔍 Checking reconciliation for ${bankAccounts.length} bank accounts`);

    bankAccounts.forEach(account => {
      const daysSinceReconciliation = this.getDaysSinceLastReconciliation(account.id);

      if (daysSinceReconciliation >= this.settings.reconciliationReminders.daysOverdue) {
        if (this.hasRecentReconciliationNotification(account.id)) return;

        console.log(`📅 Creating reconciliation reminder for bank account: ${account.name} (${daysSinceReconciliation} days overdue)`);

        this.createNotification(
          'reconciliation_reminder',
          'Reconciliation Overdue',
          `${account.name} has not been reconciled for ${daysSinceReconciliation} days`,
          {
            accountId: account.id,
            accountName: account.name,
            daysSinceReconciliation,
            accountType: 'Bank account'
          },
          'medium'
        );
      }
    });
  }

  /**
   * Check data consistency issues
   */
  checkDataConsistencyTriggers() {
    if (!this.settings.dataIssues.enabled) return;

    // Check for uncategorized transactions
    const uncategorizedTransactions = this.database.getTable('transactions')
      .filter(t => !t.subcategoryId || t.subcategoryId === '');
    
    if (uncategorizedTransactions.length > 0) {
      if (!this.hasRecentDataIssueNotification('uncategorized_transactions')) {
        this.createNotification(
          'data_inconsistency',
          'Uncategorized Transactions',
          `${uncategorizedTransactions.length} transactions need categorization`,
          {
            type: 'uncategorized_transactions',
            count: uncategorizedTransactions.length,
            transactionIds: uncategorizedTransactions.slice(0, 10).map(t => t.id)
          },
          'medium'
        );
      }
    }

    // Check for potential duplicates
    const duplicates = this.findPotentialDuplicateTransactions();
    if (duplicates.length > 0) {
      if (!this.hasRecentDataIssueNotification('duplicate_transactions')) {
        // Create a more descriptive message with examples
        const firstDuplicate = duplicates[0];
        const exampleDescription = firstDuplicate.descriptions[0];
        const exampleAmount = firstDuplicate.amount.toFixed(2);

        let message = `${duplicates.length} potential duplicate transactions found requiring review.`;
        if (duplicates.length === 1) {
          message = `Potential duplicate found: "${exampleDescription}" (${exampleAmount}) appears twice.`;
        } else {
          message = `${duplicates.length} potential duplicates found. Example: "${exampleDescription}" (${exampleAmount}).`;
        }

        this.createNotification(
          'duplicate_detection',
          'Potential Duplicate Transactions',
          message,
          {
            type: 'duplicate_transactions',
            duplicateCount: duplicates.length,
            duplicates: duplicates.slice(0, 5),
            exampleDescription,
            exampleAmount
          },
          'medium'
        );
      }
    }
  }

  /**
   * Check for insights and summaries
   */
  checkInsightTriggers() {
    if (!this.settings.insights.enabled) return;

    // Monthly summary (check on first day of month)
    const now = new Date();
    if (now.getDate() === 1) {
      this.generateMonthlySummary();
    }

    // Expense pattern insights
    this.checkExpensePatternInsights();
  }

  /**
   * Check for actionable prompts
   */
  checkActionableTriggers() {
    // Template opportunities
    const templateOpportunities = this.findTemplateOpportunities();
    templateOpportunities.forEach(opportunity => {
      if (!this.hasRecentTemplateNotification(opportunity.merchantName)) {
        const notificationData = {
          merchantName: opportunity.merchantName,
          transactionDescription: opportunity.transactionDescription,
          similarCount: opportunity.count,
          transactions: opportunity.transactions
        };

        this.createNotification(
          'template_opportunity',
          'Template Suggestion',
          `You have ${opportunity.count} similar transactions for "${opportunity.merchantName}". Create a template?`,
          notificationData,
          'low'
        );
      }
    });
  }

  /**
   * Helper methods
   */
  
  calculateSpentForBudgetItem(lineItem, transactions) {
    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    
    return transactions
      .filter(t => 
        t.subcategoryId === lineItem.subcategoryId &&
        new Date(t.date) >= startDate &&
        new Date(t.date) <= now &&
        t.amount < 0 // Only expenses
      )
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);
  }

  getRecentTransactions(days = 7) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    
    return this.database.getTable('transactions')
      .filter(t => new Date(t.date) >= cutoff);
  }

  getDaysSinceLastReconciliation(accountId) {
    const transactions = this.database.getTable('transactions')
      .filter(t => t.accountId === accountId && t.reconciledAt)
      .sort((a, b) => new Date(b.reconciledAt) - new Date(a.reconciledAt));
    
    if (transactions.length === 0) return 999; // Never reconciled
    
    const lastReconciliation = new Date(transactions[0].reconciledAt);
    const now = new Date();
    return Math.floor((now - lastReconciliation) / (1000 * 60 * 60 * 24));
  }

  findPotentialDuplicateTransactions() {
    const transactions = this.database.getTable('transactions');
    const duplicates = [];

    for (let i = 0; i < transactions.length; i++) {
      for (let j = i + 1; j < transactions.length; j++) {
        const t1 = transactions[i];
        const t2 = transactions[j];

        if (Math.abs(t1.amount) === Math.abs(t2.amount) &&
            t1.accountId === t2.accountId &&
            Math.abs(new Date(t1.date) - new Date(t2.date)) <= 2 * 24 * 60 * 60 * 1000) {

          // Create a more detailed duplicate entry with descriptions
          duplicates.push({
            pair: [t1, t2],
            amount: Math.abs(t1.amount),
            descriptions: [t1.description || 'No description', t2.description || 'No description'],
            dates: [t1.date, t2.date],
            accountId: t1.accountId
          });
        }
      }
    }

    return duplicates;
  }

  findTemplateOpportunities() {
    const transactions = this.database.getTable('transactions');
    const existingTemplates = this.database.getTable('transaction_templates') || [];
    const merchantCounts = {};

    // Filter out transactions that are already templated
    const nonTemplatedTransactions = transactions.filter(t => t.isTemplated !== true);

    console.log(`🔍 Template opportunities: Analyzing ${nonTemplatedTransactions.length} non-templated transactions out of ${transactions.length} total`);

    nonTemplatedTransactions.forEach(t => {
      if (t.description) {
        const merchant = t.description.toLowerCase().trim();
        if (!merchantCounts[merchant]) {
          merchantCounts[merchant] = [];
        }
        merchantCounts[merchant].push(t);
      }
    });
    
    return Object.entries(merchantCounts)
      .filter(([merchant, transactions]) => {
        // Must have at least 3 transactions
        if (transactions.length < 3) return false;
        
        // Check if template already exists for this merchant
        const templateExists = existingTemplates.some(template => {
          const templateName = template.name.toLowerCase().trim();
          const templateDesc = template.description ? template.description.toLowerCase().trim() : '';
          return templateName.includes(merchant) || 
                 templateDesc.includes(merchant) ||
                 merchant.includes(templateName);
        });
        
        // Only suggest if no template exists
        return !templateExists;
      })
      .map(([merchant, transactions]) => ({
        merchantName: merchant,
        transactionDescription: transactions[0].description, // Use actual transaction description
        count: transactions.length,
        transactions: transactions.slice(0, 5)
      }))
      .slice(0, 3); // Limit to top 3 opportunities
  }

  checkExpensePatternInsights() {
    // Compare current month to previous month spending
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const previousMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
    
    const transactions = this.database.getTable('transactions');
    const subcategories = this.database.getTable('subcategories');
    
    subcategories.forEach(subcat => {
      const currentSpent = transactions
        .filter(t => t.subcategoryId === subcat.id && 
                new Date(t.date) >= currentMonthStart &&
                t.amount < 0)
        .reduce((sum, t) => sum + Math.abs(t.amount), 0);
      
      const previousSpent = transactions
        .filter(t => t.subcategoryId === subcat.id && 
                new Date(t.date) >= previousMonthStart &&
                new Date(t.date) <= previousMonthEnd &&
                t.amount < 0)
        .reduce((sum, t) => sum + Math.abs(t.amount), 0);
      
      if (previousSpent > 0 && currentSpent > previousSpent * 1.3) { // 30% increase
        const changePercent = Math.round(((currentSpent - previousSpent) / previousSpent) * 100);
        
        if (!this.hasRecentInsightNotification(subcat.id)) {
          this.createNotification(
            'expense_insight',
            `${subcat.name} Expense Increase`,
            `You spent ${changePercent}% more on ${subcat.name} this month (${currentSpent.toFixed(2)} vs ${previousSpent.toFixed(2)} last month)`,
            {
              subcategoryId: subcat.id,
              subcategoryName: subcat.name,
              currentAmount: currentSpent,
              previousAmount: previousSpent,
              changePercent
            },
            'low'
          );
        }
      }
    });
  }

  generateMonthlySummary() {
    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1);
    const monthName = lastMonth.toLocaleDateString('en', { month: 'long' });
    
    const transactions = this.database.getTable('transactions');
    const lastMonthTransactions = transactions.filter(t => {
      const tDate = new Date(t.date);
      return tDate.getMonth() === lastMonth.getMonth() && 
             tDate.getFullYear() === lastMonth.getFullYear();
    });
    
    const totalSpent = lastMonthTransactions
      .filter(t => t.amount < 0)
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);
    
    const totalIncome = lastMonthTransactions
      .filter(t => t.amount > 0)
      .reduce((sum, t) => sum + t.amount, 0);
    
    this.createNotification(
      'monthly_summary',
      `${monthName} Financial Summary`,
      `Total spent: ${totalSpent.toFixed(2)}, Total income: ${totalIncome.toFixed(2)}, Net: ${(totalIncome - totalSpent).toFixed(2)}`,
      {
        month: monthName,
        totalSpent,
        totalIncome,
        netAmount: totalIncome - totalSpent,
        transactionCount: lastMonthTransactions.length
      },
      'low'
    );
  }

  // Check for recent notifications to avoid spam
  hasRecentBudgetNotification(subcategoryId) {
    return this.hasRecentNotification('budget_alert', { subcategoryId }, 24);
  }

  hasRecentLowBalanceNotification(accountId) {
    return this.hasRecentNotification('low_balance', { accountId }, 24);
  }

  hasRecentLargeTransactionNotification(transactionId) {
    return this.hasRecentNotification('large_transaction', { transactionId }, 24);
  }

  hasRecentReconciliationNotification(accountId) {
    return this.hasRecentNotification('reconciliation_reminder', { accountId }, 72);
  }

  hasRecentDataIssueNotification(issueType) {
    return this.hasRecentNotification('data_inconsistency', { type: issueType }, 72);
  }

  hasRecentTemplateNotification(merchantName) {
    return this.hasRecentNotification('template_opportunity', { merchantName }, 168);
  }

  hasRecentInsightNotification(subcategoryId) {
    return this.hasRecentNotification('expense_insight', { subcategoryId }, 168);
  }

  hasRecentNotification(type, dataMatch = {}, hoursBack = 24) {
    const cutoff = new Date();
    cutoff.setHours(cutoff.getHours() - hoursBack);
    
    const notifications = this.database.getNotifications();
    return notifications.some(n => {
      if (n.type !== type || new Date(n.createdAt) < cutoff) return false;
      
      try {
        const nData = typeof n.data === 'string' ? JSON.parse(n.data) : n.data;
        return Object.entries(dataMatch).every(([key, value]) => nData[key] === value);
      } catch {
        return false;
      }
    });
  }

  /**
   * Clean up expired notifications
   */
  cleanupExpiredNotifications() {
    const removed = this.database.cleanupExpiredNotifications();
    
    // Also clean up old notifications based on settings
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - this.settings.cleanupDays);
    
    const notifications = this.database.getNotifications();
    const oldNotifications = notifications.filter(n => new Date(n.createdAt) < cutoff);
    
    oldNotifications.forEach(async (n) => {
      if (this.persistentFunctions?.deleteNotification) {
        await this.persistentFunctions.deleteNotification(n.id);
      } else {
        this.database.deleteNotification(n.id);
      }
    });
    
    if (removed > 0 || oldNotifications.length > 0) {
      console.log(`🧹 Cleaned up ${removed + oldNotifications.length} old notifications`);
    }
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId) {
    // Use persistent markAsRead if available, otherwise fallback to database only
    if (this.persistentFunctions?.markAsRead) {
      console.log('✓ Marking notification as read with file persistence');
      return await this.persistentFunctions.markAsRead(notificationId);
    } else {
      console.log('✓ Marking notification as read in memory only');
      return this.database.markNotificationAsRead(notificationId);
    }
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead() {
    // Use persistent markAllAsRead if available, otherwise fallback to database only
    if (this.persistentFunctions?.markAllAsRead) {
      console.log('✓ Marking all notifications as read with file persistence');
      return await this.persistentFunctions.markAllAsRead();
    } else {
      console.log('✓ Marking all notifications as read in memory only');
      return this.database.markAllNotificationsAsRead();
    }
  }

  /**
   * Delete a notification
   */
  async deleteNotification(notificationId) {
    // Use persistent deleteNotification if available, otherwise fallback to database only
    if (this.persistentFunctions?.deleteNotification) {
      console.log('🗑️ Deleting notification with file persistence');
      return await this.persistentFunctions.deleteNotification(notificationId);
    } else {
      console.log('🗑️ Deleting notification in memory only');
      return this.database.deleteNotification(notificationId);
    }
  }

  /**
   * Get notifications with filtering options
   */
  getNotifications(filters = {}) {
    let notifications = this.database.getNotifications();
    
    // Sort by creation date (newest first)
    notifications.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    // Apply filters
    if (filters.unreadOnly) {
      notifications = notifications.filter(n => !n.isRead);
    }
    
    if (filters.type) {
      notifications = notifications.filter(n => n.type === filters.type);
    }
    
    if (filters.priority) {
      notifications = notifications.filter(n => n.priority === filters.priority);
    }
    
    // Parse data field for easier use
    return notifications.map(n => {
      console.log('🔴 NOTIFICATION SERVICE: Processing notification:', n.id);
      console.log('🔴 NOTIFICATION SERVICE: Raw data field:', n.data);
      console.log('🔴 NOTIFICATION SERVICE: Data type:', typeof n.data);

      let parsedData;
      try {
        parsedData = typeof n.data === 'string' ? JSON.parse(n.data || '{}') : (n.data || {});
        console.log('🔴 NOTIFICATION SERVICE: Parsed data:', parsedData);
      } catch (error) {
        console.error('🔴 NOTIFICATION SERVICE: JSON parse error:', error);
        parsedData = {};
      }

      return {
        ...n,
        data: parsedData
      };
    });
  }

  /**
   * Get unread notification count
   */
  getUnreadCount() {
    return this.database.getUnreadNotifications().length;
  }
}

export default NotificationService;