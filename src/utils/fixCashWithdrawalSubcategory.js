class FixCashWithdrawalSubcategoryMigration {
  constructor(database, fileStorage = null) {
    this.database = database;
    this.fileStorage = fileStorage;
    this.migrationId = 'fix_cash_withdrawal_subcategory';
    this.migrationName = 'Fix Cash Withdrawal Subcategory Persistence';
    this.description = 'Ensures SUB_068 Cash Withdrawal subcategory is properly saved to database files, not just localStorage';
  }

  async canRun() {
    try {
      // Check if GRP_010 exists
      const miscGroup = this.database.tables.transaction_groups?.find(group => group.id === 'GRP_010');
      if (!miscGroup) {
        return { 
          canRun: false, 
          reason: 'Transaction group GRP_010 (Miscellaneous) not found. This migration is only for NOMADIC database configurations.' 
        };
      }

      // Check if SUB_068 exists in memory but needs to be persisted
      const existingSubcategory = this.database.tables.subcategories?.find(sub => sub.id === 'SUB_068');
      if (!existingSubcategory) {
        return { 
          canRun: true, 
          reason: 'SUB_068 not found - will create it' 
        };
      }

      // If it exists in memory, check if it has the correct properties
      if (existingSubcategory && existingSubcategory.isCashWithdrawal !== true) {
        return { 
          canRun: true, 
          reason: 'SUB_068 exists but missing isCashWithdrawal flag - will fix it' 
        };
      }

      // Always allow this migration to run to ensure file persistence
      return { 
        canRun: true, 
        reason: 'Will ensure SUB_068 is properly persisted to database files' 
      };

    } catch (error) {
      console.error('Error checking migration prerequisites:', error);
      return { 
        canRun: false, 
        reason: `Error checking prerequisites: ${error.message}` 
      };
    }
  }

  createBackup() {
    try {
      const backupSuffix = `_backup_${Date.now()}`;
      
      // Create backup of subcategories table
      const subcategories = this.database.tables.subcategories || [];
      this.database.tables = this.database.tables || {};
      this.database.tables[`subcategories${backupSuffix}`] = [...subcategories];
      
      // Save backup to file
      this.database.saveTableToWorkbook(`subcategories${backupSuffix}`);
      
      console.log(`✅ Backup created: subcategories${backupSuffix}`);
      return { success: true, backupSuffix };
    } catch (error) {
      console.error('❌ Failed to create backup:', error);
      throw new Error(`Failed to create backup: ${error.message}`);
    }
  }

  async runMigration() {
    try {
      console.log('🚀 Starting Cash Withdrawal subcategory fix migration...');
      
      // Create backup
      const backup = this.createBackup();
      
      // Get database language to determine text
      const dbInfo = this.database.tables.database_info || [];
      const languageInfo = dbInfo.find(info => info.key === 'language');
      const language = languageInfo ? languageInfo.value : 'en';
      
      // Check if SUB_068 already exists
      const existingIndex = this.database.tables.subcategories?.findIndex(sub => sub.id === 'SUB_068');
      
      // Define subcategory data based on language
      const subcategoryData = language === 'fr' ? {
        id: 'SUB_068',
        name: 'Retrait d\'Espèces',
        description: 'Retraits DAB et transactions en espèces',
        groupId: 'GRP_010',
        isActive: true,
        isCashWithdrawal: true,
        createdAt: new Date().toISOString()
      } : {
        id: 'SUB_068',
        name: 'Cash Withdrawal',
        description: 'ATM withdrawals and cash-based transactions',
        groupId: 'GRP_010',
        isActive: true,
        isCashWithdrawal: true,
        createdAt: new Date().toISOString()
      };

      // Initialize subcategories if needed
      this.database.tables.subcategories = this.database.tables.subcategories || [];

      if (existingIndex >= 0) {
        // Update existing entry to ensure it has correct properties
        this.database.tables.subcategories[existingIndex] = subcategoryData;
        console.log('🔄 Updated existing SUB_068 with correct properties');
      } else {
        // Add new entry
        this.database.tables.subcategories.push(subcategoryData);
        console.log('➕ Added new SUB_068 subcategory');
      }
      
      // CRITICAL: Properly save to both workbook AND file storage
      this.database.saveTableToWorkbook('subcategories');
      console.log('📝 Saved to workbook');
      
      // Export and save to actual file storage
      const buffer = this.database.exportTableToBuffer('subcategories');
      if (this.fileStorage) {
        await this.fileStorage.saveTable('subcategories', buffer);
        console.log('💾 Subcategories properly saved to subcategories.xlsx');
      } else {
        console.warn('⚠️ File storage not available - changes only in memory');
      }
      
      console.log(`✅ Fixed Cash Withdrawal subcategory (SUB_068) with language: ${language}`);
      console.log(`📄 Subcategory details:`, subcategoryData);
      
      return {
        success: true,
        details: {
          subcategoryId: 'SUB_068',
          groupId: 'GRP_010',
          language: language,
          action: existingIndex >= 0 ? 'updated' : 'created',
          backupSuffix: backup.backupSuffix,
          subcategoryData: subcategoryData
        }
      };
      
    } catch (error) {
      console.error('❌ Migration failed:', error);
      throw new Error(`Migration failed: ${error.message}`);
    }
  }

  async rollbackMigration(backupSuffix) {
    try {
      console.log('🔄 Rolling back Cash Withdrawal subcategory fix migration...');
      
      if (!backupSuffix) {
        throw new Error('No backup suffix provided for rollback');
      }
      
      const backupTableName = `subcategories_backup_${backupSuffix}`;
      const backupTable = this.database.tables[backupTableName];
      
      if (!backupTable) {
        throw new Error(`Backup table ${backupTableName} not found`);
      }
      
      // Restore from backup
      this.database.tables.subcategories = [...backupTable];
      
      // Save restored table
      this.database.saveTableToWorkbook('subcategories');
      
      // Save to file storage
      if (this.fileStorage) {
        const buffer = this.database.exportTableToBuffer('subcategories');
        await this.fileStorage.saveTable('subcategories', buffer);
      }
      
      // Clean up backup table
      delete this.database.tables[backupTableName];
      
      console.log('✅ Rollback completed successfully');
      return { success: true };
      
    } catch (error) {
      console.error('❌ Rollback failed:', error);
      throw new Error(`Rollback failed: ${error.message}`);
    }
  }

  getValidationQueries() {
    return [
      {
        name: 'Check SUB_068 exists in memory',
        query: () => {
          const subcategory = this.database.tables.subcategories?.find(sub => sub.id === 'SUB_068');
          return {
            success: !!subcategory,
            result: subcategory || 'Not found',
            expected: 'Subcategory with id SUB_068'
          };
        }
      },
      {
        name: 'Verify isCashWithdrawal flag',
        query: () => {
          const subcategory = this.database.tables.subcategories?.find(sub => sub.id === 'SUB_068');
          return {
            success: subcategory && subcategory.isCashWithdrawal === true,
            result: subcategory ? subcategory.isCashWithdrawal : 'Subcategory not found',
            expected: 'true'
          };
        }
      },
      {
        name: 'Verify group assignment',
        query: () => {
          const subcategory = this.database.tables.subcategories?.find(sub => sub.id === 'SUB_068');
          return {
            success: subcategory && subcategory.groupId === 'GRP_010',
            result: subcategory ? subcategory.groupId : 'Subcategory not found',
            expected: 'GRP_010'
          };
        }
      }
    ];
  }
}

export default FixCashWithdrawalSubcategoryMigration;