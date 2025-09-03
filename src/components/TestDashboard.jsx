import React, { useState, useEffect } from 'react';
import { runTestSuite, runIndividualTest } from '../utils/testRunner';

const TestDashboard = () => {
  const [testResults, setTestResults] = useState([]);
  const [isRunning, setIsRunning] = useState(false);
  const [runningTests, setRunningTests] = useState(new Set());
  const [showFailedOnly, setShowFailedOnly] = useState(false);

  useEffect(() => {
    // Run all tests on component mount
    runAllTests();
  }, []);

  const runAllTests = async () => {
    setIsRunning(true);
    try {
      const results = await runTestSuite();
      setTestResults(results);
    } catch (error) {
      console.error('Error running tests:', error);
    } finally {
      setIsRunning(false);
    }
  };

  const runSingleTest = async (testId, testName, testFunction) => {
    setRunningTests(prev => new Set(prev).add(testId));
    
    try {
      const result = await runIndividualTest(testName, testFunction);
      
      // Update the specific test result
      setTestResults(prev => prev.map(test => 
        test.id === testId 
          ? { ...test, ...result, lastRun: new Date().toISOString() }
          : test
      ));
    } catch (error) {
      console.error(`Error running test ${testName}:`, error);
      
      setTestResults(prev => prev.map(test => 
        test.id === testId 
          ? { 
              ...test, 
              status: 'failed', 
              error: error.message,
              lastRun: new Date().toISOString()
            }
          : test
      ));
    } finally {
      setRunningTests(prev => {
        const newSet = new Set(prev);
        newSet.delete(testId);
        return newSet;
      });
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'passed': return '✅';
      case 'failed': return '❌';
      case 'running': return '⏳';
      default: return '⚪';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'passed': return '#10b981';
      case 'failed': return '#ef4444';
      case 'running': return '#f59e0b';
      default: return '#6b7280';
    }
  };

  const formatDuration = (duration) => {
    if (!duration) return '';
    return `${duration}ms`;
  };

  const formatError = (error) => {
    if (!error) return '';
    // Clean up error message for display
    return error.replace(/\s+/g, ' ').trim();
  };

  const filteredTests = showFailedOnly 
    ? testResults.filter(test => test.status === 'failed')
    : testResults;

  const totalTests = testResults.length;
  const passedTests = testResults.filter(t => t.status === 'passed').length;
  const failedTests = testResults.filter(t => t.status === 'failed').length;
  const runningTestsCount = runningTests.size;

  return (
    <div className="test-dashboard">
      <div className="test-header">
        <h1>Test Dashboard</h1>
        <div className="test-summary">
          <div className="summary-stat">
            <span className="stat-number">{totalTests}</span>
            <span className="stat-label">Total Tests</span>
          </div>
          <div className="summary-stat passed">
            <span className="stat-number">{passedTests}</span>
            <span className="stat-label">Passed</span>
          </div>
          <div className="summary-stat failed">
            <span className="stat-number">{failedTests}</span>
            <span className="stat-label">Failed</span>
          </div>
          <div className="summary-stat running">
            <span className="stat-number">{runningTestsCount}</span>
            <span className="stat-label">Running</span>
          </div>
        </div>
        <div className="test-actions">
          <button
            onClick={() => setShowFailedOnly(!showFailedOnly)}
            className={`btn-filter ${showFailedOnly ? 'active' : ''}`}
          >
            {showFailedOnly ? 'Show All Tests' : 'Show Failed Only'}
          </button>
          <button 
            onClick={runAllTests} 
            disabled={isRunning}
            className="btn-primary"
          >
            {isRunning ? 'Running All Tests...' : 'Run All Tests'}
          </button>
        </div>
      </div>

      <div className="unified-tests-table">
        <table className="tests-table">
          <thead>
            <tr>
              <th>Status</th>
              <th>Suite</th>
              <th>Test Name</th>
              <th>Description</th>
              <th>Expected</th>
              <th>Duration</th>
              <th>Last Run</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredTests.map((test) => {
              const isRunning = runningTests.has(test.id);
              const currentStatus = isRunning ? 'running' : test.status;
              
              return (
                <tr key={test.id} className={`test-row ${currentStatus}`}>
                  <td className="status-cell">
                    <span 
                      className="status-icon"
                      style={{ color: getStatusColor(currentStatus) }}
                      title={currentStatus}
                    >
                      {getStatusIcon(currentStatus)}
                    </span>
                  </td>
                  <td className="suite-cell">
                    <div className="test-suite-name" title={test.suite}>
                      {test.suite ? test.suite.replace('RelationalDatabase - ', '').replace('ExchangeRateService - ', '') : 'Unknown'}
                    </div>
                  </td>
                  <td className="test-name-cell">
                    <div className="test-name">{test.name}</div>
                    {test.error && (
                      <div className="test-error-inline" title={formatError(test.error)}>
                        Error: {formatError(test.error).substring(0, 50)}...
                      </div>
                    )}
                  </td>
                  <td className="description-cell">
                    <div className="test-description" title={test.description}>
                      {test.description ? test.description.substring(0, 60) + (test.description.length > 60 ? '...' : '') : '-'}
                    </div>
                  </td>
                  <td className="expected-cell">
                    <div className="test-expected" title={test.expectedBehavior}>
                      {test.expectedBehavior ? test.expectedBehavior.substring(0, 50) + (test.expectedBehavior.length > 50 ? '...' : '') : '-'}
                    </div>
                  </td>
                  <td className="duration-cell">
                    {test.duration ? formatDuration(test.duration) : '-'}
                  </td>
                  <td className="lastrun-cell">
                    {test.lastRun ? new Date(test.lastRun).toLocaleTimeString() : '-'}
                  </td>
                  <td className="actions-cell">
                    <button
                      onClick={() => runSingleTest(test.id, test.name, test.testFunction)}
                      disabled={isRunning}
                      className="btn-run-test"
                      title={isRunning ? 'Running...' : 'Run test'}
                    >
                      {isRunning ? '⏳' : '▶️'}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TestDashboard;