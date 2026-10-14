import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/cormorant/latin-400.css';
import '@fontsource-variable/manrope/wght.css';
import { App } from './App';
import './base.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
