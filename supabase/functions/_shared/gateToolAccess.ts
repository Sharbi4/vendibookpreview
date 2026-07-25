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
import { entitlementError, jsonError } from './jsonError.ts';

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
    return { response: jsonError(401, 'auth_required', 'Sign in required to use this tool.') };
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  const auth = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: userRes, error } = await auth.auth.getUser();
  if (error || !userRes?.user) {
    return { response: jsonError(401, 'auth_invalid', 'Session expired. Sign in and try again.') };
  }

  const access = await resolveToolAccess(userRes.user.id, tool);
  if (!access.unlocked) {
    return {
      response: entitlementError({
        tool,
        current: access.tier,
        feature: tool,
      }),
    };
  }
  return { userId: userRes.user.id };
}
// corsHeaders intentionally unused now — kept in signature for backward compat.
void corsHeadersUnused;
function corsHeadersUnused(_: Record<string, string>) { /* noop */ }
