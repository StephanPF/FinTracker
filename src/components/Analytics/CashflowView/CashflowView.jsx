import React, { useState, useEffect } from 'react';
import { useAnalytics } from '../AnalyticsMain';
import CashflowMetrics from './CashflowMetrics';
import WaterfallChart from './WaterfallChart';
import CashflowTrend from './CashflowTrend';
import CashflowCalendar from './CashflowCalendar';
import BudgetForecast from './BudgetForecast';
import PeriodSelector from '../Shared/PeriodSelector';
import ViewToggle from '../Shared/ViewToggle';
import FilterControls from '../Shared/FilterControls';
import BudgetIndicator from '../Shared/BudgetIndicator';
import AdvancedFilters from '../Shared/AdvancedFilters';
import { analyzeSpendingPatterns } from '../../../utils/patternAnalysis';
import { exportCashflowReport, exportTransactionsWithBudget } from '../../../utils/analyticsExport';
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
    t
  } = useAnalytics();

  // Cashflow view specific state
  const [cashflowData, setCashflowData] = useState(null);
  const [budgetSummary, setBudgetSummary] = useState(null);
  const [cashflowMetrics, setCashflowMetrics] = useState(null);
  const [waterfallData, setWaterfallData] = useState(null);
  const [patternAnalysis, setPatternAnalysis] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [activeFilters, setActiveFilters] = useState({});
  const [currentView, setCurrentView] = useState('overview'); // 'overview', 'calendar', 'forecast', 'patterns'
  const [exportLoading, setExportLoading] = useState(false);

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
      const allTransactions = await analyticsService.getTransactionsForPeriod(
        dateRange.startDate,
        dateRange.endDate,
        viewType
      );
      
      const patterns = analyzeSpendingPatterns(allTransactions, activeBudget, dateRange);
      setPatternAnalysis(patterns);

    } catch (error) {
      console.error('Error calculating cashflow metrics:', error);
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

  /**
   * Handle export functionality
   */
  const handleExport = async (format = 'json') => {
    if (!analyticsService) return;

    setExportLoading(true);
    try {
      // Gather all analytics data for export
      const allTransactions = await analyticsService.getTransactionsForPeriod(
        dateRange.startDate,
        dateRange.endDate,
        viewType
      );

      const exportData = {
        dateRange,
        selectedPeriod,
        activeBudget,
        formatCurrency,
        transactions: allTransactions,
        metrics: cashflowMetrics,
        waterfallData,
        calendarData: null, // Would be loaded by CashflowCalendar
        forecastData: null, // Would be loaded by BudgetForecast
        patternAnalysis
      };

      let result;
      if (format === 'transactions') {
        result = exportTransactionsWithBudget(allTransactions, activeBudget, {
          filename: `cashflow-transactions-${dateRange.startDate}.csv`
        });
      } else {
        result = await exportCashflowReport(exportData, {
          format: format,
          filename: `cashflow-report-${dateRange.startDate}.${format}`
        });
      }

      if (result.success) {
        // Show success message - you might want to use a proper notification system
        console.log('Export successful:', result.message);
      } else {
        console.error('Export failed:', result.message);
      }

    } catch (error) {
      console.error('Export error:', error);
    } finally {
      setExportLoading(false);
    }
  };

  /**
   * Handle advanced filter changes
   */
  const handleFiltersChange = (newFilters) => {
    setActiveFilters(newFilters);
    // Here you would apply the filters to your data
    // This might trigger a reload of calculateCashflowMetrics with filtered data
  };

  /**
   * Handle view change
   */
  const handleViewChange = (newView) => {
    setCurrentView(newView);
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
          <button onClick={handleRefreshData} className="btn-primary">
            Retry Loading
          </button>
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
          {/* View Toggle */}
          <div className="view-toggle-buttons">
            <button
              onClick={() => handleViewChange('overview')}
              className={`view-btn ${currentView === 'overview' ? 'active' : ''}`}
            >
              Overview
            </button>
            <button
              onClick={() => handleViewChange('calendar')}
              className={`view-btn ${currentView === 'calendar' ? 'active' : ''}`}
            >
              Calendar
            </button>
            <button
              onClick={() => handleViewChange('forecast')}
              className={`view-btn ${currentView === 'forecast' ? 'active' : ''}`}
            >
              Forecast
            </button>
          </div>

          {/* Filter Controls */}
          <button
            onClick={handleToggleFilters}
            className={`btn-filter ${showFilters ? 'active' : ''}`}
          >
            Filters
            <span className="filter-count">
              {Object.keys(activeFilters).length || '0'}
            </span>
          </button>

          <button
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            className={`btn-advanced-filter ${showAdvancedFilters ? 'active' : ''}`}
          >
            Advanced
          </button>

          {/* Export Controls */}
          <div className="export-dropdown">
            <button className="btn-export" disabled={exportLoading}>
              {exportLoading ? 'Exporting...' : 'Export'}
            </button>
            <div className="export-options">
              <button onClick={() => handleExport('json')}>Export JSON</button>
              <button onClick={() => handleExport('csv')}>Export CSV</button>
              <button onClick={() => handleExport('transactions')}>Export Transactions</button>
            </div>
          </div>
          
          <button onClick={handleRefreshData} className="btn-secondary">
            Refresh
          </button>
        </div>
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <div className="cashflow-view-filters">
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

      {/* Advanced Filter Panel */}
      {showAdvancedFilters && (
        <div className="cashflow-view-advanced-filters">
          <AdvancedFilters 
            onFiltersChange={handleFiltersChange}
            initialFilters={activeFilters}
          />
        </div>
      )}

      {/* Main Content Grid */}
      <div className="cashflow-view-content">
        {/* Overview View */}
        {currentView === 'overview' && (
          <>
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
          </>
        )}

        {/* Calendar View */}
        {currentView === 'calendar' && (
          <div className="content-row calendar-row">
            <CashflowCalendar
              selectedPeriod={selectedPeriod}
              dateRange={dateRange}
              onNavigate={onNavigate}
            />
          </div>
        )}

        {/* Forecast View */}
        {currentView === 'forecast' && (
          <div className="content-row forecast-row">
            <BudgetForecast
              selectedPeriod={selectedPeriod}
              dateRange={dateRange}
              onNavigate={onNavigate}
            />
          </div>
        )}
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

export default CashflowView;