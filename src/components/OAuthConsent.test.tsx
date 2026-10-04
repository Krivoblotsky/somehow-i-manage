import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { SyncActions } from '../sync/controller';
import { OAuthConsent } from './OAuthConsent';

function fakeActions(overrides: Partial<SyncActions> = {}): SyncActions {
  return {
    signInWithGoogle: vi.fn(async () => {}),
    signInWithMicrosoft: vi.fn(async () => {}),
    signInWithPasskey: vi.fn(async () => {}),
    registerPasskey: vi.fn(async () => ({ id: 'pk', createdAt: 0 })),
    listPasskeys: vi.fn(async () => []),
    deletePasskey: vi.fn(async () => {}),
    signOut: vi.fn(async () => {}),
    deleteAccount: vi.fn(async () => {}),
    syncNow: vi.fn(async () => {}),
    authorizationDetails: vi.fn(async () => ({
      request: {
        authorizationId: 'auth-1',
        client: { id: 'c1', name: 'Claude', uri: 'https://claude.ai' },
        redirectUri: 'https://claude.ai/api/mcp/auth_callback',
        scope: 'openid email',
      },
    })),
    approveAuthorization: vi.fn(async () => 'https://claude.ai/api/mcp/auth_callback?code=ok'),
    denyAuthorization: vi.fn(async () => 'https://claude.ai/api/mcp/auth_callback?error=denied'),
    listGrants: vi.fn(async () => []),
    revokeGrant: vi.fn(async () => {}),
    ...overrides,
  };
}

describe('OAuthConsent', () => {
  it('asks to sign in first when nobody is', async () => {
    const user = userEvent.setup();
    const actions = fakeActions();
    render(<OAuthConsent id="auth-1" signedIn={false} actions={actions} navigate={() => {}} />);
    expect(
      screen.getByRole('heading', { name: 'An AI assistant wants to connect' }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Continue with Google' }));
    expect(actions.signInWithGoogle).toHaveBeenCalled();
    expect(actions.authorizationDetails).not.toHaveBeenCalled();
  });

  it('names the client, and sends the user back after Allow', async () => {
    const user = userEvent.setup();
    const actions = fakeActions();
    const navigate = vi.fn();
    sessionStorage.setItem('personal.oauthConsent', 'auth-1');
    render(<OAuthConsent id="auth-1" signedIn actions={actions} navigate={navigate} />);
    expect(
      await screen.findByRole('heading', { name: 'Allow Claude to work as you?' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Afterwards you return to claude.ai.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Allow' }));
    expect(actions.approveAuthorization).toHaveBeenCalledWith('auth-1');
    expect(navigate).toHaveBeenCalledWith('https://claude.ai/api/mcp/auth_callback?code=ok');
    expect(sessionStorage.getItem('personal.oauthConsent')).toBeNull();
  });

  it('denies, and goes straight back when the client was approved before', async () => {
    const user = userEvent.setup();
    const navigate = vi.fn();
    const actions = fakeActions();
    render(<OAuthConsent id="auth-1" signedIn actions={actions} navigate={navigate} />);
    await user.click(await screen.findByRole('button', { name: 'Don’t allow' }));
    expect(actions.denyAuthorization).toHaveBeenCalledWith('auth-1');
    expect(navigate).toHaveBeenCalledWith('https://claude.ai/api/mcp/auth_callback?error=denied');

    const again = vi.fn();
    render(
      <OAuthConsent
        id="auth-2"
        signedIn
        actions={fakeActions({
          authorizationDetails: vi.fn(async () => ({ redirectUrl: 'https://claude.ai/cb?code=x' })),
        })}
        navigate={again}
      />,
    );
    await vi.waitFor(() => expect(again).toHaveBeenCalledWith('https://claude.ai/cb?code=x'));
  });

  it('explains a request that cannot be shown', async () => {
    render(
      <OAuthConsent
        id="auth-3"
        signedIn
        actions={fakeActions({
          authorizationDetails: vi.fn(async () => {
            throw new Error('Authorization not found');
          }),
        })}
        navigate={() => {}}
      />,
    );
    expect(await screen.findByRole('alert')).toHaveTextContent('Authorization not found');
    expect(
      screen.getByRole('heading', { name: 'This request can’t be shown' }),
    ).toBeInTheDocument();
  });
});
