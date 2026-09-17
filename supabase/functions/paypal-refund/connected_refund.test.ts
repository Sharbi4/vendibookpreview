import { assertEquals, assert } from "https://deno.land/std@0.190.0/testing/asserts.ts";
import { refundPayPalCapture } from "../_shared/paypal.ts";
import { recalculatePayableAfterRefund } from "../_shared/paypalAccounting.ts";

Deno.env.set("PAYPAL_ENVIRONMENT", "sandbox");
Deno.env.set("PAYPAL_CLIENT_ID_SANDBOX", "test-client");
Deno.env.set("PAYPAL_CLIENT_SECRET_SANDBOX", "test-secret");
Deno.env.set("PAYPAL_CLIENT_ID", "test-client");
Deno.env.set("PAYPAL_CLIENT_SECRET", "test-secret");

type Captured = { url: string; headers: Record<string, string>; body: any };

function stubFetch(captured: Captured[]) {
  globalThis.fetch = (async (input: any, init: any = {}) => {
    const url = String(input);
    const headers: Record<string, string> = {};
    for (const [k, v] of Object.entries(init.headers ?? {})) headers[k.toLowerCase()] = String(v);
    let body: any = undefined;
    try { body = init.body ? JSON.parse(init.body) : undefined; } catch { body = init.body; }
    captured.push({ url, headers, body });

    if (url.includes("/v1/oauth2/token")) {
      return new Response(JSON.stringify({ access_token: "tok", expires_in: 3000 }), { status: 200 });
    }
    return new Response(
      JSON.stringify({ id: "REF-123", status: "COMPLETED", amount: { value: "25.00", currency_code: "USD" } }),
      { status: 200, headers: { "content-type": "application/json" } },
    );
  }) as typeof fetch;
}

Deno.test("connected-path refund is issued on the seller's PayPal account", async () => {
  const captured: Captured[] = [];
  stubFetch(captured);

  const refund = await refundPayPalCapture({
    captureId: "CAPTURE-ABC",
    amountCents: 2500,
    currency: "USD",
    reason: "Buyer cancelled",
    idempotencyKey: "refund:VB-TEST:0:2500",
    actAsMerchantId: "SELLERMERCHANT1",
  });

  const call = captured.find((c) => c.url.includes("/refund"))!;
  assert(call, "refund call was not made");
  assert(call.url.endsWith("/v2/payments/captures/CAPTURE-ABC/refund"));
  // Auth assertion tells PayPal to act on the connected seller's behalf.
  assert(call.headers["paypal-auth-assertion"], "missing PayPal-Auth-Assertion header");
  const seg = call.headers["paypal-auth-assertion"].split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
  const payload = JSON.parse(atob(seg + "=".repeat((4 - seg.length % 4) % 4)));
  assertEquals(payload.payer_id, "SELLERMERCHANT1");
  assertEquals(call.headers["paypal-partner-attribution-id"], "VENDIBOOK_SP_PPCP");
  assertEquals(call.body.amount, { value: "25.00", currency_code: "USD" });
  assertEquals(refund.id, "REF-123");
});

Deno.test("first-party refund carries no seller assertion", async () => {
  const captured: Captured[] = [];
  stubFetch(captured);

  await refundPayPalCapture({
    captureId: "CAPTURE-XYZ",
    currency: "USD",
    idempotencyKey: "refund:VB-TEST2:0:4900",
    actAsMerchantId: null,
  });

  const call = captured.find((c) => c.url.includes("/refund"))!;
  assertEquals(call.headers["paypal-auth-assertion"], undefined);
});

Deno.test("payable figures shown in the Payments UI reflect the refund", () => {
  const payable = {
    gross_collected_cents: 10000,
    platform_fee_cents: 1290,
    refunded_cents: 0,
    net_payout_cents: 8710,
  };

  const partial = recalculatePayableAfterRefund(payable, 2500);
  assertEquals(partial.status, "partially_refunded");
  assertEquals(partial.net_payout_cents, 6533);

  const full = recalculatePayableAfterRefund(payable, 10000);
  assertEquals(full.status, "fully_refunded");
  assertEquals(full.net_payout_cents, 0);
});
