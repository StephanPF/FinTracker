import React, { useState } from 'react';
import { useAnalytics } from '../AnalyticsMain';

/**
 * Budget Progress Component
 * Displays horizontal progress bars for each budgeted subcategory
 * Shows spent/budgeted amounts with color-coded status
 * Follows BUILD_NEW_FEATURE_GUIDE.md compact design principles
 */
const BudgetProgress = ({ analyticsData, activeBudget, budgetSummary, formatCurrency, selectedPeriod }) => {
  const { t } = useAnalytics();
  const [sortBy, setSortBy] = useState('variance'); // 'variance', 'amount', 'name', 'percentage'
  const [showOnlyProblems, setShowOnlyProblems] = useState(false);

  if (!activeBudget) {
    return (
      <div className="budget-progress">
        <div className="progress-header">
          <h3>{t('budgetProgress') || 'Budget Progress'}</h3>
          <p className="progress-subtitle">
            {t('budgetProgressDescription') || 'Track spending against budget targets'}
          </p>
        </div>

        <div className="no-budget-progress">
          <div className="no-budget-content">
            <span className="no-budget-icon">📊</span>
            <h4>{t('noBudgetActive') || 'No Active Budget'}</h4>
            <p>{t('budgetProgressHelp') || 'Set up a budget to track your spending progress and see how you\'re doing against your targets.'}</p>
            <button className="btn-setup-budget">
              {t('setupBudget') || 'Setup Budget'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Get budgeted categories with spending data
  const budgetedCategories = analyticsData?.filter(cat => cat.hasBudget) || [];
  
  if (budgetedCategories.length === 0) {
    return (
      <div className="budget-progress">
        <div className="progress-header">
          <h3>{t('budgetProgress') || 'Budget Progress'}</h3>
          <p className="progress-subtitle">
            {activeBudget.name} • {t('noBudgetedCategories') || 'No budgeted categories found'}
          </p>
        </div>

        <div className="no-progress-data">
          <p>{t('noProgressData') || 'No spending data available for budgeted categories in this period.'}</p>
        </div>
      </div>
    );
  }

  /**
   * Sort categories based on selected criteria
   */
  const sortedCategories = [...budgetedCategories].sort((a, b) => {
    switch (sortBy) {
      case 'variance':
        return b.variance - a.variance; // Highest variance first (over budget items first)
      case 'amount':
        return b.actualSpent - a.actualSpent; // Highest spending first
      case 'name':
        return a.subcategoryName.localeCompare(b.subcategoryName);
      case 'percentage':
        return b.variancePercentage - a.variancePercentage; // Highest percentage first
      default:
        return b.variance - a.variance;
    }
  });

  /**
   * Filter categories if showing only problems
   */
  const displayCategories = showOnlyProblems 
    ? sortedCategories.filter(cat => cat.variance > 0 || cat.variancePercentage > 80)
    : sortedCategories;

  /**
   * Get progress bar status based on spending
   */
  const getProgressStatus = (category) => {
    if (category.variance > 0) return 'over'; // Over budget
    if (category.variancePercentage > 90) return 'critical'; // Close to limit
    if (category.variancePercentage > 80) return 'warning'; // Warning zone
    if (category.variancePercentage > 60) return 'good'; // Good progress
    return 'excellent'; // Under 60% used
  };

  /**
   * Handle sort change
   */
  const handleSortChange = (event) => {
    setSortBy(event.target.value);
  };

  /**
   * Toggle problems filter
   */
  const handleToggleProblems = () => {
    setShowOnlyProblems(!showOnlyProblems);
  };

  return (
    <div className="budget-progress">
      <div className="progress-header">
        <div className="header-title">
          <h3>{t('budgetProgress') || 'Budget Progress'}</h3>
          <p className="progress-subtitle">
            {activeBudget.name} • {displayCategories.length} {t('categories') || 'categories'}
          </p>
        </div>

        <div className="header-controls">
          <div className="sort-control">
            <label htmlFor="progress-sort">{t('sortBy') || 'Sort by'}:</label>
            <select
              id="progress-sort"
              value={sortBy}
              onChange={handleSortChange}
              className="form-control"
              style={{
                backgroundColor: 'white',
                color: '#1a202c',
                border: '1px solid #d1d5db'
              }}
            >
              <option value="variance">{t('variance') || 'Variance'}</option>
              <option value="amount">{t('amountSpent') || 'Amount Spent'}</option>
              <option value="percentage">{t('percentageUsed') || 'Percentage Used'}</option>
              <option value="name">{t('categoryName') || 'Category Name'}</option>
            </select>
          </div>

          <button
            onClick={handleToggleProblems}
            className={`btn-filter ${showOnlyProblems ? 'active' : ''}`}
          >
            {showOnlyProblems ? 
              (t('showAll') || 'Show All') : 
              (t('showProblems') || 'Show Problems')
            }
          </button>
        </div>
      </div>

      {/* Budget Summary */}
      {budgetSummary && (
        <div className="budget-summary-progress">
          <div className="summary-item">
            <span className="summary-label">{t('totalBudgeted') || 'Total Budgeted'}:</span>
            <span className="summary-value">{formatCurrency(budgetSummary.totalBudgeted)}</span>
          </div>
          <div className="summary-item">
            <span className="summary-label">{t('totalSpent') || 'Total Spent'}:</span>
            <span className="summary-value">{formatCurrency(budgetSummary.totalSpent)}</span>
          </div>
          <div className="summary-item">
            <span className="summary-label">
              {budgetSummary.isOverBudget ? (t('overBy') || 'Over by') : (t('remaining') || 'Remaining')}:
            </span>
            <span className={`summary-value ${budgetSummary.isOverBudget ? 'over-budget' : 'under-budget'}`}>
              {formatCurrency(Math.abs(budgetSummary.budgetRemaining))}
            </span>
          </div>
        </div>
      )}

      {/* Progress Bars */}
      <div className="progress-bars">
        {displayCategories.map((category) => {
          const progressPercentage = Math.min((category.actualSpent / category.budgetAmount) * 100, 100);
          const overagePercentage = Math.max((category.actualSpent / category.budgetAmount) * 100 - 100, 0);
          const status = getProgressStatus(category);

          return (
            <div key={category.subcategoryId} className={`progress-bar-item status-${status}`}>
              <div className="progress-info">
                <div className="progress-header-row">
                  <span className="category-name">{category.subcategoryName}</span>
                  <div className="progress-amounts">
                    <span className="amount-spent">{formatCurrency(category.actualSpent)}</span>
                    <span className="amount-separator">/</span>
                    <span className="amount-budgeted">{formatCurrency(category.budgetAmount)}</span>
                  </div>
                </div>

                <div className="progress-details">
                  <span className={`progress-percentage status-${status}`}>
                    {category.variancePercentage.toFixed(0)}% {t('used') || 'used'}
                  </span>
                  {category.variance !== 0 && (
                    <span className={`progress-variance ${category.variance > 0 ? 'over-budget' : 'under-budget'}`}>
                      {category.variance > 0 ? '+' : ''}{formatCurrency(category.variance)}
                    </span>
                  )}
                </div>
              </div>

              <div className="progress-bar-container">
                <div className="progress-bar-track">
                  {/* Normal progress (up to 100%) */}
                  <div
                    className={`progress-bar-fill status-${status}`}
                    style={{ width: `${progressPercentage}%` }}
                  />
                  {/* Overage (beyond 100%) */}
                  {overagePercentage > 0 && (
                    <div
                      className="progress-bar-overage"
                      style={{ width: `${Math.min(overagePercentage, 100)}%` }}
                    />
                  )}
                </div>

                {/* Progress markers */}
                <div className="progress-markers">
                  <div className="marker marker-25" style={{ left: '25%' }} />
                  <div className="marker marker-50" style={{ left: '50%' }} />
                  <div className="marker marker-75" style={{ left: '75%' }} />
                  <div className="marker marker-100" style={{ left: '100%' }} />
                </div>
              </div>

              {/* Status indicator */}
              <div className="progress-status-indicator">
                {status === 'over' && <span className="status-icon over">⚠️</span>}
                {status === 'critical' && <span className="status-icon critical">🔴</span>}
                {status === 'warning' && <span className="status-icon warning">🟡</span>}
                {status === 'good' && <span className="status-icon good">🟢</span>}
                {status === 'excellent' && <span className="status-icon excellent">✅</span>}
              </div>
            </div>
          );
        })}
      </div>

      {/* No Problems Message */}
      {showOnlyProblems && displayCategories.length === 0 && (
        <div className="no-problems">
          <div className="no-problems-content">
            <span className="success-icon">🎉</span>
            <h4>{t('noBudgetProblems') || 'No Budget Problems!'}</h4>
            <p>{t('allCategoriesOnTrack') || 'All budget categories are on track or under budget.'}</p>
          </div>
        </div>
      )}

      {/* Progress Legend */}
      <div className="progress-legend">
        <h4>{t('progressStatus') || 'Progress Status'}</h4>
        <div className="legend-items">
          <div className="legend-item">
            <div className="legend-bar status-excellent" />
            <span>0-60% {t('excellent') || 'Excellent'}</span>
          </div>
          <div className="legend-item">
            <div className="legend-bar status-good" />
            <span>60-80% {t('good') || 'Good'}</span>
          </div>
          <div className="legend-item">
            <div className="legend-bar status-warning" />
            <span>80-90% {t('warning') || 'Warning'}</span>
          </div>
          <div className="legend-item">
            <div className="legend-bar status-critical" />
            <span>90-100% {t('critical') || 'Critical'}</span>
          </div>
          <div className="legend-item">
            <div className="legend-bar status-over" />
            <span>100%+ {t('overBudget') || 'Over Budget'}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BudgetProgress;