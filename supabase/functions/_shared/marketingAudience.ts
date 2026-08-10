// Shared marketing audience builder.
//
// Audience = confirmed newsletter subscribers UNION registered account holders.
// Registered users are mailed only with a working one-click unsubscribe, and
// every send is recorded in blog_campaign_sends so a campaign can be resumed
// or topped up without ever mailing the same address twice.

// deno-lint-ignore-file no-explicit-any

export type AudienceMember = {
  email: string;
  user_id: string | null;
  source: "newsletter" | "registered";
};

export type AudienceResult = {
  recipients: AudienceMember[];
  counts: {
    eligible: number;
    newsletter: number;
    registered: number;
    blocked: number;
    alreadySent: number;
  };
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isMailableAddress(raw: unknown): boolean {
  const e = String(raw ?? "").trim().toLowerCase();
  if (!e || !EMAIL_RE.test(e)) return false;
  if (e.endsWith("example.com") || e.endsWith(".test") || e.endsWith(".invalid")) return false;
  if (e.startsWith("test@") || e.includes("+test")) return false;
  return true;
}

/**
 * Build the mailable audience for a campaign.
 *
 * @param admin service-role Supabase client
 * @param campaignId blog_campaign_sends.campaign_id used for dedupe
 * @param opts.includeRegisteredUsers include profiles rows (default true)
 */
export async function buildMarketingAudience(
  admin: any,
  campaignId: string,
  opts: { includeRegisteredUsers?: boolean } = {},
): Promise<AudienceResult> {
  const includeRegistered = opts.includeRegisteredUsers !== false;

  const [{ data: unsubs }, { data: suppressed }, { data: alreadySent }] = await Promise.all([
    admin.from("email_unsubscribes").select("email"),
    admin.from("suppressed_emails").select("email"),
    admin
      .from("blog_campaign_sends")
      .select("email")
      .eq("campaign_id", campaignId)
      .eq("is_test", false)
      .eq("status", "sent"),
  ]);

  const blocked = new Set<string>();
  for (const r of [...(unsubs ?? []), ...(suppressed ?? [])]) {
    if (r?.email) blocked.add(String(r.email).toLowerCase());
  }
  const sentSet = new Set<string>(
    (alreadySent ?? []).map((r: any) => String(r.email).toLowerCase()),
  );

  const { data: subs } = await admin
    .from("newsletter_subscribers")
    .select("email")
    .is("unsubscribed_at", null);

  const profiles = includeRegistered
    ? (await admin.from("profiles").select("id, email").not("email", "is", null)).data ?? []
    : [];

  const byEmail = new Map<string, AudienceMember>();
  let newsletterCount = 0;
  let registeredCount = 0;

  for (const s of subs ?? []) {
    const e = String(s?.email ?? "").trim().toLowerCase();
    if (!isMailableAddress(e) || byEmail.has(e)) continue;
    byEmail.set(e, { email: e, user_id: null, source: "newsletter" });
    newsletterCount++;
  }

  for (const p of profiles) {
    const e = String(p?.email ?? "").trim().toLowerCase();
    if (!isMailableAddress(e)) continue;
    const existing = byEmail.get(e);
    if (existing) {
      // Keep the newsletter source label but attach the account id.
      existing.user_id = existing.user_id ?? p.id ?? null;
      continue;
    }
    byEmail.set(e, { email: e, user_id: p.id ?? null, source: "registered" });
    registeredCount++;
  }

  const recipients = Array.from(byEmail.values()).filter(
    (m) => !blocked.has(m.email) && !sentSet.has(m.email),
  );

  return {
    recipients,
    counts: {
      eligible: recipients.length,
      newsletter: newsletterCount,
      registered: registeredCount,
      blocked: blocked.size,
      alreadySent: sentSet.size,
    },
  };
}
