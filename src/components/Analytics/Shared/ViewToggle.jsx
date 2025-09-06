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
        <h3>{t('viewType') || 'View Type'}</h3>
        <p className="view-toggle-description">
          {t('viewTypeDescription') || 'Choose between cash-based or accrual-based accounting view'}
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
                {t('cashBased') || 'Cash-Based'}
              </span>
              <span className="toggle-description">
                {t('cashBasedDescription') || 'Records when money actually changes hands'}
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
                {t('accrualBased') || 'Accrual-Based'}
              </span>
              <span className="toggle-description">
                {t('accrualBasedDescription') || 'Records when transactions occur'}
              </span>
            </div>
          </button>
        </div>

        {/* Prominent Toggle Switch */}
        <div className="prominent-toggle">
          <span className={`toggle-label ${viewType === 'cash' ? 'active' : ''}`}>
            {t('cash') || 'Cash'}
          </span>
          <button
            className="toggle-switch"
            onClick={handleToggle}
            aria-label={t('toggleViewType') || 'Toggle between Cash and Accrual view'}
          >
            <div className={`toggle-slider ${viewType === 'accrual' ? 'active' : ''}`}>
              <div className="toggle-handle" />
            </div>
          </button>
          <span className={`toggle-label ${viewType === 'accrual' ? 'active' : ''}`}>
            {t('accrual') || 'Accrual'}
          </span>
        </div>

        {/* Current Selection Indicator */}
        <div className="current-selection">
          <span className="selection-label">
            {t('currentView') || 'Current View'}:
          </span>
          <span className={`selection-value ${viewType}`}>
            {viewType === 'cash' 
              ? (t('cashBased') || 'Cash-Based')
              : (t('accrualBased') || 'Accrual-Based')
            }
          </span>
        </div>
      </div>
    </div>
  );
};

export default ViewToggle;