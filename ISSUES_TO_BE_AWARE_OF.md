# Uncovered Issues

This document tracks issues discovered during development and testing that were not initially anticipated.

## Issue #1: User Preferences Not Persisting to File Storage

**Date Discovered:** September 3, 2025  
**Component:** Date Format Settings / User Preferences System  
**Severity:** Medium  
**Status:** ✅ Fixed  

### Description
User preference changes (specifically date format settings) were not being permanently saved to file storage. Changes appeared to work in the current session but were lost after page refresh or application restart.

### Root Cause
The `updateUserPreferences` method in `AccountingContext.jsx` was only updating the in-memory database via `database.updateUserPreferences()` but was not saving the changes to the actual file storage system. This resulted in:
- ✅ Console/memory showing correct updated preferences
- ❌ Physical file showing old/unchanged preferences
- ❌ Changes lost on application restart

### Technical Details
**Files Affected:**
- `src/contexts/AccountingContext.jsx` - Missing file storage save operation
- `src/components/DateSettings.jsx` - User interface for changing preferences
- `src/utils/dateFormatService.js` - Service for reading preferences
- `src/utils/relationalDatabase.js` - Database operations

**Code Issue:**
```javascript
// Before (broken):
updateUserPreferences: (category, settings) => database.updateUserPreferences(category, settings),

// After (fixed):
updateUserPreferences: async (category, settings) => {
  const result = database.updateUserPreferences(category, settings);
  
  // Save the user_preferences table to file storage
  const buffer = database.exportTableToBuffer('user_preferences');
  await fileStorage.saveTable('user_preferences', buffer);
  
  return result;
},
```

### Fix Applied
1. Modified `updateUserPreferences` in `AccountingContext.jsx` to be async
2. Added file storage save operation using `fileStorage.saveTable()`
3. Added proper error handling for the async operation
4. Ensured consistency with other database operations in the system

### Testing
- Date format changes now persist across page refreshes
- File storage contains correct updated preferences
- Cash allocation modal displays dates in user's chosen format

### Prevention
This issue occurred because the user preferences save operation was inconsistent with other database operations. All other database modifications (accounts, transactions, etc.) properly save to file storage, but user preferences was missed during initial implementation.

**Recommendation:** Review all database modification operations to ensure they follow the same pattern:
1. Update in-memory database
2. Export table to buffer
3. Save buffer to file storage

---

## Issue #2: React-DatePicker Timezone Bug

**Date Discovered:** September 3, 2025  
**Component:** Cash Allocation Modal Date Picker  
**Severity:** Medium  
**Status:** ✅ Fixed  

### Description
When using react-datepicker with YYYY-MM-DD date storage, timezone conversion caused the selected date to display as the day before what was actually selected.

**Example:** Selecting September 5th, 2025 would display as September 4th, 2025 in the field.

### Root Cause
- Creating Date objects from YYYY-MM-DD strings defaults to midnight (00:00:00)
- Converting back to ISO string using `toISOString()` applies UTC timezone conversion
- This can shift the date backward by one day depending on local timezone offset

### Technical Details
**Files Affected:**
- `src/components/CashAllocationModal.jsx` - Date picker implementation

**Code Issue:**
```javascript
// Before (problematic):
selected={allocation.dateSpent ? new Date(allocation.dateSpent + 'T00:00:00') : null}
onChange={(date) => {
  const isoString = date ? date.toISOString().split('T')[0] : '';
  updateAllocation(index, 'dateSpent', isoString);
}}

// After (fixed):
selected={allocation.dateSpent ? new Date(allocation.dateSpent + 'T12:00:00') : null}
onChange={(date) => {
  if (date) {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const isoString = `${year}-${month}-${day}`;
    updateAllocation(index, 'dateSpent', isoString);
  } else {
    updateAllocation(index, 'dateSpent', '');
  }
}}
```

### Fix Applied
1. **Display Fix**: Use `T12:00:00` instead of `T00:00:00` when creating Date objects to avoid midnight timezone edge cases
2. **Storage Fix**: Manually construct YYYY-MM-DD strings using local date components instead of `toISOString()`

### Testing
- Date selection now maintains the correct day across all timezones
- Selected date matches displayed date in the field
- Date storage remains in YYYY-MM-DD format

### Prevention
This issue affects any react-datepicker implementation that stores dates in YYYY-MM-DD format. The timezone-safe pattern should be applied consistently across all date picker components.

**Recommendation:** Create a reusable date picker component or utility function that handles timezone conversion properly to avoid this issue in future implementations.

---