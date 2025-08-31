# Migrating from localStorage to Persistent Database Storage

## Overview

This document outlines the complete process of migrating data from browser localStorage to persistent database storage using Excel files. This migration ensures data portability, backup capabilities, and cross-device synchronization.

## Table of Contents

1. [Understanding the Architecture](#understanding-the-architecture)
2. [Step-by-Step Migration Process](#step-by-step-migration-process)
3. [Common Pitfalls and Issues](#common-pitfalls-and-issues)
4. [Testing and Verification](#testing-and-verification)
5. [Best Practices](#best-practices)

---

## Understanding the Architecture

### Before Migration: localStorage
- **Storage Location**: Browser's local storage
- **Persistence**: Per-browser, per-device only
- **Format**: JSON strings
- **Backup**: Manual export/import only
- **Portability**: None (device/browser locked)

### After Migration: Database Files
- **Storage Location**: User-selected folder with Excel files
- **Persistence**: Cross-device, cross-browser
- **Format**: Excel (.xlsx) files with structured data
- **Backup**: Automatic inclusion in database exports
- **Portability**: Full portability via file system

### Key Components
1. **RelationalDatabase.js** - Core database logic and CRUD operations
2. **RelationalFileStorage.js** - File system operations and Excel file management
3. **AccountingContext.jsx** - React context providing database interface
4. **Table Schemas** - Defined structure for each data table

---

## Step-by-Step Migration Process

### Step 1: Add Table to Database Schema

**Location**: `src/utils/relationalDatabase.js`

#### 1.1 Add Table to Tables Object
```javascript
this.tables = {
  accounts: [],
  transactions: [],
  // ... existing tables ...
  your_new_table: []  // ← Add your table here
};
```

#### 1.2 Define Table Schema
```javascript
this.tableSchemas = {
  accounts: ['id', 'name', 'type', 'balance', /* ... */],
  // ... existing schemas ...
  your_new_table: ['id', 'field1', 'field2', 'isActive', 'createdAt', 'updatedAt']
};
```

#### 1.3 Add to Required Tables List
```javascript
ensureAllTablesExist() {
  const requiredTables = [
    'accounts', 'transactions', 'tags', 'todos',
    // ... existing tables ...
    'your_new_table'  // ← Add here for backwards compatibility
  ];
}
```

#### 1.4 Initialize in New Database Creation
```javascript
createNewDatabase(language = 'en') {
  this.tables = {
    accounts: defaultData.accounts,
    transactions: [],
    // ... existing tables ...
    your_new_table: [],  // ← Add here for new databases
  };
}
```

### Step 2: Implement CRUD Methods

**Location**: `src/utils/relationalDatabase.js`

Add comprehensive CRUD methods for your table:

```javascript
// Add Record
addYourRecord(recordData) {
  if (!this.tables.your_new_table) {
    this.tables.your_new_table = [];
  }
  
  const id = recordData.id || Date.now().toString();
  const newRecord = {
    id,
    field1: recordData.field1,
    field2: recordData.field2,
    // Handle JSON fields if needed
    complexData: JSON.stringify(recordData.complexData || {}),
    isActive: recordData.isActive !== undefined ? recordData.isActive : true,
    createdAt: recordData.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  this.tables.your_new_table.push(newRecord);
  this.saveTableToWorkbook('your_new_table');  // ← CRITICAL: Save to workbook
  
  // Return with parsed JSON if applicable
  return {
    ...newRecord,
    complexData: JSON.parse(newRecord.complexData)
  };
}

// Get Records
getYourRecords() {
  const records = this.tables.your_new_table || [];
  return records.map(record => ({
    ...record,
    // Parse JSON fields back to objects
    complexData: typeof record.complexData === 'string' 
      ? JSON.parse(record.complexData) 
      : record.complexData
  }));
}

// Get Active Records
getActiveYourRecords() {
  return this.getYourRecords().filter(record => record.isActive !== false);
}

// Update Record
updateYourRecord(id, recordData) {
  const recordIndex = this.tables.your_new_table.findIndex(record => record.id === id);
  if (recordIndex === -1) {
    throw new Error(`Record with id ${id} not found`);
  }
  
  const updatedRecord = {
    ...this.tables.your_new_table[recordIndex],
    field1: recordData.field1,
    field2: recordData.field2,
    complexData: JSON.stringify(recordData.complexData || {}),
    isActive: recordData.isActive !== undefined ? recordData.isActive : true,
    updatedAt: new Date().toISOString()
  };
  
  this.tables.your_new_table[recordIndex] = updatedRecord;
  this.saveTableToWorkbook('your_new_table');  // ← CRITICAL: Save to workbook
  
  return {
    ...updatedRecord,
    complexData: JSON.parse(updatedRecord.complexData)
  };
}

// Delete Record
deleteYourRecord(id) {
  const recordIndex = this.tables.your_new_table.findIndex(record => record.id === id);
  if (recordIndex === -1) {
    throw new Error(`Record with id ${id} not found`);
  }
  
  const deletedRecord = this.tables.your_new_table[recordIndex];
  this.tables.your_new_table.splice(recordIndex, 1);
  this.saveTableToWorkbook('your_new_table');  // ← CRITICAL: Save to workbook
  
  return {
    ...deletedRecord,
    complexData: typeof deletedRecord.complexData === 'string' 
      ? JSON.parse(deletedRecord.complexData) 
      : deletedRecord.complexData
  };
}
```

### Step 3: Add File Mapping

**Location**: `src/utils/relationalFileStorage.js`

⚠️ **CRITICAL STEP - Often Missed!**

Add your table to the file mapping:

```javascript
constructor() {
  this.dbTables = {
    accounts: 'accounts.xlsx',
    transactions: 'transactions.xlsx',
    // ... existing mappings ...
    your_new_table: 'your_new_table.xlsx'  // ← CRITICAL: Add this mapping
  };
}
```

**Why This Matters:**
- Without this mapping, no Excel file gets created
- Data exists in memory but never gets saved to disk
- Export/backup functions won't include your table
- Loading existing databases will fail to find your table file

### Step 4: Update Context Integration

**Location**: `src/contexts/AccountingContext.jsx`

#### 4.1 Add State Variable
```javascript
const [yourRecords, setYourRecords] = useState([]);
```

#### 4.2 Update State from Database
```javascript
const updateStateFromDatabase = () => {
  // ... existing updates ...
  setYourRecords([...database.getYourRecords()]);
};
```

#### 4.3 Add Context Functions
```javascript
// Add Record
const addYourRecord = async (recordData) => {
  try {
    const newRecord = database.addYourRecord(recordData);
    setYourRecords([...database.getYourRecords()]);
    
    // Save to file
    const buffer = database.exportTableToBuffer('your_new_table');
    await fileStorage.saveTable('your_new_table', buffer);
    
    return newRecord;
  } catch (error) {
    console.error('Error adding record:', error);
    throw error;
  }
};

// Update Record
const updateYourRecord = async (id, updates) => {
  try {
    const updatedRecord = database.updateYourRecord(id, updates);
    setYourRecords([...database.getYourRecords()]);
    
    // Save to file
    const buffer = database.exportTableToBuffer('your_new_table');
    await fileStorage.saveTable('your_new_table', buffer);
    
    return updatedRecord;
  } catch (error) {
    console.error('Error updating record:', error);
    throw error;
  }
};

// Delete Record
const removeYourRecord = async (id) => {
  try {
    const deletedRecord = database.deleteYourRecord(id);
    setYourRecords([...database.getYourRecords()]);
    
    // Save to file
    const buffer = database.exportTableToBuffer('your_new_table');
    await fileStorage.saveTable('your_new_table', buffer);
    
    return deletedRecord;
  } catch (error) {
    console.error('Error removing record:', error);
    throw error;
  }
};

// Get Records
const getYourRecords = () => {
  return database.getYourRecords();
};
```

#### 4.4 Add Migration Logic
```javascript
const loadYourRecords = () => {
  // Migration: Check for existing localStorage data and migrate to database
  try {
    const stored = localStorage.getItem('yourRecordsKey');
    if (stored && database) {
      const records = JSON.parse(stored);
      
      // Migrate each record to database if not already there
      records.forEach(record => {
        const existingRecords = database.getYourRecords();
        const exists = existingRecords.find(existing => existing.id === record.id);
        if (!exists) {
          console.log('Migrating record to database:', record.field1);
          database.addYourRecord(record);
        }
      });
      
      // Update state from database
      setYourRecords([...database.getYourRecords()]);
      
      // Clear localStorage after successful migration
      localStorage.removeItem('yourRecordsKey');
      console.log('Records migrated from localStorage to database');
    } else if (database) {
      // No localStorage data, just load from database
      setYourRecords([...database.getYourRecords()]);
    }
  } catch (error) {
    console.error('Error loading records:', error);
  }
};
```

#### 4.5 Add to Context Provider
```javascript
// In the return statement
<AccountingContext.Provider value={{
  // ... existing values ...
  yourRecords,
  addYourRecord,
  updateYourRecord,
  removeYourRecord,
  getYourRecords,
}}>
```

#### 4.6 Call Migration After Database Load
Add `loadYourRecords()` calls in:
- `createNewDatabase()` - after `updateStateFromDatabase()`
- `loadExistingDatabase()` - after `updateStateFromDatabase()` 
- `loadRecentDatabase()` - after `updateStateFromDatabase()`

### Step 5: Add to Export/Backup

**Location**: `src/contexts/AccountingContext.jsx`

Add your table to the backup/export table list:

```javascript
const resetDatabase = async (language = 'en') => {
  try {
    database.resetToInitialState(language);
    
    const tablesToSave = [
      'accounts', 'transactions', 'tags', 'todos',
      'transaction_types', 'transaction_groups', 'subcategories',
      'currencies', 'exchange_rates', 'currency_settings',
      'user_preferences', 'api_usage', 'api_settings', 'database_info',
      'payees', 'payers',
      'your_new_table'  // ← Add here for backups
    ];
    
    for (const tableName of tablesToSave) {
      const buffer = database.exportTableToBuffer(tableName);
      await fileStorage.saveTable(tableName, buffer);
    }
    
    updateStateFromDatabase();
    return true;
  } catch (error) {
    console.error('Error resetting database:', error);
    return false;
  }
};
```

---

## Common Pitfalls and Issues

### 1. Missing File Mapping ⚠️
**Problem**: Table exists in database but no Excel file gets created
**Cause**: Missing entry in `relationalFileStorage.js` `dbTables` mapping
**Solution**: Always add `your_table: 'your_table.xlsx'` to the mapping

### 2. Forgetting saveTableToWorkbook()
**Problem**: Data gets lost on app restart
**Cause**: CRUD methods don't call `this.saveTableToWorkbook(tableName)`
**Solution**: Add `this.saveTableToWorkbook('your_table')` after every data modification

### 3. JSON Field Handling
**Problem**: Complex objects become `[object Object]` in Excel
**Cause**: Not serializing/deserializing JSON fields properly
**Solution**: Use `JSON.stringify()` when saving, `JSON.parse()` when loading

### 4. Migration Timing Issues
**Problem**: Migration runs before database is loaded
**Cause**: Calling migration in `useEffect` instead of after database loading
**Solution**: Call migration functions after `updateStateFromDatabase()`

### 5. Missing from Required Tables
**Problem**: Older databases don't have your new table
**Cause**: Not adding table to `ensureAllTablesExist()` 
**Solution**: Add to the `requiredTables` array for backwards compatibility

### 6. State Not Updating
**Problem**: UI doesn't reflect data changes
**Cause**: Not updating React state after database operations
**Solution**: Call `setYourRecords([...database.getYourRecords()])` after changes

### 7. Export/Backup Exclusion
**Problem**: Your data doesn't appear in backups
**Cause**: Not adding table to export table lists
**Solution**: Add table name to `tablesToSave` arrays in reset/backup functions

---

## Testing and Verification

### Test Checklist

#### ✅ Database Creation
- [ ] New database includes your table file (.xlsx)
- [ ] Table file has correct headers (even when empty)
- [ ] Table shows up in database folder

#### ✅ CRUD Operations
- [ ] Create: New records get saved to file immediately
- [ ] Read: Records display correctly in UI
- [ ] Update: Changes persist after app restart
- [ ] Delete: Records removed from file and UI

#### ✅ Migration
- [ ] Existing localStorage data gets migrated to database
- [ ] localStorage gets cleared after migration
- [ ] No data loss during migration
- [ ] Migration only happens once

#### ✅ Backup/Export
- [ ] Your table is included in database exports
- [ ] Exported files contain your data
- [ ] Imported databases restore your data correctly

#### ✅ Cross-Device Testing
- [ ] Database works on different browsers
- [ ] Database works on different devices
- [ ] File sharing preserves all data

### Debug Tools

#### Console Logging
```javascript
// Add temporary logging to debug issues
console.log('Tables after createNewDatabase:', Object.keys(this.tables));
console.log('Your table data:', this.tables.your_new_table);
console.log('Exporting tables:', Object.keys(buffers));
```

#### File Verification
1. Check database folder for your `.xlsx` file
2. Open Excel file to verify data structure
3. Check file timestamps to confirm saves
4. Verify headers match your schema

---

## Best Practices

### 1. Consistent Naming
- Use snake_case for table names: `bank_configurations`
- Use descriptive file names: `bank_configurations.xlsx`
- Match table name to file name (minus extension)

### 2. Schema Design
- Always include `id`, `isActive`, `createdAt`, `updatedAt`
- Use JSON strings for complex nested objects
- Keep field names consistent with other tables

### 3. Error Handling
- Wrap all database operations in try-catch
- Provide meaningful error messages
- Handle missing tables gracefully

### 4. Performance
- Batch operations when possible
- Don't call `saveTableToWorkbook()` in loops
- Use lazy loading for large datasets

### 5. Data Integrity
- Validate data before saving
- Check for required fields
- Sanitize user input

### 6. Migration Safety
- Always backup before migration
- Test migration with sample data first
- Provide rollback capability

---

## Migration Completion Checklist

Use this checklist to ensure complete migration:

### Core Implementation
- [ ] Table added to database schema (`this.tables`)
- [ ] Table schema defined (`this.tableSchemas`)
- [ ] Table added to required tables list (`ensureAllTablesExist`)
- [ ] Table initialized in new database creation (`createNewDatabase`)
- [ ] **File mapping added to `relationalFileStorage.js`** ⚠️ **CRITICAL**

### CRUD Methods
- [ ] `addYourRecord()` implemented with `saveTableToWorkbook()`
- [ ] `getYourRecords()` implemented with JSON parsing
- [ ] `getActiveYourRecords()` implemented
- [ ] `updateYourRecord()` implemented with `saveTableToWorkbook()`
- [ ] `deleteYourRecord()` implemented with `saveTableToWorkbook()`

### Context Integration
- [ ] State variable added (`useState`)
- [ ] State updated in `updateStateFromDatabase()`
- [ ] Context functions implemented (add, update, delete, get)
- [ ] Migration function implemented (`loadYourRecords`)
- [ ] Migration called after database loads
- [ ] Functions added to context provider value

### Export/Backup
- [ ] Table added to backup table lists
- [ ] Table included in reset database function
- [ ] Export functions include your table

### Testing
- [ ] New database creation creates your file
- [ ] CRUD operations work and persist
- [ ] Migration works from localStorage
- [ ] Backup/restore includes your data
- [ ] Cross-device functionality verified

---

## Conclusion

Migrating from localStorage to persistent database storage provides significant benefits in terms of data portability, backup capabilities, and user experience. The key to successful migration is following each step carefully and ensuring the file mapping is properly configured.

The most common cause of migration failure is missing the file mapping step in `relationalFileStorage.js`. Always double-check this critical configuration to ensure your data files are created and managed properly.

Remember to test thoroughly at each step and provide proper error handling and user feedback throughout the migration process.