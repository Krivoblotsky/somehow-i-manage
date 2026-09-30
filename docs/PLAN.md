# Build plan

Product name: **Somehow I Manage** (decided 2026-09-30, see PRODUCT.md § Name). The repo folder
is still `personalapp`; rename it when the GitHub repository is created.

## What happened in 2024 (post-mortem)

Repo `~/Work/Home/personalapp` (remote github.com/romankolpak/personalapp), 17 commits between
2024-07-03 and 2024-07-09, two cosmetic commits on 2025-07-01, then nothing.
Stack: React 18 + Vite + reactflow + antd + zustand, TypeScript removed on day 4 "for speed".
State: header with avatars, People Map with radial layout and colour-coded floating edges, editable
card text, **hard-coded demo people, no persistence, no detail panel, no add/edit/delete flows**.
`~/Work/Home/Persona` is an earlier one-evening vanilla-JS sketch of the same canvas.

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
| M4 | Sync (iCloud / CloudKit) + iPhone read-only companion | Same data on both Macs and the phone |
| M5 | Free/Pro paywall, onboarding, App Store assets, TestFlight to 5 MacPaw managers | First external users. Infra done 2026-09-30: JSON backup/restore (merge or replace), persistent-storage request, PWA (manifest, icons, Workbox service worker, offline), GitHub Pages deploy workflow |

## Stack — decided 2026-09-29: Option B (web app, resumed), boring core first

Sergii chose the web stack and the "boring core first" order. Consequences:

* Local-first: IndexedDB (Dexie) is the only store in M0–M3, so the app is usable from day one
  with no backend and no accounts. Every read/write goes through `src/data/repository.ts`; the
  sync backend (Supabase is the default candidate) plugs in behind that module in M4.
* TypeScript is back on (strict). Vite 8, Vitest 5, ESLint 10 flat config, Prettier.
* The mind-map canvas (M2) uses `@xyflow/react` 12. Layout and edge geometry are pure modules in
  `src/map/` with tests; the 2024 edge math was ported from `git show ca155c1:src/App.jsx`.
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
beziers (the math is already in `personalapp/src/App.jsx`). Pros: Sergii's strengths, zero backend,
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
