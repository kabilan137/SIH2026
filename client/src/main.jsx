import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Analytics } from '@vercel/analytics/react';

import App from './App.jsx';
import { AnalysisProvider } from './context/AnalysisContext.jsx';
import './styles/main.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AnalysisProvider>
        <App />
        <Analytics />
      </AnalysisProvider>
    </BrowserRouter>
  </React.StrictMode>
);