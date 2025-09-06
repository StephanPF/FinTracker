/**
 * Budget Calculations Utility
 * Provides budget analysis and calculation functions for analytics
 */

/**
 * Calculate budget variance between actual and budgeted amounts
 * @param {number} actual - Actual amount spent
 * @param {number} budgeted - Budgeted amount
 * @returns {Object} Variance analysis
 */
export const calculateBudgetVariance = (actual, budgeted) => {
  try {
    if (!budgeted || budgeted === 0) {
      return {
        variance: actual,
        variancePercentage: null,
        status: 'no_budget',
        isOverBudget: actual > 0,
        description: 'No budget set for comparison'
      };
    }

    const variance = actual - budgeted;
    const variancePercentage = (variance / budgeted) * 100;
    
    let status = 'good';
    let description = 'Within budget';
    
    if (variancePercentage > 0) {
      status = 'over';
      description = `Over budget by ${variancePercentage.toFixed(1)}%`;
    } else if (variancePercentage > -20) {
      status = 'warning';
      description = `Close to budget limit (${(100 - Math.abs(variancePercentage)).toFixed(1)}% used)`;
    } else {
      status = 'good';
      description = `Under budget by ${Math.abs(variancePercentage).toFixed(1)}%`;
    }

    return {
      variance,
      variancePercentage,
      status,
      isOverBudget: variance > 0,
      description
    };
  } catch (error) {
    console.error('Error calculating budget variance:', error);
    return {
      variance: 0,
      variancePercentage: null,
      status: 'error',
      isOverBudget: false,
      description: 'Error calculating variance'
    };
  }
};

/**
 * Calculate overall budget compliance score
 * @param {Array} subcategoriesWithBudget - Array of subcategories with budget data
 * @returns {Object} Budget compliance analysis
 */
export const getBudgetComplianceScore = (subcategoriesWithBudget) => {
  try {
    if (!subcategoriesWithBudget || subcategoriesWithBudget.length === 0) {
      return {
        score: 0,
        totalCategories: 0,
        categoriesWithBudget: 0,
        categoriesOnTrack: 0,
        categoriesOverBudget: 0,
        totalBudgeted: 0,
        totalSpent: 0,
        overallVariance: 0
      };
    }

    const categoriesWithBudget = subcategoriesWithBudget.filter(cat => cat.hasBudget);
    const categoriesOnTrack = categoriesWithBudget.filter(cat => cat.variance <= 0).length;
    const categoriesOverBudget = categoriesWithBudget.filter(cat => cat.variance > 0).length;
    
    const totalBudgeted = categoriesWithBudget.reduce((sum, cat) => sum + cat.budgetAmount, 0);
    const totalSpent = categoriesWithBudget.reduce((sum, cat) => sum + cat.actualSpent, 0);
    const overallVariance = totalSpent - totalBudgeted;

    // Calculate compliance score (0-100)
    let score = 100;
    if (categoriesWithBudget.length > 0) {
      score = Math.max(0, Math.round((categoriesOnTrack / categoriesWithBudget.length) * 100));
    }

    return {
      score,
      totalCategories: subcategoriesWithBudget.length,
      categoriesWithBudget: categoriesWithBudget.length,
      categoriesOnTrack,
      categoriesOverBudget,
      totalBudgeted,
      totalSpent,
      overallVariance,
      overallVariancePercentage: totalBudgeted > 0 ? (overallVariance / totalBudgeted) * 100 : null
    };
  } catch (error) {
    console.error('Error calculating budget compliance score:', error);
    return {
      score: 0,
      totalCategories: 0,
      categoriesWithBudget: 0,
      categoriesOnTrack: 0,
      categoriesOverBudget: 0,
      totalBudgeted: 0,
      totalSpent: 0,
      overallVariance: 0
    };
  }
};

/**
 * Normalize amount from one period to another for comparison
 * @param {number} amount - Amount to normalize
 * @param {string} fromPeriod - Source period
 * @param {string} toPeriod - Target period
 * @returns {number} Normalized amount
 */
export const normalizePeriodForComparison = (amount, fromPeriod, toPeriod) => {
  try {
    if (fromPeriod === toPeriod) {
      return amount;
    }

    // First normalize to monthly
    let monthlyAmount;
    switch (fromPeriod) {
      case 'weekly':
        monthlyAmount = amount * (52 / 12); // ~4.33 weeks per month
        break;
      case 'monthly':
        monthlyAmount = amount;
        break;
      case 'quarterly':
        monthlyAmount = amount / 3; // 3 months per quarter
        break;
      case 'yearly':
        monthlyAmount = amount / 12; // 12 months per year
        break;
      default:
        monthlyAmount = amount;
    }

    // Then convert to target period
    switch (toPeriod) {
      case 'weekly':
        return monthlyAmount * (12 / 52); // ~0.23 months per week
      case 'monthly':
        return monthlyAmount;
      case 'quarterly':
        return monthlyAmount * 3; // 3 months per quarter
      case 'yearly':
        return monthlyAmount * 12; // 12 months per year
      default:
        return monthlyAmount;
    }
  } catch (error) {
    console.error('Error normalizing period for comparison:', error);
    return amount;
  }
};

/**
 * Generate budget insights based on transaction and budget data
 * @param {Array} transactionData - Transaction data with budget context
 * @param {Object} budgetData - Active budget data
 * @returns {Array} Array of insight objects
 */
export const generateBudgetInsights = (transactionData, budgetData) => {
  try {
    const insights = [];

    if (!transactionData || transactionData.length === 0) {
      return insights;
    }

    // Over-budget categories
    const overBudgetCategories = transactionData.filter(cat => cat.hasBudget && cat.variance > 0);
    if (overBudgetCategories.length > 0) {
      const totalOverage = overBudgetCategories.reduce((sum, cat) => sum + cat.variance, 0);
      insights.push({
        type: 'warning',
        priority: 'high',
        title: 'Categories Over Budget',
        description: `${overBudgetCategories.length} categories exceeded budget this period`,
        detail: `Total overage: ${totalOverage.toFixed(2)}`,
        action: 'Review spending in these areas',
        categories: overBudgetCategories.map(cat => ({
          id: cat.subcategoryId,
          name: cat.subcategoryName,
          overage: cat.variance
        }))
      });
    }

    // Significant savings opportunities
    const significantSavings = transactionData.filter(cat => 
      cat.hasBudget && cat.variance < -100 && cat.variancePercentage < 70
    );
    if (significantSavings.length > 0) {
      const totalSavings = Math.abs(significantSavings.reduce((sum, cat) => sum + cat.variance, 0));
      insights.push({
        type: 'success',
        priority: 'medium',
        title: 'Budget Savings Opportunities',
        description: 'You have significant unused budget in some categories',
        detail: `Total unused: ${totalSavings.toFixed(2)}`,
        action: 'Consider reallocating budget or adjusting targets',
        categories: significantSavings.map(cat => ({
          id: cat.subcategoryId,
          name: cat.subcategoryName,
          unused: Math.abs(cat.variance),
          utilizationRate: cat.variancePercentage
        }))
      });
    }

    // Categories approaching budget limits
    const approachingLimit = transactionData.filter(cat => 
      cat.hasBudget && cat.variancePercentage > 80 && cat.variancePercentage <= 100
    );
    if (approachingLimit.length > 0) {
      insights.push({
        type: 'info',
        priority: 'medium',
        title: 'Categories Approaching Budget Limits',
        description: `${approachingLimit.length} categories are close to their budget limits`,
        detail: 'Monitor these categories closely',
        action: 'Consider adjusting spending or increasing budget',
        categories: approachingLimit.map(cat => ({
          id: cat.subcategoryId,
          name: cat.subcategoryName,
          utilizationRate: cat.variancePercentage,
          remaining: cat.budgetAmount - cat.actualSpent
        }))
      });
    }

    // Categories without budgets
    const noBudgetCategories = transactionData.filter(cat => !cat.hasBudget && cat.actualSpent > 0);
    if (noBudgetCategories.length > 0) {
      const totalUnbudgeted = noBudgetCategories.reduce((sum, cat) => sum + cat.actualSpent, 0);
      insights.push({
        type: 'info',
        priority: 'low',
        title: 'Categories Without Budget',
        description: `${noBudgetCategories.length} spending categories don't have budget allocations`,
        detail: `Total unbudgeted spending: ${totalUnbudgeted.toFixed(2)}`,
        action: 'Consider adding these categories to your budget',
        categories: noBudgetCategories.map(cat => ({
          id: cat.subcategoryId,
          name: cat.subcategoryName,
          spent: cat.actualSpent
        }))
      });
    }

    // Budget adherence trends (placeholder for future trend analysis)
    const complianceScore = getBudgetComplianceScore(transactionData);
    if (complianceScore.score < 70) {
      insights.push({
        type: 'warning',
        priority: 'high',
        title: 'Low Budget Adherence',
        description: `Budget compliance score: ${complianceScore.score}%`,
        detail: `${complianceScore.categoriesOverBudget} of ${complianceScore.categoriesWithBudget} budgeted categories are over budget`,
        action: 'Review spending patterns and consider budget adjustments',
        categories: []
      });
    }

    // Sort insights by priority and type
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    return insights.sort((a, b) => {
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
      if (priorityDiff !== 0) return priorityDiff;
      
      // Secondary sort by type (warnings first)
      const typeOrder = { warning: 3, info: 2, success: 1 };
      return typeOrder[b.type] - typeOrder[a.type];
    });

  } catch (error) {
    console.error('Error generating budget insights:', error);
    return [];
  }
};

/**
 * Calculate period-over-period comparison
 * @param {number} currentAmount - Current period amount
 * @param {number} previousAmount - Previous period amount
 * @returns {Object} Comparison analysis
 */
export const calculatePeriodComparison = (currentAmount, previousAmount) => {
  try {
    if (!previousAmount || previousAmount === 0) {
      return {
        change: currentAmount,
        changePercentage: null,
        trend: currentAmount > 0 ? 'up' : 'flat',
        description: 'No previous period data'
      };
    }

    const change = currentAmount - previousAmount;
    const changePercentage = (change / Math.abs(previousAmount)) * 100;
    
    let trend = 'flat';
    if (Math.abs(changePercentage) > 5) {
      trend = changePercentage > 0 ? 'up' : 'down';
    }

    const description = trend === 'flat' 
      ? 'Similar to previous period'
      : `${Math.abs(changePercentage).toFixed(1)}% ${trend} from previous period`;

    return {
      change,
      changePercentage,
      trend,
      description
    };
  } catch (error) {
    console.error('Error calculating period comparison:', error);
    return {
      change: 0,
      changePercentage: null,
      trend: 'flat',
      description: 'Error calculating comparison'
    };
  }
};