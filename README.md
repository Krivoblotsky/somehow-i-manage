# Somehow I Manage

People-centric task manager for managers: **work with people, not tasks.**

A person is the root object; tasks and notes hang off people and are shown on a **People Map**:
every person is a hub with a coloured ring, their cards orbit it, edges carry the person's colour.
Local-first web app (React + TypeScript + Vite, IndexedDB via Dexie, React Flow canvas), designed
to grow cloud sync.

## Docs

- [`docs/PRODUCT.md`](docs/PRODUCT.md) — problem, audience, MVP scope, success criteria
- [`docs/DESIGN.md`](docs/DESIGN.md) — measured spec of the Figma frames
- [`docs/PLAN.md`](docs/PLAN.md) — post-mortem of the 2024 attempt, milestones, decisions, data model

Design: <https://www.figma.com/design/c1d7ZcNNBiKKnDT2RpKuze/Personal>

## Develop

Node 24 (see `.nvmrc`); Node 22+ works.

```bash
npm install
npm run dev        # http://localhost:5173
```

| Script              | What it does                               |
| ------------------- | ------------------------------------------ |
| `npm run dev`       | Vite dev server with HMR                   |
| `npm test`          | Vitest (jsdom + fake-indexeddb)            |
| `npm run lint`      | ESLint (typescript-eslint, react-hooks)    |
| `npm run typecheck` | `tsc -b`                                   |
| `npm run build`     | type-check + production build into `dist/` |
| `npm run format`    | Prettier                                   |

CI (`.github/workflows/ci.yml`) runs lint, typecheck, tests and build on every push and PR.

## Code map

```
src/
  model/      types, palette, derived values (stats, initials), formatting — pure, tested
  data/       Dexie database, repository (all reads/writes), bulk-paste parser, sample data, Markdown export
  map/        People Map geometry: ring layout, cluster grid, edge endpoints, graph builder — pure, tested
  state/      transient UI state (zustand): view (map/list), selection, search, open dialog
  components/ Header (view toggle, people strip, search, menu), PersonView (dossier list),
              PersonPanel (person details), ItemPanel (editor), PersonDialog, BulkAddDialog,
              SearchResults, EmptyState, Avatar, BodyEditor (TipTap)
  components/map/ PeopleMap (React Flow canvas + context menus), PersonNode, ItemNode, FloatingEdge
  styles/     design tokens from docs/DESIGN.md, global reset
```

## Your data

Everything lives in the browser's IndexedDB (database `personal`) on the device you use. From the
⋯ menu you can **Back up to file** (a JSON file with people, items, positions and avatars),
**Restore from file** (merge or replace), and **Export everything as Markdown**. Make a backup
before clearing site data or switching machines; sync is a later milestone.

## Install as an app

The build is a PWA: open the deployed site in Chrome, Edge or Safari and use “Install” / “Add to
Dock”. It keeps working offline; new versions apply on the next launch.

## Deploy

`.github/workflows/deploy.yml` builds and publishes to GitHub Pages on every push to `main`.
Enable Pages in the repository settings with **Source: GitHub Actions**. The workflow sets
`BASE_PATH=/<repo>/`; for a `<user>.github.io` repository set it to `/`. Any static host works
too: build with `npm run build` and serve `dist/`.
