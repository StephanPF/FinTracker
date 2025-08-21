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
      console.log('=== CLICK DEBUG ===');
      console.log('Menu is open:', hamburgerMenuOpen);
      console.log('Clicked element:', event.target);
      console.log('Element tag:', event.target.tagName);
      console.log('Element class:', event.target.className);
      console.log('Element id:', event.target.id);
      
      // Log the entire parent chain
      let parent = event.target;
      let level = 0;
      while (parent && level < 5) {
        console.log(`Parent ${level}:`, parent.tagName, parent.className);
        parent = parent.parentElement;
        level++;
      }
      
      if (hamburgerMenuOpen) {
        // Only keep the menu open if clicking EXACTLY on the hamburger button or dropdown items
        const isHamburgerButton = event.target.closest('.hamburger-btn');
        const isDropdownItem = event.target.closest('.hamburger-dropdown');
        
        console.log('Checks:');
        console.log('  - Is hamburger button:', !!isHamburgerButton);
        console.log('  - Is dropdown item:', !!isDropdownItem);
        
        // ONLY keep open if clicking the hamburger button or dropdown - close for everything else
        const shouldKeepOpen = isHamburgerButton || isDropdownItem;
        
        console.log('Should keep open:', shouldKeepOpen);
        
        if (!shouldKeepOpen) {
          console.log('🔴 CLOSING MENU - Outside click detected');
          setHamburgerMenuOpen(false);
        } else {
          console.log('🟢 KEEPING MENU OPEN - Inside hamburger area');
        }
      } else {
        console.log('Menu is closed, ignoring click');
      }
      console.log('=== END CLICK DEBUG ===\n');
    };

    if (hamburgerMenuOpen) {
      console.log('📡 Adding mousedown listener...');
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      console.log('📡 Menu closed, not adding listener');
    }

    return () => {
      console.log('🧹 Cleaning up mousedown listener');
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
                <div className="menu-item" onClick={() => setHamburgerMenuOpen(false)}>
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
            <div className="recent-transactions">
              <h3>{t('recentTransactions')}</h3>
              <TransactionList limit={5} />
            </div>
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
      </div>
      
      <HelpPanel 
        isOpen={helpPanelOpen} 
        onClose={() => setHelpPanelOpen(false)} 
      />
    </div>
  );
};

export default Dashboard;