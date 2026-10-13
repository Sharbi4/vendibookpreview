import { invokeTransactionalEmail } from "./invokeTransactionalEmail.ts";

const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
/** CTAs stay on authenticated Vendibook purchase and admin surfaces. */
const TRANSACTION_LINK = new RegExp(
  `^/(?:invoices/${UUID}|dashboard/invoices(?:\\?(?:view=selling&)?request=${UUID})?|admin/invoices\\?(?:request|invoice)=${UUID})$`, "i");

type CommerceEvent = { id: string; event_key: string; event_type: string; sale_id: string; recipient_id: string; link: string; title: string; message: string };

export function supportAlert(event: CommerceEvent) {
  const ref = event.event_key.split(":")[1] ?? "";
  if (event.event_type === "invoice_requested" && /^invoice-requested:/.test(event.event_key)) {
    return {
      key: "manual-invoice-request:" + ref,
      subject: "Action required: send the buyer's invoice",
      heading: "A seller approved a purchase",
      paragraphs: [
        "Prepare the invoice (equipment price, delivery, tax and the 8.7% seller fee) and send it to the buyer.",
        "Then record it in Vendibook admin so the buyer sees Pay Invoice in their dashboard.",
        "Purchase request: " + ref,
      ],
      footnote: "No payment has been collected. Do not record the payment until it is verified.",
      metadataType: "manual_invoice_requested",
    };
  }
  if (event.event_type === "payout_ready" && /^release-ready:/.test(event.event_key)) {
    return {
      key: "manual-payout-release:" + ref,
      subject: "Action required: release the seller payment",
      heading: "This sale is ready for payout",
      paragraphs: [
        "The buyer confirmed the handoff, both parties signed the purchase agreement and the walkthrough video is saved.",
        "Release the seller's payment manually, then record the payout reference in Vendibook admin.",
        "Invoice: " + ref,
      ],
      footnote: "Releasing funds is irreversible. Check for open disputes before paying out.",
      metadataType: "manual_payout_release_ready",
    };
  }
  return null;
}

function ctaLabel(event: CommerceEvent) {
  if (event.link.startsWith("/admin/")) return "Open admin invoices";
  if (event.event_type === "invoice_issued") return event.title === "Pay Invoice" ? "Pay Invoice" : "View invoice";
  if (event.link.startsWith("/invoices/")) return "View invoice";
  return "View purchase request";
}

// Only persisted, server-created commerce events can become outbound messages.
export async function dispatchCommerceEmails(admin: any, actorId: string | null = null) {
  const token = crypto.randomUUID();
  const { data: events, error } = await admin.rpc("claim_commerce_emails", { _token: token, _actor: actorId });
  if (error) throw error;
  let failures = 0;
  for (const event of events ?? []) {
    let failure: string | null = null;
    try {
      // Owner process (2026-10-13): invoices are sent and payouts released by
      // hand. Each admin alert also goes to support@ once, keyed by the request
      // or invoice so retries and multiple admins never duplicate it.
      const support = supportAlert(event);
      if (support) {
        const { error: alertError } = await invokeTransactionalEmail({
          templateName: "generic-notice",
          recipientEmail: "support@vendibook.com",
          idempotencyKey: support.key,
          templateData: {
            subject: support.subject,
            kicker: "Vendibook admin action",
            heading: support.heading,
            paragraphs: [...support.paragraphs, "Sale / order: " + event.sale_id],
            ctaLabel: "Open admin invoices",
            ctaUrl: "https://vendibook.com" + (TRANSACTION_LINK.test(event.link) ? event.link : "/admin/invoices"),
            footnote: support.footnote,
          },
          metadata: { commerce_event_id: event.id, sale_id: event.sale_id, event_type: support.metadataType },
        });
        if (alertError) throw alertError;
      }
      const { data: prefs, error: prefsError } = await admin.from("notification_preferences")
        .select("sale_email").eq("user_id", event.recipient_id).maybeSingle();
      if (prefsError) throw prefsError;
      if (prefs?.sale_email !== false) {
        const { data: recipient, error: recipientError } = await admin.auth.admin.getUserById(event.recipient_id);
        if (recipientError || !recipient?.user?.email) throw new Error("Recipient unavailable");
        // The CTA must remain on the authenticated Vendibook purchase surfaces.
        if (!TRANSACTION_LINK.test(event.link)) {
          throw new Error("Invalid transaction link");
        }
        const { error: sendError } = await invokeTransactionalEmail({
          templateName: "generic-notice",
          recipientEmail: recipient.user.email,
          idempotencyKey: "commerce-event:" + event.id,
          templateData: {
            subject: event.title,
            kicker: "Equipment purchase",
            heading: event.title,
            paragraphs: [event.message],
            ctaLabel: ctaLabel(event),
            ctaUrl: "https://vendibook.com" + event.link,
            footnote: "Open your dashboard for the current transaction status. Only an explicitly authorized invoice payment collects funds.",
          },
          metadata: { commerce_event_id: event.id, sale_id: event.sale_id, event_type: event.event_type },
        });
        if (sendError) throw sendError;
      }
    } catch {
      failure = "Transaction email delivery failed; retry scheduled";
      failures++;
    }
    const { error: finishError } = await admin.rpc("finish_commerce_email", {
      _event: event.id, _token: token, _error: failure,
    });
    if (finishError) throw finishError;
  }
  return { processed: events?.length ?? 0, failures };
}

export function queueCommerceEmails(admin: any, actorId: string) {
  const task = dispatchCommerceEmails(admin, actorId).catch(() => {
    console.warn("[commerce-email] Deferred to scheduled retry");
  });
  const runtime = (globalThis as any).EdgeRuntime;
  if (runtime?.waitUntil) runtime.waitUntil(task);
  return task;
}
