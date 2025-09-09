import React, { useState, useEffect, useRef } from 'react';
import { useAnalytics } from '../AnalyticsMain';

/**
 * WaterfallChart Component
 * Shows cashflow waterfall from starting balance through income and expenses to ending balance
 * Follows BUILD_NEW_FEATURE_GUIDE.md compact design principles
 */
const WaterfallChart = ({ waterfallData, activeBudget, formatCurrency, selectedPeriod, onDrillDown }) => {
  const { t, analyticsService } = useAnalytics();
  const canvasRef = useRef(null);
  const [showBudgetOverlay, setShowBudgetOverlay] = useState(true);
  const [hoveredStep, setHoveredStep] = useState(null);
  const [selectedStep, setSelectedStep] = useState(null);
  const [drillDownData, setDrillDownData] = useState(null);
  const [showDrillDown, setShowDrillDown] = useState(false);

  // Draw chart when data changes
  useEffect(() => {
    if (waterfallData && canvasRef.current) {
      drawWaterfallChart();
    }
  }, [waterfallData, showBudgetOverlay]);

  /**
   * Draw the waterfall chart on canvas
   */
  const drawWaterfallChart = () => {
    const canvas = canvasRef.current;
    if (!canvas || !waterfallData) return;

    const ctx = canvas.getContext('2d');
    const { width, height } = canvas;
    
    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Chart dimensions
    const padding = { top: 40, right: 40, bottom: 80, left: 80 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    // Calculate value range
    const allValues = waterfallData.map(step => Math.abs(step.value));
    const maxValue = Math.max(...allValues, ...waterfallData.map(step => Math.abs(step.cumulative)));
    const scale = chartHeight / (maxValue * 1.2); // 20% padding

    // Draw grid and axes
    drawGrid(ctx, padding, chartWidth, chartHeight, maxValue);

    // Draw waterfall steps
    drawWaterfallSteps(ctx, padding, chartWidth, chartHeight, scale, maxValue);

    // Draw budget overlay if enabled
    if (showBudgetOverlay && activeBudget) {
      drawBudgetOverlay(ctx, padding, chartWidth, chartHeight, scale, maxValue);
    }

    // Draw labels
    drawLabels(ctx, padding, chartWidth, chartHeight);
  };

  /**
   * Draw grid lines and axes
   */
  const drawGrid = (ctx, padding, chartWidth, chartHeight, maxValue) => {
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

      // Y-axis labels
      const value = (maxValue * 1.2 / gridLines) * (gridLines - i);
      if (value !== 0) {
        ctx.fillStyle = '#64748b';
        ctx.font = '12px system-ui';
        ctx.textAlign = 'right';
        ctx.fillText(formatCurrency(value), padding.left - 10, y + 4);
      }
    }

    // Zero line (more prominent)
    const zeroY = padding.top + chartHeight;
    ctx.strokeStyle = '#374151';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(padding.left, zeroY);
    ctx.lineTo(padding.left + chartWidth, zeroY);
    ctx.stroke();

    // Negative area grid
    for (let i = 1; i <= 3; i++) {
      const y = padding.top + chartHeight + (chartHeight / 6) * i;
      ctx.strokeStyle = '#fef2f2';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(padding.left + chartWidth, y);
      ctx.stroke();

      // Negative Y-axis labels
      const value = -(maxValue * 1.2 / 6) * i;
      ctx.fillStyle = '#dc2626';
      ctx.font = '12px system-ui';
      ctx.textAlign = 'right';
      ctx.fillText(formatCurrency(value), padding.left - 10, y + 4);
    }
  };

  /**
   * Draw waterfall steps
   */
  const drawWaterfallSteps = (ctx, padding, chartWidth, chartHeight, scale, maxValue) => {
    if (!waterfallData || waterfallData.length === 0) return;

    const stepWidth = chartWidth / waterfallData.length;
    const barWidth = stepWidth * 0.6;
    const zeroY = padding.top + chartHeight;

    waterfallData.forEach((step, index) => {
      const x = padding.left + (stepWidth * index) + (stepWidth - barWidth) / 2;
      
      // Determine bar color and position
      let barColor, barY, barHeight;
      
      if (step.type === 'start' || step.type === 'end') {
        // Start and end bars show cumulative value
        barHeight = Math.abs(step.cumulative) * scale;
        barY = step.cumulative >= 0 ? zeroY - barHeight : zeroY;
        barColor = step.cumulative >= 0 ? '#3b82f6' : '#dc2626';
      } else {
        // Income/expense bars show the change
        barHeight = Math.abs(step.value) * scale;
        if (step.type === 'positive') {
          // Income - positive change
          const previousCumulative = index > 0 ? waterfallData[index - 1].cumulative : 0;
          barY = zeroY - previousCumulative * scale - barHeight;
          barColor = '#059669';
        } else {
          // Expenses - negative change
          const previousCumulative = index > 0 ? waterfallData[index - 1].cumulative : 0;
          barY = zeroY - previousCumulative * scale;
          barColor = '#dc2626';
        }
      }

      // Draw bar
      ctx.fillStyle = barColor;
      ctx.fillRect(x, barY, barWidth, barHeight);

      // Draw connecting line to previous bar (except for start)
      if (index > 0 && step.type !== 'start') {
        const prevStep = waterfallData[index - 1];
        const prevX = padding.left + (stepWidth * (index - 1)) + (stepWidth - barWidth) / 2 + barWidth;
        const prevY = zeroY - prevStep.cumulative * scale;
        const currentY = step.type === 'positive' ? barY : barY + barHeight;

        ctx.strokeStyle = '#9ca3af';
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(prevX, prevY);
        ctx.lineTo(x, currentY);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Draw value labels on bars
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px system-ui';
      ctx.textAlign = 'center';
      const labelY = barY + barHeight / 2 + 3;
      const labelText = step.type === 'start' || step.type === 'end' ? 
        formatCurrency(step.cumulative) : formatCurrency(Math.abs(step.value));
      ctx.fillText(labelText, x + barWidth / 2, labelY);

      // Highlight hovered step
      if (hoveredStep === index) {
        ctx.strokeStyle = '#1f2937';
        ctx.lineWidth = 2;
        ctx.strokeRect(x - 2, barY - 2, barWidth + 4, barHeight + 4);
      }
    });
  };

  /**
   * Draw budget overlay lines
   */
  const drawBudgetOverlay = (ctx, padding, chartWidth, chartHeight, scale, maxValue) => {
    ctx.setLineDash([8, 4]);
    ctx.lineWidth = 2;

    waterfallData.forEach((step, index) => {
      if (!step.budgetValue) return;

      const stepWidth = chartWidth / waterfallData.length;
      const barWidth = stepWidth * 0.6;
      const x = padding.left + (stepWidth * index) + (stepWidth - barWidth) / 2;
      const zeroY = padding.top + chartHeight;
      
      // Budget line position
      const budgetY = zeroY - step.budgetValue * scale;
      
      ctx.strokeStyle = '#f59e0b';
      ctx.beginPath();
      ctx.moveTo(x, budgetY);
      ctx.lineTo(x + barWidth, budgetY);
      ctx.stroke();

      // Budget value label
      ctx.fillStyle = '#f59e0b';
      ctx.font = '10px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText(formatCurrency(step.budgetValue), x + barWidth / 2, budgetY - 5);
    });

    ctx.setLineDash([]);
  };

  /**
   * Draw step labels
   */
  const drawLabels = (ctx, padding, chartWidth, chartHeight) => {
    const stepWidth = chartWidth / waterfallData.length;

    waterfallData.forEach((step, index) => {
      const x = padding.left + (stepWidth * index) + stepWidth / 2;
      const y = padding.top + chartHeight + 60;

      ctx.fillStyle = '#374151';
      ctx.font = '12px system-ui';
      ctx.textAlign = 'center';
      
      // Wrap long labels
      const words = step.label.split(' ');
      if (words.length > 2) {
        ctx.fillText(words.slice(0, 2).join(' '), x, y);
        ctx.fillText(words.slice(2).join(' '), x, y + 15);
      } else {
        ctx.fillText(step.label, x, y);
      }
    });
  };

  /**
   * Handle canvas mouse events
   */
  const handleMouseMove = (event) => {
    if (!waterfallData || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    
    // Determine which step is being hovered
    const padding = { left: 80 };
    const chartWidth = canvas.width - 80 - 40;
    const stepWidth = chartWidth / waterfallData.length;
    
    const stepIndex = Math.floor((x - padding.left) / stepWidth);
    
    if (stepIndex >= 0 && stepIndex < waterfallData.length) {
      setHoveredStep(stepIndex);
      // Change cursor to pointer for clickable steps
      canvas.style.cursor = waterfallData[stepIndex].type === 'positive' || waterfallData[stepIndex].type === 'negative' ? 'pointer' : 'default';
    } else {
      setHoveredStep(null);
      canvas.style.cursor = 'default';
    }
  };

  const handleMouseLeave = () => {
    setHoveredStep(null);
    if (canvasRef.current) {
      canvasRef.current.style.cursor = 'default';
    }
  };

  /**
   * Handle canvas click for drill-down
   */
  const handleCanvasClick = async (event) => {
    if (!waterfallData || !canvasRef.current || !analyticsService) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    
    const padding = { left: 80 };
    const chartWidth = canvas.width - 80 - 40;
    const stepWidth = chartWidth / waterfallData.length;
    
    const stepIndex = Math.floor((x - padding.left) / stepWidth);
    
    if (stepIndex >= 0 && stepIndex < waterfallData.length) {
      const step = waterfallData[stepIndex];
      
      // Only allow drill-down for income and expense steps
      if (step.type === 'positive' || step.type === 'negative') {
        setSelectedStep(stepIndex);
        await loadDrillDownData(step);
      }
    }
  };

  /**
   * Load detailed data for drill-down
   */
  const loadDrillDownData = async (step) => {
    try {
      setDrillDownData(null);
      setShowDrillDown(true);
      
      // Get detailed transaction data for the step
      const categoryFilter = step.type === 'positive' ? 'CAT_001' : 'CAT_002';
      
      const transactions = await analyticsService.getTransactionsForPeriod(
        selectedPeriod.startDate || '2024-01-01',
        selectedPeriod.endDate || '2024-12-31',
        'cash'
      );
      
      // Filter transactions for this category
      const stepTransactions = transactions.filter(t => t.categoryId === categoryFilter);
      
      // Group by subcategory
      const subcategoryBreakdown = groupTransactionsBySubcategory(stepTransactions);
      
      // Calculate budget comparison for each subcategory
      const subcategoriesWithBudget = subcategoryBreakdown.map(subcat => {
        const budgetItem = activeBudget?.lineItems.find(item => item.subcategoryId === subcat.subcategoryId);
        
        return {
          ...subcat,
          budgetAmount: budgetItem ? normalizeToMonthly(budgetItem.amount, budgetItem.period) : 0,
          hasBudget: !!budgetItem,
          variance: subcat.totalAmount - (budgetItem ? normalizeToMonthly(budgetItem.amount, budgetItem.period) : 0),
          adherence: budgetItem ? (subcat.totalAmount / normalizeToMonthly(budgetItem.amount, budgetItem.period)) * 100 : null
        };
      });
      
      setDrillDownData({
        step,
        stepIndex: selectedStep,
        totalTransactions: stepTransactions.length,
        subcategories: subcategoriesWithBudget,
        topTransactions: stepTransactions
          .sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount))
          .slice(0, 10),
        summary: {
          totalAmount: step.value,
          averageTransaction: stepTransactions.length > 0 ? Math.abs(step.value) / stepTransactions.length : 0,
          budgetTotal: subcategoriesWithBudget.reduce((sum, sub) => sum + sub.budgetAmount, 0),
          overBudgetCategories: subcategoriesWithBudget.filter(sub => sub.variance > 0).length,
          underBudgetCategories: subcategoriesWithBudget.filter(sub => sub.variance < 0 && sub.hasBudget).length
        }
      });
      
    } catch (error) {
      console.error('Error loading drill-down data:', error);
      setDrillDownData({ error: 'Failed to load detailed data' });
    }
  };

  /**
   * Group transactions by subcategory
   */
  const groupTransactionsBySubcategory = (transactions) => {
    const grouped = {};
    
    transactions.forEach(transaction => {
      const subcategoryId = transaction.subcategoryId || 'uncategorized';
      const subcategoryName = transaction.subcategoryName || 'Uncategorized';
      
      if (!grouped[subcategoryId]) {
        grouped[subcategoryId] = {
          subcategoryId,
          subcategoryName,
          totalAmount: 0,
          transactionCount: 0,
          transactions: []
        };
      }
      
      grouped[subcategoryId].totalAmount += Math.abs(transaction.amount);
      grouped[subcategoryId].transactionCount++;
      grouped[subcategoryId].transactions.push(transaction);
    });
    
    return Object.values(grouped).sort((a, b) => b.totalAmount - a.totalAmount);
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
   * Close drill-down panel
   */
  const closeDrillDown = () => {
    setShowDrillDown(false);
    setSelectedStep(null);
    setDrillDownData(null);
  };

  /**
   * Toggle budget overlay
   */
  const toggleBudgetOverlay = () => {
    setShowBudgetOverlay(!showBudgetOverlay);
  };

  if (!waterfallData || waterfallData.length === 0) {
    return (
      <div className="waterfall-chart-loading">
        <div className="loading-content">
          <div className="loading-spinner"></div>
          <p>Loading waterfall data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="waterfall-chart">
      {/* Header */}
      <div className="waterfall-chart-header">
        <div className="header-title">
          <h3 style={{ color: '#1a202c' }}>Cashflow Waterfall</h3>
          <p style={{ color: '#64748b' }}>
            Visual flow from starting balance through income and expenses to ending balance
          </p>
        </div>
        
        <div className="header-controls">
          {activeBudget && (
            <button 
              onClick={toggleBudgetOverlay}
              className={`btn-toggle ${showBudgetOverlay ? 'active' : ''}`}
              style={{ color: showBudgetOverlay ? 'white' : '#374151' }}
            >
              Budget Overlay
            </button>
          )}
        </div>
      </div>

      {/* Chart Container */}
      <div className="waterfall-chart-container">
        <canvas 
          ref={canvasRef}
          width={800}
          height={400}
          className="waterfall-canvas"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          onClick={handleCanvasClick}
        />
      </div>

      {/* Legend */}
      <div className="waterfall-legend">
        <div className="legend-item">
          <div className="legend-color income"></div>
          <span style={{ color: '#1a202c' }}>Income</span>
        </div>
        <div className="legend-item">
          <div className="legend-color expenses"></div>
          <span style={{ color: '#1a202c' }}>Expenses</span>
        </div>
        <div className="legend-item">
          <div className="legend-color balance"></div>
          <span style={{ color: '#1a202c' }}>Balance</span>
        </div>
        {activeBudget && showBudgetOverlay && (
          <div className="legend-item">
            <div className="legend-line budget"></div>
            <span style={{ color: '#1a202c' }}>Budget Line</span>
          </div>
        )}
      </div>

      {/* Hovered Step Details */}
      {hoveredStep !== null && waterfallData[hoveredStep] && (
        <div className="step-details">
          <div className="step-details-content">
            <h4 style={{ color: '#1a202c' }}>{waterfallData[hoveredStep].label}</h4>
            <div className="detail-row">
              <span style={{ color: '#64748b' }}>
                {waterfallData[hoveredStep].type === 'start' || waterfallData[hoveredStep].type === 'end' ? 
                  'Cumulative Value' : 
                  'Change Amount'}:
              </span>
              <span style={{ color: '#1a202c', fontWeight: '600' }}>
                {waterfallData[hoveredStep].type === 'start' || waterfallData[hoveredStep].type === 'end' ?
                  formatCurrency(waterfallData[hoveredStep].cumulative) :
                  formatCurrency(waterfallData[hoveredStep].value)}
              </span>
            </div>
            {waterfallData[hoveredStep].budgetValue && (
              <div className="detail-row">
                <span style={{ color: '#64748b' }}>Budgeted Amount:</span>
                <span style={{ color: '#f59e0b', fontWeight: '600' }}>
                  {formatCurrency(waterfallData[hoveredStep].budgetValue)}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Drill-Down Panel */}
      {showDrillDown && (
        <div className="drill-down-overlay">
          <div className="drill-down-panel">
            <div className="drill-down-header">
              <div className="header-title">
                <h3>{drillDownData?.step?.label || 'Transaction Details'}</h3>
                <p>
                  {drillDownData?.step?.type === 'positive' ? 
                    'Income breakdown and analysis' :
                    'Expense breakdown and analysis'
                  }
                </p>
              </div>
              <button onClick={closeDrillDown} className="close-button">
                ×
              </button>
            </div>

            {drillDownData && !drillDownData.error ? (
              <div className="drill-down-content">
                {/* Summary Statistics */}
                <div className="drill-down-summary">
                  <div className="summary-cards">
                    <div className="summary-card">
                      <div className="card-label">Total Amount</div>
                      <div className="card-value">{formatCurrency(drillDownData.summary.totalAmount)}</div>
                    </div>
                    <div className="summary-card">
                      <div className="card-label">Transactions</div>
                      <div className="card-value">{drillDownData.totalTransactions}</div>
                    </div>
                    <div className="summary-card">
                      <div className="card-label">Average</div>
                      <div className="card-value">{formatCurrency(drillDownData.summary.averageTransaction)}</div>
                    </div>
                    {activeBudget && (
                      <>
                        <div className="summary-card">
                          <div className="card-label">Budget Total</div>
                          <div className="card-value">{formatCurrency(drillDownData.summary.budgetTotal)}</div>
                        </div>
                        <div className="summary-card">
                          <div className="card-label">Over Budget</div>
                          <div className="card-value">{drillDownData.summary.overBudgetCategories}</div>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Category Breakdown */}
                <div className="drill-down-categories">
                  <div className="section-header">
                    <h4>Category Breakdown</h4>
                  </div>
                  
                  <div className="categories-grid">
                    {drillDownData.subcategories.slice(0, 8).map((category, index) => (
                      <div key={index} className={`category-card ${category.variance > 0 ? 'over-budget' : 'under-budget'}`}>
                        <div className="category-header">
                          <div className="category-name">{category.subcategoryName}</div>
                          <div className="category-amount">{formatCurrency(category.totalAmount)}</div>
                        </div>
                        
                        <div className="category-details">
                          <div className="detail-row">
                            <span>Transactions:</span>
                            <span>{category.transactionCount}</span>
                          </div>
                          
                          {category.hasBudget && (
                            <>
                              <div className="detail-row">
                                <span>Budgeted:</span>
                                <span>{formatCurrency(category.budgetAmount)}</span>
                              </div>
                              <div className="detail-row">
                                <span>Variance:</span>
                                <span className={category.variance >= 0 ? 'negative' : 'positive'}>
                                  {category.variance >= 0 ? '+' : ''}{formatCurrency(category.variance)}
                                </span>
                              </div>
                              <div className="detail-row">
                                <span>Adherence:</span>
                                <span className={category.adherence <= 100 ? 'positive' : 'negative'}>
                                  {category.adherence?.toFixed(1) || '0'}%
                                </span>
                              </div>
                            </>
                          )}
                        </div>
                        
                        {category.hasBudget && (
                          <div className="category-progress">
                            <div className="progress-bar">
                              <div 
                                className={`progress-fill ${category.adherence <= 100 ? 'good' : 'over'}`}
                                style={{ width: `${Math.min(category.adherence || 0, 100)}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  
                  {drillDownData.subcategories.length > 8 && (
                    <div className="more-categories">
                      +{drillDownData.subcategories.length - 8} more categories
                    </div>
                  )}
                </div>

                {/* Top Transactions */}
                <div className="drill-down-transactions">
                  <div className="section-header">
                    <h4>Top Transactions</h4>
                  </div>
                  
                  <div className="transactions-table">
                    <div className="table-header">
                      <div className="col-date">Date</div>
                      <div className="col-description">Description</div>
                      <div className="col-category">Category</div>
                      <div className="col-amount">Amount</div>
                    </div>
                    
                    <div className="table-body">
                      {drillDownData.topTransactions.map((transaction, index) => (
                        <div key={index} className="table-row">
                          <div className="col-date">
                            {new Date(transaction.date).toLocaleDateString()}
                          </div>
                          <div className="col-description">
                            {transaction.description || 'No description'}
                          </div>
                          <div className="col-category">
                            {transaction.subcategoryName || 'Uncategorized'}
                          </div>
                          <div className={`col-amount ${transaction.categoryId === 'CAT_001' ? 'income' : 'expense'}`}>
                            {formatCurrency(Math.abs(transaction.amount))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ) : drillDownData?.error ? (
              <div className="drill-down-error">
                <p>{drillDownData.error}</p>
              </div>
            ) : (
              <div className="drill-down-loading">
                <div className="loading-spinner"></div>
                <p>Loading details...</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default WaterfallChart;