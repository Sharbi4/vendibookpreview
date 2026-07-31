/**
 * Append-only payment audit trail.
 *
 * Every money-moving or money-configuring action gets a row here: who did it,
 * from where, what changed, and which provider identifiers were involved.
 * Writes are best-effort — an audit failure must never abort a payment — but
 * they are always attempted and always logged when they fail.
 */
import { safeLog } from "./paypal.ts";

export interface AuditEntry {
  actorId?: string | null;
  actorRole?: string | null;
  actorIp?: string | null;
  action: string;
  entityType:
    | "payment_record"
    | "refund"
    | "payout"
    | "subscription"
    | "product"
    | "plan"
    | "webhook"
    | "dispute";
  entityId?: string | null;
  provider?: string | null;
  reference?: string | null;
  captureId?: string | null;
  refundId?: string | null;
  payoutId?: string | null;
  oldValue?: Record<string, unknown> | null;
  newValue?: Record<string, unknown> | null;
  metadata?: Record<string, unknown>;
}

const SENSITIVE = /^(.*(token|secret|password|authorization|client_id|card|cvv|ssn|tax_id).*)$/i;

/** Strips credentials and PII-ish fields before anything is persisted. */
export function redact<T>(value: T): T {
  if (Array.isArray(value)) return value.map(redact) as unknown as T;
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = SENSITIVE.test(k) ? "[redacted]" : redact(v);
    }
    return out as T;
  }
  return value;
}

/** Client IP from the edge proxy headers, best-effort. */
export function requestIp(req: Request): string | null {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("cf-connecting-ip") ?? req.headers.get("x-real-ip");
}

export async function auditPayment(supabase: any, entry: AuditEntry): Promise<void> {
  try {
    const { error } = await supabase.from("payment_audit_log").insert({
      actor_id: entry.actorId ?? null,
      actor_role: entry.actorRole ?? null,
      actor_ip: entry.actorIp ?? null,
      action: entry.action,
      entity_type: entry.entityType,
      entity_id: entry.entityId ?? null,
      provider: entry.provider ?? "paypal",
      reference: entry.reference ?? null,
      capture_id: entry.captureId ?? null,
      refund_id: entry.refundId ?? null,
      payout_id: entry.payoutId ?? null,
      old_value: entry.oldValue ? redact(entry.oldValue) : null,
      new_value: entry.newValue ? redact(entry.newValue) : null,
      metadata: redact(entry.metadata ?? {}),
    });
    if (error) safeLog("audit_write_failed", { action: entry.action, message: error.message });
  } catch (err) {
    safeLog("audit_write_threw", { action: entry.action, message: (err as Error).message });
  }
}
