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
 * Convert unambiguous English digit words to digits within a phone-number
 * context. Conservative by design:
 *   - Accepts: "zero"–"nine", plus "oh" ONLY as a substitute for zero when
 *     it sits inside a run of other digit words / digits / phone punctuation.
 *   - Does NOT accept multi-digit words ("ten", "eleven", "twenty",
 *     "hundred", …). If any such word appears mixed with digit words,
 *     the input is treated as ambiguous and returned unchanged (the
 *     downstream phone parser will then reject it).
 *   - Leaves already-digit input untouched.
 *
 * Returns the rewritten string. The caller is still responsible for
 * validation via libphonenumber-js.
 */
const DIGIT_WORDS: Record<string, string> = {
  zero: "0", one: "1", two: "2", three: "3", four: "4",
  five: "5", six: "6", seven: "7", eight: "8", nine: "9",
};
const AMBIGUOUS_NUMBER_WORDS = new Set([
  "ten","eleven","twelve","thirteen","fourteen","fifteen","sixteen",
  "seventeen","eighteen","nineteen","twenty","thirty","forty","fifty",
  "sixty","seventy","eighty","ninety","hundred","thousand",
]);
export function tokenizeSpokenDigits(input: string): string {
  if (!input) return input;
  // Fast path: no letters at all.
  if (!/[a-z]/i.test(input)) return input;
  const lower = input.toLowerCase();
  // If any ambiguous number word appears, refuse to guess.
  const wordMatches = lower.match(/[a-z]+/g) ?? [];
  const hasDigitWord = wordMatches.some((w) => w in DIGIT_WORDS || w === "oh");
  const hasAmbiguous = wordMatches.some((w) => AMBIGUOUS_NUMBER_WORDS.has(w));
  if (hasAmbiguous) return input;
  if (!hasDigitWord) return input;
  // Any non-digit-word word other than "ext"/"extension"/"x" also disqualifies.
  const ALLOWED_NON_DIGIT = new Set(["ext", "extension", "x"]);
  for (const w of wordMatches) {
    if (w in DIGIT_WORDS) continue;
    if (w === "oh") continue;
    if (ALLOWED_NON_DIGIT.has(w)) continue;
    return input; // unknown word — ambiguous, bail.
  }
  // Rewrite. "oh" -> "0" only when adjacent to digit-context chars.
  return lower.replace(/[a-z]+/g, (word, offset: number) => {
    if (word in DIGIT_WORDS) return DIGIT_WORDS[word];
    if (word === "oh") {
      const before = lower.slice(Math.max(0, offset - 2), offset);
      const after = lower.slice(offset + word.length, offset + word.length + 2);
      const ctx = before + after;
      return /[\d+()\-.,\s]/.test(ctx) ? "0" : word;
    }
    return word; // ext / extension / x — leave for the extension matcher.
  });
}

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
  // Rewrite spoken digit words BEFORE extension stripping so "five ext 42"
  // still splits correctly.
  s = tokenizeSpokenDigits(s);
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
