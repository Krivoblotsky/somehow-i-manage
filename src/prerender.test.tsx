import { renderToString } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { LandingPage } from './components/LandingPage';
import type { SyncActions } from './sync/controller';

const actions: SyncActions = {
  signInWithGoogle: vi.fn(async () => {}),
  signInWithMicrosoft: vi.fn(async () => {}),
  signInWithPasskey: vi.fn(async () => {}),
  registerPasskey: vi.fn(async () => ({ id: 'p', createdAt: 0 })),
  listPasskeys: vi.fn(async () => []),
  deletePasskey: vi.fn(async () => {}),
  signOut: vi.fn(async () => {}),
  syncNow: vi.fn(async () => {}),
};

/** What scripts/prerender.mjs writes into dist/index.html, rendered the same way. */
describe('pre-render', () => {
  it('renders the landing page to HTML with the FAQ and structured data, browser-only parts left out', () => {
    const html = renderToString(<LandingPage actions={actions} />);
    expect(html).toContain('<h1');
    expect(html).toContain('Work with people');
    expect(html).toContain('What is Somehow I Manage?');
    expect(html).toContain('application/ld+json');
    expect(html).toContain('"@type":"FAQPage"');
    // nothing that needs a browser leaks into the first render
    expect(html).not.toContain('Sign in with a passkey');
    expect(html).not.toContain('people-map');
  });
});
