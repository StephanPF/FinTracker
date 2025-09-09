import React, { useState, useEffect, useRef } from 'react';
import { useAnalytics } from '../AnalyticsMain';

/**
 * TrendLines Component
 * Shows spending trends by subcategory with optional budget overlay lines
 * Follows BUILD_NEW_FEATURE_GUIDE.md compact design principles
 */
const TrendLines = ({ expenseData, activeBudget, selectedPeriod, formatCurrency }) => {
  const { t, analyticsService, dateRange } = useAnalytics();
  const canvasRef = useRef(null);
  const [showBudgetLines, setShowBudgetLines] = useState(true);
  const [trendData, setTrendData] = useState(null);
  const [selectedCategories, setSelectedCategories] = useState(new Set());

  // Generate trend data when inputs change
  useEffect(() => {
    if (expenseData && analyticsService) {
      generateTrendData();
    }
  }, [expenseData, analyticsService, dateRange, selectedPeriod]);

  // Draw chart when trend data changes
  useEffect(() => {
    if (trendData && canvasRef.current) {
      drawTrendChart();
    }
  }, [trendData, showBudgetLines, selectedCategories]);

  /**
   * Generate trend data for the selected period
   */
  const generateTrendData = async () => {
    try {
      // Get historical data for trend analysis
      const periodData = await getHistoricalTrendData();
      
      // Get top spending categories for trend lines
      const topCategories = expenseData
        .sort((a, b) => b.actualSpent - a.actualSpent)
        .slice(0, 5); // Show top 5 categories

      const trendSeries = topCategories.map((category, index) => ({
        subcategoryId: category.subcategoryId,
        subcategoryName: category.subcategoryName,
        color: getTrendColor(index),
        budgetAmount: category.budgetAmount,
        hasBudget: category.hasBudget,
        dataPoints: periodData[category.subcategoryId] || [],
        visible: true
      }));

      setTrendData({
        categories: trendSeries,
        timeLabels: generateTimeLabels(),
        maxValue: Math.max(
          ...trendSeries.flatMap(series => series.dataPoints.map(point => point.amount)),
          ...trendSeries.filter(series => series.hasBudget).map(series => series.budgetAmount)
        )
      });

      // Initialize selected categories to all categories
      setSelectedCategories(new Set(trendSeries.map(s => s.subcategoryId)));
    } catch (error) {
      console.error('Error generating trend data:', error);
    }
  };

  /**
   * Get historical trend data (simulated for now - would be real historical data)
   */
  const getHistoricalTrendData = async () => {
    // This would typically fetch real historical data from the database
    // For now, generate sample trend data based on current period
    const trendData = {};
    
    expenseData.forEach(category => {
      // Generate sample trend points (last 6 periods)
      const baseAmount = category.actualSpent;
      trendData[category.subcategoryId] = Array.from({ length: 6 }, (_, i) => ({
        period: i,
        amount: baseAmount * (0.7 + Math.random() * 0.6) // Simulate variation
      }));
    });

    return trendData;
  };

  /**
   * Generate time labels based on selected period
   */
  const generateTimeLabels = () => {
    const labels = [];
    const periods = 6;
    
    for (let i = periods - 1; i >= 0; i--) {
      switch (selectedPeriod) {
        case 'weekly':
          labels.push(`Week -${i}`);
          break;
        case 'monthly':
          labels.push(`Month -${i}`);
          break;
        case 'quarterly':
          labels.push(`Q -${i}`);
          break;
        case 'yearly':
          labels.push(`Year -${i}`);
          break;
        default:
          labels.push(`Period -${i}`);
      }
    }
    
    return labels;
  };

  /**
   * Get color for trend line
   */
  const getTrendColor = (index) => {
    const colors = [
      '#3b82f6', // Blue
      '#10b981', // Green  
      '#f59e0b', // Amber
      '#ef4444', // Red
      '#8b5cf6'  // Purple
    ];
    return colors[index % colors.length];
  };

  /**
   * Draw the trend chart on canvas
   */
  const drawTrendChart = () => {
    const canvas = canvasRef.current;
    if (!canvas || !trendData) return;

    const ctx = canvas.getContext('2d');
    const { width, height } = canvas;
    
    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Chart dimensions
    const padding = { top: 20, right: 20, bottom: 40, left: 60 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    // Draw grid
    drawGrid(ctx, padding, chartWidth, chartHeight);

    // Draw budget lines (if enabled)
    if (showBudgetLines && activeBudget) {
      drawBudgetOverlay(ctx, padding, chartWidth, chartHeight);
    }

    // Draw trend lines
    drawTrendSeries(ctx, padding, chartWidth, chartHeight);

    // Draw axes labels
    drawAxesLabels(ctx, padding, chartWidth, chartHeight);
  };

  /**
   * Draw grid lines
   */
  const drawGrid = (ctx, padding, chartWidth, chartHeight) => {
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 1;

    // Horizontal grid lines
    const gridLines = 5;
    for (let i = 0; i <= gridLines; i++) {
      const y = padding.top + (chartHeight / gridLines) * i;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(padding.left + chartWidth, y);
      ctx.stroke();
    }

    // Vertical grid lines
    const timePoints = trendData.timeLabels.length;
    for (let i = 0; i < timePoints; i++) {
      const x = padding.left + (chartWidth / (timePoints - 1)) * i;
      ctx.beginPath();
      ctx.moveTo(x, padding.top);
      ctx.lineTo(x, padding.top + chartHeight);
      ctx.stroke();
    }
  };

  /**
   * Draw budget overlay lines (dotted)
   */
  const drawBudgetOverlay = (ctx, padding, chartWidth, chartHeight) => {
    ctx.setLineDash([5, 5]); // Dotted line
    ctx.lineWidth = 2;

    trendData.categories.forEach(category => {
      if (!category.hasBudget || !selectedCategories.has(category.subcategoryId)) return;

      ctx.strokeStyle = category.color + '80'; // Semi-transparent
      
      const budgetY = padding.top + chartHeight - (category.budgetAmount / trendData.maxValue) * chartHeight;
      
      ctx.beginPath();
      ctx.moveTo(padding.left, budgetY);
      ctx.lineTo(padding.left + chartWidth, budgetY);
      ctx.stroke();
    });

    ctx.setLineDash([]); // Reset to solid line
  };

  /**
   * Draw trend series lines
   */
  const drawTrendSeries = (ctx, padding, chartWidth, chartHeight) => {
    ctx.lineWidth = 3;

    trendData.categories.forEach(category => {
      if (!selectedCategories.has(category.subcategoryId)) return;

      ctx.strokeStyle = category.color;
      ctx.beginPath();

      category.dataPoints.forEach((point, index) => {
        const x = padding.left + (chartWidth / (category.dataPoints.length - 1)) * index;
        const y = padding.top + chartHeight - (point.amount / trendData.maxValue) * chartHeight;

        if (index === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });

      ctx.stroke();

      // Draw data points
      ctx.fillStyle = category.color;
      category.dataPoints.forEach((point, index) => {
        const x = padding.left + (chartWidth / (category.dataPoints.length - 1)) * index;
        const y = padding.top + chartHeight - (point.amount / trendData.maxValue) * chartHeight;
        
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, 2 * Math.PI);
        ctx.fill();
      });
    });
  };

  /**
   * Draw axes labels
   */
  const drawAxesLabels = (ctx, padding, chartWidth, chartHeight) => {
    ctx.fillStyle = '#374151';
    ctx.font = '12px system-ui';
    ctx.textAlign = 'center';

    // X-axis labels (time periods)
    trendData.timeLabels.forEach((label, index) => {
      const x = padding.left + (chartWidth / (trendData.timeLabels.length - 1)) * index;
      const y = padding.top + chartHeight + 20;
      ctx.fillText(label, x, y);
    });

    // Y-axis labels (amounts)
    ctx.textAlign = 'right';
    const gridLines = 5;
    for (let i = 0; i <= gridLines; i++) {
      const value = (trendData.maxValue / gridLines) * (gridLines - i);
      const y = padding.top + (chartHeight / gridLines) * i + 4;
      ctx.fillText(formatCurrency(value), padding.left - 10, y);
    }
  };

  /**
   * Toggle category visibility
   */
  const toggleCategory = (subcategoryId) => {
    const newSelected = new Set(selectedCategories);
    if (newSelected.has(subcategoryId)) {
      newSelected.delete(subcategoryId);
    } else {
      newSelected.add(subcategoryId);
    }
    setSelectedCategories(newSelected);
  };

  /**
   * Toggle budget lines visibility
   */
  const toggleBudgetLines = () => {
    setShowBudgetLines(!showBudgetLines);
  };

  if (!trendData) {
    return (
      <div className="trend-lines-loading">
        <div className="loading-content">
          <div className="loading-spinner"></div>
          <p>Loading trend data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="trend-lines">
      {/* Header */}
      <div className="trend-lines-header">
        <div className="header-title">
          <h3 style={{ color: '#1a202c' }}>Spending Trends</h3>
          <p style={{ color: '#64748b' }}>
            Historical spending patterns with budget comparisons
          </p>
        </div>
        
        <div className="header-controls">
          {activeBudget && (
            <button 
              onClick={toggleBudgetLines}
              className={`btn-toggle ${showBudgetLines ? 'active' : ''}`}
              style={{ color: showBudgetLines ? 'white' : '#374151' }}
            >
              Budget Lines
            </button>
          )}
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="trend-chart-container">
        <canvas 
          ref={canvasRef}
          width={800}
          height={300}
          className="trend-chart"
        />
      </div>

      {/* Legend */}
      <div className="trend-legend">
        {trendData.categories.map(category => (
          <div 
            key={category.subcategoryId}
            className={`legend-item ${selectedCategories.has(category.subcategoryId) ? 'active' : 'inactive'}`}
            onClick={() => toggleCategory(category.subcategoryId)}
            style={{ cursor: 'pointer' }}
          >
            <div 
              className="legend-color"
              style={{ backgroundColor: category.color }}
            />
            <span style={{ color: selectedCategories.has(category.subcategoryId) ? '#1a202c' : '#9ca3af' }}>
              {category.subcategoryName}
            </span>
            {category.hasBudget && (
              <span className="legend-budget" style={{ color: '#64748b' }}>
                (Budgeted: {formatCurrency(category.budgetAmount)})
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Insights */}
      {activeBudget && (
        <div className="trend-insights">
          <h4 style={{ color: '#1a202c' }}>Trend Insights</h4>
          <div className="insights-list">
            {generateTrendInsights().map((insight, index) => (
              <div key={index} className={`insight-item ${insight.type}`}>
                <span className="insight-icon">{insight.icon}</span>
                <div className="insight-content">
                  <span className="insight-title" style={{ color: '#1a202c' }}>
                    {insight.title}
                  </span>
                  <span className="insight-description" style={{ color: '#64748b' }}>
                    {insight.description}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Generate trend insights based on data
 */
const generateTrendInsights = () => {
  // This would analyze the trend data to generate insights
  // For now, return sample insights
  return [
    {
      type: 'info',
      icon: '📈',
      title: 'Increasing Trend',
      description: 'Groceries spending has increased 15% over the last 3 months'
    },
    {
      type: 'warning', 
      icon: '⚠️',
      title: 'Budget Variance',
      description: 'Transportation expenses consistently exceed budget by 20%'
    },
    {
      type: 'success',
      icon: '✅',
      title: 'Good Control',
      description: 'Entertainment spending is well within budget limits'
    }
  ];
};

export default TrendLines;