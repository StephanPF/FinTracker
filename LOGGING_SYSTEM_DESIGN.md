# Logging System Implementation Design

## Overview
A comprehensive client-side logging system with a modal interface for viewing, filtering, and managing logs in real-time.

## Architecture

### 1. Core Logging Infrastructure

#### Logger Service (`src/utils/logger.js`)
```javascript
class Logger {
  constructor() {
    this.logs = [];
    this.maxLogs = 1000; // Prevent memory issues
    this.listeners = [];
  }

  log(level, message, context = {}) {
    const logEntry = {
      id: Date.now() + Math.random(),
      timestamp: new Date(),
      level,
      message,
      context,
      source: this.getCallerInfo()
    };

    this.addLog(logEntry);
    this.notifyListeners();
  }

  // Convenience methods
  debug(message, context) { this.log('DEBUG', message, context); }
  info(message, context) { this.log('INFO', message, context); }
  warn(message, context) { this.log('WARN', message, context); }
  error(message, context) { this.log('ERROR', message, context); }
}
```

#### Log Context Provider (`src/contexts/LogContext.jsx`)
```javascript
const LogContext = createContext();

export const LogProvider = ({ children }) => {
  const [logs, setLogs] = useState([]);
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);

  // Real-time log updates
  useEffect(() => {
    const unsubscribe = logger.subscribe((newLogs) => {
      setLogs(newLogs);
    });
    return unsubscribe;
  }, []);

  return (
    <LogContext.Provider value={{
      logs,
      isLogModalOpen,
      setIsLogModalOpen,
      logger
    }}>
      {children}
    </LogContext.Provider>
  );
};
```

### 2. UI Components

#### Log Icon in Header (`src/components/LogButton.jsx`)
```javascript
const LogButton = () => {
  const { setIsLogModalOpen, logs } = useContext(LogContext);

  // Show badge for new errors/warnings
  const errorCount = logs.filter(log =>
    log.level === 'ERROR' && !log.read
  ).length;

  return (
    <button
      className="log-button"
      onClick={() => setIsLogModalOpen(true)}
      title="View Application Logs"
    >
      <FileTextIcon />
      {errorCount > 0 && (
        <span className="error-badge">{errorCount}</span>
      )}
    </button>
  );
};
```

#### Log Modal (`src/components/LogModal.jsx`)
```javascript
const LogModal = () => {
  const { logs, isLogModalOpen, setIsLogModalOpen } = useContext(LogContext);
  const [filters, setFilters] = useState({
    level: 'ALL',
    search: '',
    timeRange: '1h'
  });
  const [autoScroll, setAutoScroll] = useState(true);

  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      // Apply filters
      if (filters.level !== 'ALL' && log.level !== filters.level) return false;
      if (filters.search && !log.message.toLowerCase().includes(filters.search.toLowerCase())) return false;
      // Time range filtering
      return true;
    }).sort((a, b) => b.timestamp - a.timestamp);
  }, [logs, filters]);

  return (
    <Modal isOpen={isLogModalOpen} onClose={() => setIsLogModalOpen(false)}>
      <div className="log-modal">
        <LogFilters filters={filters} setFilters={setFilters} />
        <LogList logs={filteredLogs} autoScroll={autoScroll} />
        <LogActions logs={filteredLogs} />
      </div>
    </Modal>
  );
};
```

#### Log Entry Component (`src/components/LogEntry.jsx`)
```javascript
const LogEntry = ({ log }) => {
  const [expanded, setExpanded] = useState(false);

  const levelColors = {
    DEBUG: '#6b7280',
    INFO: '#3b82f6',
    WARN: '#f59e0b',
    ERROR: '#ef4444'
  };

  return (
    <div className={`log-entry log-${log.level.toLowerCase()}`}>
      <div className="log-header" onClick={() => setExpanded(!expanded)}>
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
        {Object.keys(log.context).length > 0 && (
          <ChevronDownIcon className={expanded ? 'rotated' : ''} />
        )}
      </div>

      {expanded && (
        <div className="log-details">
          <div className="log-source">Source: {log.source}</div>
          {Object.keys(log.context).length > 0 && (
            <pre className="log-context">
              {JSON.stringify(log.context, null, 2)}
            </pre>
          )}
        </div>
      )}
    </div>
  );
};
```

### 3. Integration Points

#### Global Error Handling
```javascript
// src/utils/errorHandler.js
window.addEventListener('error', (event) => {
  logger.error('Uncaught Error', {
    message: event.message,
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno,
    stack: event.error?.stack
  });
});

window.addEventListener('unhandledrejection', (event) => {
  logger.error('Unhandled Promise Rejection', {
    reason: event.reason,
    promise: event.promise
  });
});
```

#### API Integration
```javascript
// src/utils/api.js - Enhanced with logging
const apiCall = async (url, options) => {
  const requestId = generateId();

  logger.debug('API Request', {
    requestId,
    url,
    method: options.method,
    headers: options.headers
  });

  try {
    const response = await fetch(url, options);

    if (!response.ok) {
      logger.warn('API Error Response', {
        requestId,
        status: response.status,
        statusText: response.statusText
      });
    } else {
      logger.info('API Success', {
        requestId,
        status: response.status
      });
    }

    return response;
  } catch (error) {
    logger.error('API Request Failed', {
      requestId,
      error: error.message,
      stack: error.stack
    });
    throw error;
  }
};
```

## Features

### 1. Log Levels & Filtering
- **DEBUG**: Development info, variable states
- **INFO**: Normal operations, user actions
- **WARN**: Recoverable issues, deprecated usage
- **ERROR**: Exceptions, API failures, critical issues

### 2. Advanced Filtering
- **Level Filter**: Show only specific log levels
- **Search**: Text search across messages and context
- **Time Range**: Last 1h, 6h, 24h, or custom range
- **Source Filter**: Filter by component/module

### 3. Log Management
- **Auto-scroll**: Follow new logs in real-time
- **Export**: Download logs as JSON/CSV
- **Clear**: Remove old logs (with confirmation)
- **Persistence**: Store logs in localStorage (configurable retention)

### 4. Performance Considerations
- **Circular Buffer**: Limit memory usage with max log count
- **Lazy Rendering**: Virtualize log list for large datasets
- **Debounced Updates**: Batch log updates to prevent UI freezing
- **Context Truncation**: Limit context object size

## File Structure
```
src/
├── components/
│   ├── LogButton.jsx
│   ├── LogModal.jsx
│   ├── LogEntry.jsx
│   ├── LogFilters.jsx
│   └── LogActions.jsx
├── contexts/
│   └── LogContext.jsx
├── utils/
│   ├── logger.js
│   ├── errorHandler.js
│   └── logStorage.js
└── styles/
    └── logging.css
```

## CSS Classes & Styling
```css
.log-button {
  position: relative;
  padding: 8px;
  border-radius: 6px;
  transition: all 0.2s;
}

.log-modal {
  width: 90vw;
  height: 80vh;
  max-width: 1200px;
  display: flex;
  flex-direction: column;
}

.log-entry {
  border-bottom: 1px solid #e5e7eb;
  padding: 8px 12px;
}

.log-entry.log-error {
  border-left: 4px solid #ef4444;
  background-color: #fef2f2;
}

.log-entry.log-warn {
  border-left: 4px solid #f59e0b;
  background-color: #fffbeb;
}

.log-filters {
  display: flex;
  gap: 12px;
  padding: 16px;
  border-bottom: 1px solid #e5e7eb;
}
```

## Usage Examples

### Basic Logging
```javascript
import { useLogger } from '../contexts/LogContext';

const MyComponent = () => {
  const logger = useLogger();

  const handleSave = async () => {
    try {
      logger.info('Starting save operation');
      await saveData();
      logger.info('Save completed successfully');
    } catch (error) {
      logger.error('Save failed', { error: error.message });
    }
  };
};
```

### Structured Logging
```javascript
logger.info('User Action', {
  action: 'transaction_created',
  userId: user.id,
  amount: transaction.amount,
  account: transaction.account.name
});

logger.debug('Component State', {
  component: 'AccountSummary',
  state: { loading, error, data }
});
```

## Implementation Priority

### Phase 1 (Core)
1. Logger service with basic levels
2. Log context provider
3. Simple log button in header
4. Basic modal with log list

### Phase 2 (Enhanced)
1. Filtering and search
2. Log persistence
3. Export functionality
4. Global error handling

### Phase 3 (Advanced)
1. Performance optimizations
2. Log aggregation/grouping
3. Log retention policies
4. Advanced analytics

## Configuration Options
```javascript
const loggerConfig = {
  maxLogs: 1000,
  persistLogs: true,
  retentionDays: 7,
  enabledLevels: ['INFO', 'WARN', 'ERROR'], // Disable DEBUG in production
  enableSourceTracking: true,
  autoExportErrors: true
};
```

This design provides a comprehensive, scalable logging solution that integrates seamlessly with your existing application while providing powerful debugging and monitoring capabilities.