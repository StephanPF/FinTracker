import React, { useState } from 'react';
import { useAccounting } from '../contexts/AccountingContext';
import { useLanguage } from '../contexts/LanguageContext';
import AccountSummary from './AccountSummary';
import TransactionForm from './TransactionForm';
import TransactionList from './TransactionList';
import DatabaseSetup from './DatabaseSetup';
import DataManagement from './DataManagement';
import TodoPage from './TodoPage';

const Dashboard = () => {
  const { isLoaded, loading, resetToSetup } = useAccounting();
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState('overview');

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
      <nav className="dashboard-nav">
        <button 
          className="nav-btn back-btn"
          onClick={resetToSetup}
          title={t('backToSetup')}
        >
          <span>🏠</span>
        </button>
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
        <button 
          className={activeTab === 'todo' ? 'nav-btn active' : 'nav-btn'}
          onClick={() => setActiveTab('todo')}
        >
          <span>🎯 TODO</span>
        </button>
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
      </div>
    </div>
  );
};

export default Dashboard;