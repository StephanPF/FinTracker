import React, { useState, useEffect, useRef } from 'react';
import { useAccounting } from '../contexts/AccountingContext';
import { useLanguage } from '../contexts/LanguageContext';
import AccountSummary from './AccountSummary';
import TransactionForm from './TransactionForm';
import TransactionList from './TransactionList';
import DatabaseSetup from './DatabaseSetup';
import DataManagement from './DataManagement';
import TodoPage from './TodoPage';
import HelpPanel from './HelpPanel';
import Architecture from './Architecture';
import Test from './Test';
import StressTest from './StressTest';
import Settings from './Settings';
import ImportTransactions from './ImportTransactions';
import ReconciliationPage from './ReconciliationPage';
import Logo from './Logo';

const Dashboard = () => {
  const { isLoaded, loading, resetToSetup } = useAccounting();
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState(() => {
    // Initialize activeTab from URL hash first, then localStorage as fallback
    const hash = window.location.hash.slice(1);
    const validTabs = ['overview', 'transactions', 'add-transaction', 'data-management', 'todo', 'architecture', 'test', 'stress-test', 'settings', 'import-transactions', 'reconciliation'];
    
    if (validTabs.includes(hash)) {
      return hash;
    }
    
    // Fallback to localStorage if no valid hash
    const savedTab = localStorage.getItem('activeTab');
    return (savedTab && validTabs.includes(savedTab)) ? savedTab : 'overview';
  });
  const [helpPanelOpen, setHelpPanelOpen] = useState(false);
  const [hamburgerMenuOpen, setHamburgerMenuOpen] = useState(false);
  const hamburgerRef = useRef(null);

  // Helper function to handle tab navigation with scroll-to-top
  const handleTabNavigation = (tabName) => {
    setActiveTab(tabName);
    window.location.hash = tabName;
    localStorage.setItem('activeTab', tabName);
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
      const validTabs = ['overview', 'transactions', 'add-transaction', 'data-management', 'todo', 'architecture', 'test', 'stress-test', 'settings', 'import-transactions', 'reconciliation'];
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
            className={activeTab === 'data-management' ? 'nav-btn active' : 'nav-btn'}
            onClick={() => handleTabNavigation('data-management')}
          >
            <span>🗂️ {t('dataManagement')}</span>
          </button>
          <button 
            className={activeTab === 'import-transactions' ? 'nav-btn active' : 'nav-btn'}
            onClick={() => handleTabNavigation('import-transactions')}
          >
            <span>📥 Import Transactions</span>
          </button>
          <button 
            className={activeTab === 'reconciliation' ? 'nav-btn active' : 'nav-btn'}
            onClick={() => handleTabNavigation('reconciliation')}
          >
            <span>🔄 Reconciliation</span>
          </button>
        </div>
        <div className="nav-actions">
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
                <div className="menu-item" onClick={() => handleMenuNavigation('todo')}>
                  <span className="menu-icon">🎯</span>
                  <span className="menu-text">TODO</span>
                </div>
                <div className="menu-item" onClick={() => handleMenuNavigation('architecture')}>
                  <span className="menu-icon">🏗️</span>
                  <span className="menu-text">{t('architecture')}</span>
                </div>
                <div className="menu-item" onClick={() => handleMenuNavigation('stress-test')}>
                  <span className="menu-icon">🧪</span>
                  <span className="menu-text">Stress Test</span>
                </div>
                <div className="menu-item" onClick={() => handleMenuNavigation('settings')}>
                  <span className="menu-icon">⚙️</span>
                  <span className="menu-text">Settings</span>
                </div>
                <div className="menu-item" onClick={() => setHamburgerMenuOpen(false)}>
                  <span className="menu-icon">📊</span>
                  <span className="menu-text">Reports</span>
                </div>
                <div className="menu-item" onClick={() => setHamburgerMenuOpen(false)}>
                  <span className="menu-icon">📥</span>
                  <span className="menu-text">Import/Export</span>
                </div>
                <div className="menu-item" onClick={() => setHamburgerMenuOpen(false)}>
                  <span className="menu-icon">ℹ️</span>
                  <span className="menu-text">About</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </nav>

      <div className="dashboard-content">
        {activeTab === 'overview' && (
          <div className="overview-tab">
            <AccountSummary />
          </div>
        )}

        {activeTab === 'transactions' && (
          <div className="transactions-tab">
            <TransactionList />
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

        {activeTab === 'todo' && (
          <div className="todo-tab">
            <TodoPage />
          </div>
        )}
        {activeTab === 'architecture' && (
          <div className="architecture-tab">
            <Architecture />
          </div>
        )}
        {activeTab === 'test' && (
          <div className="test-tab">
            <Test />
          </div>
        )}
        {activeTab === 'stress-test' && (
          <div className="stress-test-tab">
            <StressTest />
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
      </div>
      
      <HelpPanel 
        isOpen={helpPanelOpen} 
        onClose={() => setHelpPanelOpen(false)} 
      />
    </div>
  );
};

export default Dashboard;