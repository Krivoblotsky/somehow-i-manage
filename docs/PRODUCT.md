# Product spec — Somehow I Manage

*Work with people, not tasks.*

## Problem

Task managers put the task first. Managers think in people: "what do I owe Vira, what did I promise
Anton, what should I raise with Nata on Thursday". So managers build per-person "dossiers" in tools
that were never meant for it. Sergii's survey at MacPaw: **85 % of managers** keep such dossiers in
Apple Notes, Google Sheets, Jira, etc. Sergii keeps one Apple Note per direct report.

## Who

* **Primary:** managers with ≤ 10 direct reports (team leads, engineering managers, heads of small
  functions). Mac users at work; iPhone in the pocket.
* **Later:** anyone whose work is relationships — mentors, coaches, founders with investors,
  freelancers with clients, and personal life (family, friends).

## Jobs to be done

1. Before a 1:1, see everything open with that person in one glance.
2. During the day, capture a promise / observation / follow-up for a specific person in < 5 seconds.
3. Never forget a commitment made to or by a person.
4. See the whole team at once and notice who has too much / too little attention.

## The idea

A **people-centric task manager**: the person is the root object; tasks and notes hang off people.
Presentation is a **mind-map**: each person is a node with a coloured ring, items orbit it, edges are
drawn in the person's colour. A detail panel on the right shows the selected person or item.
See `DESIGN.md` for the exact screens.

## MVP — v0.1 "Replace Sergii's Apple Notes"

Must have:
* People: create / edit / delete; name, photo (or initials), colour; order; contacts (email, phone,
  Slack, Telegram, LinkedIn, GitHub, X, website) as one-click links; Gravatar photo from the email.
* Items per person: **Task** (title, rich body, done) and **Note** (title, rich body). Timestamps.
* **People Map**: automatic radial layout of items around each person; pan/zoom; click to select.
* **Detail panel**: Person view (list of items, "N tasks, M open") and Item view (WYSIWYG body,
  Task/Note toggle, completed toggle, delete).
* Search across people and items.
* Persistence that survives reinstall; **sync between Sergii's Macs** (and later iPhone).
* Dark theme (as designed). Keyboard: ⌘N new person, ⌘⇧N new item, ⌘F search, ⌫ delete, ⌘Z undo.

Nice to have in v0.1 if cheap: quick-capture window (global hotkey), drag items between people,
manual node positions, export (Markdown per person).

## Not in v0.1

Multi-user collaboration, accounts, Jira/Slack/Calendar integrations, reminders and push
notifications, AI summaries, light theme, iPad/iPhone UI (data model must be ready for it).

## Success criteria

* Sergii uses it daily for 2 weeks instead of Notes and does not go back.
* 5 MacPaw managers on TestFlight; 3 still using it after a month.
* Clear answer from them to: "what would make you pay for this?"

## Monetisation hypothesis

Free up to 3 people; **Pro** unlocks unlimited people, sync, export (one-time purchase or yearly
subscription, StoreKit 2). Same free + Pro model already planned for DNS Client.

## Name

**Somehow I Manage** — decided 2026-09-30. Michael Scott's unfinished autobiography from *The
Office*; a people-first manager tool named after the most people-first manager on TV. Tagline stays
"Work with people, not tasks". Domains: somehowimanage.app/.dev/.io/.team/.co were free on
2026-09-30; somehowimanage.com is registered by someone else (since 2012, expires 2026-11-12).
Known exposure: NBC sells the phrase on merch and publishes the licensed game "The Office: Somehow We
Manage"; no trademark registration for either phrase was found in a web search, USPTO not checked.
Internal storage names (`personal` IndexedDB database, `personal.ui` key) keep the old name on
purpose so existing data survives.
