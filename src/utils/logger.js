class Logger {
  constructor() {
    this.logs = [];
    this.maxLogs = 1000;
    this.listeners = [];
    this.persistenceDays = 7;
    this.loadPersistedLogs();
  }

  addLog(logEntry) {
    this.logs.unshift(logEntry);

    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(0, this.maxLogs);
    }

    this.persistLogs();
  }

  getCallerInfo() {
    try {
      const stack = new Error().stack;
      const stackLines = stack.split('\n');
      const callerLine = stackLines[4] || stackLines[3] || 'unknown';

      const match = callerLine.match(/at\s+(.+?)\s+\((.+?):(\d+):(\d+)\)/);
      if (match) {
        const [, functionName, filename, line, column] = match;
        const shortFilename = filename.split('/').pop() || filename.split('\\').pop();
        return `${shortFilename}:${line}`;
      }

      return 'unknown';
    } catch (error) {
      return 'unknown';
    }
  }

  log(level, message, context = {}) {
    const logEntry = {
      id: Date.now() + Math.random(),
      timestamp: new Date(),
      level,
      message,
      context,
      source: this.getCallerInfo(),
      read: false
    };

    this.addLog(logEntry);
    this.notifyListeners();
  }

  debug(message, context = {}) {
    this.log('DEBUG', message, context);
  }

  info(message, context = {}) {
    this.log('INFO', message, context);
  }

  warn(message, context = {}) {
    this.log('WARN', message, context);
  }

  error(message, context = {}) {
    this.log('ERROR', message, context);
  }

  subscribe(listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  notifyListeners() {
    this.listeners.forEach(listener => {
      try {
        listener([...this.logs]);
      } catch (error) {
        console.error('Error notifying log listener:', error);
      }
    });
  }

  getLogs() {
    return [...this.logs];
  }

  clearLogs() {
    this.logs = [];
    this.persistLogs();
    this.notifyListeners();
  }

  markAsRead(logIds) {
    this.logs.forEach(log => {
      if (logIds.includes(log.id)) {
        log.read = true;
      }
    });
    this.persistLogs();
    this.notifyListeners();
  }

  loadPersistedLogs() {
    try {
      const stored = localStorage.getItem('appLogs');
      if (stored) {
        const parsedLogs = JSON.parse(stored);
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - this.persistenceDays);

        this.logs = parsedLogs
          .map(log => ({
            ...log,
            timestamp: new Date(log.timestamp)
          }))
          .filter(log => log.timestamp >= cutoffDate)
          .slice(0, this.maxLogs);
      }
    } catch (error) {
      console.warn('Failed to load persisted logs:', error);
      this.logs = [];
    }
  }

  persistLogs() {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - this.persistenceDays);

      const logsToStore = this.logs
        .filter(log => log.timestamp >= cutoffDate)
        .slice(0, this.maxLogs);

      localStorage.setItem('appLogs', JSON.stringify(logsToStore));
    } catch (error) {
      console.warn('Failed to persist logs:', error);
    }
  }

  exportLogs(format = 'json') {
    const data = {
      exportDate: new Date().toISOString(),
      totalLogs: this.logs.length,
      logs: this.logs
    };

    if (format === 'json') {
      return JSON.stringify(data, null, 2);
    } else if (format === 'csv') {
      const headers = ['Timestamp', 'Level', 'Message', 'Source', 'Context'];
      const csvRows = [headers.join(',')];

      this.logs.forEach(log => {
        const row = [
          log.timestamp.toISOString(),
          log.level,
          `"${log.message.replace(/"/g, '""')}"`,
          log.source,
          `"${JSON.stringify(log.context).replace(/"/g, '""')}"`
        ];
        csvRows.push(row.join(','));
      });

      return csvRows.join('\n');
    }

    return JSON.stringify(data, null, 2);
  }

  downloadLogs(format = 'json') {
    const content = this.exportLogs(format);
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    const filename = `app-logs-${timestamp}.${format}`;

    const blob = new Blob([content], {
      type: format === 'json' ? 'application/json' : 'text/csv'
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}

const logger = new Logger();

export default logger;