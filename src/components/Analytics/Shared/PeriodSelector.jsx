import React from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { useAnalytics } from '../AnalyticsMain';

/**
 * Period Selector Component
 * Provides period selection and date range controls for analytics
 * Follows BUILD_NEW_FEATURE_GUIDE.md date field requirements
 */
const PeriodSelector = () => {
  const { 
    selectedPeriod, 
    setSelectedPeriod, 
    dateRange, 
    setDateRange,
    t 
  } = useAnalytics();

  /**
   * Handle period selection change
   */
  const handlePeriodChange = (event) => {
    const newPeriod = event.target.value;
    setSelectedPeriod(newPeriod);
  };

  /**
   * Handle start date change
   */
  const handleStartDateChange = (date) => {
    if (date) {
      const dateString = formatDateToString(date);
      setDateRange(prev => ({
        ...prev,
        startDate: dateString
      }));
    }
  };

  /**
   * Handle end date change
   */
  const handleEndDateChange = (date) => {
    if (date) {
      const dateString = formatDateToString(date);
      setDateRange(prev => ({
        ...prev,
        endDate: dateString
      }));
    }
  };

  /**
   * Parse date string to Date object
   */
  const parseDateString = (dateString) => {
    if (!dateString) return new Date();
    const [year, month, day] = dateString.split('-');
    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  };

  /**
   * Format Date object to YYYY-MM-DD string (timezone-safe)
   * Follows ISSUES_TO_BE_AWARE_OF.md timezone handling
   */
  const formatDateToString = (date) => {
    if (!date) return '';
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  return (
    <div className="period-selector">
      <div className="period-selector-header">
        <h3>Time Period</h3>
      </div>

      <div className="period-controls">
        {/* Period Type Selector */}
        <div className="period-type-selector">
          <label htmlFor="period-type">
            Period Type
          </label>
          <select
            id="period-type"
            value={selectedPeriod}
            onChange={handlePeriodChange}
            className="form-control"
            style={{
              backgroundColor: 'white',
              color: '#1a202c',
              border: '1px solid #d1d5db'
            }}
          >
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="quarterly">Quarterly</option>
            <option value="yearly">Yearly</option>
          </select>
        </div>

        {/* Date Range Selectors */}
        <div className="date-range-selectors">
          <div className="date-selector">
            <label>Start Date</label>
            <DatePicker
              selected={parseDateString(dateRange.startDate)}
              onChange={handleStartDateChange}
              dateFormat="yyyy-MM-dd"
              className="form-control"
              placeholderText="Select start date"
              style={{
                backgroundColor: 'white',
                color: '#1a202c',
                border: '1px solid #d1d5db'
              }}
            />
          </div>

          <div className="date-selector">
            <label>End Date</label>
            <DatePicker
              selected={parseDateString(dateRange.endDate)}
              onChange={handleEndDateChange}
              dateFormat="yyyy-MM-dd"
              className="form-control"
              placeholderText="Select end date"
              minDate={parseDateString(dateRange.startDate)}
              style={{
                backgroundColor: 'white',
                color: '#1a202c',
                border: '1px solid #d1d5db'
              }}
            />
          </div>
        </div>

        {/* Quick Period Buttons */}
        <div className="quick-periods">
          <button
            className="btn-filter"
            onClick={() => setSelectedPeriod('monthly')}
          >
            This Month
          </button>
          <button
            className="btn-filter"
            onClick={() => setSelectedPeriod('quarterly')}
          >
            This Quarter
          </button>
          <button
            className="btn-filter"
            onClick={() => setSelectedPeriod('yearly')}
          >
            This Year
          </button>
        </div>
      </div>
    </div>
  );
};

export default PeriodSelector;