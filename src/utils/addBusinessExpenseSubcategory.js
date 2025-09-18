/**
 * Database Migration Script: Add Business Expense Subcategory
 *
 * This script adds:
 * 1. SUB_070 "Business Expense" subcategory linked to GRP_009 (Financial & Administrative)
 *
 * Migration Tasks:
 * 1. Add SUB_070 subcategory to both English and French configurations
 * 2. Ensure proper file persistence (not just localStorage)
 * 3. Support both existing and new databases
 * 4. Validate that parent transaction group GRP_009 exists
 */

class AddBusinessExpenseSubcategoryMigration {
  constructor(database, fileStorage = null) {
    this.database = database;
    this.fileStorage = fileStorage;
    this.migrationName = 'add_business_expense_subcategory';
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
        description: 'Added SUB_070 Business Expense subcategory to GRP_009 Financial & Administrative'
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
      // Check if GRP_009 (Financial & Administrative) exists
      const targetGroup = this.database.tables.transaction_groups?.find(group => group.id === 'GRP_009');
      if (!targetGroup) {
        return {
          canRun: false,
          reason: 'Transaction group GRP_009 (Financial & Administrative) not found. This migration requires this group to exist.'
        };
      }

      // Check if SUB_070 already exists
      const existingSubcategory = this.database.tables.subcategories?.find(sub => sub.id === 'SUB_070');
      if (existingSubcategory) {
        return {
          canRun: false,
          reason: 'Subcategory SUB_070 already exists. Migration has likely been applied.'
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

      // Backup subcategories
      const subcategories = this.database.getTable('subcategories') || [];
      this.database.tables = this.database.tables || {};
      this.database.tables[`subcategories${backupSuffix}`] = [...subcategories];

      console.log(`✅ Backup created with suffix: ${backupSuffix}`);
      return backupSuffix;
    } catch (error) {
      console.error('❌ Failed to create backup:', error);
      throw new Error(`Failed to create backup: ${error.message}`);
    }
  }

  /**
   * Add SUB_070 Business Expense subcategory
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
        id: 'SUB_070',
        name: 'Dépenses d\'Affaires',
        description: 'Dépenses professionnelles et commerciales',
        groupId: 'GRP_009',
        isActive: true,
        createdAt: new Date().toISOString()
      } : {
        id: 'SUB_070',
        name: 'Business Expense',
        description: 'Professional and business-related expenses',
        groupId: 'GRP_009',
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

      console.log(`✅ Added SUB_070 Business Expense subcategory with language: ${language}`);
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
      const subcategories = this.database.getTable('subcategories') || [];

      // Check that SUB_070 exists with correct properties
      const sub070 = subcategories.find(s => s.id === 'SUB_070');
      const hasBusinessExpenseSubcategory = sub070 &&
        (sub070.name === 'Business Expense' || sub070.name === 'Dépenses d\'Affaires') &&
        sub070.groupId === 'GRP_009';

      const validation = {
        sub070Added: hasBusinessExpenseSubcategory,
        sub070Data: sub070
      };

      console.log('🔍 Migration Validation Results:');
      console.log(`   SUB_070 added: ${validation.sub070Added ? '✅' : '❌'}`);

      return validation.sub070Added;
    } catch (error) {
      console.error('❌ Failed to validate migration:', error);
      return false;
    }
  }

  /**
   * Run the complete migration
   */
  async runMigration() {
    console.log('🚀 Starting Add Business Expense Subcategory Migration...');
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

      // Step 2: Add subcategory
      console.log('📝 Step 2: Adding SUB_070 Business Expense subcategory...');
      const subcategoryResult = await this.addSubcategory();
      if (!subcategoryResult.success) {
        throw new Error(`Failed to add subcategory: ${subcategoryResult.error}`);
      }

      // Step 3: Validate migration
      console.log('✅ Step 3: Validating migration...');
      const isValid = this.validateMigration();
      if (!isValid) {
        throw new Error('Migration validation failed');
      }

      // Step 4: Record migration
      console.log('📋 Step 4: Recording migration...');
      this.recordMigration();

      console.log('==========================================');
      console.log('🎉 Migration completed successfully!');
      console.log(`   Subcategory added: SUB_070 ${subcategoryResult.subcategoryData.name}`);
      console.log(`   Parent group: GRP_009 (Financial & Administrative)`);
      console.log(`   Language: ${subcategoryResult.language}`);
      console.log(`   Backup created: ${backupSuffix}`);

      return {
        success: true,
        subcategoryAdded: subcategoryResult.subcategoryData,
        language: subcategoryResult.language,
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
    console.log('🔄 Rolling back Add Business Expense Subcategory Migration...');

    try {
      // Restore from backup
      const subcategoriesBackup = this.database.getTable(`subcategories${backupSuffix}`);

      if (subcategoriesBackup) {
        this.database.tables = this.database.tables || {};
        this.database.tables['subcategories'] = subcategoriesBackup;
        this.database.saveTableToWorkbook('subcategories');

        if (this.fileStorage) {
          const buffer = this.database.exportTableToBuffer('subcategories');
          await this.fileStorage.saveTable('subcategories', buffer);
          console.log('💾 Subcategories backup restored to subcategories.xlsx');
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

export default AddBusinessExpenseSubcategoryMigration;