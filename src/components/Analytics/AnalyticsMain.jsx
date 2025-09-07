import React, { useState, useEffect, createContext, useContext } from 'react';
import { useAccounting } from '../../contexts/AccountingContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { createAnalyticsDataService } from '../../utils/analyticsDataService';
import ExpenseView from './ExpenseView/ExpenseView';
import CashflowView from './CashflowView/CashflowView';
import UserGuide from './UserGuide/UserGuide';
import './AnalyticsMain.css';

// Analytics Context for shared state management
const AnalyticsContext = createContext();

export const useAnalytics = () => {
  const context = useContext(AnalyticsContext);
  if (!context) {
    throw new Error('useAnalytics must be used within AnalyticsProvider');
  }
  return context;
};

const AnalyticsMain = ({ onNavigate }) => {
  const { 
    database, 
    fileStorage, 
    currencies, 
    getActiveCurrencies,
    getBaseCurrency,
    numberFormatService,
    getCurrencyFormatPreferences 
  } = useAccounting();
  const { t } = useLanguage();

  // Analytics state management
  const [currentView, setCurrentView] = useState('expense'); // 'expense', 'cashflow', or 'userguide'
  const [selectedPeriod, setSelectedPeriod] = useState('monthly'); // weekly, monthly, quarterly, yearly
  const [viewType, setViewType] = useState('cash'); // 'cash' or 'accrual'
  const [dateRange, setDateRange] = useState({
    startDate: getCurrentMonthStart(),
    endDate: getCurrentMonthEnd()
  });
  const [selectedAccounts, setSelectedAccounts] = useState('all');
  const [activeBudget, setActiveBudget] = useState(null);
  const [analyticsData, setAnalyticsData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Analytics data service instance
  const [analyticsService, setAnalyticsService] = useState(null);

  // Initialize analytics service
  useEffect(() => {
    if (database && fileStorage) {
      const service = createAnalyticsDataService(database, fileStorage);
      setAnalyticsService(service);
    }
  }, [database, fileStorage]);

  // Load active budget on component mount
  useEffect(() => {
    if (analyticsService) {
      loadActiveBudget();
    }
  }, [analyticsService]);

  // Reload data when filters change
  useEffect(() => {
    if (analyticsService) {
      loadAnalyticsData();
    }
  }, [analyticsService, selectedPeriod, viewType, dateRange, selectedAccounts]);

  /**
   * Load active budget for analytics
   */
  const loadActiveBudget = async () => {
    try {
      const budget = await analyticsService.getActiveBudgetForAnalytics();
      setActiveBudget(budget);
    } catch (error) {
      console.error('Error loading active budget:', error);
      setActiveBudget(null);
    }
  };

  /**
   * Load analytics data based on current filters
   */
  const loadAnalyticsData = async () => {
    if (!analyticsService) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const data = await analyticsService.getTransactionDataWithBudget(
        selectedPeriod,
        viewType,
        dateRange.startDate,
        dateRange.endDate
      );
      setAnalyticsData(data);
    } catch (error) {
      console.error('Error loading analytics data:', error);
      setError('Failed to load analytics data');
      setAnalyticsData(null);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle period selection change
   */
  const handlePeriodChange = (newPeriod) => {
    setSelectedPeriod(newPeriod);
    
    // Auto-adjust date range based on period selection
    const newDateRange = getDateRangeForPeriod(newPeriod);
    setDateRange(newDateRange);
  };

  /**
   * Handle view type toggle (Cash vs Accrual)
   */
  const handleViewTypeToggle = () => {
    setViewType(prev => prev === 'cash' ? 'accrual' : 'cash');
  };

  /**
   * Handle view change (Expense vs Cashflow)
   */
  const handleViewChange = (newView) => {
    setCurrentView(newView);
  };

  /**
   * Handle date range change
   */
  const handleDateRangeChange = (newDateRange) => {
    setDateRange(newDateRange);
  };

  /**
   * Get base currency for formatting (uses user-configured base currency)
   */
  const getAnalyticsBaseCurrency = () => {
    return getBaseCurrency() || getActiveCurrencies()[0];
  };

  /**
   * Format currency using site-wide formatting service
   */
  const formatCurrency = (amount, currencyId = null) => {
    try {
      if (!currencyId) {
        const baseCurrency = getAnalyticsBaseCurrency();
        currencyId = baseCurrency ? baseCurrency.id : 'CUR_001';
      }

      if (numberFormatService) {
        return numberFormatService.formatCurrency(amount, currencyId);
      }
      
      const currency = currencies.find(c => c.id === currencyId) || getAnalyticsBaseCurrency();
      return `${currency?.symbol || '$'}${parseFloat(amount || 0).toFixed(2)}`;
    } catch (error) {
      console.error('Error formatting currency:', error);
      const currency = getAnalyticsBaseCurrency();
      return `${currency?.symbol || '$'}${parseFloat(amount || 0).toFixed(2)}`;
    }
  };

  // Analytics context value
  const analyticsContextValue = {
    // State
    currentView,
    selectedPeriod,
    viewType,
    dateRange,
    selectedAccounts,
    activeBudget,
    analyticsData,
    loading,
    error,
    analyticsService,
    
    // Actions
    setCurrentView: handleViewChange,
    setSelectedPeriod: handlePeriodChange,
    setViewType: handleViewTypeToggle,
    setDateRange: handleDateRangeChange,
    setSelectedAccounts,
    loadAnalyticsData,
    
    // Utilities
    formatCurrency,
    getBaseCurrency: getAnalyticsBaseCurrency,
    database,
    t
  };

  if (!analyticsService) {
    return (
      <div className="analytics-loading">
        <p>{t('loadingAnalytics') || 'Loading Analytics...'}</p>
      </div>
    );
  }

  return (
    <AnalyticsContext.Provider value={analyticsContextValue}>
      <div className="analytics-main">
        {/* Analytics Header with Navigation */}
        <div className="analytics-header">
          {/* View Toggle */}
          <div className="analytics-view-toggle">
            <button 
              className={`view-toggle-btn ${currentView === 'expense' ? 'active' : ''}`}
              onClick={() => handleViewChange('expense')}
            >
              {t('expenseView') || 'Expense View'}
            </button>
            <button 
              className={`view-toggle-btn ${currentView === 'cashflow' ? 'active' : ''}`}
              onClick={() => handleViewChange('cashflow')}
            >
              {t('cashflowView') || 'Cashflow View'}
            </button>
            <button 
              className={`view-toggle-btn user-guide-btn ${currentView === 'userguide' ? 'active' : ''}`}
              onClick={() => handleViewChange('userguide')}
            >
              📖 {t('userGuide') || 'User Guide'}
            </button>
          </div>

          {/* Budget Indicator */}
          {activeBudget && (
            <div className="budget-indicator">
              <span className="budget-label">
                {t('usingBudget') || 'Using Budget'}:
              </span>
              <span className="budget-name">{activeBudget.name}</span>
              <span className={`budget-status status-${activeBudget.status}`}>
                {t(activeBudget.status) || activeBudget.status}
              </span>
            </div>
          )}

          {!activeBudget && (
            <div className="no-budget-warning">
              <span className="warning-icon">⚠️</span>
              <span className="warning-text">
                {t('noBudgetActive') || 'No active budget - set up a budget for better insights'}
              </span>
              <button 
                className="btn-setup-budget"
                onClick={() => onNavigate && onNavigate('budget-setup')}
              >
                {t('setupBudget') || 'Setup Budget'}
              </button>
            </div>
          )}
        </div>

        {/* Main Content Area */}
        <div className="analytics-content">
          {loading && (
            <div className="analytics-loading">
              <p>{t('loadingData') || 'Loading data...'}</p>
            </div>
          )}

          {error && (
            <div className="analytics-error">
              <p>{error}</p>
              <button onClick={loadAnalyticsData} className="btn-retry">
                {t('retry') || 'Retry'}
              </button>
            </div>
          )}

          {!loading && !error && (
            <div className="analytics-views">
              {currentView === 'expense' && (
                <ExpenseView onNavigate={onNavigate} />
              )}

              {currentView === 'cashflow' && (
                <CashflowView onNavigate={onNavigate} />
              )}

              {currentView === 'userguide' && (
                <UserGuide onNavigate={onNavigate} />
              )}
            </div>
          )}
        </div>
      </div>
    </AnalyticsContext.Provider>
  );
};

/**
 * Get current month start date
 */
function getCurrentMonthStart() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  return `${year}-${(month + 1).toString().padStart(2, '0')}-01`;
}

/**
 * Get current month end date
 */
function getCurrentMonthEnd() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const lastDay = new Date(year, month + 1, 0).getDate();
  return `${year}-${(month + 1).toString().padStart(2, '0')}-${lastDay.toString().padStart(2, '0')}`;
}

/**
 * Get date range for a specific period
 */
function getDateRangeForPeriod(period) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  switch (period) {
    case 'weekly':
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      return {
        startDate: formatDate(startOfWeek),
        endDate: formatDate(endOfWeek)
      };

    case 'monthly':
      return {
        startDate: `${year}-${(month + 1).toString().padStart(2, '0')}-01`,
        endDate: formatDate(new Date(year, month + 1, 0))
      };

    case 'quarterly':
      const quarterStart = Math.floor(month / 3) * 3;
      const quarterEnd = quarterStart + 2;
      return {
        startDate: `${year}-${(quarterStart + 1).toString().padStart(2, '0')}-01`,
        endDate: formatDate(new Date(year, quarterEnd + 1, 0))
      };

    case 'yearly':
      return {
        startDate: `${year}-01-01`,
        endDate: `${year}-12-31`
      };

    default:
      return {
        startDate: getCurrentMonthStart(),
        endDate: getCurrentMonthEnd()
      };
  }
}

/**
 * Format date to YYYY-MM-DD
 */
function formatDate(date) {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default AnalyticsMain;