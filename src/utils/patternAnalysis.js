/**
 * Advanced Pattern Analysis Utility
 * Sophisticated analytics for cashflow pattern recognition and insights
 * Follows BUILD_NEW_FEATURE_GUIDE.md principles
 */

/**
 * Analyze spending patterns and generate insights
 * @param {Array} transactions - Transaction data array
 * @param {Object} activeBudget - Active budget configuration
 * @param {Object} dateRange - Analysis date range
 * @returns {Object} Comprehensive pattern analysis results
 */
export const analyzeSpendingPatterns = (transactions, activeBudget, dateRange) => {
  const analysis = {
    seasonalPatterns: analyzeSeasonalPatterns(transactions, dateRange),
    recurringTransactions: identifyRecurringTransactions(transactions),
    spendingCycles: analyzeSpendingCycles(transactions),
    budgetEfficiency: analyzeBudgetEfficiency(transactions, activeBudget),
    cashflowSustainability: analyzeCashflowSustainability(transactions),
    anomalies: detectSpendingAnomalies(transactions),
    correlations: analyzeSpendingCorrelations(transactions),
    predictiveTrends: analyzePredictiveTrends(transactions)
  };

  // Generate comprehensive insights
  analysis.insights = generatePatternInsights(analysis);
  analysis.riskFactors = identifyRiskFactors(analysis);
  analysis.opportunities = identifyOptimizationOpportunities(analysis);

  return analysis;
};

/**
 * Analyze seasonal spending patterns
 */
const analyzeSeasonalPatterns = (transactions, dateRange) => {
  const monthlyData = groupTransactionsByMonth(transactions);
  const weeklyData = groupTransactionsByWeek(transactions);
  const dailyData = groupTransactionsByDayOfWeek(transactions);

  return {
    monthlyTrends: analyzeMonthlyTrends(monthlyData),
    weeklyPatterns: analyzeWeeklyPatterns(weeklyData),
    dailyPatterns: analyzeDailyPatterns(dailyData),
    seasonality: detectSeasonality(monthlyData),
    cyclicalBehavior: detectCyclicalBehavior(monthlyData)
  };
};

/**
 * Group transactions by month
 */
const groupTransactionsByMonth = (transactions) => {
  const grouped = {};
  
  transactions.forEach(transaction => {
    const monthKey = transaction.date.substring(0, 7); // YYYY-MM
    
    if (!grouped[monthKey]) {
      grouped[monthKey] = {
        month: monthKey,
        totalIncome: 0,
        totalExpenses: 0,
        transactions: [],
        categories: {}
      };
    }
    
    grouped[monthKey].transactions.push(transaction);
    
    if (transaction.categoryId === 'CAT_001') {
      grouped[monthKey].totalIncome += Math.abs(transaction.amount);
    } else if (transaction.categoryId === 'CAT_002') {
      grouped[monthKey].totalExpenses += Math.abs(transaction.amount);
      
      const subcategoryId = transaction.subcategoryId || 'uncategorized';
      if (!grouped[monthKey].categories[subcategoryId]) {
        grouped[monthKey].categories[subcategoryId] = 0;
      }
      grouped[monthKey].categories[subcategoryId] += Math.abs(transaction.amount);
    }
  });
  
  return Object.values(grouped).sort((a, b) => a.month.localeCompare(b.month));
};

/**
 * Group transactions by week
 */
const groupTransactionsByWeek = (transactions) => {
  const grouped = {};
  
  transactions.forEach(transaction => {
    const date = new Date(transaction.date);
    const year = date.getFullYear();
    const week = getWeekNumber(date);
    const weekKey = `${year}-W${week.toString().padStart(2, '0')}`;
    
    if (!grouped[weekKey]) {
      grouped[weekKey] = {
        week: weekKey,
        totalIncome: 0,
        totalExpenses: 0,
        transactions: []
      };
    }
    
    grouped[weekKey].transactions.push(transaction);
    
    if (transaction.categoryId === 'CAT_001') {
      grouped[weekKey].totalIncome += Math.abs(transaction.amount);
    } else if (transaction.categoryId === 'CAT_002') {
      grouped[weekKey].totalExpenses += Math.abs(transaction.amount);
    }
  });
  
  return Object.values(grouped).sort((a, b) => a.week.localeCompare(b.week));
};

/**
 * Group transactions by day of week
 */
const groupTransactionsByDayOfWeek = (transactions) => {
  const grouped = {};
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  
  // Initialize all days
  dayNames.forEach((day, index) => {
    grouped[index] = {
      dayOfWeek: index,
      dayName: day,
      totalIncome: 0,
      totalExpenses: 0,
      transactionCount: 0,
      averageTransaction: 0
    };
  });
  
  transactions.forEach(transaction => {
    const dayOfWeek = new Date(transaction.date).getDay();
    const amount = Math.abs(transaction.amount);
    
    grouped[dayOfWeek].transactionCount++;
    
    if (transaction.categoryId === 'CAT_001') {
      grouped[dayOfWeek].totalIncome += amount;
    } else if (transaction.categoryId === 'CAT_002') {
      grouped[dayOfWeek].totalExpenses += amount;
    }
  });
  
  // Calculate averages
  Object.values(grouped).forEach(day => {
    day.averageTransaction = day.transactionCount > 0 ? 
      (day.totalIncome + day.totalExpenses) / day.transactionCount : 0;
  });
  
  return Object.values(grouped);
};

/**
 * Identify recurring transactions
 */
const identifyRecurringTransactions = (transactions) => {
  const recurringCandidates = findRecurringCandidates(transactions);
  const confirmedRecurring = validateRecurringPatterns(recurringCandidates);
  
  return {
    candidates: recurringCandidates.length,
    confirmed: confirmedRecurring.length,
    patterns: confirmedRecurring,
    totalRecurringAmount: confirmedRecurring.reduce((sum, pattern) => sum + pattern.averageAmount, 0),
    coverage: confirmedRecurring.length / transactions.length
  };
};

/**
 * Find potential recurring transaction candidates
 */
const findRecurringCandidates = (transactions) => {
  const candidates = {};
  
  transactions.forEach(transaction => {
    // Group by similar description and amount
    const key = generateRecurringKey(transaction);
    
    if (!candidates[key]) {
      candidates[key] = {
        transactions: [],
        description: transaction.description,
        subcategoryId: transaction.subcategoryId,
        categoryId: transaction.categoryId,
        amounts: []
      };
    }
    
    candidates[key].transactions.push(transaction);
    candidates[key].amounts.push(Math.abs(transaction.amount));
  });
  
  // Filter candidates that appear multiple times
  return Object.values(candidates).filter(candidate => candidate.transactions.length >= 3);
};

/**
 * Generate recurring transaction key
 */
const generateRecurringKey = (transaction) => {
  // Normalize description for matching
  const normalizedDescription = normalizeDescription(transaction.description || '');
  const roundedAmount = Math.round(Math.abs(transaction.amount) / 10) * 10; // Round to nearest 10
  
  return `${transaction.subcategoryId}_${normalizedDescription}_${roundedAmount}`;
};

/**
 * Normalize description for recurring detection
 */
const normalizeDescription = (description) => {
  return description
    .toLowerCase()
    .replace(/\d+/g, '') // Remove numbers
    .replace(/[^a-z\s]/g, '') // Remove special chars
    .trim()
    .substring(0, 20); // Take first 20 chars
};

/**
 * Validate recurring patterns
 */
const validateRecurringPatterns = (candidates) => {
  return candidates
    .map(candidate => {
      const intervals = calculateIntervals(candidate.transactions);
      const averageInterval = intervals.length > 0 ? 
        intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length : 0;
      
      const intervalVariance = calculateVariance(intervals);
      const amountVariance = calculateVariance(candidate.amounts);
      
      // Determine if truly recurring based on consistency
      const isRecurring = intervals.length >= 2 && 
                         intervalVariance < 7 && // Days variance
                         averageInterval >= 7 && // At least weekly
                         averageInterval <= 90; // At most quarterly
      
      if (isRecurring) {
        return {
          description: candidate.description,
          subcategoryId: candidate.subcategoryId,
          categoryId: candidate.categoryId,
          frequency: Math.round(averageInterval),
          averageAmount: candidate.amounts.reduce((sum, amt) => sum + amt, 0) / candidate.amounts.length,
          consistency: {
            intervalVariance,
            amountVariance
          },
          occurrences: candidate.transactions.length,
          confidence: calculateRecurringConfidence(intervals, candidate.amounts)
        };
      }
      
      return null;
    })
    .filter(pattern => pattern !== null)
    .sort((a, b) => b.confidence - a.confidence);
};

/**
 * Calculate intervals between transactions
 */
const calculateIntervals = (transactions) => {
  if (transactions.length < 2) return [];
  
  const sortedTransactions = transactions.sort((a, b) => new Date(a.date) - new Date(b.date));
  const intervals = [];
  
  for (let i = 1; i < sortedTransactions.length; i++) {
    const prevDate = new Date(sortedTransactions[i - 1].date);
    const currDate = new Date(sortedTransactions[i].date);
    const daysDiff = (currDate - prevDate) / (1000 * 60 * 60 * 24);
    intervals.push(daysDiff);
  }
  
  return intervals;
};

/**
 * Calculate variance
 */
const calculateVariance = (values) => {
  if (values.length < 2) return 0;
  
  const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
  const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
  
  return Math.sqrt(variance);
};

/**
 * Calculate confidence level for recurring patterns
 */
const calculateRecurringConfidence = (intervals, amounts) => {
  const intervalConsistency = intervals.length > 0 ? 1 - (calculateVariance(intervals) / 30) : 0; // Normalize by 30 days
  const amountConsistency = amounts.length > 0 ? 1 - (calculateVariance(amounts) / Math.max(...amounts)) : 0;
  const frequencyScore = intervals.length >= 6 ? 1 : intervals.length / 6;
  
  return Math.max(0, Math.min(1, (intervalConsistency + amountConsistency + frequencyScore) / 3));
};

/**
 * Analyze spending cycles and rhythms
 */
const analyzeSpendingCycles = (transactions) => {
  const monthlyData = groupTransactionsByMonth(transactions);
  const weeklyData = groupTransactionsByWeek(transactions);
  
  return {
    monthlyCycle: analyzeMonthlySpendingCycle(monthlyData),
    weeklyCycle: analyzeWeeklySpendingCycle(weeklyData),
    paymentPatterns: analyzePaymentPatterns(transactions),
    spendingRhythm: analyzeSpendingRhythm(transactions)
  };
};

/**
 * Analyze monthly spending cycle
 */
const analyzeMonthlySpendingCycle = (monthlyData) => {
  if (monthlyData.length < 3) {
    return { trend: 'insufficient-data', pattern: 'unknown' };
  }
  
  const expenses = monthlyData.map(month => month.totalExpenses);
  const trend = calculateTrend(expenses);
  const pattern = detectMonthlyPattern(monthlyData);
  
  return {
    trend: trend > 5 ? 'increasing' : trend < -5 ? 'decreasing' : 'stable',
    trendRate: trend,
    pattern,
    averageMonthlyExpense: expenses.reduce((sum, exp) => sum + exp, 0) / expenses.length,
    volatility: calculateVariance(expenses)
  };
};

/**
 * Analyze budget efficiency trends
 */
const analyzeBudgetEfficiency = (transactions, activeBudget) => {
  if (!activeBudget) {
    return { efficiency: 0, message: 'No active budget for analysis' };
  }
  
  const budgetAnalysis = calculateBudgetUtilization(transactions, activeBudget);
  const efficiencyTrends = calculateEfficiencyTrends(budgetAnalysis);
  
  return {
    overallEfficiency: budgetAnalysis.overallEfficiency,
    categoryEfficiencies: budgetAnalysis.categoryEfficiencies,
    trends: efficiencyTrends,
    wasteAreas: identifyBudgetWaste(budgetAnalysis),
    optimizationPotential: calculateOptimizationPotential(budgetAnalysis)
  };
};

/**
 * Analyze cashflow sustainability
 */
const analyzeCashflowSustainability = (transactions) => {
  const monthlyData = groupTransactionsByMonth(transactions);
  const sustainabilityMetrics = calculateSustainabilityMetrics(monthlyData);
  
  return {
    sustainabilityScore: sustainabilityMetrics.score,
    riskFactors: sustainabilityMetrics.riskFactors,
    positiveIndicators: sustainabilityMetrics.positiveIndicators,
    recommendations: generateSustainabilityRecommendations(sustainabilityMetrics),
    trajectory: sustainabilityMetrics.trajectory
  };
};

/**
 * Calculate sustainability metrics
 */
const calculateSustainabilityMetrics = (monthlyData) => {
  if (monthlyData.length < 3) {
    return { score: 0, trajectory: 'insufficient-data' };
  }
  
  const netCashflows = monthlyData.map(month => month.totalIncome - month.totalExpenses);
  const positiveMonths = netCashflows.filter(flow => flow > 0).length;
  const averageNetFlow = netCashflows.reduce((sum, flow) => sum + flow, 0) / netCashflows.length;
  
  const sustainability = positiveMonths / monthlyData.length;
  const trend = calculateTrend(netCashflows);
  
  const riskFactors = [];
  const positiveIndicators = [];
  
  if (sustainability < 0.5) riskFactors.push('Frequent negative cashflow');
  if (trend < -10) riskFactors.push('Declining cashflow trend');
  if (averageNetFlow < 0) riskFactors.push('Negative average cashflow');
  
  if (sustainability > 0.8) positiveIndicators.push('Consistent positive cashflow');
  if (trend > 5) positiveIndicators.push('Improving cashflow trend');
  if (averageNetFlow > 500) positiveIndicators.push('Strong average cashflow');
  
  return {
    score: Math.max(0, Math.min(1, sustainability + (trend / 100))),
    riskFactors,
    positiveIndicators,
    trajectory: trend > 5 ? 'improving' : trend < -5 ? 'declining' : 'stable'
  };
};

/**
 * Detect spending anomalies
 */
const detectSpendingAnomalies = (transactions) => {
  const monthlyData = groupTransactionsByMonth(transactions);
  const anomalies = [];
  
  // Statistical anomaly detection using z-score
  const expenses = monthlyData.map(month => month.totalExpenses);
  const mean = expenses.reduce((sum, exp) => sum + exp, 0) / expenses.length;
  const stdDev = calculateVariance(expenses);
  
  monthlyData.forEach(month => {
    const zScore = Math.abs((month.totalExpenses - mean) / stdDev);
    
    if (zScore > 2) { // 2 standard deviations
      anomalies.push({
        month: month.month,
        type: month.totalExpenses > mean ? 'high-spending' : 'low-spending',
        amount: month.totalExpenses,
        deviation: month.totalExpenses - mean,
        severity: zScore > 3 ? 'extreme' : 'moderate',
        zScore
      });
    }
  });
  
  return {
    anomalies,
    count: anomalies.length,
    pattern: analyzeAnomalyPatterns(anomalies)
  };
};

/**
 * Analyze spending correlations
 */
const analyzeSpendingCorrelations = (transactions) => {
  const correlations = {};
  const subcategories = [...new Set(transactions.map(t => t.subcategoryId).filter(Boolean))];
  
  // Calculate correlation matrix between spending categories
  for (let i = 0; i < subcategories.length; i++) {
    for (let j = i + 1; j < subcategories.length; j++) {
      const cat1 = subcategories[i];
      const cat2 = subcategories[j];
      
      const correlation = calculateCategoryCorrelation(transactions, cat1, cat2);
      
      if (Math.abs(correlation) > 0.3) { // Only significant correlations
        correlations[`${cat1}_${cat2}`] = {
          category1: cat1,
          category2: cat2,
          correlation,
          strength: Math.abs(correlation) > 0.7 ? 'strong' : 'moderate',
          direction: correlation > 0 ? 'positive' : 'negative'
        };
      }
    }
  }
  
  return {
    correlations: Object.values(correlations),
    strongCorrelations: Object.values(correlations).filter(c => c.strength === 'strong'),
    insights: generateCorrelationInsights(Object.values(correlations))
  };
};

/**
 * Generate pattern insights from analysis
 */
const generatePatternInsights = (analysis) => {
  const insights = [];
  
  // Seasonal insights
  if (analysis.seasonalPatterns.seasonality.detected) {
    insights.push({
      type: 'seasonal',
      priority: 'medium',
      title: 'Seasonal Spending Pattern Detected',
      description: `Your spending shows ${analysis.seasonalPatterns.seasonality.pattern} seasonal patterns`,
      impact: 'Plan budget adjustments for seasonal variations',
      confidence: analysis.seasonalPatterns.seasonality.confidence
    });
  }
  
  // Recurring transaction insights
  if (analysis.recurringTransactions.confirmed > 5) {
    insights.push({
      type: 'recurring',
      priority: 'high',
      title: 'Strong Recurring Transaction Pattern',
      description: `${analysis.recurringTransactions.confirmed} recurring transactions identified, totaling ${analysis.recurringTransactions.totalRecurringAmount}`,
      impact: 'Consider automating budget tracking for recurring expenses',
      confidence: 'high'
    });
  }
  
  // Budget efficiency insights
  if (analysis.budgetEfficiency.overallEfficiency < 0.7) {
    insights.push({
      type: 'efficiency',
      priority: 'high',
      title: 'Budget Efficiency Opportunity',
      description: 'Budget utilization is suboptimal with potential for improvement',
      impact: 'Review budget allocation and spending priorities',
      confidence: 'medium'
    });
  }
  
  // Sustainability insights
  if (analysis.cashflowSustainability.sustainabilityScore < 0.6) {
    insights.push({
      type: 'sustainability',
      priority: 'high',
      title: 'Cashflow Sustainability Risk',
      description: 'Current spending patterns may not be sustainable long-term',
      impact: 'Consider reducing expenses or increasing income',
      confidence: 'high'
    });
  }
  
  return insights.sort((a, b) => {
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    return priorityOrder[b.priority] - priorityOrder[a.priority];
  });
};

/**
 * Identify risk factors
 */
const identifyRiskFactors = (analysis) => {
  const risks = [];
  
  // Spending trend risks
  if (analysis.spendingCycles.monthlyCycle.trend === 'increasing' && 
      analysis.spendingCycles.monthlyCycle.trendRate > 10) {
    risks.push({
      type: 'trend',
      severity: 'high',
      factor: 'Rapidly increasing spending trend',
      impact: 'Budget overruns likely'
    });
  }
  
  // Anomaly risks
  if (analysis.anomalies.count > 2) {
    risks.push({
      type: 'volatility',
      severity: 'medium',
      factor: 'High spending volatility detected',
      impact: 'Unpredictable cash flow'
    });
  }
  
  // Sustainability risks
  analysis.cashflowSustainability.riskFactors.forEach(factor => {
    risks.push({
      type: 'sustainability',
      severity: 'high',
      factor: factor,
      impact: 'Long-term financial instability'
    });
  });
  
  return risks;
};

/**
 * Identify optimization opportunities
 */
const identifyOptimizationOpportunities = (analysis) => {
  const opportunities = [];
  
  // Budget reallocation opportunities
  if (analysis.budgetEfficiency.wasteAreas && analysis.budgetEfficiency.wasteAreas.length > 0) {
    opportunities.push({
      type: 'budget-reallocation',
      potential: 'high',
      description: 'Reallocate unused budget to high-utilization categories',
      categories: analysis.budgetEfficiency.wasteAreas,
      estimatedSavings: analysis.budgetEfficiency.optimizationPotential
    });
  }
  
  // Recurring transaction automation
  if (analysis.recurringTransactions.confirmed > 3) {
    opportunities.push({
      type: 'automation',
      potential: 'medium',
      description: 'Automate tracking and budgeting for recurring transactions',
      transactions: analysis.recurringTransactions.confirmed,
      estimatedTimesSaved: 'Significant manual tracking time'
    });
  }
  
  // Correlation-based optimization
  if (analysis.correlations.strongCorrelations.length > 0) {
    opportunities.push({
      type: 'correlation-optimization',
      potential: 'medium',
      description: 'Optimize spending based on category correlations',
      correlations: analysis.correlations.strongCorrelations.length,
      approach: 'Bundle or separate correlated spending categories'
    });
  }
  
  return opportunities;
};

/**
 * Helper function to calculate trend
 */
const calculateTrend = (values) => {
  if (values.length < 2) return 0;
  
  const n = values.length;
  const x = Array.from({ length: n }, (_, i) => i);
  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = values.reduce((a, b) => a + b, 0);
  const sumXY = x.reduce((sum, xi, i) => sum + xi * values[i], 0);
  const sumXX = x.reduce((sum, xi) => sum + xi * xi, 0);
  
  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  return slope;
};

/**
 * Get week number
 */
const getWeekNumber = (date) => {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
};

// Additional helper functions would be implemented here for completeness
// This provides the core structure and key algorithms for pattern analysis

export default {
  analyzeSpendingPatterns,
  groupTransactionsByMonth,
  identifyRecurringTransactions,
  detectSpendingAnomalies,
  analyzeSpendingCorrelations,
  calculateTrend
};