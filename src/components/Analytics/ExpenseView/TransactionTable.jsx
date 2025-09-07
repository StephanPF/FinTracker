import React, { useState, useEffect } from 'react';
import { useAnalytics } from '../AnalyticsMain';

/**
 * TransactionTable Component
 * Enhanced transaction display with budget impact analysis
 * Follows BUILD_NEW_FEATURE_GUIDE.md compact design principles
 */
const TransactionTable = ({ expenseData, activeBudget, formatCurrency }) => {
  const { t, analyticsService, dateRange } = useAnalytics();
  const [transactions, setTransactions] = useState([]);
  const [filteredTransactions, setFilteredTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortConfig, setSortConfig] = useState({ key: 'amount', direction: 'desc' });
  const [filterConfig, setFilterConfig] = useState({
    subcategory: '',
    budgetStatus: 'all', // all, over-budget, under-budget, no-budget
    minAmount: '',
    maxAmount: ''
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);

  // Load transactions when component mounts or date range changes
  useEffect(() => {
    loadTransactions();
  }, [analyticsService, dateRange]);

  // Apply filters and sorting when data or configs change
  useEffect(() => {
    applyFiltersAndSort();
  }, [transactions, filterConfig, sortConfig]);

  /**
   * Load expense transactions with budget context
   */
  const loadTransactions = async () => {
    if (!analyticsService) return;

    try {
      setLoading(true);
      
      // Get raw transaction data for the period
      const rawTransactions = analyticsService.getTransactionsForPeriod(
        dateRange.startDate,
        dateRange.endDate,
        'cash'
      );

      // Filter to expenses only and enrich with budget context
      const expenseTransactions = rawTransactions
        .filter(t => (t.categoryId || t.transactionTypeId) === 'CAT_002')
        .map(transaction => enrichTransactionWithBudgetContext(transaction));

      // Sort by amount descending by default
      const sortedTransactions = expenseTransactions.sort((a, b) => 
        Math.abs(b.amount) - Math.abs(a.amount)
      );

      setTransactions(sortedTransactions);
    } catch (error) {
      console.error('Error loading transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Enrich transaction with budget impact analysis
   */
  const enrichTransactionWithBudgetContext = (transaction) => {
    let budgetImpact = null;
    
    if (activeBudget && expenseData) {
      const subcategoryData = expenseData.find(
        cat => cat.subcategoryId === transaction.subcategoryId
      );
      
      if (subcategoryData && subcategoryData.hasBudget) {
        const transactionAmount = Math.abs(transaction.amount);
        const isOverBudget = subcategoryData.variance > 0;
        const remainingBudget = Math.max(0, subcategoryData.budgetAmount - subcategoryData.actualSpent);
        
        // Determine if this transaction pushes category over budget
        const wouldCauseOverrun = !isOverBudget && transactionAmount > remainingBudget;
        
        budgetImpact = {
          hasBudget: true,
          budgetAmount: subcategoryData.budgetAmount,
          currentSpent: subcategoryData.actualSpent,
          remainingBudget,
          isOverBudget,
          wouldCauseOverrun,
          variance: subcategoryData.variance,
          variancePercentage: subcategoryData.variancePercentage,
          impactDescription: getImpactDescription(
            transactionAmount, 
            remainingBudget, 
            isOverBudget, 
            wouldCauseOverrun
          )
        };
      }
    }

    return {
      ...transaction,
      budgetImpact,
      subcategoryName: getSubcategoryName(transaction.subcategoryId),
      displayAmount: Math.abs(transaction.amount)
    };
  };

  /**
   * Generate impact description for budget context
   */
  const getImpactDescription = (amount, remaining, isOverBudget, wouldCauseOverrun) => {
    if (isOverBudget) {
      return t('contributesToOverrun') || 'Contributes to budget overrun';
    } else if (wouldCauseOverrun) {
      return t('causesOverrun') || 'Causes budget overrun';
    } else if (remaining < amount * 2) {
      return t('nearBudgetLimit') || 'Near budget limit';
    } else {
      return t('withinBudget') || 'Within budget';
    }
  };

  /**
   * Get subcategory name from ID
   */
  const getSubcategoryName = (subcategoryId) => {
    if (!analyticsService) return 'Unknown';
    return analyticsService.getSubcategoryName(subcategoryId);
  };

  /**
   * Apply filters and sorting to transactions
   */
  const applyFiltersAndSort = () => {
    let filtered = [...transactions];

    // Apply subcategory filter
    if (filterConfig.subcategory) {
      filtered = filtered.filter(t => t.subcategoryId === filterConfig.subcategory);
    }

    // Apply budget status filter
    if (filterConfig.budgetStatus !== 'all') {
      filtered = filtered.filter(t => {
        switch (filterConfig.budgetStatus) {
          case 'over-budget':
            return t.budgetImpact && t.budgetImpact.isOverBudget;
          case 'under-budget':
            return t.budgetImpact && !t.budgetImpact.isOverBudget;
          case 'no-budget':
            return !t.budgetImpact;
          default:
            return true;
        }
      });
    }

    // Apply amount range filters
    if (filterConfig.minAmount) {
      const minAmount = parseFloat(filterConfig.minAmount);
      filtered = filtered.filter(t => t.displayAmount >= minAmount);
    }
    
    if (filterConfig.maxAmount) {
      const maxAmount = parseFloat(filterConfig.maxAmount);
      filtered = filtered.filter(t => t.displayAmount <= maxAmount);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue, bValue;
      
      switch (sortConfig.key) {
        case 'date':
          aValue = new Date(a.date);
          bValue = new Date(b.date);
          break;
        case 'amount':
          aValue = a.displayAmount;
          bValue = b.displayAmount;
          break;
        case 'subcategory':
          aValue = a.subcategoryName.toLowerCase();
          bValue = b.subcategoryName.toLowerCase();
          break;
        case 'budgetVariance':
          aValue = a.budgetImpact?.variance || 0;
          bValue = b.budgetImpact?.variance || 0;
          break;
        default:
          aValue = a[sortConfig.key];
          bValue = b[sortConfig.key];
      }

      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });

    setFilteredTransactions(filtered);
    setCurrentPage(1); // Reset to first page when filters change
  };

  /**
   * Handle sorting
   */
  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  /**
   * Handle filter changes
   */
  const handleFilterChange = (field, value) => {
    setFilterConfig(prev => ({
      ...prev,
      [field]: value
    }));
  };

  /**
   * Get unique subcategories for filter dropdown
   */
  const getUniqueSubcategories = () => {
    const unique = new Set();
    transactions.forEach(t => {
      if (t.subcategoryId) {
        unique.add(t.subcategoryId);
      }
    });
    
    return Array.from(unique).map(id => ({
      id,
      name: getSubcategoryName(id)
    })).sort((a, b) => a.name.localeCompare(b.name));
  };

  /**
   * Get paginated transactions
   */
  const getPaginatedTransactions = () => {
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return filteredTransactions.slice(startIndex, endIndex);
  };

  /**
   * Get total pages
   */
  const getTotalPages = () => {
    return Math.ceil(filteredTransactions.length / pageSize);
  };

  if (loading) {
    return (
      <div className="transaction-table-loading">
        <div className="loading-content">
          <div className="loading-spinner"></div>
          <p>{t('loadingTransactions') || 'Loading transactions...'}</p>
        </div>
      </div>
    );
  }

  const paginatedTransactions = getPaginatedTransactions();
  const totalPages = getTotalPages();

  return (
    <div className="transaction-table">
      {/* Header */}
      <div className="transaction-table-header">
        <div className="header-title">
          <h3 style={{ color: '#1a202c' }}>{t('topTransactions') || 'Top Transactions'}</h3>
          <p style={{ color: '#64748b' }}>
            {t('transactionTableDescription') || 'Largest transactions with budget impact analysis'}
          </p>
        </div>
        
        <div className="header-stats">
          <span style={{ color: '#64748b' }}>
            {filteredTransactions.length} {t('transactions') || 'transactions'}
          </span>
        </div>
      </div>

      {/* Filters */}
      <div className="transaction-filters">
        <div className="filter-row">
          <div className="filter-group">
            <label style={{ color: '#64748b' }}>{t('subcategory') || 'Subcategory'}:</label>
            <select
              value={filterConfig.subcategory}
              onChange={(e) => handleFilterChange('subcategory', e.target.value)}
              className="filter-select"
            >
              <option value="">{t('allSubcategories') || 'All Subcategories'}</option>
              {getUniqueSubcategories().map(sub => (
                <option key={sub.id} value={sub.id}>{sub.name}</option>
              ))}
            </select>
          </div>

          {activeBudget && (
            <div className="filter-group">
              <label style={{ color: '#64748b' }}>{t('budgetStatus') || 'Budget Status'}:</label>
              <select
                value={filterConfig.budgetStatus}
                onChange={(e) => handleFilterChange('budgetStatus', e.target.value)}
                className="filter-select"
              >
                <option value="all">{t('allStatuses') || 'All'}</option>
                <option value="over-budget">{t('overBudget') || 'Over Budget'}</option>
                <option value="under-budget">{t('underBudget') || 'Under Budget'}</option>
                <option value="no-budget">{t('noBudget') || 'No Budget'}</option>
              </select>
            </div>
          )}

          <div className="filter-group">
            <label style={{ color: '#64748b' }}>{t('amountRange') || 'Amount Range'}:</label>
            <div className="amount-range">
              <input
                type="number"
                placeholder={t('min') || 'Min'}
                value={filterConfig.minAmount}
                onChange={(e) => handleFilterChange('minAmount', e.target.value)}
                className="filter-input"
                onWheel={(e) => e.target.blur()}
              />
              <span>-</span>
              <input
                type="number"
                placeholder={t('max') || 'Max'}
                value={filterConfig.maxAmount}
                onChange={(e) => handleFilterChange('maxAmount', e.target.value)}
                className="filter-input"
                onWheel={(e) => e.target.blur()}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="transaction-table-container">
        <table className="transaction-table-content">
          <thead>
            <tr>
              <th onClick={() => handleSort('date')} className="sortable">
                {t('date') || 'Date'}
                {sortConfig.key === 'date' && (
                  <span className="sort-indicator">
                    {sortConfig.direction === 'asc' ? '↑' : '↓'}
                  </span>
                )}
              </th>
              <th onClick={() => handleSort('description')} className="sortable">
                {t('description') || 'Description'}
                {sortConfig.key === 'description' && (
                  <span className="sort-indicator">
                    {sortConfig.direction === 'asc' ? '↑' : '↓'}
                  </span>
                )}
              </th>
              <th onClick={() => handleSort('subcategory')} className="sortable">
                {t('subcategory') || 'Subcategory'}
                {sortConfig.key === 'subcategory' && (
                  <span className="sort-indicator">
                    {sortConfig.direction === 'asc' ? '↑' : '↓'}
                  </span>
                )}
              </th>
              <th onClick={() => handleSort('amount')} className="sortable amount-col">
                {t('amount') || 'Amount'}
                {sortConfig.key === 'amount' && (
                  <span className="sort-indicator">
                    {sortConfig.direction === 'asc' ? '↑' : '↓'}
                  </span>
                )}
              </th>
              {activeBudget && (
                <th onClick={() => handleSort('budgetVariance')} className="sortable">
                  {t('budgetImpact') || 'Budget Impact'}
                  {sortConfig.key === 'budgetVariance' && (
                    <span className="sort-indicator">
                      {sortConfig.direction === 'asc' ? '↑' : '↓'}
                    </span>
                  )}
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {paginatedTransactions.map((transaction, index) => (
              <tr key={transaction.id || index} className="transaction-row">
                <td className="date-col" style={{ color: '#64748b' }}>
                  {new Date(transaction.date).toLocaleDateString()}
                </td>
                <td className="description-col" style={{ color: '#1a202c' }}>
                  <div className="description-content">
                    <span className="description-text">
                      {transaction.description || t('noDescription') || 'No description'}
                    </span>
                  </div>
                </td>
                <td className="subcategory-col" style={{ color: '#64748b' }}>
                  {transaction.subcategoryName}
                </td>
                <td className="amount-col" style={{ color: '#1a202c', fontWeight: '600' }}>
                  {formatCurrency(transaction.displayAmount)}
                </td>
                {activeBudget && (
                  <td className="budget-impact-col">
                    {transaction.budgetImpact ? (
                      <div className={`budget-impact ${getBudgetImpactClass(transaction.budgetImpact)}`}>
                        <div className="impact-status">
                          <span className="impact-icon">
                            {getBudgetImpactIcon(transaction.budgetImpact)}
                          </span>
                          <span className="impact-text" style={{ color: getBudgetImpactColor(transaction.budgetImpact) }}>
                            {transaction.budgetImpact.impactDescription}
                          </span>
                        </div>
                        <div className="impact-details" style={{ color: '#64748b' }}>
                          {formatCurrency(Math.abs(transaction.budgetImpact.variance))} 
                          {transaction.budgetImpact.isOverBudget ? ` ${t('over') || 'over'}` : ` ${t('under') || 'under'}`}
                        </div>
                      </div>
                    ) : (
                      <span style={{ color: '#9ca3af' }}>{t('noBudget') || 'No budget'}</span>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="transaction-pagination">
          <div className="pagination-info">
            <span style={{ color: '#64748b' }}>
              {t('showing') || 'Showing'} {((currentPage - 1) * pageSize) + 1}-{Math.min(currentPage * pageSize, filteredTransactions.length)} 
              {' '}{t('of') || 'of'} {filteredTransactions.length}
            </span>
          </div>
          <div className="pagination-controls">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="pagination-btn"
            >
              {t('previous') || 'Previous'}
            </button>
            
            <span className="page-info" style={{ color: '#64748b' }}>
              {t('page') || 'Page'} {currentPage} {t('of') || 'of'} {totalPages}
            </span>
            
            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="pagination-btn"
            >
              {t('next') || 'Next'}
            </button>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && filteredTransactions.length === 0 && (
        <div className="transaction-table-empty">
          <div className="empty-content">
            <span className="empty-icon">📄</span>
            <h4 style={{ color: '#1a202c' }}>{t('noTransactions') || 'No Transactions'}</h4>
            <p style={{ color: '#64748b' }}>
              {t('noTransactionsDescription') || 'No transactions found matching your filters.'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Get CSS class for budget impact
 */
const getBudgetImpactClass = (budgetImpact) => {
  if (budgetImpact.isOverBudget || budgetImpact.wouldCauseOverrun) {
    return 'over-budget';
  } else if (budgetImpact.remainingBudget < budgetImpact.currentSpent * 0.2) {
    return 'near-budget';
  } else {
    return 'within-budget';
  }
};

/**
 * Get icon for budget impact
 */
const getBudgetImpactIcon = (budgetImpact) => {
  if (budgetImpact.isOverBudget || budgetImpact.wouldCauseOverrun) {
    return '⚠️';
  } else if (budgetImpact.remainingBudget < budgetImpact.currentSpent * 0.2) {
    return '⚡';
  } else {
    return '✅';
  }
};

/**
 * Get color for budget impact
 */
const getBudgetImpactColor = (budgetImpact) => {
  if (budgetImpact.isOverBudget || budgetImpact.wouldCauseOverrun) {
    return '#dc2626';
  } else if (budgetImpact.remainingBudget < budgetImpact.currentSpent * 0.2) {
    return '#d97706';
  } else {
    return '#059669';
  }
};

export default TransactionTable;