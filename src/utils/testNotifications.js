/**
 * Test utility to create sample notifications for testing the notification system
 * This can be called from the browser console or integrated into test scenarios
 */

export const createTestNotifications = (database) => {
  if (!database || !database.addNotification) {
    console.error('Database with notification support required');
    return;
  }

  const testNotifications = [
    // Budget Alert
    {
      type: 'budget_alert',
      priority: 'high',
      title: 'Budget Exceeded: Groceries',
      message: 'You have exceeded your groceries budget by $45.23 (120%)',
      data: {
        subcategoryId: 'SUB_001',
        subcategoryName: 'Groceries',
        spent: 480.23,
        budget: 400,
        variance: 80.23,
        variancePercentage: 120
      }
    },
    
    // Low Balance Warning
    {
      type: 'low_balance',
      priority: 'medium',
      title: 'Low Balance Warning',
      message: 'Checking account balance ($234.56) is below your threshold of $500',
      data: {
        accountId: 'ACC_001',
        accountName: 'Checking Account',
        balance: 234.56,
        threshold: 500
      }
    },
    
    // Large Transaction Alert
    {
      type: 'large_transaction',
      priority: 'medium',
      title: 'Large Transaction Detected',
      message: 'Transaction of $1,250.00 at Electronics Store exceeds your $1,000 threshold',
      data: {
        transactionId: 'TXN_123',
        amount: 1250,
        threshold: 1000,
        description: 'Electronics Store'
      }
    },
    
    // Reconciliation Reminder
    {
      type: 'reconciliation_reminder',
      priority: 'medium',
      title: 'Reconciliation Overdue',
      message: 'Savings account has not been reconciled for 14 days',
      data: {
        accountId: 'ACC_002',
        accountName: 'Savings Account',
        daysSinceReconciliation: 14
      }
    },
    
    // Data Inconsistency
    {
      type: 'data_inconsistency',
      priority: 'medium',
      title: 'Uncategorized Transactions',
      message: '15 transactions need categorization from the past week',
      data: {
        type: 'uncategorized_transactions',
        count: 15,
        oldestDate: '2025-09-05'
      }
    },
    
    // Duplicate Detection
    {
      type: 'duplicate_detection',
      priority: 'medium',
      title: 'Potential Duplicate Transactions',
      message: '3 potential duplicate transactions found requiring review',
      data: {
        type: 'duplicate_transactions',
        duplicateCount: 3,
        transactionIds: ['TXN_001', 'TXN_002', 'TXN_003']
      }
    },
    
    // Monthly Summary
    {
      type: 'monthly_summary',
      priority: 'low',
      title: 'August Financial Summary',
      message: 'Total spent: $2,450.00, Total income: $3,200.00, Net: $750.00',
      data: {
        month: 'August',
        totalSpent: 2450,
        totalIncome: 3200,
        netAmount: 750,
        transactionCount: 89
      }
    },
    
    // Expense Insight
    {
      type: 'expense_insight',
      priority: 'low',
      title: 'Dining Expense Increase',
      message: 'You spent 30% more on dining this month ($380 vs $290 last month)',
      data: {
        subcategoryId: 'SUB_005',
        subcategoryName: 'Dining',
        currentAmount: 380,
        previousAmount: 290,
        changePercent: 30
      }
    },
    
    // Template Opportunity
    {
      type: 'template_opportunity',
      priority: 'low',
      title: 'Template Suggestion',
      message: 'You have 5 similar transactions for "Netflix". Create a template?',
      data: {
        merchantName: 'Netflix',
        similarCount: 5,
        transactions: []
      }
    },
    
    // Backup Reminder
    {
      type: 'backup_reminder',
      priority: 'low',
      title: 'Backup Reminder',
      message: 'It has been 30 days since your last backup. Consider backing up your data.',
      data: {
        lastBackupDate: '2025-08-12',
        daysSinceBackup: 30
      }
    }
  ];

  console.log('Creating test notifications...');
  
  const createdNotifications = [];
  testNotifications.forEach((notification, index) => {
    try {
      // Add slight delay between notifications for different timestamps
      setTimeout(() => {
        const created = database.addNotification(notification);
        createdNotifications.push(created);
        console.log(`Created notification: ${notification.title}`);
        
        if (index === testNotifications.length - 1) {
          console.log(`✅ Created ${testNotifications.length} test notifications`);
          console.log('Test notifications:', createdNotifications);
        }
      }, index * 100);
    } catch (error) {
      console.error(`Error creating notification "${notification.title}":`, error);
    }
  });
  
  return testNotifications;
};

// Make it available globally for browser console testing
if (typeof window !== 'undefined') {
  window.createTestNotifications = createTestNotifications;
}

export default createTestNotifications;