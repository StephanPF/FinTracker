import React, { useState, useEffect } from 'react';
import { useAnalytics } from '../AnalyticsMain';
import OverviewCards from './OverviewCards';
import CategoryBreakdown from './CategoryBreakdown';
import BudgetStatusBreakdown from './BudgetStatusBreakdown';
import BudgetProgress from './BudgetProgress';
import TrendLines from './TrendLines';
import TransactionTable from './TransactionTable';
import BudgetAnalysisPanel from './BudgetAnalysisPanel';
import PeriodSelector from '../Shared/PeriodSelector';
import ViewToggle from '../Shared/ViewToggle';
import FilterControls from '../Shared/FilterControls';
import BudgetIndicator from '../Shared/BudgetIndicator';
import './ExpenseView.css';

/**
 * Expense View Main Component
 * Orchestrates all expense view widgets with budget integration
 * Follows BUILD_NEW_FEATURE_GUIDE.md compact design principles
 */
const ExpenseView = ({ onNavigate }) => {
  const {
    analyticsData,
    activeBudget,
    selectedPeriod,
    viewType,
    dateRange,
    loading,
    error,
    loadAnalyticsData,
    analyticsService,
    formatCurrency,
    t
  } = useAnalytics();

  // Expense view specific state
  const [expenseData, setExpenseData] = useState(null);
  const [budgetSummary, setBudgetSummary] = useState(null);
  const [overviewMetrics, setOverviewMetrics] = useState(null);
  const [showFilters, setShowFilters] = useState(false);

  // Load expense-specific data when analytics data changes
  useEffect(() => {
    if (analyticsData && analyticsService) {
      calculateExpenseMetrics();
    }
  }, [analyticsData, analyticsService, activeBudget]);

  /**
   * Calculate expense-specific metrics and summaries
   */
  const calculateExpenseMetrics = async () => {
    try {
      if (!analyticsService || !analyticsData) return;

      // Get income/expense totals for overview
      const totals = analyticsService.getIncomeExpenseTotals(
        dateRange.startDate,
        dateRange.endDate,
        viewType
      );

      // Get largest expense
      const largestExpense = analyticsService.getLargestExpense(
        dateRange.startDate,
        dateRange.endDate
      );

      // Calculate budget metrics if budget is active
      let budgetMetrics = null;
      if (activeBudget && analyticsData.length > 0) {
        const budgetedCategories = analyticsData.filter(cat => cat.hasBudget);
        const totalBudgeted = budgetedCategories.reduce((sum, cat) => sum + cat.budgetAmount, 0);
        const totalSpent = budgetedCategories.reduce((sum, cat) => sum + cat.actualSpent, 0);
        const budgetRemaining = totalBudgeted - totalSpent;
        const budgetVariance = totalSpent - totalBudgeted;
        const budgetVariancePercentage = totalBudgeted > 0 ? (budgetVariance / totalBudgeted) * 100 : 0;

        budgetMetrics = {
          totalBudgeted,
          totalSpent,
          budgetRemaining,
          budgetVariance,
          budgetVariancePercentage,
          isOverBudget: budgetVariance > 0,
          categoriesWithBudget: budgetedCategories.length,
          categoriesOverBudget: budgetedCategories.filter(cat => cat.variance > 0).length
        };
      }

      // Set overview metrics
      setOverviewMetrics({
        totalExpenses: totals.totalExpenses,
        largestExpense,
        budgetMetrics
      });

      // Set expense data for charts
      setExpenseData(analyticsData.filter(cat => cat.actualSpent > 0));

      // Set budget summary
      setBudgetSummary(budgetMetrics);

    } catch (error) {
      console.error('Error calculating expense metrics:', error);
    }
  };

  /**
   * Handle filter toggle
   */
  const handleToggleFilters = () => {
    setShowFilters(!showFilters);
  };

  /**
   * Handle data refresh
   */
  const handleRefreshData = () => {
    loadAnalyticsData();
  };

  if (loading) {
    return (
      <div className="expense-view-loading">
        <div className="loading-content">
          <div className="loading-spinner"></div>
          <p>Loading expense data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="expense-view-error">
        <div className="error-content">
          <span className="error-icon">⚠️</span>
          <h3>Error Loading Data</h3>
          <p>{error}</p>
          <button onClick={handleRefreshData} className="btn-primary">
            Retry Loading
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="expense-view">
      {/* Expense View Header */}
      <div className="expense-view-header">
        <div className="header-title">
          <h2>Expense Analysis</h2>
          <p className="header-subtitle">
            Comprehensive view of your spending patterns and budget performance
          </p>
        </div>

        <div className="header-controls">
          <button
            onClick={handleToggleFilters}
            className={`btn-filter ${showFilters ? 'active' : ''}`}
          >
            Filters
            <span className="filter-count">
              {analyticsData ? analyticsData.length : 0}
            </span>
          </button>
        </div>
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <div className="expense-view-filters">
          <div className="filters-grid">
            <div className="filter-column">
              <PeriodSelector />
            </div>
            <div className="filter-column">
              <ViewToggle />
            </div>
            <div className="filter-column">
              <FilterControls />
            </div>
            <div className="filter-column">
              <BudgetIndicator onNavigate={onNavigate} />
            </div>
          </div>
        </div>
      )}

      {/* Main Content Grid */}
      <div className="expense-view-content">
        {/* Row 1: Overview Cards */}
        <div className="content-row overview-row">
          <OverviewCards 
            metrics={overviewMetrics}
            activeBudget={activeBudget}
            formatCurrency={formatCurrency}
            selectedPeriod={selectedPeriod}
          />
        </div>

        {/* Row 2: Main Charts Split Layout - Two Expense Breakdowns */}
        <div className="content-row charts-row">
          {/* Category Breakdown (Transaction Group Colors) - 50% width */}
          <div className="chart-container category-container">
            <CategoryBreakdown
              expenseData={expenseData}
              activeBudget={activeBudget}
              formatCurrency={formatCurrency}
            />
          </div>

          {/* Budget Status Breakdown (Budget Status Colors) - 50% width */}
          <div className="chart-container budget-status-container">
            <BudgetStatusBreakdown
              expenseData={expenseData}
              activeBudget={activeBudget}
              formatCurrency={formatCurrency}
            />
          </div>
        </div>

        {/* Row 3: Trend Analysis and Budget Progress */}
        <div className="content-row trend-row">
          {/* Trend Lines - 60% width */}
          <div className="trend-container">
            <TrendLines
              expenseData={expenseData}
              activeBudget={activeBudget}
              selectedPeriod={selectedPeriod}
              formatCurrency={formatCurrency}
            />
          </div>

          {/* Budget Progress - 40% width */}
          <div className="budget-progress-container">
            <BudgetProgress
              analyticsData={analyticsData}
              activeBudget={activeBudget}
              budgetSummary={budgetSummary}
              formatCurrency={formatCurrency}
              selectedPeriod={selectedPeriod}
            />
          </div>
        </div>

        {/* Row 4: Transaction Details and Budget Analysis */}
        <div className="content-row details-row">
          {/* Transaction Table - 60% width */}
          <div className="details-container transaction-container">
            <TransactionTable
              expenseData={expenseData}
              activeBudget={activeBudget}
              formatCurrency={formatCurrency}
            />
          </div>

          {/* Budget Analysis Panel - 40% width */}
          <div className="details-container analysis-container">
            <BudgetAnalysisPanel
              expenseData={expenseData}
              activeBudget={activeBudget}
              budgetSummary={budgetSummary}
              formatCurrency={formatCurrency}
              selectedPeriod={selectedPeriod}
            />
          </div>
        </div>
      </div>

      {/* No Data State */}
      {!loading && !error && (!expenseData || expenseData.length === 0) && (
        <div className="expense-view-empty">
          <div className="empty-content">
            <span className="empty-icon">📊</span>
            <h3>No Expense Data</h3>
            <p>No expense transactions found for the selected period and filters.</p>
            <div className="empty-actions">
              <button onClick={() => onNavigate && onNavigate('transaction-form')} className="btn-primary">
                Add Transaction
              </button>
              <button onClick={handleRefreshData} className="btn-secondary">
                Adjust Filters
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExpenseView;