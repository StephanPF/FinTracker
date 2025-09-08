import React, { useState, useEffect, useRef } from 'react';

/**
 * NetWorthChart Component
 * Shows net worth evolution over time with multiple data series
 * Uses HTML5 Canvas for rendering (following the established pattern)
 */
const NetWorthChart = ({ snapshots, formatAmount, currencies, selectedCurrency = 'base' }) => {
  const canvasRef = useRef(null);
  const [hoveredPoint, setHoveredPoint] = useState(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [visibleSeries, setVisibleSeries] = useState({
    totalAssets: true,
    totalLiabilities: true,
    netAssets: true,
    totalRetirement: true
  });
  const [chartData, setChartData] = useState(null);

  // Generate chart data when snapshots change
  useEffect(() => {
    if (snapshots && snapshots.length > 0) {
      generateChartData();
    }
  }, [snapshots, selectedCurrency]);

  // Draw chart when data or visibility changes
  useEffect(() => {
    if (chartData && canvasRef.current) {
      drawChart();
    }
  }, [chartData, visibleSeries, hoveredPoint]);

  /**
   * Generate chart data from snapshots
   */
  const generateChartData = () => {
    if (!snapshots || snapshots.length === 0) return;

    // Sort snapshots by date (oldest first for chart)
    const sortedSnapshots = [...snapshots].sort((a, b) => 
      new Date(a.snapshotDate) - new Date(b.snapshotDate)
    );

    // Prepare time labels
    const timeLabels = sortedSnapshots.map(snapshot => {
      const date = new Date(snapshot.snapshotDate);
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        year: snapshots.length > 6 ? '2-digit' : 'numeric'
      });
    });

    // Prepare data series
    const series = [
      {
        id: 'totalAssets',
        label: 'Total Assets',
        color: '#059669',
        data: sortedSnapshots.map(s => s.totalAssets),
        lineWidth: 2
      },
      {
        id: 'totalLiabilities',
        label: 'Total Liabilities',
        color: '#dc2626',
        data: sortedSnapshots.map(s => s.totalLiabilities),
        lineWidth: 2
      },
      {
        id: 'netAssets',
        label: 'Net Worth',
        color: '#3b82f6',
        data: sortedSnapshots.map(s => s.netAssets),
        lineWidth: 3
      },
      {
        id: 'totalRetirement',
        label: 'Retirement Assets',
        color: '#7c3aed',
        data: sortedSnapshots.map(s => s.totalRetirement),
        lineWidth: 2
      }
    ];

    // Calculate data range
    const allValues = series.flatMap(s => s.data);
    const maxValue = Math.max(...allValues);
    const minValue = Math.min(...allValues, 0); // Include zero in range

    setChartData({
      timeLabels,
      series,
      snapshots: sortedSnapshots,
      maxValue,
      minValue,
      range: maxValue - minValue
    });
  };

  /**
   * Draw the complete chart
   */
  const drawChart = () => {
    const canvas = canvasRef.current;
    if (!canvas || !chartData) return;

    const ctx = canvas.getContext('2d');
    const { width, height } = canvas;
    
    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Chart dimensions
    const padding = { top: 30, right: 30, bottom: 80, left: 100 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    // Draw background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    // Draw grid and axes
    drawGrid(ctx, padding, chartWidth, chartHeight);

    // Draw zero line if needed
    if (chartData.minValue < 0) {
      drawZeroLine(ctx, padding, chartWidth, chartHeight);
    }

    // Draw data series
    drawDataSeries(ctx, padding, chartWidth, chartHeight);

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
    const gridLines = 6;
    for (let i = 0; i <= gridLines; i++) {
      const y = padding.top + (chartHeight / gridLines) * i;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(padding.left + chartWidth, y);
      ctx.stroke();
    }

    // Vertical grid lines
    const timePoints = chartData.timeLabels.length;
    for (let i = 0; i < timePoints; i++) {
      const x = padding.left + (chartWidth / Math.max(1, timePoints - 1)) * i;
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
    const zeroY = padding.top + chartHeight - ((-chartData.minValue) / chartData.range) * chartHeight;

    ctx.strokeStyle = '#6b7280';
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 3]);
    ctx.beginPath();
    ctx.moveTo(padding.left, zeroY);
    ctx.lineTo(padding.left + chartWidth, zeroY);
    ctx.stroke();
    ctx.setLineDash([]); // Reset dash pattern

    // Zero label
    ctx.fillStyle = '#6b7280';
    ctx.font = '12px system-ui';
    ctx.textAlign = 'right';
    ctx.fillText('0', padding.left - 10, zeroY + 4);
  };

  /**
   * Draw data series lines
   */
  const drawDataSeries = (ctx, padding, chartWidth, chartHeight) => {
    const timePoints = chartData.timeLabels.length;
    if (timePoints < 2) return;

    chartData.series.forEach(series => {
      if (!visibleSeries[series.id]) return;

      ctx.strokeStyle = series.color;
      ctx.lineWidth = series.lineWidth;
      ctx.setLineDash([]);

      ctx.beginPath();
      series.data.forEach((value, index) => {
        const x = padding.left + (chartWidth / Math.max(1, timePoints - 1)) * index;
        const y = padding.top + chartHeight - ((value - chartData.minValue) / chartData.range) * chartHeight;

        if (index === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });
      ctx.stroke();
    });
  };

  /**
   * Draw data points
   */
  const drawDataPoints = (ctx, padding, chartWidth, chartHeight) => {
    const timePoints = chartData.timeLabels.length;

    chartData.series.forEach(series => {
      if (!visibleSeries[series.id]) return;

      ctx.fillStyle = series.color;
      series.data.forEach((value, index) => {
        const x = padding.left + (chartWidth / Math.max(1, timePoints - 1)) * index;
        const y = padding.top + chartHeight - ((value - chartData.minValue) / chartData.range) * chartHeight;
        
        // Draw point
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, 2 * Math.PI);
        ctx.fill();

        // Highlight hovered point
        if (hoveredPoint && hoveredPoint.seriesId === series.id && hoveredPoint.index === index) {
          ctx.strokeStyle = '#1f2937';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(x, y, 7, 0, 2 * Math.PI);
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

    // X-axis labels (dates)
    ctx.textAlign = 'center';
    chartData.timeLabels.forEach((label, index) => {
      const timePoints = chartData.timeLabels.length;
      const x = padding.left + (chartWidth / Math.max(1, timePoints - 1)) * index;
      const y = padding.top + chartHeight + 20;
      ctx.fillText(label, x, y);
    });

    // Y-axis labels (values)
    ctx.textAlign = 'right';
    const gridLines = 6;
    for (let i = 0; i <= gridLines; i++) {
      const value = chartData.minValue + (chartData.range / gridLines) * (gridLines - i);
      const y = padding.top + (chartHeight / gridLines) * i + 4;
      if (Math.abs(value) > 0.01) { // Avoid showing tiny values near zero
        const currency = currencies.find(c => c.id === chartData.snapshots[0]?.baseCurrencyId);
        const formattedValue = currency ? 
          `${currency.symbol}${Math.round(value).toLocaleString()}` : 
          Math.round(value).toLocaleString();
        ctx.fillText(formattedValue, padding.left - 10, y);
      }
    }

    // Chart title
    ctx.textAlign = 'center';
    ctx.font = 'bold 16px system-ui';
    ctx.fillStyle = '#1a202c';
    ctx.fillText('Net Worth View Over Time', padding.left + chartWidth / 2, 20);
  };

  /**
   * Handle mouse events for interactivity
   */
  const handleMouseMove = (event) => {
    if (!chartData || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    // Update mouse position for tooltip
    setMousePosition({ x: event.clientX, y: event.clientY });
    
    // Chart dimensions
    const padding = { left: 100, top: 30 };
    const chartWidth = canvas.width - 100 - 30;
    const chartHeight = canvas.height - 30 - 80;
    const timePoints = chartData.timeLabels.length;
    
    // Find nearest time point
    let timeIndex = -1;
    if (timePoints > 1) {
      timeIndex = Math.round((x - padding.left) / (chartWidth / (timePoints - 1)));
    } else if (timePoints === 1) {
      timeIndex = 0;
    }
    
    if (timeIndex >= 0 && timeIndex < timePoints) {
      // Find which series point is closest to the mouse
      let closestPoint = null;
      let closestDistance = Infinity;
      
      chartData.series.forEach(series => {
        if (!visibleSeries[series.id]) return;
        
        const pointX = padding.left + (timePoints > 1 ? (chartWidth / (timePoints - 1)) * timeIndex : chartWidth / 2);
        const pointY = padding.top + chartHeight - ((series.data[timeIndex] - chartData.minValue) / chartData.range) * chartHeight;
        
        const distance = Math.sqrt((x - pointX) ** 2 + (y - pointY) ** 2);
        
        if (distance < 25 && distance < closestDistance) {
          closestDistance = distance;
          closestPoint = { seriesId: series.id, index: timeIndex };
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
   * Toggle series visibility
   */
  const toggleSeries = (seriesId) => {
    setVisibleSeries(prev => ({
      ...prev,
      [seriesId]: !prev[seriesId]
    }));
  };

  if (!chartData) {
    return (
      <div className="networth-chart-loading">
        <p>Loading chart data...</p>
      </div>
    );
  }

  if (chartData.snapshots.length < 2) {
    return (
      <div className="networth-chart-insufficient">
        <p>Need at least 2 snapshots to display trend chart.</p>
        <p>Save more snapshots over time to see your net worth evolution.</p>
      </div>
    );
  }

  return (
    <div className="networth-chart">
      {/* Chart Container */}
      <div className="chart-container">
        <canvas 
          ref={canvasRef}
          width={900}
          height={400}
          className="networth-chart-canvas"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        />
      </div>

      {/* Legend with Toggle Controls */}
      <div className="chart-legend">
        {chartData.series.map(series => (
          <div key={series.id} className="legend-item">
            <button 
              className={`legend-toggle ${visibleSeries[series.id] ? 'active' : 'inactive'}`}
              onClick={() => toggleSeries(series.id)}
              style={{
                opacity: visibleSeries[series.id] ? 1 : 0.5,
                borderColor: series.color,
                backgroundColor: visibleSeries[series.id] ? series.color : 'transparent'
              }}
            >
              <div 
                className="legend-indicator"
                style={{ backgroundColor: series.color }}
              />
              <span style={{ 
                color: visibleSeries[series.id] ? 'white' : series.color,
                fontWeight: visibleSeries[series.id] ? '600' : '400'
              }}>
                {series.label}
              </span>
            </button>
          </div>
        ))}
      </div>

      {/* Hovered Point Details */}
      {hoveredPoint && (
        <div 
          className="chart-tooltip"
          style={{
            left: mousePosition.x + 15,
            top: mousePosition.y - 10
          }}
        >
          <div className="tooltip-content">
            <h4>{chartData.timeLabels[hoveredPoint.index]}</h4>
            <div className="tooltip-date">
              {new Date(chartData.snapshots[hoveredPoint.index].snapshotDate).toLocaleDateString()}
            </div>
            {chartData.series
              .filter(series => visibleSeries[series.id])
              .map(series => (
                <div key={series.id} className="tooltip-row">
                  <div className="tooltip-indicator" style={{ backgroundColor: series.color }}></div>
                  <span className="tooltip-label">{series.label}:</span>
                  <span className="tooltip-value">
                    {formatAmount(series.data[hoveredPoint.index], chartData.snapshots[hoveredPoint.index].baseCurrencyId)}
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Chart Insights */}
      <div className="chart-insights">
        <h4>📊 Insights</h4>
        <div className="insights-grid">
          {generateInsights(chartData, visibleSeries, formatAmount, currencies).map((insight, index) => (
            <div key={index} className={`insight-card ${insight.type}`}>
              <div className="insight-icon">{insight.icon}</div>
              <div className="insight-content">
                <div className="insight-title">{insight.title}</div>
                <div className="insight-value">{insight.value}</div>
                <div className="insight-description">{insight.description}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

/**
 * Generate insights from chart data
 */
const generateInsights = (chartData, visibleSeries, formatAmount, currencies) => {
  const insights = [];
  const snapshots = chartData.snapshots;
  const latest = snapshots[snapshots.length - 1];
  const oldest = snapshots[0];

  if (snapshots.length < 2) return insights;

  // Net worth growth
  if (visibleSeries.netAssets) {
    const netWorthChange = latest.netAssets - oldest.netAssets;
    const isPositive = netWorthChange >= 0;
    insights.push({
      type: isPositive ? 'success' : 'warning',
      icon: isPositive ? '📈' : '📉',
      title: 'Net Worth Change',
      value: `${isPositive ? '+' : ''}${formatAmount(netWorthChange, latest.baseCurrencyId)}`,
      description: `Since ${oldest.snapshotDate}`
    });
  }

  // Asset growth
  if (visibleSeries.totalAssets) {
    const assetChange = latest.totalAssets - oldest.totalAssets;
    const assetGrowthRate = ((assetChange / oldest.totalAssets) * 100).toFixed(1);
    insights.push({
      type: assetChange >= 0 ? 'info' : 'warning',
      icon: '💰',
      title: 'Asset Growth',
      value: `${assetGrowthRate}%`,
      description: `Total assets ${assetChange >= 0 ? 'increased' : 'decreased'}`
    });
  }

  // Retirement savings progress
  if (visibleSeries.totalRetirement) {
    const retirementChange = latest.totalRetirement - oldest.totalRetirement;
    const retirementGrowthRate = oldest.totalRetirement > 0 ? 
      ((retirementChange / oldest.totalRetirement) * 100).toFixed(1) : 
      '∞';
    insights.push({
      type: 'info',
      icon: '🏦',
      title: 'Retirement Growth',
      value: retirementGrowthRate !== '∞' ? `${retirementGrowthRate}%` : 'New',
      description: 'Retirement savings progress'
    });
  }

  return insights;
};

export default NetWorthChart;