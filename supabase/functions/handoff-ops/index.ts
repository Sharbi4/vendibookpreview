// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { corsHeaders, jsonError, jsonResponse, unknownErrorResponse } from "../_shared/jsonError.ts";
import { notifyUser } from "../_shared/notify.ts";
import { paypalRequest } from "../_shared/paypal.ts";
import { isSignNowConfigured } from "../_shared/signnow.ts";
import {
  computeRoute,
  geocodeAddress,
  isGoogleRoutingConfigured,
} from "../_shared/googleRouting.ts";
import {
  LEGAL_VERSIONS,
  hasCurrentLegalAcceptance,
  recordServerLegalAcceptance,
} from "../_shared/legalVersions.ts";


/**
 * Vendibook Verified Handoff — evidence / chain-of-custody operations.
 *
 * This endpoint never moves money and never changes payment state. It only
 * records fulfillment + handoff evidence tied to a real transaction, and
 * surfaces honest status for external providers (SignNow / PayPal tracking).
 *
 * Auth: a signed-in participant (buyer / seller / admin), OR an unauthenticated
 * request carrying a valid, unexpired, unrevoked one-time driver token whose
 * scope is limited to a single fulfillment session.
 */

const FULFILLMENT_MODES = [
  "vendibook_freight",
  "seller_delivery",
  "third_party_driver",
  "buyer_pickup",
] as const;

type Mode = (typeof FULFILLMENT_MODES)[number];

const admin = () =>
  createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } },
  );

async function sha256(value: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function pickupCode(): string {
  const n = crypto.getRandomValues(new Uint32Array(1))[0] % 1_000_000;
  return String(n).padStart(6, "0");
}

function driverToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Round to ~11m precision — enough for evidence, no more collection than needed. */
const coarse = (v: number) => Math.round(v * 10000) / 10000;

interface TargetRef {
  sale_transaction_id: string | null;
  booking_id: string | null;
  listing_id: string | null;
  seller_id: string | null;
  buyer_id: string | null;
  reference: string | null;
  fulfillment_type: string | null;
}

async function loadTarget(
  db: any,
  saleId?: string | null,
  bookingId?: string | null,
): Promise<TargetRef | null> {
  if (saleId) {
    const { data } = await db
      .from("sale_transactions")
      .select("id, listing_id, seller_id, buyer_id, fulfillment_type")
      .eq("id", saleId)
      .maybeSingle();
    if (!data) return null;
    return {
      sale_transaction_id: data.id,
      booking_id: null,
      listing_id: data.listing_id,
      seller_id: data.seller_id,
      buyer_id: data.buyer_id,
      reference: data.id,
      fulfillment_type: data.fulfillment_type ?? null,
    };
  }
  if (bookingId) {
    const { data } = await db
      .from("booking_requests")
      .select("id, listing_id, host_id, shopper_id, fulfillment_selected")
      .eq("id", bookingId)
      .maybeSingle();
    if (!data) return null;
    return {
      sale_transaction_id: null,
      booking_id: data.id,
      listing_id: data.listing_id,
      seller_id: data.host_id,
      buyer_id: data.shopper_id,
      reference: data.id,
      fulfillment_type: data.fulfillment_selected ?? null,
    };
  }
  return null;
}

async function logEvidence(db: any, row: Record<string, unknown>) {
  try {
    await db.from("transaction_evidence_events").insert(row);
  } catch (_) {
    // evidence logging must never break the operation
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const db = admin();
    const body = await req.json().catch(() => ({}));
    const action: string = String(body.action ?? "");
    if (!action) return jsonError(400, "missing_action", "An action is required.");

    // ---------- identity ----------
    let userId: string | null = null;
    let isAdmin = false;
    let driverSessionId: string | null = null;

    const token: string | undefined = body.driver_token;
    if (token) {
      const hash = await sha256(String(token));
      const { data: link } = await db
        .from("secure_driver_links")
        .select("id, fulfillment_session_id, expires_at, revoked_at, driver_name")
        .eq("token_hash", hash)
        .maybeSingle();
      if (!link) return jsonError(403, "invalid_link", "This delivery link is not valid.");
      if (link.revoked_at) return jsonError(403, "revoked_link", "This delivery link was revoked.");
      if (new Date(link.expires_at).getTime() < Date.now()) {
        return jsonError(403, "expired_link", "This delivery link has expired.");
      }
      driverSessionId = link.fulfillment_session_id;
      await db
        .from("secure_driver_links")
        .update({ last_used_at: new Date().toISOString(), first_used_at: link.first_used_at ?? new Date().toISOString() })
        .eq("id", link.id);
    } else {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader) return jsonError(401, "unauthenticated", "Please sign in to continue.");
      const { data: userData } = await db.auth.getUser(authHeader.replace("Bearer ", ""));
      if (!userData?.user) return jsonError(401, "unauthenticated", "Your session expired. Please sign in again.");
      userId = userData.user.id;
      const { data: adminFlag } = await db.rpc("has_role", { _user_id: userId, _role: "admin" });
      isAdmin = !!adminFlag;
    }

    const assertParticipant = (t: TargetRef | null) => {
      if (!t) return "We couldn't find that transaction.";
      if (isAdmin) return null;
      if (userId && (t.seller_id === userId || t.buyer_id === userId)) return null;
      return "This transaction belongs to another account.";
    };

    const loadHandoff = async (id: string) => {
      const { data } = await db.from("handoff_sessions").select("*").eq("id", id).maybeSingle();
      return data;
    };

    const handoffGuard = async (handoff: any, allowDriver = false) => {
      if (!handoff) return "We couldn't find that handoff.";
      if (driverSessionId) {
        return allowDriver && handoff.fulfillment_session_id === driverSessionId
          ? null
          : "This link does not cover that action.";
      }
      if (isAdmin) return null;
      if (userId && (handoff.seller_id === userId || handoff.buyer_id === userId)) return null;
      return "This handoff belongs to another account.";
    };

    switch (action) {
      // ================= CONTEXT =================
      case "get_context": {
        const target = await loadTarget(db, body.sale_transaction_id, body.booking_id);
        const err = assertParticipant(target);
        if (err) return jsonError(403, "forbidden", err);
        const t = target!;

        const filter = (q: any) =>
          t.sale_transaction_id
            ? q.eq("sale_transaction_id", t.sale_transaction_id)
            : q.eq("booking_id", t.booking_id);

        const [fulfillment, handoffs, tracking, evidence] = await Promise.all([
          filter(db.from("fulfillment_sessions").select("*")).order("created_at", { ascending: false }),
          filter(db.from("handoff_sessions").select("*")).order("started_at", { ascending: false }),
          filter(db.from("shipment_tracking_events").select("*")).order("event_at", { ascending: true }),
          filter(db.from("transaction_evidence_events").select("*")).order("occurred_at", { ascending: true }),
        ]);

        const handoffIds = (handoffs.data ?? []).map((h: any) => h.id);
        const [media, exceptions, signatures] = handoffIds.length
          ? await Promise.all([
              db.from("handoff_media").select("*").in("handoff_session_id", handoffIds),
              db.from("handoff_exceptions").select("*").in("handoff_session_id", handoffIds),
              db.from("handoff_signatures").select("*").in("handoff_session_id", handoffIds),
            ])
          : [{ data: [] }, { data: [] }, { data: [] }];

        // Buyer never receives the pickup code from the server-side generator;
        // the seller reads it aloud / shows it in person.
        const viewerIsSeller = isAdmin || userId === t.seller_id;
        const handoffRows = (handoffs.data ?? []).map((h: any) =>
          viewerIsSeller ? h : { ...h, pickup_code: null },
        );

        return jsonResponse(200, {
          success: true,
          target: t,
          viewer_role: isAdmin ? "admin" : userId === t.seller_id ? "seller" : "buyer",
          fulfillment_sessions: fulfillment.data ?? [],
          handoff_sessions: handoffRows,
          media: media.data ?? [],
          exceptions: exceptions.data ?? [],
          signatures: signatures.data ?? [],
          tracking: tracking.data ?? [],
          evidence: evidence.data ?? [],
          signnow_configured: isSignNowConfigured(),
        });
      }

      // ================= FULFILLMENT SESSION =================
      case "start_fulfillment": {
        const target = await loadTarget(db, body.sale_transaction_id, body.booking_id);
        const err = assertParticipant(target);
        if (err) return jsonError(403, "forbidden", err);
        const t = target!;
        const mode: Mode = FULFILLMENT_MODES.includes(body.mode) ? body.mode : "seller_delivery";
        const consent = !!body.location_consent;

        const { data: session, error } = await db
          .from("fulfillment_sessions")
          .insert({
            sale_transaction_id: t.sale_transaction_id,
            booking_id: t.booking_id,
            listing_id: t.listing_id,
            seller_id: t.seller_id,
            buyer_id: t.buyer_id,
            mode,
            status: mode === "buyer_pickup" ? "pending" : "en_route",
            driver_name: body.driver_name ?? null,
            driver_email: body.driver_email ?? null,
            driver_phone: body.driver_phone ?? null,
            location_consent: consent,
            location_consent_at: consent ? new Date().toISOString() : null,
            location_consent_by: consent ? userId : null,
            started_at: new Date().toISOString(),
            created_by: userId,
          })
          .select()
          .single();
        if (error) return jsonError(400, "insert_failed", error.message);

        await logEvidence(db, {
          sale_transaction_id: t.sale_transaction_id,
          booking_id: t.booking_id,
          fulfillment_session_id: session.id,
          event_type: "delivery_started",
          title: mode === "buyer_pickup" ? "Pickup session opened" : "Delivery started",
          detail: consent ? "Location documentation enabled for this session." : "Location documentation not enabled.",
          actor_id: userId,
          actor_role: "seller",
          status: "en_route",
        });

        await notifyUser(db, {
          userId: t.buyer_id,
          type: "buyer_action_required",
          title: "Your delivery has started",
          message: "The seller started the delivery. You can follow the handoff on your order.",
          link: t.sale_transaction_id ? `/handoff/sale/${t.sale_transaction_id}` : `/handoff/booking/${t.booking_id}`,
          dedupeKey: `delivery_started:${session.id}`,
        });

        return jsonResponse(200, { success: true, session });
      }

      case "log_gps": {
        const sessionId: string = driverSessionId ?? body.fulfillment_session_id;
        if (!sessionId) return jsonError(400, "missing_session", "A delivery session is required.");
        const { data: session } = await db
          .from("fulfillment_sessions")
          .select("*")
          .eq("id", sessionId)
          .maybeSingle();
        if (!session) return jsonError(404, "not_found", "That delivery session no longer exists.");
        if (!driverSessionId) {
          const errp = assertParticipant({
            ...session,
            reference: session.id,
            fulfillment_type: session.mode,
          } as TargetRef);
          if (errp) return jsonError(403, "forbidden", errp);
        }
        if (!session.location_consent) {
          return jsonError(400, "no_consent", "Location documentation is not enabled for this delivery.");
        }
        if (["completed", "cancelled"].includes(session.status)) {
          return jsonError(400, "session_closed", "This delivery session is already closed.");
        }
        if (session.tracking_active === false || session.tracking_paused === true) {
          return jsonError(400, "tracking_inactive", "Live tracking is not running for this delivery.");
        }
        const lat = Number(body.latitude);
        const lng = Number(body.longitude);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
          return jsonError(400, "bad_location", "A valid location is required.");
        }
        const now = new Date();
        const accuracy = Number.isFinite(Number(body.accuracy_m)) ? Number(body.accuracy_m) : null;

        const update: Record<string, unknown> = {
          last_latitude: coarse(lat),
          last_longitude: coarse(lng),
          last_accuracy_m: accuracy,
          last_location_at: now.toISOString(),
          updated_at: now.toISOString(),
        };

        // Real route/ETA only — refreshed at most once a minute, never invented.
        const dLat = session.destination_latitude !== null ? Number(session.destination_latitude) : null;
        const dLng = session.destination_longitude !== null ? Number(session.destination_longitude) : null;
        const routeAge = session.route_updated_at
          ? now.getTime() - new Date(session.route_updated_at).getTime()
          : Number.MAX_SAFE_INTEGER;
        if (dLat !== null && dLng !== null && routeAge > 60_000) {
          const route = await computeRoute({ lat, lng }, { lat: dLat, lng: dLng });
          if (route) {
            update.route_distance_meters = route.distance_meters;
            update.route_duration_seconds = route.duration_seconds;
            update.route_polyline = route.polyline;
            update.route_provider = "google_routes";
            update.route_updated_at = now.toISOString();
          }
        }

        await db.from("fulfillment_sessions").update(update).eq("id", sessionId);

        // Minimal retention: the live point lives on the session row. A sparse
        // breadcrumb is kept only every ~2 minutes as delivery evidence.
        const { data: recent } = await db
          .from("gps_trip_events")
          .select("recorded_at")
          .eq("fulfillment_session_id", sessionId)
          .order("recorded_at", { ascending: false })
          .limit(1);
        const lastAt = recent?.[0]?.recorded_at ?? null;
        if (!lastAt || now.getTime() - new Date(lastAt).getTime() > 120_000) {
          await db.from("gps_trip_events").insert({
            fulfillment_session_id: sessionId,
            latitude: coarse(lat),
            longitude: coarse(lng),
            accuracy_m: accuracy,
            source: driverSessionId ? "driver_browser" : "browser",
          });
        }
        return jsonResponse(200, { success: true });
      }

      // ================= LIVE DELIVERY TRACKING =================
      case "start_tracking": {
        const sessionId: string = driverSessionId ?? body.fulfillment_session_id;
        if (!sessionId) return jsonError(400, "missing_session", "A delivery session is required.");
        const { data: session } = await db
          .from("fulfillment_sessions").select("*").eq("id", sessionId).maybeSingle();
        if (!session) return jsonError(404, "not_found", "That delivery session no longer exists.");
        if (!driverSessionId) {
          const errp = assertParticipant(session as unknown as TargetRef);
          if (errp) return jsonError(403, "forbidden", errp);
          if (!isAdmin && session.seller_id !== userId && session.assigned_driver_user_id !== userId) {
            return jsonError(403, "forbidden", "Only the seller or the assigned driver can start tracking.");
          }
        }
        if (["completed", "cancelled"].includes(session.status)) {
          return jsonError(400, "session_closed", "This delivery is already closed.");
        }
        if (!body.location_consent) {
          return jsonError(400, "consent_required", "Please accept the delivery location notice before starting.");
        }

        // Server-side gate: the Location & Delivery Tracking Disclosure must be
        // accepted at the CURRENT version before any location sharing starts.
        // Calling this endpoint directly cannot skip it.
        {
          const wanted = LEGAL_VERSIONS["location-tracking"];
          if (driverSessionId) {
            // One-time driver link: no account exists, so the current version
            // must be asserted in the request and is stored on the session.
            if (String(body.legal_acceptance_version ?? "") !== wanted) {
              return jsonError(
                400,
                "legal_acceptance_required",
                "Please accept the current Location & Delivery Tracking Disclosure before starting.",
              );
            }
          } else {
            const accepted = await hasCurrentLegalAcceptance(db, userId!, "location-tracking");
            if (!accepted) {
              if (String(body.legal_acceptance_version ?? "") !== wanted) {
                return jsonError(
                  400,
                  "legal_acceptance_required",
                  "Please accept the current Location & Delivery Tracking Disclosure before starting.",
                );
              }
              await recordServerLegalAcceptance(db, {
                userId: userId!,
                slug: "location-tracking",
                surface: "delivery_mode",
                relatedEntityType: "delivery",
                relatedEntityId: sessionId,
                grantedPermissions: { location: true },
              });
            }
          }
        }
        if (session.mode === "buyer_pickup") {
          return jsonError(400, "not_a_delivery", "Live tracking is only available for deliveries.");
        }

        // Resolve the destination once, from the real order address.
        let destLat = session.destination_latitude;
        let destLng = session.destination_longitude;
        let destLabel = session.destination_label;
        if (destLat === null || destLng === null) {
          if (!destLabel) {
            if (session.sale_transaction_id) {
              const { data: st } = await db.from("sale_transactions")
                .select("delivery_address").eq("id", session.sale_transaction_id).maybeSingle();
              destLabel = st?.delivery_address ?? null;
            } else if (session.booking_id) {
              const { data: br } = await db.from("booking_requests")
                .select("delivery_address").eq("id", session.booking_id).maybeSingle();
              destLabel = br?.delivery_address ?? null;
            }
          }
          if (destLabel) {
            const point = await geocodeAddress(String(destLabel));
            if (point) {
              destLat = coarse(point.lat);
              destLng = coarse(point.lng);
            }
          }
        }

        const nowIso = new Date().toISOString();
        const { data: updated } = await db.from("fulfillment_sessions").update({
          tracking_active: true,
          tracking_paused: false,
          tracking_started_at: session.tracking_started_at ?? nowIso,
          tracking_ended_at: null,
          started_at: session.started_at ?? nowIso,
          status: session.status === "pending" ? "en_route" : session.status,
          assigned_driver_user_id: session.assigned_driver_user_id ?? userId,
          location_consent: true,
          location_consent_at: session.location_consent_at ?? nowIso,
          location_consent_by: session.location_consent_by ?? userId,
          location_consent_version: `location-tracking:${LEGAL_VERSIONS["location-tracking"]}`,
          destination_label: destLabel,
          destination_latitude: destLat,
          destination_longitude: destLng,
          updated_at: nowIso,
        }).eq("id", sessionId).select().single();

        await logEvidence(db, {
          sale_transaction_id: session.sale_transaction_id,
          booking_id: session.booking_id,
          fulfillment_session_id: sessionId,
          event_type: "tracking_started",
          title: "Live delivery tracking started",
          detail: "The driver enabled live location sharing for this delivery.",
          actor_id: userId,
          actor_role: driverSessionId ? "driver" : "seller",
          status: "en_route",
        });

        await notifyUser(db, {
          userId: session.buyer_id,
          type: "buyer_action_required",
          title: "Your delivery is on the way",
          message: "You can follow the delivery live on your order page.",
          link: `/orders/${session.sale_transaction_id ?? session.booking_id}`,
          dedupeKey: `tracking_started:${sessionId}`,
        });

        return jsonResponse(200, {
          success: true,
          session: updated,
          routing_configured: isGoogleRoutingConfigured(),
        });
      }

      case "pause_tracking":
      case "resume_tracking":
      case "end_tracking": {
        const sessionId: string = driverSessionId ?? body.fulfillment_session_id;
        const { data: session } = await db
          .from("fulfillment_sessions").select("*").eq("id", sessionId).maybeSingle();
        if (!session) return jsonError(404, "not_found", "That delivery session no longer exists.");
        if (!driverSessionId) {
          const errp = assertParticipant(session as unknown as TargetRef);
          if (errp) return jsonError(403, "forbidden", errp);
          if (!isAdmin && session.seller_id !== userId && session.assigned_driver_user_id !== userId) {
            return jsonError(403, "forbidden", "Only the seller or the assigned driver can change tracking.");
          }
        }
        const nowIso = new Date().toISOString();
        const patch: Record<string, unknown> = { updated_at: nowIso };
        if (action === "pause_tracking") patch.tracking_paused = true;
        if (action === "resume_tracking") { patch.tracking_paused = false; patch.tracking_active = true; }
        if (action === "end_tracking") {
          patch.tracking_active = false;
          patch.tracking_paused = false;
          patch.tracking_ended_at = nowIso;
        }
        await db.from("fulfillment_sessions").update(patch).eq("id", sessionId);
        await logEvidence(db, {
          sale_transaction_id: session.sale_transaction_id,
          booking_id: session.booking_id,
          fulfillment_session_id: sessionId,
          event_type: action,
          title: action === "pause_tracking"
            ? "Live tracking paused"
            : action === "resume_tracking" ? "Live tracking resumed" : "Live tracking ended",
          actor_id: userId,
          actor_role: driverSessionId ? "driver" : "seller",
          status: session.status,
        });
        return jsonResponse(200, { success: true });
      }

      case "mark_delivered": {
        const sessionId: string = driverSessionId ?? body.fulfillment_session_id;
        const { data: session } = await db
          .from("fulfillment_sessions").select("*").eq("id", sessionId).maybeSingle();
        if (!session) return jsonError(404, "not_found", "That delivery session no longer exists.");
        if (!driverSessionId) {
          const errp = assertParticipant(session as unknown as TargetRef);
          if (errp) return jsonError(403, "forbidden", errp);
          if (!isAdmin && session.seller_id !== userId && session.assigned_driver_user_id !== userId) {
            return jsonError(403, "forbidden", "Only the seller or the assigned driver can mark delivery complete.");
          }
        }
        const nowIso = new Date().toISOString();
        // Status/evidence only. This never captures, releases or settles money —
        // payment and payout continue to follow the existing order rules.
        await db.from("fulfillment_sessions").update({
          status: "completed",
          delivered_at: nowIso,
          completed_at: session.completed_at ?? nowIso,
          arrived_at: session.arrived_at ?? nowIso,
          tracking_active: false,
          tracking_paused: false,
          tracking_ended_at: nowIso,
          updated_at: nowIso,
        }).eq("id", sessionId);
        await db.from("secure_driver_links").update({ revoked_at: nowIso })
          .eq("fulfillment_session_id", sessionId).is("revoked_at", null);
        await logEvidence(db, {
          sale_transaction_id: session.sale_transaction_id,
          booking_id: session.booking_id,
          fulfillment_session_id: sessionId,
          event_type: "delivery_completed",
          title: "Delivery marked delivered",
          detail: "Location sharing stopped. Payment and payout follow the order's own rules.",
          actor_id: userId,
          actor_role: driverSessionId ? "driver" : "seller",
          status: "completed",
        });
        await notifyUser(db, {
          userId: session.buyer_id,
          type: "buyer_action_required",
          title: "Your delivery has been marked delivered",
          message: "Open your order to confirm the handoff and review the delivery record.",
          link: `/orders/${session.sale_transaction_id ?? session.booking_id}`,
          dedupeKey: `delivered:${sessionId}`,
        });
        return jsonResponse(200, { success: true });
      }


      case "mark_arrived": {
        const sessionId: string = driverSessionId ?? body.fulfillment_session_id;
        const { data: session } = await db
          .from("fulfillment_sessions")
          .select("*")
          .eq("id", sessionId)
          .maybeSingle();
        if (!session) return jsonError(404, "not_found", "That delivery session no longer exists.");
        if (!driverSessionId) {
          const errp = assertParticipant(session as unknown as TargetRef);
          if (errp) return jsonError(403, "forbidden", errp);
        }
        await db
          .from("fulfillment_sessions")
          .update({ status: "arrived", arrived_at: new Date().toISOString() })
          .eq("id", sessionId);
        await logEvidence(db, {
          sale_transaction_id: session.sale_transaction_id,
          booking_id: session.booking_id,
          fulfillment_session_id: sessionId,
          event_type: "arrival_confirmed",
          title: "Arrival confirmed",
          actor_id: userId,
          actor_role: driverSessionId ? "driver" : "seller",
          status: "arrived",
        });
        await notifyUser(db, {
          userId: session.buyer_id,
          type: "buyer_action_required",
          title: "Your delivery has arrived",
          message: "The driver marked arrival. Start the handoff walkthrough when you're together.",
          link: session.sale_transaction_id
            ? `/handoff/sale/${session.sale_transaction_id}`
            : `/handoff/booking/${session.booking_id}`,
          dedupeKey: `arrived:${sessionId}`,
        });
        return jsonResponse(200, { success: true });
      }

      case "cancel_fulfillment": {
        const sessionId: string = body.fulfillment_session_id;
        const { data: session } = await db.from("fulfillment_sessions").select("*").eq("id", sessionId).maybeSingle();
        if (!session) return jsonError(404, "not_found", "That delivery session no longer exists.");
        const errp = assertParticipant(session as unknown as TargetRef);
        if (errp) return jsonError(403, "forbidden", errp);
        await db
          .from("fulfillment_sessions")
          .update({ status: "cancelled", cancelled_at: new Date().toISOString() })
          .eq("id", sessionId);
        await db.from("secure_driver_links").update({ revoked_at: new Date().toISOString() })
          .eq("fulfillment_session_id", sessionId).is("revoked_at", null);
        await logEvidence(db, {
          sale_transaction_id: session.sale_transaction_id,
          booking_id: session.booking_id,
          fulfillment_session_id: sessionId,
          event_type: "delivery_cancelled",
          title: "Delivery session ended",
          detail: "Location documentation stopped.",
          actor_id: userId,
          actor_role: "seller",
          status: "cancelled",
        });
        return jsonResponse(200, { success: true });
      }

      // ================= DRIVER LINKS =================
      case "create_driver_link": {
        const sessionId: string = body.fulfillment_session_id;
        const { data: session } = await db.from("fulfillment_sessions").select("*").eq("id", sessionId).maybeSingle();
        if (!session) return jsonError(404, "not_found", "That delivery session no longer exists.");
        if (!isAdmin && session.seller_id !== userId) {
          return jsonError(403, "forbidden", "Only the seller can create a driver link.");
        }
        const raw = driverToken();
        const hash = await sha256(raw);
        const expires = new Date(Date.now() + 1000 * 60 * 60 * 48).toISOString();
        await db.from("secure_driver_links").update({ revoked_at: new Date().toISOString() })
          .eq("fulfillment_session_id", sessionId).is("revoked_at", null);
        const { data: link, error } = await db
          .from("secure_driver_links")
          .insert({
            fulfillment_session_id: sessionId,
            token_hash: hash,
            driver_name: body.driver_name ?? null,
            driver_email: body.driver_email ?? null,
            driver_phone: body.driver_phone ?? null,
            created_by: userId,
            expires_at: expires,
          })
          .select("id, expires_at, driver_name")
          .single();
        if (error) return jsonError(400, "insert_failed", error.message);

        await db.from("fulfillment_sessions").update({
          driver_name: body.driver_name ?? session.driver_name,
          driver_email: body.driver_email ?? session.driver_email,
          driver_phone: body.driver_phone ?? session.driver_phone,
        }).eq("id", sessionId);

        await logEvidence(db, {
          sale_transaction_id: session.sale_transaction_id,
          booking_id: session.booking_id,
          fulfillment_session_id: sessionId,
          event_type: "driver_link_created",
          title: "Driver link created",
          detail: body.driver_name ? `Secure link issued to ${body.driver_name}.` : "Secure driver link issued.",
          actor_id: userId,
          actor_role: "seller",
          status: "active",
        });

        return jsonResponse(200, {
          success: true,
          link_id: link.id,
          expires_at: link.expires_at,
          // returned once, to the seller only, so they can share it
          driver_url: `/driver/${raw}`,
        });
      }

      case "revoke_driver_link": {
        const { data: link } = await db
          .from("secure_driver_links")
          .select("id, fulfillment_session_id")
          .eq("id", body.link_id)
          .maybeSingle();
        if (!link) return jsonError(404, "not_found", "That driver link no longer exists.");
        const { data: session } = await db
          .from("fulfillment_sessions").select("*").eq("id", link.fulfillment_session_id).maybeSingle();
        if (!isAdmin && session?.seller_id !== userId) {
          return jsonError(403, "forbidden", "Only the seller can revoke this link.");
        }
        await db.from("secure_driver_links").update({ revoked_at: new Date().toISOString() }).eq("id", link.id);
        await logEvidence(db, {
          sale_transaction_id: session.sale_transaction_id,
          booking_id: session.booking_id,
          fulfillment_session_id: session.id,
          event_type: "driver_link_revoked",
          title: "Driver link revoked",
          actor_id: userId,
          actor_role: "seller",
          status: "revoked",
        });
        return jsonResponse(200, { success: true });
      }

      case "driver_resolve": {
        if (!driverSessionId) return jsonError(403, "invalid_link", "This delivery link is not valid.");
        const { data: session } = await db
          .from("fulfillment_sessions")
          .select("id, status, mode, listing_id, sale_transaction_id, booking_id, driver_name, location_consent")
          .eq("id", driverSessionId)
          .maybeSingle();
        if (!session) return jsonError(404, "not_found", "This delivery is no longer available.");

        // minimum viable data only — no buyer/seller account information
        const { data: listing } = session.listing_id
          ? await db.from("listings").select("title, city, state").eq("id", session.listing_id).maybeSingle()
          : { data: null };

        const { data: handoff } = await db
          .from("handoff_sessions")
          .select("id, status, buyer_decision")
          .eq("fulfillment_session_id", session.id)
          .maybeSingle();

        return jsonResponse(200, {
          success: true,
          session: {
            id: session.id,
            status: session.status,
            mode: session.mode,
            driver_name: session.driver_name,
            location_consent: session.location_consent,
          },
          listing: listing ? { title: listing.title, city: listing.city, state: listing.state } : null,
          handoff: handoff ?? null,
        });
      }

      case "driver_consent_location": {
        if (!driverSessionId) return jsonError(403, "invalid_link", "This delivery link is not valid.");
        await db.from("fulfillment_sessions").update({
          location_consent: true,
          location_consent_at: new Date().toISOString(),
        }).eq("id", driverSessionId);
        return jsonResponse(200, { success: true });
      }

      // ================= HANDOFF =================
      case "start_handoff": {
        const target = await loadTarget(db, body.sale_transaction_id, body.booking_id);
        const err = assertParticipant(target);
        if (err) return jsonError(403, "forbidden", err);
        const t = target!;
        const mode: Mode = FULFILLMENT_MODES.includes(body.mode) ? body.mode : "buyer_pickup";

        // Server-side gate: the Verified Handoff & Condition Evidence Terms must
        // be accepted at the current version before any capture step can begin.
        if (userId) {
          const acceptedHandoff = await hasCurrentLegalAcceptance(db, userId, "handoff-terms");
          if (!acceptedHandoff) {
            if (String(body.legal_acceptance_version ?? "") !== LEGAL_VERSIONS["handoff-terms"]) {
              return jsonError(
                400,
                "legal_acceptance_required",
                "Please accept the current Verified Handoff & Condition Evidence Terms before starting.",
              );
            }
            await recordServerLegalAcceptance(db, {
              userId,
              slug: "handoff-terms",
              surface: "handoff_flow",
              relatedEntityType: t.sale_transaction_id ? "order" : "booking",
              relatedEntityId: t.sale_transaction_id ?? t.booking_id ?? null,
            });
          }
        }

        const existingQuery = t.sale_transaction_id
          ? db.from("handoff_sessions").select("*").eq("sale_transaction_id", t.sale_transaction_id)
          : db.from("handoff_sessions").select("*").eq("booking_id", t.booking_id);
        const { data: open } = await existingQuery.eq("finalized", false).maybeSingle();
        if (open) return jsonResponse(200, { success: true, handoff: open, reused: true });

        const code = mode === "buyer_pickup" ? pickupCode() : null;
        const { data: handoff, error } = await db
          .from("handoff_sessions")
          .insert({
            fulfillment_session_id: body.fulfillment_session_id ?? null,
            sale_transaction_id: t.sale_transaction_id,
            booking_id: t.booking_id,
            listing_id: t.listing_id,
            seller_id: t.seller_id,
            buyer_id: t.buyer_id,
            mode,
            status: code ? "started" : "walkthrough",
            pickup_code: code,
          })
          .select()
          .single();
        if (error) return jsonError(400, "insert_failed", error.message);

        await logEvidence(db, {
          sale_transaction_id: t.sale_transaction_id,
          booking_id: t.booking_id,
          handoff_session_id: handoff.id,
          event_type: "handoff_started",
          title: mode === "buyer_pickup" ? "Pickup handoff started" : "Handoff started",
          actor_id: userId,
          actor_role: userId === t.seller_id ? "seller" : "buyer",
          status: "started",
        });

        await notifyUser(db, {
          userId: t.buyer_id,
          type: "buyer_action_required",
          title: "Handoff started",
          message: code
            ? "Ask the seller for your 6-digit pickup code to confirm the handoff."
            : "Your handoff walkthrough is ready to record.",
          link: t.sale_transaction_id ? `/handoff/sale/${t.sale_transaction_id}` : `/handoff/booking/${t.booking_id}`,
          dedupeKey: `handoff_started:${handoff.id}`,
        });

        return jsonResponse(200, { success: true, handoff });
      }

      case "verify_pickup_code": {
        const handoff = await loadHandoff(body.handoff_session_id);
        const g = await handoffGuard(handoff);
        if (g) return jsonError(403, "forbidden", g);
        if (!handoff.pickup_code) return jsonError(400, "no_code", "This handoff does not use a pickup code.");
        if (String(body.code ?? "").trim() !== handoff.pickup_code) {
          return jsonError(400, "bad_code", "That code doesn't match. Check the code with the seller.");
        }
        await db.from("handoff_sessions").update({
          status: "walkthrough",
          pickup_code_verified_at: new Date().toISOString(),
        }).eq("id", handoff.id);
        await logEvidence(db, {
          sale_transaction_id: handoff.sale_transaction_id,
          booking_id: handoff.booking_id,
          handoff_session_id: handoff.id,
          event_type: "pickup_code_verified",
          title: "Pickup code verified",
          detail: "Buyer and seller confirmed they are together in person.",
          actor_id: userId,
          actor_role: "buyer",
          status: "verified",
        });
        return jsonResponse(200, { success: true });
      }

      case "record_consent": {
        const handoff = await loadHandoff(body.handoff_session_id);
        const g = await handoffGuard(handoff, true);
        if (g) return jsonError(403, "forbidden", g);
        const role = userId === handoff.buyer_id ? "buyer" : "seller";
        const patch: Record<string, unknown> = {};
        patch[role === "buyer" ? "recording_consent_buyer_at" : "recording_consent_seller_at"] =
          new Date().toISOString();
        if (body.latitude && body.longitude) {
          patch.location_lat = coarse(Number(body.latitude));
          patch.location_lng = coarse(Number(body.longitude));
          patch.location_captured_at = new Date().toISOString();
        }
        await db.from("handoff_sessions").update(patch).eq("id", handoff.id);
        await logEvidence(db, {
          sale_transaction_id: handoff.sale_transaction_id,
          booking_id: handoff.booking_id,
          handoff_session_id: handoff.id,
          event_type: "recording_consent",
          title: `Recording consent recorded (${role})`,
          actor_id: userId,
          actor_role: role,
          status: "consented",
        });
        return jsonResponse(200, { success: true });
      }

      case "register_media": {
        const handoff = await loadHandoff(body.handoff_session_id);
        const g = await handoffGuard(handoff, true);
        if (g) return jsonError(403, "forbidden", g);
        if (handoff.finalized) return jsonError(400, "finalized", "This handoff record is finalized.");
        const { data: media, error } = await db.from("handoff_media").insert({
          handoff_session_id: handoff.id,
          storage_path: String(body.storage_path),
          media_type: body.media_type === "photo" ? "photo" : "video",
          kind: body.kind ?? "walkthrough",
          uploaded_by: userId,
          uploaded_by_role: userId === handoff.buyer_id ? "buyer" : driverSessionId ? "driver" : "seller",
          byte_size: body.byte_size ?? null,
          duration_seconds: body.duration_seconds ?? null,
        }).select().single();
        if (error) return jsonError(400, "insert_failed", error.message);
        await logEvidence(db, {
          sale_transaction_id: handoff.sale_transaction_id,
          booking_id: handoff.booking_id,
          handoff_session_id: handoff.id,
          event_type: body.media_type === "photo" ? "photo_uploaded" : "walkthrough_recorded",
          title: body.media_type === "photo" ? "Photo added to evidence" : "Walkthrough recording added",
          actor_id: userId,
          actor_role: userId === handoff.buyer_id ? "buyer" : "seller",
          status: "stored",
          metadata: { media_id: media.id },
        });
        return jsonResponse(200, { success: true, media });
      }

      case "complete_walkthrough": {
        const handoff = await loadHandoff(body.handoff_session_id);
        const g = await handoffGuard(handoff, true);
        if (g) return jsonError(403, "forbidden", g);
        await db.from("handoff_sessions").update({
          status: "decision",
          walkthrough_completed_at: new Date().toISOString(),
        }).eq("id", handoff.id);
        await notifyUser(db, {
          userId: handoff.buyer_id,
          type: "buyer_action_required",
          title: "Review the condition of your asset",
          message: "The handoff walkthrough is documented. Confirm the condition to continue.",
          link: handoff.sale_transaction_id
            ? `/handoff/sale/${handoff.sale_transaction_id}`
            : `/handoff/booking/${handoff.booking_id}`,
          dedupeKey: `condition_review:${handoff.id}`,
        });
        return jsonResponse(200, { success: true });
      }

      case "submit_decision": {
        const handoff = await loadHandoff(body.handoff_session_id);
        const g = await handoffGuard(handoff);
        if (g) return jsonError(403, "forbidden", g);
        if (handoff.finalized) return jsonError(400, "finalized", "This handoff record is finalized.");
        const decision = String(body.decision ?? "");
        if (!["accepted", "accepted_with_exceptions", "issue_reported"].includes(decision)) {
          return jsonError(400, "bad_decision", "Choose how the asset was received.");
        }
        const notes = String(body.notes ?? "").trim();
        if (decision !== "accepted" && notes.length < 5) {
          return jsonError(400, "notes_required", "Please describe what you found.");
        }
        await db.from("handoff_sessions").update({
          status: "signature",
          buyer_decision: decision,
          buyer_decision_at: new Date().toISOString(),
          buyer_decision_notes: notes || null,
        }).eq("id", handoff.id);

        if (decision !== "accepted") {
          await db.from("handoff_exceptions").insert({
            handoff_session_id: handoff.id,
            description: notes,
            severity: decision === "issue_reported" ? "blocking" : "significant",
            reported_by: userId,
            reported_by_role: "buyer",
          });
        }

        await logEvidence(db, {
          sale_transaction_id: handoff.sale_transaction_id,
          booking_id: handoff.booking_id,
          handoff_session_id: handoff.id,
          event_type:
            decision === "accepted"
              ? "buyer_accepted"
              : decision === "accepted_with_exceptions"
                ? "buyer_accepted_with_exceptions"
                : "issue_reported",
          title:
            decision === "accepted"
              ? "Buyer accepted the asset"
              : decision === "accepted_with_exceptions"
                ? "Buyer accepted with exceptions"
                : "Buyer reported an issue",
          detail: notes || null,
          actor_id: userId,
          actor_role: "buyer",
          status: decision,
        });

        await notifyUser(db, {
          userId: handoff.seller_id,
          type: "seller_action_required",
          title:
            decision === "issue_reported"
              ? "Buyer reported an issue at handoff"
              : decision === "accepted_with_exceptions"
                ? "Buyer accepted with exceptions"
                : "Buyer accepted the asset",
          message: notes || "The buyer recorded their condition decision at handoff.",
          link: handoff.sale_transaction_id
            ? `/handoff/sale/${handoff.sale_transaction_id}`
            : `/handoff/booking/${handoff.booking_id}`,
          dedupeKey: `decision:${handoff.id}`,
        });

        return jsonResponse(200, { success: true, decision });
      }

      // ================= SIGNATURE (SignNow abstraction) =================
      case "request_signature": {
        const handoff = await loadHandoff(body.handoff_session_id);
        const g = await handoffGuard(handoff);
        if (g) return jsonError(403, "forbidden", g);

        const configured = isSignNowConfigured();
        const templateId = Deno.env.get("SIGNNOW_TEMPLATE_HANDOFF_ACKNOWLEDGMENT");

        const { data: existing } = await db
          .from("handoff_signatures").select("*").eq("handoff_session_id", handoff.id).maybeSingle();

        const base = {
          handoff_session_id: handoff.id,
          signer_role: "buyer",
          acknowledgment_type: handoff.buyer_decision ?? null,
          status: configured && templateId ? "pending" : "not_configured",
          last_error: configured
            ? templateId
              ? null
              : "SIGNNOW_TEMPLATE_HANDOFF_ACKNOWLEDGMENT is not configured."
            : "SignNow credentials are not configured for this environment.",
        };

        const row = existing
          ? (await db.from("handoff_signatures").update(base).eq("id", existing.id).select().single()).data
          : (await db.from("handoff_signatures").insert(base).select().single()).data;

        await logEvidence(db, {
          sale_transaction_id: handoff.sale_transaction_id,
          booking_id: handoff.booking_id,
          handoff_session_id: handoff.id,
          event_type: "signature_requested",
          title: "Handoff & Condition Acknowledgment requested",
          detail: row?.status === "not_configured" ? "Signing provider is not configured yet." : null,
          actor_id: userId,
          actor_role: "seller",
          status: row?.status,
        });

        return jsonResponse(200, {
          success: true,
          signature: row,
          signnow_configured: configured,
          template_configured: !!templateId,
        });
      }

      // ================= COMPLETE =================
      case "complete_handoff": {
        const handoff = await loadHandoff(body.handoff_session_id);
        const g = await handoffGuard(handoff);
        if (g) return jsonError(403, "forbidden", g);
        if (handoff.buyer_decision === "issue_reported") {
          return jsonError(
            400,
            "issue_open",
            "An issue was reported at handoff. This handoff stays open until it is resolved with support.",
          );
        }
        if (!handoff.buyer_decision) {
          return jsonError(400, "no_decision", "The buyer still needs to confirm the condition.");
        }
        await db.from("handoff_sessions").update({
          status: "completed",
          completed_at: new Date().toISOString(),
          finalized: true,
        }).eq("id", handoff.id);
        if (handoff.fulfillment_session_id) {
          await db.from("fulfillment_sessions").update({
            status: "completed",
            completed_at: new Date().toISOString(),
          }).eq("id", handoff.fulfillment_session_id);
          await db.from("secure_driver_links").update({ revoked_at: new Date().toISOString() })
            .eq("fulfillment_session_id", handoff.fulfillment_session_id).is("revoked_at", null);
        }
        await logEvidence(db, {
          sale_transaction_id: handoff.sale_transaction_id,
          booking_id: handoff.booking_id,
          handoff_session_id: handoff.id,
          event_type: "handoff_completed",
          title: "Vendibook Verified Handoff completed",
          detail: "Fulfillment and handoff were documented through Vendibook.",
          actor_id: userId,
          actor_role: userId === handoff.buyer_id ? "buyer" : "seller",
          status: "completed",
        });
        for (const uid of [handoff.buyer_id, handoff.seller_id]) {
          await notifyUser(db, {
            userId: uid,
            type: "handoff_completed",
            title: "Handoff documented",
            message: "Fulfillment and handoff were documented through Vendibook.",
            link: handoff.sale_transaction_id
              ? `/handoff/sale/${handoff.sale_transaction_id}`
              : `/handoff/booking/${handoff.booking_id}`,
            dedupeKey: `handoff_completed:${handoff.id}:${uid}`,
          });
        }
        return jsonResponse(200, { success: true });
      }

      // ================= FREIGHT / TRACKING =================
      case "add_tracking": {
        const target = await loadTarget(db, body.sale_transaction_id, body.booking_id);
        const err = assertParticipant(target);
        if (err) return jsonError(403, "forbidden", err);
        const t = target!;
        if (!isAdmin && userId !== t.seller_id) {
          return jsonError(403, "forbidden", "Only the seller can add tracking.");
        }
        const { data: row, error } = await db.from("shipment_tracking_events").insert({
          sale_transaction_id: t.sale_transaction_id,
          booking_id: t.booking_id,
          carrier: body.carrier ?? null,
          tracking_number: body.tracking_number ?? null,
          tracking_url: body.tracking_url ?? null,
          status: body.status ?? "label_created",
          description: body.description ?? null,
          estimated_delivery_at: body.estimated_delivery_at ?? null,
          source: isAdmin ? "admin" : "seller",
          recorded_by: userId,
        }).select().single();
        if (error) return jsonError(400, "insert_failed", error.message);

        await logEvidence(db, {
          sale_transaction_id: t.sale_transaction_id,
          booking_id: t.booking_id,
          event_type: "tracking_added",
          title: "Shipment tracking updated",
          detail: [body.carrier, body.tracking_number].filter(Boolean).join(" · ") || null,
          actor_id: userId,
          actor_role: "seller",
          status: row.status,
          metadata: { tracking_event_id: row.id },
        });
        return jsonResponse(200, { success: true, tracking: row });
      }

      case "sync_paypal_tracking": {
        const { data: row } = await db
          .from("shipment_tracking_events").select("*").eq("id", body.tracking_event_id).maybeSingle();
        if (!row) return jsonError(404, "not_found", "That tracking record no longer exists.");
        const target = await loadTarget(db, row.sale_transaction_id, row.booking_id);
        const err = assertParticipant(target);
        if (err) return jsonError(403, "forbidden", err);

        // Find the PayPal capture id for this transaction. No capture → no sync.
        const { data: payment } = row.sale_transaction_id
          ? await db.from("payment_records")
              .select("paypal_capture_id")
              .eq("sale_transaction_id", row.sale_transaction_id)
              .not("paypal_capture_id", "is", null)
              .order("created_at", { ascending: false })
              .limit(1)
              .maybeSingle()
          : { data: null };

        const captureId = (payment as any)?.paypal_capture_id ?? null;
        if (!captureId || !row.tracking_number || !row.carrier) {
          await db.from("shipment_tracking_events").update({
            paypal_sync_status: "skipped_missing_config",
            paypal_sync_error: !captureId
              ? "No PayPal capture is linked to this transaction."
              : "Carrier and tracking number are both required.",
          }).eq("id", row.id);
          return jsonResponse(200, {
            success: false,
            skipped: true,
            reason: !captureId ? "no_capture" : "missing_tracking_fields",
          });
        }

        try {
          const res = await paypalRequest<any>("/v1/shipping/trackers-batch", {
            method: "POST",
            body: {
              trackers: [{
                transaction_id: captureId,
                tracking_number: row.tracking_number,
                status: row.status === "delivered" ? "DELIVERED" : "SHIPPED",
                carrier: "OTHER",
                carrier_name_other: row.carrier,
              }],
            },
          });
          await db.from("shipment_tracking_events").update({
            paypal_sync_status: "synced",
            paypal_synced_at: new Date().toISOString(),
            paypal_debug_id: res?.debug_id ?? res?.headers?.["paypal-debug-id"] ?? null,
            paypal_sync_error: null,
          }).eq("id", row.id);
          return jsonResponse(200, { success: true });
        } catch (e) {
          const message = e instanceof Error ? e.message : "PayPal tracking sync failed.";
          await db.from("shipment_tracking_events").update({
            paypal_sync_status: "failed",
            paypal_sync_error: message.slice(0, 500),
          }).eq("id", row.id);
          return jsonResponse(200, { success: false, error: message.slice(0, 300) });
        }
      }

      default:
        return jsonError(400, "unknown_action", "That action isn't supported.");
    }
  } catch (err) {
    return unknownErrorResponse(err);
  }
});
