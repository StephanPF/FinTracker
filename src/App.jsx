import React from 'react';
import { AccountingProvider } from './contexts/AccountingContext';
import { LanguageProvider } from './contexts/LanguageContext';
import Dashboard from './components/Dashboard';
import './App.css';

function App() {
  return (
    <LanguageProvider>
      <AccountingProvider>
        <div className="App">
          <main>
            <Dashboard />
          </main>
        </div>
      </AccountingProvider>
    </LanguageProvider>
  );
}

export default App
