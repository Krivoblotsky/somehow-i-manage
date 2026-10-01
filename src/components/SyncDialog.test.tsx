import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useUI } from '../state/ui';
import type { SyncActions } from '../sync/controller';
import { useSync } from '../sync/store';
import { SyncDialog } from './SyncDialog';

function fakeActions(): SyncActions {
  return {
    signInWithGoogle: vi.fn(async () => {}),
    signOut: vi.fn(async () => {
      useSync.setState({ user: null });
    }),
    syncNow: vi.fn(async () => {}),
  };
}

beforeEach(() => {
  useUI.setState({ dialog: { type: 'sync' } });
  useSync.setState({
    configured: true,
    ready: true,
    user: { id: 'u1', email: 'me@example.com' },
    authError: null,
    phase: 'idle',
    online: true,
    pending: 0,
    lastSyncedAt: Date.now(),
    error: null,
  });
});

describe('SyncDialog', () => {
  it('shows the account, syncs on demand and signs out', async () => {
    const user = userEvent.setup();
    const actions = fakeActions();
    render(<SyncDialog actions={actions} />);
    expect(screen.getByText('Signed in as me@example.com')).toBeInTheDocument();
    expect(screen.getByText(/Up to date · synced just now/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Sync now' }));
    expect(actions.syncNow).toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Sign out' }));
    expect(actions.signOut).toHaveBeenCalled();
    expect(screen.queryByText(/Signed in as/)).not.toBeInTheDocument();
  });

  it('reports pending changes and errors', async () => {
    useSync.setState({ phase: 'error', error: 'Failed to fetch' });
    render(<SyncDialog actions={fakeActions()} />);
    expect(screen.getByText(/Couldn’t sync: Failed to fetch/)).toBeInTheDocument();
    act(() => useSync.setState({ phase: 'idle', error: null, pending: 3 }));
    expect(await screen.findByText('3 changes waiting to upload.')).toBeInTheDocument();
    act(() => useSync.setState({ online: false }));
    expect(await screen.findByText(/Offline/)).toBeInTheDocument();
  });
});
