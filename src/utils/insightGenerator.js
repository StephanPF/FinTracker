/**
 * Smart Insights Engine
 * Generates automated insights and recommendations for budget analysis
 * Follows BUILD_NEW_FEATURE_GUIDE.md patterns
 */

/**
 * Generate comprehensive budget insights
 * @param {Array} transactionData - Transaction data with budget context
 * @param {Object} budgetData - Active budget data
 * @param {Object} options - Analysis options
 * @returns {Array} Array of insight objects
 */
export const generateBudgetInsights = (transactionData, budgetData, options = {}) => {
  try {
    if (!transactionData || !budgetData) {
      return [];
    }

    const insights = [];
    const config = {
      significantVarianceThreshold: 100, // $100
      largeVariancePercentage: 20, // 20%
      underUtilizationThreshold: 70, // 70% usage
      ...options
    };

    // Generate different types of insights
    insights.push(...generateOverBudgetInsights(transactionData, config));
    insights.push(...generateSavingsOpportunityInsights(transactionData, config));
    insights.push(...generateSpendingPatternInsights(transactionData, config));
    insights.push(...generateBudgetEfficiencyInsights(transactionData, config));
    insights.push(...generateComplianceInsights(transactionData, config));
    insights.push(...generateReallocationInsights(transactionData, config));

    // Sort by priority and return top insights
    return prioritizeInsights(insights).slice(0, 8); // Limit to top 8 insights
  } catch (error) {
    console.error('Error generating budget insights:', error);
    return [];
  }
};

/**
 * Generate insights for over-budget categories
 */
const generateOverBudgetInsights = (transactionData, config) => {
  const insights = [];
  const overBudgetCategories = transactionData.filter(cat => 
    cat.hasBudget && cat.variance > 0
  );

  if (overBudgetCategories.length === 0) {
    // Positive insight when no categories are over budget
    insights.push({
      type: 'success',
      priority: 'medium',
      category: 'compliance',
      title: 'All Categories Within Budget',
      description: 'Congratulations! All budgeted categories are within their limits.',
      action: 'Consider setting more ambitious savings goals',
      icon: '🎯',
      confidence: 'high',
      impact: 'positive'
    });
  } else {
    // Critical over-budget categories
    const criticalOverruns = overBudgetCategories.filter(cat => 
      cat.variance > config.significantVarianceThreshold
    );

    if (criticalOverruns.length > 0) {
      const topOverrun = criticalOverruns[0];
      insights.push({
        type: 'warning',
        priority: 'high',
        category: 'overspending',
        title: `${topOverrun.subcategoryName} Significantly Over Budget`,
        description: `This category is $${topOverrun.variance.toFixed(2)} over budget (${((topOverrun.variance / topOverrun.budgetAmount) * 100).toFixed(0)}% over)`,
        action: 'Review recent transactions and identify areas to reduce spending',
        icon: '⚠️',
        confidence: 'high',
        impact: 'negative',
        subcategoryId: topOverrun.subcategoryId,
        data: {
          variance: topOverrun.variance,
          budgetAmount: topOverrun.budgetAmount,
          percentageOver: (topOverrun.variance / topOverrun.budgetAmount) * 100
        }
      });
    }

    // Multiple categories over budget pattern
    if (overBudgetCategories.length > 2) {
      insights.push({
        type: 'warning',
        priority: 'high',
        category: 'pattern',
        title: 'Multiple Categories Over Budget',
        description: `${overBudgetCategories.length} categories are exceeding their budget limits`,
        action: 'Consider reviewing your overall budget allocation strategy',
        icon: '📊',
        confidence: 'high',
        impact: 'negative',
        data: {
          categoriesCount: overBudgetCategories.length,
          totalOverage: overBudgetCategories.reduce((sum, cat) => sum + cat.variance, 0)
        }
      });
    }
  }

  return insights;
};

/**
 * Generate savings opportunity insights
 */
const generateSavingsOpportunityInsights = (transactionData, config) => {
  const insights = [];
  const underUtilizedCategories = transactionData.filter(cat => 
    cat.hasBudget && 
    cat.variance < -config.significantVarianceThreshold &&
    cat.variancePercentage < config.underUtilizationThreshold
  );

  if (underUtilizedCategories.length > 0) {
    const totalUnused = underUtilizedCategories.reduce((sum, cat) => sum + Math.abs(cat.variance), 0);
    const topSaver = underUtilizedCategories[0];

    insights.push({
      type: 'info',
      priority: 'medium',
      category: 'savings',
      title: 'Significant Budget Savings Available',
      description: `$${totalUnused.toFixed(2)} unused across ${underUtilizedCategories.length} categories. ${topSaver.subcategoryName} has the most unused budget.`,
      action: 'Consider reallocating unused budget to other categories or savings goals',
      icon: '💡',
      confidence: 'high',
      impact: 'positive',
      data: {
        totalUnused,
        categoriesCount: underUtilizedCategories.length,
        topCategory: topSaver.subcategoryName
      }
    });

    // Individual category with very low utilization
    const veryLowUtilization = underUtilizedCategories.find(cat => 
      cat.variancePercentage < 30
    );

    if (veryLowUtilization) {
      insights.push({
        type: 'info',
        priority: 'low',
        category: 'efficiency',
        title: `${veryLowUtilization.subcategoryName} Budget Too High`,
        description: `Only ${veryLowUtilization.variancePercentage.toFixed(0)}% of budget used. Consider reducing allocation.`,
        action: 'Review if this budget amount is realistic for your spending patterns',
        icon: '📉',
        confidence: 'medium',
        impact: 'neutral',
        subcategoryId: veryLowUtilization.subcategoryId
      });
    }
  }

  return insights;
};

/**
 * Generate spending pattern insights
 */
const generateSpendingPatternInsights = (transactionData, config) => {
  const insights = [];
  const budgetedCategories = transactionData.filter(cat => cat.hasBudget);
  
  if (budgetedCategories.length === 0) return insights;

  // High variance categories (both positive and negative)
  const highVarianceCategories = budgetedCategories.filter(cat => 
    Math.abs(cat.variance) > config.significantVarianceThreshold
  );

  if (highVarianceCategories.length > budgetedCategories.length * 0.5) {
    insights.push({
      type: 'info',
      priority: 'medium',
      category: 'pattern',
      title: 'High Budget Variance Detected',
      description: `${Math.round((highVarianceCategories.length / budgetedCategories.length) * 100)}% of categories have significant budget variances`,
      action: 'Review budget amounts to better match your actual spending patterns',
      icon: '📈',
      confidence: 'medium',
      impact: 'neutral'
    });
  }

  // Consistent overspending pattern
  const consistentOverspenders = budgetedCategories.filter(cat => 
    cat.variance > 0 && cat.variancePercentage > config.largeVariancePercentage
  );

  if (consistentOverspenders.length >= 2) {
    insights.push({
      type: 'warning',
      priority: 'medium',
      category: 'pattern',
      title: 'Consistent Overspending Pattern',
      description: `${consistentOverspenders.length} categories consistently exceed budget by more than ${config.largeVariancePercentage}%`,
      action: 'Consider if your budget allocations are realistic for your lifestyle',
      icon: '🔄',
      confidence: 'high',
      impact: 'negative'
    });
  }

  return insights;
};

/**
 * Generate budget efficiency insights
 */
const generateBudgetEfficiencyInsights = (transactionData, config) => {
  const insights = [];
  const budgetedCategories = transactionData.filter(cat => cat.hasBudget);
  
  if (budgetedCategories.length === 0) return insights;

  // Calculate overall efficiency
  const totalBudgeted = budgetedCategories.reduce((sum, cat) => sum + cat.budgetAmount, 0);
  const totalSpent = budgetedCategories.reduce((sum, cat) => sum + cat.actualSpent, 0);
  const efficiencyRate = (totalSpent / totalBudgeted) * 100;

  if (efficiencyRate < 80) {
    insights.push({
      type: 'info',
      priority: 'low',
      category: 'efficiency',
      title: 'Low Budget Utilization',
      description: `Only ${efficiencyRate.toFixed(0)}% of total budget is being used`,
      action: 'Consider reducing budget amounts or reallocating to other financial goals',
      icon: '📊',
      confidence: 'high',
      impact: 'neutral'
    });
  } else if (efficiencyRate > 105) {
    insights.push({
      type: 'warning',
      priority: 'high',
      category: 'efficiency',
      title: 'Budget Overrun Alert',
      description: `Spending ${efficiencyRate.toFixed(0)}% of total budget - ${(efficiencyRate - 100).toFixed(0)}% over`,
      action: 'Immediate spending reduction needed to avoid budget deficit',
      icon: '🚨',
      confidence: 'high',
      impact: 'negative'
    });
  } else if (efficiencyRate >= 95 && efficiencyRate <= 105) {
    insights.push({
      type: 'success',
      priority: 'low',
      category: 'efficiency',
      title: 'Excellent Budget Efficiency',
      description: `Budget utilization at ${efficiencyRate.toFixed(0)}% - optimal range`,
      action: 'Maintain current spending habits and budget allocations',
      icon: '⚡',
      confidence: 'high',
      impact: 'positive'
    });
  }

  return insights;
};

/**
 * Generate compliance insights
 */
const generateComplianceInsights = (transactionData, config) => {
  const insights = [];
  const budgetedCategories = transactionData.filter(cat => cat.hasBudget);
  
  if (budgetedCategories.length === 0) return insights;

  const categoriesWithinBudget = budgetedCategories.filter(cat => cat.variance <= 0);
  const complianceRate = (categoriesWithinBudget.length / budgetedCategories.length) * 100;

  if (complianceRate === 100) {
    insights.push({
      type: 'success',
      priority: 'medium',
      category: 'compliance',
      title: 'Perfect Budget Compliance',
      description: 'All categories are within their budget limits',
      action: 'Excellent work! Consider setting stretch savings goals',
      icon: '🏆',
      confidence: 'high',
      impact: 'positive'
    });
  } else if (complianceRate < 50) {
    insights.push({
      type: 'warning',
      priority: 'high',
      category: 'compliance',
      title: 'Low Budget Compliance',
      description: `Only ${complianceRate.toFixed(0)}% of categories are within budget`,
      action: 'Urgent budget review needed - consider adjusting limits or spending habits',
      icon: '⚠️',
      confidence: 'high',
      impact: 'negative'
    });
  } else if (complianceRate >= 80) {
    insights.push({
      type: 'success',
      priority: 'low',
      category: 'compliance',
      title: 'Good Budget Discipline',
      description: `${complianceRate.toFixed(0)}% of categories are within budget limits`,
      action: 'Keep up the good work and focus on the remaining categories',
      icon: '👍',
      confidence: 'high',
      impact: 'positive'
    });
  }

  return insights;
};

/**
 * Generate reallocation insights
 */
const generateReallocationInsights = (transactionData, config) => {
  const insights = [];
  const overBudgetCategories = transactionData.filter(cat => cat.hasBudget && cat.variance > 0);
  const underBudgetCategories = transactionData.filter(cat => 
    cat.hasBudget && cat.variance < -config.significantVarianceThreshold
  );

  if (overBudgetCategories.length > 0 && underBudgetCategories.length > 0) {
    const totalOverage = overBudgetCategories.reduce((sum, cat) => sum + cat.variance, 0);
    const totalUnderUsed = underBudgetCategories.reduce((sum, cat) => sum + Math.abs(cat.variance), 0);

    if (totalUnderUsed >= totalOverage * 0.8) { // If unused budget can cover most of overage
      insights.push({
        type: 'info',
        priority: 'medium',
        category: 'reallocation',
        title: 'Budget Reallocation Opportunity',
        description: `You have $${totalUnderUsed.toFixed(2)} unused budget that could cover most overages`,
        action: 'Consider reallocating budget from under-used to over-spent categories',
        icon: '⚖️',
        confidence: 'high',
        impact: 'positive',
        data: {
          totalOverage,
          totalUnderUsed,
          coveragePercentage: (totalUnderUsed / totalOverage) * 100
        }
      });
    }
  }

  return insights;
};

/**
 * Prioritize insights based on impact and urgency
 */
const prioritizeInsights = (insights) => {
  const priorityWeights = {
    high: 10,
    medium: 5,
    low: 1
  };

  const typeWeights = {
    warning: 8,
    info: 5,
    success: 3
  };

  const categoryWeights = {
    overspending: 10,
    compliance: 8,
    efficiency: 6,
    savings: 5,
    pattern: 4,
    reallocation: 3
  };

  return insights
    .map(insight => ({
      ...insight,
      score: (priorityWeights[insight.priority] || 1) + 
             (typeWeights[insight.type] || 1) + 
             (categoryWeights[insight.category] || 1)
    }))
    .sort((a, b) => b.score - a.score);
};

/**
 * Generate trend-based insights from historical data
 * @param {Array} historicalData - Historical spending data by period
 * @param {Object} currentData - Current period data
 * @returns {Array} Trend insights
 */
export const generateTrendInsights = (historicalData, currentData) => {
  try {
    const insights = [];

    if (!historicalData || historicalData.length < 2) {
      return insights;
    }

    // Analyze spending trends
    currentData.forEach(category => {
      const historicalCategory = historicalData.find(h => h.subcategoryId === category.subcategoryId);
      if (!historicalCategory) return;

      const trend = analyzeCategoryTrend(historicalCategory.dataPoints, category.actualSpent);
      
      if (trend.direction === 'increasing' && trend.changePercentage > 20) {
        insights.push({
          type: 'info',
          priority: 'medium',
          category: 'trend',
          title: `${category.subcategoryName} Spending Increasing`,
          description: `Spending has increased ${trend.changePercentage.toFixed(0)}% over recent periods`,
          action: 'Monitor this category closely and consider budget adjustment',
          icon: '📈',
          confidence: trend.confidence,
          impact: 'neutral'
        });
      }
    });

    return insights;
  } catch (error) {
    console.error('Error generating trend insights:', error);
    return [];
  }
};

/**
 * Analyze trend for a specific category
 */
const analyzeCategoryTrend = (dataPoints, currentAmount) => {
  if (!dataPoints || dataPoints.length < 2) {
    return { direction: 'stable', changePercentage: 0, confidence: 'low' };
  }

  const recentAverage = dataPoints.slice(-3).reduce((sum, point) => sum + point.amount, 0) / 3;
  const olderAverage = dataPoints.slice(0, -3).reduce((sum, point) => sum + point.amount, 0) / Math.max(1, dataPoints.length - 3);

  const changePercentage = ((recentAverage - olderAverage) / olderAverage) * 100;
  
  return {
    direction: changePercentage > 5 ? 'increasing' : changePercentage < -5 ? 'decreasing' : 'stable',
    changePercentage: Math.abs(changePercentage),
    confidence: dataPoints.length >= 6 ? 'high' : dataPoints.length >= 3 ? 'medium' : 'low'
  };
};

/**
 * Generate insights for specific time periods (seasonal, monthly patterns)
 * @param {Array} transactionData - Current period transaction data
 * @param {string} period - Time period (monthly, quarterly, etc.)
 * @returns {Array} Period-specific insights
 */
export const generatePeriodInsights = (transactionData, period) => {
  try {
    const insights = [];
    
    // Add period-specific context to insights
    const periodContext = getPeriodContext(period);
    
    // Generate insights specific to the time period
    if (periodContext.isEndOfPeriod) {
      insights.push({
        type: 'info',
        priority: 'medium',
        category: 'timing',
        title: `${periodContext.label} Budget Review`,
        description: `End of ${period} - time to review budget performance`,
        action: 'Analyze spending patterns and adjust next period\'s budget',
        icon: '📅',
        confidence: 'high',
        impact: 'neutral'
      });
    }

    return insights;
  } catch (error) {
    console.error('Error generating period insights:', error);
    return [];
  }
};

/**
 * Get context information for the current period
 */
const getPeriodContext = (period) => {
  const now = new Date();
  
  switch (period) {
    case 'monthly':
      return {
        label: 'Monthly',
        isEndOfPeriod: now.getDate() > 25,
        isStartOfPeriod: now.getDate() <= 5
      };
    case 'quarterly':
      const month = now.getMonth() + 1;
      return {
        label: 'Quarterly',
        isEndOfPeriod: [3, 6, 9, 12].includes(month) && now.getDate() > 25,
        isStartOfPeriod: [1, 4, 7, 10].includes(month) && now.getDate() <= 5
      };
    case 'yearly':
      return {
        label: 'Yearly',
        isEndOfPeriod: now.getMonth() === 11 && now.getDate() > 25,
        isStartOfPeriod: now.getMonth() === 0 && now.getDate() <= 5
      };
    default:
      return {
        label: 'Period',
        isEndOfPeriod: false,
        isStartOfPeriod: false
      };
  }
};

export default {
  generateBudgetInsights,
  generateTrendInsights,
  generatePeriodInsights
};