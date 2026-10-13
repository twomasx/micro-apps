import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import '@fontsource-variable/inter-tight/wght.css';
import './base.css';
import './styles/intro.css';
import './styles/test.css';
import './styles/result.css';
import './styles/report.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
