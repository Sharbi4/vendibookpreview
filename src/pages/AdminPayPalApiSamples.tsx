/**
 * /admin/paypal/api-samples — PayPal Integration Walkthrough evidence.
 *
 * Every PayPal REST call Vendibook makes is recorded in `paypal_api_logs` with
 * its endpoint, scrubbed request, scrubbed response, PayPal debug id and
 * latency. This page groups those records by call type so an Integration
 * Engineer can be handed a real request/response sample per endpoint.
 *
 * Nothing sensitive is stored or shown: tokens, auth assertions and card data
 * are redacted at write time, and contact fields are masked.
 */
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import SEO from '@/components/SEO';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

type LogRow = {
  id: string;
  call_name: string;
  endpoint: string;
  method: string;
  environment: string | null;
  request_headers: Record<string, unknown> | null;
  request_body: unknown;
  response_status: number | null;
  response_body: unknown;
  paypal_debug_id: string | null;
  latency_ms: number | null;
  reference: string | null;
  created_at: string;
};

const pretty = (value: unknown) => {
  if (value === null || value === undefined) return '(empty)';
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
};

function sampleText(row: LogRow) {
  return [
    `Call: ${row.call_name}`,
    `Environment: ${row.environment ?? 'unknown'}`,
    `${row.method} ${row.endpoint}`,
    `PayPal-Debug-Id: ${row.paypal_debug_id ?? '(none returned)'}`,
    `HTTP ${row.response_status ?? '(no status)'} in ${row.latency_ms ?? '?'} ms`,
    `Timestamp: ${row.created_at}`,
    '',
    'Request headers:',
    pretty(row.request_headers),
    '',
    'Request body:',
    pretty(row.request_body),
    '',
    'Response body:',
    pretty(row.response_body),
  ].join('\n');
}

export default function AdminPayPalApiSamples() {
  const { user } = useAuth();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [callFilter, setCallFilter] = useState<string>('');

  const { data: isAdmin = false, isLoading: checkingAdmin } = useQuery({
    queryKey: ['is-admin', user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase.rpc('is_admin', { user_id: user!.id });
      return Boolean(data);
    },
  });

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ['paypal-api-logs', isAdmin],
    enabled: isAdmin,
    queryFn: async () => {
      const { data, error } = await (supabase.from('paypal_api_logs') as any)
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data ?? []) as LogRow[];
    },
  });

  const grouped = useMemo(() => {
    const map = new Map<string, LogRow[]>();
    for (const row of rows) {
      const list = map.get(row.call_name) ?? [];
      list.push(row);
      map.set(row.call_name, list);
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [rows]);

  const visible = callFilter ? grouped.filter(([name]) => name === callFilter) : grouped;

  const copyAll = async () => {
    const text = visible
      .map(([name, list]) => `===== ${name} =====\n\n${sampleText(list[0])}`)
      .join('\n\n\n');
    await navigator.clipboard.writeText(text);
    toast.success('Latest sample for each call copied.');
  };

  const download = () => {
    const text = visible
      .map(([name, list]) => `===== ${name} =====\n\n${sampleText(list[0])}`)
      .join('\n\n\n');
    const url = URL.createObjectURL(new Blob([text], { type: 'text/plain' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'vendibook-paypal-api-samples.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  if (checkingAdmin) {
    return (
      <main className="container mx-auto px-4 py-12 text-sm text-muted-foreground">
        Checking access…
      </main>
    );
  }
  if (!isAdmin) {
    return (
      <main className="container mx-auto px-4 py-12 text-sm text-muted-foreground">
        Admin access required.
      </main>
    );
  }

  return (
    <>
      <SEO title="PayPal API samples | Vendibook Admin" description="PayPal API call samples." noindex />
      <main className="container mx-auto max-w-5xl px-4 py-10">
        <h1 className="text-2xl font-semibold">PayPal API samples</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Recorded request and response samples for every PayPal endpoint Vendibook calls, with the
          PayPal debug id for each. Credentials and card data are redacted; records are kept 90 days.
        </p>

        <div className="mt-5 flex flex-wrap items-center gap-2">
          <select
            value={callFilter}
            onChange={(e) => setCallFilter(e.target.value)}
            className="h-10 rounded-md border border-border bg-background px-3 text-base"
          >
            <option value="">All calls</option>
            {grouped.map(([name]) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
          <Button variant="outline" size="sm" onClick={copyAll} disabled={!visible.length}>
            Copy samples
          </Button>
          <Button variant="outline" size="sm" onClick={download} disabled={!visible.length}>
            Download .txt
          </Button>
        </div>

        {isLoading ? (
          <p className="mt-8 text-sm text-muted-foreground">Loading recorded calls…</p>
        ) : !visible.length ? (
          <p className="mt-8 text-sm text-muted-foreground">
            No PayPal calls recorded yet. Run a checkout, refund, or seller status refresh and the
            samples appear here.
          </p>
        ) : (
          <div className="mt-8 space-y-6">
            {visible.map(([name, list]) => (
              <section key={name} className="rounded-xl border border-border p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h2 className="font-semibold">{name}</h2>
                    <p className="text-xs text-muted-foreground">
                      {list.length} recorded call{list.length === 1 ? '' : 's'} ·{' '}
                      {list[0].method} {list[0].endpoint}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        navigator.clipboard.writeText(sampleText(list[0]));
                        toast.success('Sample copied.');
                      }}
                    >
                      Copy
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setExpanded(expanded === name ? null : name)}
                    >
                      {expanded === name ? 'Hide' : 'View'}
                    </Button>
                  </div>
                </div>
                <dl className="mt-3 grid gap-2 text-xs sm:grid-cols-3">
                  <div>
                    <dt className="text-muted-foreground">Debug id</dt>
                    <dd className="font-mono break-all">{list[0].paypal_debug_id ?? '—'}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Status</dt>
                    <dd>{list[0].response_status ?? '—'}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Latency</dt>
                    <dd>{list[0].latency_ms ?? '—'} ms</dd>
                  </div>
                </dl>
                {expanded === name ? (
                  <pre className="mt-3 max-h-[28rem] overflow-auto rounded-lg bg-muted/40 p-3 text-xs">
                    {sampleText(list[0])}
                  </pre>
                ) : null}
              </section>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
