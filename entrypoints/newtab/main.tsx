import React from 'react';
import ReactDOM from 'react-dom/client';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { NewTabGate } from '@/components/NewTabGate';
import './style.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <NewTabGate />
    </ErrorBoundary>
  </React.StrictMode>,
);
