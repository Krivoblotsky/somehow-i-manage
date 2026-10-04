# MCP server: the app for AI assistants

*Built 2026-10-04. The server code is in `supabase/functions/mcp/`; the user-facing page is
https://somehowimanage.app/mcp/.*

## What it is

A [Model Context Protocol](https://modelcontextprotocol.io) server that lets any MCP client
(Claude, ChatGPT, Cursor, VS Code, Claude Code…) work with a user's people, tasks, notes and
projects **as that user**. "What is open with Vira?", "prepare my 1:1 with Anton", "add a task
with Emily: draft the hiring plan by Friday". The assistant gets the same view the user has in
the app and nothing more; what it changes shows up on the user's devices through the normal sync.

## How it works

```
MCP client ──OAuth 2.1 (PKCE, dynamic registration)──▶ Supabase Auth (authorization server)
     │                                                        │ redirects the user to
     │                                                        ▼
     │                                     https://somehowimanage.app/oauth/consent?authorization_id=…
     │                                     (the app: sign in if needed, then Allow / Don't allow)
     │
     └──Bearer <user access token>──▶ Edge Function  /functions/v1/mcp
                                       withOAuthProtectedResource()   discovery, 401 challenge
                                       withSupabase({ auth: 'user' }) verifies the token (ES256 JWKS)
                                       tools ──▶ public.sync_records / sync_push()   under RLS
```

- **No keys of its own.** The client's token is the user's. The function reads `sync_records`
  and writes through `sync_push()` exactly like a device does, so RLS applies and every change
  carries a fresh `updated_at`; devices pull it on their next sync (Realtime nudges them).
- **Stateless.** A fresh `McpServer` per request (`createMcpHandler`), as Edge Functions want.
  No sessions, no sampling.
- **Consent lives in the app.** Supabase sends the user to the Authorization Path on the Site
  URL. On a static host that path cannot be routed to the app, so `public/oauth/consent/index.html`
  carries the query string to `/`, where `captureConsentRequest()` keeps the id in session
  storage, and `App` shows `OAuthConsent` until the user decides. Signed-out users sign in first;
  the id survives the round trip.
- **Grants are visible.** *Account & sync → AI assistants* lists connected clients (OAuth grants)
  with Disconnect, and shows the address plus the Claude Code one-liner.

## Tools

| Tool | Does |
|---|---|
| `list_people` | everyone, with open/urgent counts, notes, last 1:1, projects; ids in brackets |
| `get_person` | one person's page: role, contacts, last 1:1, open tasks (urgent first), notes, done recently |
| `prepare_one_on_one` | the agenda the app's 1:1 screen builds: open tasks, notes, done and new since the last 1:1 |
| `whats_due` | tasks overdue or due within N days, across everyone |
| `search` | people, tasks, notes, projects by words |
| `add_person`, `add_task`, `add_note` | new records; tasks take `due_date` (YYYY-MM-DD), `urgent`, `project` (created if new) |
| `update_item` | title, details, due date (`""` clears), urgent, completed, kind, project (`""` removes) |
| `complete_task`, `move_item`, `delete_item` | the rest of the verbs; delete is marked destructive |
| `list_projects`, `create_project` | the tags across people |

People are named by name (first name is enough when unique) or id; items and projects by id.
`details` is plain text or light Markdown (paragraphs, `-` lists) and becomes the editor's HTML.
New items have no map position: the app places them around the person on its next start
(`ensureMapPositions`), and shows them on the automatic ring until then.

The record shapes are copied in `supabase/functions/mcp/model.ts` and must stay in step with
`src/model/types.ts`.

## Set it up (once per project)

The function is in the repository; the project needs three things turned on and one deploy.

1. **Asymmetric JWT signing.** `withSupabase` verifies tokens against the project's JWKS and
   rejects the legacy HS256 secret. This project already signs with ES256 (checked 2026-10-04:
   `/auth/v1/.well-known/jwks.json` shows one EC key). Nothing to do unless that changes.
2. **Supabase dashboard → Authentication → OAuth Server:** enable the OAuth 2.1 server, set the
   **Authorization Path** to `/oauth/consent`, and enable **dynamic client registration** (MCP
   clients register themselves). The Site URL is already `https://somehowimanage.app`.
3. **Deploy the function** with the Supabase CLI (no install needed):
   ```bash
   npx supabase@latest login
   npx supabase@latest functions deploy mcp --project-ref mvpbxmlczninyqsyjhqh --no-verify-jwt
   ```
   `--no-verify-jwt` matches `supabase/config.toml`: the function checks tokens itself; the
   gateway's check would reject the unauthenticated discovery request every client starts with.
   Do not run `supabase config push`: the toml holds only what the deploy needs.
4. **Check the handshake** (expect `401` with a `WWW-Authenticate: Bearer resource_metadata=…`
   header, and a JSON document naming the Auth server):
   ```bash
   curl -si -X POST https://mvpbxmlczninyqsyjhqh.supabase.co/functions/v1/mcp \
     -H 'Content-Type: application/json' -H 'Accept: application/json, text/event-stream' \
     -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-06-18","capabilities":{},"clientInfo":{"name":"curl","version":"0"}}}' \
     | grep -i '^HTTP\|www-authenticate'
   curl -s https://mvpbxmlczninyqsyjhqh.supabase.co/functions/v1/mcp/oauth-protected-resource
   ```
5. **Try it:** `claude mcp add --transport http somehow-i-manage https://mvpbxmlczninyqsyjhqh.supabase.co/functions/v1/mcp`, then `/mcp` in Claude Code to sign in and approve. Ask it what is open with someone.

## Working on it

Deno is not installed on the Mac; `npx -y deno` runs it (2.9 at the time of writing). The
`deno.json` in `supabase/functions/` tells Deno to fetch npm packages itself instead of looking
in the project's `node_modules`.

```bash
npx -y deno test -A --config supabase/functions/deno.json supabase/functions/mcp/   # end-to-end over Streamable HTTP, in-process
npx -y deno check --config supabase/functions/deno.json supabase/functions/mcp/index.ts
npx -y deno fmt --config supabase/functions/deno.json supabase/functions/mcp/
```

The test drives the server with the real MCP client (`@modelcontextprotocol/client`) against a
memory store that applies changes the way `sync_push()` does, so tool text, ids, dates and the
order of pushes are all checked without a Supabase project.

## Limits and later

- Edge Functions answer one request at a time: no sampling, no server-initiated prompts.
- Deleting from an assistant has no Undo (the app's Undo lives in the toast).
- Later: a `record_one_on_one` tool, resources (`somehow://people/{id}`) for clients that read
  rather than call, the user's own notes about an assistant, rate limits if ever needed.
- Dynamic client registration means any MCP client can register itself; the consent screen is
  the gate, and *Account & sync* is where to look at and cut what is connected.
