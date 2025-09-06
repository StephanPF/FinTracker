import React, { useState, useEffect, useRef } from 'react';
import { useAnalytics } from '../AnalyticsMain';

/**
 * CashflowCalendar Component
 * Daily cashflow heatmap with budget comparison and pattern identification
 * Follows BUILD_NEW_FEATURE_GUIDE.md compact design principles
 */
const CashflowCalendar = ({ selectedPeriod, dateRange, onNavigate }) => {
  const {
    analyticsService,
    activeBudget,
    formatCurrency,
    t
  } = useAnalytics();

  // Component state
  const [calendarData, setCalendarData] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [viewMode, setViewMode] = useState('month'); // 'month' or 'week'
  const [loading, setLoading] = useState(false);
  const [hoveredDay, setHoveredDay] = useState(null);

  // Load calendar data when dependencies change
  useEffect(() => {
    if (analyticsService && dateRange) {
      loadCalendarData();
    }
  }, [analyticsService, dateRange, selectedPeriod, activeBudget]);

  /**
   * Load daily cashflow data for calendar visualization
   */
  const loadCalendarData = async () => {
    setLoading(true);
    try {
      const dailyData = await generateDailyData();
      setCalendarData(dailyData);
    } catch (error) {
      console.error('Error loading calendar data:', error);
      setCalendarData(null);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Generate daily cashflow data with budget comparisons
   */
  const generateDailyData = async () => {
    if (!analyticsService) return null;

    // Get all transactions for the period
    const transactions = await analyticsService.getTransactionsForPeriod(
      dateRange.startDate,
      dateRange.endDate,
      'cash'
    );

    // Group transactions by date
    const dailyTransactions = groupTransactionsByDate(transactions);
    
    // Calculate daily metrics with budget context
    const dailyMetrics = calculateDailyMetrics(dailyTransactions);
    
    // Add pattern analysis
    const patternsData = identifyPatterns(dailyMetrics);
    
    return {
      dailyMetrics,
      patterns: patternsData,
      summary: calculateCalendarSummary(dailyMetrics)
    };
  };

  /**
   * Group transactions by date
   */
  const groupTransactionsByDate = (transactions) => {
    const grouped = {};
    
    transactions.forEach(transaction => {
      const date = transaction.date.split('T')[0]; // Get YYYY-MM-DD
      
      if (!grouped[date]) {
        grouped[date] = {
          date,
          income: 0,
          expenses: 0,
          transactions: []
        };
      }
      
      grouped[date].transactions.push(transaction);
      
      if (transaction.categoryId === 'CAT_001') { // Income
        grouped[date].income += Math.abs(transaction.amount);
      } else if (transaction.categoryId === 'CAT_002') { // Expenses
        grouped[date].expenses += Math.abs(transaction.amount);
      }
    });
    
    return grouped;
  };

  /**
   * Calculate daily metrics with budget comparisons
   */
  const calculateDailyMetrics = (dailyTransactions) => {
    const dailyMetrics = [];
    const startDate = new Date(dateRange.startDate);
    const endDate = new Date(dateRange.endDate);
    
    // Generate metrics for each day in the range
    for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
      const dateStr = date.toISOString().split('T')[0];
      const dayData = dailyTransactions[dateStr] || {
        date: dateStr,
        income: 0,
        expenses: 0,
        transactions: []
      };
      
      const netCashflow = dayData.income - dayData.expenses;
      const intensity = Math.abs(netCashflow);
      
      // Calculate budget variance if budget is active
      let budgetVariance = null;
      let budgetExpected = null;
      if (activeBudget) {
        budgetExpected = calculateDailyBudgetExpected(date);
        budgetVariance = netCashflow - budgetExpected;
      }
      
      dailyMetrics.push({
        date: dateStr,
        dayOfWeek: date.getDay(),
        income: dayData.income,
        expenses: dayData.expenses,
        netCashflow,
        intensity,
        transactionCount: dayData.transactions.length,
        budgetExpected,
        budgetVariance,
        status: getBudgetStatus(budgetVariance),
        isWeekend: date.getDay() === 0 || date.getDay() === 6,
        transactions: dayData.transactions
      });
    }
    
    return dailyMetrics;
  };

  /**
   * Calculate expected daily budget amount
   */
  const calculateDailyBudgetExpected = (date) => {
    if (!activeBudget || !activeBudget.lineItems) return 0;
    
    // Simple daily average for now
    // In a more sophisticated version, this could account for actual budget periods
    const totalMonthlyBudget = activeBudget.lineItems.reduce((sum, item) => {
      const monthlyAmount = normalizeToMonthly(item.amount, item.period);
      return sum + monthlyAmount;
    }, 0);
    
    const daysInMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    return totalMonthlyBudget / daysInMonth;
  };

  /**
   * Normalize budget amount to monthly
   */
  const normalizeToMonthly = (amount, period) => {
    const multipliers = {
      weekly: 4.33, // Average weeks per month
      monthly: 1,
      quarterly: 1/3,
      yearly: 1/12
    };
    return amount * (multipliers[period] || 1);
  };

  /**
   * Get budget status for a variance
   */
  const getBudgetStatus = (budgetVariance) => {
    if (budgetVariance === null) return 'no-budget';
    if (budgetVariance > 50) return 'over-budget';
    if (budgetVariance < -50) return 'under-budget';
    return 'on-track';
  };

  /**
   * Identify spending patterns and cycles
   */
  const identifyPatterns = (dailyMetrics) => {
    const patterns = {
      paymentCycles: identifyPaymentCycles(dailyMetrics),
      weekendSpending: analyzeWeekendSpending(dailyMetrics),
      monthlyPatterns: analyzeMonthlyPatterns(dailyMetrics),
      budgetHotspots: identifyBudgetHotspots(dailyMetrics)
    };
    
    return patterns;
  };

  /**
   * Identify recurring payment cycles
   */
  const identifyPaymentCycles = (dailyMetrics) => {
    const highExpenseDays = dailyMetrics
      .filter(day => day.expenses > 0)
      .sort((a, b) => b.expenses - a.expenses)
      .slice(0, 10); // Top 10 expense days
    
    return highExpenseDays.map(day => ({
      date: day.date,
      amount: day.expenses,
      type: 'high-expense'
    }));
  };

  /**
   * Analyze weekend vs weekday spending patterns
   */
  const analyzeWeekendSpending = (dailyMetrics) => {
    const weekdaySpending = dailyMetrics.filter(day => !day.isWeekend);
    const weekendSpending = dailyMetrics.filter(day => day.isWeekend);
    
    const avgWeekdayExpenses = weekdaySpending.reduce((sum, day) => sum + day.expenses, 0) / weekdaySpending.length;
    const avgWeekendExpenses = weekendSpending.reduce((sum, day) => sum + day.expenses, 0) / weekendSpending.length;
    
    return {
      weekdayAverage: avgWeekdayExpenses,
      weekendAverage: avgWeekendExpenses,
      weekendMultiplier: avgWeekdayExpenses > 0 ? avgWeekendExpenses / avgWeekdayExpenses : 1
    };
  };

  /**
   * Analyze monthly spending patterns
   */
  const analyzeMonthlyPatterns = (dailyMetrics) => {
    const daysWithActivity = dailyMetrics.filter(day => day.transactionCount > 0);
    const totalDays = dailyMetrics.length;
    
    return {
      activeDays: daysWithActivity.length,
      totalDays,
      activityRate: daysWithActivity.length / totalDays,
      averageDailyTransactions: daysWithActivity.reduce((sum, day) => sum + day.transactionCount, 0) / daysWithActivity.length
    };
  };

  /**
   * Identify budget variance hotspots
   */
  const identifyBudgetHotspots = (dailyMetrics) => {
    if (!activeBudget) return [];
    
    return dailyMetrics
      .filter(day => day.budgetVariance !== null && Math.abs(day.budgetVariance) > 100)
      .sort((a, b) => Math.abs(b.budgetVariance) - Math.abs(a.budgetVariance))
      .slice(0, 5)
      .map(day => ({
        date: day.date,
        variance: day.budgetVariance,
        severity: Math.abs(day.budgetVariance) > 200 ? 'high' : 'medium'
      }));
  };

  /**
   * Calculate calendar summary statistics
   */
  const calculateCalendarSummary = (dailyMetrics) => {
    const totalIncome = dailyMetrics.reduce((sum, day) => sum + day.income, 0);
    const totalExpenses = dailyMetrics.reduce((sum, day) => sum + day.expenses, 0);
    const netCashflow = totalIncome - totalExpenses;
    
    const activeDays = dailyMetrics.filter(day => day.transactionCount > 0).length;
    const maxIntensity = Math.max(...dailyMetrics.map(day => day.intensity));
    
    return {
      totalIncome,
      totalExpenses,
      netCashflow,
      activeDays,
      totalDays: dailyMetrics.length,
      maxIntensity,
      averageDaily: netCashflow / dailyMetrics.length
    };
  };

  /**
   * Get intensity color for heatmap
   */
  const getIntensityColor = (day) => {
    if (!calendarData || day.intensity === 0) return '#f8fafc';
    
    const maxIntensity = calendarData.summary.maxIntensity;
    const normalizedIntensity = day.intensity / maxIntensity;
    
    // Color based on cashflow direction and budget status
    if (day.status === 'over-budget') {
      return `rgba(220, 38, 38, ${0.2 + normalizedIntensity * 0.6})`; // Red for over budget
    } else if (day.status === 'under-budget') {
      return `rgba(34, 197, 94, ${0.2 + normalizedIntensity * 0.6})`; // Green for under budget
    } else if (day.netCashflow > 0) {
      return `rgba(59, 130, 246, ${0.2 + normalizedIntensity * 0.6})`; // Blue for positive
    } else if (day.netCashflow < 0) {
      return `rgba(249, 115, 22, ${0.2 + normalizedIntensity * 0.6})`; // Orange for negative
    }
    
    return '#e2e8f0'; // Gray for neutral
  };

  /**
   * Handle day click
   */
  const handleDayClick = (day) => {
    setSelectedDate(day.date);
  };

  /**
   * Handle day hover
   */
  const handleDayHover = (day) => {
    setHoveredDay(day);
  };

  /**
   * Render calendar grid
   */
  const renderCalendar = () => {
    if (!calendarData) return null;
    
    const { dailyMetrics } = calendarData;
    
    // Group days by week for calendar layout
    const weeks = [];
    let currentWeek = [];
    
    // Find the first day of the month and pad with empty cells
    const firstDay = new Date(dateRange.startDate);
    const startDay = firstDay.getDay(); // 0 = Sunday
    
    // Add padding for first week
    for (let i = 0; i < startDay; i++) {
      currentWeek.push(null);
    }
    
    // Add all days
    dailyMetrics.forEach(day => {
      if (currentWeek.length === 7) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
      currentWeek.push(day);
    });
    
    // Add final week
    if (currentWeek.length > 0) {
      while (currentWeek.length < 7) {
        currentWeek.push(null);
      }
      weeks.push(currentWeek);
    }
    
    return (
      <div className="calendar-grid">
        {/* Day headers */}
        <div className="calendar-header">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="day-header">
              {day}
            </div>
          ))}
        </div>
        
        {/* Calendar weeks */}
        <div className="calendar-weeks">
          {weeks.map((week, weekIndex) => (
            <div key={weekIndex} className="calendar-week">
              {week.map((day, dayIndex) => (
                <div
                  key={dayIndex}
                  className={`calendar-day ${day ? 'has-data' : 'empty'} ${selectedDate === day?.date ? 'selected' : ''}`}
                  style={{ backgroundColor: day ? getIntensityColor(day) : 'transparent' }}
                  onClick={() => day && handleDayClick(day)}
                  onMouseEnter={() => day && handleDayHover(day)}
                  onMouseLeave={() => setHoveredDay(null)}
                >
                  {day && (
                    <>
                      <div className="day-number">
                        {new Date(day.date).getDate()}
                      </div>
                      {day.transactionCount > 0 && (
                        <div className="transaction-indicator">
                          {day.transactionCount}
                        </div>
                      )}
                      {day.status === 'over-budget' && (
                        <div className="budget-warning">⚠️</div>
                      )}
                    </>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="cashflow-calendar-loading">
        <div className="loading-content">
          <div className="loading-spinner"></div>
          <p>{t('loadingCalendarData') || 'Loading calendar data...'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="cashflow-calendar">
      {/* Header */}
      <div className="calendar-header-section">
        <div className="header-title">
          <h3>{t('cashflowCalendar') || 'Cashflow Calendar'}</h3>
          <p>{t('dailyCashflowPatterns') || 'Daily cashflow patterns and budget variance heatmap'}</p>
        </div>
        
        <div className="header-controls">
          <select 
            value={viewMode} 
            onChange={(e) => setViewMode(e.target.value)}
            className="view-mode-select"
          >
            <option value="month">{t('monthView') || 'Month View'}</option>
            <option value="week">{t('weekView') || 'Week View'}</option>
          </select>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="calendar-container">
        {renderCalendar()}
      </div>

      {/* Legend */}
      <div className="calendar-legend">
        <div className="legend-section">
          <h4>{t('intensityLegend') || 'Intensity Legend'}</h4>
          <div className="legend-items">
            <div className="legend-item">
              <div className="legend-color" style={{ backgroundColor: '#f8fafc' }}></div>
              <span>{t('noActivity') || 'No Activity'}</span>
            </div>
            <div className="legend-item">
              <div className="legend-color" style={{ backgroundColor: 'rgba(59, 130, 246, 0.4)' }}></div>
              <span>{t('positiveFlow') || 'Positive Flow'}</span>
            </div>
            <div className="legend-item">
              <div className="legend-color" style={{ backgroundColor: 'rgba(249, 115, 22, 0.4)' }}></div>
              <span>{t('negativeFlow') || 'Negative Flow'}</span>
            </div>
            <div className="legend-item">
              <div className="legend-color" style={{ backgroundColor: 'rgba(220, 38, 38, 0.4)' }}></div>
              <span>{t('overBudget') || 'Over Budget'}</span>
            </div>
            <div className="legend-item">
              <div className="legend-color" style={{ backgroundColor: 'rgba(34, 197, 94, 0.4)' }}></div>
              <span>{t('underBudget') || 'Under Budget'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      {calendarData && (
        <div className="calendar-summary">
          <div className="summary-cards">
            <div className="summary-card">
              <div className="card-label">{t('activeDays') || 'Active Days'}</div>
              <div className="card-value">{calendarData.summary.activeDays}/{calendarData.summary.totalDays}</div>
            </div>
            <div className="summary-card">
              <div className="card-label">{t('averageDaily') || 'Avg Daily'}</div>
              <div className="card-value">{formatCurrency(calendarData.summary.averageDaily)}</div>
            </div>
            <div className="summary-card">
              <div className="card-label">{t('totalFlow') || 'Total Flow'}</div>
              <div className="card-value">{formatCurrency(calendarData.summary.netCashflow)}</div>
            </div>
          </div>
        </div>
      )}

      {/* Hover Tooltip */}
      {hoveredDay && (
        <div className="day-tooltip">
          <div className="tooltip-header">
            <strong>{new Date(hoveredDay.date).toLocaleDateString()}</strong>
          </div>
          <div className="tooltip-content">
            <div className="tooltip-row">
              <span>{t('income') || 'Income'}:</span>
              <span className="positive">{formatCurrency(hoveredDay.income)}</span>
            </div>
            <div className="tooltip-row">
              <span>{t('expenses') || 'Expenses'}:</span>
              <span className="negative">{formatCurrency(hoveredDay.expenses)}</span>
            </div>
            <div className="tooltip-row">
              <span>{t('netFlow') || 'Net Flow'}:</span>
              <span className={hoveredDay.netCashflow >= 0 ? 'positive' : 'negative'}>
                {formatCurrency(hoveredDay.netCashflow)}
              </span>
            </div>
            <div className="tooltip-row">
              <span>{t('transactions') || 'Transactions'}:</span>
              <span>{hoveredDay.transactionCount}</span>
            </div>
            {hoveredDay.budgetVariance !== null && (
              <div className="tooltip-row">
                <span>{t('budgetVariance') || 'Budget Variance'}:</span>
                <span className={hoveredDay.budgetVariance >= 0 ? 'positive' : 'negative'}>
                  {formatCurrency(hoveredDay.budgetVariance)}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Selected Day Details */}
      {selectedDate && calendarData && (
        <div className="selected-day-details">
          <div className="details-header">
            <h4>{new Date(selectedDate).toLocaleDateString()}</h4>
            <button 
              onClick={() => setSelectedDate(null)}
              className="close-button"
            >
              ×
            </button>
          </div>
          <div className="details-content">
            {(() => {
              const day = calendarData.dailyMetrics.find(d => d.date === selectedDate);
              if (!day || day.transactions.length === 0) {
                return <p>{t('noTransactionsThisDay') || 'No transactions on this day'}</p>;
              }
              
              return (
                <div className="day-transactions">
                  <div className="transactions-summary">
                    <div className="summary-item">
                      <span>{t('totalTransactions') || 'Total'}:</span>
                      <span>{day.transactions.length}</span>
                    </div>
                    <div className="summary-item">
                      <span>{t('netCashflow') || 'Net Cashflow'}:</span>
                      <span className={day.netCashflow >= 0 ? 'positive' : 'negative'}>
                        {formatCurrency(day.netCashflow)}
                      </span>
                    </div>
                  </div>
                  
                  <div className="transactions-list">
                    {day.transactions.slice(0, 5).map((transaction, index) => (
                      <div key={index} className="transaction-item">
                        <div className="transaction-description">
                          {transaction.description || t('noDescription') || 'No description'}
                        </div>
                        <div className={`transaction-amount ${transaction.categoryId === 'CAT_001' ? 'income' : 'expense'}`}>
                          {formatCurrency(Math.abs(transaction.amount))}
                        </div>
                      </div>
                    ))}
                    {day.transactions.length > 5 && (
                      <div className="more-transactions">
                        +{day.transactions.length - 5} {t('moreTransactions') || 'more transactions'}
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
};

export default CashflowCalendar;