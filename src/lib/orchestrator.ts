import { supabase } from "@/integrations/supabase/client";

/**
 * Trigger the AI Orchestrator to decide channel + timing + content for a lifecycle event.
 * Fire-and-forget — never blocks UI flows.
 */
export async function triggerOrchestrator(args: {
  user_id: string;
  event_type: OrchestratorEvent;
  entity_id?: string;
  payload?: Record<string, unknown>;
  force?: boolean;
}) {
  try {
    await supabase.functions.invoke("orchestrator-route", { body: args });
  } catch (e) {
    // Silent — orchestration must never break UX
    console.warn("[orchestrator] dispatch failed", e);
  }
}

export type OrchestratorEvent =
  | "user_signup"
  | "listing_published"
  | "listing_draft_stale"
  | "booking_request_received"
  | "booking_confirmed"
  | "booking_completed"
  | "payout_received"
  | "referral_redeemed"
  | "listing_low_views"
  | "search_no_results";
