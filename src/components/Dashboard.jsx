import React, { useState, useEffect, useRef } from 'react';
import { useAccounting } from '../contexts/AccountingContext';
import { useLanguage } from '../contexts/LanguageContext';
import AccountSummary from './AccountSummary';
import TransactionForm from './TransactionForm';
import TransactionList from './TransactionList';
import DatabaseSetup from './DatabaseSetup';
import DataManagement from './DataManagement';
import HelpPanel from './HelpPanel';
import Test from './Test';
import Settings from './Settings';
import ImportTransactions from './ImportTransactions';
import ReconciliationPage from './ReconciliationPage';
import ExistingReconciliationsPage from './ExistingReconciliationsPage';
import TestDashboard from './TestDashboard';
import BudgetSetup from './BudgetSetup';
import AnalyticsMain from './Analytics/AnalyticsMain';
import DatabaseMigrations from './DatabaseMigrations';
import Logo from './Logo';
import NotificationBadge from './NotificationBadge';
import NotificationCenter from './NotificationCenter';
import LogButton from './LogButton';
import LogModal from './LogModal';
import logger from '../utils/logger';

const Dashboard = () => {
  const { isLoaded, loading, resetToSetup, database, fileStorage, notificationService } = useAccounting();
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState(() => {
    // Initialize activeTab from URL hash first, then localStorage as fallback
    const hash = window.location.hash.slice(1);
    const validTabs = ['overview', 'transactions', 'add-transaction', 'data-management', 'budget-setup', 'analytics', 'database-migrations', 'test', 'test-dashboard', 'settings', 'import-transactions', 'reconciliation', 'reconciliation/existing'];
    
    if (validTabs.includes(hash)) {
      return hash;
    }
    
    // Fallback to localStorage if no valid hash
    const savedTab = localStorage.getItem('activeTab');
    return (savedTab && validTabs.includes(savedTab)) ? savedTab : 'overview';
  });
  const [helpPanelOpen, setHelpPanelOpen] = useState(false);
  const [hamburgerMenuOpen, setHamburgerMenuOpen] = useState(false);
  const [selectedAccountId, setSelectedAccountId] = useState(null); // For account-filtered navigation
  const hamburgerRef = useRef(null);
  const [isCreatingBackup, setIsCreatingBackup] = useState(false);
  const [backupStatus, setBackupStatus] = useState('');
  const [notificationCenterOpen, setNotificationCenterOpen] = useState(false);
  const [notificationBadgeKey, setNotificationBadgeKey] = useState(0);

  // Function to refresh notification badge count
  const refreshNotificationBadge = () => {
    console.log('🔄 Refreshing notification badge count');
    setNotificationBadgeKey(prev => prev + 1);
  };

  // Create sample logs for testing (only once)
  useEffect(() => {
    const hasCreatedSampleLogs = sessionStorage.getItem('sampleLogsCreated');
    if (!hasCreatedSampleLogs) {
      // Basic logs
      logger.info('Dashboard loaded successfully');
      logger.debug('Dashboard state initialized', { activeTab, isLoaded });
      logger.warn('This is a sample warning message');
      logger.error('This is a sample error message for testing', { error: 'Sample error object' });
      logger.info('User session started', { timestamp: new Date().toISOString() });

      // Add some logs with artificial delays to test time filtering
      setTimeout(() => {
        logger.info('Database connection established', { database: 'SQLite', version: '3.x' });
        logger.debug('Loading user preferences', { theme: 'light', language: 'en' });
      }, 100);

      setTimeout(() => {
        logger.warn('Cache miss for user data', { userId: 'user123', operation: 'fetch' });
        logger.error('API timeout exceeded', { endpoint: '/api/transactions', timeout: 5000 });
      }, 200);

      setTimeout(() => {
        logger.info('Transaction processing completed', { count: 15, duration: '245ms' });
        logger.debug('Memory usage check', { heapUsed: '45MB', heapTotal: '67MB' });
      }, 300);

      // Test error capture systems
      setTimeout(() => {
        // Test console.error capture
        console.error('Test console.error - this should appear in logs');
        console.warn('Test console.warn - this should appear in logs');

        // Test unhandled promise rejection
        Promise.reject(new Error('Test unhandled promise rejection'));

        // Test manual error reporting
        try {
          throw new Error('Test manual error reporting');
        } catch (error) {
          logger.error('Caught and manually logged error', {
            originalError: error.message,
            stack: error.stack
          });
        }
      }, 500);

      // Clear this to test orphan rule detection
      sessionStorage.removeItem('sampleLogsCreated');
      sessionStorage.setItem('sampleLogsCreated', 'true');
    }
  }, []);

  // Helper function to handle tab navigation with scroll-to-top
  const handleTabNavigation = (tabName) => {
    setActiveTab(tabName);
    window.location.hash = tabName;
    localStorage.setItem('activeTab', tabName);
    
    // Clear selected account when navigating away from transactions (unless coming from account click)
    if (tabName !== 'transactions') {
      setSelectedAccountId(null);
    }
    
    // Scroll to top of the page when navigating to any tab
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: 'smooth'
    });
  };

  // Helper function for hamburger menu navigation
  const handleMenuNavigation = (tabName) => {
    handleTabNavigation(tabName);
    setHamburgerMenuOpen(false);
  };

  // Handle account click from overview to transactions with account filter
  const handleAccountClick = (accountId) => {
    setSelectedAccountId(accountId);
    handleTabNavigation('transactions');
  };

  // Quick backup function (same as in DataSettings)
  const createQuickBackup = async () => {
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
      const today = new Date();
      const year = today.getFullYear();
      const month = (today.getMonth() + 1).toString().padStart(2, '0');
      const day = today.getDate().toString().padStart(2, '0');
      const backupFileName = `financeflow-backup-${year}-${month}-${day}.zip`;
      
      a.href = url;
      a.download = backupFileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setBackupStatus(`${t('backupCreated')}: ${backupFileName}`);
      
      // Clear status after 3 seconds
      setTimeout(() => {
        setBackupStatus('');
      }, 3000);

    } catch (error) {
      console.error('Error creating backup:', error);
      setBackupStatus(`${t('backupError')}: ${error.message}`);
      
      // Clear error after 3 seconds
      setTimeout(() => {
        setBackupStatus('');
      }, 3000);
    } finally {
      setIsCreatingBackup(false);
    }
  };

  // Scroll to top when activeTab changes to overview
  useEffect(() => {
    if (activeTab === 'overview' && isLoaded) {
      window.scrollTo({
        top: 0,
        left: 0,
        behavior: 'smooth'
      });
    }
  }, [activeTab, isLoaded]);

  // Handle browser back/forward button navigation
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.slice(1);
      const validTabs = ['overview', 'transactions', 'add-transaction', 'data-management', 'budget-setup', 'analytics', 'database-migrations', 'test', 'test-dashboard', 'settings', 'import-transactions', 'reconciliation', 'reconciliation/existing'];
      if (validTabs.includes(hash)) {
        setActiveTab(hash);
        localStorage.setItem('activeTab', hash);
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Close hamburger menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (hamburgerMenuOpen) {
        const isHamburgerButton = event.target.closest('.hamburger-btn');
        const isDropdownItem = event.target.closest('.hamburger-dropdown');
        const shouldKeepOpen = isHamburgerButton || isDropdownItem;
        
        if (!shouldKeepOpen) {
          setHamburgerMenuOpen(false);
        }
      }
    };

    if (hamburgerMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [hamburgerMenuOpen]);

  if (loading) {
    return (
      <div className="dashboard loading">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>{t('loadingSystem')}</p>
        </div>
      </div>
    );
  }

  if (!isLoaded) {
    return <DatabaseSetup />;
  }

  return (
    <div className="dashboard">
      <nav className="dashboard-nav financeflow-nav">
        <div className="nav-brand">
          <Logo 
            variant="compact" 
            size="small" 
            theme="light" 
            clickable={true}
            onClick={resetToSetup}
          />
        </div>
        <div className="nav-buttons">
          <button 
            className={activeTab === 'overview' ? 'nav-btn active' : 'nav-btn'}
            onClick={() => handleTabNavigation('overview')}
          >
            <span>📈 {t('overview')}</span>
          </button>
          <button 
            className={activeTab === 'transactions' ? 'nav-btn active' : 'nav-btn'}
            onClick={() => handleTabNavigation('transactions')}
          >
            <span>💰 {t('transactions')}</span>
          </button>
          <button 
            className={activeTab === 'add-transaction' ? 'nav-btn active' : 'nav-btn'}
            onClick={() => handleTabNavigation('add-transaction')}
          >
            <span>➕ {t('addTransaction')}</span>
          </button>
          <button 
            className={activeTab === 'import-transactions' ? 'nav-btn active' : 'nav-btn'}
            onClick={() => handleTabNavigation('import-transactions')}
          >
            <span>📥 {t('importTransactions')}</span>
          </button>
          <button 
            className={activeTab === 'analytics' ? 'nav-btn active' : 'nav-btn'}
            onClick={() => handleTabNavigation('analytics')}
          >
            <span>📊 {t('analytics')}</span>
          </button>
        </div>
        <div className="nav-actions">
          <LogButton />
          {notificationService && (
            <NotificationBadge
              key={notificationBadgeKey}
              notificationService={notificationService}
              onClick={() => setNotificationCenterOpen(true)}
            />
          )}
          <button
            className={`backup-btn ${isCreatingBackup ? 'creating' : ''}`}
            onClick={createQuickBackup}
            disabled={isCreatingBackup || !database || !fileStorage}
            title={isCreatingBackup ? backupStatus : "Quick Backup"}
          >
            {isCreatingBackup ? '⏳' : '💾'}
          </button>
          <div className="hamburger-menu" ref={hamburgerRef}>
            <button
              className={`hamburger-btn ${hamburgerMenuOpen ? 'open' : ''}`}
              onClick={() => setHamburgerMenuOpen(!hamburgerMenuOpen)}
              title="Menu"
            >
              <span className="hamburger-line"></span>
              <span className="hamburger-line"></span>
              <span className="hamburger-line"></span>
            </button>
            
            {hamburgerMenuOpen && (
              <div className="hamburger-dropdown">
                <div className="menu-item" onClick={() => handleMenuNavigation('budget-setup')}>
                  <span className="menu-icon">💼</span>
                  <span className="menu-text">{t('budgetSetup')}</span>
                </div>
                <div className="menu-item" onClick={() => handleMenuNavigation('data-management')}>
                  <span className="menu-icon">🗂️</span>
                  <span className="menu-text">{t('dataManagement')}</span>
                </div>
                <div className="menu-item" onClick={() => handleMenuNavigation('reconciliation')}>
                  <span className="menu-icon">🔄</span>
                  <span className="menu-text">{t('reconciliation')}</span>
                </div>
                <div className="menu-separator"></div>
                <div className="menu-item" onClick={() => handleMenuNavigation('settings')}>
                  <span className="menu-icon">⚙️</span>
                  <span className="menu-text">{t('settings')}</span>
                </div>
                <div className="menu-separator"></div>
                <div className="menu-item" onClick={() => handleMenuNavigation('test-dashboard')}>
                  <span className="menu-icon">🧪</span>
                  <span className="menu-text">{t('testDashboard')}</span>
                </div>
                <div className="menu-item" onClick={() => handleMenuNavigation('database-migrations')}>
                  <span className="menu-icon">🔧</span>
                  <span className="menu-text">Database Migrations</span>
                </div>
                <div className="menu-separator"></div>
                <div className="menu-item" onClick={() => setHamburgerMenuOpen(false)}>
                  <span className="menu-icon">ℹ️</span>
                  <span className="menu-text">{t('about')}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </nav>

      <div className="dashboard-content">
        {activeTab === 'overview' && (
          <div className="overview-tab">
            <AccountSummary onAccountClick={handleAccountClick} />
          </div>
        )}

        {activeTab === 'transactions' && (
          <div className="transactions-tab">
            <TransactionList selectedAccountId={selectedAccountId} />
          </div>
        )}

        {activeTab === 'add-transaction' && (
          <div className="add-transaction-tab">
            <TransactionForm onSuccess={() => setActiveTab('transactions')} />
          </div>
        )}

        {activeTab === 'data-management' && (
          <div className="data-management-tab">
            <DataManagement />
          </div>
        )}

        {activeTab === 'test' && (
          <div className="test-tab">
            <Test />
          </div>
        )}
        {activeTab === 'test-dashboard' && (
          <div className="test-dashboard-tab">
            <TestDashboard />
          </div>
        )}
        {activeTab === 'settings' && (
          <div className="settings-tab">
            <Settings />
          </div>
        )}

        {activeTab === 'import-transactions' && (
          <div className="import-transactions-tab">
            <ImportTransactions />
          </div>
        )}

        {activeTab === 'reconciliation' && (
          <div className="reconciliation-tab">
            <ReconciliationPage />
          </div>
        )}

        {activeTab === 'reconciliation/existing' && (
          <div className="reconciliation-existing-tab">
            <ExistingReconciliationsPage />
          </div>
        )}

        {activeTab === 'budget-setup' && (
          <div className="budget-setup-tab">
            <BudgetSetup onNavigate={handleTabNavigation} />
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="analytics-tab">
            <AnalyticsMain onNavigate={handleTabNavigation} />
          </div>
        )}

        {activeTab === 'database-migrations' && (
          <div className="database-migrations-tab">
            <DatabaseMigrations />
          </div>
        )}
      </div>
      
      <HelpPanel 
        isOpen={helpPanelOpen} 
        onClose={() => setHelpPanelOpen(false)} 
      />
      
      {notificationService && (
        <NotificationCenter
          isOpen={notificationCenterOpen}
          onClose={() => setNotificationCenterOpen(false)}
          notificationService={notificationService}
          onNotificationChange={refreshNotificationBadge}
        />
      )}
      <LogModal />
    </div>
  );
};

export default Dashboard;