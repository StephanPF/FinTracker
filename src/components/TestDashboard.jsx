import React, { useState, useEffect } from 'react';
import { runTestSuite, runIndividualTest } from '../utils/testRunner';
import testReferenceManager from '../utils/testReferenceManager';

const TestDashboard = () => {
  const [testResults, setTestResults] = useState([]);
  const [isRunning, setIsRunning] = useState(false);
  const [runningTests, setRunningTests] = useState(new Set());
  const [showFailedOnly, setShowFailedOnly] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedSuite, setSelectedSuite] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');

  useEffect(() => {
    // Run all tests on component mount
    runAllTests();
  }, []);

  const refreshTestList = async () => {
    setIsRefreshing(true);
    try {
      // Just reload the test suite without running tests
      const results = await runTestSuite();
      
      // Create test results with 'pending' status (not run)
      const refreshedResults = results.map(test => ({
        ...test,
        status: 'pending',
        duration: undefined,
        lastRun: undefined,
        error: undefined
      }));
      
      setTestResults(refreshedResults);
      
      // Clear test reference manager and reload
      testReferenceManager.clearAllTestReferences();
      
      refreshedResults.forEach(test => {
        testReferenceManager.addOrUpdateTestReference({
          testId: test.id,
          suite: test.suite,
          name: test.name,
          description: test.description,
          expectedBehavior: test.expectedBehavior,
          status: 'pending'
        });
      });
      
    } catch (error) {
      console.error('Error refreshing test list:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const runAllTests = async () => {
    setIsRunning(true);
    try {
      const results = await runTestSuite();
      
      // Sync test results with application test reference manager
      const syncedResults = results.map(test => {
        // Get or create test reference
        let testRef = testReferenceManager.getTestReference(test.id);
        if (!testRef) {
          testRef = testReferenceManager.addOrUpdateTestReference({
            testId: test.id,
            suite: test.suite,
            name: test.name,
            description: test.description,
            expectedBehavior: test.expectedBehavior,
            status: test.status,
            duration: test.duration,
            lastRun: test.lastRun,
            error: test.error
          });
        } else {
          // Update existing reference with latest test results
          testRef = testReferenceManager.addOrUpdateTestReference({
            ...testRef,
            status: test.status,
            duration: test.duration,
            lastRun: test.lastRun,
            error: test.error
          });
        }
        
        return {
          ...test,
          testRef: testRef.testRef // Add the persistent reference
        };
      });
      
      setTestResults(syncedResults);
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
      
      // Update the specific test result and sync with test reference manager
      setTestResults(prev => prev.map(test => {
        if (test.id === testId) {
          const updatedTest = { ...test, ...result, lastRun: new Date().toISOString() };
          
          // Update test reference manager with latest results
          testReferenceManager.updateTestReferenceStatus(testId, result.status, result.duration, result.error);
          
          return updatedTest;
        }
        return test;
      }));
    } catch (error) {
      console.error(`Error running test ${testName}:`, error);
      
      setTestResults(prev => prev.map(test => {
        if (test.id === testId) {
          const updatedTest = { 
            ...test, 
            status: 'failed', 
            error: error.message,
            lastRun: new Date().toISOString()
          };
          
          // Update test reference manager with error status
          testReferenceManager.updateTestReferenceStatus(testId, 'failed', null, error.message);
          
          return updatedTest;
        }
        return test;
      }));
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


  // Extract high-level categories from suite names
  const getHighLevelCategory = (suiteName) => {
    if (!suiteName) return 'Unknown';
    
    // Extract the category before the first " - "
    const parts = suiteName.split(' - ');
    return parts[0];
  };

  // Get unique high-level categories
  const uniqueCategories = [...new Set(testResults.map(test => getHighLevelCategory(test.suite)))].filter(Boolean).sort();

  // Filter suites based on selected category
  const filteredSuites = selectedCategory 
    ? testResults.filter(test => getHighLevelCategory(test.suite) === selectedCategory).map(test => test.suite)
    : testResults.map(test => test.suite);
  
  const uniqueSuites = [...new Set(filteredSuites)].filter(Boolean).sort();

  // Reset suite selection when category changes
  const handleCategoryChange = (category) => {
    setSelectedCategory(category);
    setSelectedSuite(''); // Clear suite selection when category changes
  };

  // Filter tests by category, suite, and failed status
  const filteredTests = testResults.filter(test => {
    // Filter by category if one is selected
    if (selectedCategory && getHighLevelCategory(test.suite) !== selectedCategory) return false;
    
    // Filter by suite if one is selected
    if (selectedSuite && test.suite !== selectedSuite) return false;
    
    // Filter by failed status if enabled
    if (showFailedOnly && test.status !== 'failed') return false;
    
    return true;
  });

  const totalTests = testResults.length;
  const passedTests = testResults.filter(t => t.status === 'passed').length;
  const failedTests = testResults.filter(t => t.status === 'failed').length;
  const runningTestsCount = runningTests.size;

  // Extract failed tests data for debugging
  const extractFailedTests = () => {
    const failedTests = filteredTests.filter(test => test.status === 'failed');
    
    const extractedData = failedTests.map(test => ({
      testRef: test.testRef || 'N/A',
      testId: test.id,
      suite: test.suite,
      name: test.name,
      description: test.description,
      expectedBehavior: test.expectedBehavior,
      error: test.error,
      lastRun: test.lastRun,
      duration: test.duration
    }));

    // Format for Claude Code analysis
    const formattedOutput = `## Failed Tests Analysis Request

**Context**: ${failedTests.length} failed tests extracted from Test Dashboard
**Filters Applied**: Category="${selectedCategory || 'All'}", Suite="${selectedSuite || 'All'}", Failed Only=${showFailedOnly}

### Failed Tests Data:

${extractedData.map(test => `
**${test.testRef}: ${test.suite} - ${test.name}**
- Test ID: ${test.testId}
- Description: ${test.description}
- Expected: ${test.expectedBehavior}
- Error: ${test.error || 'No error message'}
- Last Run: ${test.lastRun ? new Date(test.lastRun).toLocaleString() : 'Never'}
- Duration: ${test.duration ? test.duration + 'ms' : 'N/A'}
`).join('\n')}

### Summary:
- Total Failed: ${failedTests.length}
- Most Common Errors: ${getMostCommonErrors(extractedData)}
- Test Suites Affected: ${[...new Set(extractedData.map(t => t.suite))].join(', ')}

Please analyze these failures and provide fixes for the most critical issues.`;

    return formattedOutput;
  };

  // Helper to identify most common error patterns
  const getMostCommonErrors = (tests) => {
    const errorCounts = {};
    tests.forEach(test => {
      if (test.error) {
        const errorType = test.error.split(' ')[0]; // First word of error
        errorCounts[errorType] = (errorCounts[errorType] || 0) + 1;
      }
    });
    
    return Object.entries(errorCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([error, count]) => `${error}(${count})`)
      .join(', ') || 'Various';
  };

  // Copy to clipboard and show notification
  const copyFailedTestsToClipboard = async () => {
    const data = extractFailedTests();
    
    try {
      await navigator.clipboard.writeText(data);
      alert(`Copied ${filteredTests.filter(t => t.status === 'failed').length} failed tests to clipboard!\n\nYou can now paste this data to Claude Code for analysis.`);
    } catch (err) {
      // Fallback for browsers that don't support clipboard API
      const textArea = document.createElement('textarea');
      textArea.value = data;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      alert(`Copied ${filteredTests.filter(t => t.status === 'failed').length} failed tests to clipboard!\n\nYou can now paste this data to Claude Code for analysis.`);
    }
  };

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
            onClick={copyFailedTestsToClipboard}
            disabled={filteredTests.filter(t => t.status === 'failed').length === 0}
            className="btn-secondary"
            title="Copy failed test details to clipboard for Claude Code analysis"
          >
            📋 Export Failed ({filteredTests.filter(t => t.status === 'failed').length})
          </button>
          <button 
            onClick={refreshTestList} 
            disabled={isRunning || isRefreshing}
            className="btn-secondary"
            title="Refresh test list without running tests"
          >
            {isRefreshing ? 'Refreshing...' : '🔄 Refresh List'}
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

      <div className="test-filters">
        <div className="test-filter-row">
          <select 
            id="category-filter"
            className="filter-select"
            value={selectedCategory}
            onChange={(e) => handleCategoryChange(e.target.value)}
          >
            <option value="">All Categories ({totalTests} tests)</option>
            {uniqueCategories.map(category => {
              const categoryTestCount = testResults.filter(test => getHighLevelCategory(test.suite) === category).length;
              return (
                <option key={category} value={category}>
                  {category} ({categoryTestCount} tests)
                </option>
              );
            })}
          </select>
          
          <select 
            id="suite-filter"
            className="filter-select"
            value={selectedSuite}
            onChange={(e) => setSelectedSuite(e.target.value)}
            disabled={!selectedCategory && uniqueSuites.length > 20} // Disable if too many options and no category selected
          >
            <option value="">
              {selectedCategory 
                ? `All ${selectedCategory} Suites` 
                : `All Suites`} ({selectedCategory 
                  ? testResults.filter(test => getHighLevelCategory(test.suite) === selectedCategory).length
                  : totalTests} tests)
            </option>
            {uniqueSuites.map(suite => {
              const suiteTestCount = testResults.filter(test => test.suite === suite).length;
              return (
                <option key={suite} value={suite}>
                  {suite} ({suiteTestCount} tests)
                </option>
              );
            })}
          </select>
        </div>
      </div>

      <div className="unified-tests-table">
        <table className="tests-table">
          <thead>
            <tr>
              <th>Ref</th>
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
                  <td className="ref-cell">
                    <span className="test-ref" style={{ fontSize: '11px', color: '#888', fontFamily: 'monospace' }} title={`Test ID: ${test.id}`}>
                      {test.testRef || 'N/A'}
                    </span>
                  </td>
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
                        Error: {formatError(test.error).substring(0, 150)}
                        {formatError(test.error).length > 150 ? '...' : ''}
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