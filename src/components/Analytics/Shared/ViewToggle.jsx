import React from 'react';
import { useAnalytics } from '../AnalyticsMain';

/**
 * View Toggle Component
 * Provides Cash vs Accrual view toggle for analytics
 * Follows BUILD_NEW_FEATURE_GUIDE.md compact design principles
 */
const ViewToggle = () => {
  const { viewType, setViewType, t } = useAnalytics();

  /**
   * Handle view type toggle
   */
  const handleToggle = () => {
    setViewType();
  };

  return (
    <div className="view-toggle">
      <div className="view-toggle-header">
        <h3>View Type</h3>
        <p className="view-toggle-description">
          Choose between cash-based or accrual-based accounting view
        </p>
      </div>

      <div className="view-toggle-controls">
        <div className="toggle-container">
          <button
            className={`toggle-option ${viewType === 'cash' ? 'active' : ''}`}
            onClick={handleToggle}
            disabled={viewType === 'cash'}
          >
            <div className="toggle-option-content">
              <span className="toggle-title">
                Cash-Based
              </span>
              <span className="toggle-description">
                Records when money actually changes hands
              </span>
            </div>
          </button>

          <div className="toggle-divider" />

          <button
            className={`toggle-option ${viewType === 'accrual' ? 'active' : ''}`}
            onClick={handleToggle}
            disabled={viewType === 'accrual'}
          >
            <div className="toggle-option-content">
              <span className="toggle-title">
                Accrual-Based
              </span>
              <span className="toggle-description">
                Records when transactions occur
              </span>
            </div>
          </button>
        </div>

        {/* Prominent Toggle Switch */}
        <div className="prominent-toggle">
          <span className={`toggle-label ${viewType === 'cash' ? 'active' : ''}`}>
            Cash
          </span>
          <button
            className="toggle-switch"
            onClick={handleToggle}
            aria-label="Toggle between Cash and Accrual view"
          >
            <div className={`toggle-slider ${viewType === 'accrual' ? 'active' : ''}`}>
              <div className="toggle-handle" />
            </div>
          </button>
          <span className={`toggle-label ${viewType === 'accrual' ? 'active' : ''}`}>
            Accrual
          </span>
        </div>

        {/* Current Selection Indicator */}
        <div className="current-selection">
          <span className="selection-label">
            Current View:
          </span>
          <span className={`selection-value ${viewType}`}>
            {viewType === 'cash' 
              ? 'Cash-Based'
              : 'Accrual-Based'
            }
          </span>
        </div>
      </div>
    </div>
  );
};

export default ViewToggle;