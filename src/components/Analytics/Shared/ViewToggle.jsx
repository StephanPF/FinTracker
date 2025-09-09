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


      </div>
    </div>
  );
};

export default ViewToggle;