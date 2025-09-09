import React from 'react';
import { useAnalytics } from '../AnalyticsMain';

/**
 * Overview Cards Component
 * Displays key expense metrics with budget integration
 * Follows BUILD_NEW_FEATURE_GUIDE.md compact design principles
 */
const OverviewCards = ({ metrics, activeBudget, formatCurrency, selectedPeriod }) => {
  const { t } = useAnalytics();

  if (!metrics) {
    return (
      <div className="overview-cards">
        <div className="overview-loading">
          <p>Calculating metrics...</p>
        </div>
      </div>
    );
  }

  const cards = [
    // Total Expenses Card
    {
      id: 'total-expenses',
      title: 'Total Expenses',
      value: formatCurrency(metrics.totalExpenses || 0),
      period: getPeriodLabel(selectedPeriod),
      icon: '💸',
      trend: null, // TODO: Add period comparison in future enhancement
      type: 'expense'
    },

    // Budget Status Card (only show if budget is active)
    ...(activeBudget && metrics.budgetMetrics ? [{
      id: 'budget-status',
      title: 'Budget Status',
      value: formatCurrency(Math.abs(metrics.budgetMetrics.budgetRemaining)),
      subtitle: metrics.budgetMetrics.isOverBudget ? 
        'Over Budget' : 
        'Remaining',
      icon: metrics.budgetMetrics.isOverBudget ? '⚠️' : '✅',
      status: metrics.budgetMetrics.isOverBudget ? 'warning' : 'success',
      type: 'budget-status',
      percentage: Math.abs(metrics.budgetMetrics.budgetVariancePercentage),
      visible: true
    }] : []),

    // Largest Expense Card
    {
      id: 'largest-expense',
      title: 'Largest Expense',
      value: formatCurrency(metrics.largestExpense?.amount || 0),
      subtitle: metrics.largestExpense?.subcategoryName || 'No expenses',
      icon: '🔝',
      type: 'largest-expense',
      category: metrics.largestExpense?.subcategoryName
    },

    // Budget Variance Card (only show if budget is active)
    ...(activeBudget && metrics.budgetMetrics ? [{
      id: 'budget-variance',
      title: 'vs Budget',
      value: `${metrics.budgetMetrics.budgetVariancePercentage >= 0 ? '+' : ''}${metrics.budgetMetrics.budgetVariancePercentage.toFixed(1)}%`,
      subtitle: metrics.budgetMetrics.isOverBudget ? 
        'Over budget by' : 
        'Under budget by',
      icon: metrics.budgetMetrics.isOverBudget ? '📈' : '📉',
      status: getVarianceStatus(metrics.budgetMetrics.budgetVariancePercentage),
      type: 'budget-variance',
      percentage: Math.abs(metrics.budgetMetrics.budgetVariancePercentage),
      visible: true
    }] : [])
  ];

  return (
    <div className="overview-cards">
      {cards.filter(card => card.visible !== false).map(card => (
        <div key={card.id} className={`overview-card card-${card.type} ${card.status ? `status-${card.status}` : ''}`}>
          <div className="card-header">
            <div className="card-title-section">
              <span className="card-icon">{card.icon}</span>
              <h3 className="card-title" style={{ color: '#1a202c' }}>{card.title}</h3>
            </div>
            {card.period && (
              <span className="card-period" style={{ color: '#9ca3af' }}>{card.period}</span>
            )}
          </div>

          <div className="card-content">
            <div className="card-value-section">
              <span className="card-value" style={{ 
                color: '#1a202c', 
                fontWeight: '600',
                WebkitTextFillColor: '#1a202c',
                backgroundClip: 'unset',
                WebkitBackgroundClip: 'unset',
                background: 'none'
              }}>{card.value}</span>
              {card.subtitle && (
                <span 
                  className={`card-subtitle ${card.status ? `status-${card.status}` : ''}`}
                  style={{ color: '#64748b' }}
                >
                  {card.subtitle}
                </span>
              )}
            </div>

            {card.trend && (
              <div className="card-trend">
                <span className={`trend-indicator trend-${card.trend.direction}`}>
                  {card.trend.direction === 'up' ? '↗' : card.trend.direction === 'down' ? '↘' : '→'}
                </span>
                <span className="trend-text">{card.trend.description}</span>
              </div>
            )}

            {card.percentage !== undefined && (
              <div className="card-percentage">
                <div className="percentage-bar">
                  <div 
                    className={`percentage-fill status-${card.status}`}
                    style={{ width: `${Math.min(card.percentage, 100)}%` }}
                  />
                </div>
                <span className="percentage-text" style={{ color: '#1a202c' }}>
                  {card.percentage.toFixed(1)}%
                </span>
              </div>
            )}
          </div>

          {/* Additional context for budget cards */}
          {card.type === 'budget-status' && metrics.budgetMetrics && (
            <div className="card-context">
              <div className="context-item">
                <span className="context-label" style={{ color: '#64748b' }}>Budgeted:</span>
                <span className="context-value" style={{ color: '#1a202c' }}>{formatCurrency(metrics.budgetMetrics.totalBudgeted)}</span>
              </div>
              <div className="context-item">
                <span className="context-label" style={{ color: '#64748b' }}>Spent:</span>
                <span className="context-value" style={{ color: '#1a202c' }}>{formatCurrency(metrics.budgetMetrics.totalSpent)}</span>
              </div>
            </div>
          )}

          {card.type === 'budget-variance' && metrics.budgetMetrics && (
            <div className="card-context">
              <div className="context-item">
                <span className="context-label" style={{ color: '#64748b' }}>Over Budget:</span>
                <span className="context-value" style={{ color: '#1a202c' }}>
                  {metrics.budgetMetrics.categoriesOverBudget} / {metrics.budgetMetrics.categoriesWithBudget}
                </span>
              </div>
            </div>
          )}
        </div>
      ))}

      {/* No Budget Placeholder Card */}
      {!activeBudget && (
        <div className="overview-card card-no-budget">
          <div className="card-header">
            <div className="card-title-section">
              <span className="card-icon">📊</span>
              <h3 className="card-title" style={{ color: '#1a202c' }}>Budget Insights</h3>
            </div>
          </div>

          <div className="card-content">
            <div className="no-budget-content">
              <p style={{ color: '#64748b' }}>Set up a budget to see spending insights and variance analysis</p>
              <button className="btn-setup-budget-small" style={{ color: 'white' }}>
                Setup Budget
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Get period label for display
 */
function getPeriodLabel(period) {
  const labels = {
    weekly: 'This Week',
    monthly: 'This Month',
    quarterly: 'This Quarter',
    yearly: 'This Year'
  };
  return labels[period] || labels.monthly;
}

/**
 * Get variance status based on percentage
 */
function getVarianceStatus(percentage) {
  if (percentage > 10) return 'warning';
  if (percentage > 0) return 'caution';
  if (percentage < -20) return 'success';
  return 'neutral';
}

export default OverviewCards;