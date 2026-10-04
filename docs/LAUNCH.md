# Launch plan: first feedback from strangers

*Written 2026-10-04. Goal: written feedback from managers who are not friends or MacPaw
colleagues, within two weeks, on a $200 budget, with as little of Sergii's time as possible.*

## What "feedback" means here

Three things, in this order of value:

1. **Answers to two questions** from people who used the app for a week: *would you pay for
   this?* and *what is missing?* The app now asks them itself (see § In the app).
2. **Where sign-ups came from**, so the second $200 goes to the channel that worked. The app
   asks "where did you hear about us?" once, and records campaign links; the landing page counts
   its visits by day and campaign. No third-party analytics: first-party, aggregate, no cookies.
3. **Comments in public**: Hacker News and Reddit threads say what a landing page cannot.

Targets for the fortnight, honest ranges: 400–900 visits, 30–70 sign-ins, 8–15 written
answers, 3+ people still using it after a week. Below that, the pitch or the product needs work
before more money; above it, double the budget on the channel that brought the sign-ins.

## Decisions only Sergii can make (10 minutes, before anything else)

1. **Open source, or not.** The repository is private today, and the `/mcp` page already calls
   the server open source. Either make the repository public with an MIT licence (strong angle
   for Hacker News and the MCP directories, and the privacy story gets a proof) or the wording
   on `/mcp` comes out. Recommendation: open it. The code is the marketing for this audience.
2. **Which accounts to post from.** Hacker News and Reddit reward accounts with history and
   punish new ones. Sergii's own accounts, with the "I built this" voice, or nothing.
3. **The paid channel.** Reddit Ads (recommended, below) or Google Search. Not both at $200.

## Where the $200 goes

**Reddit Ads, $150 over 10 days ($15/day).** Managers gather in r/managers, r/EngineeringManagers,
r/ExperiencedDevs, r/productivity, r/smallbusiness and r/Entrepreneur; Reddit lets an ad target
exactly those communities, clicks cost roughly $0.50–1.20, and the ad reads like a post. Expect
150–300 clicks. Setup is a one-time 20 minutes: *ads.reddit.com → Create campaign → Traffic →
Communities (the six above) → Placement: feed → Bid: CPC, $0.70 → Daily budget $15 → the creative
below → link with the campaign tag.* Keep the comments on the promoted post open and answer them.

**Held back, $50.** Either a second week on whichever Reddit community produced sign-ins, or a
Google Search test on exact phrases ("one on one meeting app", "1:1 meeting tracker", "task
manager for managers", "manager tools for direct reports") at $10/day for five days: fewer
clicks (30–60) but people who were already looking.

Not worth it at this budget: LinkedIn Ads ($6–9 a click), X Ads, newsletter sponsorships,
Product Hunt promotion. LinkedIn is still the best **free** channel: Sergii's network is full of
managers, and a plain post with the story travels there.

## Free channels, in order of expected return

| Day | Channel | Who does what | Expected |
|---|---|---|---|
| 1 | **Product Hunt** | Sergii creates the listing from the kit below (15 min), schedules it for a Tuesday or Wednesday 00:01 PT; replies to comments during the day | 200–800 visits, a lasting backlink, a page to point people at |
| 1 | **LinkedIn post** | Sergii pastes the post below | 100–300 visits from actual managers |
| 2 | **Show HN** | Sergii posts Tuesday–Thursday, 8–10am ET, text below; answers comments for two hours | A lottery: 50 visits or 5,000; the comments are gold either way |
| 2 | **MCP directories** | Sergii submits the server to the four directories below (5 min each); needs the public repository | A trickle of exactly the right people, for months |
| 3 | **Reddit, organic** | Sergii posts in r/SideProject and r/EngineeringManagers (text below), in the "I built this for myself" voice, and in r/ClaudeAI or r/mcp about the MCP server | 100–400 visits, blunt comments |
| 4–14 | **Replying** | Sergii answers every comment and every email; I summarise the feedback that lands in Supabase | The feedback itself |

Everything is pre-written below. Each link carries its own campaign tag, so the sign-ins tell
us where they came from.

## Links with campaign tags

```
Product Hunt   https://somehowimanage.app/?utm_source=producthunt&utm_medium=launch&utm_campaign=oct26
Hacker News    https://somehowimanage.app/?utm_source=hn&utm_medium=post&utm_campaign=oct26
LinkedIn       https://somehowimanage.app/?utm_source=linkedin&utm_medium=post&utm_campaign=oct26
Reddit (ads)   https://somehowimanage.app/?utm_source=reddit&utm_medium=cpc&utm_campaign=oct26
Reddit (posts) https://somehowimanage.app/?utm_source=reddit&utm_medium=post&utm_campaign=oct26
X              https://somehowimanage.app/?utm_source=x&utm_medium=post&utm_campaign=oct26
MCP pages      https://somehowimanage.app/mcp/?utm_source=mcp-directories&utm_medium=listing&utm_campaign=oct26
```

## The kit

### Product Hunt

- **Name:** Somehow I Manage
- **Tagline (≤60):** A people-first task manager for managers
- **Description (≤260):** Managers don't have tasks, they have people. Somehow I Manage puts each
  person at the centre: their tasks, notes and 1:1s around them on a map of your team. Prepare a
  1:1 in a minute, hand a task over by dragging, and let Claude or ChatGPT work with it through
  MCP. Free, offline-first.
- **Topics:** Productivity, Task Management, Artificial Intelligence
- **Gallery:** `public/launch/ph-1-map.jpg` … `ph-5-mcp.jpg` (1270×760 at 2x: the map, a person's page,
  the project spotlight, a 1:1, the MCP exchange) and the video `public/launch/demo.mp4`
  (`demo.gif` for Reddit and LinkedIn). Live at https://somehowimanage.app/launch/… after the push.
- **Maker's first comment:**

  > Hi, I'm Sergii. I manage a team at MacPaw, and for years everything I knew about my people
  > lived in Apple Notes: one note per person, their name as the title, a wall of text under it.
  > When I asked other managers, 85% kept the same kind of dossier somewhere never meant for it.
  >
  > Somehow I Manage is that habit turned into a tool. The person is the root: tasks, notes and
  > 1:1s hang off people, and the map shows the whole team at once. Start a 1:1 and the agenda is
  > already there. Since this week it also speaks MCP, so Claude or ChatGPT can prepare your 1:1
  > or add a task with someone.
  >
  > It's free, offline-first, and your data syncs through your own Google or Microsoft account.
  > I'd love to hear two things: what's missing for *your* team, and whether you'd pay for it.

### Show HN

- **Title:** Show HN: Somehow I Manage – a people-first task manager for managers
- **Text:**

  > I manage a team and kept my notes about people in Apple Notes, one note per person. A survey
  > among managers at my company found 85% doing the same in Notes, Sheets or Jira. So I built
  > the tool the habit wanted: the person is the root object, tasks and notes hang off people,
  > and the "map" shows everyone with their items around them. Starting a 1:1 builds the agenda
  > from what's open and records what got covered.
  >
  > Technical notes, since that's the fun part: React + TypeScript, local-first with IndexedDB
  > (Dexie) and a small sync engine over Supabase (outbox, last-write-wins decided server-side,
  > RLS per account), the map is React Flow with positions as data, the landing page is
  > pre-rendered at build. This week I added an MCP server as a Supabase Edge Function with
  > Supabase Auth as the OAuth 2.1 server, so any MCP client works with your data as you.
  >
  > The landing page has the real map with sample data, no sign-in needed. Sign-in is Google,
  > Microsoft or a passkey. Free. I'd value feedback on the premise as much as on the app.
  >
  > https://somehowimanage.app/?utm_source=hn&utm_medium=post&utm_campaign=oct26

### LinkedIn

> For years my "people management system" was Apple Notes. One note per person on my team, their
> name as the title, everything I owed them or wanted to raise in the next 1:1 underneath.
>
> I asked around. 85% of the managers I talked to did the same, in Notes, Sheets or Jira.
>
> So I built the tool that habit was asking for. Somehow I Manage starts from people, not tasks:
> every task and note belongs to someone, the whole team sits on one map, and a 1:1 builds its
> own agenda from what's open. It's free, works offline, and this week it learned to talk to
> Claude and ChatGPT.
>
> If you manage people, I'd love ten minutes of your honesty: what's missing, and would you pay
> for it? https://somehowimanage.app/?utm_source=linkedin&utm_medium=post&utm_campaign=oct26

### Reddit, organic

**r/SideProject / r/EngineeringManagers** (title: *I built a task manager that starts from
people, not tasks, because that's how managers actually think*):

> I manage a team and my "system" was one Apple Note per person. Turned out most managers I
> know do the same. So I made Somehow I Manage: each person is a hub, their tasks and notes
> around them on a map, drag a card to hand it over, start a 1:1 and the agenda is what's open.
> Free, offline-first, syncs through your own Google/Microsoft account, and it has an MCP server
> so Claude/ChatGPT can prepare a 1:1 for you.
>
> The landing page has the live map with a sample team, no sign-up. I'm after honest feedback:
> would you use it, what's missing, what would you pay?
> https://somehowimanage.app/?utm_source=reddit&utm_medium=post&utm_campaign=oct26

**r/ClaudeAI / r/mcp** (title: *An MCP server for the people you manage: "prepare my 1:1 with
Emily" works*):

> I built a people-first task manager (tasks and notes hang off the people you manage) and gave
> it an MCP server. Connect it to Claude and you can ask what's open with someone, prepare a 1:1,
> add a task with a person or move one between people. OAuth through Supabase Auth, the server
> runs as the user under row-level security, one URL to add. Page with the address and the tools:
> https://somehowimanage.app/mcp/?utm_source=reddit&utm_medium=post&utm_campaign=oct26

### Reddit Ads creative

- **Headline:** Managers don't have tasks. They have people.
- **Body:** A task manager built around your team: every task and note belongs to a person, your
  whole team on one map, 1:1 agendas that build themselves. Free, offline-first, works with
  Claude and ChatGPT.
- **Image:** `public/og.jpg` (1200×630). **CTA:** Learn more.
- **Link:** the Reddit (ads) link above.

### MCP directories (need the public repository)

- Smithery: https://smithery.ai/new (remote server, OAuth; the address is the `/functions/v1/mcp` URL)
- PulseMCP: https://www.pulsemcp.com/submit
- mcp.so: https://mcp.so/submit
- awesome-mcp-servers (punkpeye): a pull request adding the server under "Productivity"; I can
  open it from here on request.

## In the app (done, this commit)

- **Campaign links are remembered** on the first visit (`utm_source`, `utm_medium`,
  `utm_campaign`, `ref`), kept in the browser, and attached to the first answer below.
- **"Where did you hear about us?"** once, after the first sign-in on a device, as a small card
  with chips (Hacker News, Product Hunt, Reddit, LinkedIn, Google, a friend, somewhere else) and
  Skip. Not asked when a campaign link already says.
- **Two questions after a week** of use (first sign-in more than seven days ago, three or more
  people): *Would you pay for this?* (yes / maybe / no) and *What is missing?* (free text). Once.
- **Visits counted** by day, path and campaign tag, first-party, no cookies, no IP, no user agent.
- Everything lands in two tables in Supabase (`feedback`, `page_views`) that only the dashboard
  reads; `supabase/schema.sql` creates them (re-run it once). Reading the results: *Table Editor
  → feedback*, and the `page_views_daily` view for the counts.

## Reading the results (weekly, 10 minutes)

In the Supabase dashboard: `feedback` sorted by `created_at` (answers and sources),
`page_views_daily` for visits per day per campaign, *Authentication → Users* for sign-ups per
day. Paste the three into the chat and I turn them into "what worked, what people said, what to
do next".
