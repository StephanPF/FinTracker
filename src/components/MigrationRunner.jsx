/**
 * Migration Runner Component
 * 
 * Temporary component to run the accommodation subcategory migration.
 * Add this to your app temporarily to execute the migration.
 */

import React, { useState } from 'react';
import { useAccounting } from '../contexts/AccountingContext';
import AccommodationSubcategoryMigration from '../utils/migrateAccommodationSubcategories.js';

const MigrationRunner = () => {
  const { database } = useAccounting();
  const [migrationResult, setMigrationResult] = useState(null);
  const [isRunning, setIsRunning] = useState(false);

  const runMigration = async () => {
    if (!database) {
      alert('Database not available');
      return;
    }

    setIsRunning(true);
    try {
      const migration = new AccommodationSubcategoryMigration(database);
      const result = await migration.runMigration();
      setMigrationResult(result);
    } catch (error) {
      setMigrationResult({ success: false, error: error.message });
    } finally {
      setIsRunning(false);
    }
  };

  const rollbackMigration = async () => {
    if (!database || !migrationResult?.backupSuffix) {
      alert('Cannot rollback - no backup available');
      return;
    }

    setIsRunning(true);
    try {
      const migration = new AccommodationSubcategoryMigration(database);
      const result = await migration.rollbackMigration(migrationResult.backupSuffix);
      if (result.success) {
        setMigrationResult(null);
        alert('Migration rolled back successfully! Please refresh the page.');
      } else {
        alert('Rollback failed: ' + result.error);
      }
    } catch (error) {
      alert('Rollback error: ' + error.message);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: '20px',
      right: '20px',
      background: '#fff',
      border: '2px solid #007bff',
      borderRadius: '8px',
      padding: '20px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
      minWidth: '300px',
      zIndex: 9999
    }}>
      <h3 style={{ margin: '0 0 15px 0', color: '#007bff' }}>
        🔧 Database Migration
      </h3>
      
      <p style={{ margin: '0 0 15px 0', fontSize: '14px', color: '#666' }}>
        Consolidate SUB_001 and SUB_002 accommodation subcategories
      </p>

      {!migrationResult && (
        <div>
          <button
            onClick={runMigration}
            disabled={isRunning}
            style={{
              background: '#007bff',
              color: 'white',
              border: 'none',
              padding: '10px 20px',
              borderRadius: '4px',
              cursor: isRunning ? 'not-allowed' : 'pointer',
              width: '100%',
              fontSize: '14px'
            }}
          >
            {isRunning ? '⏳ Running Migration...' : '🚀 Run Migration'}
          </button>
        </div>
      )}

      {migrationResult && (
        <div>
          {migrationResult.success ? (
            <div style={{ background: '#d4edda', padding: '10px', borderRadius: '4px', marginBottom: '15px' }}>
              <strong style={{ color: '#155724' }}>✅ Migration Successful!</strong>
              {migrationResult.alreadyApplied ? (
                <p style={{ margin: '5px 0 0 0', fontSize: '13px', color: '#155724' }}>
                  Migration was already applied previously.
                </p>
              ) : (
                <div style={{ fontSize: '13px', color: '#155724', marginTop: '5px' }}>
                  <div>• Subcategories updated: {migrationResult.subcategoriesUpdated ? 'Yes' : 'No'}</div>
                  <div>• Transactions updated: {migrationResult.transactionsUpdated}</div>
                  <div>• SUB_002 removed: {migrationResult.subcategoryRemoved ? 'Yes' : 'No'}</div>
                  <div>• Backup: {migrationResult.backupSuffix}</div>
                </div>
              )}
            </div>
          ) : (
            <div style={{ background: '#f8d7da', padding: '10px', borderRadius: '4px', marginBottom: '15px' }}>
              <strong style={{ color: '#721c24' }}>❌ Migration Failed</strong>
              <p style={{ margin: '5px 0 0 0', fontSize: '13px', color: '#721c24' }}>
                {migrationResult.error}
              </p>
            </div>
          )}

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={() => window.location.reload()}
              style={{
                background: '#28a745',
                color: 'white',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px',
                flex: 1
              }}
            >
              🔄 Refresh Page
            </button>
            
            {migrationResult.success && migrationResult.backupSuffix && (
              <button
                onClick={rollbackMigration}
                disabled={isRunning}
                style={{
                  background: '#dc3545',
                  color: 'white',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: '4px',
                  cursor: isRunning ? 'not-allowed' : 'pointer',
                  fontSize: '12px',
                  flex: 1
                }}
              >
                {isRunning ? '⏳ Rolling Back...' : '↩️ Rollback'}
              </button>
            )}
          </div>
        </div>
      )}

      <div style={{ marginTop: '15px', paddingTop: '15px', borderTop: '1px solid #eee' }}>
        <small style={{ color: '#999', fontSize: '11px' }}>
          💡 Remove this component after migration is complete
        </small>
      </div>
    </div>
  );
};

export default MigrationRunner;