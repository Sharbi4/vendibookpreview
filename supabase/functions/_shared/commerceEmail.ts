import { invokeTransactionalEmail } from "./invokeTransactionalEmail.ts";

// Only persisted, server-created commerce events can become outbound messages.
export async function dispatchCommerceEmails(admin: any, actorId: string | null = null) {
  const token = crypto.randomUUID();
  const { data: events, error } = await admin.rpc("claim_commerce_emails", { _token: token, _actor: actorId });
  if (error) throw error;
  let failures = 0;
  for (const event of events ?? []) {
    let failure: string | null = null;
    try {
      // One persisted buyer event owns the support alert. Keep it independent
      // of customer email preferences and use a stable key across queue retries.
      if (event.event_type === "purchase_requested" && /^request:[0-9a-f-]{36}:buyer$/i.test(event.event_key)) {
        const requestId = event.event_key.split(":")[1];
        const { error: alertError } = await invokeTransactionalEmail({
          templateName: "generic-notice",
          recipientEmail: "support@vendibook.com",
          idempotencyKey: "manual-invoice-request:" + requestId,
          templateData: {
            subject: "Action required: purchase request — manual invoice",
            kicker: "Vendibook purchase order",
            heading: "Prepare the customer's invoice",
            paragraphs: [
              "A purchase request has been submitted. Payment is pending; this request is not a paid receipt.",
              "Purchase request: " + requestId,
              "Sale / order: " + event.sale_id,
              "Buyer account: " + event.recipient_id,
              "Review the purchase details, seller approval, agreed terms, and applicable tax before manually sending the invoice. Do not mark the order paid until payment has been verified.",
            ],
            ctaLabel: "Open admin",
            ctaUrl: "https://vendibook.com/admin",
            footnote: "Use the purchase request and order references above to reconcile the invoice and payment.",
          },
          metadata: { commerce_event_id: event.id, sale_id: event.sale_id, purchase_request_id: requestId, event_type: "manual_invoice_requested" },
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
        if (!/^\/(?:invoices\/[0-9a-f-]{36}|dashboard\/invoices(?:\?request=[0-9a-f-]{36})?)$/i.test(event.link)) {
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
            ctaLabel: event.event_type === "invoice_issued" ? "Review invoice" : "View purchase request",
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
