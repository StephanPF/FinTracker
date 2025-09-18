import React, { useState, useEffect } from 'react';
import { useAnalytics } from '../AnalyticsMain';
import CashflowMetrics from './CashflowMetrics';
import WaterfallChart from './WaterfallChart';
import CashflowTrend from './CashflowTrend';
import PeriodSelector from '../Shared/PeriodSelector';
import ViewToggle from '../Shared/ViewToggle';
import FilterControls from '../Shared/FilterControls';
import BudgetIndicator from '../Shared/BudgetIndicator';
import './CashflowView.css';

/**
 * Cashflow View Main Component
 * Orchestrates all cashflow view widgets with budget integration
 * Follows BUILD_NEW_FEATURE_GUIDE.md compact design principles
 */
const CashflowView = ({ onNavigate }) => {
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
    activeFilterPanel,
    setActiveFilterPanel,
    t
  } = useAnalytics();

  // Cashflow view specific state
  const [cashflowData, setCashflowData] = useState(null);
  const [budgetSummary, setBudgetSummary] = useState(null);
  const [cashflowMetrics, setCashflowMetrics] = useState(null);
  const [waterfallData, setWaterfallData] = useState(null);
  const [patternAnalysis, setPatternAnalysis] = useState(null);
  const [showFilters, setShowFilters] = useState(false);

  // Load cashflow-specific data when analytics data changes
  useEffect(() => {
    if (analyticsService) {
      calculateCashflowMetrics();
    }
  }, [analyticsService, dateRange, viewType, activeBudget]);

  /**
   * Calculate cashflow-specific metrics and summaries
   */
  const calculateCashflowMetrics = async () => {
    try {
      if (!analyticsService) return;

      // Get income and expense totals for cashflow analysis
      const totals = analyticsService.getIncomeExpenseTotals(
        dateRange.startDate,
        dateRange.endDate,
        viewType
      );

      // Calculate net cashflow
      const netCashflow = totals.totalIncome - totals.totalExpenses;

      // Get budget comparison data if budget is active
      let budgetComparison = null;
      if (activeBudget && analyticsData && analyticsData.length > 0) {
        const budgetedCategories = analyticsData.filter(cat => cat.hasBudget);
        const totalBudgetedExpenses = budgetedCategories.reduce((sum, cat) => sum + cat.budgetAmount, 0);
        
        // For cashflow, we assume income meets expenses + some buffer
        const assumedIncome = totalBudgetedExpenses * 1.1; // 10% buffer
        const budgetedNetCashflow = assumedIncome - totalBudgetedExpenses;
        
        budgetComparison = {
          budgetedIncome: assumedIncome,
          budgetedExpenses: totalBudgetedExpenses,
          budgetedNetCashflow,
          actualIncome: totals.totalIncome,
          actualExpenses: totals.totalExpenses,
          actualNetCashflow: netCashflow,
          incomeVariance: totals.totalIncome - assumedIncome,
          expenseVariance: totals.totalExpenses - totalBudgetedExpenses,
          netCashflowVariance: netCashflow - budgetedNetCashflow,
          budgetAdherence: totalBudgetedExpenses > 0 ? (1 - (totals.totalExpenses / totalBudgetedExpenses)) * 100 : 0
        };
      }

      // Set cashflow metrics for the overview cards
      setCashflowMetrics({
        totalIncome: totals.totalIncome,
        totalExpenses: totals.totalExpenses,
        netCashflow,
        budgetComparison,
        cashflowStatus: netCashflow >= 0 ? 'positive' : 'negative'
      });

      // Generate waterfall chart data
      const waterfallChartData = generateWaterfallData(totals, budgetComparison);
      setWaterfallData(waterfallChartData);

      // Set budget summary for other components
      setBudgetSummary(budgetComparison);

      // Set cashflow data for trend analysis (simplified for Phase 4)
      setCashflowData({
        income: totals.totalIncome,
        expenses: totals.totalExpenses,
        netCashflow,
        period: selectedPeriod
      });

      // Generate advanced pattern analysis for Phase 5
      // Temporarily disabled to isolate error
      setPatternAnalysis(null);

    } catch (error) {
      console.error('Error calculating cashflow metrics:', error.message || error);
      console.error('Full error details:', error);
    }
  };

  /**
   * Generate waterfall chart data structure
   */
  const generateWaterfallData = (totals, budgetComparison) => {
    const waterfallSteps = [];
    
    // Starting balance (assume 0 for simplicity in Phase 4)
    waterfallSteps.push({
      label: 'Starting Balance',
      value: 0,
      type: 'start',
      cumulative: 0
    });

    // Income additions
    waterfallSteps.push({
      label: 'Total Income',
      value: totals.totalIncome,
      type: 'positive',
      cumulative: totals.totalIncome,
      budgetValue: budgetComparison?.budgetedIncome || null
    });

    // Expense deductions
    waterfallSteps.push({
      label: 'Total Expenses',
      value: -totals.totalExpenses,
      type: 'negative',
      cumulative: totals.totalIncome - totals.totalExpenses,
      budgetValue: budgetComparison ? -budgetComparison.budgetedExpenses : null
    });

    // Ending balance
    waterfallSteps.push({
      label: 'Ending Balance',
      value: totals.totalIncome - totals.totalExpenses,
      type: 'end',
      cumulative: totals.totalIncome - totals.totalExpenses,
      budgetValue: budgetComparison?.budgetedNetCashflow || null
    });

    return waterfallSteps;
  };

  /**
   * Handle filter panel toggle - only opens panels, doesn't close them
   */
  const handleToggleFilterPanel = (panelType) => {
    setActiveFilterPanel(panelType);
  };



  if (loading) {
    return (
      <div className="cashflow-view-loading">
        <div className="loading-content">
          <div className="loading-spinner"></div>
          <p>Loading cashflow data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="cashflow-view-error">
        <div className="error-content">
          <span className="error-icon">⚠️</span>
          <h3>Error Loading Data</h3>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="cashflow-view">
      {/* Cashflow View Header */}
      <div className="cashflow-view-header">
        <div className="header-title">
          <h2>Cashflow Analysis</h2>
          <p className="header-subtitle">
            Monitor income, expenses, and net cashflow with budget comparisons
          </p>
        </div>

        <div className="header-controls">
          <button
            onClick={() => handleToggleFilterPanel('time')}
            className={`btn-filter ${activeFilterPanel === 'time' ? 'active' : ''}`}
          >
            Time Period
          </button>

          <button
            onClick={() => handleToggleFilterPanel('view')}
            className={`btn-filter ${activeFilterPanel === 'view' ? 'active' : ''}`}
          >
            Cash vs Accrual
          </button>

          <button
            onClick={() => handleToggleFilterPanel('accounts')}
            className={`btn-filter ${activeFilterPanel === 'accounts' ? 'active' : ''}`}
          >
            Account Filters
          </button>

          <button
            onClick={() => handleToggleFilterPanel('budget')}
            className={`btn-filter ${activeFilterPanel === 'budget' ? 'active' : ''}`}
          >
            Budget
          </button>

        </div>
      </div>

      {/* Time Period Filter Panel */}
      {activeFilterPanel === 'time' && (
        <div className="cashflow-view-filters">
          <div className="filter-panel time-panel">
            <div className="filter-panel-header">
              <h4>Time Period Selection</h4>
              <button
                onClick={() => setActiveFilterPanel(null)}
                className="close-panel-btn"
              >
                ×
              </button>
            </div>
            <div className="filter-panel-content">
              <PeriodSelector />
            </div>
          </div>
        </div>
      )}

      {/* View Type Filter Panel */}
      {activeFilterPanel === 'view' && (
        <div className="cashflow-view-filters">
          <div className="filter-panel view-panel">
            <div className="filter-panel-header">
              <h4>View Type Settings</h4>
              <button
                onClick={() => setActiveFilterPanel(null)}
                className="close-panel-btn"
              >
                ×
              </button>
            </div>
            <div className="filter-panel-content">
              <ViewToggle />
            </div>
          </div>
        </div>
      )}

      {/* Account Filters Panel */}
      {activeFilterPanel === 'accounts' && (
        <div className="cashflow-view-filters">
          <div className="filter-panel accounts-panel">
            <div className="filter-panel-header">
              <h4>Account Filters</h4>
              <button
                onClick={() => setActiveFilterPanel(null)}
                className="close-panel-btn"
              >
                ×
              </button>
            </div>
            <div className="filter-panel-content">
              <FilterControls />
            </div>
          </div>
        </div>
      )}

      {/* Budget Panel */}
      {activeFilterPanel === 'budget' && (
        <div className="cashflow-view-filters">
          <div className="filter-panel budget-panel">
            <div className="filter-panel-header">
              <h4>Budget Settings</h4>
              <button
                onClick={() => setActiveFilterPanel(null)}
                className="close-panel-btn"
              >
                ×
              </button>
            </div>
            <div className="filter-panel-content">
              <BudgetIndicator onNavigate={onNavigate} />
            </div>
          </div>
        </div>
      )}


      {/* Main Content Grid */}
      <div className="cashflow-view-content">
        {/* Row 1: Cashflow Metrics Cards */}
        <div className="content-row metrics-row">
          <CashflowMetrics
            metrics={cashflowMetrics}
            activeBudget={activeBudget}
            formatCurrency={formatCurrency}
            selectedPeriod={selectedPeriod}
          />
        </div>

        {/* Row 2: Waterfall Chart */}
        <div className="content-row waterfall-row">
          <WaterfallChart
            waterfallData={waterfallData}
            activeBudget={activeBudget}
            formatCurrency={formatCurrency}
            selectedPeriod={selectedPeriod}
            onDrillDown={(data) => console.log('Drill down data:', data)}
          />
        </div>

        {/* Row 3: Cashflow Trend Analysis */}
        <div className="content-row trend-row">
          <CashflowTrend
            cashflowData={cashflowData}
            budgetSummary={budgetSummary}
            activeBudget={activeBudget}
            formatCurrency={formatCurrency}
            selectedPeriod={selectedPeriod}
          />
        </div>

      </div>

      {/* No Data State */}
      {!loading && !error && (!cashflowData || (cashflowData.income === 0 && cashflowData.expenses === 0)) && (
        <div className="cashflow-view-empty">
          <div className="empty-content">
            <span className="empty-icon">💰</span>
            <h3>No Cashflow Data</h3>
            <p>No income or expense transactions found for the selected period and filters.</p>
            <div className="empty-actions">
              <button onClick={() => onNavigate && onNavigate('transaction-form')} className="btn-primary">
                Add Transaction
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CashflowView;