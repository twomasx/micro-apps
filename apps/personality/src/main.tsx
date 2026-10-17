import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { preloadIntroState } from './lib/intro-state.ts';
import { parseRoute } from './lib/router.ts';
import { pass } from './lib/pass-state.ts';
import '@fontsource-variable/inter-tight/wght.css';
import './base.css';
import './styles/intro.css';
import './styles/test.css';
import './styles/result.css';
import './styles/report.css';
import './styles/compare.css';
import './styles/info.css';
import './styles/pass.css';

// The all-app pass: take a one-time token off the address at once, use the saved answer, ask again when due.
void pass.start();

// The intro shows what this device has saved. Reading it first lets the first render draw the final screen:
// the page the server sent for a first visit, or a returning visitor's own state, never one and then the other.
const start = parseRoute(window.location.pathname, window.location.search, import.meta.env.BASE_URL);
const ready = start.name === 'intro' ? preloadIntroState(start.withId) : Promise.resolve();

void ready.then(() =>
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  ),
);
