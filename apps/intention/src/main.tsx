import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
// Self-hosted Latin subsets: Unbounded light for the headline and score, Inter Tight for everything else.
import '@fontsource/unbounded/latin-300.css';
import '@fontsource/inter-tight/latin-400.css';
import '@fontsource/inter-tight/latin-500.css';
import '@fontsource/inter-tight/latin-600.css';
import { App } from './App';
import './styles.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
