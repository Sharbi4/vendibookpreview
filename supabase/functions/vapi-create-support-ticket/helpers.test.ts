// Adversarial unit tests for vapi-create-support-ticket helpers.
// Covers envelope parsing (canonical, batched, string-args, flat), phone
// normalization across US/international/leading-zero/extension, and the
// numeric-JSON coercion trap.
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  APPROVED_TOOL_NAME,
  extractToolCalls,
  normalizePhoneString,
} from "./helpers.ts";

Deno.test("phone: US 10-digit string", () => {
  const p = normalizePhoneString("415-273-9218");
  assertEquals(p?.e164, "+14152739218");
  assertEquals(typeof p?.e164, "string");
  assertEquals(p?.country, "US");
  assertEquals(p?.extension, null);
});

Deno.test("phone: US E.164 with '+1'", () => {
  const p = normalizePhoneString("+1 (415) 273-9218");
  assertEquals(p?.e164, "+14152739218");
});

Deno.test("phone: extension parsed off (x123)", () => {
  const p = normalizePhoneString("415-273-9218 x 42");
  assertEquals(p?.e164, "+14152739218");
  assertEquals(p?.extension, "42");
});

Deno.test("phone: numeric JSON input coerced to string, not dropped", () => {
  // Vapi sometimes emits phone as a JSON number — leading '+' would be lost
  // BUT digits must still parse.
  const p = normalizePhoneString(4152739218 as unknown);
  assertEquals(p?.e164, "+14152739218");
  assertEquals(typeof p?.e164, "string");
});

Deno.test("phone: UK international with leading zero not dropped", () => {
  // '+44 20 7946 0018' — the leading 0 of the national number must not
  // corrupt the E.164.
  const p = normalizePhoneString("+44 20 7946 0018");
  assertEquals(p?.e164, "+442079460018");
  assertEquals(p?.country, "GB");
});

Deno.test("phone: FR international with spaces", () => {
  const p = normalizePhoneString("+33 1 42 68 53 00");
  assertEquals(p?.e164, "+33142685300");
  assertEquals(p?.country, "FR");
});

Deno.test("phone: invalid junk returns null (not a bogus E.164)", () => {
  assertEquals(normalizePhoneString("not a phone"), null);
  assertEquals(normalizePhoneString(""), null);
  assertEquals(normalizePhoneString(null), null);
  assertEquals(normalizePhoneString("123"), null);
});

Deno.test("envelope: canonical Vapi toolCalls with string arguments", () => {
  const body = {
    message: {
      toolCalls: [{
        id: "call_abc",
        type: "function",
        function: {
          name: APPROVED_TOOL_NAME,
          arguments: JSON.stringify({
            customer_name: "Jane",
            issue_summary: "cannot publish",
            issue_category: "listing_issue",
            severity: "urgent",
          }),
        },
      }],
      call: { id: "vapi-call-xyz", customer: { number: "+15551239876", name: "Jane" } },
    },
  };
  const { toolCalls, callId, callerNumber, isVapiEnvelope } = extractToolCalls(body);
  assert(isVapiEnvelope);
  assertEquals(callId, "vapi-call-xyz");
  assertEquals(callerNumber, "+15551239876");
  assertEquals(toolCalls.length, 1);
  assertEquals(toolCalls[0].id, "call_abc");
  assertEquals(toolCalls[0].name, APPROVED_TOOL_NAME);
  assertEquals(toolCalls[0].args.customer_name, "Jane");
  assertEquals(toolCalls[0].args.severity, "urgent");
});

Deno.test("envelope: canonical Vapi with object arguments (not string)", () => {
  const body = {
    message: {
      toolCalls: [{
        id: "call_obj",
        function: {
          name: APPROVED_TOOL_NAME,
          arguments: { customer_name: "Sam", issue_summary: "x" },
        },
      }],
    },
  };
  const { toolCalls } = extractToolCalls(body);
  assertEquals(toolCalls[0].args.customer_name, "Sam");
});

Deno.test("envelope: batched tool calls preserve independent ids", () => {
  const body = {
    message: {
      toolCalls: [
        { id: "id1", function: { name: APPROVED_TOOL_NAME, arguments: "{\"customer_name\":\"a\"}" } },
        { id: "id2", function: { name: APPROVED_TOOL_NAME, arguments: "{\"customer_name\":\"b\"}" } },
      ],
    },
  };
  const { toolCalls } = extractToolCalls(body);
  assertEquals(toolCalls.length, 2);
  assertEquals(toolCalls[0].id, "id1");
  assertEquals(toolCalls[1].id, "id2");
});

Deno.test("envelope: flat body synthesizes a single tool call (Help Center path)", () => {
  const body = {
    customer_name: "Flat",
    issue_summary: "flat body",
    call_id: "flat-call-1",
  };
  const { toolCalls, callId, isVapiEnvelope } = extractToolCalls(body);
  assertEquals(isVapiEnvelope, false);
  assertEquals(callId, "flat-call-1");
  assertEquals(toolCalls.length, 1);
  assertEquals(toolCalls[0].name, APPROVED_TOOL_NAME);
  assertEquals(toolCalls[0].args.customer_name, "Flat");
});

Deno.test("envelope: malformed string arguments do not throw; args = {}", () => {
  const body = {
    message: {
      toolCalls: [{ id: "id_bad", function: { name: APPROVED_TOOL_NAME, arguments: "{not json" } }],
    },
  };
  const { toolCalls } = extractToolCalls(body);
  assertEquals(toolCalls.length, 1);
  assertEquals(Object.keys(toolCalls[0].args).length, 0);
});

Deno.test("envelope: unknown tool name is still extracted (handler filters later)", () => {
  const body = {
    message: {
      toolCalls: [{ id: "id_x", function: { name: "some_other_tool", arguments: "{}" } }],
    },
  };
  const { toolCalls } = extractToolCalls(body);
  assertEquals(toolCalls[0].name, "some_other_tool");
});

Deno.test("envelope: empty toolCalls array yields zero results", () => {
  const { toolCalls } = extractToolCalls({ message: { toolCalls: [] } });
  assertEquals(toolCalls.length, 0);
});

Deno.test("envelope: garbage body yields synthesized flat tool call", () => {
  // Passing `null` or a non-object body still returns a synthesized call
  // (name=create_support_ticket, empty args) — the handler's validation
  // step then rejects it.
  const { toolCalls, isVapiEnvelope } = extractToolCalls(null);
  assertEquals(isVapiEnvelope, false);
  assertEquals(toolCalls.length, 1);
});
