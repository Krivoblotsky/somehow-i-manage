# Design spec — Somehow I Manage (from Figma)

Source: https://www.figma.com/design/c1d7ZcNNBiKKnDT2RpKuze/Personal
Frames (Page 1): `1:2` Task Details (original), `97:2` Task Details (duplicate, same content), `1:157` Person Details.
Read on 2026-09-29 through the Figma viewer at 50 % zoom. The Figma MCP server cannot read this
file: it is signed in as krivoblotsky@macpaw.com, which only has a *View* seat in
"Sergii's Starter team" that owns the file. Give that account edit access (or move the file into a
MacPaw project) if we ever want pixel-exact values from the MCP; the numbers below are measured from
the rendered frames (± 5 %).

All three frames are the same screen: a dark, full-window **People Map** with a white **detail panel**
docked on the right. The only difference between frames is what the panel shows.

## 1. Layout (reference window 1512 × 982 pt, 14" MacBook Pro)

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ Personal.app                    [🔍 Search…] (+) (Nata)(Vira) [👤 Sergii Kryvoblotskyi ⌄] │  header ~80 pt
│ Work with people, not tasks                                                   │
├───────────────────────────────────────────────────────┬──────────────────────┤
│                                                       │                      │
│      ┌ Promotion Next Steps ┐                          │   detail panel       │
│  ┌Buy Tickets┐   ╲      ┌ Approve Focus Areas ┐        │   385 × ~630 pt      │
│  └(completed)┘ ── (Nata)(+) ──╯                        │   white, r = 16      │
│      ┌ Patents Agreement ┐  ╲ ┌ Team Restructuring ┐   │   docked right,      │
│                                                       │   ~24 pt margins     │
│                    (Vira) ══ [ Launch MIPP ]  ← selected                     │
│                                                       │                      │
│                                (Anton)                │                      │
│                                  ▼                    │                      │
└───────────────────────────────────────────────────────┴──────────────────────┘
```

* Background (header + canvas): near-black `#1C1C1E` (mock is ~#1a1a1a–#1f1f1f).
* Canvas is an infinite, pannable surface; people clusters are laid out radially.
* Detail panel floats over the canvas on the right (x ≈ 1054 → 1438 pt, y ≈ 190 → 820 pt).

## 2. Header

| Element | Spec |
|---|---|
| App title | "Personal.app" in the frames, now **Somehow I Manage**; 18 pt bold, white; subtitle "Work with people, not tasks", 12 pt, `#9A9A9A` |
| Search | pill 240 × 40, fill `#2A2A2C`, magnifier icon + placeholder "Search…" `#8E8E93` |
| Add person | 40 pt circle, fill `#3E3E40`, white "+" |
| People avatars | 40 pt circles, 3 pt ring in the person's colour, in creation order; click → Person Details |
| Current user | pill, fill `#3E3E40`: 28 pt avatar + full name 16 pt + chevron; menu: Settings, Logout (web mock) |

## 3. Canvas nodes

**Person node**
* Avatar 54 pt circle, photo or initials on the person colour, **4 pt ring** in the person colour.
* Name under the avatar: 14 pt bold white, centred.
* Small **"+" button** (20 pt circle, `#3E3E40`, white plus) at the avatar's bottom-right → new item for this person.
* The small **filled triangle ▼** in the person colour under Anton is the **off-screen marker**
  (clarified by Sergii, 2026-09-30): when a person's hub leaves the visible canvas, their avatar
  stays pinned at the canvas edge with a triangle pointing to their real position; clicking it
  flies to that person.

**Item card (task or note)**
* White `#FFFFFF`, radius 12, ~162 × 60 pt min, padding 12; title 15 pt bold `#111`, description
  11 pt `#8E8E93`, 2 lines max; **circle checkbox** (14 pt, 1.5 pt stroke `#111`) top-right.
* **Completed**: card fill `#5A5A5C`, text `#C7C7CC`, checkbox becomes a filled green circle `#34C759`.
* **Selected**: 4 pt outline in the owner's colour (Launch MIPP has Vira's blue ring).

**Edges**
* One curved bezier per item, from the avatar edge to the card edge, 3–4 pt stroke in the person colour.
  (The 2024 React code has the exact "floating edge" math in `personalapp/src/App.jsx`.)

**Context menu** (right-click on canvas): `Add new person…`, `Delete…`.

## 4. Detail panel — Task / Note (frames 1:2, 97:2)

Top → bottom, 24 pt padding:
1. Timestamp centred, 10 pt `#8E8E93`: "13 May 2024 at 15:38".
2. Row: owner avatar 24 pt (left) — **status pill** (right): "completed ◯", fill `#E5E5EA`, 11 pt, with a
   toggle circle; filled when done.
3. Title 17 pt bold ("Launch MIPP"); under it "with Vira" 10 pt `#8E8E93`.
4. Body: rich text (paragraphs, bold headings — the mock literally says "WYSIWYG"), 12 pt `#222`,
   line height 1.35. Scrollable.
5. Footer pinned to the bottom: segmented **Task | Note** (selected = fill `#2F6F6F`, white text;
   unselected = white, 1 pt `#D1D1D6` border) — left; **Delete** button (fill `#E5484D`, white) — right.

## 5. Detail panel — Person (frame 1:157)

1. Avatar 60 pt with 4 pt ring; name 24 pt bold; "10 tasks, 1 urgent" 12 pt `#8E8E93`.
2. List of the person's items, 1 pt dividers `#E8E8E8`:
   title 15 pt bold; date 9 pt `#8E8E93` ("25 May 2024 at 15:38"); description 12 pt `#8E8E93`, 2 lines,
   truncated with "…"; "completed ◯" pill on the right for done items.
3. Click a row → Task/Note panel for that item.

## 6. Colours

Person palette (identical to `personalapp/src/store.js`, so it was taken from this design):

| | hex | used by |
|---|---|---|
| blue | `#3C63EA` | Vira |
| teal | `#3DEBD6` | Nata |
| pink | `#EB3EA6` | Anton |
| rose | `#F5DDDD` | |
| orange | `#FBB13C` | |
| salmon | `#FFB4A2` | |

Surfaces: bg `#1C1C1E`, chrome `#2A2A2C` / `#3E3E40`, card `#FFFFFF`, completed card `#5A5A5C`,
success `#34C759`, destructive `#E5484D`, action teal `#2F6F6F`.

## 7. Typography

The mock and the 2024 code use **Fixel Display** (MacPaw's open-source typeface, SIL OFL;
https://github.com/MacPaw/Fixel). Weights used: Bold (titles), Medium (labels), Regular (body).
Fallback: system font.

## 8. Interactions implied by the frames

* Click avatar (canvas or header) → Person panel. Click card → Task/Note panel + selection ring.
* "+" on a person → creates an item under that person, opens it in the panel in edit mode.
* Header "+" / context menu → new person (name, photo, colour).
* Checkbox on card or pill in the panel toggles completion (card greys out, edge stays).
* Task ⇄ Note toggle changes the item kind; notes have no checkbox / completion.
* Delete in the panel deletes the item; "Delete…" in the context menu deletes the selected node.
* Search filters people and items on the map.
* Off-screen people: pinned avatar + direction triangle at the canvas edge, click to fly there.
* Ambiguous / not in the mock: due dates (the person panel says "1 urgent", so some priority/flag
  exists), manual dragging of nodes, more than ~6 people per screen, light theme.
