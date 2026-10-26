import { describe, it, expect } from "vitest";
import {
  BUSINESS_CALLER_ID, dialTwiml, identityForUser, parseVoiceConfig, rejectTwiml, signIntent, twilioSignature,
  userIdFromClient, validateDestination, verifyIntent, verifyTwilioSignature, voiceAccessToken,
} from "../../../supabase/functions/_shared/callbackDialer";

const SECRET = "test-intent-secret-0123456789abcdef";
const UID = "25a2c170-d11c-4a4a-b1f6-b034d70ba247";
const now = 1_800_000_000;

describe("callback dialer rules (no real calls)", () => {
  it("accepts one valid US number", () => expect(validateDestination("+16025551234")).toEqual({ ok: true, number: "+16025551234" }));
  it("rejects invalid, premium, emergency and own-line destinations", () => {
    for (const n of ["6025551234", "+44207946000", "+19005551234", "+19115551234", "+16029111234", "+18666906227", "+1602555123", "+16025551234,+16025559999", ""]) {
      expect(validateDestination(n).ok).toBe(false);
    }
  });
  it("valid intent verifies; tampered, expired and wrong-secret intents fail", async () => {
    const t = await signIntent({ id: "i1", uid: UID, to: "+16025551234", exp: now + 120 }, SECRET);
    expect((await verifyIntent(t, SECRET, now)).ok).toBe(true);
    expect(await verifyIntent(t, SECRET, now + 121)).toEqual({ ok: false, reason: "expired" });
    expect((await verifyIntent(t, "another-secret-0123456789", now)).ok).toBe(false);
    const [body, sig] = t.split(".");
    const forged = Buffer.from(JSON.stringify({ id: "i1", uid: UID, to: "+16025559999", exp: now + 120 })).toString("base64url");
    expect((await verifyIntent(`${forged}.${sig}`, SECRET, now)).ok).toBe(false);
    expect((await verifyIntent(body, SECRET, now)).ok).toBe(false);
  });
  it("binds the browser identity to one admin user", () => {
    expect(userIdFromClient("client:" + identityForUser(UID))).toBe(UID);
    expect(userIdFromClient("+16025551234")).toBeNull();
    expect(userIdFromClient("client:someone_else")).toBeNull();
  });
  it("verifies Twilio signatures and rejects tampering", async () => {
    const token = "0123456789abcdef0123456789abcdef", url = "https://x.test/functions/v1/callback-dialer/voice";
    const p = { CallSid: "CA1", From: "client:vb_admin_x", To: "+16025551234" };
    const sig = await twilioSignature(token, url, p);
    expect(await verifyTwilioSignature(token, url, p, sig)).toBe(true);
    expect(await verifyTwilioSignature(token, url, { ...p, To: "+16025559999" }, sig)).toBe(false);
    expect(await verifyTwilioSignature(token, url, p, null)).toBe(false);
    expect(await verifyTwilioSignature("", url, p, sig)).toBe(false);
  });
  it("dials exactly one number with the fixed business caller ID and recording off", () => {
    const x = dialTwiml("+16025551234");
    expect(x).toContain(`callerId="${BUSINESS_CALLER_ID}"`);
    expect(x).toContain('record="do-not-record"');
    expect(x.match(/<Number/g)).toHaveLength(1);
    expect(x).not.toMatch(/<Record|<Conference|<Client|<Sip|transcribe/i);
    expect(dialTwiml("+19005551234")).toBe(rejectTwiml());
  });
  it("issues an outgoing-only short-lived voice token", async () => {
    const t = await voiceAccessToken({ accountSid: "AC" + "a".repeat(32), apiKeySid: "SK" + "b".repeat(32), apiKeySecret: "c".repeat(32), appSid: "AP" + "d".repeat(32), identity: identityForUser(UID), nowSec: now, ttl: 99999 });
    const payload = JSON.parse(Buffer.from(t.split(".")[1], "base64url").toString());
    expect(payload.exp - payload.iat).toBe(600);
    expect(payload.grants.voice.incoming.allow).toBe(false);
    expect(payload.grants.voice.outgoing.application_sid).toBe("AP" + "d".repeat(32));
  });
  it("reports missing Twilio setup without exposing values", () => {
    expect(parseVoiceConfig(undefined).missing).toEqual(["account_sid", "api_key_sid", "api_key_secret", "auth_token", "twiml_app_sid"]);
    expect(parseVoiceConfig(JSON.stringify({ account_sid: "AC" + "a".repeat(32), api_key_sid: "SK" + "b".repeat(32), api_key_secret: "c".repeat(32), auth_token: "e".repeat(32), twiml_app_sid: "AP" + "d".repeat(32) })).config).not.toBeNull();
  });
});
