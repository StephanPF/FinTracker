import React from 'react';
import { useAnalytics } from '../AnalyticsMain';

/**
 * CashflowMetrics Component
 * Displays key cashflow metrics with budget comparison
 * Follows BUILD_NEW_FEATURE_GUIDE.md compact design principles
 */
const CashflowMetrics = ({ metrics, activeBudget, formatCurrency, selectedPeriod }) => {
  const { t } = useAnalytics();

  if (!metrics) {
    return (
      <div className="cashflow-metrics">
        <div className="cashflow-loading">
          <p>Calculating cashflow metrics...</p>
        </div>
      </div>
    );
  }

  const cards = [
    // Net Cashflow Card
    {
      id: 'net-cashflow',
      title: 'Net Cashflow',
      value: formatCurrency(metrics.netCashflow),
      period: getPeriodLabel(selectedPeriod),
      icon: metrics.netCashflow >= 0 ? '📈' : '📉',
      status: metrics.netCashflow >= 0 ? 'positive' : 'negative',
      type: 'net-cashflow',
      budgetComparison: metrics.budgetComparison ? {
        budgeted: formatCurrency(metrics.budgetComparison.budgetedNetCashflow),
        variance: formatCurrency(metrics.budgetComparison.netCashflowVariance),
        isPositiveVariance: metrics.budgetComparison.netCashflowVariance >= 0
      } : null
    },

    // Total Income Card
    {
      id: 'total-income',
      title: 'Total Income',
      value: formatCurrency(metrics.totalIncome),
      period: getPeriodLabel(selectedPeriod),
      icon: '💰',
      type: 'income',
      budgetComparison: metrics.budgetComparison ? {
        budgeted: formatCurrency(metrics.budgetComparison.budgetedIncome),
        variance: formatCurrency(metrics.budgetComparison.incomeVariance),
        isPositiveVariance: metrics.budgetComparison.incomeVariance >= 0
      } : null
    },

    // Total Outflow Card
    {
      id: 'total-outflow',
      title: 'Total Outflow',
      value: formatCurrency(metrics.totalExpenses),
      period: getPeriodLabel(selectedPeriod),
      icon: '💸',
      type: 'expenses',
      budgetComparison: metrics.budgetComparison ? {
        budgeted: formatCurrency(metrics.budgetComparison.budgetedExpenses),
        variance: formatCurrency(metrics.budgetComparison.expenseVariance),
        isPositiveVariance: metrics.budgetComparison.expenseVariance <= 0 // For expenses, lower is better
      } : null
    },

    // Budget Adherence Card (only show if budget is active)
    ...(activeBudget && metrics.budgetComparison ? [{
      id: 'budget-adherence',
      title: 'Budget Adherence',
      value: `${Math.abs(metrics.budgetComparison.budgetAdherence).toFixed(1)}%`,
      subtitle: metrics.budgetComparison.budgetAdherence >= 0 ? 
        'Under Budget' : 
        'Over Budget',
      icon: metrics.budgetComparison.budgetAdherence >= 0 ? '✅' : '⚠️',
      status: metrics.budgetComparison.budgetAdherence >= 0 ? 'success' : 
               Math.abs(metrics.budgetComparison.budgetAdherence) < 10 ? 'warning' : 'danger',
      type: 'budget-adherence',
      percentage: Math.min(Math.abs(metrics.budgetComparison.budgetAdherence), 100)
    }] : [])
  ];

  return (
    <div className="cashflow-metrics">
      {/* Header */}
      <div className="cashflow-metrics-header">
        <div className="header-title">
          <h3 style={{ color: '#1a202c' }}>Key Metrics</h3>
          <p style={{ color: '#64748b' }}>
            Essential cashflow indicators with budget comparisons
          </p>
        </div>
      </div>

      {/* Metrics Cards Grid */}
      <div className="metrics-cards-grid">
        {cards.map(card => (
          <div key={card.id} className={`metric-card card-${card.type} ${card.status ? `status-${card.status}` : ''}`}>
            {/* Card Header */}
            <div className="metric-card-header">
              <div className="card-title-section">
                <span className="card-icon">{card.icon}</span>
                <h4 className="card-title" style={{ color: '#1a202c' }}>{card.title}</h4>
              </div>
              {card.period && (
                <span className="card-period" style={{ color: '#9ca3af' }}>{card.period}</span>
              )}
            </div>

            {/* Card Content */}
            <div className="metric-card-content">
              <div className="card-value-section">
                <span 
                  className="card-value" 
                  style={{ 
                    color: '#1a202c',
                    WebkitTextFillColor: '#1a202c',
                    backgroundClip: 'unset',
                    WebkitBackgroundClip: 'unset',
                    background: 'none'
                  }}
                >
                  {card.value}
                </span>
                {card.subtitle && (
                  <span 
                    className={`card-subtitle ${card.status ? `status-${card.status}` : ''}`}
                    style={{ color: '#64748b' }}
                  >
                    {card.subtitle}
                  </span>
                )}
              </div>

              {/* Budget Comparison */}
              {card.budgetComparison && (
                <div className="budget-comparison">
                  <div className="comparison-item">
                    <span className="comparison-label" style={{ color: '#64748b' }}>
                      Budgeted:
                    </span>
                    <span className="comparison-value" style={{ color: '#1a202c' }}>
                      {card.budgetComparison.budgeted}
                    </span>
                  </div>
                  <div className="comparison-item">
                    <span className="comparison-label" style={{ color: '#64748b' }}>
                      Variance:
                    </span>
                    <span 
                      className="comparison-value" 
                      style={{ 
                        color: card.budgetComparison.isPositiveVariance ? '#059669' : '#dc2626'
                      }}
                    >
                      {card.budgetComparison.isPositiveVariance ? '+' : ''}{card.budgetComparison.variance}
                    </span>
                  </div>
                </div>
              )}

              {/* Progress Bar for Budget Adherence */}
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

            {/* Status Indicator */}
            <div className="card-status-indicator">
              <div className={`status-dot status-${card.status || 'neutral'}`}></div>
              <span className="status-text" style={{ color: '#64748b' }}>
                {getStatusText(card.status || 'neutral', card.type)}
              </span>
            </div>
          </div>
        ))}

        {/* No Budget Placeholder Card */}
        {!activeBudget && (
          <div className="metric-card card-no-budget">
            <div className="metric-card-header">
              <div className="card-title-section">
                <span className="card-icon">📊</span>
                <h4 className="card-title" style={{ color: '#1a202c' }}>
                  Budget Comparison
                </h4>
              </div>
            </div>

            <div className="metric-card-content">
              <div className="no-budget-content">
                <p style={{ color: '#64748b' }}>
                  Set up a budget to compare actual vs budgeted cashflow
                </p>
                <button className="btn-setup-budget-small" style={{ color: 'white' }}>
                  Setup Budget
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Summary Insights */}
      {metrics.budgetComparison && (
        <div className="cashflow-insights">
          <div className="insight-card">
            <div className="insight-header">
              <span className="insight-icon">💡</span>
              <h4 style={{ color: '#1a202c' }}>Cashflow Insight</h4>
            </div>
            <div className="insight-content">
              <p style={{ color: '#64748b' }}>
                {generateCashflowInsight(metrics, t)}
              </p>
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
 * Get status text based on card type and status
 */
function getStatusText(status, type) {
  const statusTexts = {
    positive: type === 'net-cashflow' ? 'Positive Flow' : 'Good',
    negative: type === 'net-cashflow' ? 'Negative Flow' : 'Attention',
    success: 'On Track',
    warning: 'Monitor',
    danger: 'Action Needed',
    neutral: 'Stable'
  };
  
  return statusTexts[status] || 'Normal';
}

/**
 * Generate dynamic cashflow insight
 */
function generateCashflowInsight(metrics, t) {
  const { budgetComparison, netCashflow } = metrics;
  
  if (!budgetComparison) {
    return t('noBudgetInsightAvailable') || 'Set up a budget to get personalized cashflow insights';
  }

  if (netCashflow >= 0 && budgetComparison.netCashflowVariance >= 0) {
    return t('cashflowPositiveAndOnTrack') || 
           `Your cashflow is positive and ${formatCurrency(Math.abs(budgetComparison.netCashflowVariance))} better than budgeted. Great financial discipline!`;
  } else if (netCashflow >= 0 && budgetComparison.netCashflowVariance < 0) {
    return t('cashflowPositiveButBelowBudget') || 
           `Your cashflow is positive but ${formatCurrency(Math.abs(budgetComparison.netCashflowVariance))} below budget. Consider reviewing your spending.`;
  } else if (netCashflow < 0) {
    return t('cashflowNegativeWarning') || 
           `Your cashflow is negative by ${formatCurrency(Math.abs(netCashflow))}. Review expenses and consider increasing income.`;
  }

  return t('cashflowNeutral') || 'Your cashflow is balanced. Monitor trends to maintain financial stability.';
}

export default CashflowMetrics;