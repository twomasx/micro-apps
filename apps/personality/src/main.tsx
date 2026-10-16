import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { pass } from './lib/pass-state.ts';
import '@fontsource-variable/inter-tight/wght.css';
import './base.css';
import './styles/intro.css';
import './styles/test.css';
import './styles/result.css';
import './styles/report.css';
import './styles/compare.css';
import './styles/info.css';

// The all-app pass: take a one-time token off the address at once, use the saved answer, ask again when due.
void pass.start();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
