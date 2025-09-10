/**
 * Run Accommodation Subcategory Migration
 * 
 * This script executes the accommodation subcategory consolidation migration.
 * Run this from the browser console or as a standalone script.
 */

import AccommodationSubcategoryMigration from './migrateAccommodationSubcategories.js';

/**
 * Execute the migration
 * @param {Object} database - The database instance from AccountingContext
 */
async function runAccommodationMigration(database) {
  if (!database) {
    console.error('❌ Database instance required');
    console.log('Usage in browser console:');
    console.log('1. Open the accounting app');
    console.log('2. In console: window.runAccommodationMigration(database)');
    console.log('   where database is from useAccounting context');
    return;
  }

  const migration = new AccommodationSubcategoryMigration(database);
  const result = await migration.runMigration();
  
  if (result.success) {
    if (result.alreadyApplied) {
      console.log('✅ Migration was already applied previously');
    } else {
      console.log('✅ Migration completed successfully!');
      console.log('');
      console.log('Summary:');
      console.log(`  - SUB_001 consolidated: ${result.subcategoriesUpdated ? 'Yes' : 'Already done'}`);
      console.log(`  - Transactions updated: ${result.transactionsUpdated} records`);
      console.log(`  - SUB_002 removed: ${result.subcategoryRemoved ? 'Yes' : 'Already done'}`);
      console.log(`  - Backup created: ${result.backupSuffix}`);
      console.log('');
      console.log('🔄 Please refresh the page to see the changes');
    }
  } else {
    console.error('❌ Migration failed:', result.error);
    if (result.backupSuffix) {
      console.log('');
      console.log('To rollback:');
      console.log(`migration.rollbackMigration('${result.backupSuffix}')`);
    }
  }
  
  return result;
}

/**
 * Rollback the migration
 * @param {Object} database - The database instance
 * @param {string} backupSuffix - The backup suffix from migration result
 */
async function rollbackAccommodationMigration(database, backupSuffix) {
  if (!database || !backupSuffix) {
    console.error('❌ Database instance and backup suffix required');
    return;
  }

  const migration = new AccommodationSubcategoryMigration(database);
  const result = await migration.rollbackMigration(backupSuffix);
  
  if (result.success) {
    console.log('✅ Migration rollback completed successfully!');
    console.log('🔄 Please refresh the page to see the reverted changes');
  } else {
    console.error('❌ Rollback failed:', result.error);
  }
  
  return result;
}

// Make functions available globally for browser console use
if (typeof window !== 'undefined') {
  window.runAccommodationMigration = runAccommodationMigration;
  window.rollbackAccommodationMigration = rollbackAccommodationMigration;
}

export { runAccommodationMigration, rollbackAccommodationMigration };