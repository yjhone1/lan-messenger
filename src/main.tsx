import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';
import { loadAppThemeFromStorage } from './utils/i18n';

// Initialize 'data-app-theme' from localStorage immediately when the application loads
loadAppThemeFromStorage();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
