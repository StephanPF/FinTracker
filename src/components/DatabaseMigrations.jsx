/**
 * Database Migrations Management Page
 * 
 * Provides interface for running database migration scripts safely.
 */

import React, { useState, useEffect } from 'react';
import { useAccounting } from '../contexts/AccountingContext';
import { useLanguage } from '../contexts/LanguageContext';
import AccommodationSubcategoryMigration from '../utils/migrateAccommodationSubcategories.js';
import AddCashWithdrawalSubcategoryMigration from '../utils/addCashWithdrawalSubcategory.js';
import FixCashWithdrawalSubcategoryMigration from '../utils/fixCashWithdrawalSubcategory.js';
import AddRefundGroupAndSubcategoryMigration from '../utils/addRefundGroupAndSubcategory.js';
import CreateNotificationsTableMigration from '../utils/createNotificationsTableMigration.js';
import './DatabaseMigrations.css';

const DatabaseMigrations = () => {
  const { database, fileStorage, addNotification, deleteNotification } = useAccounting();
  const { t } = useLanguage();
  const [migrations, setMigrations] = useState([]);
  const [runningMigration, setRunningMigration] = useState(null);
  const [migrationResults, setMigrationResults] = useState({});

  // Available migrations
  const availableMigrations = [
    {
      id: 'create_notifications_table',
      name: 'Create Notifications Table and File',
      description: 'Ensures notifications.xlsx file is created with proper structure, resolving the issue where notifications table exists in memory but no physical file exists',
      version: '1.0.0',
      migrationClass: CreateNotificationsTableMigration,
      riskLevel: 'low',
      affectedTables: ['notifications']
    },
    {
      id: 'consolidate_accommodation_subcategories',
      name: 'Consolidate Accommodation Subcategories',
      description: 'Merge SUB_001 (Short-Term Rentals) and SUB_002 (Long-Term Rentals) into single "Accommodation Rentals" category',
      version: '1.0.0',
      migrationClass: AccommodationSubcategoryMigration,
      riskLevel: 'low',
      affectedTables: ['subcategories', 'transactions']
    },
    {
      id: 'add_cash_withdrawal_subcategory',
      name: 'Add Cash Withdrawal Subcategory',
      description: 'Add "Cash Withdrawal" subcategory (SUB_068) to GRP_010 (Miscellaneous) with isCashWithdrawal flag for NOMADIC databases',
      version: '1.0.0',
      migrationClass: AddCashWithdrawalSubcategoryMigration,
      riskLevel: 'low',
      affectedTables: ['subcategories']
    },
    {
      id: 'fix_cash_withdrawal_subcategory',
      name: 'Fix Cash Withdrawal Subcategory Persistence',
      description: 'Ensures SUB_068 Cash Withdrawal subcategory is properly saved to database files (fixes localStorage vs file storage issues)',
      version: '1.0.0',
      migrationClass: FixCashWithdrawalSubcategoryMigration,
      riskLevel: 'low',
      affectedTables: ['subcategories']
    },
    {
      id: 'add_refund_group_and_subcategory',
      name: 'Add Refund Transaction Group and Subcategory',
      description: 'Adds GRP_018 "Refunds" transaction group (Income) and SUB_069 "Refund" subcategory for refunds from purchases, services, and cancellations',
      version: '1.0.0',
      migrationClass: AddRefundGroupAndSubcategoryMigration,
      riskLevel: 'low',
      affectedTables: ['transaction_groups', 'subcategories']
    }
  ];

  // Load migration history on component mount
  useEffect(() => {
    loadMigrationHistory();
  }, [database]);

  const loadMigrationHistory = () => {
    try {
      const migrationHistory = database?.getTable('migrations') || [];
      setMigrations(migrationHistory);
    } catch (error) {
      console.error('Failed to load migration history:', error);
      setMigrations([]);
    }
  };

  const isMigrationApplied = (migrationId, version) => {
    return migrations.some(m => m.name === migrationId && m.version === version);
  };

  const runMigration = async (migrationConfig) => {
    if (!database) {
      alert('Database not available');
      return;
    }

    setRunningMigration(migrationConfig.id);
    
    try {
      const migration = new migrationConfig.migrationClass(database, fileStorage, {
        addNotification: addNotification,
        deleteNotification: deleteNotification
      });
      
      // Check if migration can run (if method exists)
      if (typeof migration.canRun === 'function') {
        const canRunResult = await migration.canRun();
        if (!canRunResult.canRun) {
          throw new Error(canRunResult.reason || 'Migration cannot be run');
        }
      }
      
      const result = await migration.runMigration();
      
      setMigrationResults(prev => ({
        ...prev,
        [migrationConfig.id]: result
      }));

      if (result.success) {
        loadMigrationHistory(); // Refresh migration history
      }
    } catch (error) {
      setMigrationResults(prev => ({
        ...prev,
        [migrationConfig.id]: { success: false, error: error.message }
      }));
    } finally {
      setRunningMigration(null);
    }
  };

  const rollbackMigration = async (migrationConfig) => {
    if (!database) {
      alert('Database not available');
      return;
    }

    const result = migrationResults[migrationConfig.id];
    if (!result?.backupSuffix) {
      alert('No backup available for rollback');
      return;
    }

    if (!confirm('Are you sure you want to rollback this migration? This will restore the previous state.')) {
      return;
    }

    setRunningMigration(`${migrationConfig.id}_rollback`);
    
    try {
      const migration = new migrationConfig.migrationClass(database, fileStorage);
      const rollbackResult = await migration.rollbackMigration(result.backupSuffix);
      
      if (rollbackResult.success) {
        setMigrationResults(prev => ({
          ...prev,
          [migrationConfig.id]: null
        }));
        loadMigrationHistory();
        alert('Migration rolled back successfully! Please refresh the page to see changes.');
      } else {
        alert('Rollback failed: ' + rollbackResult.error);
      }
    } catch (error) {
      alert('Rollback error: ' + error.message);
    } finally {
      setRunningMigration(null);
    }
  };

  const getRiskLevelColor = (riskLevel) => {
    switch (riskLevel) {
      case 'low': return '#28a745';
      case 'medium': return '#ffc107';
      case 'high': return '#dc3545';
      default: return '#6c757d';
    }
  };

  const getRiskLevelIcon = (riskLevel) => {
    switch (riskLevel) {
      case 'low': return '🟢';
      case 'medium': return '🟡';
      case 'high': return '🔴';
      default: return '⚪';
    }
  };

  const checkMigrationAvailability = async (migrationConfig) => {
    if (!database) return { available: false, reason: 'Database not available' };
    
    try {
      const migration = new migrationConfig.migrationClass(database, fileStorage);
      if (typeof migration.canRun === 'function') {
        const result = await migration.canRun();
        return { available: result.canRun, reason: result.reason };
      }
      return { available: true };
    } catch (error) {
      return { available: false, reason: error.message };
    }
  };

  return (
    <div className="database-migrations">
      <div className="migrations-header">
        <h1>Database Migrations</h1>
        <p className="migrations-description">
          Manage database schema and data migrations safely with automatic backups and rollback capabilities.
        </p>
      </div>

      <div className="migrations-content">
        
        {/* Migration History Section */}
        <div className="migration-section">
          <h2>Migration History</h2>
          {migrations.length === 0 ? (
            <div className="no-migrations">
              <p>No migrations have been applied yet.</p>
            </div>
          ) : (
            <div className="migration-history">
              {migrations.map((migration, index) => (
                <div key={migration.id || index} className="migration-history-item">
                  <div className="migration-info">
                    <strong>{migration.name}</strong>
                    <span className="migration-version">v{migration.version}</span>
                  </div>
                  <div className="migration-meta">
                    <span className="migration-date">
                      Applied: {new Date(migration.appliedAt).toLocaleString()}
                    </span>
                  </div>
                  {migration.description && (
                    <p className="migration-description">{migration.description}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Available Migrations Section */}
        <div className="migration-section">
          <h2>Available Migrations</h2>
          <div className="migrations-list">
            {availableMigrations.map((migration) => {
              const isApplied = isMigrationApplied(migration.id, migration.version);
              const isRunning = runningMigration === migration.id;
              const isRollingBack = runningMigration === `${migration.id}_rollback`;
              const result = migrationResults[migration.id];

              return (
                <div key={migration.id} className={`migration-card ${isApplied ? 'applied' : 'pending'}`}>
                  <div className="migration-header">
                    <div className="migration-title">
                      <h3>{migration.name}</h3>
                      <div className="migration-badges">
                        <span className="version-badge">v{migration.version}</span>
                        <span 
                          className="risk-badge"
                          style={{ 
                            backgroundColor: getRiskLevelColor(migration.riskLevel) + '20',
                            color: getRiskLevelColor(migration.riskLevel),
                            border: `1px solid ${getRiskLevelColor(migration.riskLevel)}`
                          }}
                        >
                          {getRiskLevelIcon(migration.riskLevel)} {migration.riskLevel.toUpperCase()} RISK
                        </span>
                        {isApplied && <span className="applied-badge">✅ APPLIED</span>}
                      </div>
                    </div>
                  </div>

                  <div className="migration-body">
                    <p className="migration-description">{migration.description}</p>
                    
                    <div className="migration-details">
                      <div className="affected-tables">
                        <strong>Affected Tables:</strong>
                        <span className="table-list">
                          {migration.affectedTables.join(', ')}
                        </span>
                      </div>
                    </div>

                    {/* Migration Result Display */}
                    {result && (
                      <div className={`migration-result ${result.success ? 'success' : 'error'}`}>
                        {result.success ? (
                          <div className="success-result">
                            <strong>✅ Migration Successful!</strong>
                            {result.alreadyApplied ? (
                              <p>Migration was already applied previously.</p>
                            ) : (
                              <div className="result-details">
                                <p>Migration completed successfully with the following changes:</p>
                                <ul>
                                  <li>Subcategories updated: {result.subcategoriesUpdated ? 'Yes' : 'No'}</li>
                                  <li>Transactions migrated: {result.transactionsUpdated} records</li>
                                  <li>Obsolete subcategory removed: {result.subcategoryRemoved ? 'Yes' : 'No'}</li>
                                  <li>Backup created: {result.backupSuffix}</li>
                                </ul>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="error-result">
                            <strong>❌ Migration Failed</strong>
                            <p>{result.error}</p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="migration-actions">
                      {!isApplied && !result && (
                        <button
                          className="run-migration-btn"
                          onClick={() => runMigration(migration)}
                          disabled={isRunning}
                        >
                          {isRunning ? '⏳ Running...' : '🚀 Run Migration'}
                        </button>
                      )}

                      {result?.success && result.backupSuffix && (
                        <button
                          className="rollback-migration-btn"
                          onClick={() => rollbackMigration(migration)}
                          disabled={isRollingBack}
                        >
                          {isRollingBack ? '⏳ Rolling Back...' : '↩️ Rollback'}
                        </button>
                      )}

                      {result && (
                        <button
                          className="refresh-page-btn"
                          onClick={() => window.location.reload()}
                        >
                          🔄 Refresh Page
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Warning Section */}
        <div className="migration-section warning-section">
          <h2>⚠️ Important Notes</h2>
          <div className="warning-content">
            <ul>
              <li><strong>Backup:</strong> All migrations create automatic backups before making changes</li>
              <li><strong>Testing:</strong> Migrations have been tested but please ensure you have your own backups</li>
              <li><strong>Rollback:</strong> Use rollback functionality carefully - it restores the previous state completely</li>
              <li><strong>Refresh:</strong> After running migrations, refresh the page to see changes in the UI</li>
              <li><strong>Production:</strong> Test migrations in a development environment first when possible</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DatabaseMigrations;