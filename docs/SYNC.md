# Account and sync

The app is behind a Google sign-in: nothing is reachable without an account (decided
2026-09-30, “just a regular auth”). Sync keeps the same people, tasks and notes on every device
that account signs in on. A build without a backend cannot sign anyone in and shows a setup
notice instead of the app.

## How it works

- **Local-first.** The UI only ever reads and writes the local IndexedDB (Dexie). Sync runs
  beside it and never blocks a click.
- **Outbox.** A Dexie middleware (`src/sync/changeLog.ts`) notes every change to `people` and
  `items` in an `outbox` table inside the same transaction, so nothing is missed — the seed, a
  restore, a drag on the map.
- **One table on the server.** `public.sync_records` holds each record as JSON with the account it
  belongs to, a version (`updated_at`, the device clock when the change was made), a tombstone
  (`deleted_at`) and a change counter (`seq`). Row-level security means an account only ever sees
  its own rows. The anon key in the build is public by design.
- **Pull, then push.** `SyncEngine` (`src/sync/engine.ts`) asks for rows with `seq` greater than
  its cursor and applies them; a change still waiting in the outbox beats an older remote one.
  Then it uploads the outbox through `sync_push()`, a Postgres function that keeps the newest
  version of each record. Last write wins, decided on the server.
- **When.** After every local change (debounced), when the tab becomes visible, when the network
  comes back, every five minutes, and the moment another device pushes (Supabase Realtime).
- **Sign-in.** “Continue with Google” through Supabase Auth (OAuth with PKCE); the app only learns
  the email address. The local database is a cache for the signed-in account: data from before
  anyone signed in is uploaded by whoever signs in first; a different account signing in on the
  same device starts from an empty cache and pulls its own data; the same account again continues
  where it left off. Signing out (user menu, top right) returns to the front door and leaves the
  cache in place, so an offline relaunch with a saved session still works. “Delete all data” in the
  Account & sync dialog deletes everywhere.

## Set it up (about ten minutes)

1. **Create a project** at [supabase.com](https://supabase.com) (free plan is fine). Pick a
   region near you.
2. **Schema.** Open *SQL Editor*, paste [`supabase/schema.sql`](../supabase/schema.sql), run it.
   Safe to run again later.
3. **Google sign-in.** Two halves:
   - *Google Cloud Console → APIs & Services → Credentials → Create credentials → OAuth client ID*,
     type **Web application**. Add one authorized redirect URI:
     `https://<project-ref>.supabase.co/auth/v1/callback` (the project ref is the first part of
     your Project URL). If asked, set up the OAuth consent screen first: external, app name
     “Somehow I Manage”, your email as support and developer contact; no scopes beyond the
     defaults; add yourself as a test user while the app is in testing.
   - *Supabase → Authentication → Providers → Google*: enable, paste the Client ID and Client
     Secret, save.

   Then *Authentication → URL Configuration*: Site URL = where the app lives
   (`https://<user>.github.io/somehow-i-manage/`), and Redirect URLs for it and for
   `http://localhost:5173/**`.
4. **Keys.** *Project Settings → API*: copy the Project URL and the `anon` `public` key.
5. **Local dev.** Copy `.env.example` to `.env.local`, fill both values, restart `npm run dev`.
6. **GitHub Pages.** Repository *Settings → Secrets and variables → Actions → Variables*: add
   `SUPABASE_URL` and `SUPABASE_ANON_KEY`. The deploy workflow passes them to the build.

Then open the app, click the cloud in the header (or ⋯ → *Sync across devices…*) and continue
with Google. Do the same on the next device.

## Good to know

- Free Supabase projects pause after a week without traffic; the dashboard restores them in a
  click. While paused, the app keeps working offline and syncs when the project is back.
- Tombstones stay on the server, so a deletion reaches a device that was off for months.
- Two devices editing the same record: the later edit wins as a whole; there is no field merge.
- Clocks matter for “later”. A device with a badly wrong clock can lose edits.
