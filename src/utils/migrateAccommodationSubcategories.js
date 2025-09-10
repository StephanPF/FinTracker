/**
 * Database Migration Script: Consolidate Accommodation Subcategories
 * 
 * This script consolidates SUB_001 (Short-Term Rentals) and SUB_002 (Long-Term Rentals)
 * into a single SUB_001 (Accommodation Rentals) subcategory.
 * 
 * Migration Tasks:
 * 1. Update SUB_001 name and description to consolidated version
 * 2. Update all transactions using SUB_002 to use SUB_001 instead
 * 3. Remove SUB_002 from subcategories table
 * 4. Update both English and French versions
 */

class AccommodationSubcategoryMigration {
  constructor(database, fileStorage = null) {
    this.database = database;
    this.fileStorage = fileStorage;
    this.migrationName = 'consolidate_accommodation_subcategories';
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
      // If migrations table doesn't exist, migration hasn't been applied
      return false;
    }
  }

  /**
   * Record that migration has been applied
   */
  recordMigration() {
    try {
      let migrations = this.database.getTable('migrations') || [];
      
      // Initialize migrations table if it doesn't exist
      if (!Array.isArray(migrations)) {
        migrations = [];
      }

      const migrationRecord = {
        id: `MIG_${Date.now()}`,
        name: this.migrationName,
        version: this.migrationVersion,
        appliedAt: new Date().toISOString(),
        description: 'Consolidated SUB_001 and SUB_002 into single Accommodation Rentals subcategory'
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
   * Update subcategory definitions
   */
  async updateSubcategoryDefinitions() {
    try {
      const subcategories = this.database.getTable('subcategories') || [];
      let updated = false;

      for (const subcategory of subcategories) {
        if (subcategory.id === 'SUB_001') {
          // Update SUB_001 to consolidated version
          if (subcategory.name === 'Short-Term Rentals' || subcategory.name === 'Locations Courte Durée') {
            // English version
            if (subcategory.name === 'Short-Term Rentals') {
              subcategory.name = 'Accommodation Rentals';
              subcategory.description = 'Airbnb, VRBO, monthly leases, apartments, houses, and all accommodation rentals';
            }
            // French version
            else if (subcategory.name === 'Locations Courte Durée') {
              subcategory.name = 'Locations Hébergement';
              subcategory.description = 'Airbnb, VRBO, baux mensuels, appartements, maisons, et toutes locations d\'hébergement';
            }
            subcategory.lastModified = new Date().toISOString();
            updated = true;
            console.log(`✅ Updated ${subcategory.id}: ${subcategory.name}`);
          }
        }
      }

      if (updated) {
        this.database.saveTableToWorkbook('subcategories');
        
        // Also save to file storage
        if (this.fileStorage) {
          const buffer = this.database.exportTableToBuffer('subcategories');
          await this.fileStorage.saveTable('subcategories', buffer);
          console.log('💾 Subcategories saved to subcategories.xlsx');
        }
        
        console.log('✅ Subcategory definitions updated successfully');
      }

      return updated;
    } catch (error) {
      console.error('❌ Failed to update subcategory definitions:', error);
      return false;
    }
  }

  /**
   * Update all transactions using SUB_002 to use SUB_001
   */
  async updateTransactionSubcategories() {
    try {
      const transactions = this.database.getTable('transactions') || [];
      let updatedCount = 0;

      for (const transaction of transactions) {
        if (transaction.subcategoryId === 'SUB_002') {
          transaction.subcategoryId = 'SUB_001';
          transaction.lastModified = new Date().toISOString();
          updatedCount++;
        }
      }

      if (updatedCount > 0) {
        this.database.saveTableToWorkbook('transactions');
        
        // Also save to file storage
        if (this.fileStorage) {
          const buffer = this.database.exportTableToBuffer('transactions');
          await this.fileStorage.saveTable('transactions', buffer);
          console.log('💾 Transactions saved to transactions.xlsx');
        }
        
        console.log(`✅ Updated ${updatedCount} transactions to use SUB_001 instead of SUB_002`);
      } else {
        console.log('ℹ️  No transactions found using SUB_002');
      }

      return updatedCount;
    } catch (error) {
      console.error('❌ Failed to update transaction subcategories:', error);
      return 0;
    }
  }

  /**
   * Remove SUB_002 from subcategories table
   */
  async removeObsoleteSubcategory() {
    try {
      let subcategories = this.database.getTable('subcategories') || [];
      const originalLength = subcategories.length;

      // Filter out SUB_002
      subcategories = subcategories.filter(sub => sub.id !== 'SUB_002');

      if (subcategories.length < originalLength) {
        this.database.tables = this.database.tables || {};
        this.database.tables['subcategories'] = subcategories;
        this.database.saveTableToWorkbook('subcategories');
        
        // Also save to file storage
        if (this.fileStorage) {
          const buffer = this.database.exportTableToBuffer('subcategories');
          await this.fileStorage.saveTable('subcategories', buffer);
          console.log('💾 Subcategories saved to subcategories.xlsx');
        }
        
        console.log('✅ Removed SUB_002 from subcategories table');
        return true;
      } else {
        console.log('ℹ️  SUB_002 not found in subcategories table');
        return false;
      }
    } catch (error) {
      console.error('❌ Failed to remove SUB_002:', error);
      return false;
    }
  }

  /**
   * Validate migration results
   */
  validateMigration() {
    try {
      const subcategories = this.database.getTable('subcategories') || [];
      const transactions = this.database.getTable('transactions') || [];

      // Check that SUB_001 exists with correct name
      const sub001 = subcategories.find(s => s.id === 'SUB_001');
      const hasAccommodationRentals = sub001 && 
        (sub001.name === 'Accommodation Rentals' || sub001.name === 'Locations Hébergement');

      // Check that SUB_002 is removed
      const sub002Exists = subcategories.some(s => s.id === 'SUB_002');

      // Check that no transactions use SUB_002
      const transactionsUsingSub002 = transactions.filter(t => t.subcategoryId === 'SUB_002');

      const validation = {
        sub001Updated: hasAccommodationRentals,
        sub002Removed: !sub002Exists,
        noTransactionsUsingSub002: transactionsUsingSub002.length === 0,
        transactionsUsingSub002Count: transactionsUsingSub002.length
      };

      console.log('🔍 Migration Validation Results:');
      console.log(`   SUB_001 updated: ${validation.sub001Updated ? '✅' : '❌'}`);
      console.log(`   SUB_002 removed: ${validation.sub002Removed ? '✅' : '❌'}`);
      console.log(`   No transactions using SUB_002: ${validation.noTransactionsUsingSub002 ? '✅' : '❌'}`);
      
      if (!validation.noTransactionsUsingSub002) {
        console.log(`   ⚠️  ${validation.transactionsUsingSub002Count} transactions still using SUB_002`);
      }

      return validation.sub001Updated && validation.sub002Removed && validation.noTransactionsUsingSub002;
    } catch (error) {
      console.error('❌ Failed to validate migration:', error);
      return false;
    }
  }

  /**
   * Create backup of affected tables before migration
   */
  createBackup() {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupSuffix = `_backup_${timestamp}`;

      // Backup subcategories
      const subcategories = this.database.getTable('subcategories') || [];
      // Store backup in database workbook
      this.database.tables = this.database.tables || {};
      this.database.tables[`subcategories${backupSuffix}`] = [...subcategories];

      // Backup transactions  
      const transactions = this.database.getTable('transactions') || [];
      this.database.tables[`transactions${backupSuffix}`] = [...transactions];

      console.log(`✅ Backup created with suffix: ${backupSuffix}`);
      return backupSuffix;
    } catch (error) {
      console.error('❌ Failed to create backup:', error);
      console.error('Error details:', error);
      return null;
    }
  }

  /**
   * Run the complete migration
   */
  async runMigration() {
    console.log('🚀 Starting Accommodation Subcategory Consolidation Migration...');
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

      // Step 2: Update subcategory definitions
      console.log('📝 Step 2: Updating subcategory definitions...');
      const subcategoriesUpdated = await this.updateSubcategoryDefinitions();

      // Step 3: Update transaction subcategories
      console.log('🔄 Step 3: Updating transaction subcategories...');
      const transactionsUpdated = await this.updateTransactionSubcategories();

      // Step 4: Remove obsolete subcategory
      console.log('🗑️  Step 4: Removing SUB_002...');
      const subcategoryRemoved = await this.removeObsoleteSubcategory();

      // Step 5: Validate migration
      console.log('✅ Step 5: Validating migration...');
      const isValid = this.validateMigration();

      if (!isValid) {
        throw new Error('Migration validation failed');
      }

      // Step 6: Record migration
      console.log('📋 Step 6: Recording migration...');
      this.recordMigration();

      console.log('==========================================');
      console.log('🎉 Migration completed successfully!');
      console.log(`   Subcategories updated: ${subcategoriesUpdated ? 'Yes' : 'No'}`);
      console.log(`   Transactions updated: ${transactionsUpdated}`);
      console.log(`   SUB_002 removed: ${subcategoryRemoved ? 'Yes' : 'No'}`);
      console.log(`   Backup created: ${backupSuffix}`);

      return {
        success: true,
        subcategoriesUpdated,
        transactionsUpdated,
        subcategoryRemoved,
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
   * Rollback migration (restore SUB_002 from backup)
   */
  async rollbackMigration(backupSuffix) {
    console.log('🔄 Rolling back Accommodation Subcategory Migration...');
    
    try {
      // Restore from backup
      const subcategoriesBackup = this.database.getTable(`subcategories${backupSuffix}`);
      const transactionsBackup = this.database.getTable(`transactions${backupSuffix}`);

      if (subcategoriesBackup) {
        this.database.tables = this.database.tables || {};
        this.database.tables['subcategories'] = subcategoriesBackup;
        this.database.saveTableToWorkbook('subcategories');
        
        // Also save to file storage
        if (this.fileStorage) {
          const buffer = this.database.exportTableToBuffer('subcategories');
          await this.fileStorage.saveTable('subcategories', buffer);
          console.log('💾 Subcategories backup saved to subcategories.xlsx');
        }
        
        console.log('✅ Subcategories restored from backup');
      }

      if (transactionsBackup) {
        this.database.tables = this.database.tables || {};
        this.database.tables['transactions'] = transactionsBackup;
        this.database.saveTableToWorkbook('transactions');
        
        // Also save to file storage
        if (this.fileStorage) {
          const buffer = this.database.exportTableToBuffer('transactions');
          await this.fileStorage.saveTable('transactions', buffer);
          console.log('💾 Transactions backup saved to transactions.xlsx');
        }
        
        console.log('✅ Transactions restored from backup');
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

export default AccommodationSubcategoryMigration;