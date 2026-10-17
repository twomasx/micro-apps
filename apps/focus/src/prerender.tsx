/**
 * Renders a page to HTML at build time, in Node, for the files the server sends (see vite.config.ts and
 * packages/seo). The app replaces this markup with the same markup when it starts.
 */
import { renderToString } from 'react-dom/server';
import { App } from './App';
import { setServerLocation } from './lib/navigation';

export function render(url: string): string {
  setServerLocation(url);
  return renderToString(<App />);
}
