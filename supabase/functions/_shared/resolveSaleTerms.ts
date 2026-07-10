// Shared helpers for dispute/refund/notification edge functions that
// need the immutable transaction_terms snapshot a sale row agreed to
// at checkout.
//
// Primary lookup:  transaction_terms.id = sale.terms_id (backlink)
// Fallback:        transaction_terms.sale_transaction_id = sale.id
//                  (legacy rows created before terms_id existed)
//
// Both branches are wired to prove downstream consumers always see the
// same row regardless of when the sale was created.

// Duck-typed to avoid importing the full SupabaseClient type across
// esm.sh vs npm: forks; each caller passes its own client.
// deno-lint-ignore no-explicit-any
type SupabaseLike = any;

export interface AgreedTerms {
  id: string;
  terms_version: string | null;
  payment_method: string | null;
  transaction_mode: string | null;
  total_cents: number | null;
  snapshot: Record<string, unknown> | null;
  resolvedVia: 'terms_id' | 'sale_transaction_id';
}

export async function resolveSaleTerms(
  supabase: SupabaseLike,
  sale: { id: string; terms_id?: string | null },
): Promise<AgreedTerms | null> {
  const select =
    'id,terms_version,payment_method,transaction_mode,total_cents,snapshot';

  if (sale.terms_id) {
    const { data } = await supabase
      .from('transaction_terms')
      .select(select)
      .eq('id', sale.terms_id)
      .maybeSingle();
    if (data) return { ...(data as any), resolvedVia: 'terms_id' };
  }
  const { data } = await supabase
    .from('transaction_terms')
    .select(select)
    .eq('sale_transaction_id', sale.id)
    .maybeSingle();
  if (!data) return null;
  return { ...(data as any), resolvedVia: 'sale_transaction_id' };
}

const formatCents = (cents: unknown): string => {
  const n = Number(cents ?? 0) / 100;
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
};

/**
 * Plain-text block suitable for the `bodyParagraphs` field of the
 * `support-reply` template or a `paragraphs` field of `generic-notice`.
 * Renders the agreed line items + totals + cancellation policy.
 * Returns null if terms couldn't be resolved.
 */
export function formatTermsForEmail(terms: AgreedTerms | null): string | null {
  if (!terms) return null;

  // Handle both key conventions (client buildTerms uses amountCents;
  // server create-cash-sale uses amount_cents).
  const snapshot = (terms.snapshot ?? {}) as any;
  const rawLines = (snapshot?.pricing?.lines ?? []) as any[];
  const lines = rawLines
    .map((l) => ({
      label: String(l?.label ?? ''),
      amountCents: Number(l?.amountCents ?? l?.amount_cents ?? 0),
      kind: String(l?.kind ?? ''),
    }))
    .filter((l) => l.label);

  const parts: string[] = [];
  parts.push('AGREED TERMS (at checkout):');

  if (lines.length) {
    for (const l of lines) {
      parts.push(`  • ${l.label}: ${formatCents(l.amountCents)}`);
    }
  } else {
    parts.push(`  • Total: ${formatCents(terms.total_cents)}`);
  }

  if (terms.payment_method) {
    parts.push(`Payment method: ${terms.payment_method.replace(/_/g, ' ')}`);
  }
  const cancellation = snapshot?.policies?.cancellation as string | undefined;
  if (cancellation) {
    parts.push('');
    parts.push(`Cancellation policy: ${cancellation}`);
  }
  if (terms.terms_version) {
    parts.push('');
    parts.push(
      `Terms version: ${terms.terms_version} (resolved via ${terms.resolvedVia}).`,
    );
  }
  return parts.join('\n');
}
