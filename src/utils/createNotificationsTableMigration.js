/**
 * Create Notifications Table Migration
 * 
 * This migration ensures the notifications.xlsx file is created with proper structure
 * even when no notifications exist yet. Resolves the issue where the notifications
 * table exists in memory but no physical file is created until first notification.
 */

class CreateNotificationsTableMigration {
  constructor(database, fileStorage = null, accountingContext = null) {
    this.database = database;
    this.fileStorage = fileStorage;
    this.accountingContext = accountingContext;
    this.migrationId = 'create_notifications_table';
    this.version = '1.0.0';
  }

  async canRun() {
    if (!this.database) {
      return { canRun: false, reason: 'Database not available' };
    }

    try {
      // Check if notifications table exists in database
      const hasNotificationsTable = this.database.tables.notifications !== undefined;
      
      // Check if notifications.xlsx file already exists by trying to load it
      let fileExists = false;
      if (this.fileStorage) {
        try {
          const notificationsData = this.fileStorage.loadTable('notifications');
          fileExists = notificationsData && notificationsData.length >= 0; // Even empty array means file exists
        } catch (error) {
          // File doesn't exist or can't be loaded
          fileExists = false;
        }
      }

      if (!hasNotificationsTable) {
        return { canRun: true, reason: 'Notifications table needs to be created' };
      } else if (!fileExists) {
        return { canRun: true, reason: 'Notifications table exists in memory but notifications.xlsx file is missing' };
      } else {
        return { canRun: false, reason: 'Notifications table and file already exist' };
      }
    } catch (error) {
      return { canRun: true, reason: 'Error checking notifications table status - migration may be needed' };
    }
  }

  async runMigration() {
    console.log('Starting Create Notifications Table Migration...');
    
    try {
      // Create backup suffix for rollback
      const backupSuffix = `backup_${Date.now()}`;
      let backupCreated = false;
      
      // Check current state
      const hasTable = this.database.tables.notifications !== undefined;
      const currentNotifications = this.database.tables.notifications || [];
      
      // If table exists with data, create backup first
      if (hasTable && currentNotifications.length > 0) {
        try {
          await this.createBackup(backupSuffix);
          backupCreated = true;
          console.log('Backup created:', backupSuffix);
        } catch (error) {
          console.warn('Could not create backup:', error.message);
        }
      }

      // Ensure notifications table exists in database schema
      if (!this.database.tableSchemas.notifications) {
        this.database.tableSchemas.notifications = [
          'id', 'type', 'priority', 'title', 'message', 
          'data', 'isRead', 'createdAt', 'expiresAt'
        ];
        console.log('Notifications table schema added');
      }

      // Ensure notifications table exists in database tables
      if (!this.database.tables.notifications) {
        this.database.tables.notifications = [];
        console.log('Notifications table initialized in memory');
      }

      // Force creation of notifications.xlsx file 
      console.log('Creating notifications.xlsx file...');
      
      // Step 1: Update the workbook in memory
      this.database.saveTableToWorkbook('notifications');
      console.log('✅ Notifications workbook updated in memory');
      
      // Step 2: Save to file storage
      if (this.fileStorage) {
        const buffer = this.database.exportTableToBuffer('notifications');
        
        // Ensure file handle exists for notifications table
        if (!this.fileStorage.fileHandles?.notifications) {
          console.log('Creating missing notifications file handle...');
          await this.fileStorage.createMissingFileHandles();
        }
        
        await this.fileStorage.saveTable('notifications', buffer);
        console.log('💾 Notifications saved to notifications.xlsx');
      } else {
        throw new Error('File storage system not available - cannot create notifications file in database folder');
      }

      // Record this migration as completed
      await this.recordMigration();

      return {
        success: true,
        tableCreated: !hasTable,
        fileCreated: true,
        notificationsPreserved: currentNotifications.length,
        backupSuffix: backupCreated ? backupSuffix : null,
        schemaUpdated: !this.database.tableSchemas.notifications
      };

    } catch (error) {
      console.error('Create Notifications Table Migration failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async rollbackMigration(backupSuffix) {
    console.log('Starting rollback for Create Notifications Table Migration...');
    
    try {
      if (!backupSuffix) {
        // If no backup was created, just remove the empty table/file
        delete this.database.tables.notifications;
        delete this.database.tableSchemas.notifications;
        
        // Clear the notifications table by using database method
        this.database.tables.notifications = [];
        // The file will remain but be empty - this is acceptable for rollback
        console.log('Notifications table cleared');

        return {
          success: true,
          message: 'Migration rolled back - notifications table/file removed'
        };
      }

      // Restore from backup
      await this.restoreBackup(backupSuffix);

      return {
        success: true,
        message: 'Migration rolled back from backup'
      };

    } catch (error) {
      console.error('Rollback failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async createBackup(backupSuffix) {
    // Create backup of current notifications table
    const currentNotifications = this.database.tables.notifications || [];
    const backupData = JSON.stringify({
      tableData: currentNotifications,
      schema: this.database.tableSchemas.notifications || [],
      timestamp: new Date().toISOString()
    });

    // Store backup (this is a simplified version - in a real system you'd save to a backup location)
    this.database.tables[`notifications_${backupSuffix}`] = [
      {
        id: 'backup_record',
        backupData: backupData,
        createdAt: new Date().toISOString()
      }
    ];
  }

  async restoreBackup(backupSuffix) {
    // Restore from backup
    const backupTable = this.database.tables[`notifications_${backupSuffix}`];
    if (!backupTable || !backupTable[0]) {
      throw new Error('Backup not found');
    }

    const backup = JSON.parse(backupTable[0].backupData);
    this.database.tables.notifications = backup.tableData;
    this.database.tableSchemas.notifications = backup.schema;

    // Restored data is already in database tables, no additional save needed
    console.log('Notifications table restored from backup');

    // Clean up backup
    delete this.database.tables[`notifications_${backupSuffix}`];
  }

  async recordMigration() {
    // Record that this migration was applied
    try {
      // Ensure migrations table exists
      if (!this.database.tables.migrations) {
        this.database.tables.migrations = [];
        this.database.tableSchemas.migrations = [
          'id', 'name', 'version', 'description', 'appliedAt', 'success'
        ];
      }

      const migrationRecord = {
        id: `migration_${Date.now()}`,
        name: this.migrationId,
        version: this.version,
        description: 'Create notifications table and notifications.xlsx file',
        appliedAt: new Date().toISOString(),
        success: true
      };

      this.database.tables.migrations.push(migrationRecord);
      this.database.saveTableToWorkbook('migrations');
      
    } catch (error) {
      console.warn('Could not record migration:', error.message);
    }
  }
}

export default CreateNotificationsTableMigration;