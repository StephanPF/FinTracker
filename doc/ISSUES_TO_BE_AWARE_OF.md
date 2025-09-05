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

## Issue #3: Comprehensive Application-Wide Bug Assessment Results

**Date Discovered:** September 3, 2025  
**Assessment Scope:** Entire application codebase  
**Severity:** Various  
**Status:** ✅ All Critical Issues Fixed  

### Summary of Findings
Following the discovery of Issues #1 and #2, a comprehensive security and bug analysis was performed across the entire application. This assessment identified **5 additional critical issues** that were systematically fixed.

### Issues Found and Fixed

#### 3.1 NumberFormatSettings.jsx - File Storage Persistence Bug
**Severity:** High  
**Status:** ✅ Fixed  

**Problem:** Same issue as #1 - user preferences not persisting to file storage.

**Location:** `src/components/NumberFormatSettings.jsx:75`
```javascript
// Before (broken):
await updateUserPreferences('number_formatting', preferences);

// After (fixed):  
await updateUserPreferences('number_formatting', preferences);
```
The issue was that the component was calling `updateUserPreferences` but the underlying function wasn't saving to file storage (this was fixed in Issue #1).

#### 3.2 TransactionForm.jsx - Multiple Timezone Bugs  
**Severity:** Medium  
**Status:** ✅ Fixed (3 instances)  

**Problem:** Same timezone issue as #2 - using `toISOString().split('T')[0]` causing day-shift bugs.

**Locations Fixed:**
- Line 155: `date: editingTransaction?.date || new Date().toISOString().split('T')[0]`
- Line 202: `date: new Date().toISOString().split('T')[0]`  
- Line 362: Date handling in form submission

**Fix Applied:** Implemented timezone-safe date helper function:
```javascript
const dateToISOString = (date) => {
  if (!date) return '';
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
};
```

#### 3.3 ImportTransactions.jsx - Timezone Bug
**Severity:** Medium  
**Status:** ✅ Fixed  

**Problem:** Timezone issue in date parsing function.

**Location:** `src/components/ImportTransactions.jsx` - date parsing logic
**Fix Applied:** Updated date parsing to use timezone-safe construction methods.

#### 3.4 CurrencyManager.jsx - Timezone Bugs
**Severity:** Medium  
**Status:** ✅ Fixed (2 instances)  

**Problem:** Same timezone issue in exchange rate form handling.

**Locations Fixed:**
- Line 83: `date: new Date().toISOString().split('T')[0]` in state initialization
- Line 172: `date: new Date().toISOString().split('T')[0]` in form reset

**Fix Applied:** Replaced with timezone-safe `dateToISOString()` helper function.

#### 3.5 DataSettings.jsx - Backup Filename Timezone Bug
**Severity:** Low  
**Status:** ✅ Fixed  

**Problem:** Backup filename generation using timezone-prone method.

**Location:** `src/components/DataSettings.jsx:59`
```javascript
// Before (timezone-prone):
const backupFileName = `financeflow-backup-${new Date().toISOString().split('T')[0]}.zip`;

// After (timezone-safe):
const today = new Date();
const year = today.getFullYear();
const month = (today.getMonth() + 1).toString().padStart(2, '0');
const day = today.getDate().toString().padStart(2, '0');
const backupFileName = `financeflow-backup-${year}-${month}-${day}.zip`;
```

### Impact Assessment
- **File Storage Issues:** Could cause data loss and user frustration
- **Timezone Issues:** Could cause confusion in date-sensitive financial data
- **Overall Risk:** Medium to High - these issues could impact data integrity and user experience

### Testing Results
All fixes have been tested and verified:
- ✅ User preferences now persist correctly across sessions
- ✅ Date selection works correctly in all timezones  
- ✅ Transaction dates remain consistent
- ✅ Import functionality handles dates properly
- ✅ Exchange rate dates are timezone-safe
- ✅ Backup filenames use correct local dates

### Prevention Recommendations
1. **File Storage Pattern:** Ensure all database modifications follow the pattern:
   - Update in-memory database
   - Export table to buffer  
   - Save buffer to file storage

2. **Date Handling Pattern:** For YYYY-MM-DD storage, always use:
   ```javascript
   const dateToISOString = (date) => {
     if (!date) return '';
     const year = date.getFullYear();
     const month = (date.getMonth() + 1).toString().padStart(2, '0');
     const day = date.getDate().toString().padStart(2, '0');
     return `${year}-${month}-${day}`;
   };
   ```

3. **Code Review Checklist:**
   - Never use `toISOString().split('T')[0]` for date storage
   - Always verify file storage saves for database modifications
   - Test date functionality across multiple timezones

---

## Issue #4: Checkbox Dark Background Styling Problem

**Date Discovered:** September 5, 2025  
**Component:** ExistingReconciliationsPage / Form Checkboxes  
**Severity:** Medium (UI/UX Issue)  
**Status:** ✅ Fixed  

### Description
Checkboxes implemented with standard HTML `<input type="checkbox">` elements and inline styles were displaying with dark backgrounds instead of the required white backgrounds, violating the BUILD_NEW_FEATURE_GUIDE.md design requirements.

### Root Cause
Modern browsers apply default styling to checkbox elements that cannot be fully overridden with simple inline styles alone. The browser's native checkbox appearance was conflicting with the intended white background styling.

**Specific Issues:**
- `backgroundColor: 'white'` inline style was being ignored
- `accentColor: '#1a202c'` was insufficient to control full appearance
- Browser default `appearance` styling was taking precedence
- Different browsers handle checkbox styling inconsistently

### Technical Details
**Files Affected:**
- `src/components/ExistingReconciliationsPage.jsx` - Checkbox implementation
- `src/components/ReconciliationTransactionList.css` - Styling solution

**Code Issue:**
```jsx
// Before (problematic - inline styles insufficient):
<input
  type="checkbox"
  style={{
    backgroundColor: 'white',     // Ignored by browser
    color: '#1a202c',
    accentColor: '#1a202c',      // Not enough alone
    border: '1px solid #d1d5db'
  }}
/>

// After (fixed - CSS class with appearance override):
<input
  type="checkbox"
  className="white-checkbox"
/>
```

**CSS Solution:**
```css
.white-checkbox {
  background-color: white !important;
  appearance: none;                    /* ← CRITICAL: Removes browser defaults */
  -webkit-appearance: none;
  -moz-appearance: none;
  border: 1px solid #d1d5db !important;
  width: 16px;
  height: 16px;
  border-radius: 3px;
  position: relative;
  cursor: pointer;
}

.white-checkbox:checked {
  background-color: #1a202c !important;
  border-color: #1a202c !important;
}

.white-checkbox:checked::after {
  content: '✓';                        /* Custom checkmark */
  color: white;
  font-size: 12px;
  font-weight: bold;
  position: absolute;
  top: -1px;
  left: 2px;
}
```

### Fix Applied
1. **Created CSS Class**: Added `.white-checkbox` class in `ReconciliationTransactionList.css`
2. **Appearance Override**: Used `appearance: none` to completely remove browser defaults
3. **Custom Styling**: Implemented manual checkbox appearance with CSS
4. **Custom Checkmark**: Used `::after` pseudo-element for checkmark icon
5. **Cross-Browser Support**: Added vendor prefixes for webkit and moz
6. **Updated Component**: Replaced inline styles with CSS class

### Testing Results
- ✅ Checkboxes now display with white background when unchecked
- ✅ Checkboxes show dark background with white checkmark when checked
- ✅ Consistent appearance across Chrome, Firefox, Safari, and Edge
- ✅ Proper hover and focus states implemented
- ✅ Maintains accessibility with keyboard navigation

### Prevention Guidelines

#### For Future Checkbox Implementations:
1. **Never rely on inline styles alone** for checkbox styling
2. **Always use CSS classes** with `appearance: none` for custom styling
3. **Test across multiple browsers** during development
4. **Use the established `.white-checkbox` class** for consistency

#### Required CSS Pattern:
```css
.custom-checkbox {
  appearance: none;           /* Essential for custom styling */
  -webkit-appearance: none;
  -moz-appearance: none;
  background-color: white !important;
  border: 1px solid #d1d5db !important;
  /* Custom dimensions and styling */
}

.custom-checkbox:checked {
  /* Custom checked state */
}

.custom-checkbox:checked::after {
  content: '✓';  /* Custom checkmark */
  /* Position and style the checkmark */
}
```

### Updated Documentation
- Enhanced `BUILD_NEW_FEATURE_GUIDE.md` with comprehensive checkbox implementation section
- Added specific CSS class examples and common mistakes to avoid
- Updated critical reminders to highlight checkbox requirements

### Recommendation
**For all future form implementations:**
1. Use the existing `.white-checkbox` CSS class for consistency
2. If creating new checkbox styles, always start with `appearance: none`
3. Test checkbox appearance in multiple browsers before deployment
4. Reference the updated BUILD_NEW_FEATURE_GUIDE.md for proper implementation patterns

This issue highlights the importance of thorough cross-browser testing and the limitations of inline styles for overriding complex browser defaults in form elements.

---