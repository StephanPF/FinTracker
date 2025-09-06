import React, { useState, useEffect } from 'react';
import { useAnalytics } from '../AnalyticsMain';

/**
 * BudgetAnalysisPanel Component
 * Comprehensive budget insights and analysis panel
 * Follows BUILD_NEW_FEATURE_GUIDE.md compact design principles
 */
const BudgetAnalysisPanel = ({ expenseData, activeBudget, budgetSummary, formatCurrency, selectedPeriod }) => {
  const { t, onNavigate } = useAnalytics();
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);

  // Generate analysis when data changes
  useEffect(() => {
    if (expenseData && activeBudget) {
      generateBudgetAnalysis();
    } else {
      setLoading(false);
    }
  }, [expenseData, activeBudget, budgetSummary]);

  /**
   * Generate comprehensive budget analysis
   */
  const generateBudgetAnalysis = async () => {
    try {
      setLoading(true);

      // Calculate budget compliance score
      const complianceScore = calculateBudgetComplianceScore();
      
      // Identify categories over budget
      const categoriesOverBudget = getCategoriesOverBudget();
      
      // Get biggest variances (both over and under)
      const biggestVariances = getBiggestVariances();
      
      // Identify savings opportunities
      const savingsOpportunities = getSavingsOpportunities();
      
      // Generate next period projection
      const nextPeriodProjection = generateNextPeriodProjection();

      // Generate actionable insights
      const insights = generateActionableInsights(
        complianceScore,
        categoriesOverBudget,
        biggestVariances,
        savingsOpportunities
      );

      setAnalysis({
        complianceScore,
        categoriesOverBudget,
        biggestVariances,
        savingsOpportunities,
        nextPeriodProjection,
        insights,
        totalBudgeted: budgetSummary?.totalBudgeted || 0,
        totalSpent: budgetSummary?.totalSpent || 0,
        overallStatus: complianceScore >= 90 ? 'excellent' : 
                     complianceScore >= 75 ? 'good' : 
                     complianceScore >= 50 ? 'fair' : 'needs-improvement'
      });
    } catch (error) {
      console.error('Error generating budget analysis:', error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Calculate budget compliance score as percentage
   */
  const calculateBudgetComplianceScore = () => {
    if (!expenseData || expenseData.length === 0) return 0;

    const budgetedCategories = expenseData.filter(cat => cat.hasBudget);
    if (budgetedCategories.length === 0) return 0;

    const categoriesWithinBudget = budgetedCategories.filter(cat => cat.variance <= 0);
    return Math.round((categoriesWithinBudget.length / budgetedCategories.length) * 100);
  };

  /**
   * Get categories that are over budget
   */
  const getCategoriesOverBudget = () => {
    if (!expenseData) return [];

    return expenseData
      .filter(cat => cat.hasBudget && cat.variance > 0)
      .sort((a, b) => b.variance - a.variance)
      .map(cat => ({
        ...cat,
        overagePercentage: cat.budgetAmount > 0 ? (cat.variance / cat.budgetAmount) * 100 : 0
      }));
  };

  /**
   * Get biggest budget variances (both positive and negative)
   */
  const getBiggestVariances = () => {
    if (!expenseData) return { overages: [], savings: [] };

    const budgetedCategories = expenseData.filter(cat => cat.hasBudget);

    const overages = budgetedCategories
      .filter(cat => cat.variance > 0)
      .sort((a, b) => b.variance - a.variance)
      .slice(0, 3)
      .map(cat => ({
        ...cat,
        percentageOver: cat.budgetAmount > 0 ? (cat.variance / cat.budgetAmount) * 100 : 0
      }));

    const savings = budgetedCategories
      .filter(cat => cat.variance < -50) // Significant savings (more than $50 under budget)
      .sort((a, b) => a.variance - b.variance)
      .slice(0, 3)
      .map(cat => ({
        ...cat,
        percentageUnder: cat.budgetAmount > 0 ? (Math.abs(cat.variance) / cat.budgetAmount) * 100 : 0
      }));

    return { overages, savings };
  };

  /**
   * Identify savings opportunities
   */
  const getSavingsOpportunities = () => {
    if (!expenseData) return [];

    return expenseData
      .filter(cat => cat.hasBudget && cat.variance < -100) // Categories with $100+ unused budget
      .filter(cat => cat.variancePercentage && cat.variancePercentage < 70) // Used less than 70% of budget
      .sort((a, b) => a.variance - b.variance)
      .slice(0, 5)
      .map(cat => ({
        ...cat,
        unusedAmount: Math.abs(cat.variance),
        utilizationRate: cat.budgetAmount > 0 ? (cat.actualSpent / cat.budgetAmount) * 100 : 0
      }));
  };

  /**
   * Generate next period projection based on current trends
   */
  const generateNextPeriodProjection = () => {
    if (!budgetSummary) return null;

    // Simple projection: current spending rate applied to full period
    const currentSpendingRate = budgetSummary.totalSpent / budgetSummary.totalBudgeted;
    const projectedSpending = budgetSummary.totalBudgeted * currentSpendingRate;
    const projectedVariance = projectedSpending - budgetSummary.totalBudgeted;

    return {
      projectedSpending,
      projectedVariance,
      projectedStatus: projectedVariance > 0 ? 'over-budget' : 'within-budget',
      confidenceLevel: 'medium', // Would be calculated based on historical data
      recommendation: projectedVariance > 0 
        ? (t('reduceSpending') || 'Consider reducing spending in over-budget categories')
        : (t('onTrack') || 'Current trajectory looks good')
    };
  };

  /**
   * Generate actionable insights
   */
  const generateActionableInsights = (complianceScore, categoriesOverBudget, variances, opportunities) => {
    const insights = [];

    // Compliance score insights
    if (complianceScore < 50) {
      insights.push({
        type: 'warning',
        priority: 'high',
        title: t('budgetComplianceLow') || 'Budget Compliance Low',
        description: t('budgetComplianceLowDesc') || `Only ${complianceScore}% of budgeted categories are within limits`,
        action: t('reviewBudgetLimits') || 'Review budget limits and spending patterns',
        icon: '⚠️'
      });
    } else if (complianceScore >= 90) {
      insights.push({
        type: 'success',
        priority: 'info',
        title: t('excellentBudgetControl') || 'Excellent Budget Control',
        description: t('excellentBudgetControlDesc') || `${complianceScore}% of categories are within budget`,
        action: t('maintainCurrentHabits') || 'Keep up the good spending habits',
        icon: '🎯'
      });
    }

    // Over-budget insights
    if (categoriesOverBudget.length > 0) {
      const topOverage = categoriesOverBudget[0];
      insights.push({
        type: 'warning',
        priority: 'high',
        title: t('categoriesOverBudget') || 'Categories Over Budget',
        description: `${topOverage.subcategoryName} is ${topOverage.overagePercentage.toFixed(0)}% over budget`,
        action: t('reviewSpendingInCategory') || 'Review spending in this category',
        icon: '📈',
        categoryId: topOverage.subcategoryId
      });
    }

    // Savings opportunities
    if (opportunities.length > 0) {
      const totalUnused = opportunities.reduce((sum, opp) => sum + opp.unusedAmount, 0);
      insights.push({
        type: 'info',
        priority: 'medium',
        title: t('budgetSavingsAvailable') || 'Budget Savings Available',
        description: `${formatCurrency(totalUnused)} unused across ${opportunities.length} categories`,
        action: t('considerReallocatingBudget') || 'Consider reallocating unused budget',
        icon: '💡'
      });
    }

    // Variance insights
    if (variances.overages.length > 0 && variances.savings.length > 0) {
      insights.push({
        type: 'info',
        priority: 'medium',
        title: t('budgetRebalanceOpportunity') || 'Budget Rebalance Opportunity',
        description: t('budgetRebalanceDesc') || 'Some categories are over-budget while others are under-utilized',
        action: t('reviewBudgetAllocation') || 'Review budget allocation across categories',
        icon: '⚖️'
      });
    }

    return insights.sort((a, b) => {
      const priorityOrder = { 'high': 0, 'medium': 1, 'info': 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  };

  if (!activeBudget) {
    return (
      <div className="budget-analysis-panel">
        <div className="panel-header">
          <h3 style={{ color: '#1a202c' }}>{t('budgetAnalysis') || 'Budget Analysis'}</h3>
        </div>
        
        <div className="no-budget-analysis">
          <div className="no-budget-content">
            <span className="no-budget-icon">📊</span>
            <h4 style={{ color: '#1a202c' }}>{t('setBudgetForAnalysis') || 'Set Up Budget for Analysis'}</h4>
            <p style={{ color: '#64748b' }}>
              {t('setBudgetForAnalysisDesc') || 'Create a budget to unlock comprehensive spending analysis and insights'}
            </p>
            <button 
              className="btn-setup-budget"
              onClick={() => onNavigate && onNavigate('budget-setup')}
              style={{ color: 'white' }}
            >
              {t('setupBudget') || 'Setup Budget'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="budget-analysis-loading">
        <div className="loading-content">
          <div className="loading-spinner"></div>
          <p>{t('analyzingBudget') || 'Analyzing budget data...'}</p>
        </div>
      </div>
    );
  }

  if (!analysis) {
    return null;
  }

  return (
    <div className="budget-analysis-panel">
      {/* Header */}
      <div className="panel-header">
        <div className="header-title">
          <h3 style={{ color: '#1a202c' }}>{t('budgetAnalysis') || 'Budget Analysis'}</h3>
          <p style={{ color: '#64748b' }}>
            {t('budgetAnalysisDescription') || 'Comprehensive budget insights and recommendations'}
          </p>
        </div>
        
        <div className="analysis-status">
          <div className={`status-badge ${analysis.overallStatus}`}>
            <span className="status-icon">
              {analysis.overallStatus === 'excellent' ? '🎯' :
               analysis.overallStatus === 'good' ? '✅' :
               analysis.overallStatus === 'fair' ? '⚡' : '⚠️'}
            </span>
            <span style={{ color: 'white' }}>
              {analysis.overallStatus === 'excellent' ? (t('excellent') || 'Excellent') :
               analysis.overallStatus === 'good' ? (t('good') || 'Good') :
               analysis.overallStatus === 'fair' ? (t('fair') || 'Fair') : 
               (t('needsImprovement') || 'Needs Improvement')}
            </span>
          </div>
        </div>
      </div>

      {/* Budget Compliance Score */}
      <div className="analysis-section compliance-section">
        <div className="section-header">
          <h4 style={{ color: '#1a202c' }}>{t('budgetComplianceScore') || 'Budget Compliance Score'}</h4>
          <div className="compliance-score">
            <div className="score-circle">
              <div className="score-text" style={{ color: '#1a202c' }}>
                {analysis.complianceScore}%
              </div>
            </div>
          </div>
        </div>
        
        <div className="compliance-details">
          <div className="detail-item">
            <span className="detail-label" style={{ color: '#64748b' }}>
              {t('categoriesWithinBudget') || 'Within Budget'}:
            </span>
            <span className="detail-value" style={{ color: '#059669' }}>
              {expenseData.filter(cat => cat.hasBudget && cat.variance <= 0).length}
            </span>
          </div>
          <div className="detail-item">
            <span className="detail-label" style={{ color: '#64748b' }}>
              {t('categoriesOverBudget') || 'Over Budget'}:
            </span>
            <span className="detail-value" style={{ color: '#dc2626' }}>
              {analysis.categoriesOverBudget.length}
            </span>
          </div>
        </div>
      </div>

      {/* Categories Over Budget */}
      {analysis.categoriesOverBudget.length > 0 && (
        <div className="analysis-section over-budget-section">
          <h4 style={{ color: '#1a202c' }}>{t('categoriesOverBudget') || 'Categories Over Budget'}</h4>
          <div className="category-list">
            {analysis.categoriesOverBudget.slice(0, 3).map(category => (
              <div key={category.subcategoryId} className="category-item over-budget">
                <div className="category-info">
                  <span className="category-name" style={{ color: '#1a202c' }}>
                    {category.subcategoryName}
                  </span>
                  <span className="category-overage" style={{ color: '#dc2626' }}>
                    +{formatCurrency(category.variance)} ({category.overagePercentage.toFixed(0)}% over)
                  </span>
                </div>
                <div className="category-progress">
                  <div className="progress-bar over-budget">
                    <div 
                      className="progress-fill"
                      style={{ width: `${Math.min(category.variancePercentage, 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Biggest Variances */}
      {(analysis.biggestVariances.overages.length > 0 || analysis.biggestVariances.savings.length > 0) && (
        <div className="analysis-section variances-section">
          <h4 style={{ color: '#1a202c' }}>{t('biggestVariances') || 'Biggest Variances'}</h4>
          
          {analysis.biggestVariances.overages.length > 0 && (
            <div className="variance-group">
              <h5 style={{ color: '#dc2626' }}>{t('topOverages') || 'Top Overages'}</h5>
              {analysis.biggestVariances.overages.map(category => (
                <div key={category.subcategoryId} className="variance-item overage">
                  <span className="variance-name" style={{ color: '#1a202c' }}>
                    {category.subcategoryName}
                  </span>
                  <span className="variance-amount" style={{ color: '#dc2626' }}>
                    +{formatCurrency(category.variance)}
                  </span>
                </div>
              ))}
            </div>
          )}

          {analysis.biggestVariances.savings.length > 0 && (
            <div className="variance-group">
              <h5 style={{ color: '#059669' }}>{t('topSavings') || 'Top Savings'}</h5>
              {analysis.biggestVariances.savings.map(category => (
                <div key={category.subcategoryId} className="variance-item savings">
                  <span className="variance-name" style={{ color: '#1a202c' }}>
                    {category.subcategoryName}
                  </span>
                  <span className="variance-amount" style={{ color: '#059669' }}>
                    {formatCurrency(category.variance)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Savings Opportunities */}
      {analysis.savingsOpportunities.length > 0 && (
        <div className="analysis-section savings-section">
          <h4 style={{ color: '#1a202c' }}>{t('savingsOpportunities') || 'Savings Opportunities'}</h4>
          <div className="savings-list">
            {analysis.savingsOpportunities.slice(0, 3).map(opportunity => (
              <div key={opportunity.subcategoryId} className="savings-item">
                <div className="savings-info">
                  <span className="savings-name" style={{ color: '#1a202c' }}>
                    {opportunity.subcategoryName}
                  </span>
                  <span className="savings-amount" style={{ color: '#059669' }}>
                    {formatCurrency(opportunity.unusedAmount)} unused ({opportunity.utilizationRate.toFixed(0)}% used)
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Next Period Projection */}
      {analysis.nextPeriodProjection && (
        <div className="analysis-section projection-section">
          <h4 style={{ color: '#1a202c' }}>{t('nextPeriodProjection') || 'Next Period Projection'}</h4>
          <div className="projection-content">
            <div className="projection-item">
              <span className="projection-label" style={{ color: '#64748b' }}>
                {t('projectedSpending') || 'Projected Spending'}:
              </span>
              <span className="projection-value" style={{ color: '#1a202c' }}>
                {formatCurrency(analysis.nextPeriodProjection.projectedSpending)}
              </span>
            </div>
            <div className="projection-item">
              <span className="projection-label" style={{ color: '#64748b' }}>
                {t('projectedVariance') || 'Projected Variance'}:
              </span>
              <span 
                className="projection-value" 
                style={{ 
                  color: analysis.nextPeriodProjection.projectedVariance > 0 ? '#dc2626' : '#059669' 
                }}
              >
                {analysis.nextPeriodProjection.projectedVariance > 0 ? '+' : ''}
                {formatCurrency(analysis.nextPeriodProjection.projectedVariance)}
              </span>
            </div>
            <div className="projection-recommendation">
              <p style={{ color: '#64748b' }}>
                {analysis.nextPeriodProjection.recommendation}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Actionable Insights */}
      {analysis.insights.length > 0 && (
        <div className="analysis-section insights-section">
          <h4 style={{ color: '#1a202c' }}>{t('actionableInsights') || 'Actionable Insights'}</h4>
          <div className="insights-list">
            {analysis.insights.map((insight, index) => (
              <div key={index} className={`insight-item ${insight.type} priority-${insight.priority}`}>
                <div className="insight-header">
                  <span className="insight-icon">{insight.icon}</span>
                  <span className="insight-title" style={{ color: '#1a202c' }}>
                    {insight.title}
                  </span>
                </div>
                <div className="insight-body">
                  <p className="insight-description" style={{ color: '#64748b' }}>
                    {insight.description}
                  </p>
                  <p className="insight-action" style={{ color: '#3b82f6' }}>
                    💡 {insight.action}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="analysis-actions">
        <button 
          className="btn-secondary"
          onClick={() => onNavigate && onNavigate('budget-setup')}
        >
          {t('adjustBudget') || 'Adjust Budget'}
        </button>
        <button className="btn-primary" style={{ color: 'white' }}>
          {t('exportAnalysis') || 'Export Analysis'}
        </button>
      </div>
    </div>
  );
};

export default BudgetAnalysisPanel;