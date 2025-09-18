import React, { createContext, useContext, useState, useEffect } from 'react';
import logger from '../utils/logger';

const LogContext = createContext();

export const LogProvider = ({ children }) => {
  const [logs, setLogs] = useState([]);
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);

  useEffect(() => {
    const unsubscribe = logger.subscribe((newLogs) => {
      setLogs(newLogs);
    });

    setLogs(logger.getLogs());

    return unsubscribe;
  }, []);

  const value = {
    logs,
    isLogModalOpen,
    setIsLogModalOpen,
    logger,
    clearLogs: () => {
      logger.clearLogs();
    },
    markLogsAsRead: (logIds) => {
      logger.markAsRead(logIds);
    }
  };

  return (
    <LogContext.Provider value={value}>
      {children}
    </LogContext.Provider>
  );
};

export const useLog = () => {
  const context = useContext(LogContext);
  if (!context) {
    throw new Error('useLog must be used within a LogProvider');
  }
  return context;
};

export default LogContext;