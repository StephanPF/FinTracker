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
            📖 Analytics User Guide
          </h2>
          <p className="guide-subtitle">
            Complete guide to understanding and using the Expense and Cashflow Analytics views
          </p>
        </div>
        
        <div className="header-actions">
          <button onClick={expandAll} className="btn-expand-all">
            Expand All
          </button>
          <button onClick={collapseAll} className="btn-collapse-all">
            Collapse All
          </button>
        </div>
      </div>

      {/* Table of Contents */}
      <div className="table-of-contents">
        <h3>Table of Contents</h3>
        <ul className="toc-list">
          <li><a href="#overview" onClick={(e) => {e.preventDefault(); toggleSection('overview');}}>1. Overview</a></li>
          <li><a href="#expense-view" onClick={(e) => {e.preventDefault(); toggleSection('expense');}}>2. Expense View</a></li>
          <li><a href="#cashflow-view" onClick={(e) => {e.preventDefault(); toggleSection('cashflow');}}>3. Cashflow View</a></li>
          <li><a href="#networth-view" onClick={(e) => {e.preventDefault(); toggleSection('networth');}}>4. Net Worth View</a></li>
          <li><a href="#navigation" onClick={(e) => {e.preventDefault(); toggleSection('navigation');}}>5. Navigation & Filtering</a></li>
          <li><a href="#advanced-features" onClick={(e) => {e.preventDefault(); toggleSection('features');}}>6. Advanced Features</a></li>
          <li><a href="#troubleshooting" onClick={(e) => {e.preventDefault(); toggleSection('troubleshooting');}}>7. Troubleshooting</a></li>
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
              1. Overview
            </h3>
          </div>
          {expandedSections.overview && (
            <div className="section-content">
              <p>The Analytics system provides two main views for analyzing your financial data:</p>
              
              <div className="overview-cards">
                <div className="overview-card expense-card">
                  <div className="card-icon">📊</div>
                  <div className="card-content">
                    <h4>Expense View</h4>
                    <p>Detailed analysis of spending patterns, budget comparisons, and category breakdowns. Perfect for understanding where your money goes and tracking budget adherence.</p>
                  </div>
                </div>
                
                <div className="overview-card cashflow-card">
                  <div className="card-icon">💰</div>
                  <div className="card-content">
                    <h4>Cashflow View</h4>
                    <p>Comprehensive cashflow analysis including income vs expenses, waterfall charts, trend analysis, and forecasting. Ideal for understanding financial health and predicting future outcomes.</p>
                  </div>
                </div>
              </div>

              <div className="key-concepts">
                <h4>Key Concepts</h4>
                <ul>
                  <li><strong>Budget Integration:</strong> Both views integrate with your active budget to show planned vs actual spending</li>
                  <li><strong>Pattern Analysis:</strong> Advanced algorithms identify spending patterns, recurring transactions, and anomalies</li>
                  <li><strong>Interactive Charts:</strong> Click on chart elements to drill down into detailed transaction data</li>
                  <li><strong>Real-time Filtering:</strong> Apply filters instantly to focus on specific time periods, categories, or transaction types</li>
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
              2. Expense View
            </h3>
          </div>
          {expandedSections.expense && (
            <div className="section-content">
              <p>The Expense View focuses on analyzing your spending patterns, comparing against budgets, and understanding category-wise expenses.</p>
              
              <div className="component-guide">
                <div className="component-item">
                  <h4>📈 Expense Metrics Cards</h4>
                  <p>Overview cards showing total spending, budget variance, top categories, and trend indicators. Each card displays current period data with comparison to previous periods.</p>
                  <div className="feature-list">
                    <ul>
                      <li>Total Spending: Shows period total with trend arrow</li>
                      <li>Budget Variance: Displays over/under budget amount and percentage</li>
                      <li>Top Category: Highlights your highest spending category</li>
                      <li>Transaction Count: Number of expense transactions in period</li>
                    </ul>
                  </div>
                </div>

                <div className="component-item">
                  <h4>🍕 Category Breakdown Chart</h4>
                  <p>Interactive pie or donut chart showing spending distribution across categories. Click on segments to see detailed breakdowns.</p>
                  <div className="feature-list">
                    <ul>
                      <li>Click segments to expand subcategory details</li>
                      <li>Color coding indicates budget adherence (green=under, red=over)</li>
                      <li>Percentage labels show category contribution to total spending</li>
                    </ul>
                  </div>
                </div>

                <div className="component-item">
                  <h4>📊 Spending Trend Analysis</h4>
                  <p>Time-series chart showing spending patterns over time with budget comparison lines and trend identification.</p>
                  <div className="feature-list">
                    <ul>
                      <li>Switch between daily, weekly, monthly views</li>
                      <li>Budget target lines overlay actual spending</li>
                      <li>Automatic detection of seasonal spending patterns</li>
                      <li>Unusual spending spikes are highlighted</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="usage-tips">
                <h4>Usage Tips</h4>
                <ul>
                  <li>Use period filters to compare spending across different timeframes</li>
                  <li>Click on chart elements to drill down into transaction details</li>
                  <li>Set up budgets for better variance analysis and spending alerts</li>
                  <li>Export data for external analysis or record keeping</li>
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
              3. Cashflow View
            </h3>
          </div>
          {expandedSections.cashflow && (
            <div className="section-content">
              <p>The Cashflow View provides comprehensive analysis of money movement, combining income and expenses to show net financial position and future projections.</p>
              
              <div className="view-modes">
                <h4>View Modes</h4>
                <div className="mode-tabs">
                  <div className="mode-tab">
                    <strong>Overview Mode</strong>
                    <p>Main dashboard with metrics, waterfall chart, and trend analysis</p>
                  </div>
                  <div className="mode-tab">
                    <strong>Calendar Mode</strong>
                    <p>Daily heatmap showing cashflow patterns throughout the month</p>
                  </div>
                  <div className="mode-tab">
                    <strong>Forecast Mode</strong>
                    <p>Predictive analysis with budget projections and recommendations</p>
                  </div>
                </div>
              </div>

              <div className="component-guide">
                <div className="component-item">
                  <h4>💰 Cashflow Metrics Cards</h4>
                  <p>Key financial health indicators including net cashflow, income vs expenses, and budget performance.</p>
                  <div className="feature-list">
                    <ul>
                      <li>Net Cashflow: Income minus expenses with trend indicator</li>
                      <li>Total Income: Period income with growth comparison</li>
                      <li>Total Expenses: Period expenses with budget comparison</li>
                      <li>Cashflow Status: Health indicator (positive/negative/stable)</li>
                    </ul>
                  </div>
                </div>

                <div className="component-item">
                  <h4>📊 Waterfall Chart</h4>
                  <p>Visual representation of how money flows from starting balance through income and expenses to ending balance.</p>
                  <div className="feature-list">
                    <ul>
                      <li>Click segments to see detailed transaction breakdowns</li>
                      <li>Budget target lines show planned vs actual amounts</li>
                      <li>Cumulative view shows running balance changes</li>
                      <li>Color coding: Green=income, Red=expenses, Blue=net result</li>
                    </ul>
                  </div>
                </div>

                <div className="component-item">
                  <h4>📈 Cashflow Trend Analysis</h4>
                  <p>Time-series analysis showing cashflow patterns, seasonal variations, and predictive trends.</p>
                  <div className="feature-list">
                    <ul>
                      <li>Trend lines show cashflow direction and velocity</li>
                      <li>Seasonal pattern detection for better planning</li>
                      <li>Volatility indicators highlight cashflow stability</li>
                      <li>Correlation analysis between income and expense patterns</li>
                    </ul>
                  </div>
                </div>

                <div className="component-item">
                  <h4>📅 Cashflow Calendar</h4>
                  <p>Daily heatmap visualization showing cashflow intensity and patterns throughout the month.</p>
                  <div className="feature-list">
                    <ul>
                      <li>Color intensity indicates cashflow amount (red=negative, green=positive)</li>
                      <li>Identifies recurring payment dates and income cycles</li>
                      <li>Shows weekend vs weekday spending patterns</li>
                      <li>Highlights days with significant budget variances</li>
                    </ul>
                  </div>
                </div>

                <div className="component-item">
                  <h4>🔮 Budget Forecast</h4>
                  <p>Predictive analysis showing projected budget performance with multiple scenarios and recommendations.</p>
                  <div className="feature-list">
                    <ul>
                      <li>Three scenarios: Optimistic, Current Trend, Pessimistic</li>
                      <li>Confidence scores indicate prediction reliability</li>
                      <li>Actionable recommendations for budget adjustments</li>
                      <li>Early warning system for potential budget overruns</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="usage-tips">
                <h4>Usage Tips</h4>
                <ul>
                  <li>Use Calendar view to identify optimal spending and saving days</li>
                  <li>Monitor Forecast view for early budget adjustment opportunities</li>
                  <li>Click on waterfall segments to understand cashflow drivers</li>
                  <li>Export cashflow reports for financial planning and tax preparation</li>
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
              4. Net Worth View
            </h3>
          </div>
          {expandedSections.networth && (
            <div className="section-content">
              <p>The Net Worth View provides comprehensive tracking and analysis of your financial progress over time through snapshots of your total assets, liabilities, and net worth.</p>
              
              <div className="overview-cards">
                <div className="overview-card networth-card">
                  <div className="card-icon">📈</div>
                  <div className="card-content">
                    <h4>Net Worth Tracking</h4>
                    <p>Track your financial progress over time with detailed snapshots that capture your total assets, liabilities, net worth, and retirement assets at specific points in time.</p>
                  </div>
                </div>
                
                <div className="overview-card snapshot-card">
                  <div className="card-icon">📊</div>
                  <div className="card-content">
                    <h4>Snapshot Analysis</h4>
                    <p>Compare snapshots across different time periods to understand trends, growth patterns, and financial milestones in your wealth-building journey.</p>
                  </div>
                </div>
              </div>

              <div className="key-concepts">
                <h4>Key Concepts</h4>
                <ul>
                  <li><strong>Manual Snapshots:</strong> Create snapshots manually from the Overview page by clicking on any summary card and selecting "Save Snapshot"</li>
                  <li><strong>Historical Comparison:</strong> Compare your current financial position with past snapshots to track progress</li>
                  <li><strong>Currency Consistency:</strong> All snapshots are stored and displayed in your base currency for accurate comparison</li>
                  <li><strong>Comprehensive Data:</strong> Each snapshot includes assets, liabilities, net worth, and retirement assets with timestamps</li>
                </ul>
              </div>

              <div className="component-guide">
                <div className="component-item">
                  <h4>📋 Snapshot Summary Cards</h4>
                  <p>Overview cards showing your latest net worth and the change since your first snapshot, with clear indicators of financial progress.</p>
                  <div className="feature-list">
                    <ul>
                      <li>Latest Net Worth: Shows your most recent financial position</li>
                      <li>Net Worth Change: Displays total growth or decline since tracking began</li>
                      <li>Green for positive changes, red for negative changes</li>
                      <li>Clear date timestamps for each snapshot</li>
                    </ul>
                  </div>
                </div>

                <div className="component-item">
                  <h4>📊 Historical Snapshots Table</h4>
                  <p>Detailed table showing all your snapshots in chronological order with comprehensive financial data for each point in time.</p>
                  <div className="feature-list">
                    <ul>
                      <li>Snapshots sorted by date (newest first)</li>
                      <li>Complete breakdown: Assets, Liabilities, Net Worth, Retirement</li>
                      <li>Currency information for each snapshot</li>
                      <li>Color-coded values: Green for assets, red for liabilities, purple for retirement</li>
                    </ul>
                  </div>
                </div>

                <div className="component-item">
                  <h4>📈 Interactive Chart Visualization</h4>
                  <p>Visual representation of your net worth progression over time with interactive elements and trend analysis.</p>
                  <div className="feature-list">
                    <ul>
                      <li>Clear trend lines showing financial progress over time</li>
                      <li>Hover over data points to see detailed snapshot information</li>
                      <li>Multiple data series: Assets, Liabilities, Net Worth, Retirement</li>
                      <li>Interactive chart with zoom and pan capabilities</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="usage-tips">
                <h4>Usage Tips</h4>
                <ul>
                  <li>Create snapshots regularly (monthly or quarterly) for consistent tracking</li>
                  <li>Save snapshots after major financial events (bonus, large purchase, investment gains)</li>
                  <li>Use the Overview page cards context menu to quickly save snapshots</li>
                  <li>Monitor the trend over time rather than focusing on individual snapshot variations</li>
                  <li>Include retirement accounts to get a complete picture of your financial health</li>
                </ul>
              </div>

              <div className="getting-started">
                <h4>Getting Started</h4>
                <ol>
                  <li>Go to the Overview page and click on any summary card (Assets, Liabilities, Net Worth, or Retirement)</li>
                  <li>Select "Save Snapshot" from the context menu</li>
                  <li>Visit the Net Worth View to see your snapshot data and analysis</li>
                  <li>Repeat this process regularly to build a comprehensive financial timeline</li>
                  <li>Use the charts and historical data to understand your financial patterns and progress</li>
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
              5. Navigation & Filtering
            </h3>
          </div>
          {expandedSections.navigation && (
            <div className="section-content">
              <div className="navigation-guide">
                <div className="nav-item">
                  <h4>🗓️ Period Selection</h4>
                  <p>Choose from preset periods or set custom date ranges to focus your analysis.</p>
                  <ul>
                    <li>Weekly: Last 7 days or specific week</li>
                    <li>Monthly: Current month or any specific month</li>
                    <li>Quarterly: 3-month periods for seasonal analysis</li>
                    <li>Yearly: Full year or fiscal year periods</li>
                    <li>Custom: Any date range you specify</li>
                  </ul>
                </div>

                <div className="nav-item">
                  <h4>🔍 Advanced Filters</h4>
                  <p>Sophisticated filtering options to drill down into specific data subsets.</p>
                  <ul>
                    <li>Budget Status: Filter by over/under budget categories</li>
                    <li>Amount Range: Focus on transactions within specific amounts</li>
                    <li>Categories: Select specific spending or income categories</li>
                    <li>Transaction Types: Income only, expenses only, or both</li>
                    <li>Date Range: Additional date filtering within selected period</li>
                    <li>Special Filters: Recurring transactions, anomalies, large amounts</li>
                  </ul>
                </div>

                <div className="nav-item">
                  <h4>⚡ Quick Filter Presets</h4>
                  <p>One-click filter presets for common analysis scenarios.</p>
                  <ul>
                    <li>Over Budget: Show only over-budget categories</li>
                    <li>Large Transactions: Filter by amount thresholds</li>
                    <li>Recent Activity: Last 7 days of transactions</li>
                    <li>Recurring Patterns: Identified recurring transactions</li>
                    <li>Spending Anomalies: Unusual transaction patterns</li>
                  </ul>
                </div>

                <div className="nav-item">
                  <h4>💱 View Type Toggle</h4>
                  <p>Switch between Cash and Accrual accounting perspectives.</p>
                  <ul>
                    <li>Cash Basis: Transactions recorded when money actually moves</li>
                    <li>Accrual Basis: Transactions recorded when committed (future feature)</li>
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
              6. Advanced Features
            </h3>
          </div>
          {expandedSections.features && (
            <div className="section-content">
              <div className="advanced-features-grid">
                <div className="feature-card">
                  <div className="feature-icon">🤖</div>
                  <h4>Pattern Recognition</h4>
                  <p>AI-powered analysis identifies spending patterns, seasonal variations, and recurring transactions automatically.</p>
                  <ul>
                    <li>Recurring transaction detection</li>
                    <li>Seasonal spending pattern analysis</li>
                    <li>Anomaly detection and alerts</li>
                    <li>Spending cycle analysis</li>
                  </ul>
                </div>

                <div className="feature-card">
                  <div className="feature-icon">📊</div>
                  <h4>Interactive Drill-Down</h4>
                  <p>Click on any chart element to see detailed breakdowns and underlying transaction data.</p>
                  <ul>
                    <li>Chart segment clicking for details</li>
                    <li>Transaction-level data access</li>
                    <li>Category to subcategory drill-down</li>
                    <li>Time period drill-down capabilities</li>
                  </ul>
                </div>

                <div className="feature-card">
                  <div className="feature-icon">📤</div>
                  <h4>Comprehensive Exports</h4>
                  <p>Export your analytics data in multiple formats for external analysis, reporting, or archival.</p>
                  <ul>
                    <li>CSV exports for spreadsheet analysis</li>
                    <li>JSON exports for data integration</li>
                    <li>Transaction-level exports with budget context</li>
                    <li>Comprehensive analytics reports</li>
                  </ul>
                </div>

                <div className="feature-card">
                  <div className="feature-icon">🎯</div>
                  <h4>Budget Integration</h4>
                  <p>Deep integration with budget data provides variance analysis, forecasting, and recommendations.</p>
                  <ul>
                    <li>Real-time budget tracking and alerts</li>
                    <li>Variance analysis with drill-down</li>
                    <li>Budget forecasting engine</li>
                    <li>Automatic adjustment recommendations</li>
                  </ul>
                </div>

                <div className="feature-card">
                  <div className="feature-icon">📱</div>
                  <h4>Responsive Design</h4>
                  <p>Optimized for all devices with touch-friendly interactions and adaptive layouts.</p>
                  <ul>
                    <li>Mobile-optimized chart interactions</li>
                    <li>Tablet-specific layout optimizations</li>
                    <li>Desktop power-user features</li>
                    <li>Touch gesture support for navigation</li>
                  </ul>
                </div>

                <div className="feature-card">
                  <div className="feature-icon">🌍</div>
                  <h4>Multi-Language Support</h4>
                  <p>Full internationalization support with dynamic language switching and localized formatting.</p>
                  <ul>
                    <li>English and French language support</li>
                    <li>Localized number and currency formats</li>
                    <li>Cultural date format preferences</li>
                    <li>Dynamic language switching</li>
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
              7. Troubleshooting
            </h3>
          </div>
          {expandedSections.troubleshooting && (
            <div className="section-content">
              <div className="troubleshooting-guide">
                <div className="trouble-item">
                  <h4>❓ No Data Showing</h4>
                  <p>If charts appear empty or show "No data available":</p>
                  <ul>
                    <li>Check that your selected date range contains transactions</li>
                    <li>Verify that filters are not too restrictive</li>
                    <li>Ensure transactions exist in the selected period</li>
                    <li>Click the Refresh button to reload data</li>
                  </ul>
                </div>

                <div className="trouble-item">
                  <h4>🐌 Slow Performance</h4>
                  <p>If the interface feels sluggish or charts take time to load:</p>
                  <ul>
                    <li>Reduce the time range to focus on specific periods</li>
                    <li>Use fewer simultaneous filters</li>
                    <li>Close other browser tabs to free memory</li>
                    <li>Clear browser cache and refresh</li>
                  </ul>
                </div>

                <div className="trouble-item">
                  <h4>📊 Charts Not Interactive</h4>
                  <p>If clicking on charts does not show drill-down data:</p>
                  <ul>
                    <li>Ensure JavaScript is enabled in your browser</li>
                    <li>Update to a modern browser version</li>
                    <li>Temporarily disable ad blockers</li>
                    <li>Check browser console for error messages</li>
                  </ul>
                </div>

                <div className="trouble-item">
                  <h4>💰 Budget Data Missing</h4>
                  <p>If budget comparisons are not showing:</p>
                  <ul>
                    <li>Create and activate a budget in Budget Setup</li>
                    <li>Verify budget dates overlap with your analysis period</li>
                    <li>Ensure budget categories match your transaction categories</li>
                    <li>Navigate away and back to refresh budget data</li>
                  </ul>
                </div>

                <div className="trouble-item">
                  <h4>📤 Export Not Working</h4>
                  <p>If data exports fail or produce empty files:</p>
                  <ul>
                    <li>Check browser download settings and permissions</li>
                    <li>Try a different export format (CSV vs JSON)</li>
                    <li>Reduce data size with filters before exporting</li>
                    <li>Disable popup blockers for download dialogs</li>
                  </ul>
                </div>

                <div className="trouble-item">
                  <h4>🔄 General Issues</h4>
                  <p>For other issues or unexpected behavior:</p>
                  <ul>
                    <li>Refresh the page and try again</li>
                    <li>Clear browser cache, cookies, and local storage</li>
                    <li>Try using incognito/private browsing mode</li>
                    <li>Contact support with specific error messages</li>
                  </ul>
                </div>
              </div>

              <div className="support-info">
                <h4>Need More Help?</h4>
                <p>If you continue experiencing issues, please provide the following information when contacting support:</p>
                <ul>
                  <li>Browser name and version</li>
                  <li>Any error messages displayed</li>
                  <li>Steps to reproduce the issue</li>
                  <li>Screenshots if applicable</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="user-guide-footer">
        <div className="footer-content">
          <p>Guide last updated: {new Date().toLocaleDateString()}</p>
          <div className="footer-actions">
            <button 
              onClick={() => onNavigate && onNavigate('expense')}
              className="btn-navigate"
            >
              Go to Expense View
            </button>
            <button 
              onClick={() => onNavigate && onNavigate('cashflow')}
              className="btn-navigate"
            >
              Go to Cashflow View
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserGuide;