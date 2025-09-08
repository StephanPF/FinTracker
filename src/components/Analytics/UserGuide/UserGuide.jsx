import React, { useState } from 'react';
import { useAnalytics } from '../AnalyticsMain';
import './UserGuide.css';

/**
 * UserGuide Component
 * Comprehensive documentation for Analytics features including Expense and Cashflow views
 * Follows BUILD_NEW_FEATURE_GUIDE.md compact design principles
 */
const UserGuide = ({ onNavigate }) => {
  const { t } = useAnalytics();
  
  // State for expandable sections
  const [expandedSections, setExpandedSections] = useState({
    overview: true,
    expense: false,
    cashflow: false,
    networth: false,
    navigation: false,
    features: false,
    troubleshooting: false
  });

  /**
   * Toggle section expansion
   */
  const toggleSection = (sectionId) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }));
  };

  /**
   * Expand all sections
   */
  const expandAll = () => {
    setExpandedSections({
      overview: true,
      expense: true,
      cashflow: true,
      networth: true,
      navigation: true,
      features: true,
      troubleshooting: true
    });
  };

  /**
   * Collapse all sections
   */
  const collapseAll = () => {
    setExpandedSections({
      overview: false,
      expense: false,
      cashflow: false,
      networth: false,
      navigation: false,
      features: false,
      troubleshooting: false
    });
  };

  return (
    <div className="user-guide">
      {/* Header */}
      <div className="user-guide-header">
        <div className="header-content">
          <h2 className="guide-title">
            📖 {t('analyticsUserGuide') || 'Analytics User Guide'}
          </h2>
          <p className="guide-subtitle">
            {t('userGuideSubtitle') || 'Complete guide to understanding and using the Expense and Cashflow Analytics views'}
          </p>
        </div>
        
        <div className="header-actions">
          <button onClick={expandAll} className="btn-expand-all">
            {t('expandAll') || 'Expand All'}
          </button>
          <button onClick={collapseAll} className="btn-collapse-all">
            {t('collapseAll') || 'Collapse All'}
          </button>
        </div>
      </div>

      {/* Table of Contents */}
      <div className="table-of-contents">
        <h3>{t('tableOfContents') || 'Table of Contents'}</h3>
        <ul className="toc-list">
          <li><a href="#overview" onClick={(e) => {e.preventDefault(); toggleSection('overview');}}>1. {t('overview') || 'Overview'}</a></li>
          <li><a href="#expense-view" onClick={(e) => {e.preventDefault(); toggleSection('expense');}}>2. {t('expenseView') || 'Expense View'}</a></li>
          <li><a href="#cashflow-view" onClick={(e) => {e.preventDefault(); toggleSection('cashflow');}}>3. {t('cashflowView') || 'Cashflow View'}</a></li>
          <li><a href="#networth-view" onClick={(e) => {e.preventDefault(); toggleSection('networth');}}>4. {t('networthView') || 'Net Worth View'}</a></li>
          <li><a href="#navigation" onClick={(e) => {e.preventDefault(); toggleSection('navigation');}}>5. {t('navigationFiltering') || 'Navigation & Filtering'}</a></li>
          <li><a href="#advanced-features" onClick={(e) => {e.preventDefault(); toggleSection('features');}}>6. {t('advancedFeatures') || 'Advanced Features'}</a></li>
          <li><a href="#troubleshooting" onClick={(e) => {e.preventDefault(); toggleSection('troubleshooting');}}>7. {t('troubleshooting') || 'Troubleshooting'}</a></li>
        </ul>
      </div>

      {/* Guide Sections */}
      <div className="guide-content">
        {/* 1. Overview Section */}
        <div className="guide-section" id="overview">
          <div 
            className="section-header" 
            onClick={() => toggleSection('overview')}
          >
            <h3>
              <span className={`expand-icon ${expandedSections.overview ? 'expanded' : ''}`}>▶</span>
              1. {t('overview') || 'Overview'}
            </h3>
          </div>
          {expandedSections.overview && (
            <div className="section-content">
              <p>{t('guideOverviewIntro') || 'The Analytics system provides two main views for analyzing your financial data:'}</p>
              
              <div className="overview-cards">
                <div className="overview-card expense-card">
                  <div className="card-icon">📊</div>
                  <div className="card-content">
                    <h4>{t('expenseView') || 'Expense View'}</h4>
                    <p>{t('expenseViewDescription') || 'Detailed analysis of spending patterns, budget comparisons, and category breakdowns. Perfect for understanding where your money goes and tracking budget adherence.'}</p>
                  </div>
                </div>
                
                <div className="overview-card cashflow-card">
                  <div className="card-icon">💰</div>
                  <div className="card-content">
                    <h4>{t('cashflowView') || 'Cashflow View'}</h4>
                    <p>{t('cashflowViewDescription') || 'Comprehensive cashflow analysis including income vs expenses, waterfall charts, trend analysis, and forecasting. Ideal for understanding financial health and predicting future outcomes.'}</p>
                  </div>
                </div>
              </div>

              <div className="key-concepts">
                <h4>{t('keyConcepts') || 'Key Concepts'}</h4>
                <ul>
                  <li><strong>{t('budgetIntegration') || 'Budget Integration'}:</strong> {t('budgetIntegrationDesc') || 'Both views integrate with your active budget to show planned vs actual spending'}</li>
                  <li><strong>{t('patternAnalysis') || 'Pattern Analysis'}:</strong> {t('patternAnalysisDesc') || 'Advanced algorithms identify spending patterns, recurring transactions, and anomalies'}</li>
                  <li><strong>{t('interactiveCharts') || 'Interactive Charts'}:</strong> {t('interactiveChartsDesc') || 'Click on chart elements to drill down into detailed transaction data'}</li>
                  <li><strong>{t('realTimeFiltering') || 'Real-time Filtering'}:</strong> {t('realTimeFilteringDesc') || 'Apply filters instantly to focus on specific time periods, categories, or transaction types'}</li>
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* 2. Expense View Section */}
        <div className="guide-section" id="expense-view">
          <div 
            className="section-header" 
            onClick={() => toggleSection('expense')}
          >
            <h3>
              <span className={`expand-icon ${expandedSections.expense ? 'expanded' : ''}`}>▶</span>
              2. {t('expenseView') || 'Expense View'}
            </h3>
          </div>
          {expandedSections.expense && (
            <div className="section-content">
              <p>{t('expenseViewIntro') || 'The Expense View focuses on analyzing your spending patterns, comparing against budgets, and understanding category-wise expenses.'}</p>
              
              <div className="component-guide">
                <div className="component-item">
                  <h4>📈 {t('expenseMetrics') || 'Expense Metrics Cards'}</h4>
                  <p>{t('expenseMetricsDesc') || 'Overview cards showing total spending, budget variance, top categories, and trend indicators. Each card displays current period data with comparison to previous periods.'}</p>
                  <div className="feature-list">
                    <ul>
                      <li>{t('totalSpendingCard') || 'Total Spending: Shows period total with trend arrow'}</li>
                      <li>{t('budgetVarianceCard') || 'Budget Variance: Displays over/under budget amount and percentage'}</li>
                      <li>{t('topCategoryCard') || 'Top Category: Highlights your highest spending category'}</li>
                      <li>{t('transactionCountCard') || 'Transaction Count: Number of expense transactions in period'}</li>
                    </ul>
                  </div>
                </div>

                <div className="component-item">
                  <h4>🍕 {t('categoryBreakdown') || 'Category Breakdown Chart'}</h4>
                  <p>{t('categoryBreakdownDesc') || 'Interactive pie or donut chart showing spending distribution across categories. Click on segments to see detailed breakdowns.'}</p>
                  <div className="feature-list">
                    <ul>
                      <li>{t('clickToExpand') || 'Click segments to expand subcategory details'}</li>
                      <li>{t('budgetComparisonColors') || 'Color coding indicates budget adherence (green=under, red=over)'}</li>
                      <li>{t('percentageLabels') || 'Percentage labels show category contribution to total spending'}</li>
                    </ul>
                  </div>
                </div>

                <div className="component-item">
                  <h4>📊 {t('spendingTrend') || 'Spending Trend Analysis'}</h4>
                  <p>{t('spendingTrendDesc') || 'Time-series chart showing spending patterns over time with budget comparison lines and trend identification.'}</p>
                  <div className="feature-list">
                    <ul>
                      <li>{t('multipleTimeframes') || 'Switch between daily, weekly, monthly views'}</li>
                      <li>{t('budgetOverlays') || 'Budget target lines overlay actual spending'}</li>
                      <li>{t('seasonalPatterns') || 'Automatic detection of seasonal spending patterns'}</li>
                      <li>{t('anomaliesHighlighted') || 'Unusual spending spikes are highlighted'}</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="usage-tips">
                <h4>{t('expenseViewTips') || 'Usage Tips'}</h4>
                <ul>
                  <li>{t('expenseTip1') || 'Use period filters to compare spending across different timeframes'}</li>
                  <li>{t('expenseTip2') || 'Click on chart elements to drill down into transaction details'}</li>
                  <li>{t('expenseTip3') || 'Set up budgets for better variance analysis and spending alerts'}</li>
                  <li>{t('expenseTip4') || 'Export data for external analysis or record keeping'}</li>
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* 3. Cashflow View Section */}
        <div className="guide-section" id="cashflow-view">
          <div 
            className="section-header" 
            onClick={() => toggleSection('cashflow')}
          >
            <h3>
              <span className={`expand-icon ${expandedSections.cashflow ? 'expanded' : ''}`}>▶</span>
              3. {t('cashflowView') || 'Cashflow View'}
            </h3>
          </div>
          {expandedSections.cashflow && (
            <div className="section-content">
              <p>{t('cashflowViewIntro') || 'The Cashflow View provides comprehensive analysis of money movement, combining income and expenses to show net financial position and future projections.'}</p>
              
              <div className="view-modes">
                <h4>{t('viewModes') || 'View Modes'}</h4>
                <div className="mode-tabs">
                  <div className="mode-tab">
                    <strong>{t('overviewMode') || 'Overview Mode'}</strong>
                    <p>{t('overviewModeDesc') || 'Main dashboard with metrics, waterfall chart, and trend analysis'}</p>
                  </div>
                  <div className="mode-tab">
                    <strong>{t('calendarMode') || 'Calendar Mode'}</strong>
                    <p>{t('calendarModeDesc') || 'Daily heatmap showing cashflow patterns throughout the month'}</p>
                  </div>
                  <div className="mode-tab">
                    <strong>{t('forecastMode') || 'Forecast Mode'}</strong>
                    <p>{t('forecastModeDesc') || 'Predictive analysis with budget projections and recommendations'}</p>
                  </div>
                </div>
              </div>

              <div className="component-guide">
                <div className="component-item">
                  <h4>💰 {t('cashflowMetrics') || 'Cashflow Metrics Cards'}</h4>
                  <p>{t('cashflowMetricsDesc') || 'Key financial health indicators including net cashflow, income vs expenses, and budget performance.'}</p>
                  <div className="feature-list">
                    <ul>
                      <li>{t('netCashflowCard') || 'Net Cashflow: Income minus expenses with trend indicator'}</li>
                      <li>{t('incomeCard') || 'Total Income: Period income with growth comparison'}</li>
                      <li>{t('expenseCard') || 'Total Expenses: Period expenses with budget comparison'}</li>
                      <li>{t('cashflowStatusCard') || 'Cashflow Status: Health indicator (positive/negative/stable)'}</li>
                    </ul>
                  </div>
                </div>

                <div className="component-item">
                  <h4>📊 {t('waterfallChart') || 'Waterfall Chart'}</h4>
                  <p>{t('waterfallChartDesc') || 'Visual representation of how money flows from starting balance through income and expenses to ending balance.'}</p>
                  <div className="feature-list">
                    <ul>
                      <li>{t('interactiveSegments') || 'Click segments to see detailed transaction breakdowns'}</li>
                      <li>{t('budgetComparisons') || 'Budget target lines show planned vs actual amounts'}</li>
                      <li>{t('cumulativeView') || 'Cumulative view shows running balance changes'}</li>
                      <li>{t('colorCoding') || 'Color coding: Green=income, Red=expenses, Blue=net result'}</li>
                    </ul>
                  </div>
                </div>

                <div className="component-item">
                  <h4>📈 {t('cashflowTrend') || 'Cashflow Trend Analysis'}</h4>
                  <p>{t('cashflowTrendDesc') || 'Time-series analysis showing cashflow patterns, seasonal variations, and predictive trends.'}</p>
                  <div className="feature-list">
                    <ul>
                      <li>{t('trendLines') || 'Trend lines show cashflow direction and velocity'}</li>
                      <li>{t('seasonalAnalysis') || 'Seasonal pattern detection for better planning'}</li>
                      <li>{t('volatilityIndicators') || 'Volatility indicators highlight cashflow stability'}</li>
                      <li>{t('correlationAnalysis') || 'Correlation analysis between income and expense patterns'}</li>
                    </ul>
                  </div>
                </div>

                <div className="component-item">
                  <h4>📅 {t('cashflowCalendar') || 'Cashflow Calendar'}</h4>
                  <p>{t('cashflowCalendarDesc') || 'Daily heatmap visualization showing cashflow intensity and patterns throughout the month.'}</p>
                  <div className="feature-list">
                    <ul>
                      <li>{t('heatmapVisualization') || 'Color intensity indicates cashflow amount (red=negative, green=positive)'}</li>
                      <li>{t('paymentPatterns') || 'Identifies recurring payment dates and income cycles'}</li>
                      <li>{t('weekendAnalysis') || 'Shows weekend vs weekday spending patterns'}</li>
                      <li>{t('budgetHotspots') || 'Highlights days with significant budget variances'}</li>
                    </ul>
                  </div>
                </div>

                <div className="component-item">
                  <h4>🔮 {t('budgetForecast') || 'Budget Forecast'}</h4>
                  <p>{t('budgetForecastDesc') || 'Predictive analysis showing projected budget performance with multiple scenarios and recommendations.'}</p>
                  <div className="feature-list">
                    <ul>
                      <li>{t('threeScenarios') || 'Three scenarios: Optimistic, Current Trend, Pessimistic'}</li>
                      <li>{t('confidenceScores') || 'Confidence scores indicate prediction reliability'}</li>
                      <li>{t('actionableRecommendations') || 'Actionable recommendations for budget adjustments'}</li>
                      <li>{t('earlyWarnings') || 'Early warning system for potential budget overruns'}</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="usage-tips">
                <h4>{t('cashflowViewTips') || 'Usage Tips'}</h4>
                <ul>
                  <li>{t('cashflowTip1') || 'Use Calendar view to identify optimal spending and saving days'}</li>
                  <li>{t('cashflowTip2') || 'Monitor Forecast view for early budget adjustment opportunities'}</li>
                  <li>{t('cashflowTip3') || 'Click on waterfall segments to understand cashflow drivers'}</li>
                  <li>{t('cashflowTip4') || 'Export cashflow reports for financial planning and tax preparation'}</li>
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* 4. Net Worth View Section */}
        <div className="guide-section" id="networth-view">
          <div 
            className="section-header" 
            onClick={() => toggleSection('networth')}
          >
            <h3>
              <span className={`expand-icon ${expandedSections.networth ? 'expanded' : ''}`}>▶</span>
              4. {t('networthView') || 'Net Worth View'}
            </h3>
          </div>
          {expandedSections.networth && (
            <div className="section-content">
              <p>{t('networthViewIntro') || 'The Net Worth View provides comprehensive tracking and analysis of your financial progress over time through snapshots of your total assets, liabilities, and net worth.'}</p>
              
              <div className="overview-cards">
                <div className="overview-card networth-card">
                  <div className="card-icon">📈</div>
                  <div className="card-content">
                    <h4>{t('networthTracking') || 'Net Worth Tracking'}</h4>
                    <p>{t('networthTrackingDescription') || 'Track your financial progress over time with detailed snapshots that capture your total assets, liabilities, net worth, and retirement assets at specific points in time.'}</p>
                  </div>
                </div>
                
                <div className="overview-card snapshot-card">
                  <div className="card-icon">📊</div>
                  <div className="card-content">
                    <h4>{t('snapshotAnalysis') || 'Snapshot Analysis'}</h4>
                    <p>{t('snapshotAnalysisDescription') || 'Compare snapshots across different time periods to understand trends, growth patterns, and financial milestones in your wealth-building journey.'}</p>
                  </div>
                </div>
              </div>

              <div className="key-concepts">
                <h4>{t('keyConcepts') || 'Key Concepts'}</h4>
                <ul>
                  <li><strong>{t('manualSnapshots') || 'Manual Snapshots'}:</strong> {t('manualSnapshotsDesc') || 'Create snapshots manually from the Overview page by clicking on any summary card and selecting "Save Snapshot"'}</li>
                  <li><strong>{t('historicalComparison') || 'Historical Comparison'}:</strong> {t('historicalComparisonDesc') || 'Compare your current financial position with past snapshots to track progress'}</li>
                  <li><strong>{t('currencyConsistency') || 'Currency Consistency'}:</strong> {t('currencyConsistencyDesc') || 'All snapshots are stored and displayed in your base currency for accurate comparison'}</li>
                  <li><strong>{t('comprehensiveData') || 'Comprehensive Data'}:</strong> {t('comprehensiveDataDesc') || 'Each snapshot includes assets, liabilities, net worth, and retirement assets with timestamps'}</li>
                </ul>
              </div>

              <div className="component-guide">
                <div className="component-item">
                  <h4>📋 {t('snapshotSummary') || 'Snapshot Summary Cards'}</h4>
                  <p>{t('snapshotSummaryDesc') || 'Overview cards showing your latest net worth and the change since your first snapshot, with clear indicators of financial progress.'}</p>
                  <div className="feature-list">
                    <ul>
                      <li>{t('latestNetWorthCard') || 'Latest Net Worth: Shows your most recent financial position'}</li>
                      <li>{t('netWorthChangeCard') || 'Net Worth Change: Displays total growth or decline since tracking began'}</li>
                      <li>{t('colorCodingPositive') || 'Green for positive changes, red for negative changes'}</li>
                      <li>{t('dateTimestamps') || 'Clear date timestamps for each snapshot'}</li>
                    </ul>
                  </div>
                </div>

                <div className="component-item">
                  <h4>📊 {t('historicalTable') || 'Historical Snapshots Table'}</h4>
                  <p>{t('historicalTableDesc') || 'Detailed table showing all your snapshots in chronological order with comprehensive financial data for each point in time.'}</p>
                  <div className="feature-list">
                    <ul>
                      <li>{t('chronologicalOrder') || 'Snapshots sorted by date (newest first)'}</li>
                      <li>{t('completeBreakdown') || 'Complete breakdown: Assets, Liabilities, Net Worth, Retirement'}</li>
                      <li>{t('currencyDisplay') || 'Currency information for each snapshot'}</li>
                      <li>{t('colorCodedValues') || 'Color-coded values: Green for assets, red for liabilities, purple for retirement'}</li>
                    </ul>
                  </div>
                </div>

                <div className="component-item">
                  <h4>📈 {t('interactiveChart') || 'Interactive Chart Visualization'}</h4>
                  <p>{t('interactiveChartDesc') || 'Visual representation of your net worth progression over time with interactive elements and trend analysis.'}</p>
                  <div className="feature-list">
                    <ul>
                      <li>{t('trendVisualization') || 'Clear trend lines showing financial progress over time'}</li>
                      <li>{t('hoverDetails') || 'Hover over data points to see detailed snapshot information'}</li>
                      <li>{t('multiSeriesData') || 'Multiple data series: Assets, Liabilities, Net Worth, Retirement'}</li>
                      <li>{t('zoomAndPan') || 'Interactive chart with zoom and pan capabilities'}</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="usage-tips">
                <h4>{t('networthViewTips') || 'Usage Tips'}</h4>
                <ul>
                  <li>{t('networthTip1') || 'Create snapshots regularly (monthly or quarterly) for consistent tracking'}</li>
                  <li>{t('networthTip2') || 'Save snapshots after major financial events (bonus, large purchase, investment gains)'}</li>
                  <li>{t('networthTip3') || 'Use the Overview page cards context menu to quickly save snapshots'}</li>
                  <li>{t('networthTip4') || 'Monitor the trend over time rather than focusing on individual snapshot variations'}</li>
                  <li>{t('networthTip5') || 'Include retirement accounts to get a complete picture of your financial health'}</li>
                </ul>
              </div>

              <div className="getting-started">
                <h4>{t('gettingStarted') || 'Getting Started'}</h4>
                <ol>
                  <li>{t('step1Snapshot') || 'Go to the Overview page and click on any summary card (Assets, Liabilities, Net Worth, or Retirement)'}</li>
                  <li>{t('step2Save') || 'Select "Save Snapshot" from the context menu'}</li>
                  <li>{t('step3View') || 'Visit the Net Worth View to see your snapshot data and analysis'}</li>
                  <li>{t('step4Regular') || 'Repeat this process regularly to build a comprehensive financial timeline'}</li>
                  <li>{t('step5Analyze') || 'Use the charts and historical data to understand your financial patterns and progress'}</li>
                </ol>
              </div>
            </div>
          )}
        </div>

        {/* 5. Navigation & Filtering Section */}
        <div className="guide-section" id="navigation">
          <div 
            className="section-header" 
            onClick={() => toggleSection('navigation')}
          >
            <h3>
              <span className={`expand-icon ${expandedSections.navigation ? 'expanded' : ''}`}>▶</span>
              5. {t('navigationFiltering') || 'Navigation & Filtering'}
            </h3>
          </div>
          {expandedSections.navigation && (
            <div className="section-content">
              <div className="navigation-guide">
                <div className="nav-item">
                  <h4>🗓️ {t('periodSelection') || 'Period Selection'}</h4>
                  <p>{t('periodSelectionDesc') || 'Choose from preset periods or set custom date ranges to focus your analysis.'}</p>
                  <ul>
                    <li>{t('weeklyView') || 'Weekly: Last 7 days or specific week'}</li>
                    <li>{t('monthlyView') || 'Monthly: Current month or any specific month'}</li>
                    <li>{t('quarterlyView') || 'Quarterly: 3-month periods for seasonal analysis'}</li>
                    <li>{t('yearlyView') || 'Yearly: Full year or fiscal year periods'}</li>
                    <li>{t('customRange') || 'Custom: Any date range you specify'}</li>
                  </ul>
                </div>

                <div className="nav-item">
                  <h4>🔍 {t('advancedFilters') || 'Advanced Filters'}</h4>
                  <p>{t('advancedFiltersDesc') || 'Sophisticated filtering options to drill down into specific data subsets.'}</p>
                  <ul>
                    <li>{t('budgetStatusFilter') || 'Budget Status: Filter by over/under budget categories'}</li>
                    <li>{t('amountRangeFilter') || 'Amount Range: Focus on transactions within specific amounts'}</li>
                    <li>{t('categoryFilter') || 'Categories: Select specific spending or income categories'}</li>
                    <li>{t('transactionTypeFilter') || 'Transaction Types: Income only, expenses only, or both'}</li>
                    <li>{t('dateRangeFilter') || 'Date Range: Additional date filtering within selected period'}</li>
                    <li>{t('specialFilters') || 'Special Filters: Recurring transactions, anomalies, large amounts'}</li>
                  </ul>
                </div>

                <div className="nav-item">
                  <h4>⚡ {t('quickFilters') || 'Quick Filter Presets'}</h4>
                  <p>{t('quickFiltersDesc') || 'One-click filter presets for common analysis scenarios.'}</p>
                  <ul>
                    <li>{t('overBudgetPreset') || 'Over Budget: Show only over-budget categories'}</li>
                    <li>{t('largeTransactionsPreset') || 'Large Transactions: Filter by amount thresholds'}</li>
                    <li>{t('recentActivityPreset') || 'Recent Activity: Last 7 days of transactions'}</li>
                    <li>{t('recurringPatternsPreset') || 'Recurring Patterns: Identified recurring transactions'}</li>
                    <li>{t('spendingAnomaliesPreset') || 'Spending Anomalies: Unusual transaction patterns'}</li>
                  </ul>
                </div>

                <div className="nav-item">
                  <h4>💱 {t('viewTypeToggle') || 'View Type Toggle'}</h4>
                  <p>{t('viewTypeToggleDesc') || 'Switch between Cash and Accrual accounting perspectives.'}</p>
                  <ul>
                    <li>{t('cashBasis') || 'Cash Basis: Transactions recorded when money actually moves'}</li>
                    <li>{t('accrualBasis') || 'Accrual Basis: Transactions recorded when committed (future feature)'}</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 6. Advanced Features Section */}
        <div className="guide-section" id="advanced-features">
          <div 
            className="section-header" 
            onClick={() => toggleSection('features')}
          >
            <h3>
              <span className={`expand-icon ${expandedSections.features ? 'expanded' : ''}`}>▶</span>
              6. {t('advancedFeatures') || 'Advanced Features'}
            </h3>
          </div>
          {expandedSections.features && (
            <div className="section-content">
              <div className="advanced-features-grid">
                <div className="feature-card">
                  <div className="feature-icon">🤖</div>
                  <h4>{t('patternRecognition') || 'Pattern Recognition'}</h4>
                  <p>{t('patternRecognitionDesc') || 'AI-powered analysis identifies spending patterns, seasonal variations, and recurring transactions automatically.'}</p>
                  <ul>
                    <li>{t('recurringTransactionDetection') || 'Recurring transaction detection'}</li>
                    <li>{t('seasonalSpendingPatterns') || 'Seasonal spending pattern analysis'}</li>
                    <li>{t('anomalyDetection') || 'Anomaly detection and alerts'}</li>
                    <li>{t('spendingCycleAnalysis') || 'Spending cycle analysis'}</li>
                  </ul>
                </div>

                <div className="feature-card">
                  <div className="feature-icon">📊</div>
                  <h4>{t('interactiveDrillDown') || 'Interactive Drill-Down'}</h4>
                  <p>{t('interactiveDrillDownDesc') || 'Click on any chart element to see detailed breakdowns and underlying transaction data.'}</p>
                  <ul>
                    <li>{t('chartSegmentClicking') || 'Chart segment clicking for details'}</li>
                    <li>{t('transactionLevelData') || 'Transaction-level data access'}</li>
                    <li>{t('categorySubcategoryDrilldown') || 'Category to subcategory drill-down'}</li>
                    <li>{t('temporalDrilldown') || 'Time period drill-down capabilities'}</li>
                  </ul>
                </div>

                <div className="feature-card">
                  <div className="feature-icon">📤</div>
                  <h4>{t('comprehensiveExports') || 'Comprehensive Exports'}</h4>
                  <p>{t('comprehensiveExportsDesc') || 'Export your analytics data in multiple formats for external analysis, reporting, or archival.'}</p>
                  <ul>
                    <li>{t('csvExports') || 'CSV exports for spreadsheet analysis'}</li>
                    <li>{t('jsonExports') || 'JSON exports for data integration'}</li>
                    <li>{t('transactionExports') || 'Transaction-level exports with budget context'}</li>
                    <li>{t('comprehensiveReports') || 'Comprehensive analytics reports'}</li>
                  </ul>
                </div>

                <div className="feature-card">
                  <div className="feature-icon">🎯</div>
                  <h4>{t('budgetIntegration') || 'Budget Integration'}</h4>
                  <p>{t('budgetIntegrationAdvancedDesc') || 'Deep integration with budget data provides variance analysis, forecasting, and recommendations.'}</p>
                  <ul>
                    <li>{t('realTimeBudgetTracking') || 'Real-time budget tracking and alerts'}</li>
                    <li>{t('varianceAnalysis') || 'Variance analysis with drill-down'}</li>
                    <li>{t('budgetForecastingEngine') || 'Budget forecasting engine'}</li>
                    <li>{t('adjustmentRecommendations') || 'Automatic adjustment recommendations'}</li>
                  </ul>
                </div>

                <div className="feature-card">
                  <div className="feature-icon">📱</div>
                  <h4>{t('responsiveDesign') || 'Responsive Design'}</h4>
                  <p>{t('responsiveDesignDesc') || 'Optimized for all devices with touch-friendly interactions and adaptive layouts.'}</p>
                  <ul>
                    <li>{t('mobileOptimized') || 'Mobile-optimized chart interactions'}</li>
                    <li>{t('tabletLayouts') || 'Tablet-specific layout optimizations'}</li>
                    <li>{t('desktopPowerFeatures') || 'Desktop power-user features'}</li>
                    <li>{t('touchGestureSupport') || 'Touch gesture support for navigation'}</li>
                  </ul>
                </div>

                <div className="feature-card">
                  <div className="feature-icon">🌍</div>
                  <h4>{t('multiLanguageSupport') || 'Multi-Language Support'}</h4>
                  <p>{t('multiLanguageSupportDesc') || 'Full internationalization support with dynamic language switching and localized formatting.'}</p>
                  <ul>
                    <li>{t('englishFrenchSupport') || 'English and French language support'}</li>
                    <li>{t('localizedNumberFormats') || 'Localized number and currency formats'}</li>
                    <li>{t('culturalDateFormats') || 'Cultural date format preferences'}</li>
                    <li>{t('dynamicLanguageSwitching') || 'Dynamic language switching'}</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 7. Troubleshooting Section */}
        <div className="guide-section" id="troubleshooting">
          <div 
            className="section-header" 
            onClick={() => toggleSection('troubleshooting')}
          >
            <h3>
              <span className={`expand-icon ${expandedSections.troubleshooting ? 'expanded' : ''}`}>▶</span>
              7. {t('troubleshooting') || 'Troubleshooting'}
            </h3>
          </div>
          {expandedSections.troubleshooting && (
            <div className="section-content">
              <div className="troubleshooting-guide">
                <div className="trouble-item">
                  <h4>❓ {t('noDataShowing') || 'No Data Showing'}</h4>
                  <p>{t('noDataProblem') || 'If charts appear empty or show "No data available":'}</p>
                  <ul>
                    <li>{t('checkDateRange') || 'Check that your selected date range contains transactions'}</li>
                    <li>{t('verifyFilters') || 'Verify that filters are not too restrictive'}</li>
                    <li>{t('ensureTransactionsExist') || 'Ensure transactions exist in the selected period'}</li>
                    <li>{t('refreshData') || 'Click the Refresh button to reload data'}</li>
                  </ul>
                </div>

                <div className="trouble-item">
                  <h4>🐌 {t('slowPerformance') || 'Slow Performance'}</h4>
                  <p>{t('slowPerformanceProblem') || 'If the interface feels sluggish or charts take time to load:'}</p>
                  <ul>
                    <li>{t('reduceTimeRange') || 'Reduce the time range to focus on specific periods'}</li>
                    <li>{t('limitFilters') || 'Use fewer simultaneous filters'}</li>
                    <li>{t('closeOtherTabs') || 'Close other browser tabs to free memory'}</li>
                    <li>{t('clearBrowserCache') || 'Clear browser cache and refresh'}</li>
                  </ul>
                </div>

                <div className="trouble-item">
                  <h4>📊 {t('chartsNotInteractive') || 'Charts Not Interactive'}</h4>
                  <p>{t('chartsNotInteractiveProblem') || 'If clicking on charts does not show drill-down data:'}</p>
                  <ul>
                    <li>{t('enableJavaScript') || 'Ensure JavaScript is enabled in your browser'}</li>
                    <li>{t('updateBrowser') || 'Update to a modern browser version'}</li>
                    <li>{t('disableAdBlockers') || 'Temporarily disable ad blockers'}</li>
                    <li>{t('checkConsoleErrors') || 'Check browser console for error messages'}</li>
                  </ul>
                </div>

                <div className="trouble-item">
                  <h4>💰 {t('budgetDataMissing') || 'Budget Data Missing'}</h4>
                  <p>{t('budgetDataMissingProblem') || 'If budget comparisons are not showing:'}</p>
                  <ul>
                    <li>{t('createActiveBudget') || 'Create and activate a budget in Budget Setup'}</li>
                    <li>{t('checkBudgetDates') || 'Verify budget dates overlap with your analysis period'}</li>
                    <li>{t('ensureCategoriesMatch') || 'Ensure budget categories match your transaction categories'}</li>
                    <li>{t('refreshBudgetData') || 'Navigate away and back to refresh budget data'}</li>
                  </ul>
                </div>

                <div className="trouble-item">
                  <h4>📤 {t('exportNotWorking') || 'Export Not Working'}</h4>
                  <p>{t('exportNotWorkingProblem') || 'If data exports fail or produce empty files:'}</p>
                  <ul>
                    <li>{t('checkBrowserDownloads') || 'Check browser download settings and permissions'}</li>
                    <li>{t('tryDifferentFormat') || 'Try a different export format (CSV vs JSON)'}</li>
                    <li>{t('reduceDataSize') || 'Reduce data size with filters before exporting'}</li>
                    <li>{t('checkPopupBlocker') || 'Disable popup blockers for download dialogs'}</li>
                  </ul>
                </div>

                <div className="trouble-item">
                  <h4>🔄 {t('generalIssues') || 'General Issues'}</h4>
                  <p>{t('generalIssuesProblem') || 'For other issues or unexpected behavior:'}</p>
                  <ul>
                    <li>{t('refreshPage') || 'Refresh the page and try again'}</li>
                    <li>{t('clearBrowserData') || 'Clear browser cache, cookies, and local storage'}</li>
                    <li>{t('tryIncognitoMode') || 'Try using incognito/private browsing mode'}</li>
                    <li>{t('contactSupport') || 'Contact support with specific error messages'}</li>
                  </ul>
                </div>
              </div>

              <div className="support-info">
                <h4>{t('needMoreHelp') || 'Need More Help?'}</h4>
                <p>{t('supportContact') || 'If you continue experiencing issues, please provide the following information when contacting support:'}</p>
                <ul>
                  <li>{t('browserVersion') || 'Browser name and version'}</li>
                  <li>{t('errorMessages') || 'Any error messages displayed'}</li>
                  <li>{t('stepsToReproduce') || 'Steps to reproduce the issue'}</li>
                  <li>{t('screenshotIfApplicable') || 'Screenshots if applicable'}</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="user-guide-footer">
        <div className="footer-content">
          <p>{t('guideLastUpdated') || 'Guide last updated'}: {new Date().toLocaleDateString()}</p>
          <div className="footer-actions">
            <button 
              onClick={() => onNavigate && onNavigate('expense')}
              className="btn-navigate"
            >
              {t('goToExpenseView') || 'Go to Expense View'}
            </button>
            <button 
              onClick={() => onNavigate && onNavigate('cashflow')}
              className="btn-navigate"
            >
              {t('goToCashflowView') || 'Go to Cashflow View'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserGuide;