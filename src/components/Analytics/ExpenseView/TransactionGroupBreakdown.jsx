import React, { useState, useEffect } from 'react';
import { useAnalytics } from '../AnalyticsMain';

/**
 * Transaction Group Breakdown Component
 * Displays expense distribution by transaction group with budget integration
 * Uses HTML/CSS donut chart (no external chart library dependencies)
 * Follows BUILD_NEW_FEATURE_GUIDE.md compact design principles
 */
const TransactionGroupBreakdown = ({ expenseData, activeBudget, formatCurrency }) => {
  const { t, database } = useAnalytics();
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [chartData, setChartData] = useState([]);

  useEffect(() => {
    if (expenseData && expenseData.length > 0) {
      processChartData();
    }
  }, [expenseData, activeBudget]);

  /**
   * Process expense data for transaction group chart visualization
   */
  const processChartData = () => {
    if (!expenseData || expenseData.length === 0) return;

    // Get transaction groups from database
    const transactionGroups = database.getTable('transaction_groups') || [];
    
    // Aggregate expenses by transaction group
    const groupTotals = {};
    const groupBudgets = {};
    
    expenseData.forEach(category => {
      const subcategory = database.getTable('subcategories')?.find(sub => sub.id === category.subcategoryId);
      if (subcategory && subcategory.groupId) {
        const groupId = subcategory.groupId;
        
        // Sum expenses for this group
        if (!groupTotals[groupId]) {
          groupTotals[groupId] = 0;
        }
        groupTotals[groupId] += category.actualSpent;
        
        // Sum budgets for this group
        if (category.hasBudget) {
          if (!groupBudgets[groupId]) {
            groupBudgets[groupId] = 0;
          }
          groupBudgets[groupId] += category.budgetAmount;
        }
      }
    });

    // Calculate total expenses
    const totalExpenses = Object.values(groupTotals).reduce((sum, amount) => sum + amount, 0);

    // Process groups with percentages and budget status
    const processedData = Object.entries(groupTotals)
      .map(([groupId, actualSpent]) => {
        const group = transactionGroups.find(g => g.id === groupId);
        const budgetAmount = groupBudgets[groupId] || 0;
        const hasBudget = budgetAmount > 0;
        const variance = hasBudget ? actualSpent - budgetAmount : 0;
        const variancePercentage = hasBudget && budgetAmount > 0 ? (variance / budgetAmount) * 100 : 0;
        const percentage = totalExpenses > 0 ? (actualSpent / totalExpenses) * 100 : 0;
        
        return {
          groupId,
          groupName: group?.name || `Group ${groupId}`,
          actualSpent,
          budgetAmount,
          hasBudget,
          variance,
          variancePercentage,
          percentage,
          budgetStatus: getBudgetStatus({ actualSpent, budgetAmount, hasBudget, variance, variancePercentage }),
          color: getTransactionGroupColor(group),
          label: group?.name || `Group ${groupId}`
        };
      })
      .sort((a, b) => b.actualSpent - a.actualSpent); // Sort by spending amount

    setChartData(processedData);
  };

  /**
   * Get budget status for transaction group
   */
  const getBudgetStatus = (group) => {
    if (!group.hasBudget) return 'no-budget';
    
    if (group.variance > 0) return 'over-budget';
    if (group.variancePercentage > -10) return 'close-to-budget'; // Within 10% of budget
    return 'within-budget';
  };

  /**
   * Get transaction group color
   */
  const getTransactionGroupColor = (group) => {
    return group?.color || '#94a3b8'; // Default gray if no color
  };

  /**
   * Handle group click for selection
   */
  const handleGroupClick = (group) => {
    setSelectedGroup(selectedGroup?.groupId === group.groupId ? null : group);
  };

  /**
   * Generate SVG path for donut segment
   */
  const generatePath = (startAngle, endAngle, innerRadius = 60, outerRadius = 90) => {
    const start = polarToCartesian(100, 100, outerRadius, endAngle);
    const end = polarToCartesian(100, 100, outerRadius, startAngle);
    const innerStart = polarToCartesian(100, 100, innerRadius, endAngle);
    const innerEnd = polarToCartesian(100, 100, innerRadius, startAngle);
    
    const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
    
    return [
      "M", start.x, start.y, 
      "A", outerRadius, outerRadius, 0, largeArcFlag, 0, end.x, end.y,
      "L", innerEnd.x, innerEnd.y,
      "A", innerRadius, innerRadius, 0, largeArcFlag, 1, innerStart.x, innerStart.y,
      "Z"
    ].join(" ");
  };

  /**
   * Convert polar coordinates to cartesian
   */
  const polarToCartesian = (centerX, centerY, radius, angleInDegrees) => {
    const angleInRadians = (angleInDegrees - 90) * Math.PI / 180.0;
    return {
      x: centerX + (radius * Math.cos(angleInRadians)),
      y: centerY + (radius * Math.sin(angleInRadians))
    };
  };

  if (!chartData || chartData.length === 0) {
    return (
      <div className="transaction-group-breakdown">
        <div className="chart-header">
          <h3>Transaction Group Breakdown</h3>
          <p className="chart-subtitle">Expenses by transaction group</p>
        </div>
        <div className="empty-chart">
          <p>No expense data available</p>
        </div>
      </div>
    );
  }

  let currentAngle = 0;

  return (
    <div className="transaction-group-breakdown">
      <div className="chart-header">
        <h3>Transaction Group Breakdown</h3>
        <p className="chart-subtitle">Expenses by transaction group</p>
      </div>

      <div className="chart-content">
        {/* Donut Chart */}
        <div className="donut-chart-container">
          <svg width="200" height="200" viewBox="0 0 200 200">
            {chartData.map((group, index) => {
              const segmentAngle = (group.percentage / 100) * 360;
              const startAngle = currentAngle;
              const endAngle = currentAngle + segmentAngle;
              const path = generatePath(startAngle, endAngle);
              
              currentAngle += segmentAngle;
              
              return (
                <path
                  key={group.groupId}
                  d={path}
                  fill={group.color}
                  stroke="#ffffff"
                  strokeWidth="2"
                  className={`chart-segment ${selectedGroup?.groupId === group.groupId ? 'selected' : ''}`}
                  onClick={() => handleGroupClick(group)}
                  style={{ cursor: 'pointer' }}
                />
              );
            })}
            
            {/* Center text */}
            <text x="100" y="95" textAnchor="middle" className="chart-center-title">
              Total
            </text>
            <text x="100" y="110" textAnchor="middle" className="chart-center-value">
              {formatCurrency(chartData.reduce((sum, g) => sum + g.actualSpent, 0))}
            </text>
          </svg>
        </div>

        {/* Transaction Group Legend */}
        <div className="transaction-group-legend">
          {chartData.map((group, index) => (
            <div
              key={group.groupId}
              className={`legend-item ${selectedGroup?.groupId === group.groupId ? 'selected' : ''}`}
              onClick={() => handleGroupClick(group)}
            >
              <div
                className="legend-color"
                style={{ backgroundColor: group.color }}
              />
              <div className="legend-info">
                <div className="legend-header">
                  <span className="legend-label">{group.label}</span>
                  <span className="legend-percentage">
                    {group.percentage.toFixed(1)}%
                  </span>
                </div>
                <div className="legend-details">
                  <span className="legend-amount">
                    {formatCurrency(group.actualSpent)}
                  </span>
                  {group.hasBudget && (
                    <span className={`legend-budget-status status-${group.budgetStatus}`}>
                      {group.budgetStatus === 'over-budget' && `+${formatCurrency(group.variance)}`}
                      {group.budgetStatus === 'close-to-budget' && `${Math.round(group.variancePercentage)}% used`}
                      {group.budgetStatus === 'within-budget' && `${formatCurrency(Math.abs(group.variance))} left`}
                    </span>
                  )}
                  {!group.hasBudget && (
                    <span className="legend-no-budget">
                      No budget
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Selected Group Details */}
      {selectedGroup && (
        <div className="selected-group-details">
          <h4>{selectedGroup.label} Details</h4>
          <div className="detail-row">
            <span>Total Spent:</span>
            <span>{formatCurrency(selectedGroup.actualSpent)}</span>
          </div>
          {selectedGroup.hasBudget && (
            <>
              <div className="detail-row">
                <span>Budget:</span>
                <span>{formatCurrency(selectedGroup.budgetAmount)}</span>
              </div>
              <div className="detail-row">
                <span>Variance:</span>
                <span className={selectedGroup.variance > 0 ? 'negative' : 'positive'}>
                  {selectedGroup.variance > 0 ? '+' : ''}{formatCurrency(selectedGroup.variance)}
                </span>
              </div>
            </>
          )}
          <div className="detail-row">
            <span>Percentage of Total:</span>
            <span>{selectedGroup.percentage.toFixed(1)}%</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default TransactionGroupBreakdown;