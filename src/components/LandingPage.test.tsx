import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SyncActions } from '../sync/controller';
import { useSync } from '../sync/store';
import { LandingPage } from './LandingPage';

const actions = (): SyncActions => ({
  signInWithGoogle: vi.fn(async () => {}),
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

    // every sign-in button is the same door; once one is pressed the main one shows it is busy
    await user.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(a.signInWithGoogle).toHaveBeenCalledTimes(1);
    expect(await screen.findByRole('button', { name: 'Opening Google…' })).toBeDisabled();
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
});
