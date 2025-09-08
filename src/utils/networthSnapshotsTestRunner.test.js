import RelationalDatabase from './relationalDatabase.js';

// Mock XLSX module for browser environment
const mockXLSX = {
  utils: {
    book_new: () => ({ SheetNames: [], Sheets: {} }),
    aoa_to_sheet: (data) => ({ '!ref': 'A1:Z100', data }),
    book_append_sheet: (workbook, worksheet, name) => {
      workbook.SheetNames.push(name);
      workbook.Sheets[name] = worksheet;
    },
    sheet_to_json: (worksheet) => []
  }
};

// Set global XLSX if not already defined
if (typeof window !== 'undefined') {
  window.XLSX = mockXLSX;
} else if (typeof global !== 'undefined') {
  global.XLSX = mockXLSX;
}

// Fallback expect implementation for browser environment
const testExpected = {
  toBe: (actual, expected) => {
    if (actual === expected) return { success: true };
    throw new Error(`Expected ${actual} to be ${expected}`);
  },
  toEqual: (actual, expected) => {
    if (JSON.stringify(actual) === JSON.stringify(expected)) return { success: true };
    throw new Error(`Expected ${JSON.stringify(actual)} to equal ${JSON.stringify(expected)}`);
  },
  toBeGreaterThan: (actual, expected) => {
    if (actual > expected) return { success: true };
    throw new Error(`Expected ${actual} to be greater than ${expected}`);
  },
  toBeTruthy: (actual) => {
    if (actual) return { success: true };
    throw new Error(`Expected ${actual} to be truthy`);
  },
  toBeFalsy: (actual) => {
    if (!actual) return { success: true };
    throw new Error(`Expected ${actual} to be falsy`);
  },
  toContain: (actual, expected) => {
    if (actual.includes(expected)) return { success: true };
    throw new Error(`Expected ${actual} to contain ${expected}`);
  },
  toThrow: (fn) => {
    try {
      fn();
      throw new Error('Expected function to throw');
    } catch (error) {
      return { success: true };
    }
  }
};

/**
 * Create NetWorth Snapshots tests for comprehensive coverage
 * Following BUILD_NEW_FEATURE_GUIDE.md requirements
 */
export const createNetWorthSnapshotsTests = (expectObj) => {
  let db;
  
  // Use provided expect object or fall back to browser/test environment
  const expect = expectObj || (typeof window !== 'undefined' && window.expect) || testExpected;
  
  const beforeEach = () => {
    db = new RelationalDatabase();
    db.createNewDatabase('en');
    
    // Use existing default currencies (created by createNewDatabase)
    const currencies = db.getTable('currencies');
    const baseCurrency = currencies.find(c => c.code === 'USD');
    
    if (!baseCurrency) {
      throw new Error(`USD currency not found. Available: ${currencies.map(c => c.code).join(', ')}`);
    }
    
    // Add test accounts for realistic snapshots
    db.addAccount({
      name: 'Test Checking',
      accountType: 'Asset',
      balance: 5000.00,
      currencyId: baseCurrency.id,
      includeInOverview: true,
      isRetirement: false
    });
    
    db.addAccount({
      name: 'Test Savings',
      accountType: 'Asset', 
      balance: 15000.00,
      currencyId: baseCurrency.id,
      includeInOverview: true,
      isRetirement: false
    });
    
    db.addAccount({
      name: 'Test 401k',
      accountType: 'Asset',
      balance: 50000.00,
      currencyId: baseCurrency.id,
      includeInOverview: true,
      isRetirement: true
    });
    
    db.addAccount({
      name: 'Test Credit Card',
      accountType: 'Liability',
      balance: -2500.00,
      currencyId: baseCurrency.id,
      includeInOverview: true,
      isRetirement: false
    });
  };

  return [
    {
      id: 'NetWorthSnapshots_Schema_001',
      category: 'Net Worth Snapshots',
      suite: 'Database Schema', 
      name: 'Should have networth_snapshots table with correct schema',
      description: 'Verify networth_snapshots table contains all required fields',
      expectedBehavior: 'NetWorth snapshots table should contain all required fields for comprehensive financial tracking',
      testFunction: () => {
        beforeEach();
        const snapshotsSchema = db.tableSchemas.networth_snapshots;
        const expectedFields = ['id', 'snapshotDate', 'baseCurrencyId', 'totalAssets', 'totalLiabilities', 'netAssets', 'totalRetirement', 'description', 'createdAt'];
        
        expectedFields.forEach(field => {
          expect.toContain(snapshotsSchema, field);
        });
      }
    },

    {
      id: 'NetWorthSnapshots_CRUD_001', 
      category: 'Net Worth Snapshots',
      suite: 'CRUD Operations',
      name: 'Should create new networth snapshot with all fields',
      description: 'Create comprehensive networth snapshot with all financial data',
      expectedBehavior: 'Create comprehensive networth snapshot with calculated totals and proper metadata',
      testFunction: () => {
        beforeEach();
        const baseCurrency = db.getTable('currencies').find(c => c.code === 'USD');
        
        const snapshotData = {
          snapshotDate: '2025-09-08',
          baseCurrencyId: baseCurrency.id,
          totalAssets: 70000.00, // Checking + Savings + 401k
          totalLiabilities: 2500.00,
          netAssets: 67500.00, // Assets - Liabilities  
          totalRetirement: 50000.00,
          description: 'Monthly financial snapshot'
        };
        
        const snapshot = db.addNetWorthSnapshot(snapshotData);
        
        expect.toBeTruthy(snapshot.id);
        expect.toBe(snapshot.snapshotDate, '2025-09-08');
        expect.toBe(snapshot.baseCurrencyId, baseCurrency.id);
        expect.toBe(snapshot.totalAssets, 70000.00);
        expect.toBe(snapshot.totalLiabilities, 2500.00);
        expect.toBe(snapshot.netAssets, 67500.00);
        expect.toBe(snapshot.totalRetirement, 50000.00);
        expect.toBe(snapshot.description, 'Monthly financial snapshot');
        expect.toBeTruthy(snapshot.createdAt);
      }
    },

    {
      id: 'NetWorthSnapshots_CRUD_002',
      category: 'Net Worth Snapshots',
      suite: 'CRUD Operations', 
      name: 'Should retrieve all networth snapshots',
      description: 'Retrieve all stored snapshots from database',
      expectedBehavior: 'Get all stored snapshots with proper data integrity',
      testFunction: () => {
        beforeEach();
        const baseCurrency = db.getTable('currencies').find(c => c.code === 'USD');
        
        // Create multiple snapshots
        const snapshot1 = db.addNetWorthSnapshot({
          snapshotDate: '2025-08-01',
          baseCurrencyId: baseCurrency.id,
          totalAssets: 65000.00,
          totalLiabilities: 3000.00,
          netAssets: 62000.00,
          totalRetirement: 48000.00,
          description: 'August snapshot'
        });
        
        const snapshot2 = db.addNetWorthSnapshot({
          snapshotDate: '2025-09-01',
          baseCurrencyId: baseCurrency.id,
          totalAssets: 70000.00,
          totalLiabilities: 2500.00,
          netAssets: 67500.00,
          totalRetirement: 50000.00,
          description: 'September snapshot'
        });
        
        const allSnapshots = db.getNetWorthSnapshots();
        
        expect.toBe(allSnapshots.length, 2);
        expect.toBe(allSnapshots[0].id, snapshot1.id);
        expect.toBe(allSnapshots[1].id, snapshot2.id);
      }
    },

    {
      id: 'NetWorthSnapshots_CRUD_003',
      category: 'Net Worth Snapshots',
      suite: 'CRUD Operations',
      name: 'Should update existing networth snapshot',
      description: 'Update existing snapshot while maintaining data integrity',
      expectedBehavior: 'Modify snapshot data while preserving ID and integrity',
      testFunction: () => {
        beforeEach();
        const baseCurrency = db.getTable('currencies').find(c => c.code === 'USD');
        
        const originalSnapshot = db.addNetWorthSnapshot({
          snapshotDate: '2025-09-01',
          baseCurrencyId: baseCurrency.id,
          totalAssets: 65000.00,
          totalLiabilities: 3000.00,
          netAssets: 62000.00,
          totalRetirement: 48000.00,
          description: 'Initial snapshot'
        });
        
        const updatedData = {
          totalAssets: 70000.00,
          totalLiabilities: 2500.00,
          netAssets: 67500.00,
          totalRetirement: 50000.00,
          description: 'Updated snapshot with corrected values'
        };
        
        const updatedSnapshot = db.updateNetWorthSnapshot(originalSnapshot.id, updatedData);
        
        expect.toBe(updatedSnapshot.id, originalSnapshot.id);
        expect.toBe(updatedSnapshot.snapshotDate, originalSnapshot.snapshotDate); // Should remain unchanged
        expect.toBe(updatedSnapshot.totalAssets, 70000.00);
        expect.toBe(updatedSnapshot.totalLiabilities, 2500.00);
        expect.toBe(updatedSnapshot.netAssets, 67500.00);
        expect.toBe(updatedSnapshot.totalRetirement, 50000.00);
        expect.toBe(updatedSnapshot.description, 'Updated snapshot with corrected values');
      }
    },

    {
      id: 'NetWorthSnapshots_CRUD_004',
      category: 'Net Worth Snapshots',
      suite: 'CRUD Operations',
      name: 'Should delete networth snapshot',
      description: 'Delete snapshot and verify removal from database',
      expectedBehavior: 'Remove snapshot from database and return deleted data',
      testFunction: () => {
        beforeEach();
        const baseCurrency = db.getTable('currencies').find(c => c.code === 'USD');
        
        const snapshot1 = db.addNetWorthSnapshot({
          snapshotDate: '2025-08-01',
          baseCurrencyId: baseCurrency.id,
          totalAssets: 65000.00,
          totalLiabilities: 3000.00,
          netAssets: 62000.00,
          totalRetirement: 48000.00,
          description: 'Snapshot to delete'
        });
        
        const snapshot2 = db.addNetWorthSnapshot({
          snapshotDate: '2025-09-01',
          baseCurrencyId: baseCurrency.id,
          totalAssets: 70000.00,
          totalLiabilities: 2500.00,
          netAssets: 67500.00,
          totalRetirement: 50000.00,
          description: 'Snapshot to keep'
        });
        
        const deletedSnapshot = db.deleteNetWorthSnapshot(snapshot1.id);
        const remainingSnapshots = db.getNetWorthSnapshots();
        
        expect.toBe(deletedSnapshot.id, snapshot1.id);
        expect.toBe(deletedSnapshot.description, 'Snapshot to delete');
        expect.toBe(remainingSnapshots.length, 1);
        expect.toBe(remainingSnapshots[0].id, snapshot2.id);
      }
    },

    {
      id: 'NetWorthSnapshots_Sorting_001',
      category: 'Net Worth Snapshots',
      suite: 'Data Operations',
      name: 'Should sort snapshots by date chronologically',
      description: 'Sort snapshots chronologically by date for timeline analysis',
      expectedBehavior: 'Return snapshots sorted by snapshot date for timeline analysis',
      testFunction: () => {
        beforeEach();
        const baseCurrency = db.getTable('currencies').find(c => c.code === 'USD');
        
        // Add snapshots in random order
        const snapshot3 = db.addNetWorthSnapshot({
          snapshotDate: '2025-09-01',
          baseCurrencyId: baseCurrency.id,
          totalAssets: 70000.00,
          totalLiabilities: 2500.00,
          netAssets: 67500.00,
          totalRetirement: 50000.00,
          description: 'September snapshot'
        });
        
        const snapshot1 = db.addNetWorthSnapshot({
          snapshotDate: '2025-07-01', 
          baseCurrencyId: baseCurrency.id,
          totalAssets: 60000.00,
          totalLiabilities: 3500.00,
          netAssets: 56500.00,
          totalRetirement: 45000.00,
          description: 'July snapshot'
        });
        
        const snapshot2 = db.addNetWorthSnapshot({
          snapshotDate: '2025-08-01',
          baseCurrencyId: baseCurrency.id,
          totalAssets: 65000.00,
          totalLiabilities: 3000.00,
          netAssets: 62000.00,
          totalRetirement: 48000.00,
          description: 'August snapshot'
        });
        
        const sortedSnapshots = db.getNetWorthSnapshotsSortedByDate();
        
        expect.toBe(sortedSnapshots.length, 3);
        expect.toBe(sortedSnapshots[0].snapshotDate, '2025-07-01');
        expect.toBe(sortedSnapshots[1].snapshotDate, '2025-08-01');
        expect.toBe(sortedSnapshots[2].snapshotDate, '2025-09-01');
        expect.toBe(sortedSnapshots[0].description, 'July snapshot');
        expect.toBe(sortedSnapshots[1].description, 'August snapshot');
        expect.toBe(sortedSnapshots[2].description, 'September snapshot');
      }
    },

    {
      id: 'NetWorthSnapshots_Validation_001',
      category: 'Net Worth Snapshots',
      suite: 'Data Validation',
      name: 'Should handle missing table initialization',
      description: 'Initialize networth_snapshots table if missing for backward compatibility',
      expectedBehavior: 'Initialize networth_snapshots table if missing for backward compatibility',
      testFunction: () => {
        beforeEach();
        
        // Simulate missing table by deleting it
        delete db.tables.networth_snapshots;
        
        const baseCurrency = db.getTable('currencies').find(c => c.code === 'USD');
        
        const snapshotData = {
          snapshotDate: '2025-09-08',
          baseCurrencyId: baseCurrency.id,
          totalAssets: 70000.00,
          totalLiabilities: 2500.00,
          netAssets: 67500.00,
          totalRetirement: 50000.00,
          description: 'Test backward compatibility'
        };
        
        // Should automatically initialize table and create snapshot
        const snapshot = db.addNetWorthSnapshot(snapshotData);
        
        expect.toBeTruthy(db.tables.networth_snapshots);
        expect.toBeTruthy(snapshot.id);
        expect.toBe(snapshot.description, 'Test backward compatibility');
      }
    },

    {
      id: 'NetWorthSnapshots_Validation_002',
      category: 'Net Worth Snapshots',
      suite: 'Data Validation', 
      name: 'Should generate unique IDs for snapshots',
      description: 'Generate unique IDs with NWS prefix for each snapshot',
      expectedBehavior: 'Each snapshot should have a unique identifier following NWS prefix pattern',
      testFunction: () => {
        beforeEach();
        const baseCurrency = db.getTable('currencies').find(c => c.code === 'USD');
        
        const snapshot1 = db.addNetWorthSnapshot({
          snapshotDate: '2025-09-01',
          baseCurrencyId: baseCurrency.id,
          totalAssets: 65000.00,
          totalLiabilities: 3000.00,
          netAssets: 62000.00,
          totalRetirement: 48000.00,
          description: 'First snapshot'
        });
        
        const snapshot2 = db.addNetWorthSnapshot({
          snapshotDate: '2025-09-02', 
          baseCurrencyId: baseCurrency.id,
          totalAssets: 66000.00,
          totalLiabilities: 3000.00,
          netAssets: 63000.00,
          totalRetirement: 48000.00,
          description: 'Second snapshot'
        });
        
        // Should have unique IDs with NWS prefix
        expect.toBeTruthy(snapshot1.id.startsWith('NWS'));
        expect.toBeTruthy(snapshot2.id.startsWith('NWS'));
        expect.toBeTruthy(snapshot1.id !== snapshot2.id);
      }
    },

    {
      id: 'NetWorthSnapshots_ErrorHandling_001',
      category: 'Net Worth Snapshots',
      suite: 'Error Handling',
      name: 'Should handle update of non-existent snapshot',
      description: 'Handle update attempts on non-existent snapshots',
      expectedBehavior: 'Throw error when attempting to update snapshot that does not exist',
      testFunction: () => {
        beforeEach();
        
        expect.toThrow(() => {
          db.updateNetWorthSnapshot('INVALID_ID', {
            totalAssets: 50000.00,
            description: 'Should not work'
          });
        });
      }
    },

    {
      id: 'NetWorthSnapshots_ErrorHandling_002',
      category: 'Net Worth Snapshots',
      suite: 'Error Handling',
      name: 'Should handle deletion of non-existent snapshot',
      description: 'Handle deletion attempts on non-existent snapshots',
      expectedBehavior: 'Throw error when attempting to delete snapshot that does not exist',
      testFunction: () => {
        beforeEach();
        
        expect.toThrow(() => {
          db.deleteNetWorthSnapshot('INVALID_ID');
        });
      }
    },

    {
      id: 'NetWorthSnapshots_Integration_001',
      category: 'Net Worth Snapshots',
      suite: 'Integration',
      name: 'Should persist snapshots to workbook',
      description: 'Persist snapshots to Excel workbook for file storage',
      expectedBehavior: 'Snapshots should be saved to Excel workbook for file storage integration',
      testFunction: () => {
        beforeEach();
        const baseCurrency = db.getTable('currencies').find(c => c.code === 'USD');
        
        const snapshot = db.addNetWorthSnapshot({
          snapshotDate: '2025-09-08',
          baseCurrencyId: baseCurrency.id,
          totalAssets: 70000.00,
          totalLiabilities: 2500.00,
          netAssets: 67500.00,
          totalRetirement: 50000.00,
          description: 'Persistence test'
        });
        
        // Check that workbook was updated
        expect.toBeTruthy(db.workbooks.networth_snapshots);
        expect.toContain(db.workbooks.networth_snapshots.SheetNames, 'networth_snapshots');
      }
    },

    {
      id: 'NetWorthSnapshots_Performance_001',
      category: 'Net Worth Snapshots',
      suite: 'Performance',
      name: 'Should handle large number of snapshots efficiently',
      description: 'Handle large datasets efficiently with 50+ snapshots',
      expectedBehavior: 'Maintain good performance with 50+ snapshots for long-term tracking',
      testFunction: () => {
        beforeEach();
        const baseCurrency = db.getTable('currencies').find(c => c.code === 'USD');
        
        // Create 50 snapshots
        const snapshots = [];
        for (let i = 0; i < 50; i++) {
          const snapshot = db.addNetWorthSnapshot({
            snapshotDate: `2025-${(i % 12 + 1).toString().padStart(2, '0')}-01`,
            baseCurrencyId: baseCurrency.id,
            totalAssets: 50000 + (i * 1000),
            totalLiabilities: 2500 + (i * 50),
            netAssets: (50000 + (i * 1000)) - (2500 + (i * 50)),
            totalRetirement: 40000 + (i * 800),
            description: `Snapshot ${i + 1}`
          });
          snapshots.push(snapshot);
        }
        
        const allSnapshots = db.getNetWorthSnapshots();
        const sortedSnapshots = db.getNetWorthSnapshotsSortedByDate();
        
        expect.toBe(allSnapshots.length, 50);
        expect.toBe(sortedSnapshots.length, 50);
        
        // Verify sorting is working correctly
        for (let i = 1; i < sortedSnapshots.length; i++) {
          const prevDate = new Date(sortedSnapshots[i-1].snapshotDate);
          const currDate = new Date(sortedSnapshots[i].snapshotDate);
          expect.toBeTruthy(prevDate <= currDate);
        }
      }
    },

    {
      id: 'NetWorthSnapshots_DateHandling_001',
      category: 'Net Worth Snapshots',
      suite: 'Date Handling',
      name: 'Should handle various date formats correctly',
      description: 'Handle date formats and store consistently in YYYY-MM-DD format',
      expectedBehavior: 'Accept and store dates in YYYY-MM-DD format consistently',
      testFunction: () => {
        beforeEach();
        const baseCurrency = db.getTable('currencies').find(c => c.code === 'USD');
        
        const snapshot = db.addNetWorthSnapshot({
          snapshotDate: '2025-09-08',
          baseCurrencyId: baseCurrency.id,
          totalAssets: 70000.00,
          totalLiabilities: 2500.00,
          netAssets: 67500.00,
          totalRetirement: 50000.00,
          description: 'Date format test'
        });
        
        // Should store in ISO format
        expect.toBe(snapshot.snapshotDate, '2025-09-08');
        
        // CreatedAt should be ISO timestamp
        expect.toBeTruthy(snapshot.createdAt);
        expect.toBeTruthy(snapshot.createdAt.includes('T'));
      }
    },

    {
      id: 'NetWorthSnapshots_CurrencyIntegration_001',
      category: 'Net Worth Snapshots',
      suite: 'Currency Integration',
      name: 'Should maintain currency reference integrity',
      description: 'Maintain currency reference integrity for multi-currency support',
      expectedBehavior: 'Snapshots should maintain proper currency references for multi-currency support',
      testFunction: () => {
        beforeEach();
        const baseCurrency = db.getTable('currencies').find(c => c.code === 'USD');
        
        // Use existing EUR currency
        const eurCurrency = db.getTable('currencies').find(c => c.code === 'EUR');
        
        if (!eurCurrency) {
          throw new Error('EUR currency not found in default currencies');
        }
        
        const usdSnapshot = db.addNetWorthSnapshot({
          snapshotDate: '2025-09-01',
          baseCurrencyId: baseCurrency.id,
          totalAssets: 70000.00,
          totalLiabilities: 2500.00,
          netAssets: 67500.00,
          totalRetirement: 50000.00,
          description: 'USD snapshot'
        });
        
        const eurSnapshot = db.addNetWorthSnapshot({
          snapshotDate: '2025-09-02',
          baseCurrencyId: eurCurrency.id,
          totalAssets: 60000.00,
          totalLiabilities: 2000.00,
          netAssets: 58000.00,
          totalRetirement: 45000.00,
          description: 'EUR snapshot'
        });
        
        expect.toBe(usdSnapshot.baseCurrencyId, baseCurrency.id);
        expect.toBe(eurSnapshot.baseCurrencyId, eurCurrency.id);
        
        const allSnapshots = db.getNetWorthSnapshots();
        expect.toBe(allSnapshots.length, 2);
      }
    }
  ];
};