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
import Logo from './Logo';

const Dashboard = () => {
  const { isLoaded, loading, resetToSetup } = useAccounting();
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState('overview');
  const [helpPanelOpen, setHelpPanelOpen] = useState(false);
  const [hamburgerMenuOpen, setHamburgerMenuOpen] = useState(false);
  const hamburgerRef = useRef(null);

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
            onClick={() => setActiveTab('overview')}
          >
            <span>📈 {t('overview')}</span>
          </button>
          <button 
            className={activeTab === 'transactions' ? 'nav-btn active' : 'nav-btn'}
            onClick={() => setActiveTab('transactions')}
          >
            <span>💰 {t('transactions')}</span>
          </button>
          <button 
            className={activeTab === 'add-transaction' ? 'nav-btn active' : 'nav-btn'}
            onClick={() => setActiveTab('add-transaction')}
          >
            <span>➕ {t('addTransaction')}</span>
          </button>
          <button 
            className={activeTab === 'data-management' ? 'nav-btn active' : 'nav-btn'}
            onClick={() => setActiveTab('data-management')}
          >
            <span>🗂️ {t('dataManagement')}</span>
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
                <div className="menu-item" onClick={() => {
                  setActiveTab('todo');
                  setHamburgerMenuOpen(false);
                }}>
                  <span className="menu-icon">🎯</span>
                  <span className="menu-text">TODO</span>
                </div>
                <div className="menu-item" onClick={() => {
                  setActiveTab('architecture');
                  setHamburgerMenuOpen(false);
                }}>
                  <span className="menu-icon">🏗️</span>
                  <span className="menu-text">{t('architecture')}</span>
                </div>
                <div className="menu-item" onClick={() => {
                  setActiveTab('stress-test');
                  setHamburgerMenuOpen(false);
                }}>
                  <span className="menu-icon">🧪</span>
                  <span className="menu-text">Stress Test</span>
                </div>
                <div className="menu-item" onClick={() => {
                  setActiveTab('settings');
                  setHamburgerMenuOpen(false);
                }}>
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
            <h2>{t('addNewTransaction')}</h2>
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
      </div>
      
      <HelpPanel 
        isOpen={helpPanelOpen} 
        onClose={() => setHelpPanelOpen(false)} 
      />
    </div>
  );
};

export default Dashboard;