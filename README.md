# Personal (working title)

People-centric task manager for managers: **work with people, not tasks.**

A person is the root object; tasks and notes hang off people. Local-first web app
(React + TypeScript + Vite, IndexedDB via Dexie), designed to grow a People Map (mind-map
canvas) and cloud sync.

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
  state/      transient UI state (zustand): selection, search, open dialog
  components/ Header (people strip, search, menu), PersonView (dossier), ItemPanel (editor),
              PersonDialog, BulkAddDialog, SearchResults, EmptyState, Avatar, BodyEditor (TipTap)
  styles/     design tokens from docs/DESIGN.md, global reset
```

All data lives in the browser's IndexedDB (database `personal`). Export everything as Markdown
from the ⋯ menu.
