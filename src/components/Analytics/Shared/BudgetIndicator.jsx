import React from 'react';
import { useAnalytics } from '../AnalyticsMain';

/**
 * Budget Indicator Component
 * Shows active budget status and provides quick navigation to budget setup
 * Follows BUILD_NEW_FEATURE_GUIDE.md compact design principles
 */
const BudgetIndicator = ({ onNavigate }) => {
  const { activeBudget, formatCurrency, t } = useAnalytics();

  if (!activeBudget) {
    return (
      <div className="budget-indicator-empty">
        <div className="empty-budget-content">
          <span className="empty-icon">📊</span>
          <div className="empty-text">
            <h4>No Budget Set</h4>
            <p>Set up a budget to get personalized spending insights and comparisons</p>
          </div>
          <button
            className="btn-setup-budget"
            onClick={() => onNavigate && onNavigate('budget-setup')}
          >
            Create Budget
          </button>
        </div>
      </div>
    );
  }

  // Calculate budget summary if line items are available
  const budgetSummary = activeBudget.lineItems ? {
    totalCategories: activeBudget.lineItems.length,
    totalMonthlyBudget: activeBudget.lineItems.reduce((sum, item) => {
      // Normalize all amounts to monthly for display
      const monthlyAmount = normalizeToMonthly(item.amount, item.period);
      return sum + monthlyAmount;
    }, 0)
  } : null;

  return (
    <div className="budget-indicator-active">
      <div className="budget-info">
        <div className="budget-header">
          <span className="budget-icon">🎯</span>
          <div className="budget-title">
            <h4>Active Budget</h4>
            <span className="budget-name">{activeBudget.name}</span>
          </div>
          <span className={`budget-status status-${activeBudget.status}`}>
            {t(activeBudget.status) || activeBudget.status}
          </span>
        </div>

        {budgetSummary && (
          <div className="budget-summary">
            <div className="summary-item">
              <span className="summary-label">
                Categories:
              </span>
              <span className="summary-value">
                {budgetSummary.totalCategories}
              </span>
            </div>
            <div className="summary-item">
              <span className="summary-label">
                Monthly Budget:
              </span>
              <span className="summary-value">
                {formatCurrency(budgetSummary.totalMonthlyBudget)}
              </span>
            </div>
            <div className="summary-item">
              <span className="summary-label">
                Yearly Projection:
              </span>
              <span className="summary-value">
                {formatCurrency(budgetSummary.totalMonthlyBudget * 12)}
              </span>
            </div>
          </div>
        )}

        {activeBudget.description && (
          <div className="budget-description">
            <p>{activeBudget.description}</p>
          </div>
        )}

        <div className="budget-actions">
          <button
            className="btn-secondary btn-small"
            onClick={() => onNavigate && onNavigate('budget-setup')}
          >
            Manage Budget
          </button>
          {activeBudget.lastModified && (
            <span className="last-modified">
              Last updated: {formatDate(activeBudget.lastModified)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * Normalize amount to monthly equivalent
 * Reuses Budget Setup logic for consistency
 */
function normalizeToMonthly(amount, period) {
  switch (period) {
    case 'weekly':
      return amount * (52 / 12); // ~4.33 weeks per month
    case 'monthly':
      return amount;
    case 'quarterly':
      return amount / 3; // 3 months per quarter
    case 'yearly':
      return amount / 12; // 12 months per year
    default:
      return amount;
  }
}

/**
 * Format date for display
 */
function formatDate(dateString) {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString();
  } catch (error) {
    return dateString;
  }
}

export default BudgetIndicator;