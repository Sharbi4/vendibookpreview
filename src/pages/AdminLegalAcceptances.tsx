/**
 * /admin/legal — legal acceptance evidence browser.
 *
 * Read-only listing of `legal_acceptances`, filterable by user, document, and
 * version, so a dispute can be evidenced with exactly what a person accepted,
 * when, from which surface, and against which order or delivery.
 */
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import SEO from '@/components/SEO';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from '@/components/ui/input';
import { LEGAL_DOCUMENTS } from '@/lib/legal/versions';

type Row = {
  id: string;
  user_id: string;
  document_slug: string;
  document_version: string;
  accepted_at: string;
  surface: string | null;
  route: string | null;
  related_entity_type: string | null;
  related_entity_id: string | null;
  user_agent: string | null;
  granted_permissions: Record<string, boolean> | null;
};

export default function AdminLegalAcceptances() {
  const { user } = useAuth();
  const [userFilter, setUserFilter] = useState('');
  const [slugFilter, setSlugFilter] = useState('');
  const [versionFilter, setVersionFilter] = useState('');

  const { data: isAdmin = false, isLoading: checkingAdmin } = useQuery({
    queryKey: ['is-admin', user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase.rpc('is_admin', { user_id: user!.id });
      return Boolean(data);
    },
  });

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ['legal-acceptances', isAdmin],
    enabled: isAdmin,
    queryFn: async () => {
      const { data, error } = await (supabase.from('legal_acceptances') as any)
        .select('*')
        .order('accepted_at', { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data ?? []) as Row[];
    },
  });

  const filtered = useMemo(
    () =>
      rows.filter(
        (r) =>
          (!userFilter || r.user_id.includes(userFilter.trim())) &&
          (!slugFilter || r.document_slug === slugFilter) &&
          (!versionFilter || r.document_version.includes(versionFilter.trim())),
      ),
    [rows, userFilter, slugFilter, versionFilter],
  );

  if (checkingAdmin) return <main className="container mx-auto px-4 py-12 text-sm text-muted-foreground">Checking access…</main>;
  if (!isAdmin) return <main className="container mx-auto px-4 py-12 text-sm text-muted-foreground">Admin access required.</main>;

  return (
    <>
      <SEO title="Legal acceptances | Vendibook Admin" description="Legal acceptance records." noindex />
      <main className="container mx-auto max-w-6xl px-4 py-10">
        <h1 className="text-2xl font-semibold">Legal acceptances</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Most recent 500 records. Filter to evidence what a specific person accepted.
        </p>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <Input placeholder="Filter by user id" value={userFilter} onChange={(e) => setUserFilter(e.target.value)} />
          <select
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            value={slugFilter}
            onChange={(e) => setSlugFilter(e.target.value)}
          >
            <option value="">All documents</option>
            {LEGAL_DOCUMENTS.map((d) => (
              <option key={d.slug} value={d.slug}>{d.title}</option>
            ))}
          </select>
          <Input placeholder="Filter by version" value={versionFilter} onChange={(e) => setVersionFilter(e.target.value)} />
        </div>

        <div className="mt-6 overflow-x-auto rounded-lg border border-border/60">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/40 text-muted-foreground">
              <tr>
                <th className="p-2">Accepted</th>
                <th className="p-2">User</th>
                <th className="p-2">Document</th>
                <th className="p-2">Version</th>
                <th className="p-2">Surface</th>
                <th className="p-2">Related</th>
                <th className="p-2">Permissions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr><td className="p-3 text-muted-foreground" colSpan={7}>Loading…</td></tr>
              )}
              {!isLoading && filtered.length === 0 && (
                <tr><td className="p-3 text-muted-foreground" colSpan={7}>No acceptance records match these filters.</td></tr>
              )}
              {filtered.map((r) => (
                <tr key={r.id} className="border-t border-border/40 align-top">
                  <td className="p-2 whitespace-nowrap">{new Date(r.accepted_at).toLocaleString()}</td>
                  <td className="p-2 font-mono">{r.user_id}</td>
                  <td className="p-2">{r.document_slug}</td>
                  <td className="p-2">{r.document_version}</td>
                  <td className="p-2">{r.surface ?? '—'}<div className="text-muted-foreground">{r.route}</div></td>
                  <td className="p-2">{r.related_entity_type ?? '—'}<div className="font-mono text-muted-foreground">{r.related_entity_id ?? ''}</div></td>
                  <td className="p-2">
                    {r.granted_permissions && Object.keys(r.granted_permissions).length > 0
                      ? Object.entries(r.granted_permissions).map(([k, v]) => `${k}: ${v ? 'yes' : 'no'}`).join(', ')
                      : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </>
  );
}
