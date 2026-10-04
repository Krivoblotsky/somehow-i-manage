# Build plan

Product name: **Somehow I Manage** (decided 2026-09-30, see PRODUCT.md § Name).

## What happened in 2024 (post-mortem)

A first prototype, built with a collaborator in a private repository: 17 commits between
2024-07-03 and 2024-07-09, two cosmetic commits on 2025-07-01, then nothing.
Stack: React 18 + Vite + reactflow + antd + zustand, TypeScript removed on day 4 "for speed".
State: header with avatars, People Map with radial layout and colour-coded floating edges, editable
card text, **hard-coded demo people, no persistence, no detail panel, no add/edit/delete flows**.
An even earlier one-evening vanilla-JS sketch of the same canvas exists too.

Why it stalled (my reading of the code and history):
1. **Started with the hardest, least essential part** — the free-form canvas — instead of the loop that
   makes the tool usable (people + items + persistence + detail editor). It could never be dogfooded,
   so there was no daily pull to keep going.
2. **Borrowed stack.** The web stack was the collaborator's; when he stopped, the project had no owner
   who enjoyed the codebase. Sergii ships UIKit/AppKit/SwiftUI apps.
3. **Web needs a backend before it is real** (auth, storage, sync, hosting). That is a second product.
4. No scope document; the Figma was the only spec.

## Principles for the second attempt

* Week 1 goal is **dogfooding**, not the canvas. Data model → people list → item editor → persistence.
  The map view comes when the data is real.
* Own the stack. Choose what Sergii can finish alone on weekends.
* Follow the Figma for look and feel, but ship the boring flows first.
* Every milestone ends with a build Sergii actually uses.
* Copy says **“with ‹name›”**, never “for ‹name›” (decided 2026-09-30). Items are Sergii's own tasks with a person, grouped around that person — not tasks assigned to them. Tasks are “with Vira”, notes are “about Vira”; the quick-add field reads “Something to do with Vira…”.

## Milestones

| # | Milestone | Done when |
|---|---|---|
| M0 | Project skeleton, model, persistence, CI | ✅ 2026-09-29 — Dexie schema, repository, 25 tests, CI workflow |
| M1 | People list + person page + item editor | 🟡 first cut 2026-09-29: header people strip, dossier view, item panel with WYSIWYG, add/edit/delete person, paste-a-list import, search, Markdown export. Needs Sergii's real data + feedback |
| M2 | People Map (auto radial layout, colours, edges, selection) | 🟡 first cut 2026-09-29: React Flow canvas, person hubs with ring + name + hover “+”, cards on auto rings (multi-ring for many items), colour-coded floating bezier edges, drag with saved positions (person drag carries its cards), right-click menus, Person Details panel, Map ⇄ List toggle. 2026-09-30: drag a card onto another person to move it (pointer-based drop with hub highlight), “with ‹person›” link in the item panel, ⌘⇧N new task, editor code-split. Off-screen people stay pinned at the canvas edge as avatar + direction triangle (the ▼ from the frames); click flies to them. New branches animate: the card grows out of the hub and flies to its slot while the edge draws itself and the hub pulses (`src/map/enterFx.ts`, plays once per item created in this session). Completed items have a trash icon (list rows, panel rows, map cards on hover); item deletion never asks, it shows a toast with Undo (`src/state/actions.ts`, `src/state/toast.ts`). Item panel has a back button to the person. Text fields lost their blue focus rings. Completed = white tick on a green circle everywhere; completing a card never changes its size; deleting a card leaves the others exactly where they were (positions are data, see Stack). Person profile (2026-09-30): contacts list per person — email, phone, Slack, Telegram, LinkedIn, GitHub, X, website — shown as icon links under the name (mailto/tel/profile URLs; bare Slack handles copy to clipboard), edited in the person dialog; an email with a Gravatar fills the photo automatically unless a photo was uploaded (`src/model/gravatar.ts`, SHA-256 in `src/model/sha256.ts`); contacts are searchable and exported. 2026-09-30 evening: the hub “+” creates the card and opens its title for editing right on the canvas (Enter saves, Esc drops an empty new card, double-click any card to rename; `InlineTitle` in `ItemNode.tsx` retries focus across frames because React Flow keeps unmeasured nodes invisible). One shared right-click menu for items everywhere — list rows, panel rows, map cards (`src/components/ItemContextMenu.tsx`): Open, complete, urgent, task⇄note, Move to…, Delete with Undo. Needs a polish pass against the frames with real data |
| M3 | Search, keyboard shortcuts, undo, quick capture | 🟡 2026-09-30: search ✅, Undo for deletes ✅, ⌘N / ⌘⇧N / Esc ✅, inline “Something to do with ‹name›…” field in dossier and panel (Enter task, ⇧Enter note, ⌘Enter opens) ✅, ⌘K command palette (people, items, commands, “Name: title” adds a task) ✅. **1:1 mode** ✅ (2026-09-30): “Start 1:1” from the dossier, the panel, the map menu or ⌘K opens a focused screen (`src/components/OneOnOne.tsx`, pure model in `src/model/oneOnOne.ts`) — agenda of open tasks (urgent first) and notes with a big tick and a “Discussed” toggle (covered items sink to the bottom, ticked tasks stay greyed so nothing jumps), a capture box whose items collect beside it, and a “Since last 1:1” recap of what got done; “new” tags what appeared since the previous 1:1. Ending records `{startedAt, endedAt}` in `Person.meetings` and toasts “2 discussed, 1 done, 3 added”; `Item.discussedAt` remembers coverage; “Last 1:1 12 days ago” shows under the name. The running 1:1 survives reloads (`useUI.meeting`) and stays running while you look at the map or another person (header pill returns to it). Still open: general undo, reorder people, meeting history view |
| M4 | Sync (iCloud / CloudKit) + iPhone read-only companion | 🟡 2026-09-30: sync built on **Supabase, custom engine** (user's pick over Dexie Cloud): outbox via Dexie DBCore middleware, `sync_records` table + `sync_push()` last-write-wins function + RLS, pull-by-seq / push-outbox engine (`src/sync/engine.ts`, 11 tests against a fake server), Realtime nudges, “Continue with Google” sign-in (user: no raw email paste), then (user: “just a regular auth”) the whole app moved behind a login screen — no anonymous use; the local DB is a per-account cache (`prepareForUser` wipes it for a different account). Top-right **user menu** (`src/components/UserMenu.tsx`: Google name + photo with a sync-status dot; Account & sync…, Export, Back up, Restore, Load sample data, Sign out) replaced the ⋯ menu and the cloud badge (user: “show current user profile with the ability to sign out instead of Delete All data”); “Delete all data…” now lives in the Account & sync dialog. Signed-out visitors see a landing page (`src/components/LandingPage.tsx`: hero with a still of the People Map, four feature cards, three steps, Google sign-in in nav, hero and footer). Builds without `VITE_SUPABASE_*` show a setup notice. **Verified live 2026-09-30: schema applied, Google provider enabled, sign-in round trip works (user).** Setup in docs/SYNC.md. Still open: run it against a real project (needs Sergii's Supabase account), iPhone companion is now just “open the PWA on the phone” |
| M5 | ~~Free/Pro paywall~~ (user 2026-10-01: no Free/Pro for now), onboarding, App Store assets, TestFlight to 5 MacPaw managers | 🟡 **Onboarding pass 2026-10-01:** landing page is “try and go” — the hero holds the *real* People Map, live, seeded with the sample team in a throwaway IndexedDB (`src/components/LiveDemo.tsx`; `DatabaseProvider` in `src/data/DatabaseContext.ts` scopes every map write; demo hides 1:1/dialog menu items), three “Try” chips, one line of copy, three terse features; first run in the app: tighter empty state with the three steps and “Try with sample data”, a dismissable Tips island on the map (`MapTips`, `useUI.tipsDismissed` persisted). **Sample team rewritten** (user: American-style full names, every feature on show, real photos): ten people — Emily Carter · Marcus Johnson · Sofia Reyes · David Nguyen (empty) · Olivia Bennett · James Patel · Ava Thompson · Daniel Kim · Grace Miller · Ethan Brooks — 32 items, roles, Unsplash portraits embedded as data URLs (`src/data/sampleAvatars.ts`, ~55 kB); enough that the people strip scrolls and the landing demo opens on James Patel (middle of the grid, 7 varied items) with the rest as edge markers all around; zoom controls sit above the markers; canvas dots toned down (1px every 36px in `--canvas-dot`, a warm brownish grey; the landing hero uses the same token every 28px) so the grid gives a sense of scale without pulling the eye (user: “demonstrate we support a lot of persons, some off-screen”). Demo canvas pans with the wheel like the app (user asked for scroll), urgent/due/overdue/done/discussed items, rich-text notes (lists, quote), a past 1:1 — declared as a table in `src/data/seed.ts`. First external users. Infra done 2026-09-30: JSON backup/restore (merge or replace), persistent-storage request, PWA (manifest, icons, Workbox service worker, offline), GitHub Pages deploy workflow. **Polish pass (step 5, 2026-09-30/10-01):** person actions calmed to Start 1:1 / + Task / + Note / ⋯ (paste, edit, delete behind the menu, no red button on the daily screen); row dates read “today / yesterday / Mon / 10 Sep” with the full timestamp on hover; **due dates** (native date field as a pill in the item panel, “Due Fri” / “3 days overdue” badges on rows, map cards and the 1:1 agenda; open tasks sort urgent → soonest due → manual); keyboard-shortcuts sheet (“?” or user menu); map: “Tidy up the map” in the pane menu and ⌘K, sample data laid out on a clean grid, new cards step outwards gently, newcomers get room for 8 cards; the workspace is code-split so the landing page loads without React Flow, TipTap or Dexie. **Map spotlight** (user request): while a person's panel or one of their cards is open, everyone else's hubs, cards, edges and edge markers fade to ~30% (`selectFocusPersonId` in `src/state/ui.ts`; each node/edge decides for itself, `data-dimmed` for tests); Esc or closing the panel restores. **Header as floating glass “islands”** (user: like Freeform's toolbar): brand · Map/List (+ running-1:1 pill) · search · people + add · account, each a blurred translucent pill over the canvas (`--glass*` tokens, `backdrop-filter`), header reports `--header-h` so views start below it; fit-to-screen leaves 128px at the top; the zoom controls are a matching glass island. Hub names wrap (168px wide, centred) instead of truncating; `zIndexMode="manual"` on React Flow with edges 0 / hubs 1 / cards 2, because React Flow's default lifts an edge to its card's level and drew it over the hub's name and “+” |

**2026-10-01/02 addendum (M5 continued):** live at **https://somehowimanage.app** (GoDaddy DNS → GitHub Pages, HTTPS enforced; Google OAuth brand verified, so the consent screen names the app); privacy policy at `/privacy/`; landing redesigned to Asana's level (sticky nav, hero with the live map and the app icon, three habits, map and person sections as caption tabs over full-width shots taken by `npm run shots`, the author's story, FAQ, final call, footer) and **pre-rendered at build** for crawlers and first paint; Fixel shipped as web fonts; the icon is the user's “m” artwork cut to Apple's shape (`npm run icons`); sign-in with **Google, Microsoft or a passkey**; Feedback island + links (mailto); social preview card; robots/sitemap/llms.txt + JSON-LD; the side pane floats over the map and slides in and out; header stays one row down to the phone breakpoint; in-app account deletion (`delete_my_account()`); “new version ready” prompt.

**2026-10-03 addendum (M5 continued): Projects.** A project is a tag that cuts across people: one
per task or note, with a name and a colour of its own (`PROJECT_PALETTE`, eight colours distinct
from the person rings). Set from the item panel (a “project” pill opens a find-or-create list:
type a name, Enter creates it; “No project” takes it off) or from the right-click menu. Cards and
rows carry a small chip; the **Projects island** (top-left of the map) lists every project with
how many items hang on it and spotlights one on click (everything outside it steps back; Esc or
the canvas clears); right-click renames or deletes (items keep their place, lose the tag).
Projects sync as their own record kind (`projects` table, Dexie v3, `kind = 'project'` on the
server, so `supabase/schema.sql` must be re-run once), ride in backups (version 2; version 1
files still restore), show as `[Name]` in the Markdown export and match in search. The sample
team carries three: MIPP, Release 2.1, Hiring. Dictation shipped the same day (a mic in the
quick-add field and the body editor). Google Calendar (phase 1) is parked on the `calendar`
branch, unmerged, waiting on Google's scope verification.

**2026-10-04 addendum: MCP server.** Somehow I Manage speaks to AI assistants: an MCP server as a
Supabase Edge Function (`supabase/functions/mcp/`, fourteen tools from `list_people` and
`prepare_one_on_one` to `add_task` and `move_item`), with Supabase Auth as the OAuth 2.1 server
(dynamic client registration) and the consent screen in the app (`OAuthConsent`, reached through
`/oauth/consent`). Tools run as the user through `sync_records` and `sync_push()` under RLS, so an
assistant's changes arrive on devices like any other edit. *Account & sync → AI assistants* shows
the address, the Claude Code one-liner and connected clients with Disconnect. Public page at
`/mcp/`, FAQ entry, llms.txt section. Tested end-to-end with the real MCP client under Deno
(`npx -y deno test`). Design and setup in docs/MCP.md; the project side (enable the OAuth server,
authorization path, deploy the function) is the user's.

## Stack — decided 2026-09-29: Option B (web app, resumed), boring core first

Sergii chose the web stack and the "boring core first" order. Consequences:

* Local-first: IndexedDB (Dexie) is the only store in M0–M3, so the app is usable from day one
  with no backend and no accounts. Every read/write goes through `src/data/repository.ts`; the
  sync backend (Supabase is the default candidate) plugs in behind that module in M4.
* TypeScript is back on (strict). Vite 8, Vitest 5, ESLint 10 flat config, Prettier.
* The mind-map canvas (M2) uses `@xyflow/react` 12. Layout and edge geometry are pure modules in
  `src/map/` with tests; the 2024 edge math was ported from the prototype.
  People are parent nodes and their cards child nodes, so dragging a person moves the cluster.
  **Positions are data**: every person and card gets a saved `mapPosition` when created (a card
  goes into the widest free gap around its hub, `placeItem`; a person to the right of the others,
  `placePerson`), so deleting or moving something never shifts its neighbours. "Reset layout"
  (`resetMapLayout`) re-grids clusters and spreads cards evenly; `ensureMapPositions` runs at
  startup to place data from before positions were stored. `buildGraph` still tolerates missing
  positions.
* Rich text is TipTap 3 (StarterKit) storing HTML in `Item.body`.

Options as they were evaluated:

**Option A — Native Apple app (recommended).** SwiftUI, macOS 15+ first, one multiplatform target so
iPhone/iPad come later; SwiftData (or Core Data) + CloudKit for sync; StoreKit 2 for Pro; App Store
under NSBeep. Map view = SwiftUI `Canvas`/`ZStack` with a custom radial layout; edges are `Path`
beziers (the math was already in the 2024 prototype). Pros: Sergii's strengths, zero backend,
sync and payments are solved by Apple, same distribution channel as the other NSBeep apps. Cons:
Mac-only reach at first; Windows managers excluded.

**Option B — Web app, resumed.** Keep React + Vite (re-enable TypeScript), reactflow for the map,
add a backend (Supabase/Firebase: auth, Postgres, realtime) and hosting. Pros: universal reach,
shareable links, the collaborator's code is reusable. Cons: backend + auth + hosting + billing before
the first real user; not Sergii's home turf; the part that failed last time.

**Option C — Local-first web (PWA).** Same React code, IndexedDB persistence, no backend, installable.
Pros: fastest to a usable build from the existing code. Cons: no sync, no multi-device, still web.

## Data model (platform-neutral)

```
Person   id, name, avatarImage?, colorIndex (0…5 palette), title/role?, sortOrder,
         createdAt, updatedAt, archivedAt?
Item     id, personId, kind (task|note), title, body (attributed/markdown),
         isCompleted, completedAt?, isFlagged (the "urgent" in the mock), dueDate?,
         createdAt, updatedAt, mapPosition? (x, y — nil = auto layout)
```
Derived: person.openTaskCount, person.flaggedCount ("10 tasks, 1 urgent").
