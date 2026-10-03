import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from '../data/db';
import { createPerson } from '../data/repository';
import { useUI } from '../state/ui';
import type { SyncActions } from '../sync/controller';
import { useSync } from '../sync/store';
import { SyncDialog } from './SyncDialog';

function fakeActions(): SyncActions {
  return {
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
    signOut: vi.fn(async () => {
      useSync.setState({ user: null });
    }),
    deleteAccount: vi.fn(async () => {}),
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

  it('deletes everything only after a confirmation', async () => {
    const user = userEvent.setup();
    await createPerson({ name: 'Vira' });
    render(<SyncDialog actions={fakeActions()} />);

    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    await user.click(screen.getByRole('button', { name: 'Delete all data…' }));
    expect(await db.people.count()).toBe(1);

    confirm.mockReturnValue(true);
    await user.click(screen.getByRole('button', { name: 'Delete all data…' }));
    await vi.waitFor(async () => expect(await db.people.count()).toBe(0));
    confirm.mockRestore();
  });

  it('lists passkeys, adds one, and removes one', async () => {
    const user = userEvent.setup();
    const actions = fakeActions();
    actions.listPasskeys = vi.fn(async () => [
      {
        id: 'old',
        name: 'MacBook',
        createdAt: Date.now() - 86_400_000 * 3,
        lastUsedAt: Date.now(),
      },
    ]);
    vi.stubGlobal('PublicKeyCredential', class {});
    render(<SyncDialog actions={actions} />);
    expect(await screen.findByText('MacBook')).toBeInTheDocument();
    expect(screen.getByText(/added 3 days ago · used just now/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Add a passkey' }));
    expect(actions.registerPasskey).toHaveBeenCalled();
    expect(await screen.findByText('iCloud Keychain')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Remove passkey MacBook' }));
    expect(actions.deletePasskey).toHaveBeenCalledWith('old');
    expect(screen.queryByText('MacBook')).not.toBeInTheDocument();
    vi.unstubAllGlobals();
  });

  it('says why when a passkey cannot be added', async () => {
    const user = userEvent.setup();
    const actions = fakeActions();
    actions.registerPasskey = vi.fn(async () => {
      throw new Error('No passkey was used — the prompt was closed or timed out.');
    });
    vi.stubGlobal('PublicKeyCredential', class {});
    render(<SyncDialog actions={actions} />);
    await user.click(await screen.findByRole('button', { name: 'Add a passkey' }));
    expect(await screen.findByText(/prompt was closed/)).toBeInTheDocument();
    vi.unstubAllGlobals();
  });

  it('deletes the account only after a confirmation', async () => {
    const user = userEvent.setup();
    const actions = fakeActions();
    actions.deleteAccount = vi.fn(async () => {
      useSync.setState({ user: null });
    });
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    render(<SyncDialog actions={actions} />);
    await user.click(screen.getByRole('button', { name: 'Delete your account…' }));
    expect(actions.deleteAccount).not.toHaveBeenCalled();
    confirm.mockReturnValue(true);
    await user.click(screen.getByRole('button', { name: 'Delete your account…' }));
    expect(actions.deleteAccount).toHaveBeenCalledTimes(1);
    expect(screen.queryByText(/Signed in as/)).not.toBeInTheDocument();
    confirm.mockRestore();
  });
});
