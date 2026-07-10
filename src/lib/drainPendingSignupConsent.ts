/**
 * drainPendingSignupConsent — replays the stashed signup consent snapshot
 * (Terms + Privacy, and marketing opt-in if present) once the user actually
 * has an authenticated session. Idempotent: clears the stash after a
 * successful write and no-ops on subsequent calls.
 *
 * Called from AuthContext on `SIGNED_IN` for the first post-verify action.
 */
import type { User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { CONSENT_TRIGGERS, DOCUMENT_TYPES } from '@/lib/legalDocuments';
import {
  clearPendingSignupConsent,
  readPendingSignupConsent,
} from '@/lib/pendingSignupConsent';

// Guard against concurrent auth-state fires (Supabase can emit SIGNED_IN
// multiple times back-to-back on the same session).
let inflight: Promise<void> | null = null;

export async function drainPendingSignupConsent(user: User): Promise<void> {
  if (inflight) return inflight;
  const pending = readPendingSignupConsent();
  if (!pending) return;

  // Only replay for the user who actually clicked the checkbox — never
  // attach one person's consent to another account on a shared browser.
  const userEmail = user.email?.toLowerCase().trim();
  if (!userEmail || userEmail !== pending.email.toLowerCase().trim()) {
    return;
  }

  inflight = (async () => {
    try {
      const relatedIds = {
        role: pending.role,
        captured_at: pending.capturedAt,
        deferred: true,
      };

      const { error: tosErr } = await supabase.rpc('record_user_consent', {
        _document_type: DOCUMENT_TYPES.TERMS_OF_SERVICE,
        _document_version: pending.tosVersion,
        _trigger_action: CONSENT_TRIGGERS.SIGNUP,
        _acceptance_text: pending.acceptanceText,
        _related_ids: relatedIds,
        _route: pending.route,
        _ip: null,
        _user_agent: pending.userAgent,
        _locale: pending.locale,
        _application_version: null,
      });
      if (tosErr) throw tosErr;

      const { error: privacyErr } = await supabase.rpc('record_user_consent', {
        _document_type: DOCUMENT_TYPES.PRIVACY_POLICY,
        _document_version: pending.privacyVersion,
        _trigger_action: CONSENT_TRIGGERS.SIGNUP,
        _acceptance_text: pending.acceptanceText,
        _related_ids: relatedIds,
        _route: pending.route,
        _ip: null,
        _user_agent: pending.userAgent,
        _locale: pending.locale,
        _application_version: null,
      });
      if (privacyErr) throw privacyErr;

      if (pending.marketingOptIn && userEmail) {
        try {
          await supabase
            .from('newsletter_subscribers')
            .upsert(
              { email: userEmail, source: 'signup_opt_in' },
              { onConflict: 'email' },
            );
        } catch (newsletterErr) {
          // Marketing opt-in is best-effort; never block the deferred
          // consent drain on a newsletter row.
          console.warn(
            '[drainPendingSignupConsent] newsletter upsert failed',
            newsletterErr,
          );
        }
      }

      clearPendingSignupConsent();
    } catch (err) {
      // Keep the stash so we can retry on the next authenticated action.
      console.error(
        '[drainPendingSignupConsent] failed to record deferred consent',
        err,
      );
    } finally {
      inflight = null;
    }
  })();

  return inflight;
}
