import { useEffect, useMemo, useState } from 'react';
import { Loader2, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { formatUsd } from '@/lib/monetization/products';

/**
 * Campus Partner programme admin: school partners, their academic-year codes
 * and aggregate results. Reporting is aggregate only (campus_partner_stats):
 * no shopper names, emails or payment details.
 */

interface PartnerRow { id: string; name: string; slug: string; active: boolean }
interface CodeRow {
  id: string;
  code: string;
  partner_id: string;
  academic_year: string | null;
  active: boolean;
  starts_at: string | null;
  ends_at: string | null;
  rental_percent: number | null;
  rental_cap_cents: number | null;
  purchase_credit_cents: number | null;
  purchase_min_cents: number | null;
  per_user_rental_limit: number;
  per_user_purchase_limit: number;
}
interface StatRow {
  code_id: string;
  redemptions: number;
  unique_users: number;
  rental_transactions: number;
  purchase_transactions: number;
  gmv_cents: number;
  credits_cents: number;
  refunded_transactions: number;
  platform_revenue_cents: number;
}

// campus_partners and the new discount_codes columns aren't in the generated types yet.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

interface FormState {
  partnerId: string | null;
  codeId: string | null;
  name: string;
  slug: string;
  code: string;
  academicYear: string;
  startsAt: string;
  endsAt: string;
  rentalPercent: string;
  rentalCap: string;
  purchaseCredit: string;
  purchaseMin: string;
  rentalLimit: string;
  purchaseLimit: string;
}

const EMPTY_FORM: FormState = {
  partnerId: null,
  codeId: null,
  name: '',
  slug: '',
  code: '',
  academicYear: '2026-27',
  startsAt: '2026-08-01',
  endsAt: '2027-08-01',
  rentalPercent: '10',
  rentalCap: '100',
  purchaseCredit: '250',
  purchaseMin: '5000',
  rentalLimit: '2',
  purchaseLimit: '1',
};

const slugify = (v: string) => v.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
const toCents = (v: string) => (v.trim() === '' ? null : Math.round(Number(v) * 100));
const fromCents = (c: number | null) => (c == null ? '' : String(c / 100));
const dateOnly = (iso: string | null) => (iso ? iso.slice(0, 10) : '');
const n = (v: unknown) => Number(v ?? 0);

export default function CampusPartnersAdmin() {
  const [loading, setLoading] = useState(true);
  const [partners, setPartners] = useState<PartnerRow[]>([]);
  const [codes, setCodes] = useState<CodeRow[]>([]);
  const [stats, setStats] = useState<StatRow[]>([]);
  const [form, setForm] = useState<FormState | null>(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const [p, c, s] = await Promise.all([
      db.from('campus_partners').select('id, name, slug, active').order('name'),
      db.from('discount_codes').select('*').eq('campaign_type', 'campus_partner').order('code'),
      db.rpc('campus_partner_stats'),
    ]);
    if (p.error || c.error) toast.error(p.error?.message ?? c.error?.message ?? 'Failed to load Campus Partners');
    setPartners(p.data ?? []);
    setCodes(c.data ?? []);
    setStats(s.data ?? []);
    setLoading(false);
  };

  useEffect(() => { void load(); }, []);

  const partnerById = useMemo(() => new Map(partners.map((p) => [p.id, p])), [partners]);
  const statByCode = useMemo(() => new Map(stats.map((s) => [s.code_id, s])), [stats]);
  const totals = useMemo(() => stats.reduce((t, s) => ({
    redemptions: t.redemptions + n(s.redemptions),
    gmv: t.gmv + n(s.gmv_cents),
    credits: t.credits + n(s.credits_cents),
    revenue: t.revenue + n(s.platform_revenue_cents),
  }), { redemptions: 0, gmv: 0, credits: 0, revenue: 0 }), [stats]);

  const toggleCode = async (code: CodeRow, next: boolean) => {
    const { error } = await db.from('discount_codes').update({ active: next }).eq('id', code.id);
    if (error) return toast.error(error.message);
    setCodes((prev) => prev.map((c) => (c.id === code.id ? { ...c, active: next } : c)));
    toast.success(next ? `${code.code} activated` : `${code.code} deactivated`);
  };

  const edit = (code: CodeRow) => {
    const partner = partnerById.get(code.partner_id);
    setForm({
      partnerId: code.partner_id,
      codeId: code.id,
      name: partner?.name ?? '',
      slug: partner?.slug ?? '',
      code: code.code,
      academicYear: code.academic_year ?? '',
      startsAt: dateOnly(code.starts_at),
      endsAt: dateOnly(code.ends_at),
      rentalPercent: code.rental_percent == null ? '' : String(code.rental_percent),
      rentalCap: fromCents(code.rental_cap_cents),
      purchaseCredit: fromCents(code.purchase_credit_cents),
      purchaseMin: fromCents(code.purchase_min_cents),
      rentalLimit: String(code.per_user_rental_limit),
      purchaseLimit: String(code.per_user_purchase_limit),
    });
  };

  const save = async () => {
    if (!form) return;
    const name = form.name.trim();
    const code = form.code.replace(/\s+/g, '').toUpperCase();
    if (name.length < 2) return toast.error('Enter the school name.');
    if (!/^[A-Z0-9-]{3,40}$/.test(code)) return toast.error('Codes use 3–40 letters, numbers or dashes.');
    setSaving(true);
    try {
      let partnerId = form.partnerId;
      if (partnerId) {
        const { error } = await db.from('campus_partners').update({ name }).eq('id', partnerId);
        if (error) throw error;
      } else {
        const { data, error } = await db.from('campus_partners')
          .insert({ name, slug: form.slug || slugify(name) }).select('id').single();
        if (error) throw error;
        partnerId = data.id;
      }
      const values = {
        code,
        campaign_type: 'campus_partner',
        partner_id: partnerId,
        academic_year: form.academicYear.trim() || null,
        starts_at: form.startsAt ? new Date(`${form.startsAt}T00:00:00`).toISOString() : null,
        ends_at: form.endsAt ? new Date(`${form.endsAt}T00:00:00`).toISOString() : null,
        rental_percent: form.rentalPercent.trim() === '' ? null : Number(form.rentalPercent),
        rental_cap_cents: form.rentalPercent.trim() === '' ? null : toCents(form.rentalCap),
        purchase_credit_cents: toCents(form.purchaseCredit),
        purchase_min_cents: form.purchaseCredit.trim() === '' ? null : toCents(form.purchaseMin) ?? 0,
        per_user_rental_limit: Math.max(0, Math.round(Number(form.rentalLimit || 0))),
        per_user_purchase_limit: Math.max(0, Math.round(Number(form.purchaseLimit || 0))),
      };
      const { error } = form.codeId
        ? await db.from('discount_codes').update(values).eq('id', form.codeId)
        : await db.from('discount_codes').insert({ ...values, active: false });
      if (error) throw error;
      toast.success(form.codeId ? 'Campus Partner updated' : 'Campus Partner added (inactive until you switch it on)');
      setForm(null);
      await load();
    } catch (e) {
      toast.error((e as { message?: string }).message ?? 'Could not save');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;
  }

  const field = (key: keyof FormState, label: string, props: Record<string, unknown> = {}) => (
    <div className="space-y-1">
      <Label htmlFor={`cp-${key}`} className="text-xs">{label}</Label>
      <Input
        id={`cp-${key}`}
        value={(form?.[key] as string) ?? ''}
        onChange={(e) => setForm((f) => (f ? { ...f, [key]: e.target.value } : f))}
        {...props}
      />
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Campus Partners</h2>
          <p className="text-sm text-muted-foreground">
            School codes give a Vendibook-funded credit. Host and seller payouts are never reduced.
          </p>
        </div>
        <Button size="sm" onClick={() => setForm({ ...EMPTY_FORM })}><Plus className="mr-1 h-4 w-4" /> Add school partner</Button>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Redemptions" value={String(totals.redemptions)} />
        <Stat label="GMV" value={formatUsd(totals.gmv)} />
        <Stat label="Credits funded" value={formatUsd(totals.credits)} />
        <Stat label="Platform revenue after credits" value={formatUsd(totals.revenue)} />
      </div>

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full min-w-[1100px] text-sm [&_td]:whitespace-nowrap [&_th]:whitespace-nowrap">
          <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-3 py-2 text-left">School</th>
              <th className="px-3 py-2 text-left">Code</th>
              <th className="px-3 py-2 text-left">Dates</th>
              <th className="px-3 py-2 text-left">Benefit</th>
              <th className="px-3 py-2 text-left">Per-user limit</th>
              <th className="px-3 py-2 text-right">Redeemed</th>
              <th className="px-3 py-2 text-right">Users</th>
              <th className="px-3 py-2 text-right">Rentals</th>
              <th className="px-3 py-2 text-right">Purchases</th>
              <th className="px-3 py-2 text-right">GMV</th>
              <th className="px-3 py-2 text-right">Credits</th>
              <th className="px-3 py-2 text-right">Refunds</th>
              <th className="px-3 py-2 text-right">Platform rev.</th>
              <th className="px-3 py-2 text-right">Active</th>
            </tr>
          </thead>
          <tbody>
            {codes.length === 0 && (
              <tr><td colSpan={14} className="px-3 py-6 text-center text-muted-foreground">No Campus Partners yet.</td></tr>
            )}
            {codes.map((c) => {
              const s = statByCode.get(c.id);
              return (
                <tr key={c.id} className="border-t border-border">
                  <td className="px-3 py-2">
                    <button type="button" className="text-left font-medium text-foreground underline-offset-2 hover:underline" onClick={() => edit(c)}>
                      {partnerById.get(c.partner_id)?.name ?? '—'}
                    </button>
                  </td>
                  <td className="px-3 py-2 font-mono font-semibold">{c.code}</td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">
                    {dateOnly(c.starts_at) || 'now'} → {dateOnly(c.ends_at) || 'open'}
                  </td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">
                    {c.rental_percent != null ? `Rent ${Number(c.rental_percent)}% (max ${formatUsd(c.rental_cap_cents ?? 0)})` : null}
                    {c.rental_percent != null && c.purchase_credit_cents != null ? <br /> : null}
                    {c.purchase_credit_cents != null ? `Buy ${formatUsd(c.purchase_credit_cents)} at ${formatUsd(c.purchase_min_cents ?? 0)}+` : null}
                  </td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">{c.per_user_rental_limit} rentals · {c.per_user_purchase_limit} purchase</td>
                  <td className="px-3 py-2 text-right">{n(s?.redemptions)}</td>
                  <td className="px-3 py-2 text-right">{n(s?.unique_users)}</td>
                  <td className="px-3 py-2 text-right">{n(s?.rental_transactions)}</td>
                  <td className="px-3 py-2 text-right">{n(s?.purchase_transactions)}</td>
                  <td className="px-3 py-2 text-right">{formatUsd(n(s?.gmv_cents))}</td>
                  <td className="px-3 py-2 text-right">{formatUsd(n(s?.credits_cents))}</td>
                  <td className="px-3 py-2 text-right">{n(s?.refunded_transactions)}</td>
                  <td className="px-3 py-2 text-right">{formatUsd(n(s?.platform_revenue_cents))}</td>
                  <td className="px-3 py-2 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Badge variant={c.active ? 'default' : 'secondary'}>{c.active ? 'Active' : 'Off'}</Badge>
                      <Switch checked={c.active} onCheckedChange={(v) => toggleCode(c, v)} aria-label={`Activate ${c.code}`} />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Dialog open={!!form} onOpenChange={(open) => { if (!open) setForm(null); }}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{form?.codeId ? 'Edit Campus Partner' : 'Add school partner'}</DialogTitle>
          </DialogHeader>
          {form ? (
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">{field('name', 'School name', { placeholder: 'Pima Community College' })}</div>
              {field('code', 'Code', { placeholder: 'PIMA27', className: 'uppercase font-mono' })}
              {field('academicYear', 'Academic year', { placeholder: '2026-27' })}
              {field('startsAt', 'Starts', { type: 'date' })}
              {field('endsAt', 'Expires', { type: 'date' })}
              {field('rentalPercent', 'Rental credit %', { inputMode: 'decimal' })}
              {field('rentalCap', 'Rental credit cap ($)', { inputMode: 'decimal' })}
              {field('purchaseCredit', 'Purchase credit ($)', { inputMode: 'decimal' })}
              {field('purchaseMin', 'Purchase minimum ($)', { inputMode: 'decimal' })}
              {field('rentalLimit', 'Rentals per user', { inputMode: 'numeric' })}
              {field('purchaseLimit', 'Purchases per user', { inputMode: 'numeric' })}
              <p className="col-span-2 text-xs text-muted-foreground">
                Leave the rental % or purchase credit empty to switch that benefit off. New codes start inactive.
              </p>
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setForm(null)} disabled={saving}>Cancel</Button>
            <Button onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border p-3">
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1 text-xl font-semibold text-foreground">{value}</div>
    </div>
  );
}
