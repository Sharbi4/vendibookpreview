// Support phone line, +1 866 690 6227 (owner, 2026-10-26).
//
// The ElevenLabs webhook tools authenticate with a shared header value. It is
// PHONE_AGENT_TOOL_SECRET when that edge-function secret is set; otherwise it
// is derived from ELEVENLABS_API_KEY (HMAC-SHA256), so no extra secret slot is
// needed and nobody has to copy the value by hand: admin-phone-actions
// `register_tool_secret` writes it straight into the ElevenLabs workspace
// secret the tools reference. Rotating the ElevenLabs key changes the derived
// value, so re-run register_tool_secret afterwards.

export const PHONE_LINE_NUMBER_ID = "phnum_9001m5tnf446f4sbmch182jzvfq1";
export const PHONE_TOOL_SECRET_NAME = "PHONE_AGENT_TOOL_SECRET";
const DERIVATION_LABEL = "vendibook-phone-support-tools:v1";

export async function phoneToolSecret(): Promise<string> {
  const explicit = Deno.env.get("PHONE_AGENT_TOOL_SECRET");
  if (explicit) return explicit;
  const key = Deno.env.get("ELEVENLABS_API_KEY");
  if (!key) return "";
  const hmacKey = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(key), { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
  );
  const mac = await crypto.subtle.sign("HMAC", hmacKey, new TextEncoder().encode(DERIVATION_LABEL));
  return Array.from(new Uint8Array(mac), (b) => b.toString(16).padStart(2, "0")).join("");
}

/** The agent ElevenLabs routes the support line to, or null when unavailable. */
export async function phoneLineAgent(): Promise<{ agent_id: string; agent_name: string | null } | null> {
  const explicit = Deno.env.get("PHONE_AGENT_ID");
  if (explicit) return { agent_id: explicit, agent_name: null };
  const key = Deno.env.get("ELEVENLABS_API_KEY");
  if (!key) return null;
  try {
    const res = await fetch(`https://api.elevenlabs.io/v1/convai/phone-numbers/${PHONE_LINE_NUMBER_ID}`, {
      headers: { "xi-api-key": key },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return null;
    const agent = (await res.json())?.assigned_agent;
    return agent?.agent_id ? { agent_id: String(agent.agent_id), agent_name: agent.agent_name ?? null } : null;
  } catch {
    return null;
  }
}
