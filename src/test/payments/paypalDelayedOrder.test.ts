import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("../../../supabase/functions/_shared/paypalApiLog.ts", () => ({ logPayPalApiCall: vi.fn() }));
import { createPayPalOrder } from "../../../supabase/functions/_shared/paypal.ts";

const env: Record<string,string> = {};
let requests: { url: string; init: RequestInit }[];
beforeEach(() => {
  for (const key of Object.keys(env)) delete env[key];
  Object.assign(env, {
    PAYPAL_ENVIRONMENT: "sandbox",
    PAYPAL_SANDBOX_CLIENT_ID: "TEST-CLIENT",
    PAYPAL_SANDBOX_CLIENT_SECRET: "TEST-SECRET",
    PAYPAL_SANDBOX_PARTNER_MERCHANT_ID: "TEST-PARTNER",
    PAYPAL_INVOICE_DISBURSEMENT_ENABLED: "true",
  });
  requests = [];
  vi.stubGlobal("Deno", { env: { get: (key: string) => env[key] } });
  vi.stubGlobal("fetch", vi.fn(async (url: string, init: RequestInit) => {
    requests.push({ url, init });
    return new Response(JSON.stringify(url.endsWith("/v1/oauth2/token")
      ? { access_token: "TEST-TOKEN", expires_in: 3600 }
      : { id: "TEST-ORDER", status: "CREATED" }), { status: 200 });
  }));
});
afterEach(() => vi.unstubAllGlobals());
const input = () => ({
  reference: "TEST-INVOICE", description: "Equipment invoice", idempotencyKey: "TEST-IDEMPOTENCY",
  amountCents: 100000, currency: "USD", payeeMerchantId: "TEST-SELLER", platformFeeCents: 8700,
});
describe("PayPal delayed invoice order transport", () => {
  it("sends CAPTURE with delayed seller routing, exact partner fee and stable idempotency", async () => {
    await createPayPalOrder({ ...input(), disbursementMode: "DELAYED" });
    const request = requests.find(r => r.url.endsWith("/v2/checkout/orders"))!;
    const body = JSON.parse(request.init.body as string);
    expect(body.intent).toBe("CAPTURE");
    expect(body.purchase_units[0].payee).toEqual({ merchant_id: "TEST-SELLER" });
    expect(body.purchase_units[0].payment_instruction).toEqual({
      disbursement_mode: "DELAYED",
      platform_fees: [{ amount: { currency_code: "USD", value: "87.00" }, payee: { merchant_id: "TEST-PARTNER" } }],
    });
    expect(request.init.headers).toMatchObject({ "PayPal-Request-Id": "TEST-IDEMPOTENCY" });
    expect((request.init.headers as Record<string,string>)["PayPal-Auth-Assertion"]).toBeTruthy();
  });
  it("preserves existing instant settlement by default", async () => {
    await createPayPalOrder(input());
    const body = JSON.parse(requests.find(r => r.url.endsWith("/v2/checkout/orders"))!.init.body as string);
    expect(body.purchase_units[0].payment_instruction.disbursement_mode).toBe("INSTANT");
  });
  it("does not route existing first-party purchases to a seller", async () => {
    await createPayPalOrder({ ...input(), payeeMerchantId: null });
    const body = JSON.parse(requests.find(r => r.url.endsWith("/v2/checkout/orders"))!.init.body as string);
    expect(body.purchase_units[0].payee).toBeUndefined();
    expect(body.purchase_units[0].payment_instruction).toBeUndefined();
  });
  it("rejects delayed disbursement while its flag is off without calling PayPal", async () => {
    env.PAYPAL_INVOICE_DISBURSEMENT_ENABLED = "false";
    await expect(createPayPalOrder({ ...input(), disbursementMode: "DELAYED" })).rejects.toThrow(/not enabled/);
    expect(requests).toEqual([]);
  });
  it("never falls back to platform custody without either merchant", async () => {
    await expect(createPayPalOrder({ ...input(), payeeMerchantId: null, disbursementMode: "DELAYED" })).rejects.toThrow(/merchants/);
    delete env.PAYPAL_SANDBOX_PARTNER_MERCHANT_ID;
    await expect(createPayPalOrder({ ...input(), disbursementMode: "DELAYED" })).rejects.toThrow(/merchants/);
    expect(requests).toEqual([]);
  });
  it.each([-1, 1.5, Number.NaN, 100000, 100001])("rejects invalid partner fee %s rather than silently changing it", async fee => {
    await expect(createPayPalOrder({ ...input(), platformFeeCents: fee, disbursementMode: "DELAYED" })).rejects.toThrow(/amounts/);
    expect(requests).toEqual([]);
  });
});
