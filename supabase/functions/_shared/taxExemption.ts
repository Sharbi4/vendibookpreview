import { normalizeUsState } from "./tax.ts";

/**
 * Active tax-exemption certificate for a buyer in a state, or null.
 * Certificates apply as soon as they are uploaded (owner decision 2026-10-13);
 * a revoked or withdrawn certificate never applies. Errors fail closed to
 * "no exemption" so a lookup problem can only ever charge tax, never skip it.
 */
// deno-lint-ignore no-explicit-any
export async function findActiveExemption(admin: any, userId: string | null | undefined, state: string | null | undefined) {
  const code = normalizeUsState(state);
  if (!userId || !code) return null;
  const { data, error } = await admin
    .from("tax_exemptions")
    .select("id, state")
    .eq("user_id", userId)
    .eq("state", code)
    .eq("status", "active")
    .maybeSingle();
  if (error || !data) return null;
  return { id: data.id as string, state: data.state as string };
}
