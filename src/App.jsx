import React from 'react';
import { AccountingProvider } from './contexts/AccountingContext';
import { LanguageProvider } from './contexts/LanguageContext';
import { LogProvider } from './contexts/LogContext';
import Dashboard from './components/Dashboard';
import ErrorBoundary from './components/ErrorBoundary';
import './utils/errorHandler'; // Initialize global error handling
import './App.css';

function App() {
  return (
    <ErrorBoundary name="AppErrorBoundary" showDetails={true}>
      <LanguageProvider>
        <AccountingProvider>
          <LogProvider>
            <ErrorBoundary name="DashboardErrorBoundary">
              <div className="App">
                <main>
                  <Dashboard />
                </main>
              </div>
            </ErrorBoundary>
          </LogProvider>
        </AccountingProvider>
      </LanguageProvider>
    </ErrorBoundary>
  );
}

export default App
