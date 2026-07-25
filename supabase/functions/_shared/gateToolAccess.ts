// deno-lint-ignore-file no-explicit-any
/**
 * Small helper used by the AI-tool edge functions (ai-tools, ai-marketing-creator,
 * ai-web-research, ai-equipment-guide) to enforce paid access before spending
 * gateway credits. Mirrors the client-side <ToolAccessGate>.
 *
 * Usage:
 *   const gate = await gateToolAccess(req, 'pricepilot', corsHeaders);
 *   if (gate.response) return gate.response;
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.2';
import { resolveToolAccess, type ToolSlug } from './toolAccess.ts';

export interface GateResult {
  response?: Response;
  userId?: string;
}

export async function gateToolAccess(
  req: Request,
  tool: ToolSlug,
  corsHeaders: Record<string, string>,
): Promise<GateResult> {
  const authHeader = req.headers.get('Authorization') ?? '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!token) {
    return {
      response: new Response(
        JSON.stringify({ error: 'auth_required', message: 'Sign in required to use this tool.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      ),
    };
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  const auth = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: userRes, error } = await auth.auth.getUser();
  if (error || !userRes?.user) {
    return {
      response: new Response(
        JSON.stringify({ error: 'auth_invalid', message: 'Session expired. Sign in and try again.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      ),
    };
  }

  const access = await resolveToolAccess(userRes.user.id, tool);
  if (!access.unlocked) {
    return {
      response: new Response(
        JSON.stringify({
          error: 'tool_locked',
          tool,
          message: 'This tool is included with Vendibook Pro. Upgrade to unlock.',
          upgrade_url: '/pricing',
        }),
        { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      ),
    };
  }
  return { userId: userRes.user.id };
}
