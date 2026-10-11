import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { corsHeaders, jsonError, jsonResponse, unknownErrorResponse } from "../_shared/jsonError.ts";
import {
  createIdentityVerification,
  createIdvLinkToken,
  getIdentityVerification,
  PlaidError,
  plaidConfigStatus,
  plaidLog,
  plaidTemplateId,
  retryIdentityVerification,
} from "../_shared/plaid.ts";

/**
 * Booking disclosure + identity verification — renter facing, always FREE.
 *
 * Actions
 *   status   latest active disclosure documents, this renter's attestation for
 *            the listing, and the current identity-check state
 *   attest   records the renter's attestation server-side against the ACTIVE
 *            document versions resolved here (never a client-supplied version)
 *   idv-start   opens (or resumes) a Plaid Identity Verification session
 *   idv-refresh pulls the authoritative Plaid status
 *   idv-retry   one free retry after a terminal failure
 *
 * No money is ever touched here. Booking identity checks are free to the
 * renter; the seller Verified badge flow (`verified-seller`) is the only paid
 * identity path and this function never writes to it.
 */

/** Documents a renter must see before paying for a booking. */
const DISCLOSURE_DOCUMENT_TYPES = [
  "renter_terms",
  "refund_cancellation_policy",
  "marketplace_rules",
] as const;

type InsuranceAnswer = "yes" | "no" | "unsure";

type IdvStatus =
  | "not_started"
  | "in_progress"
  | "pending_review"
  | "verified"
  | "failed"
  | "expired"
  | "canceled";

const TERMINAL_FAILURES: IdvStatus[] = ["failed", "expired", "canceled"];

/** Maps an authoritative Plaid status onto our booking-side status. */
function mapPlaidStatus(status: string | null | undefined): IdvStatus {
  switch (status) {
    case "success":
      return "verified";
    case "pending_review":
      return "pending_review";
    case "failed":
      return "failed";
    case "expired":
      return "expired";
    case "canceled":
      return "canceled";
    case "active":
      return "in_progress";
    default:
      return "in_progress";
  }
}

const clientIp = (req: Request) =>
  req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("cf-connecting-ip") ?? null;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Admin = ReturnType<typeof createClient>;

interface IdvRow {
  user_id: string;
  status: IdvStatus;
  identity_status: string | null;
  plaid_verification_id: string | null;
  template_id: string | null;
  attempt_count: number;
  retry_allowance: number;
  last_reason_code: string | null;
  reused_from: string | null;
  verified_at: string | null;
}

async function ensureIdvRow(admin: Admin, userId: string): Promise<IdvRow> {
  const { data } = await admin
    .from("booking_identity_verifications")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (data) return data as unknown as IdvRow;

  await admin
    .from("booking_identity_verifications")
    .upsert({ user_id: userId }, { onConflict: "user_id", ignoreDuplicates: true });

  const { data: created } = await admin
    .from("booking_identity_verifications")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  return created as unknown as IdvRow;
}

async function updateIdvRow(admin: Admin, userId: string, patch: Record<string, unknown>) {
  const { data } = await admin
    .from("booking_identity_verifications")
    .update(patch)
    .eq("user_id", userId)
    .select("*")
    .maybeSingle();
  return data as unknown as IdvRow;
}

/**
 * Reuse: a renter who already passed identity anywhere on Vendibook never
 * has to redo it for a booking. Sources are authoritative server records only.
 */
async function existingVerifiedSource(admin: Admin, userId: string): Promise<string | null> {
  const { data: profile } = await admin
    .from("profiles")
    .select("identity_verified")
    .eq("id", userId)
    .maybeSingle();
  if (profile?.identity_verified === true) return "profile_identity_verified";

  const { data: seller } = await admin
    .from("seller_verifications")
    .select("status, identity_status, verified_at, revoked_at")
    .eq("user_id", userId)
    .maybeSingle();
  if (
    seller && !seller.revoked_at &&
    (seller.status === "verified" || seller.identity_status === "success")
  ) {
    return "seller_verification";
  }
  return null;
}

/** Sanitized identity state the renter is allowed to see. */
function publicIdvState(row: IdvRow | null, configured: boolean) {
  const status: IdvStatus = row?.status ?? "not_started";
  return {
    status,
    verified: status === "verified",
    pending_review: status === "pending_review",
    can_retry: TERMINAL_FAILURES.includes(status) &&
      (row?.attempt_count ?? 0) <= (row?.retry_allowance ?? 1),
    reused: !!row?.reused_from,
    verified_at: row?.verified_at ?? null,
    attempt_count: row?.attempt_count ?? 0,
    available: configured,
    /** Booking identity checks are always free to the renter. */
    price_cents: 0,
  };
}

async function activeDocuments(admin: Admin) {
  const { data } = await admin
    .from("legal_documents")
    .select("id, document_type, version, title, slug, summary, effective_at, status")
    .in("document_type", DISCLOSURE_DOCUMENT_TYPES as unknown as string[])
    .eq("status", "active")
    .order("effective_at", { ascending: false });

  const latest = new Map<string, Record<string, unknown>>();
  for (const row of data ?? []) {
    if (!latest.has(row.document_type as string)) latest.set(row.document_type as string, row);
  }
  return DISCLOSURE_DOCUMENT_TYPES
    .map((t) => latest.get(t))
    .filter(Boolean) as Array<Record<string, unknown>>;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } },
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return jsonError(401, "unauthenticated", "Please sign in to continue.");
    const { data: userData, error: userErr } = await admin.auth.getUser(
      authHeader.replace("Bearer ", ""),
    );
    const user = userData?.user;
    if (userErr || !user) {
      return jsonError(401, "unauthenticated", "Your session expired. Please sign in again.");
    }
    const userId = user.id;

    const body = await req.json().catch(() => ({}));
    const action = String(body?.action ?? "status");
    const listingId = body?.listingId ? String(body.listingId) : null;
    if (listingId && !UUID_RE.test(listingId)) {
      return jsonError(400, "invalid_listing", "That listing reference is not valid.");
    }

    const config = plaidConfigStatus();
    const idvAvailable = config.client_id_configured && config.secret_configured &&
      config.template_configured;

    const documents = await activeDocuments(admin);
    let row = await ensureIdvRow(admin, userId);

    // Reuse an already-verified identity before ever opening a paid-for session.
    if (row && row.status !== "verified") {
      const source = await existingVerifiedSource(admin, userId);
      if (source) {
        row = await updateIdvRow(admin, userId, {
          status: "verified",
          reused_from: source,
          verified_at: row.verified_at ?? new Date().toISOString(),
        }) ?? row;
      }
    }

    /** The renter's recorded attestation for this listing, if any. */
    const attestationForListing = async () => {
      if (!listingId) return null;
      const renterDoc = documents.find((d) => d.document_type === "renter_terms");
      const { data } = await admin
        .from("user_consents")
        .select("id, document_type, document_version, created_at, related_ids")
        .eq("user_id", userId)
        .eq("document_type", "renter_terms")
        .eq("trigger_action", "booking_disclosure")
        .is("revoked_at", null)
        .contains("related_ids", { listing_id: listingId })
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!data) return null;
      // A newer document version invalidates the old attestation.
      const current = renterDoc?.version ? String(renterDoc.version) : null;
      const stale = !!current && data.document_version !== current;
      return {
        attested_at: data.created_at,
        document_version: data.document_version,
        stale,
        insurance_answer: (data.related_ids as Record<string, unknown> | null)?.insurance_answer ??
          null,
      };
    };

    switch (action) {
      case "status": {
        return jsonResponse(200, {
          documents,
          attestation: await attestationForListing(),
          identity: publicIdvState(row, idvAvailable),
        });
      }

      case "attest": {
        if (!listingId) {
          return jsonError(400, "invalid_listing", "We could not tell which listing this is for.");
        }
        const answerRaw = String(body?.insuranceAnswer ?? "");
        if (!["yes", "no", "unsure"].includes(answerRaw)) {
          return jsonError(
            400,
            "insurance_answer_required",
            "Please answer the liability insurance question.",
          );
        }
        const insuranceAnswer = answerRaw as InsuranceAnswer;
        if (body?.agreed !== true) {
          return jsonError(400, "agreement_required", "Please confirm the statements to continue.");
        }
        if (documents.length === 0) {
          return jsonError(
            503,
            "documents_unavailable",
            "Our terms are being updated. Please try again in a moment.",
          );
        }

        const acceptanceText =
          "I have read and agree to the Vendibook renter terms, refund and cancellation policy, " +
          "and marketplace rules for this booking, and my answers about insurance and intended " +
          "use are accurate.";
        const relatedIds = {
          listing_id: listingId,
          purpose: "booking_disclosure",
          insurance_answer: insuranceAnswer,
          has_liability_insurance: insuranceAnswer === "yes",
        };

        const rows = documents.map((doc) => ({
          user_id: userId,
          document_type: doc.document_type,
          document_version: doc.version,
          document_id: doc.id,
          trigger_action: "booking_disclosure",
          acceptance_text: acceptanceText,
          related_ids: relatedIds,
          route: typeof body?.route === "string" ? body.route.slice(0, 300) : null,
          ip: clientIp(req),
          user_agent: req.headers.get("user-agent")?.slice(0, 500) ?? null,
          locale: typeof body?.locale === "string" ? body.locale.slice(0, 16) : null,
        }));

        const { data: inserted, error: insertErr } = await admin
          .from("user_consents")
          .insert(rows)
          .select("id, document_type, document_version, created_at");

        if (insertErr) {
          plaidLog("booking_attestation_failed", { message: insertErr.message });
          return jsonError(
            500,
            "attestation_failed",
            "We could not record your agreement. Please try again.",
          );
        }

        return jsonResponse(200, {
          documents,
          attestation: {
            attested_at: inserted?.[0]?.created_at ?? new Date().toISOString(),
            document_version: inserted?.[0]?.document_version ?? null,
            stale: false,
            insurance_answer: insuranceAnswer,
          },
          recorded: inserted ?? [],
          identity: publicIdvState(row, idvAvailable),
        });
      }

      case "idv-start":
      case "idv-retry": {
        if (row?.status === "verified") {
          return jsonResponse(200, { identity: publicIdvState(row, idvAvailable), documents });
        }
        if (!idvAvailable) {
          return jsonError(
            503,
            "idv_unavailable",
            "Identity checks are temporarily unavailable. Please try again shortly.",
          );
        }
        const templateId = plaidTemplateId()!;
        const isRetry = action === "idv-retry";
        if (isRetry && !TERMINAL_FAILURES.includes(row?.status ?? "not_started")) {
          return jsonError(
            409,
            "retry_not_allowed",
            "There is nothing to retry yet — finish the check that is already open.",
          );
        }
        if (isRetry && (row?.attempt_count ?? 0) > (row?.retry_allowance ?? 1)) {
          return jsonError(
            409,
            "retry_limit_reached",
            "You have used your retry. Message support and we'll help you finish.",
          );
        }

        try {
          /**
           * `client_user_id` is the plain user id on purpose: Plaid's
           * idempotent create returns the SAME session for this user and
           * template, so reopening resumes instead of starting a new one.
           */
          const session = isRetry
            ? await retryIdentityVerification({ clientUserId: userId, templateId })
            : await createIdentityVerification({ clientUserId: userId, templateId });

          const mapped = mapPlaidStatus(session.status);
          row = await updateIdvRow(admin, userId, {
            status: mapped === "verified" ? "verified" : "in_progress",
            identity_status: session.status ?? "active",
            plaid_verification_id: session.id ?? null,
            template_id: templateId,
            attempt_count: (row?.attempt_count ?? 0) + 1,
            last_reason_code: null,
            verified_at: mapped === "verified" ? new Date().toISOString() : null,
          }) ?? row;

          if (mapped === "verified") {
            return jsonResponse(200, { identity: publicIdvState(row, idvAvailable), documents });
          }

          const link = await createIdvLinkToken({
            clientUserId: userId,
            templateId,
            webhook: `${Deno.env.get("SUPABASE_URL")}/functions/v1/verified-seller-webhook`,
          });

          return jsonResponse(200, {
            link_token: link.link_token,
            identity: publicIdvState(row, idvAvailable),
            documents,
          });
        } catch (err) {
          const message = err instanceof PlaidError
            ? "The identity provider could not start your check. Please try again."
            : "We could not start the identity check. Please try again.";
          plaidLog("booking_idv_start_failed", {
            user_id: userId,
            message: (err as Error).message,
          });
          return jsonError(502, "idv_start_failed", message);
        }
      }

      case "idv-refresh": {
        if (!row?.plaid_verification_id || row.status === "verified") {
          return jsonResponse(200, { identity: publicIdvState(row, idvAvailable), documents });
        }
        try {
          const session = await getIdentityVerification(row.plaid_verification_id);
          const mapped = mapPlaidStatus(session.status);
          row = await updateIdvRow(admin, userId, {
            status: mapped,
            identity_status: session.status ?? null,
            verified_at: mapped === "verified" ? new Date().toISOString() : null,
          }) ?? row;
          return jsonResponse(200, { identity: publicIdvState(row, idvAvailable), documents });
        } catch (err) {
          plaidLog("booking_idv_refresh_failed", {
            user_id: userId,
            message: (err as Error).message,
          });
          // Never blank the flow — return the last known state.
          return jsonResponse(200, {
            identity: publicIdvState(row, idvAvailable),
            documents,
            stale: true,
          });
        }
      }

      default:
        return jsonError(400, "unknown_action", "That request is not supported.");
    }
  } catch (err) {
    return unknownErrorResponse(err);
  }
});
