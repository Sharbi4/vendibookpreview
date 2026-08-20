// Public Business Spotlight submission intake.
//
// Accepts submissions from signed-in users and signed-out visitors. The client
// uploads photos to the private `spotlight-media` bucket first and passes the
// storage paths here. This function is the only writer for
// `spotlight_submissions` / `spotlight_submission_media` (service role), sends a
// one-time admin notification and a submitter acknowledgement, and never
// exposes anything publicly.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ADMIN_EMAIL = "support@vendibook.com";
const CONSENT_VERSION = "2026-08-spotlight-v1";
const ALLOWED_TYPES = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp"]);
const MAX_PHOTOS = 8;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const str = (v: unknown, max: number): string | null => {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t ? t.slice(0, max) : null;
};

const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);

interface MediaInput {
  path?: string;
  kind?: string;
  file_name?: string;
  content_type?: string;
  size?: number;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const svc = createClient(supabaseUrl, serviceKey);

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") return json({ error: "Invalid request body" }, 400);

    // Optional auth — submissions are allowed signed out.
    let userId: string | null = null;
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace("Bearer ", "").trim();
    if (token) {
      const { data } = await svc.auth.getUser(token);
      userId = data?.user?.id ?? null;
    }

    const required: Record<string, number> = {
      contact_name: 120,
      business_name: 160,
      email: 255,
      city: 120,
      state: 60,
      business_type: 60,
      story: 5000,
      offerings: 2000,
    };

    const record: Record<string, unknown> = {};
    const missing: string[] = [];
    for (const [field, max] of Object.entries(required)) {
      const value = str((body as any)[field], max);
      if (!value) missing.push(field);
      record[field] = value;
    }
    if (missing.length) return json({ error: "Missing required fields", fields: missing }, 400);
    if (!isEmail(record.email as string)) return json({ error: "A valid email address is required" }, 400);

    if (body.owns_content_consent !== true || body.publication_consent !== true) {
      return json({ error: "Both consent confirmations are required" }, 400);
    }

    const optional: Record<string, number> = {
      phone: 40,
      website: 300,
      listing_url: 500,
      years_operating: 60,
      differentiator: 2000,
      proud_of: 2000,
      whats_new: 2000,
      instagram: 300,
      facebook: 300,
      tiktok: 300,
      youtube: 300,
      linkedin: 300,
      other_social: 300,
      product_feedback_experience: 3000,
      product_feedback_wishlist: 3000,
    };
    for (const [field, max] of Object.entries(optional)) {
      record[field] = str((body as any)[field], max);
    }

    const listingId = str((body as any).listing_id, 64);
    const now = new Date().toISOString();

    const { data: submission, error: insertError } = await svc
      .from("spotlight_submissions")
      .insert({
        ...record,
        user_id: userId,
        listing_id: listingId && /^[0-9a-f-]{36}$/i.test(listingId) ? listingId : null,
        status: "submitted",
        owns_content_consent: true,
        owns_content_consent_at: now,
        publication_consent: true,
        publication_consent_at: now,
        consent_version: CONSENT_VERSION,
        marketing_opt_in: (body as any).marketing_opt_in === true,
        source: str((body as any).source, 120) ?? "spotlight_form",
      })
      .select("id, business_name, business_type, city, state, contact_name, email, phone, created_at")
      .single();

    if (insertError || !submission) {
      console.error("[spotlight-submit] insert failed", insertError);
      return json({ error: "Could not save your submission. Please try again." }, 500);
    }

    // Media rows (paths already uploaded to the private bucket by the client).
    const media: MediaInput[] = Array.isArray((body as any).media) ? (body as any).media : [];
    const rows = media
      .filter((m) => typeof m?.path === "string" && m.path.startsWith("submissions/"))
      .filter((m) => !m.content_type || ALLOWED_TYPES.has(m.content_type))
      .slice(0, MAX_PHOTOS + 1)
      .map((m, i) => ({
        submission_id: submission.id,
        storage_path: m.path as string,
        kind: m.kind === "logo" ? "logo" : "photo",
        sort_order: i,
        file_name: str(m.file_name, 200),
        content_type: str(m.content_type, 100),
        size_bytes: typeof m.size === "number" ? Math.round(m.size) : null,
      }));

    if (rows.length) {
      const { error: mediaError } = await svc.from("spotlight_submission_media").insert(rows);
      if (mediaError) console.error("[spotlight-submit] media insert failed", mediaError);
    }

    const location = `${submission.city}, ${submission.state}`;
    const adminLink = `https://vendibook.com/admin/spotlights?id=${submission.id}`;

    // Admin notification — idempotency key keeps this to one send per submission.
    try {
      await svc.functions.invoke("send-transactional-email", {
        body: {
          templateName: "generic-notice",
          recipientEmail: ADMIN_EMAIL,
          idempotencyKey: `spotlight-admin-${submission.id}`,
          templateData: {
            subject: `New Business Spotlight submission — ${submission.business_name}`,
            kicker: "Business Spotlight",
            heading: "New spotlight submission",
            paragraphs: [
              `${submission.business_name} (${submission.business_type}) submitted a Vendibook Business Spotlight story.`,
              `${rows.length} media file${rows.length === 1 ? "" : "s"} attached. Private product feedback, if provided, is visible only in the admin review screen.`,
            ],
            details: [
              { label: "Submission", value: submission.id, mono: true },
              { label: "Business", value: submission.business_name },
              { label: "Category", value: submission.business_type },
              { label: "Location", value: location },
              { label: "Contact", value: `${submission.contact_name} · ${submission.email}${submission.phone ? ` · ${submission.phone}` : ""}` },
            ],
            ctaLabel: "Review submission",
            ctaUrl: adminLink,
            footnote: "Nothing is published automatically. Review, then mark the submission selected or not selected.",
          },
        },
      });
    } catch (e) {
      console.error("[spotlight-submit] admin email failed", e);
    }

    // Submitter acknowledgement — never promises a feature.
    try {
      await svc.functions.invoke("send-transactional-email", {
        body: {
          templateName: "generic-notice",
          recipientEmail: submission.email,
          idempotencyKey: `spotlight-ack-${submission.id}`,
          templateData: {
            subject: "We got your Vendibook Business Spotlight submission.",
            kicker: "Business Spotlight",
            heading: "We’ve got it.",
            greeting: `Hi ${submission.contact_name.split(" ")[0]},`,
            paragraphs: [
              `Thanks for sharing ${submission.business_name} with Vendibook. Our team reviews every submission and may reach out if we need a detail or a better photo.`,
              "Submitting is free, and a submission does not guarantee publication — we are simply looking for businesses and stories worth sharing with the community.",
            ],
            ctaLabel: "Browse Vendibook",
            ctaUrl: "https://vendibook.com/search",
            footnote: "Questions? Reply to this email or call (725) 755-9598, Mon–Fri 9am–5pm AZ.",
          },
        },
      });
    } catch (e) {
      console.error("[spotlight-submit] acknowledgement email failed", e);
    }

    return json({ ok: true, id: submission.id, mediaCount: rows.length });
  } catch (e) {
    console.error("[spotlight-submit] unexpected error", e);
    return json({ error: "Something went wrong. Please try again." }, 500);
  }
});
