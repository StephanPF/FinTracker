import React from 'react';
import logger from '../utils/logger';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log the error to our logging system
    logger.error('React Component Error', {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      errorBoundary: this.props.name || 'UnnamedErrorBoundary',
      type: 'react-error',
      timestamp: new Date().toISOString(),
      props: this.props.logProps ? this.props : undefined
    });

    // Store error info in state for potential display
    this.setState({
      error,
      errorInfo
    });

    // Call optional error callback
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleRetry = () => {
    logger.info('Error Boundary Retry Attempted', {
      errorBoundary: this.props.name || 'UnnamedErrorBoundary',
      type: 'error-boundary-retry'
    });

    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.handleRetry);
      }

      // Default fallback UI
      return (
        <div className="error-boundary">
          <div className="error-boundary-content">
            <h2>🚨 Something went wrong</h2>
            <p>An unexpected error occurred in this part of the application.</p>

            {this.props.showDetails && this.state.error && (
              <details className="error-details">
                <summary>Error Details</summary>
                <pre className="error-message">
                  {this.state.error.message}
                </pre>
                <pre className="error-stack">
                  {this.state.error.stack}
                </pre>
              </details>
            )}

            <div className="error-boundary-actions">
              <button
                onClick={this.handleRetry}
                className="error-retry-button"
              >
                Try Again
              </button>

              <button
                onClick={() => window.location.reload()}
                className="error-reload-button"
              >
                Reload Page
              </button>
            </div>

            <p className="error-help-text">
              This error has been automatically logged. If the problem persists,
              please check the application logs for more details.
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;