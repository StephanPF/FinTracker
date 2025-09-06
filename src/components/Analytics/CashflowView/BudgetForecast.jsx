import React, { useState, useEffect } from 'react';
import { useAnalytics } from '../AnalyticsMain';

/**
 * BudgetForecast Component
 * Predictive budget analysis with trajectory forecasting and recommendations
 * Follows BUILD_NEW_FEATURE_GUIDE.md compact design principles
 */
const BudgetForecast = ({ selectedPeriod, dateRange, onNavigate }) => {
  const {
    analyticsService,
    activeBudget,
    formatCurrency,
    t
  } = useAnalytics();

  // Component state
  const [forecastData, setForecastData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedScenario, setSelectedScenario] = useState('current'); // 'current', 'optimistic', 'pessimistic'
  const [timeHorizon, setTimeHorizon] = useState('month'); // 'week', 'month', 'quarter'

  // Load forecast data when dependencies change
  useEffect(() => {
    if (analyticsService && activeBudget && dateRange) {
      generateForecast();
    }
  }, [analyticsService, activeBudget, dateRange, selectedPeriod, selectedScenario, timeHorizon]);

  /**
   * Generate comprehensive budget forecast
   */
  const generateForecast = async () => {
    setLoading(true);
    try {
      const forecast = await calculateBudgetForecast();
      setForecastData(forecast);
    } catch (error) {
      console.error('Error generating forecast:', error);
      setForecastData(null);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Calculate predictive budget forecast
   */
  const calculateBudgetForecast = async () => {
    if (!analyticsService || !activeBudget) return null;

    // Get historical spending data
    const historicalData = await getHistoricalSpendingData();
    
    // Calculate current trajectory
    const currentTrajectory = calculateCurrentTrajectory(historicalData);
    
    // Generate forecasting scenarios
    const scenarios = generateForecastScenarios(currentTrajectory);
    
    // Calculate budget adherence predictions
    const adherencePrediction = predictBudgetAdherence(currentTrajectory, scenarios);
    
    // Generate actionable recommendations
    const recommendations = generateRecommendations(adherencePrediction, currentTrajectory);
    
    // Calculate adjustment scenarios
    const adjustmentScenarios = calculateAdjustmentNeeded(adherencePrediction);
    
    return {
      currentTrajectory,
      scenarios,
      adherencePrediction,
      recommendations,
      adjustmentScenarios,
      confidence: calculateConfidenceLevel(historicalData),
      lastUpdated: new Date().toISOString()
    };
  };

  /**
   * Get historical spending data for trend analysis
   */
  const getHistoricalSpendingData = async () => {
    // Get data for the last 3 months for trend analysis
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 3);
    
    const transactions = await analyticsService.getTransactionsForPeriod(
      startDate.toISOString().split('T')[0],
      endDate.toISOString().split('T')[0],
      'cash'
    );
    
    // Group by month and subcategory for trend analysis
    const monthlyData = groupTransactionsByMonth(transactions);
    
    return {
      monthlyData,
      totalPeriods: 3,
      dataQuality: assessDataQuality(monthlyData)
    };
  };

  /**
   * Group transactions by month for trend analysis
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
          subcategories: {},
          transactionCount: 0
        };
      }
      
      grouped[monthKey].transactionCount++;
      
      if (transaction.categoryId === 'CAT_001') { // Income
        grouped[monthKey].totalIncome += Math.abs(transaction.amount);
      } else if (transaction.categoryId === 'CAT_002') { // Expenses
        grouped[monthKey].totalExpenses += Math.abs(transaction.amount);
        
        const subcategoryId = transaction.subcategoryId || 'uncategorized';
        if (!grouped[monthKey].subcategories[subcategoryId]) {
          grouped[monthKey].subcategories[subcategoryId] = {
            subcategoryId,
            subcategoryName: transaction.subcategoryName || 'Uncategorized',
            totalSpent: 0,
            transactionCount: 0
          };
        }
        
        grouped[monthKey].subcategories[subcategoryId].totalSpent += Math.abs(transaction.amount);
        grouped[monthKey].subcategories[subcategoryId].transactionCount++;
      }
    });
    
    return Object.values(grouped).sort((a, b) => a.month.localeCompare(b.month));
  };

  /**
   * Calculate current spending trajectory
   */
  const calculateCurrentTrajectory = (historicalData) => {
    const { monthlyData } = historicalData;
    
    if (monthlyData.length < 2) {
      return {
        trend: 'insufficient-data',
        monthlyAverage: 0,
        growth: 0,
        confidence: 'low'
      };
    }
    
    // Calculate monthly averages and trends
    const monthlyExpenses = monthlyData.map(month => month.totalExpenses);
    const monthlyAverage = monthlyExpenses.reduce((sum, exp) => sum + exp, 0) / monthlyExpenses.length;
    
    // Simple linear regression for trend
    const growth = calculateTrendGrowth(monthlyExpenses);
    
    // Determine trajectory direction
    const trend = growth > 5 ? 'increasing' : growth < -5 ? 'decreasing' : 'stable';
    
    // Calculate category-level trajectories
    const categoryTrajectories = calculateCategoryTrajectories(monthlyData);
    
    return {
      trend,
      monthlyAverage,
      growth,
      categoryTrajectories,
      confidence: calculateTrendConfidence(monthlyData)
    };
  };

  /**
   * Calculate trend growth using simple linear regression
   */
  const calculateTrendGrowth = (values) => {
    if (values.length < 2) return 0;
    
    const n = values.length;
    const sumX = Array.from({ length: n }, (_, i) => i).reduce((a, b) => a + b, 0);
    const sumY = values.reduce((a, b) => a + b, 0);
    const sumXY = values.reduce((sum, val, i) => sum + (i * val), 0);
    const sumXX = Array.from({ length: n }, (_, i) => i * i).reduce((a, b) => a + b, 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    return slope;
  };

  /**
   * Calculate trajectory for each budget category
   */
  const calculateCategoryTrajectories = (monthlyData) => {
    const trajectories = {};
    
    // Get all unique subcategories
    const allSubcategories = new Set();
    monthlyData.forEach(month => {
      Object.keys(month.subcategories).forEach(subcat => allSubcategories.add(subcat));
    });
    
    // Calculate trajectory for each subcategory
    allSubcategories.forEach(subcategoryId => {
      const monthlySpending = monthlyData.map(month => 
        month.subcategories[subcategoryId]?.totalSpent || 0
      );
      
      const average = monthlySpending.reduce((sum, val) => sum + val, 0) / monthlySpending.length;
      const growth = calculateTrendGrowth(monthlySpending);
      
      trajectories[subcategoryId] = {
        subcategoryId,
        monthlyAverage: average,
        growth,
        trend: growth > 2 ? 'increasing' : growth < -2 ? 'decreasing' : 'stable',
        consistency: calculateConsistency(monthlySpending)
      };
    });
    
    return trajectories;
  };

  /**
   * Generate forecast scenarios (optimistic, current, pessimistic)
   */
  const generateForecastScenarios = (currentTrajectory) => {
    const baseMonthlyExpense = currentTrajectory.monthlyAverage;
    const growthRate = currentTrajectory.growth;
    
    const scenarios = {
      optimistic: {
        name: t('optimisticScenario') || 'Optimistic',
        description: t('optimisticDescription') || 'Spending decreases by 10%',
        monthlyExpense: baseMonthlyExpense * 0.9,
        growthRate: Math.min(growthRate - 5, -2),
        probability: 0.25
      },
      current: {
        name: t('currentTrajectory') || 'Current Trajectory',
        description: t('currentDescription') || 'Spending continues at current trend',
        monthlyExpense: baseMonthlyExpense,
        growthRate: growthRate,
        probability: 0.5
      },
      pessimistic: {
        name: t('pessimisticScenario') || 'Pessimistic',
        description: t('pessimisticDescription') || 'Spending increases by 15%',
        monthlyExpense: baseMonthlyExpense * 1.15,
        growthRate: growthRate + 8,
        probability: 0.25
      }
    };
    
    // Calculate projected totals for each scenario
    const forecastHorizons = {
      week: 1/4.33,
      month: 1,
      quarter: 3
    };
    
    Object.keys(scenarios).forEach(scenarioKey => {
      const scenario = scenarios[scenarioKey];
      const horizonMultiplier = forecastHorizons[timeHorizon] || 1;
      
      scenario.projectedTotal = scenario.monthlyExpense * horizonMultiplier;
      scenario.projectedVariance = (scenario.projectedTotal - baseMonthlyExpense * horizonMultiplier);
    });
    
    return scenarios;
  };

  /**
   * Predict budget adherence based on current trajectory
   */
  const predictBudgetAdherence = (trajectory, scenarios) => {
    const totalBudget = activeBudget.lineItems.reduce((sum, item) => {
      return sum + normalizeToMonthly(item.amount, item.period);
    }, 0);
    
    const predictions = {};
    
    Object.keys(scenarios).forEach(scenarioKey => {
      const scenario = scenarios[scenarioKey];
      const projectedSpending = scenario.projectedTotal;
      const variance = projectedSpending - totalBudget;
      const adherencePercentage = (totalBudget - variance) / totalBudget * 100;
      
      predictions[scenarioKey] = {
        projectedSpending,
        budgetTotal: totalBudget,
        variance,
        adherencePercentage: Math.max(0, adherencePercentage),
        status: variance > 0 ? 'over-budget' : variance > -100 ? 'on-track' : 'under-budget',
        riskLevel: variance > 200 ? 'high' : variance > 0 ? 'medium' : 'low'
      };
    });
    
    return predictions;
  };

  /**
   * Generate actionable recommendations
   */
  const generateRecommendations = (adherencePrediction, trajectory) => {
    const recommendations = [];
    const currentPrediction = adherencePrediction[selectedScenario] || adherencePrediction.current;
    
    // Over-budget recommendations
    if (currentPrediction.status === 'over-budget') {
      recommendations.push({
        type: 'warning',
        priority: 'high',
        title: t('budgetOverrunWarning') || 'Budget Overrun Predicted',
        description: t('budgetOverrunDescription') || `Current trajectory suggests spending will exceed budget by ${formatCurrency(Math.abs(currentPrediction.variance))}`,
        actions: [
          {
            action: t('reduceCategorySpending') || 'Reduce spending in top categories',
            impact: t('highImpact') || 'High Impact',
            difficulty: t('moderate') || 'Moderate'
          },
          {
            action: t('reviewRecurringExpenses') || 'Review recurring expenses',
            impact: t('mediumImpact') || 'Medium Impact',
            difficulty: t('easy') || 'Easy'
          }
        ]
      });
    }
    
    // Category-specific recommendations
    const highGrowthCategories = Object.values(trajectory.categoryTrajectories)
      .filter(cat => cat.growth > 5 && cat.monthlyAverage > 100)
      .sort((a, b) => b.growth - a.growth)
      .slice(0, 3);
    
    if (highGrowthCategories.length > 0) {
      recommendations.push({
        type: 'info',
        priority: 'medium',
        title: t('risingSpendingCategories') || 'Rising Spending Categories',
        description: t('risingSpendingDescription') || 'Some categories are showing increasing spend trends',
        actions: highGrowthCategories.map(cat => ({
          action: t('reviewCategory') || `Review ${cat.subcategoryId} spending`,
          impact: t('mediumImpact') || 'Medium Impact',
          difficulty: t('easy') || 'Easy'
        }))
      });
    }
    
    // Positive recommendations
    if (currentPrediction.status === 'under-budget') {
      recommendations.push({
        type: 'success',
        priority: 'low',
        title: t('budgetOnTrack') || 'Budget On Track',
        description: t('budgetOnTrackDescription') || `You're projected to be under budget by ${formatCurrency(Math.abs(currentPrediction.variance))}`,
        actions: [
          {
            action: t('maintainCurrentHabits') || 'Maintain current spending habits',
            impact: t('highImpact') || 'High Impact',
            difficulty: t('easy') || 'Easy'
          },
          {
            action: t('considerSavingsGoals') || 'Consider additional savings goals',
            impact: t('mediumImpact') || 'Medium Impact',
            difficulty: t('moderate') || 'Moderate'
          }
        ]
      });
    }
    
    return recommendations;
  };

  /**
   * Calculate adjustments needed to meet budget
   */
  const calculateAdjustmentNeeded = (adherencePrediction) => {
    const currentPrediction = adherencePrediction[selectedScenario] || adherencePrediction.current;
    
    if (currentPrediction.variance <= 0) {
      return {
        adjustmentNeeded: false,
        message: t('noBudgetAdjustmentNeeded') || 'No budget adjustment needed'
      };
    }
    
    const totalAdjustment = currentPrediction.variance;
    const dailyAdjustment = totalAdjustment / 30; // Assume 30 days in month
    
    // Calculate per-category adjustments based on budget allocation
    const categoryAdjustments = activeBudget.lineItems.map(item => {
      const monthlyBudget = normalizeToMonthly(item.amount, item.period);
      const percentage = monthlyBudget / currentPrediction.budgetTotal;
      const categoryAdjustment = totalAdjustment * percentage;
      
      return {
        subcategoryId: item.subcategoryId,
        subcategoryName: item.subcategoryName,
        currentBudget: monthlyBudget,
        suggestedReduction: categoryAdjustment,
        newBudget: monthlyBudget - categoryAdjustment,
        percentageReduction: (categoryAdjustment / monthlyBudget) * 100
      };
    }).sort((a, b) => b.suggestedReduction - a.suggestedReduction);
    
    return {
      adjustmentNeeded: true,
      totalAdjustment,
      dailyAdjustment,
      categoryAdjustments,
      message: t('budgetAdjustmentNeeded') || `Reduce spending by ${formatCurrency(totalAdjustment)} to meet budget`
    };
  };

  /**
   * Calculate confidence level for predictions
   */
  const calculateConfidenceLevel = (historicalData) => {
    const dataPoints = historicalData.monthlyData.length;
    const dataQuality = historicalData.dataQuality;
    
    if (dataPoints < 2) return 'low';
    if (dataPoints >= 3 && dataQuality > 0.7) return 'high';
    if (dataPoints >= 2 && dataQuality > 0.5) return 'medium';
    return 'low';
  };

  /**
   * Assess data quality for confidence calculations
   */
  const assessDataQuality = (monthlyData) => {
    if (monthlyData.length === 0) return 0;
    
    const consistencyScore = monthlyData.reduce((score, month, index) => {
      if (index === 0) return score;
      const prevMonth = monthlyData[index - 1];
      const variance = Math.abs(month.totalExpenses - prevMonth.totalExpenses) / prevMonth.totalExpenses;
      return score + Math.max(0, 1 - variance);
    }, 0) / (monthlyData.length - 1);
    
    const completenessScore = monthlyData.reduce((score, month) => {
      return score + Math.min(1, month.transactionCount / 10); // Assume 10 transactions is good
    }, 0) / monthlyData.length;
    
    return (consistencyScore + completenessScore) / 2;
  };

  /**
   * Calculate spending consistency
   */
  const calculateConsistency = (values) => {
    if (values.length < 2) return 0;
    
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);
    
    return mean > 0 ? 1 - (stdDev / mean) : 0; // Coefficient of variation inverse
  };

  /**
   * Normalize budget amount to monthly
   */
  const normalizeToMonthly = (amount, period) => {
    const multipliers = {
      weekly: 4.33,
      monthly: 1,
      quarterly: 1/3,
      yearly: 1/12
    };
    return amount * (multipliers[period] || 1);
  };

  /**
   * Get confidence level color
   */
  const getConfidenceColor = (confidence) => {
    const colors = {
      high: '#10b981',
      medium: '#f59e0b',
      low: '#ef4444'
    };
    return colors[confidence] || '#6b7280';
  };

  if (!activeBudget) {
    return (
      <div className="budget-forecast">
        <div className="forecast-header">
          <h3>{t('budgetForecast') || 'Budget Forecast'}</h3>
          <p>{t('budgetForecastDescription') || 'Predictive budget analysis and recommendations'}</p>
        </div>
        
        <div className="no-budget-forecast">
          <div className="no-budget-content">
            <span className="forecast-icon">📊</span>
            <h4>{t('noBudgetForForecast') || 'No Budget Set Up'}</h4>
            <p>{t('noBudgetForecastDescription') || 'Set up a budget to get predictive analysis and spending recommendations'}</p>
            <button 
              onClick={() => onNavigate && onNavigate('budget-setup')}
              className="btn-setup-budget"
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
      <div className="budget-forecast-loading">
        <div className="loading-content">
          <div className="loading-spinner"></div>
          <p>{t('generatingForecast') || 'Generating budget forecast...'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="budget-forecast">
      {/* Header */}
      <div className="forecast-header">
        <div className="header-title">
          <h3>{t('budgetForecast') || 'Budget Forecast'}</h3>
          <p>{t('predictiveBudgetAnalysis') || 'Predictive budget analysis and trajectory forecasting'}</p>
        </div>
        
        <div className="header-controls">
          <select 
            value={selectedScenario} 
            onChange={(e) => setSelectedScenario(e.target.value)}
            className="scenario-select"
          >
            <option value="optimistic">{t('optimisticScenario') || 'Optimistic'}</option>
            <option value="current">{t('currentTrajectory') || 'Current'}</option>
            <option value="pessimistic">{t('pessimisticScenario') || 'Pessimistic'}</option>
          </select>
          
          <select 
            value={timeHorizon} 
            onChange={(e) => setTimeHorizon(e.target.value)}
            className="horizon-select"
          >
            <option value="week">{t('weekForecast') || 'This Week'}</option>
            <option value="month">{t('monthForecast') || 'This Month'}</option>
            <option value="quarter">{t('quarterForecast') || 'This Quarter'}</option>
          </select>
        </div>
      </div>

      {forecastData && (
        <div className="forecast-content">
          {/* Current Trajectory Section */}
          <div className="trajectory-section">
            <div className="section-header">
              <h4>{t('currentTrajectory') || 'Current Trajectory'}</h4>
              <div className="confidence-indicator">
                <span 
                  className="confidence-badge"
                  style={{ color: getConfidenceColor(forecastData.confidence) }}
                >
                  {forecastData.confidence.toUpperCase()} {t('confidence') || 'CONFIDENCE'}
                </span>
              </div>
            </div>
            
            <div className="trajectory-cards">
              <div className="trajectory-card">
                <div className="card-label">{t('monthlyAverage') || 'Monthly Average'}</div>
                <div className="card-value">{formatCurrency(forecastData.currentTrajectory.monthlyAverage)}</div>
                <div className="card-trend">
                  <span className={`trend-indicator ${forecastData.currentTrajectory.trend}`}>
                    {forecastData.currentTrajectory.trend === 'increasing' ? '↗️' : 
                     forecastData.currentTrajectory.trend === 'decreasing' ? '↘️' : '→'}
                  </span>
                  <span className="trend-text">
                    {t(forecastData.currentTrajectory.trend) || forecastData.currentTrajectory.trend}
                  </span>
                </div>
              </div>
              
              <div className="trajectory-card">
                <div className="card-label">{t('growthRate') || 'Growth Rate'}</div>
                <div className="card-value">
                  {forecastData.currentTrajectory.growth > 0 ? '+' : ''}
                  {forecastData.currentTrajectory.growth.toFixed(1)}%
                </div>
                <div className="card-subtitle">{t('monthOverMonth') || 'month over month'}</div>
              </div>
            </div>
          </div>

          {/* Scenario Comparison */}
          <div className="scenarios-section">
            <div className="section-header">
              <h4>{t('forecastScenarios') || 'Forecast Scenarios'}</h4>
            </div>
            
            <div className="scenarios-grid">
              {Object.entries(forecastData.scenarios).map(([scenarioKey, scenario]) => {
                const prediction = forecastData.adherencePrediction[scenarioKey];
                const isSelected = scenarioKey === selectedScenario;
                
                return (
                  <div 
                    key={scenarioKey}
                    className={`scenario-card ${isSelected ? 'selected' : ''} status-${prediction.status}`}
                    onClick={() => setSelectedScenario(scenarioKey)}
                  >
                    <div className="scenario-header">
                      <div className="scenario-name">{scenario.name}</div>
                      <div className="scenario-probability">{Math.round(scenario.probability * 100)}%</div>
                    </div>
                    
                    <div className="scenario-content">
                      <div className="projected-spending">
                        <div className="spending-amount">{formatCurrency(prediction.projectedSpending)}</div>
                        <div className="spending-label">{t('projectedSpending') || 'Projected Spending'}</div>
                      </div>
                      
                      <div className="budget-variance">
                        <div className={`variance-amount ${prediction.variance >= 0 ? 'over' : 'under'}`}>
                          {prediction.variance >= 0 ? '+' : ''}{formatCurrency(prediction.variance)}
                        </div>
                        <div className="variance-label">{t('budgetVariance') || 'vs Budget'}</div>
                      </div>
                      
                      <div className="adherence-percentage">
                        <div className="percentage-bar">
                          <div 
                            className={`percentage-fill status-${prediction.status}`}
                            style={{ width: `${Math.min(prediction.adherencePercentage, 100)}%` }}
                          />
                        </div>
                        <div className="percentage-text">
                          {prediction.adherencePercentage.toFixed(1)}% {t('adherence') || 'adherence'}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Recommendations Section */}
          {forecastData.recommendations && forecastData.recommendations.length > 0 && (
            <div className="recommendations-section">
              <div className="section-header">
                <h4>{t('recommendations') || 'Recommendations'}</h4>
              </div>
              
              <div className="recommendations-list">
                {forecastData.recommendations.map((recommendation, index) => (
                  <div key={index} className={`recommendation-card priority-${recommendation.priority} type-${recommendation.type}`}>
                    <div className="recommendation-header">
                      <div className="recommendation-icon">
                        {recommendation.type === 'warning' ? '⚠️' : 
                         recommendation.type === 'success' ? '✅' : 'ℹ️'}
                      </div>
                      <div className="recommendation-title">{recommendation.title}</div>
                      <div className="recommendation-priority">{recommendation.priority}</div>
                    </div>
                    
                    <div className="recommendation-description">
                      {recommendation.description}
                    </div>
                    
                    {recommendation.actions && recommendation.actions.length > 0 && (
                      <div className="recommendation-actions">
                        <div className="actions-label">{t('suggestedActions') || 'Suggested Actions'}</div>
                        {recommendation.actions.map((action, actionIndex) => (
                          <div key={actionIndex} className="action-item">
                            <div className="action-text">{action.action}</div>
                            <div className="action-meta">
                              <span className="action-impact">{action.impact}</span>
                              <span className="action-difficulty">{action.difficulty}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Adjustment Scenarios */}
          {forecastData.adjustmentScenarios && forecastData.adjustmentScenarios.adjustmentNeeded && (
            <div className="adjustments-section">
              <div className="section-header">
                <h4>{t('budgetAdjustments') || 'Budget Adjustments Needed'}</h4>
              </div>
              
              <div className="adjustment-summary">
                <div className="adjustment-total">
                  <div className="adjustment-amount">{formatCurrency(forecastData.adjustmentScenarios.totalAdjustment)}</div>
                  <div className="adjustment-label">{t('totalReductionNeeded') || 'Total reduction needed'}</div>
                </div>
                
                <div className="adjustment-daily">
                  <div className="daily-amount">{formatCurrency(forecastData.adjustmentScenarios.dailyAdjustment)}</div>
                  <div className="daily-label">{t('dailyReduction') || 'Daily reduction'}</div>
                </div>
              </div>
              
              <div className="category-adjustments">
                <div className="adjustments-header">
                  <h5>{t('categoryReductions') || 'Suggested Category Reductions'}</h5>
                </div>
                
                <div className="adjustments-list">
                  {forecastData.adjustmentScenarios.categoryAdjustments.slice(0, 5).map((adjustment, index) => (
                    <div key={index} className="adjustment-item">
                      <div className="adjustment-category">
                        <div className="category-name">{adjustment.subcategoryName}</div>
                        <div className="category-current">{formatCurrency(adjustment.currentBudget)}</div>
                      </div>
                      
                      <div className="adjustment-arrow">→</div>
                      
                      <div className="adjustment-new">
                        <div className="new-budget">{formatCurrency(adjustment.newBudget)}</div>
                        <div className="reduction-percentage">
                          -{adjustment.percentageReduction.toFixed(1)}%
                        </div>
                      </div>
                      
                      <div className="reduction-amount">
                        -{formatCurrency(adjustment.suggestedReduction)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Forecast Metadata */}
          <div className="forecast-metadata">
            <div className="metadata-item">
              <span className="metadata-label">{t('lastUpdated') || 'Last Updated'}:</span>
              <span className="metadata-value">{new Date(forecastData.lastUpdated).toLocaleString()}</span>
            </div>
            
            <div className="metadata-item">
              <span className="metadata-label">{t('confidenceLevel') || 'Confidence'}:</span>
              <span 
                className="metadata-value confidence"
                style={{ color: getConfidenceColor(forecastData.confidence) }}
              >
                {forecastData.confidence.toUpperCase()}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BudgetForecast;