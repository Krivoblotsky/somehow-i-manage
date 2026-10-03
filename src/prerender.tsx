import { StrictMode } from 'react';
import { renderToString } from 'react-dom/server';
import App from './App';

/**
 * The HTML a crawler (or a first-time visitor, before JavaScript) gets: the landing page as the
 * app renders it for a newcomer. scripts/prerender.mjs writes it into dist/index.html, and
 * main.tsx hydrates it instead of starting from an empty root.
 */
export function render(): string {
  return renderToString(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}
