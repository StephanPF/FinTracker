import React, { useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';

const Test = () => {
  const { t } = useLanguage();
  const [selectedLogo, setSelectedLogo] = useState(null);
  const [showInContext, setShowInContext] = useState(false);

  const logoOptions = [
    {
      id: 'classic',
      name: 'Classic Finance',
      description: 'Traditional finance symbolism with modern styling',
      primary: (
        <div className="logo classic-logo">
          <div className="logo-icon">
            <div className="coin-stack">
              <div className="coin coin-1">💰</div>
              <div className="coin coin-2">💰</div>
              <div className="coin coin-3">💰</div>
            </div>
          </div>
          <div className="logo-text">
            <span className="logo-title">Personal Finance</span>
            <span className="logo-subtitle">Tracker</span>
          </div>
        </div>
      ),
      compact: (
        <div className="logo-compact classic-compact">
          💰 <span>PFT</span>
        </div>
      ),
      colors: ['#2E7D32', '#1B5E20', '#4CAF50']
    },
    {
      id: 'modern',
      name: 'Modern Minimal',
      description: 'Clean, modern design with geometric elements',
      primary: (
        <div className="logo modern-logo">
          <div className="logo-icon">
            <div className="geometric-shape">
              <div className="shape-layer layer-1"></div>
              <div className="shape-layer layer-2"></div>
              <div className="shape-layer layer-3"></div>
            </div>
          </div>
          <div className="logo-text">
            <span className="logo-title">FinanceFlow</span>
            <span className="logo-subtitle">Personal Tracker</span>
          </div>
        </div>
      ),
      compact: (
        <div className="logo-compact modern-compact">
          <div className="compact-shape"></div>
          <span>FF</span>
        </div>
      ),
      colors: ['#1E3A8A', '#3B82F6', '#60A5FA']
    },
    {
      id: 'balance',
      name: 'Balance Scale',
      description: 'Represents financial balance and double-entry bookkeeping',
      primary: (
        <div className="logo balance-logo">
          <div className="logo-icon">
            <div className="balance-scale">
              <div className="scale-base">⚖️</div>
              <div className="scale-overlay">
                <div className="scale-left">💰</div>
                <div className="scale-right">📊</div>
              </div>
            </div>
          </div>
          <div className="logo-text">
            <span className="logo-title">BalanceBooks</span>
            <span className="logo-subtitle">Personal Edition</span>
          </div>
        </div>
      ),
      compact: (
        <div className="logo-compact balance-compact">
          ⚖️ <span>BB</span>
        </div>
      ),
      colors: ['#7C2D12', '#EA580C', '#F97316']
    },
    {
      id: 'growth',
      name: 'Growth Arrow',
      description: 'Emphasizes financial growth and progress tracking',
      primary: (
        <div className="logo growth-logo">
          <div className="logo-icon">
            <div className="growth-chart">
              <div className="chart-bars">
                <div className="bar bar-1"></div>
                <div className="bar bar-2"></div>
                <div className="bar bar-3"></div>
                <div className="bar bar-4"></div>
              </div>
              <div className="growth-arrow">📈</div>
            </div>
          </div>
          <div className="logo-text">
            <span className="logo-title">WealthPath</span>
            <span className="logo-subtitle">Personal Tracker</span>
          </div>
        </div>
      ),
      compact: (
        <div className="logo-compact growth-compact">
          📈 <span>WP</span>
        </div>
      ),
      colors: ['#059669', '#10B981', '#34D399']
    },
    {
      id: 'secure',
      name: 'Secure Vault',
      description: 'Emphasizes security and protection of financial data',
      primary: (
        <div className="logo secure-logo">
          <div className="logo-icon">
            <div className="vault-container">
              <div className="vault-door">🔒</div>
              <div className="vault-content">💎</div>
            </div>
          </div>
          <div className="logo-text">
            <span className="logo-title">SecureFinance</span>
            <span className="logo-subtitle">Personal Vault</span>
          </div>
        </div>
      ),
      compact: (
        <div className="logo-compact secure-compact">
          🔒 <span>SF</span>
        </div>
      ),
      colors: ['#4C1D95', '#7C3AED', '#A78BFA']
    },
    {
      id: 'simple',
      name: 'Simple & Clean',
      description: 'Minimalist approach focusing on clarity and usability',
      primary: (
        <div className="logo simple-logo">
          <div className="logo-icon">
            <div className="simple-circle">
              <span className="simple-symbol">$</span>
            </div>
          </div>
          <div className="logo-text">
            <span className="logo-title">MyFinances</span>
            <span className="logo-subtitle">Personal Tracker</span>
          </div>
        </div>
      ),
      compact: (
        <div className="logo-compact simple-compact">
          <div className="simple-compact-circle">$</div>
          <span>MF</span>
        </div>
      ),
      colors: ['#374151', '#6B7280', '#9CA3AF']
    }
  ];

  const renderLogoInContext = (logo) => (
    <div className="context-preview">
      <div className="mock-header">
        {logo.compact}
        <nav className="mock-nav">
          <span>Overview</span>
          <span>Transactions</span>
          <span>Reports</span>
        </nav>
      </div>
      <div className="mock-content">
        <div className="mock-card">
          <h3>Welcome to {logo.name}</h3>
          <p>Your personal finance tracking solution</p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="test-page">
      <div className="page-header">
        <h2>🎨 Logo Design Options</h2>
        <p>Exploring visual identity concepts for the Personal Finance Tracker</p>
        
        <div className="test-controls">
          <button 
            className={`control-btn ${showInContext ? 'active' : ''}`}
            onClick={() => setShowInContext(!showInContext)}
          >
            {showInContext ? '🖼️ Design View' : '📱 Context View'}
          </button>
        </div>
      </div>

      <div className="logo-gallery">
        {logoOptions.map((logo) => (
          <div 
            key={logo.id}
            className={`logo-option ${selectedLogo === logo.id ? 'selected' : ''}`}
            onClick={() => setSelectedLogo(selectedLogo === logo.id ? null : logo.id)}
          >
            <div className="logo-preview">
              {showInContext ? renderLogoInContext(logo) : (
                <div className="logo-showcase">
                  <div className="primary-logo">
                    {logo.primary}
                  </div>
                  <div className="compact-logo">
                    <label>Compact Version:</label>
                    {logo.compact}
                  </div>
                </div>
              )}
            </div>
            
            <div className="logo-info">
              <h3>{logo.name}</h3>
              <p>{logo.description}</p>
              
              <div className="color-palette">
                <label>Color Palette:</label>
                <div className="colors">
                  {logo.colors.map((color, index) => (
                    <div 
                      key={index}
                      className="color-swatch"
                      style={{ backgroundColor: color }}
                      title={color}
                    ></div>
                  ))}
                </div>
              </div>
            </div>
            
            {selectedLogo === logo.id && (
              <div className="logo-details">
                <div className="usage-examples">
                  <h4>Usage Examples:</h4>
                  <div className="usage-grid">
                    <div className="usage-item">
                      <span className="usage-label">Header Logo:</span>
                      <div className="usage-demo header-demo">
                        {logo.compact}
                      </div>
                    </div>
                    <div className="usage-item">
                      <span className="usage-label">Login Screen:</span>
                      <div className="usage-demo login-demo">
                        {logo.primary}
                      </div>
                    </div>
                    <div className="usage-item">
                      <span className="usage-label">Favicon:</span>
                      <div className="usage-demo favicon-demo">
                        <div className="favicon-preview">
                          {logo.compact}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="technical-specs">
                  <h4>Technical Specifications:</h4>
                  <ul>
                    <li>✅ Scalable from 16px to 200px</li>
                    <li>✅ Works on light and dark backgrounds</li>
                    <li>✅ High contrast for accessibility</li>
                    <li>✅ Emoji-based for cross-platform compatibility</li>
                    <li>✅ Print-friendly versions available</li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="recommendations">
        <h3>🎯 Recommendations</h3>
        <div className="recommendation-grid">
          <div className="recommendation-item">
            <h4>💼 Professional Use</h4>
            <p><strong>Balance Scale</strong> or <strong>Classic Finance</strong> - Traditional and trustworthy</p>
          </div>
          <div className="recommendation-item">
            <h4>🚀 Modern Startups</h4>
            <p><strong>Modern Minimal</strong> or <strong>Growth Arrow</strong> - Clean and forward-thinking</p>
          </div>
          <div className="recommendation-item">
            <h4>🔒 Security-Focused</h4>
            <p><strong>Secure Vault</strong> - Emphasizes data protection and privacy</p>
          </div>
          <div className="recommendation-item">
            <h4>📱 Consumer Apps</h4>
            <p><strong>Simple & Clean</strong> - Easy to recognize and remember</p>
          </div>
        </div>
      </div>

      <div className="next-steps">
        <h3>📋 Next Steps</h3>
        <div className="steps-list">
          <div className="step-item">
            <span className="step-number">1</span>
            <span className="step-text">Choose preferred logo concept</span>
          </div>
          <div className="step-item">
            <span className="step-number">2</span>
            <span className="step-text">Refine colors and typography</span>
          </div>
          <div className="step-item">
            <span className="step-number">3</span>
            <span className="step-text">Create SVG versions for scalability</span>
          </div>
          <div className="step-item">
            <span className="step-number">4</span>
            <span className="step-text">Implement across application interface</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Test;