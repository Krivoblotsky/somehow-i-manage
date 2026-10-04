// The app's MCP server: AI assistants (Claude, ChatGPT, Cursor, VS Code…) work with the signed-in
// user's people, tasks, notes and projects. Supabase Auth is the OAuth 2.1 server, so a client
// signs the user in, the user approves it once on the app's consent screen, and every tool call
// runs as that user under the same RLS as the app itself. See docs/MCP.md.
// deno-lint-ignore no-unversioned-import -- the types track the runtime, as Supabase's guide has it
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

import { createMcpHandler } from 'npm:@modelcontextprotocol/server@^2.3.0';
import { pipeline } from 'npm:@supabase/middleware@1';
import { withOAuthProtectedResource, withSupabase } from 'npm:@supabase/server@1';

import { buildServer } from './server.ts';
import { type Db, supabaseStore } from './store.ts';

Deno.serve(
  pipeline(
    // 1. OAuth discovery for MCP clients (401 + WWW-Authenticate, resource metadata),
    // 2. verify the user's token and hand over a client scoped to them.
    [withOAuthProtectedResource(), withSupabase({ auth: 'user' })],
    (req, { supabase }) => {
      // Edge Functions are stateless: a fresh server per request.
      const handler = createMcpHandler(() => buildServer(supabaseStore(supabase as unknown as Db)));
      return handler.fetch(req);
    },
  ),
);
