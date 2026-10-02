import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SyncActions } from '../sync/controller';
import { useSync } from '../sync/store';
import { LandingPage } from './LandingPage';

const actions = (): SyncActions => ({
  signInWithGoogle: vi.fn(async () => {}),
  signInWithMicrosoft: vi.fn(async () => {}),
  signInWithPasskey: vi.fn(async () => {}),
  registerPasskey: vi.fn(async () => ({
    id: 'pk1',
    name: 'iCloud Keychain',
    createdAt: Date.now(),
  })),
  listPasskeys: vi.fn(async () => []),
  deletePasskey: vi.fn(async () => {}),
  signOut: vi.fn(async () => {}),
  syncNow: vi.fn(async () => {}),
});

beforeEach(() => {
  useSync.setState({ authError: null });
});

describe('LandingPage', () => {
  it('shows the pitch, the live demo with the sample team, and hands over to Google', async () => {
    const user = userEvent.setup();
    const a = actions();
    render(<LandingPage actions={a} />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'Work with people, not tasks.',
    );
    expect(screen.getByRole('tab', { name: /^1:1 mode/ })).toBeInTheDocument();

    // the real map, live, seeded with the sample team
    const demo = await screen.findByTestId('people-map', {}, { timeout: 8000 });
    expect(
      await within(demo).findByText('Emily Carter', {}, { timeout: 8000 }),
    ).toBeInTheDocument();
    expect(within(demo).getByText('Marcus Johnson')).toBeInTheDocument();

    // the nav's Sign in opens the ways in; picking Google is the same door as the hero button
    await user.click(screen.getByRole('button', { name: 'Sign in' }));
    await user.click(await screen.findByRole('menuitem', { name: 'Continue with Google' }));
    expect(a.signInWithGoogle).toHaveBeenCalledTimes(1);
    // the hero and the final call share the state: both doors show it
    for (const b of await screen.findAllByRole('button', { name: 'Opening Google…' }))
      expect(b).toBeDisabled();
  });

  it('shows the problem and lets you try again', async () => {
    const user = userEvent.setup();
    const a = actions();
    a.signInWithGoogle = vi.fn(async () => {
      throw new Error('Unsupported provider: provider is not enabled');
    });
    render(<LandingPage actions={a} />);
    await user.click(screen.getByRole('button', { name: 'Continue with Google' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('provider is not enabled');
    expect(screen.getByRole('button', { name: 'Continue with Google' })).toBeEnabled();
  });

  it('shows what Google sent back when the round trip failed', () => {
    useSync.setState({ authError: 'access_denied: the user cancelled' });
    render(<LandingPage actions={actions()} />);
    expect(screen.getByRole('alert')).toHaveTextContent('access_denied');
  });

  it('offers a passkey where the browser supports it, and shows what went wrong', async () => {
    const user = userEvent.setup();
    const a = actions();
    a.signInWithPasskey = vi.fn(async () => {
      throw new Error('No passkey was used — the prompt was closed or timed out.');
    });
    vi.stubGlobal('PublicKeyCredential', class {});
    render(<LandingPage actions={a} />);
    await user.click(screen.getByRole('button', { name: 'Sign in with a passkey' }));
    expect(a.signInWithPasskey).toHaveBeenCalledTimes(1);
    expect(await screen.findByRole('alert')).toHaveTextContent('prompt was closed');
    vi.unstubAllGlobals();
  });

  it('hides the passkey button when the browser has no WebAuthn', () => {
    render(<LandingPage actions={actions()} />);
    expect(
      screen.queryByRole('button', { name: 'Sign in with a passkey' }),
    ).not.toBeInTheDocument();
  });

  it('also opens the door through Microsoft', async () => {
    const user = userEvent.setup();
    const a = actions();
    render(<LandingPage actions={a} />);
    await user.click(screen.getAllByRole('button', { name: 'Continue with Microsoft' })[0]);
    expect(a.signInWithMicrosoft).toHaveBeenCalledTimes(1);
    expect(a.signInWithGoogle).not.toHaveBeenCalled();
    for (const b of await screen.findAllByRole('button', { name: 'Opening Microsoft…' }))
      expect(b).toBeDisabled();
  });
});
