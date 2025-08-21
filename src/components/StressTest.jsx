import React, { useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { useAccounting } from '../contexts/AccountingContext';

const StressTest = () => {
  const { t } = useLanguage();
  const { 
    generateStressTestTransactions, 
    clearStressTestTransactions, 
    transactions, 
    loading 
  } = useAccounting();
  const [stressTestResults, setStressTestResults] = useState(null);
  const [stressTestCount, setStressTestCount] = useState(1000);

  const handleStressTest = async () => {
    try {
      console.time('Stress Test');
      const result = await generateStressTestTransactions(stressTestCount);
      console.timeEnd('Stress Test');
      setStressTestResults(result);
      alert(`✅ Stress Test Completed!\n\nGenerated: ${result.generated} transactions\nTotal: ${result.total} transactions\nTime: ${result.duration}ms\nAvg per transaction: ${result.averageTime}ms`);
    } catch (error) {
      console.error('Stress test failed:', error);
      alert(`❌ Stress Test Failed: ${error.message}`);
    }
  };

  const handleClearStressTest = async () => {
    try {
      const result = await clearStressTestTransactions();
      setStressTestResults(null);
      alert(`✅ Cleared ${result} stress test transactions`);
    } catch (error) {
      console.error('Clear stress test failed:', error);
      alert(`❌ Clear Failed: ${error.message}`);
    }
  };

  return (
    <div className="stress-test-page">
      <div className="page-header">
        <h2>🧪 Application Stress Test</h2>
        <p>Test application performance with bulk transaction data</p>
      </div>
      
      <div className="stress-test-controls">
        <div className="current-stats">
          <h3>Current Statistics</h3>
          <div className="stats-grid">
            <div className="stat-item">
              <span className="stat-label">Current Transactions</span>
              <span className="stat-value">{transactions.length.toLocaleString()}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Stress Test Transactions</span>
              <span className="stat-value">
                {transactions.filter(t => t.id.startsWith('STRESS_TXN_')).length.toLocaleString()}
              </span>
            </div>
            {stressTestResults && (
              <>
                <div className="stat-item">
                  <span className="stat-label">Last Generated</span>
                  <span className="stat-value">{stressTestResults.generated.toLocaleString()}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Generation Time</span>
                  <span className="stat-value">{stressTestResults.duration}ms</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Avg per Transaction</span>
                  <span className="stat-value">{stressTestResults.averageTime}ms</span>
                </div>
              </>
            )}
          </div>
        </div>
        
        <div className="test-controls">
          <h3>Test Configuration</h3>
          <div className="control-group">
            <label htmlFor="stress-count">Number of transactions to generate:</label>
            <input
              id="stress-count"
              type="number"
              min="100"
              max="5000"
              step="100"
              value={stressTestCount}
              onChange={(e) => setStressTestCount(parseInt(e.target.value))}
              disabled={loading}
            />
          </div>
          
          <div className="button-group">
            <button 
              className="stress-btn generate-btn"
              onClick={handleStressTest}
              disabled={loading}
            >
              {loading ? '⏳ Generating...' : '🚀 Generate Test Data'}
            </button>
            
            <button 
              className="stress-btn clear-btn"
              onClick={handleClearStressTest}
              disabled={loading || transactions.filter(t => t.id.startsWith('STRESS_TXN_')).length === 0}
            >
              {loading ? '⏳ Clearing...' : '🗑️ Clear Test Data'}
            </button>
          </div>
        </div>
        
        <div className="test-info">
          <h4>📊 What this test does:</h4>
          <ul>
            <li>Generates realistic transaction data with random amounts, dates, and accounts</li>
            <li>Tests UI performance with large datasets</li>
            <li>Measures generation speed and memory usage</li>
            <li>Updates account balances automatically</li>
            <li>Includes filtering, sorting, and search functionality</li>
          </ul>
        </div>
        
        {transactions.length > 500 && (
          <div className="performance-warning">
            ⚠️ <strong>Performance Note:</strong> With {transactions.length.toLocaleString()} transactions, 
            you may notice slower rendering. This helps identify optimization opportunities.
          </div>
        )}
      </div>
    </div>
  );
};

export default StressTest;