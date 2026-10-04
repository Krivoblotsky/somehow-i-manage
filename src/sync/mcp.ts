import { SYNC_CONFIG } from './config';

/** Where AI assistants connect: the MCP Edge Function of this build's Supabase project. */
export const MCP_URL: string | null = SYNC_CONFIG ? `${SYNC_CONFIG.url}/functions/v1/mcp` : null;

/** The one-liner for Claude Code; other clients take the URL alone. */
export const claudeCodeCommand = (url: string): string =>
  `claude mcp add --transport http somehow-i-manage ${url}`;
