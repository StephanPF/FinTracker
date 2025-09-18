import React, { useEffect, useRef, useState, useMemo } from 'react';
import { useLog } from '../contexts/LogContext';
import LogEntry from './LogEntry';
import LogFilters from './LogFilters';

const LogModal = () => {
  const { logs, isLogModalOpen, setIsLogModalOpen, clearLogs, logger } = useLog();
  const logListRef = useRef(null);
  const [filters, setFilters] = useState({
    level: 'ALL',
    search: '',
    timeRange: 'ALL',
    source: 'ALL'
  });
  const [autoScroll, setAutoScroll] = useState(true);

  useEffect(() => {
    if (autoScroll && logListRef.current) {
      logListRef.current.scrollTop = 0;
    }
  }, [logs, autoScroll]);

  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      // Level filter
      if (filters.level !== 'ALL' && log.level !== filters.level) {
        return false;
      }

      // Search filter
      if (filters.search && !log.message.toLowerCase().includes(filters.search.toLowerCase())) {
        return false;
      }

      // Source filter
      if (filters.source !== 'ALL' && log.source !== filters.source) {
        return false;
      }

      // Time range filter
      if (filters.timeRange !== 'ALL') {
        const now = new Date();
        const logTime = new Date(log.timestamp);
        let cutoff = new Date();

        switch (filters.timeRange) {
          case '1h':
            cutoff.setHours(now.getHours() - 1);
            break;
          case '6h':
            cutoff.setHours(now.getHours() - 6);
            break;
          case '24h':
            cutoff.setDate(now.getDate() - 1);
            break;
          case '7d':
            cutoff.setDate(now.getDate() - 7);
            break;
          default:
            return true;
        }

        return logTime >= cutoff;
      }

      return true;
    });
  }, [logs, filters]);

  if (!isLogModalOpen) return null;

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      setIsLogModalOpen(false);
    }
  };

  const handleClearLogs = () => {
    if (window.confirm('Are you sure you want to clear all logs?')) {
      clearLogs();
    }
  };

  const handleExportJSON = () => {
    logger.downloadLogs('json');
  };

  const handleExportCSV = () => {
    logger.downloadLogs('csv');
  };

  const logStats = {
    total: logs.length,
    filtered: filteredLogs.length,
    debug: logs.filter(log => log.level === 'DEBUG').length,
    info: logs.filter(log => log.level === 'INFO').length,
    warn: logs.filter(log => log.level === 'WARN').length,
    error: logs.filter(log => log.level === 'ERROR').length,
  };

  return (
    <div className="log-modal-overlay" onClick={handleOverlayClick}>
      <div className="log-modal">
        <div className="log-modal-header">
          <h2>Application Logs</h2>
          <div className="log-stats">
            <span className="log-stat">Total: {logStats.total}</span>
            {logStats.filtered !== logStats.total && (
              <span className="log-stat">Filtered: {logStats.filtered}</span>
            )}
            <span className="log-stat log-stat-debug">Debug: {logStats.debug}</span>
            <span className="log-stat log-stat-info">Info: {logStats.info}</span>
            <span className="log-stat log-stat-warn">Warn: {logStats.warn}</span>
            <span className="log-stat log-stat-error">Error: {logStats.error}</span>
          </div>
          <div className="log-modal-actions">
            <div className="log-export-group">
              <button
                className="log-export-button"
                onClick={handleExportJSON}
                disabled={logs.length === 0}
                title="Export logs as JSON"
              >
                JSON
              </button>
              <button
                className="log-export-button"
                onClick={handleExportCSV}
                disabled={logs.length === 0}
                title="Export logs as CSV"
              >
                CSV
              </button>
            </div>
            <label className="log-autoscroll-toggle">
              <input
                type="checkbox"
                checked={autoScroll}
                onChange={(e) => setAutoScroll(e.target.checked)}
              />
              Auto-scroll
            </label>
            <button
              className="log-clear-button"
              onClick={handleClearLogs}
              disabled={logs.length === 0}
            >
              Clear
            </button>
            <button
              className="log-close-button"
              onClick={() => setIsLogModalOpen(false)}
            >
              ×
            </button>
          </div>
        </div>

        <LogFilters
          filters={filters}
          setFilters={setFilters}
          logs={logs}
        />

        <div className="log-modal-body">
          {logs.length === 0 ? (
            <div className="log-empty-state">
              <p>No logs to display</p>
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="log-empty-state">
              <p>No logs match the current filters</p>
            </div>
          ) : (
            <div className="log-list" ref={logListRef}>
              {filteredLogs.map((log) => (
                <LogEntry key={log.id} log={log} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LogModal;