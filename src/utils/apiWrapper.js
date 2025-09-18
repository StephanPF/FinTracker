import logger from './logger';
import errorHandler from './errorHandler';

// Enhanced fetch wrapper that logs all API calls and errors
export const apiCall = async (url, options = {}) => {
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const startTime = performance.now();

  // Log the request
  logger.info('API Request Started', {
    requestId,
    url,
    method: options.method || 'GET',
    headers: options.headers ? Object.keys(options.headers) : undefined,
    hasBody: !!options.body,
    type: 'api-request'
  });

  try {
    const response = await fetch(url, {
      ...options,
      // Add default headers
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    });

    const duration = performance.now() - startTime;

    if (!response.ok) {
      // Log API error responses
      const errorData = {
        requestId,
        url,
        method: options.method || 'GET',
        status: response.status,
        statusText: response.statusText,
        duration: `${Math.round(duration)}ms`,
        type: 'api-error'
      };

      // Try to get response body for error details
      try {
        const errorBody = await response.clone().text();
        errorData.responseBody = errorBody;
      } catch (bodyError) {
        errorData.bodyReadError = bodyError.message;
      }

      logger.error('API Request Failed', errorData);

      // Also report to error handler
      errorHandler.reportAPIError(url, response.status, response, {
        requestId,
        duration,
        method: options.method || 'GET'
      });
    } else {
      // Log successful API responses
      logger.info('API Request Completed', {
        requestId,
        url,
        method: options.method || 'GET',
        status: response.status,
        duration: `${Math.round(duration)}ms`,
        type: 'api-success'
      });

      // Log performance warnings for slow requests
      if (duration > 2000) {
        logger.warn('Slow API Request', {
          requestId,
          url,
          duration: `${Math.round(duration)}ms`,
          threshold: '2000ms',
          type: 'api-performance'
        });
      }
    }

    return response;
  } catch (error) {
    const duration = performance.now() - startTime;

    // Log network/connection errors
    logger.error('API Network Error', {
      requestId,
      url,
      method: options.method || 'GET',
      error: error.message,
      duration: `${Math.round(duration)}ms`,
      type: 'api-network-error'
    });

    // Report to error handler
    errorHandler.reportAPIError(url, 0, error, {
      requestId,
      duration,
      method: options.method || 'GET',
      networkError: true
    });

    throw error; // Re-throw to maintain original behavior
  }
};

// Convenience methods for different HTTP verbs
export const get = (url, options = {}) =>
  apiCall(url, { ...options, method: 'GET' });

export const post = (url, data, options = {}) =>
  apiCall(url, {
    ...options,
    method: 'POST',
    body: JSON.stringify(data)
  });

export const put = (url, data, options = {}) =>
  apiCall(url, {
    ...options,
    method: 'PUT',
    body: JSON.stringify(data)
  });

export const del = (url, options = {}) =>
  apiCall(url, { ...options, method: 'DELETE' });

// Wrapper for async operations with error logging
export const withErrorLogging = (operation, context = {}) => {
  return errorHandler.wrapAsync(operation, context);
};

// Wrapper for sync operations with error logging
export const withSyncErrorLogging = (operation, context = {}) => {
  return errorHandler.wrapSync(operation, context);
};

// Performance monitoring wrapper
export const withPerformanceLogging = (fn, operationName, threshold = 1000) => {
  return async (...args) => {
    const startTime = performance.now();
    try {
      const result = await fn.apply(this, args);
      const duration = performance.now() - startTime;

      errorHandler.reportPerformanceIssue(
        operationName,
        duration,
        threshold,
        { args: args.length > 0 ? args : undefined }
      );

      return result;
    } catch (error) {
      const duration = performance.now() - startTime;

      logger.error('Operation Failed', {
        operation: operationName,
        duration: `${Math.round(duration)}ms`,
        error: error.message,
        stack: error.stack,
        type: 'operation-error'
      });

      throw error;
    }
  };
};

export default {
  apiCall,
  get,
  post,
  put,
  del,
  withErrorLogging,
  withSyncErrorLogging,
  withPerformanceLogging
};