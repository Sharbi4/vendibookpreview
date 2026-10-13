import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { FileCheck2, Loader2, ShieldCheck, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { STATE_SALES_TAX_RATES, normalizeUsState } from '../../../supabase/functions/_shared/tax';

// tax_exemptions is newer than the generated Supabase types.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;
const BUCKET = 'tax-exemption-certificates';
const MAX_BYTES = 10 * 1024 * 1024;
const FILE_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
const TYPES = [
  ['resale', 'Resale (buying to resell or rent out)'],
  ['nonprofit', 'Nonprofit organization'],
  ['government', 'Government agency'],
  ['agricultural', 'Agricultural'],
  ['manufacturing', 'Manufacturing'],
  ['other', 'Other exemption'],
] as const;
const STATES = Object.keys(STATE_SALES_TAX_RATES).filter((s) => STATE_SALES_TAX_RATES[s] > 0).sort();

export type TaxExemption = { id: string; state: string; exemption_type: string; entity_name: string; certificate_number: string; created_at: string };

/** The signed-in buyer's active exemption certificates. */
export function useTaxExemptions() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['tax-exemptions', user?.id],
    enabled: !!user,
    queryFn: async (): Promise<TaxExemption[]> => {
      const { data, error } = await db.from('tax_exemptions')
        .select('id, state, exemption_type, entity_name, certificate_number, created_at')
        .eq('user_id', user!.id).eq('status', 'active').order('state');
      if (error) throw error;
      return data ?? [];
    },
  });
}

/**
 * "Tax exempt?" button + certificate upload. A certificate applies to the
 * buyer's checkouts in that state as soon as it is saved (owner decision
 * 2026-10-13); Vendibook reviews it afterwards and can revoke it.
 */
type ButtonProps = { state?: string | null; onChange?: () => void; className?: string };

export default function TaxExemptButton(props: ButtonProps) {
  const { user } = useAuth();
  // Signed-out visitors see nothing, and no certificate lookup runs for them.
  return user ? <SignedInTaxExemptButton {...props} /> : null;
}

function SignedInTaxExemptButton({ state, onChange, className = '' }: ButtonProps) {
  const [open, setOpen] = useState(false);
  const exemptions = useTaxExemptions();
  const current = normalizeUsState(state ?? null);
  const active = current ? exemptions.data?.find((e) => e.state === current) : undefined;
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={`inline-flex items-center gap-1.5 text-xs font-semibold text-orange-700 underline underline-offset-2 ${className}`}>
        <ShieldCheck className="h-3.5 w-3.5" />
        {active ? `Tax exempt in ${active.state}` : 'Tax exempt?'}
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Sales tax exemption</DialogTitle>
            <DialogDescription>
              Upload your state exemption or resale certificate. It applies to your checkouts in that state right away. Vendibook reviews every certificate and may ask for more information.
            </DialogDescription>
          </DialogHeader>
          <TaxExemptionManager defaultState={current} onChange={() => { onChange?.(); }} />
        </DialogContent>
      </Dialog>
    </>
  );
}

/** List + add form, also used on the Payments page. */
export function TaxExemptionManager({ defaultState, onChange }: { defaultState?: string | null; onChange?: () => void }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const exemptions = useTaxExemptions();
  const [state, setState] = useState(defaultState ?? '');
  const [type, setType] = useState<string>('resale');
  const [entity, setEntity] = useState('');
  const [number, setNumber] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [attested, setAttested] = useState(false);
  const [busy, setBusy] = useState(false);
  const refresh = async () => { await queryClient.invalidateQueries({ queryKey: ['tax-exemptions'] }); onChange?.(); };
  const existing = exemptions.data?.find((e) => e.state === state);
  const valid = !!state && entity.trim().length >= 2 && number.trim().length >= 2 && !!file && attested && !existing;

  const submit = async () => {
    if (!user || !file) return;
    if (!FILE_TYPES.includes(file.type)) return toast.error('Upload a PDF, JPG, PNG or WEBP file.');
    if (file.size > MAX_BYTES) return toast.error('The certificate file must be 10 MB or smaller.');
    setBusy(true);
    try {
      const safeName = file.name.toLowerCase().replace(/[^a-z0-9.]+/g, '-').slice(-60);
      const path = `${user.id}/${crypto.randomUUID()}-${safeName}`;
      const upload = await supabase.storage.from(BUCKET).upload(path, file, { contentType: file.type, upsert: false });
      if (upload.error) throw upload.error;
      const { error } = await db.from('tax_exemptions').insert({
        user_id: user.id, state, exemption_type: type, entity_name: entity.trim(),
        certificate_number: number.trim(), document_path: path,
      });
      if (error) throw error;
      toast.success(`Tax exemption saved for ${state}. Your checkouts there are now tax-free.`);
      setEntity(''); setNumber(''); setFile(null); setAttested(false);
      await refresh();
    } catch (error) {
      toast.error((error as Error).message || 'The certificate could not be saved.');
    } finally { setBusy(false); }
  };

  const withdraw = async (id: string) => {
    const { error } = await db.from('tax_exemptions').update({ status: 'revoked', revoke_reason: 'Withdrawn by buyer' }).eq('id', id);
    if (error) return toast.error(error.message);
    toast.success('Exemption withdrawn. Tax applies to new checkouts.');
    await refresh();
  };

  return (
    <div className="space-y-5">
      {!!exemptions.data?.length && (
        <ul className="space-y-2">
          {exemptions.data.map((e) => (
            <li key={e.id} className="flex items-start justify-between gap-3 rounded-xl border p-3 text-sm">
              <span className="flex gap-2"><FileCheck2 className="mt-0.5 h-4 w-4 text-emerald-700" />
                <span><strong>{e.state}</strong> · {e.entity_name}<br /><span className="text-xs text-muted-foreground">{TYPES.find(([v]) => v === e.exemption_type)?.[1] ?? e.exemption_type} · Certificate {e.certificate_number}</span></span>
              </span>
              <Button variant="ghost" size="sm" onClick={() => withdraw(e.id)}>Withdraw</Button>
            </li>
          ))}
        </ul>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-1 text-sm"><span className="block font-medium">State</span>
          <select className="h-10 w-full rounded-md border bg-background px-3" value={state} onChange={(e) => setState(e.target.value)}>
            <option value="">Choose a state</option>
            {STATES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </label>
        <label className="space-y-1 text-sm"><span className="block font-medium">Exemption type</span>
          <select className="h-10 w-full rounded-md border bg-background px-3" value={type} onChange={(e) => setType(e.target.value)}>
            {TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </label>
        <label className="space-y-1 text-sm sm:col-span-2"><span className="block font-medium">Business or organization name (as on the certificate)</span>
          <Input value={entity} maxLength={200} onChange={(e) => setEntity(e.target.value)} />
        </label>
        <label className="space-y-1 text-sm sm:col-span-2"><span className="block font-medium">Certificate, permit or tax ID number</span>
          <Input value={number} maxLength={80} onChange={(e) => setNumber(e.target.value)} />
        </label>
        <label className="space-y-1 text-sm sm:col-span-2"><span className="block font-medium">Certificate file (PDF or photo, up to 10 MB)</span>
          <Input type="file" accept={FILE_TYPES.join(',')} onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        </label>
      </div>
      {existing && <p className="text-xs text-amber-800">You already have an active certificate for {state}. Withdraw it first to upload a new one.</p>}
      <label className="flex items-start gap-2 text-xs leading-5 text-muted-foreground">
        <Checkbox checked={attested} onCheckedChange={(v) => setAttested(v === true)} className="mt-0.5" />
        <span>I certify this certificate is valid and my purchases in this state qualify for the exemption. If it is invalid or revoked, I am responsible for the tax, interest and penalties, and Vendibook may charge the tax it should have collected.</span>
      </label>
      <Button className="w-full" disabled={!valid || busy} onClick={submit}>
        {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}Save exemption
      </Button>
    </div>
  );
}
