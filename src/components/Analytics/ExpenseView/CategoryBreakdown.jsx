import React, { useState, useEffect } from 'react';
import { useAnalytics } from '../AnalyticsMain';

/**
 * Category Breakdown Component
 * Displays expense distribution by subcategory with budget integration
 * Uses HTML/CSS donut chart (no external chart library dependencies)
 * Follows BUILD_NEW_FEATURE_GUIDE.md compact design principles
 */
const CategoryBreakdown = ({ expenseData, activeBudget, formatCurrency }) => {
  const { t, database } = useAnalytics();
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [chartData, setChartData] = useState([]);

  useEffect(() => {
    if (expenseData && expenseData.length > 0) {
      processChartData();
    }
  }, [expenseData, activeBudget]);

  /**
   * Process expense data for chart visualization
   */
  const processChartData = () => {
    if (!expenseData || expenseData.length === 0) return;

    // Calculate total expenses
    const totalExpenses = expenseData.reduce((sum, cat) => sum + cat.actualSpent, 0);

    // Process categories with percentages and budget status
    const processedData = expenseData
      .map(category => {
        const percentage = totalExpenses > 0 ? (category.actualSpent / totalExpenses) * 100 : 0;
        
        return {
          ...category,
          percentage,
          budgetStatus: getBudgetStatus(category),
          color: getTransactionGroupColor(category),
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
   * Get color from transaction group associated with the subcategory
   */
  const getTransactionGroupColor = (category) => {
    try {
      // Get subcategories table to find the groupId
      const subcategories = database?.getTable('subcategories') || [];
      const subcategory = subcategories.find(sub => sub.id === category.subcategoryId);
      
      if (subcategory && subcategory.groupId) {
        // Get transaction groups table to find the color
        const transactionGroups = database?.getTable('transaction_groups') || [];
        const group = transactionGroups.find(grp => grp.id === subcategory.groupId);
        
        if (group && group.color) {
          return group.color;
        }
      }
      
      // Fallback to budget color if no transaction group color found
      const colors = {
        'over-budget': '#ef4444',      // Red
        'close-to-budget': '#f59e0b',  // Yellow
        'within-budget': '#10b981',    // Green
        'no-budget': '#6b7280'         // Gray
      };
      return colors[getBudgetStatus(category)] || colors['no-budget'];
    } catch (error) {
      console.error('Error getting transaction group color:', error);
      return '#6b7280'; // Gray fallback
    }
  };

  /**
   * Handle category selection
   */
  const handleCategoryClick = (category) => {
    setSelectedCategory(selectedCategory?.subcategoryId === category.subcategoryId ? null : category);
  };

  /**
   * Generate SVG path for donut segment
   */
  const createDonutSegment = (startAngle, endAngle, innerRadius = 60, outerRadius = 100) => {
    const startAngleRad = (startAngle * Math.PI) / 180;
    const endAngleRad = (endAngle * Math.PI) / 180;

    const x1 = 120 + outerRadius * Math.cos(startAngleRad);
    const y1 = 120 + outerRadius * Math.sin(startAngleRad);
    const x2 = 120 + outerRadius * Math.cos(endAngleRad);
    const y2 = 120 + outerRadius * Math.sin(endAngleRad);

    const x3 = 120 + innerRadius * Math.cos(endAngleRad);
    const y3 = 120 + innerRadius * Math.sin(endAngleRad);
    const x4 = 120 + innerRadius * Math.cos(startAngleRad);
    const y4 = 120 + innerRadius * Math.sin(startAngleRad);

    const largeArc = endAngle - startAngle > 180 ? 1 : 0;

    return `M ${x1} ${y1} A ${outerRadius} ${outerRadius} 0 ${largeArc} 1 ${x2} ${y2} L ${x3} ${y3} A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${x4} ${y4} Z`;
  };

  if (!expenseData || expenseData.length === 0) {
    return (
      <div className="category-breakdown">
        <div className="breakdown-header">
          <h3>📊 Category Breakdown</h3>
          <p className="breakdown-subtitle">
            Expense distribution by category
          </p>
        </div>

        <div className="breakdown-empty">
          <div className="empty-chart">
            <span className="empty-icon">📊</span>
            <p>No expense categories to display</p>
          </div>
        </div>
      </div>
    );
  }

  let currentAngle = -90; // Start at top

  return (
    <div className="category-breakdown">
      <div className="breakdown-header">
        <h3>📊 Category Breakdown</h3>
        <p className="breakdown-subtitle">
          Expense distribution by category
        </p>
      </div>

      <div className="breakdown-content">
        {/* Donut Chart */}
        <div className="donut-chart-container">
          <svg viewBox="0 0 240 240" className="donut-chart">
            {chartData.map((category, index) => {
              const startAngle = currentAngle;
              const endAngle = currentAngle + (category.percentage * 3.6); // 3.6 degrees per percent
              currentAngle = endAngle;

              const path = createDonutSegment(startAngle, endAngle);
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
                    opacity: isSelected ? 1 : 0.9,
                    transform: isSelected ? 'scale(1.02)' : 'scale(1)',
                    transformOrigin: '120px 120px',
                    transition: 'all 0.3s ease'
                  }}
                />
              );
            })}
            
            {/* Center text */}
            <text x="120" y="115" textAnchor="middle" className="chart-center-text">
              <tspan className="center-label">Total</tspan>
            </text>
            <text x="120" y="135" textAnchor="middle" className="chart-center-text">
              <tspan className="center-value">
                {formatCurrency(chartData.reduce((sum, cat) => sum + cat.actualSpent, 0))}
              </tspan>
            </text>
          </svg>
        </div>

        {/* Category Legend */}
        <div className="category-legend">
          {chartData.map((category, index) => (
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
                    <span className="legend-no-budget">
                      No budget
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Selected Category Details */}
        {selectedCategory && (
          <div className="selected-category-details">
            <div className="details-header">
              <h4>{selectedCategory.label}</h4>
              <button
                onClick={() => setSelectedCategory(null)}
                className="btn-close-details"
              >
                ×
              </button>
            </div>
            <div className="details-content">
              <div className="detail-row">
                <span className="detail-label">Total Spent:</span>
                <span className="detail-value">{formatCurrency(selectedCategory.actualSpent)}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">% of Total:</span>
                <span className="detail-value">{selectedCategory.percentage.toFixed(1)}%</span>
              </div>
              {selectedCategory.hasBudget && (
                <>
                  <div className="detail-row">
                    <span className="detail-label">Budgeted:</span>
                    <span className="detail-value">{formatCurrency(selectedCategory.budgetAmount)}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Variance:</span>
                    <span className={`detail-value ${selectedCategory.variance > 0 ? 'over-budget' : 'under-budget'}`}>
                      {selectedCategory.variance > 0 ? '+' : ''}{formatCurrency(selectedCategory.variance)}
                    </span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Budget Used:</span>
                    <span className="detail-value">{selectedCategory.variancePercentage.toFixed(1)}%</span>
                  </div>
                </>
              )}
              {!selectedCategory.hasBudget && (
                <div className="detail-row">
                  <span className="detail-note">This category is not included in your budget</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

    </div>
  );
};

export default CategoryBreakdown;