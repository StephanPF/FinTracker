import React, { useState, useEffect } from 'react';
import { useAccounting } from '../../../contexts/AccountingContext';
import { useLanguage } from '../../../contexts/LanguageContext';
import { useAnalytics } from '../AnalyticsMain';
import NetWorthChart from './NetWorthChart';
import './NetWorthEvolution.css';

const NetWorthEvolution = ({ onNavigate }) => {
  const { 
    netWorthSnapshots, 
    getNetWorthSnapshots, 
    currencies, 
    getBaseCurrency, 
    exchangeRateService,
    numberFormatService 
  } = useAccounting();
  const { t } = useLanguage();
  const { formatCurrency } = useAnalytics();

  const [snapshots, setSnapshots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedCurrency, setSelectedCurrency] = useState('base');

  // Load snapshots on component mount
  useEffect(() => {
    loadSnapshots();
  }, []);

  const loadSnapshots = () => {
    setLoading(true);
    try {
      const allSnapshots = getNetWorthSnapshots() || [];
      // Sort by date (newest first)
      const sortedSnapshots = allSnapshots.sort((a, b) => 
        new Date(b.snapshotDate) - new Date(a.snapshotDate)
      );
      setSnapshots(sortedSnapshots);
    } catch (error) {
      console.error('Error loading net worth snapshots:', error);
    } finally {
      setLoading(false);
    }
  };

  // Convert snapshot values to selected currency
  const convertSnapshotValues = (snapshot) => {
    if (!exchangeRateService || selectedCurrency === 'base') {
      return snapshot;
    }

    const baseCurrency = getBaseCurrency();
    if (!baseCurrency || snapshot.baseCurrencyId === baseCurrency.id) {
      return snapshot;
    }

    // Convert from snapshot's currency to current base currency
    try {
      return {
        ...snapshot,
        totalAssets: exchangeRateService.convertToBaseCurrency(snapshot.totalAssets, snapshot.baseCurrencyId),
        totalLiabilities: exchangeRateService.convertToBaseCurrency(snapshot.totalLiabilities, snapshot.baseCurrencyId),
        netAssets: exchangeRateService.convertToBaseCurrency(snapshot.netAssets, snapshot.baseCurrencyId),
        totalRetirement: exchangeRateService.convertToBaseCurrency(snapshot.totalRetirement, snapshot.baseCurrencyId),
        displayCurrencyId: baseCurrency.id
      };
    } catch (error) {
      console.warn('Currency conversion failed for snapshot:', snapshot.id, error);
      return snapshot;
    }
  };

  // Format currency amount for display
  const formatAmount = (amount, currencyId = null) => {
    if (!currencyId) {
      const baseCurrency = getBaseCurrency();
      currencyId = baseCurrency?.id || 'CUR_001';
    }

    if (numberFormatService) {
      return numberFormatService.formatCurrency(amount, currencyId);
    }
    
    const currency = currencies.find(c => c.id === currencyId);
    if (currency) {
      return `${currency.symbol}${amount.toFixed(currency.decimalPlaces || 2)}`;
    }
    
    return amount.toFixed(2);
  };

  // Get display currency for formatting
  const getDisplayCurrency = () => {
    if (selectedCurrency === 'base') {
      return getBaseCurrency();
    }
    return getBaseCurrency(); // For now, only support base currency display
  };

  if (loading) {
    return (
      <div className="networth-evolution loading">
        <h2>📈 Net Worth View</h2>
        <p>Loading snapshots...</p>
      </div>
    );
  }

  if (snapshots.length === 0) {
    return (
      <div className="networth-evolution empty">
        <h2>📈 Net Worth View</h2>
        <div className="empty-state">
          <p>No net worth snapshots found.</p>
          <p>Start tracking your financial progress by saving snapshots from the Overview page.</p>
          <button 
            className="btn-primary"
            onClick={() => onNavigate && onNavigate('overview')}
          >
            Go to Overview
          </button>
        </div>
      </div>
    );
  }

  const displayCurrency = getDisplayCurrency();

  return (
    <div className="networth-evolution">
      <div className="networth-header">
        <h2>📈 {t('netWorthView') || 'Net Worth View'}</h2>
        <div className="networth-controls">
          <span className="snapshots-count">
            {snapshots.length} {snapshots.length === 1 ? 'snapshot' : t('snapshotsFound') || 'snapshots found'}
          </span>
        </div>
      </div>

      <div className="networth-summary">
        {snapshots.length >= 2 && (
          <div className="evolution-summary">
            <h3>Summary</h3>
            <div className="summary-cards">
              {(() => {
                const latestSnapshot = convertSnapshotValues(snapshots[0]);
                const oldestSnapshot = convertSnapshotValues(snapshots[snapshots.length - 1]);
                const netWorthChange = latestSnapshot.netAssets - oldestSnapshot.netAssets;
                const isPositive = netWorthChange >= 0;
                
                return (
                  <>
                    <div className="summary-card white-bg-card">
                      <div className="card-label">Latest Net Worth</div>
                      <div className="card-value">
                        {formatAmount(latestSnapshot.netAssets, latestSnapshot.displayCurrencyId || latestSnapshot.baseCurrencyId)}
                      </div>
                      <div className="card-date">{latestSnapshot.snapshotDate}</div>
                    </div>
                    <div className="summary-card white-bg-card">
                      <div className="card-label">Net Worth Change</div>
                      <div className={`card-value ${isPositive ? 'positive' : 'negative'}`}>
                        {isPositive ? '+' : ''}{formatAmount(netWorthChange, displayCurrency?.id)}
                      </div>
                      <div className="card-date">
                        Since {oldestSnapshot.snapshotDate}
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        )}
      </div>

      <div className="networth-data">
        <h3>Historical Snapshots</h3>
        <div className="snapshots-table">
          <div className="table-header">
            <div>Date</div>
            <div>Total Assets</div>
            <div>Total Liabilities</div>
            <div>Net Worth</div>
            <div>Retirement</div>
            <div>Currency</div>
          </div>
          {snapshots.map((snapshot) => {
            const convertedSnapshot = convertSnapshotValues(snapshot);
            const displayCurrencyId = convertedSnapshot.displayCurrencyId || snapshot.baseCurrencyId;
            const currency = currencies.find(c => c.id === displayCurrencyId);
            
            return (
              <div key={snapshot.id} className="table-row">
                <div className="snapshot-date">{snapshot.snapshotDate}</div>
                <div className="snapshot-value assets">
                  {formatAmount(convertedSnapshot.totalAssets, displayCurrencyId)}
                </div>
                <div className="snapshot-value liabilities">
                  {formatAmount(convertedSnapshot.totalLiabilities, displayCurrencyId)}
                </div>
                <div className="snapshot-value net-worth">
                  {formatAmount(convertedSnapshot.netAssets, displayCurrencyId)}
                </div>
                <div className="snapshot-value retirement">
                  {formatAmount(convertedSnapshot.totalRetirement, displayCurrencyId)}
                </div>
                <div className="snapshot-currency">
                  {currency?.code || 'Unknown'}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <NetWorthChart 
        snapshots={snapshots}
        formatAmount={formatAmount}
        currencies={currencies}
        selectedCurrency={selectedCurrency}
      />
    </div>
  );
};

export default NetWorthEvolution;