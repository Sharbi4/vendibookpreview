import { useHostEntitlements, type HostTier } from './useHostEntitlements';

/**
 * Client-side tier gate. Mirrors the Postgres helper `public.user_has_tier(uid, min_tier)`
 * for UI gating. Always pair with a server-side check (RLS via `user_has_tier`, or an
 * edge function calling the same RPC) — never rely on the client-side result alone.
 */
export function useTierGate(minTier: HostTier) {
  const ent = useHostEntitlements();
  return {
    ...ent,
    allowed: ent.hasAtLeast(minTier),
  };
}
