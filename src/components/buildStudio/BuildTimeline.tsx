export type BuildEvent = { id: string; actor_role: string; kind: string; body: string | null; data: Record<string, unknown>; created_at: string };
export type Quote = {
  id: string; build_id: string; version: number; manufacturer_name: string; lines: { label: string; amount_cents: number }[];
  total_cents: number; preliminary_subtotal_cents: number | null; change_reason: string | null; lead_time_weeks: number | null;
  delivery_terms: string | null; expires_at: string; status: string; created_at: string;
};

export const usd = (c: number | null | undefined) =>
  c == null ? 'Quote required' : (c / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' });

export const BUILD_STATUS: Record<string, string> = {
  saved: 'Saved', submitted: 'Sent for review', in_review: 'In engineering review', changes_requested: 'Changes requested',
  quoted: 'Final quote ready', rejected: 'Cannot be built', accepted: 'Quote accepted',
};
const KIND: Record<string, string> = {
  submitted: 'Sent for engineering review', review_started: 'Engineering review started', message: 'Message',
  clarification_requested: 'Clarification requested', layout_change_requested: 'Layout change requested',
  incompatible_flagged: 'Incompatible equipment flagged', quote_issued: 'Final quote issued', rejected: 'Build rejected',
  customer_accepted: 'Customer accepted the quote', customer_declined: 'Customer declined the quote',
};
const WHO: Record<string, string> = { customer: 'Customer', partner: 'Build partner', admin: 'Vendibook' };

export function BuildTimeline({ events }: { events: BuildEvent[] }) {
  if (!events.length) return <p className="text-xs text-muted-foreground">No activity yet.</p>;
  return <ol className="space-y-2 border-l border-border pl-3">
    {events.map((e) => <li key={e.id} className="text-sm">
      <p className="text-xs text-muted-foreground">{WHO[e.actor_role] ?? e.actor_role} · {new Date(e.created_at).toLocaleString()}</p>
      <p className="font-medium text-foreground">{KIND[e.kind] ?? e.kind}{e.kind === 'quote_issued' && typeof e.data?.total_cents === 'number' ? ` · ${usd(e.data.total_cents as number)}` : ''}</p>
      {e.body && <p className="whitespace-pre-wrap text-muted-foreground">{e.body}</p>}
    </li>)}
  </ol>;
}

export function QuoteCard({ q, children }: { q: Quote; children?: React.ReactNode }) {
  const expired = new Date(q.expires_at) < new Date();
  const diff = q.preliminary_subtotal_cents != null ? q.total_cents - q.preliminary_subtotal_cents : null;
  return <div className="rounded-xl border border-border p-4">
    <div className="flex flex-wrap items-baseline justify-between gap-2">
      <p className="font-semibold text-foreground">Final quote v{q.version} · {q.manufacturer_name}</p>
      <p className="text-xs text-muted-foreground">{q.status === 'issued' ? (expired ? 'Expired' : `Valid until ${new Date(q.expires_at).toLocaleDateString()}`) : q.status}</p>
    </div>
    <ul className="mt-2 space-y-1 text-sm">
      {q.lines.map((l, i) => <li key={i} className="flex justify-between gap-2"><span className="text-muted-foreground">{l.label}</span><span>{usd(l.amount_cents)}</span></li>)}
    </ul>
    <p className="mt-2 flex justify-between border-t border-border pt-2 font-semibold"><span>Total</span><span>{usd(q.total_cents)}</span></p>
    {diff != null && diff !== 0 && <p className="mt-1 text-xs text-muted-foreground">{diff > 0 ? 'Up' : 'Down'} {usd(Math.abs(diff))} from your preliminary price.</p>}
    {q.change_reason && <p className="mt-1 text-xs text-muted-foreground">Reason: {q.change_reason}</p>}
    <p className="mt-1 text-xs text-muted-foreground">{q.lead_time_weeks ? `Build time about ${q.lead_time_weeks} weeks. ` : ''}{q.delivery_terms ? `Delivery: ${q.delivery_terms}` : ''}</p>
    {children}
  </div>;
}
