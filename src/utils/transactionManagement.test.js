/**
 * Comprehensive Test Cases for Transaction Management System
 * 
 * Tests the local transaction management system including snapshots,
 * backups, atomic operations, and rollback capabilities.
 */

import RelationalDatabase from './relationalDatabase.js';
import TransactionManager from './transactionManager.js';

// Test configuration
const TEST_CONFIG = {
  name: 'Transaction Management System Tests',
  description: 'Comprehensive tests for data integrity protection',
  category: 'Data Protection',
  priority: 'Critical'
};

/**
 * Test Suite: Transaction Management System
 */
export const transactionManagementTests = [
  // Basic Snapshot Tests
  {
    name: 'Basic Snapshot Creation and Rollback',
    description: 'Test creating snapshots and rolling back to previous state',
    category: 'Snapshots',
    priority: 'Critical',
    async run() {
      const database = new RelationalDatabase();
      
      // Initial state
      database.tables.accounts = [
        { id: 'ACC001', name: 'Test Account 1', balance: 1000 },
        { id: 'ACC002', name: 'Test Account 2', balance: 500 }
      ];
      
      // Create snapshot
      const snapshotId = database.createSnapshot('Test Operation', 'Testing basic snapshot');
      
      // Modify data
      database.tables.accounts.push({ id: 'ACC003', name: 'New Account', balance: 200 });
      database.tables.accounts[0].balance = 1500;
      
      // Verify changes
      if (database.tables.accounts.length !== 3) {
        throw new Error('Expected 3 accounts after modification');
      }
      if (database.tables.accounts[0].balance !== 1500) {
        throw new Error('Expected balance to be modified');
      }
      
      // Rollback
      database.rollback(snapshotId);
      
      // Verify rollback
      if (database.tables.accounts.length !== 2) {
        throw new Error('Expected 2 accounts after rollback');
      }
      if (database.tables.accounts[0].balance !== 1000) {
        throw new Error('Expected balance to be restored');
      }
      
      return {
        success: true,
        message: 'Snapshot creation and rollback working correctly',
        details: {
          initialAccounts: 2,
          modifiedAccounts: 3,
          rolledBackAccounts: 2,
          balanceRestored: database.tables.accounts[0].balance === 1000
        }
      };
    }
  },

  {
    name: 'Persistent Backup Creation and Restoration',
    description: 'Test creating persistent backups in localStorage and restoring from them',
    category: 'Backups',
    priority: 'High',
    async run() {
      const database = new RelationalDatabase();
      
      // Setup initial data
      database.tables.accounts = [
        { id: 'ACC001', name: 'Main Account', balance: 2000 }
      ];
      database.tables.transactions = [
        { id: 'TXN001', accountId: 'ACC001', amount: -100, description: 'Test Transaction' }
      ];
      
      // Create backup
      const backupId = database.createBackup('Test Backup', 'Testing persistent backup');
      
      // Verify backup exists in localStorage
      const backupKey = `accounting_backup_${backupId}`;
      const storedBackup = localStorage.getItem(backupKey);
      if (!storedBackup) {
        throw new Error('Backup not found in localStorage');
      }
      
      // Modify data significantly
      database.tables.accounts = [];
      database.tables.transactions = [];
      
      // Restore from backup
      await database.restoreFromBackup(backupId);
      
      // Verify restoration
      if (database.tables.accounts.length !== 1) {
        throw new Error('Expected 1 account after restoration');
      }
      if (database.tables.transactions.length !== 1) {
        throw new Error('Expected 1 transaction after restoration');
      }
      if (database.tables.accounts[0].balance !== 2000) {
        throw new Error('Account balance not restored correctly');
      }
      
      // Cleanup
      localStorage.removeItem(backupKey);
      
      return {
        success: true,
        message: 'Persistent backup and restoration working correctly',
        details: {
          backupCreated: true,
          dataCleared: true,
          dataRestored: true,
          accountBalance: database.tables.accounts[0].balance,
          transactionCount: database.tables.transactions.length
        }
      };
    }
  },

  {
    name: 'Atomic Operation Success',
    description: 'Test that atomic operations complete fully when all steps succeed',
    category: 'Atomic Operations',
    priority: 'Critical',
    async run() {
      const database = new RelationalDatabase();
      
      // Initial state
      database.tables.accounts = [
        { id: 'ACC001', name: 'Source Account', balance: 1000 },
        { id: 'ACC002', name: 'Dest Account', balance: 500 }
      ];
      database.tables.transactions = [];
      
      // Define atomic transfer operation
      const transferOperations = [
        async () => {
          // Deduct from source
          const sourceAccount = database.tables.accounts.find(a => a.id === 'ACC001');
          sourceAccount.balance -= 200;
        },
        async () => {
          // Add to destination
          const destAccount = database.tables.accounts.find(a => a.id === 'ACC002');
          destAccount.balance += 200;
        },
        async () => {
          // Create transaction record
          database.tables.transactions.push({
            id: 'TXN001',
            accountId: 'ACC001',
            destinationAccountId: 'ACC002',
            amount: -200,
            description: 'Atomic Transfer Test'
          });
        }
      ];
      
      // Execute atomic operation
      await database.performAtomicOperation('Test Transfer', transferOperations);
      
      // Verify all operations completed
      const sourceAccount = database.tables.accounts.find(a => a.id === 'ACC001');
      const destAccount = database.tables.accounts.find(a => a.id === 'ACC002');
      
      if (sourceAccount.balance !== 800) {
        throw new Error(`Expected source balance 800, got ${sourceAccount.balance}`);
      }
      if (destAccount.balance !== 700) {
        throw new Error(`Expected dest balance 700, got ${destAccount.balance}`);
      }
      if (database.tables.transactions.length !== 1) {
        throw new Error('Expected 1 transaction record');
      }
      
      return {
        success: true,
        message: 'Atomic operation completed successfully',
        details: {
          sourceBalance: sourceAccount.balance,
          destBalance: destAccount.balance,
          transactionCreated: true,
          totalBalancePreserved: (sourceAccount.balance + destAccount.balance) === 1500
        }
      };
    }
  },

  {
    name: 'Atomic Operation Rollback on Failure',
    description: 'Test that atomic operations rollback completely when any step fails',
    category: 'Atomic Operations',
    priority: 'Critical',
    async run() {
      const database = new RelationalDatabase();
      
      // Initial state
      database.tables.accounts = [
        { id: 'ACC001', name: 'Test Account', balance: 1000 }
      ];
      database.tables.transactions = [];
      
      // Define atomic operation that will fail
      const failingOperations = [
        async () => {
          // Step 1: Modify account balance
          const account = database.tables.accounts.find(a => a.id === 'ACC001');
          account.balance = 500;
        },
        async () => {
          // Step 2: Add transaction
          database.tables.transactions.push({
            id: 'TXN001',
            accountId: 'ACC001',
            amount: -500,
            description: 'Will be rolled back'
          });
        },
        async () => {
          // Step 3: This will fail
          throw new Error('Simulated operation failure');
        }
      ];
      
      // Execute atomic operation (should fail)
      let operationFailed = false;
      try {
        await database.performAtomicOperation('Failing Operation', failingOperations);
      } catch (error) {
        operationFailed = true;
      }
      
      if (!operationFailed) {
        throw new Error('Expected operation to fail');
      }
      
      // Verify complete rollback
      const account = database.tables.accounts.find(a => a.id === 'ACC001');
      if (account.balance !== 1000) {
        throw new Error(`Expected balance 1000 after rollback, got ${account.balance}`);
      }
      if (database.tables.transactions.length !== 0) {
        throw new Error('Expected no transactions after rollback');
      }
      
      return {
        success: true,
        message: 'Atomic operation rollback working correctly',
        details: {
          operationFailed: true,
          balanceRestored: account.balance === 1000,
          transactionsCleared: database.tables.transactions.length === 0,
          dataIntegrityMaintained: true
        }
      };
    }
  },

  {
    name: 'Protected Account Deletion',
    description: 'Test that account deletion uses snapshot protection',
    category: 'Protected Operations',
    priority: 'High',
    async run() {
      const database = new RelationalDatabase();
      
      // Setup test data
      database.tables.accounts = [
        { id: 'ACC001', name: 'Safe Account', balance: 1000 },
        { id: 'ACC002', name: 'Used Account', balance: 500 }
      ];
      database.tables.transactions = [
        { id: 'TXN001', accountId: 'ACC002', amount: -100, description: 'Test' }
      ];
      
      // Test successful deletion (no transactions)
      const deletedAccount = await database.deleteAccount('ACC001');
      
      if (deletedAccount.id !== 'ACC001') {
        throw new Error('Expected to delete ACC001');
      }
      if (database.tables.accounts.length !== 1) {
        throw new Error('Expected 1 account remaining');
      }
      
      // Test failed deletion (has transactions) - should rollback
      let deletionFailed = false;
      const initialAccountCount = database.tables.accounts.length;
      
      try {
        await database.deleteAccount('ACC002');
      } catch (error) {
        deletionFailed = true;
      }
      
      if (!deletionFailed) {
        throw new Error('Expected deletion to fail for account with transactions');
      }
      
      // Verify rollback - account should still exist
      if (database.tables.accounts.length !== initialAccountCount) {
        throw new Error('Account count changed despite failed deletion');
      }
      
      const stillExists = database.tables.accounts.find(a => a.id === 'ACC002');
      if (!stillExists) {
        throw new Error('Account ACC002 should still exist after failed deletion');
      }
      
      return {
        success: true,
        message: 'Protected account deletion working correctly',
        details: {
          successfulDeletion: true,
          failedDeletionRolledBack: true,
          dataIntegrityMaintained: true,
          remainingAccounts: database.tables.accounts.length
        }
      };
    }
  },

  {
    name: 'Protected Transaction Deletion (Linked)',
    description: 'Test protected deletion of linked transactions (transfers)',
    category: 'Protected Operations',
    priority: 'High',
    async run() {
      const database = new RelationalDatabase();
      
      // Mock the reverseAccountBalances method
      let balanceReversalCalls = 0;
      database.reverseAccountBalances = () => {
        balanceReversalCalls++;
      };
      
      // Setup linked transactions (transfer)
      database.tables.accounts = [
        { id: 'ACC001', name: 'Account 1', balance: 1000 },
        { id: 'ACC002', name: 'Account 2', balance: 500 }
      ];
      database.tables.transactions = [
        {
          id: 'TXN001',
          accountId: 'ACC001',
          amount: -200,
          description: 'Transfer Out',
          linkedTransactionId: 'TXN002'
        },
        {
          id: 'TXN002',
          accountId: 'ACC002',
          amount: 200,
          description: 'Transfer In',
          linkedTransactionId: 'TXN001'
        },
        {
          id: 'TXN003',
          accountId: 'ACC001',
          amount: -50,
          description: 'Regular Transaction'
        }
      ];
      
      // Delete linked transaction - should delete both
      const deletedTransaction = await database.deleteTransaction('TXN001');
      
      // Verify both linked transactions were deleted
      if (database.tables.transactions.length !== 1) {
        throw new Error(`Expected 1 transaction remaining, got ${database.tables.transactions.length}`);
      }
      
      const remainingTransaction = database.tables.transactions[0];
      if (remainingTransaction.id !== 'TXN003') {
        throw new Error('Expected TXN003 to remain');
      }
      
      // Verify balance reversals were called for both transactions
      if (balanceReversalCalls !== 2) {
        throw new Error(`Expected 2 balance reversals, got ${balanceReversalCalls}`);
      }
      
      // Verify the correct transaction was returned
      if (deletedTransaction.id !== 'TXN001') {
        throw new Error('Expected TXN001 to be returned as deleted transaction');
      }
      
      return {
        success: true,
        message: 'Protected linked transaction deletion working correctly',
        details: {
          linkedTransactionsDeleted: 2,
          remainingTransactions: database.tables.transactions.length,
          balanceReversals: balanceReversalCalls,
          returnedCorrectTransaction: true
        }
      };
    }
  },

  {
    name: 'Snapshot Memory Management',
    description: 'Test that snapshot system manages memory correctly',
    category: 'Memory Management',
    priority: 'Medium',
    async run() {
      const database = new RelationalDatabase();
      const transactionManager = database.transactionManager;
      
      // Create more snapshots than the limit
      const maxSnapshots = 10;
      const snapshotIds = [];
      
      for (let i = 0; i < maxSnapshots + 5; i++) {
        const snapshotId = database.createSnapshot(`Test Snapshot ${i}`, `Testing snapshot ${i}`);
        snapshotIds.push(snapshotId);
        
        // Modify data to make each snapshot different
        database.tables.accounts = [{ id: `ACC${i}`, name: `Account ${i}`, balance: i * 100 }];
      }
      
      // Verify snapshot limit is enforced
      const availableSnapshots = database.getRecoveryOptions().snapshots;
      if (availableSnapshots.length > maxSnapshots) {
        throw new Error(`Expected max ${maxSnapshots} snapshots, got ${availableSnapshots.length}`);
      }
      
      // Verify oldest snapshots were removed
      const oldestSnapshot = snapshotIds[0];
      const hasOldestSnapshot = availableSnapshots.some(s => s.id === oldestSnapshot);
      if (hasOldestSnapshot) {
        throw new Error('Oldest snapshot should have been removed');
      }
      
      // Verify newest snapshots are retained
      const newestSnapshot = snapshotIds[snapshotIds.length - 1];
      const hasNewestSnapshot = availableSnapshots.some(s => s.id === newestSnapshot);
      if (!hasNewestSnapshot) {
        throw new Error('Newest snapshot should be retained');
      }
      
      return {
        success: true,
        message: 'Snapshot memory management working correctly',
        details: {
          snapshotsCreated: snapshotIds.length,
          snapshotsRetained: availableSnapshots.length,
          memoryLimitEnforced: true,
          oldestRemoved: !hasOldestSnapshot,
          newestRetained: hasNewestSnapshot
        }
      };
    }
  },

  {
    name: 'Backup Cleanup and Management',
    description: 'Test backup cleanup and localStorage management',
    category: 'Memory Management',
    priority: 'Medium',
    async run() {
      const database = new RelationalDatabase();
      
      // Clear any existing test backups
      const existingKeys = Object.keys(localStorage).filter(key => 
        key.startsWith('accounting_backup_')
      );
      existingKeys.forEach(key => localStorage.removeItem(key));
      
      // Create multiple backups
      const maxBackups = 5;
      const backupIds = [];
      
      for (let i = 0; i < maxBackups + 3; i++) {
        // Add delay to ensure different timestamps
        await new Promise(resolve => setTimeout(resolve, 10));
        
        const backupId = database.createBackup(`Test Backup ${i}`, `Backup ${i}`);
        backupIds.push(backupId);
      }
      
      // Check localStorage for backup count
      const backupKeys = Object.keys(localStorage).filter(key => 
        key.startsWith('accounting_backup_')
      );
      
      if (backupKeys.length > maxBackups) {
        throw new Error(`Expected max ${maxBackups} backups in localStorage, got ${backupKeys.length}`);
      }
      
      // Verify cleanup method works
      database.cleanupRecoveryData();
      
      const backupsAfterCleanup = Object.keys(localStorage).filter(key => 
        key.startsWith('accounting_backup_')
      );
      
      if (backupsAfterCleanup.length > maxBackups) {
        throw new Error(`Cleanup failed: still ${backupsAfterCleanup.length} backups after cleanup`);
      }
      
      // Test that newest backups are retained
      const availableBackups = database.getRecoveryOptions().backups;
      if (availableBackups.length === 0) {
        throw new Error('No backups available after cleanup');
      }
      
      // Cleanup test backups
      backupsAfterCleanup.forEach(key => localStorage.removeItem(key));
      
      return {
        success: true,
        message: 'Backup cleanup and management working correctly',
        details: {
          backupsCreated: backupIds.length,
          maxBackupsEnforced: backupKeys.length <= maxBackups,
          cleanupWorking: true,
          backupsInLocalStorage: backupsAfterCleanup.length
        }
      };
    }
  },

  {
    name: 'Full Protection Mode',
    description: 'Test executeWithFullProtection (snapshots + backups)',
    category: 'Full Protection',
    priority: 'High',
    async run() {
      const database = new RelationalDatabase();
      
      // Setup initial state
      database.tables.accounts = [
        { id: 'ACC001', name: 'Test Account', balance: 1000 }
      ];
      
      // Count initial snapshots and backups
      const initialSnapshots = database.getRecoveryOptions().snapshots.length;
      const initialBackups = database.getRecoveryOptions().backups.length;
      
      // Execute operation with full protection
      const result = await database.executeWithFullProtection(
        'Test Full Protection',
        async () => {
          // Modify account
          database.tables.accounts[0].balance = 1500;
          return 'Operation completed';
        },
        'Testing full protection mode'
      );
      
      // Verify operation completed
      if (result !== 'Operation completed') {
        throw new Error('Operation did not complete correctly');
      }
      if (database.tables.accounts[0].balance !== 1500) {
        throw new Error('Account balance was not modified');
      }
      
      // Verify both snapshot and backup were created
      const finalSnapshots = database.getRecoveryOptions().snapshots.length;
      const finalBackups = database.getRecoveryOptions().backups.length;
      
      if (finalSnapshots <= initialSnapshots) {
        throw new Error('Snapshot was not created');
      }
      if (finalBackups <= initialBackups) {
        throw new Error('Backup was not created');
      }
      
      // Test failure scenario with full protection
      let operationFailed = false;
      const preFailureBalance = database.tables.accounts[0].balance;
      
      try {
        await database.executeWithFullProtection(
          'Test Full Protection Failure',
          async () => {
            database.tables.accounts[0].balance = 2000;
            throw new Error('Simulated failure');
          }
        );
      } catch (error) {
        operationFailed = true;
      }
      
      // Verify rollback occurred
      if (!operationFailed) {
        throw new Error('Expected operation to fail');
      }
      if (database.tables.accounts[0].balance !== preFailureBalance) {
        throw new Error('Full protection did not rollback correctly');
      }
      
      return {
        success: true,
        message: 'Full protection mode working correctly',
        details: {
          successfulOperation: true,
          snapshotCreated: finalSnapshots > initialSnapshots,
          backupCreated: finalBackups > initialBackups,
          failureRollback: operationFailed,
          dataIntegrityMaintained: true
        }
      };
    }
  },

  {
    name: 'Recovery Options Interface',
    description: 'Test the recovery options and status reporting',
    category: 'Recovery Interface',
    priority: 'Low',
    async run() {
      const database = new RelationalDatabase();
      
      // Create some snapshots and backups
      const snapshotId1 = database.createSnapshot('Test Snapshot 1', 'First test snapshot');
      const snapshotId2 = database.createSnapshot('Test Snapshot 2', 'Second test snapshot');
      const backupId = database.createBackup('Test Backup', 'Test backup');
      
      // Get recovery options
      const recoveryOptions = database.getRecoveryOptions();
      
      // Verify structure
      if (!recoveryOptions.snapshots || !Array.isArray(recoveryOptions.snapshots)) {
        throw new Error('Recovery options should include snapshots array');
      }
      if (!recoveryOptions.backups || !Array.isArray(recoveryOptions.backups)) {
        throw new Error('Recovery options should include backups array');
      }
      if (!recoveryOptions.status || typeof recoveryOptions.status !== 'object') {
        throw new Error('Recovery options should include status object');
      }
      
      // Verify snapshot information
      if (recoveryOptions.snapshots.length < 2) {
        throw new Error('Expected at least 2 snapshots');
      }
      
      const snapshot = recoveryOptions.snapshots.find(s => s.id === snapshotId1);
      if (!snapshot) {
        throw new Error('Created snapshot not found in recovery options');
      }
      if (!snapshot.operation || !snapshot.timestamp || !snapshot.description) {
        throw new Error('Snapshot missing required metadata');
      }
      
      // Verify backup information
      if (recoveryOptions.backups.length < 1) {
        throw new Error('Expected at least 1 backup');
      }
      
      const backup = recoveryOptions.backups.find(b => b.id === backupId);
      if (!backup) {
        throw new Error('Created backup not found in recovery options');
      }
      
      // Verify status information
      const status = recoveryOptions.status;
      if (typeof status.snapshotCount !== 'number') {
        throw new Error('Status should include snapshot count');
      }
      if (typeof status.backupCount !== 'number') {
        throw new Error('Status should include backup count');
      }
      if (typeof status.isInTransaction !== 'boolean') {
        throw new Error('Status should include transaction state');
      }
      
      return {
        success: true,
        message: 'Recovery options interface working correctly',
        details: {
          snapshotsAvailable: recoveryOptions.snapshots.length,
          backupsAvailable: recoveryOptions.backups.length,
          statusComplete: true,
          metadataPresent: true
        }
      };
    }
  }
];

// Test Suite Configuration
export const testSuiteConfig = {
  ...TEST_CONFIG,
  tests: transactionManagementTests,
  setup: async () => {
    // Clear any existing test data from localStorage
    const testKeys = Object.keys(localStorage).filter(key => 
      key.startsWith('accounting_backup_') || key.includes('test')
    );
    testKeys.forEach(key => localStorage.removeItem(key));
    
    console.log('🧹 Cleared test data from localStorage');
    return true;
  },
  teardown: async () => {
    // Clean up after tests
    const testKeys = Object.keys(localStorage).filter(key => 
      key.startsWith('accounting_backup_')
    );
    testKeys.forEach(key => localStorage.removeItem(key));
    
    console.log('🧹 Cleaned up test data after transaction management tests');
    return true;
  },
  estimatedDuration: '30-45 seconds',
  tags: ['data-protection', 'transaction-management', 'critical', 'atomicity'],
  dependencies: ['relationalDatabase.js', 'transactionManager.js']
};

// Create function to match testRunner pattern
export const createTransactionManagementTests = () => {
  return transactionManagementTests.map(test => ({
    id: `tm-${test.name.toLowerCase().replace(/\s+/g, '-')}`,
    suite: `Transaction Management - ${test.category}`,
    name: test.name,
    description: test.description,
    expectedBehavior: `Test should ${test.description.toLowerCase()}`,
    testFunction: test.run
  }));
};

export default {
  config: testSuiteConfig,
  tests: transactionManagementTests
};