import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { useState } from 'react';
import { loadSampleData } from '../data/seed';
import { getInitials } from '../model/derive';
import { formatRelativeTime } from '../model/format';
import { backupToFile, exportMarkdownToFile } from '../state/actions';
import { useNow } from '../state/now';
import { useUI } from '../state/ui';
import { syncActions, type SyncActions } from '../sync/controller';
import { useSync } from '../sync/store';
import menu from './menu.module.css';
import styles from './UserMenu.module.css';

type DotState = 'offline' | 'error' | 'busy' | 'ok';

/** Top right: who is signed in (name and photo from Google), how sync is doing, the data tools, the way out. */
export function UserMenu({ actions = syncActions }: { actions?: SyncActions }) {
  const user = useSync((s) => s.user);
  const phase = useSync((s) => s.phase);
  const online = useSync((s) => s.online);
  const pending = useSync((s) => s.pending);
  const lastSyncedAt = useSync((s) => s.lastSyncedAt);
  const error = useSync((s) => s.error);
  const openDialog = useUI((s) => s.openDialog);
  const now = useNow();
  if (!user) return null;

  const name = user.name?.trim() || user.email || 'You';
  const state: DotState = !online
    ? 'offline'
    : phase === 'error'
      ? 'error'
      : phase === 'syncing' || pending > 0
        ? 'busy'
        : 'ok';
  const status: Record<DotState, string> = {
    offline: 'Offline — changes wait here',
    error: `Sync failed: ${error ?? 'unknown error'}`,
    busy:
      pending > 0 ? `${pending} change${pending === 1 ? '' : 's'} waiting to upload` : 'Syncing…',
    ok: lastSyncedAt ? `Synced ${formatRelativeTime(lastSyncedAt, now)}` : 'Connected',
  };

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          className={styles.trigger}
          aria-label={`Account: ${name}`}
          title={`${name} · ${status[state]}`}
        >
          <UserAvatar name={name} url={user.avatarUrl} size={40} />
          <span className={styles.dot} data-state={state} aria-hidden="true" />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content className={`${menu.menu} ${styles.menu}`} align="end" sideOffset={8}>
          <div className={styles.head}>
            <UserAvatar name={name} url={user.avatarUrl} size={44} />
            <div className={styles.headText}>
              <div className={styles.name}>{name}</div>
              {user.email && user.email !== name && (
                <div className={styles.email}>{user.email}</div>
              )}
              <div
                className={
                  state === 'error' ? `${styles.status} ${styles.statusError}` : styles.status
                }
              >
                {status[state]}
              </div>
            </div>
          </div>
          <DropdownMenu.Separator className={menu.separator} />
          <DropdownMenu.Item className={menu.item} onSelect={() => openDialog({ type: 'sync' })}>
            Account &amp; sync…
          </DropdownMenu.Item>
          <DropdownMenu.Separator className={menu.separator} />
          <DropdownMenu.Item className={menu.item} onSelect={() => void exportMarkdownToFile()}>
            Export everything as Markdown
          </DropdownMenu.Item>
          <DropdownMenu.Item className={menu.item} onSelect={() => void backupToFile()}>
            Back up to file…
          </DropdownMenu.Item>
          <DropdownMenu.Item className={menu.item} onSelect={() => openDialog({ type: 'restore' })}>
            Restore from file…
          </DropdownMenu.Item>
          <DropdownMenu.Item className={menu.item} onSelect={() => void loadSampleData()}>
            Load sample data
          </DropdownMenu.Item>
          <DropdownMenu.Separator className={menu.separator} />
          <DropdownMenu.Item className={menu.item} onSelect={() => void actions.signOut()}>
            Sign out
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

/** Google profile photo, or initials when there is none or it fails to load. */
function UserAvatar({ name, url, size }: { name: string; url?: string; size: number }) {
  const [broken, setBroken] = useState(false);
  return (
    <span
      className={styles.avatar}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.38) }}
      aria-hidden="true"
    >
      {url && !broken ? (
        <img
          src={url}
          alt=""
          referrerPolicy="no-referrer"
          draggable={false}
          onError={() => setBroken(true)}
        />
      ) : (
        getInitials(name)
      )}
    </span>
  );
}
