# Database Migration Guide

This document provides a comprehensive guide for database migration strategies, troubleshooting, and best practices for the Personal Accounting System.

## Table of Contents

1. [Migration Overview](#migration-overview)
2. [Migration Strategies](#migration-strategies)
3. [Database Schema Evolution](#database-schema-evolution)
4. [Automated Migration System](#automated-migration-system)
5. [Manual Migration Procedures](#manual-migration-procedures)
6. [Troubleshooting Common Issues](#troubleshooting-common-issues)
7. [Data Integrity Verification](#data-integrity-verification)
8. [Best Practices](#best-practices)

---

## Migration Overview

### What is Database Migration?

Database migration refers to the process of moving data between different database versions, schemas, or storage systems. In this application, migrations handle:

- **Schema updates**: Adding new tables, columns, or modifying existing structures
- **Data transformations**: Converting data formats or relationships
- **Storage migration**: Moving from localStorage to Excel-based file storage
- **Version compatibility**: Ensuring older databases work with newer app versions

### Types of Migrations

#### 1. **localStorage to Database Migration**
- **From**: Browser localStorage (JSON)
- **To**: Excel-based persistent storage
- **Purpose**: Data portability and cross-device synchronization

#### 2. **Schema Migrations**
- **From**: Older database schema versions
- **To**: Current schema with new tables/columns
- **Purpose**: Adding new features while preserving existing data

#### 3. **Data Format Migrations**
- **From**: Old data structures
- **To**: New standardized formats
- **Purpose**: Improving data consistency and functionality

---

## Migration Strategies

### Strategy 1: Automatic Migration on Load

```javascript
// Example: Automatic migration during database initialization
const loadExistingDatabase = async (folderPath) => {
  try {
    // Load existing database
    await fileStorage.setDatabasePath(folderPath);
    database.loadFromStorage(fileStorage.getAllTables());
    
    // Check if migration is needed
    const currentVersion = database.getDatabaseVersion();
    const requiredVersion = APP_DATABASE_VERSION;
    
    if (currentVersion < requiredVersion) {
      console.log(`Migrating database from v${currentVersion} to v${requiredVersion}`);
      await performMigration(currentVersion, requiredVersion);
    }
    
    updateStateFromDatabase();
  } catch (error) {
    console.error('Migration failed:', error);
  }
};
```

### Strategy 2: Progressive Migration

```javascript
// Example: Step-by-step migration for complex changes
const performProgressiveMigration = async (fromVersion, toVersion) => {
  const migrations = [
    { version: 2, migrate: migrateToV2 },
    { version: 3, migrate: migrateToV3 },
    { version: 4, migrate: migrateToV4 }
  ];
  
  let currentVersion = fromVersion;
  
  for (const migration of migrations) {
    if (currentVersion < migration.version && migration.version <= toVersion) {
      console.log(`Applying migration to v${migration.version}`);
      await migration.migrate();
      currentVersion = migration.version;
      database.setDatabaseVersion(currentVersion);
    }
  }
};
```

### Strategy 3: Backup-First Migration

```javascript
// Example: Always backup before migration
const safeMigration = async (migrationFunction) => {
  try {
    // Create backup
    const backupPath = await createDatabaseBackup();
    console.log('Backup created:', backupPath);
    
    // Perform migration
    await migrationFunction();
    
    // Verify integrity
    const isValid = await verifyDataIntegrity();
    if (!isValid) {
      throw new Error('Data integrity check failed');
    }
    
    console.log('Migration completed successfully');
  } catch (error) {
    console.error('Migration failed, restoring backup:', error);
    await restoreDatabaseBackup(backupPath);
    throw error;
  }
};
```

---

## Database Schema Evolution

### Version Tracking

```javascript
// Database version management
class DatabaseVersionManager {
  static VERSION_1_0 = 1;
  static VERSION_1_1 = 2; // Added notifications table
  static VERSION_1_2 = 3; // Added cash_allocations table
  static VERSION_1_3 = 4; // Added transaction_templates table
  
  static CURRENT_VERSION = 4;
  
  static getRequiredMigrations(fromVersion) {
    const migrations = [];
    
    if (fromVersion < 2) migrations.push(this.addNotificationsTable);
    if (fromVersion < 3) migrations.push(this.addCashAllocationsTable);
    if (fromVersion < 4) migrations.push(this.addTransactionTemplatesTable);
    
    return migrations;
  }
}
```

### Schema Migration Examples

#### Adding New Tables

```javascript
// Migration: Add notifications table
const addNotificationsTable = async (database) => {
  console.log('Adding notifications table...');
  
  // Define table schema
  const notificationsSchema = [
    'id', 'type', 'priority', 'title', 'message', 
    'data', 'isRead', 'createdAt', 'expiresAt'
  ];
  
  // Add to database
  database.tableSchemas.notifications = notificationsSchema;
  database.tables.notifications = [];
  
  // Save empty table to create file
  database.saveTableToWorkbook('notifications');
  
  console.log('Notifications table added successfully');
};
```

#### Modifying Existing Tables

```javascript
// Migration: Add new column to existing table
const addColumnToTransactions = async (database) => {
  console.log('Adding isPrepaid column to transactions...');
  
  const transactions = database.tables.transactions || [];
  
  // Add new column to existing records
  transactions.forEach(transaction => {
    if (transaction.isPrepaid === undefined) {
      transaction.isPrepaid = false;
    }
  });
  
  // Update schema
  if (!database.tableSchemas.transactions.includes('isPrepaid')) {
    database.tableSchemas.transactions.push('isPrepaid');
  }
  
  // Save updated table
  database.saveTableToWorkbook('transactions');
  
  console.log('isPrepaid column added successfully');
};
```

#### Data Format Migrations

```javascript
// Migration: Convert string dates to ISO format
const standardizeDateFormats = async (database) => {
  console.log('Standardizing date formats...');
  
  const tables = ['transactions', 'accounts', 'notifications'];
  
  for (const tableName of tables) {
    const records = database.tables[tableName] || [];
    
    records.forEach(record => {
      // Convert various date formats to ISO
      if (record.createdAt && !record.createdAt.includes('T')) {
        record.createdAt = new Date(record.createdAt).toISOString();
      }
      if (record.updatedAt && !record.updatedAt.includes('T')) {
        record.updatedAt = new Date(record.updatedAt).toISOString();
      }
    });
    
    database.saveTableToWorkbook(tableName);
  }
  
  console.log('Date formats standardized');
};
```

---

## Automated Migration System

### Migration Component Structure

```javascript
// src/components/DatabaseMigration.jsx
import React, { useState, useEffect } from 'react';
import { useAccounting } from '../contexts/AccountingContext';

const DatabaseMigration = ({ onMigrationComplete }) => {
  const { database, fileStorage } = useAccounting();
  const [migrationStatus, setMigrationStatus] = useState('checking');
  const [migrationSteps, setMigrationSteps] = useState([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [error, setError] = useState(null);

  useEffect(() => {
    checkMigrationNeeded();
  }, []);

  const checkMigrationNeeded = async () => {
    try {
      const currentVersion = database.getDatabaseVersion() || 1;
      const requiredVersion = DatabaseVersionManager.CURRENT_VERSION;
      
      if (currentVersion < requiredVersion) {
        const migrations = DatabaseVersionManager.getRequiredMigrations(currentVersion);
        setMigrationSteps(migrations.map(m => m.name));
        setMigrationStatus('needed');
      } else {
        setMigrationStatus('up-to-date');
        onMigrationComplete(true);
      }
    } catch (error) {
      setError('Failed to check migration status');
      setMigrationStatus('error');
    }
  };

  const performMigration = async () => {
    setMigrationStatus('migrating');
    setError(null);
    
    try {
      const currentVersion = database.getDatabaseVersion() || 1;
      const migrations = DatabaseVersionManager.getRequiredMigrations(currentVersion);
      
      for (let i = 0; i < migrations.length; i++) {
        setCurrentStep(i);
        await migrations[i](database);
        
        // Update version after each successful migration
        database.setDatabaseVersion(currentVersion + i + 1);
      }
      
      setMigrationStatus('completed');
      onMigrationComplete(true);
    } catch (error) {
      setError(`Migration failed: ${error.message}`);
      setMigrationStatus('error');
      onMigrationComplete(false);
    }
  };

  // Render migration UI based on status
  // ... (UI implementation)
};

export default DatabaseMigration;
```

### Integration with App Initialization

```javascript
// src/App.js - Integration with main app
import DatabaseMigration from './components/DatabaseMigration';

const App = () => {
  const [migrationNeeded, setMigrationNeeded] = useState(false);
  const [migrationComplete, setMigrationComplete] = useState(false);

  const handleMigrationComplete = (success) => {
    setMigrationComplete(success);
    if (success) {
      setMigrationNeeded(false);
    }
  };

  // Show migration component if needed
  if (migrationNeeded && !migrationComplete) {
    return (
      <div className="app-migration">
        <DatabaseMigration onMigrationComplete={handleMigrationComplete} />
      </div>
    );
  }

  // Show main app after migration
  return (
    <div className="app">
      {/* Main app components */}
    </div>
  );
};
```

---

## Manual Migration Procedures

### Procedure 1: localStorage to Database Migration

#### Prerequisites
- Browser with existing localStorage data
- Write access to desired database folder
- Backup of current localStorage (recommended)

#### Steps

1. **Backup Existing Data**
   ```javascript
   // In browser console
   const backup = {};
   for (let i = 0; i < localStorage.length; i++) {
     const key = localStorage.key(i);
     backup[key] = localStorage.getItem(key);
   }
   console.log('Backup:', JSON.stringify(backup));
   ```

2. **Create New Database**
   - Open application
   - Click "Create New Database"
   - Select desired folder location
   - Choose language and configuration

3. **Run Migration**
   - Migration should run automatically on first load
   - Check browser console for migration logs
   - Verify data appears in new database

4. **Verify Migration**
   - Check that all accounts, transactions, and settings are preserved
   - Test all functionality works correctly
   - Verify Excel files are created in database folder

5. **Clean Up**
   - Only clear localStorage after successful verification
   - Keep backup until confident migration is successful

### Procedure 2: Schema Upgrade Migration

#### Prerequisites
- Existing database with older schema
- Application updated to newer version
- Database backup (recommended)

#### Steps

1. **Create Backup**
   ```bash
   # Copy entire database folder
   cp -r /path/to/database /path/to/database_backup_$(date +%Y%m%d)
   ```

2. **Load Database**
   - Open application
   - Load existing database
   - Migration should trigger automatically

3. **Monitor Migration**
   - Watch console for migration progress
   - Note any errors or warnings
   - Wait for completion confirmation

4. **Verify Results**
   - Check all data is preserved
   - Test new features work correctly
   - Verify no functionality is broken

### Procedure 3: Cross-Device Migration

#### Prerequisites
- Source database on one device
- Target device with application installed
- File sharing method (cloud storage, USB, etc.)

#### Steps

1. **Export Database**
   - Use built-in export functionality
   - Or copy entire database folder

2. **Transfer Files**
   - Use cloud storage, USB drive, or network transfer
   - Ensure all .xlsx files are included

3. **Import Database**
   - On target device, use "Load Existing Database"
   - Select transferred database folder
   - Allow migration to complete if needed

4. **Verify Transfer**
   - Check all data is present
   - Test functionality on new device
   - Verify synchronization if using cloud storage

---

## Troubleshooting Common Issues

### Issue 1: Migration Fails to Start

**Symptoms:**
- App loads normally but migration doesn't trigger
- No migration logs in console
- Data appears to be missing

**Possible Causes:**
- Database version not properly detected
- Migration system not initialized
- Corrupted database files

**Solutions:**
```javascript
// Force migration check in console
if (window.database) {
  const version = window.database.getDatabaseVersion();
  console.log('Current database version:', version);
  
  // Manually trigger migration if needed
  // window.performMigration(version, DatabaseVersionManager.CURRENT_VERSION);
}
```

### Issue 2: Partial Migration Failure

**Symptoms:**
- Some data migrated, others missing
- Mixed old and new data formats
- Functionality partially working

**Possible Causes:**
- Migration interrupted
- Insufficient permissions
- Disk space issues

**Solutions:**
1. Restore from backup
2. Clear corrupted data
3. Re-run migration with more verbose logging
4. Check file permissions and disk space

### Issue 3: Performance Issues During Migration

**Symptoms:**
- Migration takes very long time
- Browser becomes unresponsive
- Memory usage spikes

**Possible Causes:**
- Large datasets
- Inefficient migration code
- Browser limitations

**Solutions:**
```javascript
// Batch processing for large datasets
const migrateLargeTable = async (tableName, batchSize = 1000) => {
  const records = database.tables[tableName] || [];
  
  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize);
    
    // Process batch
    batch.forEach(record => {
      // Apply migration to record
    });
    
    // Allow UI to update
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  database.saveTableToWorkbook(tableName);
};
```

### Issue 4: Data Loss During Migration

**Symptoms:**
- Some or all data missing after migration
- Empty database after migration
- Error messages about missing tables

**Immediate Actions:**
1. **Stop using the application immediately**
2. **Restore from backup if available**
3. **Check localStorage for original data**

**Recovery Steps:**
```javascript
// Check if localStorage backup exists
const checkLocalStorageBackup = () => {
  const keys = Object.keys(localStorage);
  const dataKeys = keys.filter(key => 
    key.includes('transactions') || 
    key.includes('accounts') || 
    key.includes('settings')
  );
  
  console.log('Available localStorage keys:', dataKeys);
  
  // Manually recover data
  dataKeys.forEach(key => {
    const data = localStorage.getItem(key);
    console.log(`${key}:`, JSON.parse(data));
  });
};
```

---

## Data Integrity Verification

### Automated Verification

```javascript
// Data integrity checker
const verifyDataIntegrity = async (database) => {
  const results = {
    tables: {},
    relationships: {},
    totals: {},
    errors: []
  };
  
  // Check table integrity
  const requiredTables = [
    'accounts', 'transactions', 'categories', 'subcategories',
    'currencies', 'notifications', 'transaction_templates'
  ];
  
  for (const tableName of requiredTables) {
    const table = database.tables[tableName];
    const schema = database.tableSchemas[tableName];
    
    results.tables[tableName] = {
      exists: !!table,
      recordCount: table ? table.length : 0,
      hasRequiredColumns: schema ? validateSchema(table, schema) : false
    };
    
    if (!table) {
      results.errors.push(`Missing table: ${tableName}`);
    }
  }
  
  // Check data relationships
  const transactions = database.tables.transactions || [];
  const accounts = database.tables.accounts || [];
  
  transactions.forEach(transaction => {
    const accountExists = accounts.find(acc => acc.id === transaction.accountId);
    if (!accountExists) {
      results.errors.push(`Transaction ${transaction.id} references non-existent account ${transaction.accountId}`);
    }
  });
  
  // Check totals and balances
  results.totals = {
    totalAccounts: accounts.length,
    totalTransactions: transactions.length,
    totalBalance: accounts.reduce((sum, acc) => sum + (parseFloat(acc.balance) || 0), 0)
  };
  
  return results;
};
```

### Manual Verification Checklist

#### ✅ **Data Completeness**
- [ ] All accounts present and accessible
- [ ] Transaction history complete
- [ ] Settings and preferences preserved
- [ ] Categories and subcategories intact
- [ ] Exchange rates and currency settings maintained

#### ✅ **Functionality Testing**
- [ ] Can create new transactions
- [ ] Can edit existing transactions
- [ ] Can create new accounts
- [ ] Can generate reports
- [ ] All navigation works correctly

#### ✅ **File System**
- [ ] All .xlsx files created in database folder
- [ ] Files have correct headers and data
- [ ] Files are not corrupted (can open in Excel)
- [ ] Database folder is in expected location

#### ✅ **Performance**
- [ ] App loads within reasonable time
- [ ] Navigation is responsive
- [ ] Large datasets load correctly
- [ ] No memory leaks or excessive resource usage

---

## Best Practices

### Pre-Migration

1. **Always Create Backups**
   - Export full database before any migration
   - Keep multiple backup versions
   - Store backups in secure, separate location

2. **Test on Sample Data**
   - Test migration process on copy of data
   - Verify all functionality works correctly
   - Document any issues found

3. **Check System Requirements**
   - Ensure sufficient disk space
   - Verify browser compatibility
   - Check file system permissions

### During Migration

1. **Monitor Progress**
   - Watch console logs for errors
   - Monitor system resource usage
   - Be prepared to stop if issues occur

2. **Don't Interrupt Process**
   - Allow migration to complete fully
   - Don't close browser or navigate away
   - Don't modify files during migration

3. **Document Issues**
   - Log any errors or warnings
   - Note steps taken if intervention needed
   - Keep record for troubleshooting

### Post-Migration

1. **Thorough Verification**
   - Test all major functionality
   - Verify data accuracy and completeness
   - Check performance and responsiveness

2. **Keep Backups Temporarily**
   - Don't delete old backups immediately
   - Keep for several weeks until confident
   - Only clean up after extended successful use

3. **Monitor for Issues**
   - Watch for unexpected behavior
   - Check data integrity periodically
   - Be prepared to rollback if needed

### Development Best Practices

1. **Version Migration Scripts**
   - Keep all migration code in version control
   - Test migration scripts thoroughly
   - Document migration logic clearly

2. **Backwards Compatibility**
   - Support reading older data formats
   - Graceful degradation for missing features
   - Clear upgrade path for users

3. **Progressive Enhancement**
   - Add features gradually
   - Each migration should be atomic
   - Provide clear success/failure feedback

---

## Conclusion

Database migration is a critical process that requires careful planning, thorough testing, and robust error handling. By following the guidelines and procedures outlined in this document, you can ensure smooth transitions between database versions while preserving data integrity and user experience.

Remember:
- **Always backup before migration**
- **Test thoroughly before deploying**
- **Monitor and verify after migration**
- **Keep rollback options available**

Successful migration enables the application to evolve while maintaining user trust and data security.