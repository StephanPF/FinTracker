import React, { useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { useAccounting } from '../contexts/AccountingContext';

const DataSettings = () => {
  const { t } = useLanguage();
  const { database, fileStorage } = useAccounting();
  const [isCreatingBackup, setIsCreatingBackup] = useState(false);
  const [backupStatus, setBackupStatus] = useState('');

  const createBackup = async () => {
    try {
      setIsCreatingBackup(true);
      setBackupStatus(t('creatingBackup'));

      // Get all table data as buffers
      const allTablesData = database.exportAllTablesToBuffers();
      
      // Import JSZip dynamically to keep bundle size smaller
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();

      // Add database info file
      const dbInfo = {
        backupDate: new Date().toISOString(),
        version: '1.0',
        tables: Object.keys(allTablesData),
        description: 'FinanceFlow Database Backup'
      };
      
      zip.file('backup-info.json', JSON.stringify(dbInfo, null, 2));

      // Add all Excel files to the ZIP
      Object.entries(allTablesData).forEach(([tableName, buffer]) => {
        const fileName = fileStorage.getFileName(tableName);
        zip.file(fileName, buffer);
      });

      setBackupStatus('Generating ZIP file...');
      
      // Generate the ZIP file
      const zipBuffer = await zip.generateAsync({ 
        type: 'blob',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 }
      });

      // Create download
      const url = URL.createObjectURL(zipBuffer);
      const a = document.createElement('a');
      const backupFileName = `financeflow-backup-${new Date().toISOString().split('T')[0]}.zip`;
      
      a.href = url;
      a.download = backupFileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setBackupStatus(`${t('backupCreated')}: ${backupFileName}`);
      
      // Clear status after 5 seconds
      setTimeout(() => {
        setBackupStatus('');
      }, 5000);

    } catch (error) {
      console.error('Error creating backup:', error);
      setBackupStatus(`${t('backupError')}: ${error.message}`);
      
      // Clear error after 5 seconds
      setTimeout(() => {
        setBackupStatus('');
      }, 5000);
    } finally {
      setIsCreatingBackup(false);
    }
  };

  const getBackupSize = () => {
    try {
      // Estimate backup size based on current data
      const allTablesData = database.exportAllTablesToBuffers();
      let totalSize = 0;
      
      Object.values(allTablesData).forEach(buffer => {
        totalSize += buffer.byteLength;
      });

      // Add some overhead for ZIP compression (estimate ~70% compression)
      const estimatedZipSize = totalSize * 0.7;
      
      return formatFileSize(estimatedZipSize);
    } catch (error) {
      return 'Unknown';
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getTableCount = () => {
    try {
      return Object.keys(database.exportAllTablesToBuffers()).length;
    } catch (error) {
      return 0;
    }
  };

  return (
    <div className="data-settings">
      <div className="settings-section">
        <div className="section-header">
          <h2>📁 {t('dataManagement')}</h2>
          <p>{t('dataManagementDesc')}</p>
        </div>

        {/* Storage Panel */}
        <div className="settings-panel">
          <div className="panel-header">
            <div className="panel-title">
              <span className="panel-icon">💾</span>
              <div>
                <h3>{t('storageBackup')}</h3>
                <p>{t('storageBackupDesc')}</p>
              </div>
            </div>
          </div>

          <div className="panel-content">
            <div className="backup-info">
              <div className="info-grid">
                <div className="info-item">
                  <span className="info-label">{t('databaseTables')}:</span>
                  <span className="info-value">{getTableCount()}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">{t('estimatedBackupSize')}:</span>
                  <span className="info-value">{getBackupSize()}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">{t('backupFormat')}:</span>
                  <span className="info-value">ZIP Archive (.zip)</span>
                </div>
                <div className="info-item">
                  <span className="info-label">{t('backupContents')}:</span>
                  <span className="info-value">{t('allExcelFiles')}</span>
                </div>
              </div>
            </div>

            <div className="backup-description">
              <h4>📋 {t('whatsIncluded')}</h4>
              <ul className="backup-contents">
                <li>✅ {t('accountData')}</li>
                <li>✅ {t('transactionHistory')}</li>
                <li>✅ {t('categoriesData')}</li>
                <li>✅ {t('currencySettings')}</li>
                <li>✅ {t('userPreferences')}</li>
                <li>✅ {t('tagsGroups')}</li>
                <li>✅ {t('databaseMetadata')}</li>
              </ul>
            </div>

            <div className="backup-actions">
              <button
                className={`backup-btn ${isCreatingBackup ? 'creating' : ''}`}
                onClick={createBackup}
                disabled={isCreatingBackup}
              >
                {isCreatingBackup ? (
                  <>
                    <span className="spinner">⏳</span>
                    {t('creatingBackup')}
                  </>
                ) : (
                  <>
                    <span className="backup-icon">📦</span>
                    {t('createBackup')}
                  </>
                )}
              </button>

              {backupStatus && (
                <div className={`backup-status ${backupStatus.includes('Error') ? 'error' : 'success'}`}>
                  {backupStatus}
                </div>
              )}
            </div>

            <div className="backup-notes">
              <h4>💡 {t('backupTips')}</h4>
              <ul className="tips-list">
                <li>📅 {t('regularBackups')}</li>
                <li>💾 {t('multipleLocations')}</li>
                <li>🔄 {t('testRestores')}</li>
                <li>📝 {t('dateNaming')}</li>
                <li>🔒 {t('encryptBackups')}</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DataSettings;