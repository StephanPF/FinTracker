import React, { useState, useEffect } from 'react';
import { useAnalytics } from '../AnalyticsMain';

/**
 * Budget Status Breakdown Component
 * Displays expense distribution by budget status colors (over/close/within/no budget)
 * Uses HTML/CSS donut chart (no external chart library dependencies)
 * Follows BUILD_NEW_FEATURE_GUIDE.md compact design principles
 */
const BudgetStatusBreakdown = ({ expenseData, activeBudget, formatCurrency }) => {
  const { t, database } = useAnalytics();
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [chartData, setChartData] = useState([]);

  useEffect(() => {
    if (expenseData && expenseData.length > 0) {
      processChartData();
    }
  }, [expenseData, activeBudget]);

  /**
   * Process expense data for budget status chart visualization
   */
  const processChartData = () => {
    if (!expenseData || expenseData.length === 0) return;

    // Calculate total expenses
    const totalExpenses = expenseData.reduce((sum, cat) => sum + cat.actualSpent, 0);

    // Process categories with percentages and budget status colors
    const processedData = expenseData
      .map(category => {
        const percentage = totalExpenses > 0 ? (category.actualSpent / totalExpenses) * 100 : 0;
        
        return {
          ...category,
          percentage,
          budgetStatus: getBudgetStatus(category),
          color: getBudgetStatusColor(category), // Use budget status colors instead
          label: category.subcategoryName || `Category ${category.subcategoryId}`
        };
      })
      .sort((a, b) => b.actualSpent - a.actualSpent); // Sort by spending amount

    setChartData(processedData);
  };

  /**
   * Get budget status for category
   */
  const getBudgetStatus = (category) => {
    if (!category.hasBudget) return 'no-budget';
    if (category.variance > 0) return 'over-budget';
    if (category.variancePercentage > 80) return 'close-to-budget';
    return 'within-budget';
  };

  /**
   * Get color based on budget status
   */
  const getBudgetStatusColor = (category) => {
    const colors = {
      'over-budget': '#ef4444',      // Red
      'close-to-budget': '#f59e0b',  // Yellow
      'within-budget': '#10b981',    // Green
      'no-budget': '#6b7280'         // Gray
    };
    return colors[getBudgetStatus(category)] || colors['no-budget'];
  };

  /**
   * Handle category click for detailed view
   */
  const handleCategoryClick = (category) => {
    setSelectedCategory(selectedCategory?.subcategoryId === category.subcategoryId ? null : category);
  };

  /**
   * Generate SVG path for donut chart segments
   */
  const generateDonutPath = (percentage, currentOffset) => {
    const centerX = 100;
    const centerY = 100;
    const radius = 70;
    const innerRadius = 40;
    
    if (percentage === 0) return '';
    if (percentage >= 100) {
      // Full circle
      return `M ${centerX} ${centerY - radius} 
              A ${radius} ${radius} 0 1 1 ${centerX - 0.01} ${centerY - radius} 
              L ${centerX - 0.01} ${centerY - innerRadius} 
              A ${innerRadius} ${innerRadius} 0 1 0 ${centerX} ${centerY - innerRadius} Z`;
    }

    const startAngle = (currentOffset / 100) * 2 * Math.PI - Math.PI / 2;
    const endAngle = ((currentOffset + percentage) / 100) * 2 * Math.PI - Math.PI / 2;
    
    const x1 = centerX + radius * Math.cos(startAngle);
    const y1 = centerY + radius * Math.sin(startAngle);
    const x2 = centerX + radius * Math.cos(endAngle);
    const y2 = centerY + radius * Math.sin(endAngle);
    const x3 = centerX + innerRadius * Math.cos(endAngle);
    const y3 = centerY + innerRadius * Math.sin(endAngle);
    const x4 = centerX + innerRadius * Math.cos(startAngle);
    const y4 = centerY + innerRadius * Math.sin(startAngle);
    
    const largeArcFlag = percentage > 50 ? 1 : 0;
    
    return `M ${x1} ${y1} 
            A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2} 
            L ${x3} ${y3} 
            A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${x4} ${y4} Z`;
  };

  if (!expenseData || expenseData.length === 0) {
    return (
      <div className="category-breakdown">
        <div className="breakdown-header">
          <h3>💰 {t('budgetStatusBreakdown') || 'Budget Status Breakdown'}</h3>
          <p className="breakdown-subtitle">{t('noBudgetStatusData') || 'No budget status data available for selected period'}</p>
        </div>
      </div>
    );
  }

  if (!activeBudget) {
    return (
      <div className="category-breakdown">
        <div className="breakdown-header">
          <h3>💰 {t('budgetStatusBreakdown') || 'Budget Status Breakdown'}</h3>
          <p className="breakdown-subtitle">{t('noBudgetAvailable') || 'No active budget - budget status breakdown not available'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="category-breakdown budget-status-breakdown">
      <div className="breakdown-header">
        <h3>💰 {t('budgetStatusBreakdown') || 'Budget Status Breakdown'}</h3>
        <p className="breakdown-subtitle">
          {t('expensesByBudgetStatus') || 'Expense distribution by budget performance'}
        </p>
      </div>

      <div className="breakdown-content">
        {/* Donut Chart */}
        <div className="chart-section">
          <svg viewBox="0 0 200 200" className="donut-chart">
            {chartData.map((category, index) => {
              const currentOffset = chartData.slice(0, index).reduce((sum, cat) => sum + cat.percentage, 0);
              const path = generateDonutPath(category.percentage, currentOffset);
              const isSelected = selectedCategory?.subcategoryId === category.subcategoryId;

              return (
                <path
                  key={category.subcategoryId}
                  d={path}
                  fill={category.color}
                  stroke="white"
                  strokeWidth="2"
                  className={`donut-segment ${isSelected ? 'selected' : ''} status-${category.budgetStatus}`}
                  onClick={() => handleCategoryClick(category)}
                  style={{
                    cursor: 'pointer',
                    opacity: isSelected ? 0.8 : 1,
                    filter: isSelected ? 'brightness(1.1)' : 'none'
                  }}
                />
              );
            })}
          </svg>
        </div>

        {/* Legend */}
        <div className="legend-section">
          {chartData.map(category => (
            <div
              key={category.subcategoryId}
              className={`legend-item ${selectedCategory?.subcategoryId === category.subcategoryId ? 'selected' : ''}`}
              onClick={() => handleCategoryClick(category)}
            >
              <div
                className="legend-color"
                style={{ backgroundColor: category.color }}
              />
              <div className="legend-info">
                <div className="legend-header">
                  <span className="legend-label">{category.label}</span>
                  <span className="legend-percentage">
                    {category.percentage.toFixed(1)}%
                  </span>
                </div>
                <div className="legend-details">
                  <span className="legend-amount">
                    {formatCurrency(category.actualSpent)}
                  </span>
                  {category.hasBudget && (
                    <span className={`legend-budget-status status-${category.budgetStatus}`}>
                      {category.budgetStatus === 'over-budget' && `+${formatCurrency(category.variance)}`}
                      {category.budgetStatus === 'close-to-budget' && `${Math.round(category.variancePercentage)}% used`}
                      {category.budgetStatus === 'within-budget' && `${formatCurrency(Math.abs(category.variance))} left`}
                    </span>
                  )}
                  {!category.hasBudget && (
                    <span className="legend-budget-status status-no-budget">
                      {t('noBudgetSet') || 'No budget set'}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Budget Status Legend */}
      <div className="budget-status-legend">
        <h4>{t('budgetStatusColors') || 'Budget Status Colors'}</h4>
        <div className="budget-legend-items">
          <div className="budget-legend-item">
            <div className="legend-color" style={{ backgroundColor: '#10b981' }} />
            <span>{t('withinBudget') || 'Within Budget'}</span>
          </div>
          <div className="budget-legend-item">
            <div className="legend-color" style={{ backgroundColor: '#f59e0b' }} />
            <span>{t('closeToBudget') || 'Close to Budget'}</span>
          </div>
          <div className="budget-legend-item">
            <div className="legend-color" style={{ backgroundColor: '#ef4444' }} />
            <span>{t('overBudget') || 'Over Budget'}</span>
          </div>
          <div className="budget-legend-item">
            <div className="legend-color" style={{ backgroundColor: '#6b7280' }} />
            <span>{t('noBudget') || 'No Budget'}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BudgetStatusBreakdown;