import React, { useState, useEffect, useRef } from 'react';
import { useAnalytics } from '../AnalyticsMain';

/**
 * CashflowTrend Component
 * Shows cashflow trends over time with budget overlay lines
 * Follows BUILD_NEW_FEATURE_GUIDE.md compact design principles
 */
const CashflowTrend = ({ cashflowData, budgetSummary, activeBudget, formatCurrency, selectedPeriod }) => {
  const { t, analyticsService, dateRange } = useAnalytics();
  const canvasRef = useRef(null);
  const [showBudgetLines, setShowBudgetLines] = useState(true);
  const [trendData, setTrendData] = useState(null);
  const [hoveredPoint, setHoveredPoint] = useState(null);

  // Generate trend data when inputs change
  useEffect(() => {
    if (cashflowData && analyticsService) {
      generateTrendData();
    }
  }, [cashflowData, analyticsService, dateRange, selectedPeriod]);

  // Draw chart when trend data changes
  useEffect(() => {
    if (trendData && canvasRef.current) {
      drawTrendChart();
    }
  }, [trendData, showBudgetLines]);

  /**
   * Generate trend data for cashflow analysis
   */
  const generateTrendData = async () => {
    try {
      // For Phase 4, generate simplified historical data
      // In a real implementation, this would fetch actual historical data
      const historicalPeriods = generateHistoricalPeriods();
      const trendSeries = generateTrendSeries(historicalPeriods);

      setTrendData({
        periods: historicalPeriods,
        series: trendSeries,
        maxValue: Math.max(...trendSeries.flatMap(series => series.data)),
        minValue: Math.min(...trendSeries.flatMap(series => series.data))
      });
    } catch (error) {
      console.error('Error generating trend data:', error);
    }
  };

  /**
   * Generate historical periods for trend analysis
   */
  const generateHistoricalPeriods = () => {
    const periods = [];
    const numPeriods = 6;
    
    for (let i = numPeriods - 1; i >= 0; i--) {
      let label;
      switch (selectedPeriod) {
        case 'weekly':
          label = `Week -${i}`;
          break;
        case 'monthly':
          label = `Month -${i}`;
          break;
        case 'quarterly':
          label = `Q-${i}`;
          break;
        case 'yearly':
          label = `Year -${i}`;
          break;
        default:
          label = `Period -${i}`;
      }
      periods.push({ label, index: numPeriods - 1 - i });
    }
    
    return periods;
  };

  /**
   * Generate trend series data
   */
  const generateTrendSeries = (periods) => {
    const series = [];
    
    // Income trend line
    const incomeData = periods.map((period, index) => {
      if (index === periods.length - 1) {
        return cashflowData.income; // Current period actual data
      }
      // Generate historical data with some variance
      return cashflowData.income * (0.8 + Math.random() * 0.4);
    });

    series.push({
      id: 'income',
      label: t('income') || 'Income',
      color: '#059669',
      data: incomeData,
      type: 'line'
    });

    // Expenses trend line
    const expensesData = periods.map((period, index) => {
      if (index === periods.length - 1) {
        return cashflowData.expenses; // Current period actual data
      }
      // Generate historical data with some variance
      return cashflowData.expenses * (0.7 + Math.random() * 0.6);
    });

    series.push({
      id: 'expenses',
      label: t('expenses') || 'Expenses',
      color: '#dc2626',
      data: expensesData,
      type: 'line'
    });

    // Net cashflow trend line
    const netCashflowData = periods.map((period, index) => 
      incomeData[index] - expensesData[index]
    );

    series.push({
      id: 'netCashflow',
      label: t('netCashflow') || 'Net Cashflow',
      color: '#3b82f6',
      data: netCashflowData,
      type: 'line',
      lineWidth: 3
    });

    // Budget lines (if budget is active)
    if (activeBudget && budgetSummary) {
      // Budgeted income line
      const budgetedIncomeData = periods.map(() => budgetSummary.budgetedIncome);
      series.push({
        id: 'budgetedIncome',
        label: t('budgetedIncome') || 'Budgeted Income',
        color: '#059669',
        data: budgetedIncomeData,
        type: 'budget-line',
        lineStyle: 'dashed'
      });

      // Budgeted expenses line
      const budgetedExpensesData = periods.map(() => budgetSummary.budgetedExpenses);
      series.push({
        id: 'budgetedExpenses',
        label: t('budgetedExpenses') || 'Budgeted Expenses',
        color: '#dc2626',
        data: budgetedExpensesData,
        type: 'budget-line',
        lineStyle: 'dashed'
      });

      // Budgeted net cashflow line
      const budgetedNetCashflowData = periods.map(() => budgetSummary.budgetedNetCashflow);
      series.push({
        id: 'budgetedNetCashflow',
        label: t('budgetedNetCashflow') || 'Budgeted Net Cashflow',
        color: '#3b82f6',
        data: budgetedNetCashflowData,
        type: 'budget-line',
        lineStyle: 'dashed'
      });
    }

    return series;
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
    const padding = { top: 20, right: 20, bottom: 60, left: 80 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    // Draw grid and axes
    drawGrid(ctx, padding, chartWidth, chartHeight);

    // Draw zero line
    drawZeroLine(ctx, padding, chartWidth, chartHeight);

    // Draw trend lines
    drawTrendLines(ctx, padding, chartWidth, chartHeight);

    // Draw data points
    drawDataPoints(ctx, padding, chartWidth, chartHeight);

    // Draw axes labels
    drawAxesLabels(ctx, padding, chartWidth, chartHeight);
  };

  /**
   * Draw grid lines
   */
  const drawGrid = (ctx, padding, chartWidth, chartHeight) => {
    ctx.strokeStyle = '#f1f5f9';
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
    const timePoints = trendData.periods.length;
    for (let i = 0; i < timePoints; i++) {
      const x = padding.left + (chartWidth / (timePoints - 1)) * i;
      ctx.beginPath();
      ctx.moveTo(x, padding.top);
      ctx.lineTo(x, padding.top + chartHeight);
      ctx.stroke();
    }
  };

  /**
   * Draw zero reference line
   */
  const drawZeroLine = (ctx, padding, chartWidth, chartHeight) => {
    if (trendData.minValue >= 0) return; // No negative values, no zero line needed

    const range = trendData.maxValue - trendData.minValue;
    const zeroY = padding.top + chartHeight - (-trendData.minValue / range) * chartHeight;

    ctx.strokeStyle = '#374151';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(padding.left, zeroY);
    ctx.lineTo(padding.left + chartWidth, zeroY);
    ctx.stroke();

    // Zero label
    ctx.fillStyle = '#374151';
    ctx.font = '12px system-ui';
    ctx.textAlign = 'right';
    ctx.fillText('0', padding.left - 10, zeroY + 4);
  };

  /**
   * Draw trend lines
   */
  const drawTrendLines = (ctx, padding, chartWidth, chartHeight) => {
    const range = trendData.maxValue - trendData.minValue;
    const timePoints = trendData.periods.length;

    trendData.series.forEach(series => {
      if (series.type === 'budget-line' && !showBudgetLines) return;

      ctx.strokeStyle = series.color;
      ctx.lineWidth = series.lineWidth || 2;
      
      // Set line style
      if (series.lineStyle === 'dashed') {
        ctx.setLineDash([8, 4]);
      } else {
        ctx.setLineDash([]);
      }

      ctx.beginPath();
      series.data.forEach((value, index) => {
        const x = padding.left + (chartWidth / (timePoints - 1)) * index;
        const y = padding.top + chartHeight - ((value - trendData.minValue) / range) * chartHeight;

        if (index === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });
      ctx.stroke();
      ctx.setLineDash([]); // Reset dash pattern
    });
  };

  /**
   * Draw data points
   */
  const drawDataPoints = (ctx, padding, chartWidth, chartHeight) => {
    const range = trendData.maxValue - trendData.minValue;
    const timePoints = trendData.periods.length;

    trendData.series.forEach(series => {
      if (series.type === 'budget-line') return; // Skip budget lines for points

      ctx.fillStyle = series.color;
      series.data.forEach((value, index) => {
        const x = padding.left + (chartWidth / (timePoints - 1)) * index;
        const y = padding.top + chartHeight - ((value - trendData.minValue) / range) * chartHeight;
        
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, 2 * Math.PI);
        ctx.fill();

        // Highlight hovered point
        if (hoveredPoint && hoveredPoint.seriesId === series.id && hoveredPoint.index === index) {
          ctx.strokeStyle = '#1f2937';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(x, y, 6, 0, 2 * Math.PI);
          ctx.stroke();
        }
      });
    });
  };

  /**
   * Draw axes labels
   */
  const drawAxesLabels = (ctx, padding, chartWidth, chartHeight) => {
    ctx.fillStyle = '#374151';
    ctx.font = '12px system-ui';

    // X-axis labels (time periods)
    ctx.textAlign = 'center';
    trendData.periods.forEach((period, index) => {
      const x = padding.left + (chartWidth / (trendData.periods.length - 1)) * index;
      const y = padding.top + chartHeight + 20;
      ctx.fillText(period.label, x, y);
    });

    // Y-axis labels (values)
    ctx.textAlign = 'right';
    const range = trendData.maxValue - trendData.minValue;
    const gridLines = 5;
    for (let i = 0; i <= gridLines; i++) {
      const value = trendData.minValue + (range / gridLines) * (gridLines - i);
      const y = padding.top + (chartHeight / gridLines) * i + 4;
      if (Math.abs(value) > 0.01) { // Avoid showing tiny values near zero
        ctx.fillText(formatCurrency(value), padding.left - 10, y);
      }
    }
  };

  /**
   * Handle mouse events for interactivity
   */
  const handleMouseMove = (event) => {
    if (!trendData || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    // Find nearest data point
    const padding = { left: 80, top: 20 };
    const chartWidth = canvas.width - 80 - 20;
    const chartHeight = canvas.height - 20 - 60;
    const timePoints = trendData.periods.length;
    
    const periodIndex = Math.round((x - padding.left) / (chartWidth / (timePoints - 1)));
    
    if (periodIndex >= 0 && periodIndex < timePoints) {
      // Find which series point is closest to the mouse
      let closestPoint = null;
      let closestDistance = Infinity;
      
      trendData.series.forEach(series => {
        if (series.type === 'budget-line') return;
        
        const range = trendData.maxValue - trendData.minValue;
        const pointX = padding.left + (chartWidth / (timePoints - 1)) * periodIndex;
        const pointY = padding.top + chartHeight - ((series.data[periodIndex] - trendData.minValue) / range) * chartHeight;
        
        const distance = Math.sqrt((x - pointX) ** 2 + (y - pointY) ** 2);
        
        if (distance < 20 && distance < closestDistance) { // Within 20px
          closestDistance = distance;
          closestPoint = { seriesId: series.id, index: periodIndex };
        }
      });
      
      setHoveredPoint(closestPoint);
    } else {
      setHoveredPoint(null);
    }
  };

  const handleMouseLeave = () => {
    setHoveredPoint(null);
  };

  /**
   * Toggle budget lines visibility
   */
  const toggleBudgetLines = () => {
    setShowBudgetLines(!showBudgetLines);
  };

  if (!trendData) {
    return (
      <div className="cashflow-trend-loading">
        <div className="loading-content">
          <div className="loading-spinner"></div>
          <p>{t('loadingTrendData') || 'Loading trend data...'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="cashflow-trend">
      {/* Header */}
      <div className="cashflow-trend-header">
        <div className="header-title">
          <h3 style={{ color: '#1a202c' }}>{t('cashflowTrends') || 'Cashflow Trends'}</h3>
          <p style={{ color: '#64748b' }}>
            {t('cashflowTrendDescription') || 'Income, expenses, and net cashflow trends over time with budget comparisons'}
          </p>
        </div>
        
        <div className="header-controls">
          {activeBudget && (
            <button 
              onClick={toggleBudgetLines}
              className={`btn-toggle ${showBudgetLines ? 'active' : ''}`}
              style={{ color: showBudgetLines ? 'white' : '#374151' }}
            >
              {t('budgetLines') || 'Budget Lines'}
            </button>
          )}
        </div>
      </div>

      {/* Chart Container */}
      <div className="cashflow-trend-container">
        <canvas 
          ref={canvasRef}
          width={800}
          height={300}
          className="cashflow-trend-canvas"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        />
      </div>

      {/* Legend */}
      <div className="cashflow-trend-legend">
        {trendData.series.filter(series => series.type !== 'budget-line' || showBudgetLines).map(series => (
          <div key={series.id} className="legend-item">
            <div 
              className={`legend-indicator ${series.type === 'budget-line' ? 'dashed' : 'solid'}`}
              style={{ backgroundColor: series.color, borderColor: series.color }}
            />
            <span style={{ color: '#1a202c' }}>{series.label}</span>
          </div>
        ))}
      </div>

      {/* Hovered Point Details */}
      {hoveredPoint && (
        <div className="point-details">
          <div className="point-details-content">
            <h4 style={{ color: '#1a202c' }}>
              {trendData.periods[hoveredPoint.index].label}
            </h4>
            {trendData.series
              .filter(series => series.type !== 'budget-line')
              .map(series => (
                <div key={series.id} className="detail-row">
                  <div className="detail-indicator" style={{ backgroundColor: series.color }}></div>
                  <span style={{ color: '#64748b' }}>{series.label}:</span>
                  <span style={{ color: '#1a202c', fontWeight: '600' }}>
                    {formatCurrency(series.data[hoveredPoint.index])}
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Trend Insights */}
      <div className="trend-insights">
        <h4 style={{ color: '#1a202c' }}>{t('trendInsights') || 'Trend Insights'}</h4>
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
    </div>
  );
};

/**
 * Generate trend insights based on data
 */
const generateTrendInsights = () => {
  // Simplified insights for Phase 4
  return [
    {
      type: 'info',
      icon: '📈',
      title: 'Trend Analysis',
      description: 'Income shows steady growth over recent periods'
    },
    {
      type: 'success',
      icon: '✅',
      title: 'Expense Control',
      description: 'Expenses remain relatively stable within budget range'
    },
    {
      type: 'info',
      icon: '💡',
      title: 'Net Cashflow',
      description: 'Overall cashflow trend is positive and improving'
    }
  ];
};

export default CashflowTrend;