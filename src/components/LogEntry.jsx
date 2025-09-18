import React, { useState } from 'react';

const LogEntry = ({ log }) => {
  const [expanded, setExpanded] = useState(false);

  const levelColors = {
    DEBUG: '#6b7280',
    INFO: '#3b82f6',
    WARN: '#f59e0b',
    ERROR: '#ef4444'
  };

  const formatTimestamp = (timestamp) => {
    return timestamp.toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      fractionalSecondDigits: 3
    });
  };

  const hasContext = log.context && Object.keys(log.context).length > 0;

  return (
    <div className={`log-entry log-${log.level.toLowerCase()}`}>
      <div
        className="log-header"
        onClick={() => hasContext && setExpanded(!expanded)}
        style={{ cursor: hasContext ? 'pointer' : 'default' }}
      >
        <span
          className="log-level"
          style={{ color: levelColors[log.level] }}
        >
          {log.level}
        </span>
        <span className="log-timestamp">
          {formatTimestamp(log.timestamp)}
        </span>
        <span className="log-message">{log.message}</span>
        <span className="log-source">{log.source}</span>
        {hasContext && (
          <svg
            className={`log-expand-icon ${expanded ? 'rotated' : ''}`}
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        )}
      </div>

      {expanded && hasContext && (
        <div className="log-details">
          <pre className="log-context">
            {JSON.stringify(log.context, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
};

export default LogEntry;