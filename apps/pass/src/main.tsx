import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { pass } from './lib/pass-state';
import './styles.css';

// A pass saved on this device: use the last answer at once, ask the service again when it is a day old.
void pass.start();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
