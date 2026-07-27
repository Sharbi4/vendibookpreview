// Pure helpers for vapi-create-support-ticket, extracted so unit tests can
// import them without booting the HTTP server in index.ts.
import {
  parsePhoneNumberFromString,
  type CountryCode,
} from "https://esm.sh/libphonenumber-js@1.11.14/max";

export const APPROVED_TOOL_NAME = "create_support_ticket";

export function safeString(v: unknown, max: number): string | null {
  if (v == null) return null;
  const s =
    typeof v === "string"
      ? v
      : typeof v === "number" || typeof v === "boolean"
        ? String(v)
        : null;
  if (s == null) return null;
  const t = s.trim();
  return t ? t.slice(0, max) : null;
}

export type NormalizedPhone = {
  e164: string;
  display: string;
  country: string | null;
  extension: string | null;
};

/**
 * Normalize a phone number as a STRING (never numeric). Preserves leading
 * zeros and country codes. Extension is parsed off before validation.
 * Returns null when the number cannot be parsed as a valid phone.
 */
export function normalizePhoneString(
  raw: unknown,
  defaultCountry: CountryCode = "US",
): NormalizedPhone | null {
  if (raw == null) return null;
  let s = String(raw).trim();
  if (!s) return null;
  let ext: string | null = null;
  const extMatch = s.match(
    /(?:\s*(?:ext|x|extension)\.?\s*|,)(\d{1,7})\s*$/i,
  );
  if (extMatch) {
    ext = extMatch[1];
    s = s.slice(0, extMatch.index).trim();
  }
  const cleaned = s.replace(/[^\d+\s\-().]/g, "").trim();
  if (!cleaned) return null;
  const parsed = parsePhoneNumberFromString(cleaned, defaultCountry);
  if (!parsed || !parsed.isValid()) return null;
  return {
    e164: parsed.number,
    display: parsed.formatNational(),
    country: parsed.country ?? null,
    extension: ext,
  };
}

export type ToolCall = { id: string; args: Record<string, unknown>; name: string };

export function extractToolCalls(body: unknown): {
  toolCalls: ToolCall[];
  callId: string | null;
  callerNumber: string | null;
  callerName: string | null;
  isVapiEnvelope: boolean;
} {
  const b = (body && typeof body === "object" ? body : {}) as Record<string, unknown>;
  const message = (b.message && typeof b.message === "object" ? b.message : {}) as Record<string, unknown>;
  const call = (message.call && typeof message.call === "object"
    ? message.call
    : b.call && typeof b.call === "object"
      ? b.call
      : {}) as Record<string, unknown>;
  const customer = (call.customer && typeof call.customer === "object" ? call.customer : {}) as Record<string, unknown>;

  const callId = safeString(call.id ?? message.callId ?? b.call_id, 120);
  const callerNumber = safeString(customer.number ?? call.customerPhoneNumber, 40);
  const callerName = safeString(customer.name, 120);
  const isVapiEnvelope = !!b.message;

  const rawCalls =
    (Array.isArray(message.toolCalls) && message.toolCalls) ||
    (Array.isArray(message.toolCallList) && message.toolCallList) ||
    (Array.isArray(b.toolCalls) && b.toolCalls) ||
    null;

  const toolCalls: ToolCall[] = [];
  if (rawCalls) {
    for (const raw of rawCalls) {
      if (!raw || typeof raw !== "object") continue;
      const tc = raw as Record<string, unknown>;
      const id = safeString(tc.id ?? tc.toolCallId, 120) ?? "";
      const fn = (tc.function && typeof tc.function === "object" ? tc.function : {}) as Record<string, unknown>;
      const name = safeString(fn.name ?? tc.name, 80) ?? "";
      let args: Record<string, unknown> = {};
      const rawArgs = fn.arguments ?? tc.arguments ?? tc.parameters ?? {};
      if (typeof rawArgs === "string") {
        try { args = JSON.parse(rawArgs); } catch { args = {}; }
      } else if (rawArgs && typeof rawArgs === "object") {
        args = rawArgs as Record<string, unknown>;
      }
      if (!id || !name) continue;
      toolCalls.push({ id, name, args });
    }
  } else {
    toolCalls.push({
      id: safeString(b.tool_call_id ?? b.toolCallId, 120) ?? `flat:${callId ?? crypto.randomUUID()}`,
      name: APPROVED_TOOL_NAME,
      args: b,
    });
  }

  return { toolCalls, callId, callerNumber, callerName, isVapiEnvelope };
}
