/**
 * Database Migration Script: Add Refund Transaction Group and Subcategory
 * 
 * This script adds:
 * 1. GRP_018 "Refunds" transaction group linked to CAT_001 (Income)
 * 2. SUB_069 "Refund" subcategory linked to GRP_018
 * 
 * Migration Tasks:
 * 1. Add GRP_018 transaction group to both English and French configurations
 * 2. Add SUB_069 subcategory to both English and French configurations
 * 3. Ensure proper file persistence (not just localStorage)
 * 4. Support both existing and new databases
 */

class AddRefundGroupAndSubcategoryMigration {
  constructor(database, fileStorage = null) {
    this.database = database;
    this.fileStorage = fileStorage;
    this.migrationName = 'add_refund_group_and_subcategory';
    this.migrationVersion = '1.0.0';
  }

  /**
   * Check if migration has already been applied
   */
  isMigrationApplied() {
    try {
      const migrations = this.database.getTable('migrations') || [];
      return migrations.some(m => m.name === this.migrationName && m.version === this.migrationVersion);
    } catch (error) {
      return false;
    }
  }

  /**
   * Record that migration has been applied
   */
  recordMigration() {
    try {
      let migrations = this.database.getTable('migrations') || [];
      
      if (!Array.isArray(migrations)) {
        migrations = [];
      }

      const migrationRecord = {
        id: `MIG_${Date.now()}`,
        name: this.migrationName,
        version: this.migrationVersion,
        appliedAt: new Date().toISOString(),
        description: 'Added GRP_018 Refunds transaction group and SUB_069 Refund subcategory'
      };

      migrations.push(migrationRecord);
      this.database.tables = this.database.tables || {};
      this.database.tables['migrations'] = migrations;
      
      console.log('✅ Migration recorded successfully');
    } catch (error) {
      console.error('❌ Failed to record migration:', error);
    }
  }

  /**
   * Check if migration can run
   */
  async canRun() {
    try {
      // Check if CAT_001 (Income) exists
      const incomeCategory = this.database.tables.transaction_types?.find(type => type.id === 'CAT_001');
      if (!incomeCategory) {
        return { 
          canRun: false, 
          reason: 'Transaction type CAT_001 (Income) not found. This migration requires Income category to exist.' 
        };
      }

      // Check if GRP_018 already exists
      const existingGroup = this.database.tables.transaction_groups?.find(group => group.id === 'GRP_018');
      if (existingGroup) {
        return { 
          canRun: false, 
          reason: 'Transaction group GRP_018 already exists. Migration has likely been applied.' 
        };
      }

      // Check if SUB_069 already exists
      const existingSubcategory = this.database.tables.subcategories?.find(sub => sub.id === 'SUB_069');
      if (existingSubcategory) {
        return { 
          canRun: false, 
          reason: 'Subcategory SUB_069 already exists. Migration has likely been applied.' 
        };
      }

      return { canRun: true, reason: 'Migration can proceed safely' };

    } catch (error) {
      console.error('Error checking migration prerequisites:', error);
      return { 
        canRun: false, 
        reason: `Error checking prerequisites: ${error.message}` 
      };
    }
  }

  /**
   * Create backup of affected tables
   */
  createBackup() {
    try {
      const timestamp = Date.now();
      const backupSuffix = `_backup_${timestamp}`;

      // Backup transaction_groups
      const transactionGroups = this.database.getTable('transaction_groups') || [];
      this.database.tables = this.database.tables || {};
      this.database.tables[`transaction_groups${backupSuffix}`] = [...transactionGroups];

      // Backup subcategories
      const subcategories = this.database.getTable('subcategories') || [];
      this.database.tables[`subcategories${backupSuffix}`] = [...subcategories];

      console.log(`✅ Backup created with suffix: ${backupSuffix}`);
      return backupSuffix;
    } catch (error) {
      console.error('❌ Failed to create backup:', error);
      throw new Error(`Failed to create backup: ${error.message}`);
    }
  }

  /**
   * Add GRP_018 transaction group
   */
  async addTransactionGroup() {
    try {
      // Get database language to determine text
      const dbInfo = this.database.getTable('database_info') || [];
      const languageInfo = dbInfo.find(info => info.key === 'language');
      const language = languageInfo ? languageInfo.value : 'en';
      
      // Initialize transaction_groups if needed
      this.database.tables.transaction_groups = this.database.tables.transaction_groups || [];

      // Define group data based on language
      const groupData = language === 'fr' ? {
        id: 'GRP_018',
        name: 'Remboursements',
        description: 'Remboursements d\'achats, services et transactions',
        color: '#8bc34a',
        isActive: true,
        transactionTypeId: 'CAT_001', // Revenus
        createdAt: new Date().toISOString()
      } : {
        id: 'GRP_018',
        name: 'Refunds',
        description: 'Refunds from purchases, services, and transactions',
        color: '#8bc34a',
        isActive: true,
        transactionTypeId: 'CAT_001', // Income
        createdAt: new Date().toISOString()
      };

      // Add the group
      this.database.tables.transaction_groups.push(groupData);
      
      // Save to both workbook AND file storage
      this.database.saveTableToWorkbook('transaction_groups');
      console.log('📝 Transaction groups saved to workbook');
      
      if (this.fileStorage) {
        const buffer = this.database.exportTableToBuffer('transaction_groups');
        await this.fileStorage.saveTable('transaction_groups', buffer);
        console.log('💾 Transaction groups properly saved to transaction_groups.xlsx');
      } else {
        console.warn('⚠️ File storage not available - changes only in memory');
      }
      
      console.log(`✅ Added GRP_018 transaction group with language: ${language}`);
      return { success: true, groupData, language };
      
    } catch (error) {
      console.error('❌ Failed to add transaction group:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Add SUB_069 subcategory
   */
  async addSubcategory() {
    try {
      // Get database language to determine text
      const dbInfo = this.database.getTable('database_info') || [];
      const languageInfo = dbInfo.find(info => info.key === 'language');
      const language = languageInfo ? languageInfo.value : 'en';
      
      // Initialize subcategories if needed
      this.database.tables.subcategories = this.database.tables.subcategories || [];

      // Define subcategory data based on language
      const subcategoryData = language === 'fr' ? {
        id: 'SUB_069',
        name: 'Remboursement',
        description: 'Remboursements d\'achats, services et annulations',
        groupId: 'GRP_018',
        isActive: true,
        createdAt: new Date().toISOString()
      } : {
        id: 'SUB_069',
        name: 'Refund',
        description: 'Refunds from purchases, services, and cancellations',
        groupId: 'GRP_018',
        isActive: true,
        createdAt: new Date().toISOString()
      };

      // Add the subcategory
      this.database.tables.subcategories.push(subcategoryData);
      
      // Save to both workbook AND file storage
      this.database.saveTableToWorkbook('subcategories');
      console.log('📝 Subcategories saved to workbook');
      
      if (this.fileStorage) {
        const buffer = this.database.exportTableToBuffer('subcategories');
        await this.fileStorage.saveTable('subcategories', buffer);
        console.log('💾 Subcategories properly saved to subcategories.xlsx');
      } else {
        console.warn('⚠️ File storage not available - changes only in memory');
      }
      
      console.log(`✅ Added SUB_069 subcategory with language: ${language}`);
      return { success: true, subcategoryData, language };
      
    } catch (error) {
      console.error('❌ Failed to add subcategory:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Validate migration results
   */
  validateMigration() {
    try {
      const transactionGroups = this.database.getTable('transaction_groups') || [];
      const subcategories = this.database.getTable('subcategories') || [];

      // Check that GRP_018 exists with correct properties
      const grp018 = transactionGroups.find(g => g.id === 'GRP_018');
      const hasRefundGroup = grp018 && 
        (grp018.name === 'Refunds' || grp018.name === 'Remboursements') &&
        grp018.transactionTypeId === 'CAT_001';

      // Check that SUB_069 exists with correct properties
      const sub069 = subcategories.find(s => s.id === 'SUB_069');
      const hasRefundSubcategory = sub069 && 
        (sub069.name === 'Refund' || sub069.name === 'Remboursement') &&
        sub069.groupId === 'GRP_018';

      const validation = {
        grp018Added: hasRefundGroup,
        sub069Added: hasRefundSubcategory,
        grp018Data: grp018,
        sub069Data: sub069
      };

      console.log('🔍 Migration Validation Results:');
      console.log(`   GRP_018 added: ${validation.grp018Added ? '✅' : '❌'}`);
      console.log(`   SUB_069 added: ${validation.sub069Added ? '✅' : '❌'}`);

      return validation.grp018Added && validation.sub069Added;
    } catch (error) {
      console.error('❌ Failed to validate migration:', error);
      return false;
    }
  }

  /**
   * Run the complete migration
   */
  async runMigration() {
    console.log('🚀 Starting Add Refund Group and Subcategory Migration...');
    console.log('==========================================');

    // Check if already applied
    if (this.isMigrationApplied()) {
      console.log('ℹ️  Migration already applied. Skipping...');
      return { success: true, alreadyApplied: true };
    }

    try {
      // Step 1: Create backup
      console.log('📦 Step 1: Creating backup...');
      const backupSuffix = this.createBackup();
      if (!backupSuffix) {
        throw new Error('Failed to create backup');
      }

      // Step 2: Add transaction group
      console.log('📝 Step 2: Adding GRP_018 transaction group...');
      const groupResult = await this.addTransactionGroup();
      if (!groupResult.success) {
        throw new Error(`Failed to add transaction group: ${groupResult.error}`);
      }

      // Step 3: Add subcategory
      console.log('📝 Step 3: Adding SUB_069 subcategory...');
      const subcategoryResult = await this.addSubcategory();
      if (!subcategoryResult.success) {
        throw new Error(`Failed to add subcategory: ${subcategoryResult.error}`);
      }

      // Step 4: Validate migration
      console.log('✅ Step 4: Validating migration...');
      const isValid = this.validateMigration();
      if (!isValid) {
        throw new Error('Migration validation failed');
      }

      // Step 5: Record migration
      console.log('📋 Step 5: Recording migration...');
      this.recordMigration();

      console.log('==========================================');
      console.log('🎉 Migration completed successfully!');
      console.log(`   Transaction group added: GRP_018 ${groupResult.groupData.name}`);
      console.log(`   Subcategory added: SUB_069 ${subcategoryResult.subcategoryData.name}`);
      console.log(`   Language: ${groupResult.language}`);
      console.log(`   Backup created: ${backupSuffix}`);

      return {
        success: true,
        groupAdded: groupResult.groupData,
        subcategoryAdded: subcategoryResult.subcategoryData,
        language: groupResult.language,
        backupSuffix,
        alreadyApplied: false
      };

    } catch (error) {
      console.error('==========================================');
      console.error('❌ Migration failed:', error.message);
      console.error('   Database may be in inconsistent state');
      console.error('   Consider restoring from backup if needed');
      
      return {
        success: false,
        error: error.message,
        alreadyApplied: false
      };
    }
  }

  /**
   * Rollback migration (restore from backup)
   */
  async rollbackMigration(backupSuffix) {
    console.log('🔄 Rolling back Add Refund Group and Subcategory Migration...');
    
    try {
      // Restore from backup
      const transactionGroupsBackup = this.database.getTable(`transaction_groups${backupSuffix}`);
      const subcategoriesBackup = this.database.getTable(`subcategories${backupSuffix}`);

      if (transactionGroupsBackup) {
        this.database.tables = this.database.tables || {};
        this.database.tables['transaction_groups'] = transactionGroupsBackup;
        this.database.saveTableToWorkbook('transaction_groups');
        
        if (this.fileStorage) {
          const buffer = this.database.exportTableToBuffer('transaction_groups');
          await this.fileStorage.saveTable('transaction_groups', buffer);
          console.log('💾 Transaction groups backup saved to transaction_groups.xlsx');
        }
        
        console.log('✅ Transaction groups restored from backup');
      }

      if (subcategoriesBackup) {
        this.database.tables = this.database.tables || {};
        this.database.tables['subcategories'] = subcategoriesBackup;
        this.database.saveTableToWorkbook('subcategories');
        
        if (this.fileStorage) {
          const buffer = this.database.exportTableToBuffer('subcategories');
          await this.fileStorage.saveTable('subcategories', buffer);
          console.log('💾 Subcategories backup saved to subcategories.xlsx');
        }
        
        console.log('✅ Subcategories restored from backup');
      }

      // Remove migration record
      let migrations = this.database.getTable('migrations') || [];
      migrations = migrations.filter(m => !(m.name === this.migrationName && m.version === this.migrationVersion));
      this.database.tables = this.database.tables || {};
      this.database.tables['migrations'] = migrations;

      console.log('✅ Migration rollback completed');
      return { success: true };

    } catch (error) {
      console.error('❌ Rollback failed:', error);
      return { success: false, error: error.message };
    }
  }
}

export default AddRefundGroupAndSubcategoryMigration;