import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SyncActions } from '../sync/controller';
import { useSync } from '../sync/store';
import { UserMenu } from './UserMenu';

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
  useSync.setState({
    configured: true,
    ready: true,
    user: { id: 'u1', email: 'sergii@example.com', name: 'Sergii Kryvoblotskyi' },
    authError: null,
    phase: 'idle',
    online: true,
    pending: 0,
    lastSyncedAt: Date.now(),
    error: null,
  });
});

describe('UserMenu', () => {
  it('shows the Google name and email, initials without a photo, and signs out', async () => {
    const user = userEvent.setup();
    const a = actions();
    render(<UserMenu actions={a} />);
    const trigger = screen.getByRole('button', { name: 'Account: Sergii Kryvoblotskyi' });
    expect(trigger).toHaveTextContent('SK');

    await user.click(trigger);
    expect(await screen.findByText('Sergii Kryvoblotskyi')).toBeInTheDocument();
    expect(screen.getByText('sergii@example.com')).toBeInTheDocument();
    expect(screen.getByText(/Synced just now/)).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Load sample data' })).toBeInTheDocument();

    await user.click(screen.getByRole('menuitem', { name: 'Sign out' }));
    expect(a.signOut).toHaveBeenCalled();
  });

  it('falls back to the email as the name and reports sync trouble', () => {
    useSync.setState({
      user: { id: 'u1', email: 'me@example.com' },
      phase: 'error',
      error: 'Failed to fetch',
    });
    render(<UserMenu actions={actions()} />);
    const trigger = screen.getByRole('button', { name: 'Account: me@example.com' });
    expect(trigger).toHaveAttribute('title', 'me@example.com · Sync failed: Failed to fetch');
  });

  it('renders nothing when signed out', () => {
    useSync.setState({ user: null });
    const { container } = render(<UserMenu actions={actions()} />);
    expect(container).toBeEmptyDOMElement();
  });
});
