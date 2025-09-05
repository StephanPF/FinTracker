import React from 'react';
import { useLanguage } from '../contexts/LanguageContext';

const Logo = ({ variant = 'full', size = 'medium', theme = 'light', onClick, clickable = false }) => {
  const { t } = useLanguage();
  const getSize = () => {
    switch (size) {
      case 'small': return { icon: '30px', title: '1rem', subtitle: '0.7rem' };
      case 'medium': return { icon: '45px', title: '1.5rem', subtitle: '0.9rem' };
      case 'large': return { icon: '60px', title: '2rem', subtitle: '1.1rem' };
      default: return { icon: '45px', title: '1.5rem', subtitle: '0.9rem' };
    }
  };

  const sizes = getSize();
  
  const logoProps = {
    className: `financeflow-logo-compact ${theme} ${clickable ? 'clickable' : ''}`,
    onClick: clickable ? onClick : undefined,
    style: clickable ? { cursor: 'pointer' } : {},
    title: clickable ? t('backToMain') : undefined
  };

  if (variant === 'compact') {
    return (
      <div {...logoProps}>
        <div className="ff-compact-shape" style={{ width: sizes.icon, height: sizes.icon }}>
          <div className="ff-layer ff-layer-1"></div>
          <div className="ff-layer ff-layer-2"></div>
          <div className="ff-layer ff-layer-3"></div>
        </div>
        <span className="ff-compact-text" style={{ fontSize: sizes.title }}>FF</span>
      </div>
    );
  }

  if (variant === 'icon') {
    return (
      <div {...logoProps} className={`financeflow-logo-icon ${theme} ${clickable ? 'clickable' : ''}`}>
        <div className="ff-shape" style={{ width: sizes.icon, height: sizes.icon }}>
          <div className="ff-layer ff-layer-1"></div>
          <div className="ff-layer ff-layer-2"></div>
          <div className="ff-layer ff-layer-3"></div>
        </div>
      </div>
    );
  }

  return (
    <div {...logoProps} className={`financeflow-logo-full ${theme} ${clickable ? 'clickable' : ''}`}>
      <div className="ff-logo-icon">
        <div className="ff-shape" style={{ width: sizes.icon, height: sizes.icon }}>
          <div className="ff-layer ff-layer-1"></div>
          <div className="ff-layer ff-layer-2"></div>
          <div className="ff-layer ff-layer-3"></div>
        </div>
      </div>
      <div className="ff-logo-text">
        <span className="ff-logo-title" style={{ fontSize: sizes.title }}>FinanceFlow</span>
        <span className="ff-logo-subtitle" style={{ fontSize: sizes.subtitle }}>{t('personalTracker')}</span>
      </div>
    </div>
  );
};

export default Logo;