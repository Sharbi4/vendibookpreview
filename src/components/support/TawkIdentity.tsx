/**
 * Wires the authenticated Vendibook user's non-sensitive identity into Tawk.to
 * so support agents see who they're chatting with. Identity comes from our
 * server-side auth session (Supabase) — never from URL params or client state.
 *
 * Only safe fields are forwarded:
 *   - name (display name, falls back to email local-part)
 *   - email (verified via Supabase auth session)
 *   - user_id (our internal id, not a secret)
 *
 * NEVER include: passwords, tokens, payment data, admin flags, PII beyond the
 * above, or anything privileged. Tawk is a communication channel — support
 * tickets remain the authoritative record in Vendibook.
 */
import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

declare global {
  interface Window {
    Tawk_API?: {
      onLoad?: () => void;
      setAttributes?: (attrs: Record<string, string>, cb?: (err?: unknown) => void) => void;
      visitor?: Record<string, string>;
    };
  }
}

const TawkIdentity = () => {
  const { user, profile } = useAuth();

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!user?.email) return;

    const displayName =
      (profile as { display_name?: string; full_name?: string } | null)?.display_name ||
      (profile as { display_name?: string; full_name?: string } | null)?.full_name ||
      user.email.split('@')[0];

    const attrs = {
      name: String(displayName).slice(0, 80),
      email: user.email,
      user_id: user.id,
    };

    const apply = () => {
      try {
        // visitor works pre-load; setAttributes works once the widget is ready
        window.Tawk_API = window.Tawk_API || {};
        window.Tawk_API.visitor = { ...attrs };
        window.Tawk_API.setAttributes?.(attrs, () => { /* swallow */ });
      } catch { /* Tawk unavailable — no-op */ }
    };

    // First pass now, then again once Tawk finishes loading
    apply();
    const prev = window.Tawk_API?.onLoad;
    if (window.Tawk_API) {
      window.Tawk_API.onLoad = () => {
        try { prev?.(); } catch { /* keep host onLoad safe */ }
        apply();
      };
    }
  }, [user?.id, user?.email, profile]);

  return null;
};

export default TawkIdentity;
