import React, { useState } from 'react';
import { useAccounting } from '../contexts/AccountingContext';
import { useLanguage } from '../contexts/LanguageContext';

const RecentDatabases = () => {
  const { getRecentDatabases, loadRecentDatabase, isLoaded } = useAccounting();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(null);

  // Add error handling for getRecentDatabases
  let recentDatabases = [];
  try {
    if (getRecentDatabases && typeof getRecentDatabases === 'function') {
      recentDatabases = getRecentDatabases();
    }
  } catch (error) {
    console.error('Error getting recent databases:', error);
    recentDatabases = [];
  }

  const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleLoadRecent = async (databaseInfo, index) => {
    try {
      setLoading(index);
      
      if (loadRecentDatabase && typeof loadRecentDatabase === 'function') {
        const success = await loadRecentDatabase(databaseInfo);
        
        if (!success) {
          console.warn('Failed to load recent database - user may have cancelled selection');
        }
      } else {
        console.error('loadRecentDatabase function not available');
        alert('Database loading function is not available. Please refresh the page and try again.');
      }
    } catch (error) {
      console.error('Error loading recent database:', error);
      alert(`Error loading database: ${error.message}`);
    } finally {
      setLoading(null);
    }
  };

  const getDatabaseDisplayName = (dbInfo) => {
    if (dbInfo.path) {
      return dbInfo.path;
    } else if (dbInfo.files && dbInfo.files.length > 0) {
      return `${dbInfo.files.length} files selected`;
    } else {
      return 'Unknown database';
    }
  };

  const getDatabaseType = (dbInfo) => {
    return dbInfo.type === 'directory' ? 'Directory' : 'Individual Files';
  };

  const isCurrentDatabase = (dbInfo) => {
    // Check if there's a database stored in localStorage (regardless of isLoaded state)
    try {
      const currentDbInfo = localStorage.getItem('accounting_relational_db');
      if (!currentDbInfo) return false;
      
      const current = JSON.parse(currentDbInfo);
      
      const pathMatch = dbInfo.path && current.path === dbInfo.path;
      const filesMatch = dbInfo.files && current.files && 
         JSON.stringify(dbInfo.files.sort()) === JSON.stringify(current.files.sort());
      
      return pathMatch || filesMatch;
    } catch (error) {
      return false;
    }
  };

  if (recentDatabases.length === 0) {
    return null; // Don't show anything if no recent databases
  }

  return (
    <div className="recent-databases">
      <div className="recent-header">
        <h3>📚 {t('recentDatabases')}</h3>
        <p>{t('quickAccess')}</p>
      </div>
      
      <div className="recent-list">
        {recentDatabases.map((dbInfo, index) => {
          const isCurrent = isCurrentDatabase(dbInfo);
          return (
            <div key={index} className={`recent-item ${isCurrent ? 'current-database' : ''}`}>
              <div className="recent-info">
                <div className="recent-name">
                  <span className="db-icon">
                    {isCurrent ? '🟢' : (dbInfo.type === 'directory' ? '📁' : '📄')}
                  </span>
                  <span className="db-name">
                    {getDatabaseDisplayName(dbInfo)}
                    {isCurrent && <span className="current-label"> (Active)</span>}
                  </span>
                </div>
                <div className="recent-details">
                  <span className="db-type">{getDatabaseType(dbInfo)}</span>
                  <span className="db-date">
                    {t('lastOpened')}: {formatDate(dbInfo.timestamp)}
                  </span>
                </div>
              </div>
              <button
                onClick={() => handleLoadRecent(dbInfo, index)}
                disabled={loading === index}
                className={`load-recent-btn ${isCurrent ? 'current' : ''}`}
                title={isCurrent ? 
                  'Database is already active' :
                  `Click to select the database folder: "${dbInfo.path || 'Database files'}"`}
              >
                {loading === index ? '🔄' : 
                 (isCurrent ? '✅' : 
                  (dbInfo.hasStoredHandles ? '⚡' : '📂'))} 
                {loading === index ? '...' : 
                 (isCurrent ? 'Active' : t('loadDatabase'))}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default RecentDatabases;