import { render, screen } from '@testing-library/react';
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
  it('explains the product and hands over to Google from any of its sign-in buttons', async () => {
    const user = userEvent.setup();
    const a = actions();
    render(<LandingPage actions={a} />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'Work with people, not tasks.',
    );
    expect(screen.getByText('1:1 mode')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /People Map/ })).toBeInTheDocument();

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
