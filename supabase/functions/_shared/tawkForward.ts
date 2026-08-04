// Server-only Tawk.to forwarding helper.
//
// Sends the ticket as an authenticated email (Resend) to a PRIVATE Tawk
// inbound-mail address kept in TAWK_FORWARD_EMAIL — never exposed to the
// browser, to Vapi payloads, to logs, or to customer-visible responses.
//
// Delivery state is returned separately from ticket persistence so callers
// can update `support_tickets.forwarding_status` without lying about
// downstream success. Retries are safe: Tawk deduplicates by subject +
// reference code and we always include the Vendibook ticket reference.

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const TAWK_FORWARD_EMAIL = Deno.env.get("TAWK_FORWARD_EMAIL") ?? "";
// Primary internal support recipient. Server-only: never returned to the
// caller, never spoken by the voice assistant, never logged.
const SUPPORT_FORWARD_EMAIL =
  Deno.env.get("SUPPORT_TICKET_FORWARD_EMAIL") ?? "shawnnaharbin@vendibook.com";
// Must be on a Resend-verified sending domain (updates.vendibook.com).
// The bare vendibook.com root is NOT verified and hard-fails with 403.
const FROM_ADDRESS =
  Deno.env.get("SUPPORT_TICKET_FROM_ADDRESS") ??
  "Vendibook Support <support@updates.vendibook.com>";

function forwardRecipients(): string[] {
  const list = [SUPPORT_FORWARD_EMAIL, TAWK_FORWARD_EMAIL]
    .map((e) => e.trim())
    .filter((e) => e.length > 0);
  return [...new Set(list)];
}

export type ForwardStatus =
  | "delivered"
  | "retryable_failure"
  | "permanent_failure"
  | "skipped";

export interface ForwardInput {
  referenceCode: string;
  ticketId: string;
  subject: string;
  priority: "urgent" | "high" | "normal" | "low";
  category: string;
  featureArea: string;
  source: string;
  customerName?: string | null;
  customerEmail?: string | null;
  emailVerified?: boolean;
  callbackPhone?: string | null;
  bodyText: string;
  context?: Record<string, unknown>;
  callId?: string | null;
  callSummary?: string | null;
  replyTo?: string | null;
}

export interface ForwardResult {
  status: ForwardStatus;
  error?: string;
  providerMessageId?: string;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    c === "&" ? "&amp;" :
    c === "<" ? "&lt;" :
    c === ">" ? "&gt;" :
    c === '"' ? "&quot;" : "&#39;");
}

function renderHtml(input: ForwardInput): string {
  const rows: Array<[string, string]> = [
    ["Reference", input.referenceCode],
    ["Priority", input.priority.toUpperCase()],
    ["Source", input.source],
    ["Feature", input.featureArea],
    ["Category", input.category.replace(/_/g, " ")],
    ["Customer", `${input.customerName ?? "—"} <${input.customerEmail ?? "unknown"}>${input.emailVerified ? " (verified)" : " (UNVERIFIED)"}`],
  ];
  if (input.callbackPhone) rows.push(["Callback phone", input.callbackPhone]);
  if (input.callId) rows.push(["Vapi call id", input.callId]);
  const rowsHtml = rows
    .map(([k, v]) => `<tr><td style="padding:4px 12px 4px 0;color:#666"><strong>${escapeHtml(k)}</strong></td><td style="padding:4px 0">${escapeHtml(String(v))}</td></tr>`)
    .join("");
  const callSummary = input.callSummary
    ? `<h3 style="margin:24px 0 8px">Call summary</h3><pre style="white-space:pre-wrap;background:#f6f6f8;padding:12px;border-radius:8px;font:13px/1.5 -apple-system,Segoe UI,Roboto,sans-serif">${escapeHtml(input.callSummary)}</pre>`
    : "";
  const ctx = input.context && Object.keys(input.context).length
    ? `<h3 style="margin:24px 0 8px">Structured context</h3><pre style="white-space:pre-wrap;background:#f6f6f8;padding:12px;border-radius:8px;font:12px/1.4 ui-monospace,Menlo,monospace">${escapeHtml(JSON.stringify(input.context, null, 2))}</pre>`
    : "";
  return `<!doctype html><html><body style="font:14px/1.55 -apple-system,Segoe UI,Roboto,sans-serif;color:#111">
    <h2 style="margin:0 0 12px">[${escapeHtml(input.priority.toUpperCase())}] ${escapeHtml(input.subject)}</h2>
    <table style="border-collapse:collapse">${rowsHtml}</table>
    <h3 style="margin:24px 0 8px">Report</h3>
    <pre style="white-space:pre-wrap;background:#f6f6f8;padding:12px;border-radius:8px;font:13px/1.5 -apple-system,Segoe UI,Roboto,sans-serif">${escapeHtml(input.bodyText)}</pre>
    ${callSummary}${ctx}
    <p style="color:#888;margin-top:24px;font-size:12px">Vendibook ticket ${escapeHtml(input.referenceCode)} — do not reply to this address; agents should reply from Tawk.</p>
  </body></html>`;
}

function renderText(input: ForwardInput): string {
  const lines = [
    `[${input.priority.toUpperCase()}] ${input.subject}`,
    ``,
    `Reference: ${input.referenceCode}`,
    `Source: ${input.source}`,
    `Feature: ${input.featureArea}`,
    `Category: ${input.category}`,
    `Customer: ${input.customerName ?? "—"} <${input.customerEmail ?? "unknown"}>${input.emailVerified ? " (verified)" : " (UNVERIFIED)"}`,
  ];
  if (input.callbackPhone) lines.push(`Callback phone: ${input.callbackPhone}`);
  if (input.callId) lines.push(`Vapi call id: ${input.callId}`);
  lines.push(``, `--- Report ---`, input.bodyText);
  if (input.callSummary) lines.push(``, `--- Call summary ---`, input.callSummary);
  return lines.join("\n");
}

export async function forwardTicketToTawk(input: ForwardInput): Promise<ForwardResult> {
  const recipients = forwardRecipients();
  if (recipients.length === 0 || !RESEND_API_KEY) {
    return { status: "skipped", error: "forwarding_not_configured" };
  }
  const subject = `[${input.priority.toUpperCase()}] ${input.referenceCode} — ${input.subject}`.slice(0, 250);
  const payload: Record<string, unknown> = {
    from: FROM_ADDRESS,
    to: recipients,
    subject,
    html: renderHtml(input),
    text: renderText(input),
    headers: {
      "X-Vendibook-Ticket": input.referenceCode,
      "X-Vendibook-Ticket-Id": input.ticketId,
      "X-Vendibook-Source": input.source,
    },
  };
  // Only set Reply-To when the customer email was actually verified — otherwise
  // an unauthenticated Vapi caller could hijack the reply channel.
  if (input.emailVerified && input.replyTo) {
    payload.reply_to = input.replyTo;
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      const data = await res.json().catch(() => ({} as { id?: string }));
      return { status: "delivered", providerMessageId: (data as { id?: string })?.id };
    }
    const detail = await res.text().catch(() => "");
    const retryable = res.status >= 500 || res.status === 429;
    return {
      status: retryable ? "retryable_failure" : "permanent_failure",
      error: `resend_${res.status}:${detail.slice(0, 240)}`,
    };
  } catch (e) {
    return { status: "retryable_failure", error: (e as Error).message.slice(0, 240) };
  }
}
