import logger from './logger';

class ErrorHandler {
  constructor() {
    this.setupGlobalErrorHandling();
    this.setupConsoleInterception();
  }

  setupGlobalErrorHandling() {
    // Catch uncaught JavaScript errors
    window.addEventListener('error', (event) => {
      logger.error('Uncaught JavaScript Error', {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        stack: event.error?.stack,
        type: 'uncaught-error',
        timestamp: new Date().toISOString()
      });
    });

    // Catch unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      logger.error('Unhandled Promise Rejection', {
        reason: event.reason,
        promise: event.promise,
        stack: event.reason?.stack,
        type: 'unhandled-rejection',
        timestamp: new Date().toISOString()
      });

      // Prevent the default browser error handling
      event.preventDefault();
    });

    // Catch resource loading errors (images, scripts, etc.)
    window.addEventListener('error', (event) => {
      if (event.target !== window) {
        logger.error('Resource Loading Error', {
          type: 'resource-error',
          element: event.target.tagName,
          source: event.target.src || event.target.href,
          timestamp: new Date().toISOString()
        });
      }
    }, true); // Use capture phase
  }

  setupConsoleInterception() {
    // Store original console methods
    const originalError = console.error;
    const originalWarn = console.warn;

    // Override console.error to also log to our system
    console.error = (...args) => {
      // Call original console.error first
      originalError.apply(console, args);

      // Log to our system
      const message = args.map(arg =>
        typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
      ).join(' ');

      logger.error('Console Error', {
        message,
        args: args.length > 1 ? args : undefined,
        type: 'console-error',
        timestamp: new Date().toISOString(),
        stack: new Error().stack
      });
    };

    // Override console.warn to also log to our system
    console.warn = (...args) => {
      // Call original console.warn first
      originalWarn.apply(console, args);

      // Log to our system
      const message = args.map(arg =>
        typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
      ).join(' ');

      logger.warn('Console Warning', {
        message,
        args: args.length > 1 ? args : undefined,
        type: 'console-warn',
        timestamp: new Date().toISOString(),
        stack: new Error().stack
      });
    };
  }

  // Method to manually report errors
  reportError(error, context = {}) {
    logger.error('Manual Error Report', {
      message: error.message,
      stack: error.stack,
      name: error.name,
      context,
      type: 'manual-report',
      timestamp: new Date().toISOString()
    });
  }

  // Method to report API errors
  reportAPIError(url, status, response, context = {}) {
    logger.error('API Error', {
      url,
      status,
      statusText: response?.statusText,
      response: typeof response === 'object' ? response : { data: response },
      context,
      type: 'api-error',
      timestamp: new Date().toISOString()
    });
  }

  // Method to report user action errors
  reportUserError(action, error, context = {}) {
    logger.error('User Action Error', {
      action,
      message: error.message,
      stack: error.stack,
      context,
      type: 'user-action-error',
      timestamp: new Date().toISOString()
    });
  }

  // Method to report performance issues
  reportPerformanceIssue(operation, duration, threshold = 1000, context = {}) {
    if (duration > threshold) {
      logger.warn('Performance Issue', {
        operation,
        duration: `${duration}ms`,
        threshold: `${threshold}ms`,
        context,
        type: 'performance-issue',
        timestamp: new Date().toISOString()
      });
    }
  }

  // Method to wrap async functions with error handling
  wrapAsync(fn, context = {}) {
    return async (...args) => {
      try {
        return await fn.apply(this, args);
      } catch (error) {
        this.reportError(error, {
          ...context,
          functionName: fn.name,
          arguments: args.length > 0 ? args : undefined
        });
        throw error; // Re-throw to maintain original behavior
      }
    };
  }

  // Method to wrap sync functions with error handling
  wrapSync(fn, context = {}) {
    return (...args) => {
      try {
        return fn.apply(this, args);
      } catch (error) {
        this.reportError(error, {
          ...context,
          functionName: fn.name,
          arguments: args.length > 0 ? args : undefined
        });
        throw error; // Re-throw to maintain original behavior
      }
    };
  }
}

// Create singleton instance
const errorHandler = new ErrorHandler();

export default errorHandler;