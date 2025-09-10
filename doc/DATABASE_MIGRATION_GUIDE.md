# Database Migration Guide

This guide explains how to create database migration scripts for the accounting system that properly persist changes to database files, not just localStorage/memory.

## Table of Contents
1. [Migration Architecture](#migration-architecture)
2. [Creating a Migration Class](#creating-a-migration-class)
3. [Critical File Persistence](#critical-file-persistence)
4. [Registering Migrations](#registering-migrations)
5. [Best Practices](#best-practices)
6. [Common Pitfalls](#common-pitfalls)
7. [Testing Migrations](#testing-migrations)

## Migration Architecture

The system uses a two-layer storage architecture:
- **Memory/localStorage**: Fast access for UI operations
- **File Storage**: Persistent `.xlsx` files for data durability

### The Critical Issue
**⚠️ IMPORTANT**: Simply using `database.saveTableToWorkbook()` only saves to memory/workbook. Changes will appear in the UI but **will not persist** to actual database files.

## Creating a Migration Class

### Basic Migration Template

```javascript
class YourMigrationName {
  constructor(database, fileStorage = null) {
    this.database = database;
    this.fileStorage = fileStorage;  // Critical for file persistence
    this.migrationId = 'your_migration_id';
    this.migrationName = 'Your Migration Name';
    this.description = 'Description of what this migration does';
  }

  async canRun() {
    try {
      // Check prerequisites
      const prerequisiteExists = this.database.tables.some_table?.find(item => item.id === 'REQUIRED_ID');
      if (!prerequisiteExists) {
        return { 
          canRun: false, 
          reason: 'Required prerequisite not found' 
        };
      }

      // Check if already applied
      const alreadyExists = this.database.tables.target_table?.find(item => item.id === 'NEW_ID');
      if (alreadyExists) {
        return { 
          canRun: false, 
          reason: 'Migration already applied' 
        };
      }

      return { canRun: true };
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
      
      // Backup affected tables
      const tableData = this.database.tables.target_table || [];
      this.database.tables = this.database.tables || {};
      this.database.tables[`target_table${backupSuffix}`] = [...tableData];
      
      // Save backup to workbook
      this.database.saveTableToWorkbook(`target_table${backupSuffix}`);
      
      console.log(`✅ Backup created: target_table${backupSuffix}`);
      return { success: true, backupSuffix };
    } catch (error) {
      console.error('❌ Failed to create backup:', error);
      throw new Error(`Failed to create backup: ${error.message}`);
    }
  }

  async runMigration() {
    try {
      console.log('🚀 Starting migration...');
      
      // Create backup
      const backup = this.createBackup();
      
      // Perform migration logic
      await this.performMigrationSteps();
      
      return {
        success: true,
        details: {
          backupSuffix: backup.backupSuffix,
          // Include relevant migration details
        }
      };
      
    } catch (error) {
      console.error('❌ Migration failed:', error);
      throw new Error(`Migration failed: ${error.message}`);
    }
  }

  async performMigrationSteps() {
    // Your migration logic here
    
    // CRITICAL: Always save to both workbook AND file storage
    await this.saveTableChanges('table_name');
  }

  async rollbackMigration(backupSuffix) {
    try {
      console.log('🔄 Rolling back migration...');
      
      if (!backupSuffix) {
        throw new Error('No backup suffix provided for rollback');
      }
      
      const backupTableName = `target_table_backup_${backupSuffix}`;
      const backupTable = this.database.tables[backupTableName];
      
      if (!backupTable) {
        throw new Error(`Backup table ${backupTableName} not found`);
      }
      
      // Restore from backup
      this.database.tables.target_table = [...backupTable];
      
      // CRITICAL: Save restored data to files
      await this.saveTableChanges('target_table');
      
      // Clean up backup table
      delete this.database.tables[backupTableName];
      
      console.log('✅ Rollback completed successfully');
      return { success: true };
      
    } catch (error) {
      console.error('❌ Rollback failed:', error);
      throw new Error(`Rollback failed: ${error.message}`);
    }
  }

  // CRITICAL METHOD: Ensures file persistence
  async saveTableChanges(tableName) {
    // Save to workbook (memory)
    this.database.saveTableToWorkbook(tableName);
    
    // CRITICAL: Export and save to actual file storage
    if (this.fileStorage) {
      const buffer = this.database.exportTableToBuffer(tableName);
      await this.fileStorage.saveTable(tableName, buffer);
      console.log(`💾 ${tableName} saved to ${tableName}.xlsx`);
    } else {
      console.warn(`⚠️ File storage not available - changes to ${tableName} only in memory`);
    }
  }

  getValidationQueries() {
    return [
      {
        name: 'Check migration applied correctly',
        query: () => {
          const result = this.database.tables.target_table?.find(item => item.id === 'EXPECTED_ID');
          return {
            success: !!result,
            result: result || 'Not found',
            expected: 'Expected data structure'
          };
        }
      }
    ];
  }
}

export default YourMigrationName;
```

## Critical File Persistence

### The Problem
```javascript
// ❌ WRONG - Only saves to memory/workbook
this.database.saveTableToWorkbook('subcategories');
```

### The Solution
```javascript
// ✅ CORRECT - Saves to both workbook AND files
this.database.saveTableToWorkbook('subcategories');

// Export buffer and save to file storage
const buffer = this.database.exportTableToBuffer('subcategories');
if (this.fileStorage) {
  await this.fileStorage.saveTable('subcategories', buffer);
  console.log('💾 subcategories saved to subcategories.xlsx');
} else {
  console.warn('⚠️ File storage not available - changes only in memory');
}
```

### Helper Method Pattern
Create a reusable method in your migration class:

```javascript
async saveTableChanges(tableName) {
  // Save to workbook (memory)
  this.database.saveTableToWorkbook(tableName);
  
  // Save to file storage (persistent)
  if (this.fileStorage) {
    const buffer = this.database.exportTableToBuffer(tableName);
    await this.fileStorage.saveTable(tableName, buffer);
    console.log(`💾 ${tableName} saved to ${tableName}.xlsx`);
  } else {
    console.warn(`⚠️ File storage not available - changes to ${tableName} only in memory`);
  }
}
```

## Registering Migrations

### 1. Import Your Migration
```javascript
// DatabaseMigrations.jsx
import YourMigrationName from '../utils/yourMigrationName.js';
```

### 2. Add to Available Migrations
```javascript
const availableMigrations = [
  {
    id: 'your_migration_id',
    name: 'Your Migration Display Name',
    description: 'Clear description of what this migration does and what data it affects',
    version: '1.0.0',
    migrationClass: YourMigrationName,
    riskLevel: 'low', // 'low', 'medium', 'high'
    affectedTables: ['table1', 'table2']
  }
];
```

### 3. ⚠️ CRITICAL: Update NOMADIC Database Configuration

**If your migration adds new data structures (subcategories, transaction groups, etc.), you MUST also update the NOMADIC_DATABASE_CONFIGURATION** so that new databases created in the future will include your changes by default.

#### For New Subcategories:
```javascript
// In relationalDatabase.js - generateNomadicEnglishSubcategories()
{ 
  id: 'SUB_XXX', 
  name: 'Your New Subcategory', 
  description: 'Description here',
  groupId: 'GRP_XXX', 
  isActive: true, 
  isCashWithdrawal: false, // or true if applicable
  createdAt: new Date().toISOString() 
},

// And in generateNomadicFrenchSubcategories()
{ 
  id: 'SUB_XXX', 
  name: 'Votre Nouvelle Sous-catégorie', 
  description: 'Description en français',
  groupId: 'GRP_XXX', 
  isActive: true, 
  isCashWithdrawal: false, // or true if applicable
  createdAt: new Date().toISOString() 
},
```

#### For New Transaction Groups:
```javascript
// In relationalDatabase.js - generateNomadicEnglishTransactionGroups()
{
  id: 'GRP_XXX',
  name: 'Your New Group',
  description: 'Group description',
  color: '#colorcode',
  isActive: true,
  transactionTypeId: 'CAT_XXX', // Income, Expense, etc.
  createdAt: new Date().toISOString()
}

// And in generateNomadicFrenchTransactionGroups()
{
  id: 'GRP_XXX',
  name: 'Votre Nouveau Groupe',
  description: 'Description du groupe en français',
  color: '#colorcode',
  isActive: true,
  transactionTypeId: 'CAT_XXX', // Income, Expense, etc.
  createdAt: new Date().toISOString()
}
```

#### Why This Is Critical:
- **Migrations** fix existing databases
- **NOMADIC configuration** ensures new databases include the changes
- **Without both**: New users won't get your improvements
- **Documentation**: Also update `doc/NOMADIC_DATABASE_CONFIGURATION.md` if it exists

#### Example Workflow:
1. Create migration to add SUB_068 "Cash Withdrawal" to existing databases
2. Update `generateNomadicEnglishSubcategories()` to include SUB_068
3. Update `generateNomadicFrenchSubcategories()` to include SUB_068
4. New NOMADIC databases automatically get SUB_068
5. Existing databases can run migration to get SUB_068

This ensures consistency between new and migrated databases.

## Best Practices

### 1. Constructor Pattern
```javascript
constructor(database, fileStorage = null) {
  this.database = database;
  this.fileStorage = fileStorage;  // Always accept fileStorage
  // ... other properties
}
```

### 2. Prerequisite Checking
```javascript
async canRun() {
  try {
    // Check required data exists
    const required = this.database.tables.some_table?.find(item => item.id === 'REQUIRED');
    if (!required) {
      return { canRun: false, reason: 'Required data not found' };
    }

    // Check if already applied
    const existing = this.database.tables.target_table?.find(item => item.id === 'NEW_ITEM');
    if (existing) {
      return { canRun: false, reason: 'Migration already applied' };
    }

    return { canRun: true };
  } catch (error) {
    return { canRun: false, reason: error.message };
  }
}
```

### 3. Always Create Backups
```javascript
createBackup() {
  const backupSuffix = `_backup_${Date.now()}`;
  
  // Backup all affected tables
  const tablesToBackup = ['table1', 'table2'];
  
  tablesToBackup.forEach(tableName => {
    const tableData = this.database.tables[tableName] || [];
    this.database.tables[`${tableName}${backupSuffix}`] = [...tableData];
    this.database.saveTableToWorkbook(`${tableName}${backupSuffix}`);
  });
  
  return { success: true, backupSuffix };
}
```

### 4. Language Detection
```javascript
getLanguage() {
  const dbInfo = this.database.tables.database_info || [];
  const languageInfo = dbInfo.find(info => info.key === 'language');
  return languageInfo ? languageInfo.value : 'en';
}
```

### 5. Error Handling
```javascript
async runMigration() {
  try {
    console.log('🚀 Starting migration...');
    const backup = this.createBackup();
    
    // Migration steps...
    
    return { success: true, details: { backupSuffix: backup.backupSuffix } };
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw new Error(`Migration failed: ${error.message}`);
  }
}
```

## Common Pitfalls

### 1. ❌ Forgetting File Storage
```javascript
// This only saves to memory!
this.database.tables.subcategories.push(newItem);
this.database.saveTableToWorkbook('subcategories');
// Changes will disappear after page refresh
```

### 2. ❌ Not Making Methods Async
```javascript
// If you use await, method must be async
updateData() {  // ❌ Missing async
  await this.saveTableChanges('table');
}

async updateData() {  // ✅ Correct
  await this.saveTableChanges('table');
}
```

### 3. ❌ Not Updating Method Calls
```javascript
async runMigration() {
  // ❌ Missing await for async methods
  const result = this.updateData();
  
  // ✅ Correct
  const result = await this.updateData();
}
```

### 4. ❌ Missing Constructor Parameters
```javascript
// DatabaseMigrations.jsx - ❌ Wrong
const migration = new YourMigration(database);  // Missing fileStorage

// ✅ Correct
const migration = new YourMigration(database, fileStorage);
```

## Testing Migrations

### 1. Test Prerequisites
- Verify `canRun()` returns correct results
- Test with missing prerequisites
- Test with already-applied migration

### 2. Test Persistence
```javascript
// After running migration, check:
console.log('Memory:', this.database.tables.your_table);

// Refresh page and check again - data should still exist
```

### 3. Test Rollback
- Run migration
- Run rollback
- Verify data is restored to original state
- Check both memory and file persistence

### 4. Test Multiple Scenarios
- Empty database
- Database with existing data
- Database with partial data
- Different language configurations

## Example Migration Walkthrough

Let's walk through creating a migration that adds a new subcategory:

### 1. Create the Migration File
```javascript
// utils/addNewSubcategory.js
class AddNewSubcategoryMigration {
  constructor(database, fileStorage = null) {
    this.database = database;
    this.fileStorage = fileStorage;
    this.migrationId = 'add_new_subcategory';
    this.migrationName = 'Add New Subcategory';
    this.description = 'Adds "Office Supplies" subcategory (SUB_999) to GRP_001 (Essential Expenses)';
  }

  async canRun() {
    // Check if parent group exists
    const parentGroup = this.database.tables.transaction_groups?.find(g => g.id === 'GRP_001');
    if (!parentGroup) {
      return { canRun: false, reason: 'Parent group GRP_001 not found' };
    }

    // Check if subcategory already exists
    const existing = this.database.tables.subcategories?.find(s => s.id === 'SUB_999');
    if (existing) {
      return { canRun: false, reason: 'Subcategory SUB_999 already exists' };
    }

    return { canRun: true };
  }

  createBackup() {
    const backupSuffix = `_backup_${Date.now()}`;
    const subcategories = this.database.tables.subcategories || [];
    this.database.tables[`subcategories${backupSuffix}`] = [...subcategories];
    this.database.saveTableToWorkbook(`subcategories${backupSuffix}`);
    return { success: true, backupSuffix };
  }

  async runMigration() {
    try {
      const backup = this.createBackup();
      
      const newSubcategory = {
        id: 'SUB_999',
        name: 'Office Supplies',
        description: 'Pens, paper, office equipment and supplies',
        groupId: 'GRP_001',
        isActive: true,
        createdAt: new Date().toISOString()
      };

      this.database.tables.subcategories = this.database.tables.subcategories || [];
      this.database.tables.subcategories.push(newSubcategory);
      
      // CRITICAL: Save to both workbook AND file
      await this.saveTableChanges('subcategories');
      
      return {
        success: true,
        details: {
          subcategoryId: 'SUB_999',
          backupSuffix: backup.backupSuffix
        }
      };
    } catch (error) {
      throw new Error(`Migration failed: ${error.message}`);
    }
  }

  async rollbackMigration(backupSuffix) {
    const backupTable = this.database.tables[`subcategories_backup_${backupSuffix}`];
    if (!backupTable) {
      throw new Error('Backup not found');
    }
    
    this.database.tables.subcategories = [...backupTable];
    await this.saveTableChanges('subcategories');
    
    delete this.database.tables[`subcategories_backup_${backupSuffix}`];
    return { success: true };
  }

  async saveTableChanges(tableName) {
    this.database.saveTableToWorkbook(tableName);
    
    if (this.fileStorage) {
      const buffer = this.database.exportTableToBuffer(tableName);
      await this.fileStorage.saveTable(tableName, buffer);
      console.log(`💾 ${tableName} saved to ${tableName}.xlsx`);
    }
  }
}

export default AddNewSubcategoryMigration;
```

### 2. Register the Migration
```javascript
// DatabaseMigrations.jsx
import AddNewSubcategoryMigration from '../utils/addNewSubcategory.js';

const availableMigrations = [
  // ... other migrations
  {
    id: 'add_new_subcategory',
    name: 'Add Office Supplies Subcategory',
    description: 'Adds "Office Supplies" subcategory (SUB_999) to Essential Expenses group',
    version: '1.0.0',
    migrationClass: AddNewSubcategoryMigration,
    riskLevel: 'low',
    affectedTables: ['subcategories']
  }
];
```

### 3. Test the Migration
1. Check the migration appears in the UI
2. Verify `canRun()` logic works correctly
3. Run the migration and check console output
4. Refresh the page - verify SUB_999 still exists
5. Test rollback functionality

## Key Takeaways

1. **Always accept `fileStorage` in constructor**
2. **Always save to both workbook AND file storage**
3. **Make methods async when using await**
4. **Create comprehensive backups**
5. **Test persistence by refreshing the page**
6. **Include detailed logging and error handling**
7. **Validate prerequisites before running**
8. **Provide meaningful error messages**
9. **Update NOMADIC_DATABASE_CONFIGURATION for new databases**

## Debugging Migrations

### Common Issues and Solutions

1. **Migration runs but changes disappear**
   - Check if you're calling `fileStorage.saveTable()`
   - Verify `fileStorage` is passed to constructor

2. **"Migration cannot be run" error**
   - Check `canRun()` logic and prerequisites
   - Verify required data exists in database

3. **Async/await errors**
   - Ensure methods using `await` are marked `async`
   - Update method calls to use `await`

4. **Rollback fails**
   - Check backup creation logic
   - Verify backup table names match rollback expectations

Remember: The goal is to create reliable, persistent database migrations that maintain data integrity across browser sessions and application restarts.