import React, { useState, useEffect } from 'react';
import { useAnalytics } from '../AnalyticsMain';

/**
 * AdvancedFilters Component
 * Advanced filtering capabilities for cashflow analytics with budget status filtering
 * Follows BUILD_NEW_FEATURE_GUIDE.md compact design principles
 */
const AdvancedFilters = ({ onFiltersChange, initialFilters = {} }) => {
  const {
    analyticsService,
    activeBudget,
    t
  } = useAnalytics();

  // Filter state
  const [filters, setFilters] = useState({
    budgetStatus: initialFilters.budgetStatus || 'all', // 'all', 'over-budget', 'under-budget', 'no-budget', 'on-track'
    amountRange: initialFilters.amountRange || { min: '', max: '' },
    categories: initialFilters.categories || [],
    transactionTypes: initialFilters.transactionTypes || ['CAT_001', 'CAT_002'], // Income and Expenses
    dateRange: initialFilters.dateRange || { start: '', end: '' },
    paymentMethods: initialFilters.paymentMethods || [],
    recurringOnly: initialFilters.recurringOnly || false,
    anomaliesOnly: initialFilters.anomaliesOnly || false,
    sortBy: initialFilters.sortBy || 'date',
    sortOrder: initialFilters.sortOrder || 'desc'
  });

  // Available filter options
  const [filterOptions, setFilterOptions] = useState({
    categories: [],
    paymentMethods: [],
    loading: true
  });

  // Load filter options on component mount
  useEffect(() => {
    loadFilterOptions();
  }, [analyticsService]);

  // Notify parent when filters change
  useEffect(() => {
    if (onFiltersChange) {
      onFiltersChange(filters);
    }
  }, [filters, onFiltersChange]);

  /**
   * Load available filter options from data
   */
  const loadFilterOptions = async () => {
    try {
      if (!analyticsService) return;

      // Get unique categories from transactions
      const categories = await analyticsService.getUniqueSubcategories();
      
      // Get unique payment methods (if available in transaction data)
      const paymentMethods = await analyticsService.getUniquePaymentMethods();

      setFilterOptions({
        categories: categories || [],
        paymentMethods: paymentMethods || [],
        loading: false
      });
    } catch (error) {
      console.error('Error loading filter options:', error);
      setFilterOptions(prev => ({ ...prev, loading: false }));
    }
  };

  /**
   * Handle filter value changes
   */
  const handleFilterChange = (filterName, value) => {
    setFilters(prev => ({
      ...prev,
      [filterName]: value
    }));
  };

  /**
   * Handle array filter changes (categories, payment methods)
   */
  const handleArrayFilterChange = (filterName, value, isChecked) => {
    setFilters(prev => {
      const currentArray = prev[filterName];
      let newArray;
      
      if (isChecked) {
        newArray = [...currentArray, value];
      } else {
        newArray = currentArray.filter(item => item !== value);
      }
      
      return {
        ...prev,
        [filterName]: newArray
      };
    });
  };

  /**
   * Reset all filters to defaults
   */
  const resetFilters = () => {
    setFilters({
      budgetStatus: 'all',
      amountRange: { min: '', max: '' },
      categories: [],
      transactionTypes: ['CAT_001', 'CAT_002'],
      dateRange: { start: '', end: '' },
      paymentMethods: [],
      recurringOnly: false,
      anomaliesOnly: false,
      sortBy: 'date',
      sortOrder: 'desc'
    });
  };

  /**
   * Apply preset filters
   */
  const applyPreset = (presetName) => {
    const presets = {
      'over-budget': {
        budgetStatus: 'over-budget',
        transactionTypes: ['CAT_002'], // Expenses only
        sortBy: 'amount',
        sortOrder: 'desc'
      },
      'large-transactions': {
        budgetStatus: 'all',
        sortBy: 'amount',
        sortOrder: 'desc',
        amountRange: { min: '500', max: '' }
      },
      'recent-activity': {
        budgetStatus: 'all',
        sortBy: 'date',
        sortOrder: 'desc',
        dateRange: {
          start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Last 7 days
          end: new Date().toISOString().split('T')[0]
        }
      },
      'recurring-patterns': {
        budgetStatus: 'all',
        recurringOnly: true,
        sortBy: 'amount',
        sortOrder: 'desc'
      },
      'spending-anomalies': {
        budgetStatus: 'all',
        anomaliesOnly: true,
        transactionTypes: ['CAT_002'], // Expenses only
        sortBy: 'amount',
        sortOrder: 'desc'
      }
    };

    if (presets[presetName]) {
      setFilters(prev => ({
        ...prev,
        ...presets[presetName]
      }));
    }
  };

  /**
   * Get active filter count
   */
  const getActiveFilterCount = () => {
    let count = 0;
    
    if (filters.budgetStatus !== 'all') count++;
    if (filters.amountRange.min || filters.amountRange.max) count++;
    if (filters.categories.length > 0) count++;
    if (filters.transactionTypes.length !== 2) count++; // Default is both income and expenses
    if (filters.dateRange.start || filters.dateRange.end) count++;
    if (filters.paymentMethods.length > 0) count++;
    if (filters.recurringOnly) count++;
    if (filters.anomaliesOnly) count++;
    
    return count;
  };

  const activeFilterCount = getActiveFilterCount();

  return (
    <div className="advanced-filters">
      {/* Filter Header */}
      <div className="filters-header">
        <div className="header-title">
          <h4>{t('advancedFilters') || 'Advanced Filters'}</h4>
          <span className="filter-count">
            {activeFilterCount > 0 && `${activeFilterCount} ${t('active') || 'active'}`}
          </span>
        </div>
        
        <div className="header-actions">
          <button onClick={resetFilters} className="btn-reset">
            {t('resetFilters') || 'Reset Filters'}
          </button>
        </div>
      </div>

      {/* Quick Presets */}
      <div className="filter-presets">
        <div className="presets-label">{t('quickFilters') || 'Quick Filters'}:</div>
        <div className="preset-buttons">
          <button onClick={() => applyPreset('over-budget')} className="preset-btn">
            {t('overBudget') || 'Over Budget'}
          </button>
          <button onClick={() => applyPreset('large-transactions')} className="preset-btn">
            {t('largeTransactions') || 'Large Transactions'}
          </button>
          <button onClick={() => applyPreset('recent-activity')} className="preset-btn">
            {t('recentActivity') || 'Recent Activity'}
          </button>
          <button onClick={() => applyPreset('recurring-patterns')} className="preset-btn">
            {t('recurringPatterns') || 'Recurring'}
          </button>
          <button onClick={() => applyPreset('spending-anomalies')} className="preset-btn">
            {t('anomalies') || 'Anomalies'}
          </button>
        </div>
      </div>

      {/* Filter Controls Grid */}
      <div className="filters-grid">
        {/* Budget Status Filter */}
        {activeBudget && (
          <div className="filter-group">
            <label className="filter-label">{t('budgetStatus') || 'Budget Status'}</label>
            <select 
              value={filters.budgetStatus}
              onChange={(e) => handleFilterChange('budgetStatus', e.target.value)}
              className="filter-select"
            >
              <option value="all">{t('allStatuses') || 'All Statuses'}</option>
              <option value="over-budget">{t('overBudget') || 'Over Budget'}</option>
              <option value="under-budget">{t('underBudget') || 'Under Budget'}</option>
              <option value="on-track">{t('onTrack') || 'On Track'}</option>
              <option value="no-budget">{t('noBudgetSet') || 'No Budget Set'}</option>
            </select>
          </div>
        )}

        {/* Amount Range Filter */}
        <div className="filter-group">
          <label className="filter-label">{t('amountRange') || 'Amount Range'}</label>
          <div className="range-inputs">
            <input
              type="number"
              placeholder={t('min') || 'Min'}
              value={filters.amountRange.min}
              onChange={(e) => handleFilterChange('amountRange', { 
                ...filters.amountRange, 
                min: e.target.value 
              })}
              className="filter-input range-input"
            />
            <span className="range-separator">-</span>
            <input
              type="number"
              placeholder={t('max') || 'Max'}
              value={filters.amountRange.max}
              onChange={(e) => handleFilterChange('amountRange', { 
                ...filters.amountRange, 
                max: e.target.value 
              })}
              className="filter-input range-input"
            />
          </div>
        </div>

        {/* Transaction Type Filter */}
        <div className="filter-group">
          <label className="filter-label">{t('transactionTypes') || 'Transaction Types'}</label>
          <div className="checkbox-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={filters.transactionTypes.includes('CAT_001')}
                onChange={(e) => handleArrayFilterChange('transactionTypes', 'CAT_001', e.target.checked)}
              />
              <span>{t('income') || 'Income'}</span>
            </label>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={filters.transactionTypes.includes('CAT_002')}
                onChange={(e) => handleArrayFilterChange('transactionTypes', 'CAT_002', e.target.checked)}
              />
              <span>{t('expenses') || 'Expenses'}</span>
            </label>
          </div>
        </div>

        {/* Categories Filter */}
        <div className="filter-group">
          <label className="filter-label">{t('categories') || 'Categories'}</label>
          <div className="category-selector">
            {filterOptions.loading ? (
              <div className="loading-text">{t('loading') || 'Loading...'}</div>
            ) : (
              <div className="checkbox-grid">
                {filterOptions.categories.slice(0, 6).map(category => (
                  <label key={category.id} className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={filters.categories.includes(category.id)}
                      onChange={(e) => handleArrayFilterChange('categories', category.id, e.target.checked)}
                    />
                    <span>{category.name}</span>
                  </label>
                ))}
                {filterOptions.categories.length > 6 && (
                  <div className="more-categories">
                    +{filterOptions.categories.length - 6} {t('more') || 'more'}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Date Range Filter */}
        <div className="filter-group">
          <label className="filter-label">{t('dateRange') || 'Date Range'}</label>
          <div className="date-range">
            <input
              type="date"
              value={filters.dateRange.start}
              onChange={(e) => handleFilterChange('dateRange', { 
                ...filters.dateRange, 
                start: e.target.value 
              })}
              className="filter-input date-input"
            />
            <span className="range-separator">{t('to') || 'to'}</span>
            <input
              type="date"
              value={filters.dateRange.end}
              onChange={(e) => handleFilterChange('dateRange', { 
                ...filters.dateRange, 
                end: e.target.value 
              })}
              className="filter-input date-input"
            />
          </div>
        </div>

        {/* Special Filters */}
        <div className="filter-group">
          <label className="filter-label">{t('specialFilters') || 'Special Filters'}</label>
          <div className="checkbox-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={filters.recurringOnly}
                onChange={(e) => handleFilterChange('recurringOnly', e.target.checked)}
              />
              <span>{t('recurringOnly') || 'Recurring transactions only'}</span>
            </label>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={filters.anomaliesOnly}
                onChange={(e) => handleFilterChange('anomaliesOnly', e.target.checked)}
              />
              <span>{t('anomaliesOnly') || 'Anomalies only'}</span>
            </label>
          </div>
        </div>

        {/* Sort Options */}
        <div className="filter-group">
          <label className="filter-label">{t('sortBy') || 'Sort By'}</label>
          <div className="sort-controls">
            <select 
              value={filters.sortBy}
              onChange={(e) => handleFilterChange('sortBy', e.target.value)}
              className="filter-select sort-select"
            >
              <option value="date">{t('date') || 'Date'}</option>
              <option value="amount">{t('amount') || 'Amount'}</option>
              <option value="category">{t('category') || 'Category'}</option>
              <option value="budget-variance">{t('budgetVariance') || 'Budget Variance'}</option>
            </select>
            <button
              onClick={() => handleFilterChange('sortOrder', filters.sortOrder === 'asc' ? 'desc' : 'asc')}
              className="sort-direction-btn"
              title={filters.sortOrder === 'asc' ? (t('ascending') || 'Ascending') : (t('descending') || 'Descending')}
            >
              {filters.sortOrder === 'asc' ? '↑' : '↓'}
            </button>
          </div>
        </div>
      </div>

      {/* Filter Summary */}
      {activeFilterCount > 0 && (
        <div className="filter-summary">
          <div className="summary-label">{t('activeFilters') || 'Active filters'}:</div>
          <div className="filter-tags">
            {filters.budgetStatus !== 'all' && (
              <div className="filter-tag">
                {t('budgetStatus') || 'Budget'}: {t(filters.budgetStatus) || filters.budgetStatus}
                <button onClick={() => handleFilterChange('budgetStatus', 'all')}>×</button>
              </div>
            )}
            {(filters.amountRange.min || filters.amountRange.max) && (
              <div className="filter-tag">
                {t('amount') || 'Amount'}: {filters.amountRange.min || '0'} - {filters.amountRange.max || '∞'}
                <button onClick={() => handleFilterChange('amountRange', { min: '', max: '' })}>×</button>
              </div>
            )}
            {filters.categories.length > 0 && (
              <div className="filter-tag">
                {filters.categories.length} {t('categories') || 'categories'}
                <button onClick={() => handleFilterChange('categories', [])}>×</button>
              </div>
            )}
            {filters.recurringOnly && (
              <div className="filter-tag">
                {t('recurringOnly') || 'Recurring only'}
                <button onClick={() => handleFilterChange('recurringOnly', false)}>×</button>
              </div>
            )}
            {filters.anomaliesOnly && (
              <div className="filter-tag">
                {t('anomaliesOnly') || 'Anomalies only'}
                <button onClick={() => handleFilterChange('anomaliesOnly', false)}>×</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdvancedFilters;