import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App.tsx';
import { applyThemeToDocument, getInitialTheme } from './hooks/useTheme.ts';
import './index.css';

applyThemeToDocument(getInitialTheme());

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // Ignore SW registration failure in restricted environments
    });
  });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
