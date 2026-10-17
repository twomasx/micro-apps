import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/cormorant/latin-400.css';
import '@fontsource-variable/manrope/wght.css';
import { App } from './App';
import { pass } from './lib/pass-state';
import './base.css';

// A pass link can open any page, not only the player: take its one-time ?passToken= off the address at once.
void pass.start();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
