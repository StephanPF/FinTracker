/**
 * Local Transaction Manager for Personal Accounting Application
 * 
 * Provides atomic operations, snapshots, and rollback capabilities
 * to protect financial data from corruption during operations.
 * 
 * Designed for personal use with local data storage.
 */

class TransactionManager {
  constructor(database) {
    this.database = database;
    this.snapshots = [];
    this.backups = [];
    this.maxSnapshots = 10; // Keep last 10 snapshots for memory management
    this.maxBackups = 5; // Keep last 5 automatic backups
    this.isInTransaction = false;
    this.currentTransaction = null;
  }

  /**
   * Create a snapshot of the current database state
   * This allows for quick rollback without file system operations
   */
  createSnapshot(operationName, description = '') {
    const snapshot = {
      id: `snapshot_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      operation: operationName,
      description: description,
      timestamp: new Date().toISOString(),
      tables: this.deepClone(this.database.tables),
      tableVersions: { ...this.database.tableVersions } // Copy version tracking
    };
    
    this.snapshots.unshift(snapshot);
    
    // Clean up old snapshots to manage memory
    if (this.snapshots.length > this.maxSnapshots) {
      this.snapshots = this.snapshots.slice(0, this.maxSnapshots);
    }
    
    console.log(`📸 Created snapshot: ${operationName} (${snapshot.id})`);
    return snapshot.id;
  }

  /**
   * Create a persistent backup in localStorage
   * Survives browser crashes and provides additional protection
   */
  createBackup(operationName, description = '') {
    const backup = {
      id: `backup_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      operation: operationName,
      description: description,
      timestamp: new Date().toISOString(),
      data: this.database.exportAllTables()
    };

    // Store in localStorage
    const backupKey = `accounting_backup_${backup.id}`;
    localStorage.setItem(backupKey, JSON.stringify(backup));

    // Track backup metadata
    this.backups.unshift(backup);
    
    // Clean up old backups immediately
    this.cleanupOldBackups();

    console.log(`💾 Created backup: ${operationName} (${backup.id})`);
    return backup.id;
  }

  /**
   * Clean up old backups from both memory and localStorage
   */
  cleanupOldBackups() {
    // Get all backup keys from localStorage
    const allBackupKeys = Object.keys(localStorage).filter(key => 
      key.startsWith('accounting_backup_')
    );
    
    // If we have too many backups, remove the oldest ones
    if (allBackupKeys.length > this.maxBackups) {
      // Parse backup data to get timestamps for sorting
      const backupData = allBackupKeys.map(key => {
        try {
          const data = JSON.parse(localStorage.getItem(key));
          return { key, timestamp: data.timestamp, id: data.id };
        } catch {
          return { key, timestamp: '1970-01-01T00:00:00.000Z', id: null };
        }
      });
      
      // Sort by timestamp (oldest first)
      backupData.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
      
      // Remove oldest backups beyond the limit
      const toRemove = backupData.slice(0, backupData.length - this.maxBackups);
      toRemove.forEach(backup => {
        localStorage.removeItem(backup.key);
        // Also remove from in-memory tracking
        this.backups = this.backups.filter(b => b.id !== backup.id);
      });
    }
    
    // Also clean up in-memory backup tracking
    if (this.backups.length > this.maxBackups) {
      this.backups = this.backups.slice(0, this.maxBackups);
    }
  }

  /**
   * Rollback to a specific snapshot
   */
  rollback(snapshotId) {
    const snapshot = this.snapshots.find(s => s.id === snapshotId);
    if (!snapshot) {
      throw new Error(`Snapshot not found: ${snapshotId}`);
    }

    try {
      // Restore database state
      this.database.tables = this.deepClone(snapshot.tables);
      this.database.tableVersions = { ...snapshot.tableVersions };
      
      console.log(`🔄 Rolled back to snapshot: ${snapshot.operation} (${snapshot.timestamp})`);
      return true;
    } catch (error) {
      console.error('Failed to rollback to snapshot:', error);
      throw new Error(`Rollback failed: ${error.message}`);
    }
  }

  /**
   * Restore from a persistent backup
   */
  async restoreFromBackup(backupId) {
    const backupKey = `accounting_backup_${backupId}`;
    const backupData = localStorage.getItem(backupKey);
    
    if (!backupData) {
      throw new Error(`Backup not found: ${backupId}`);
    }

    try {
      const backup = JSON.parse(backupData);
      
      // Import the backup data
      await this.database.importAllTables(backup.data);
      
      console.log(`🔄 Restored from backup: ${backup.operation} (${backup.timestamp})`);
      return true;
    } catch (error) {
      console.error('Failed to restore from backup:', error);
      throw new Error(`Restore failed: ${error.message}`);
    }
  }

  /**
   * Execute a single operation with snapshot protection
   */
  async executeWithSnapshot(operationName, operation, description = '') {
    if (this.isInTransaction) {
      throw new Error('Cannot create nested transactions. Complete current transaction first.');
    }

    const snapshotId = this.createSnapshot(operationName, description);
    
    try {
      console.log(`🚀 Executing: ${operationName}`);
      const result = await operation();
      
      // Save changes to persistent storage
      await this.database.saveAllTables();
      
      console.log(`✅ Completed: ${operationName}`);
      return result;
    } catch (error) {
      console.error(`❌ Failed: ${operationName}`, error);
      
      // Rollback on failure
      try {
        this.rollback(snapshotId);
        console.log(`🔄 Rolled back: ${operationName}`);
      } catch (rollbackError) {
        console.error('Rollback failed:', rollbackError);
        throw new Error(`Operation failed and rollback failed: ${error.message}`);
      }
      
      throw new Error(`Operation "${operationName}" failed: ${error.message}`);
    }
  }

  /**
   * Execute multiple operations atomically
   * All operations succeed or all are rolled back
   */
  async performAtomicOperation(operationName, operations, description = '') {
    if (this.isInTransaction) {
      throw new Error('Cannot start nested atomic operations');
    }

    this.isInTransaction = true;
    this.currentTransaction = {
      name: operationName,
      startTime: Date.now(),
      operationCount: operations.length
    };

    const snapshotId = this.createSnapshot(operationName, description);
    const backupId = this.createBackup(operationName, description);
    
    try {
      console.log(`🔄 Starting atomic operation: ${operationName} (${operations.length} operations)`);
      
      const results = [];
      
      // Execute all operations in sequence
      for (let i = 0; i < operations.length; i++) {
        const operation = operations[i];
        console.log(`  ⏳ Executing operation ${i + 1}/${operations.length}`);
        
        const result = await operation();
        results.push(result);
      }
      
      // All operations succeeded, save to persistent storage
      await this.database.saveAllTables();
      
      const duration = Date.now() - this.currentTransaction.startTime;
      console.log(`✅ Atomic operation completed: ${operationName} (${duration}ms)`);
      
      return results;
    } catch (error) {
      console.error(`❌ Atomic operation failed: ${operationName}`, error);
      
      // Rollback all changes
      try {
        this.rollback(snapshotId);
        console.log(`🔄 Atomic rollback completed: ${operationName}`);
      } catch (rollbackError) {
        console.error('Atomic rollback failed, attempting backup restore:', rollbackError);
        
        // If snapshot rollback fails, try backup restore
        try {
          await this.restoreFromBackup(backupId);
          console.log(`🔄 Restored from backup: ${operationName}`);
        } catch (restoreError) {
          console.error('Backup restore failed:', restoreError);
          throw new Error(
            `Atomic operation failed and recovery failed. ` +
            `Original error: ${error.message}. ` +
            `Recovery error: ${restoreError.message}`
          );
        }
      }
      
      throw new Error(`Atomic operation "${operationName}" failed: ${error.message}`);
    } finally {
      this.isInTransaction = false;
      this.currentTransaction = null;
    }
  }

  /**
   * Execute operation with both snapshot and backup protection
   * Maximum protection for critical operations
   */
  async executeWithFullProtection(operationName, operation, description = '') {
    const backupId = this.createBackup(operationName, description);
    
    try {
      return await this.executeWithSnapshot(operationName, operation, description);
    } catch (error) {
      console.warn(`Snapshot recovery failed, attempting backup restore for: ${operationName}`);
      
      try {
        await this.restoreFromBackup(backupId);
        throw error; // Re-throw original error after successful restore
      } catch (restoreError) {
        throw new Error(
          `Operation failed and recovery failed. ` +
          `Original error: ${error.message}. ` +
          `Recovery error: ${restoreError.message}`
        );
      }
    }
  }

  /**
   * Get list of available snapshots
   */
  getAvailableSnapshots() {
    return this.snapshots.map(s => ({
      id: s.id,
      operation: s.operation,
      description: s.description,
      timestamp: s.timestamp
    }));
  }

  /**
   * Get list of available backups
   */
  getAvailableBackups() {
    return this.backups.map(b => ({
      id: b.id,
      operation: b.operation,
      description: b.description,
      timestamp: b.timestamp
    }));
  }

  /**
   * Clean up old snapshots and backups
   */
  cleanup() {
    // Clean snapshots (already handled in createSnapshot)
    
    // Clean old backups using the improved cleanup method
    this.cleanupOldBackups();
    
    console.log(`🧹 Cleanup completed. Keeping up to ${this.maxBackups} backups`);
  }

  /**
   * Deep clone utility for creating snapshots
   */
  deepClone(obj) {
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }
    
    if (obj instanceof Date) {
      return new Date(obj.getTime());
    }
    
    if (obj instanceof Array) {
      return obj.map(item => this.deepClone(item));
    }
    
    if (typeof obj === 'object') {
      const cloned = {};
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          cloned[key] = this.deepClone(obj[key]);
        }
      }
      return cloned;
    }
    
    return obj;
  }

  /**
   * Get transaction status information
   */
  getStatus() {
    return {
      isInTransaction: this.isInTransaction,
      currentTransaction: this.currentTransaction,
      snapshotCount: this.snapshots.length,
      backupCount: this.backups.length,
      memoryUsage: this.estimateMemoryUsage()
    };
  }

  /**
   * Estimate memory usage of snapshots (rough calculation)
   */
  estimateMemoryUsage() {
    const snapshotSize = JSON.stringify(this.snapshots).length;
    return {
      snapshots: `${Math.round(snapshotSize / 1024)}KB`,
      backups: `${this.backups.length} backups in localStorage`
    };
  }
}

export default TransactionManager;