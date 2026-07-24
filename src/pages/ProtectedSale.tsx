import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2, Shield, ShieldCheck, FileSignature, CreditCard, MapPin, Handshake, PartyPopper } from 'lucide-react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { JourneyProgress, type JourneyStep } from '@/components/journey';
import { ProtectedSaleStatusBadge } from '@/components/protected-sale/ProtectedSaleStatusBadge';
import { ProtectedSaleTimeline } from '@/components/protected-sale/ProtectedSaleTimeline';
import { formatCents } from '@/lib/protectedSale/fees';
import type { Database } from '@/integrations/supabase/types';

type ProtectedSale = Database['public']['Tables']['protected_sales']['Row'];

const STEP_ORDER = [
  'id_verify',
  'agreement',
  'deposit',
  'handoff',
  'confirm',
  'released',
] as const;
type StepId = typeof STEP_ORDER[number];

function stepFromStatus(ps: ProtectedSale | null, currentUserId: string | null): StepId {
  if (!ps) return 'id_verify';
  const meVerified =
    currentUserId === ps.buyer_id ? !!ps.buyer_identity_verified_at : !!ps.seller_identity_verified_at;
  switch (ps.status) {
    case 'initiated': return meVerified ? 'id_verify' : 'id_verify';
    case 'id_verified': return 'agreement';
    case 'agreement_signed': return 'deposit';
    case 'deposit_paid': return 'handoff';
    case 'balance_authorized': return 'handoff';
    case 'handoff_scheduled': return 'confirm';
    case 'funds_released':
    case 'completed': return 'released';
    default: return 'id_verify';
  }
}

const STEPS: JourneyStep[] = [
  { id: 'id_verify', label: 'Verify ID' },
  { id: 'agreement', label: 'Agreement' },
  { id: 'deposit', label: 'Deposit' },
  { id: 'handoff', label: 'Handoff' },
  { id: 'confirm', label: 'Confirm' },
  { id: 'released', label: 'Released' },
];

export default function ProtectedSalePage() {
  const { transactionId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [ps, setPs] = useState<ProtectedSale | null>(null);

  const isBuyer = !!(user && ps && user.id === ps.buyer_id);
  const isSeller = !!(user && ps && user.id === ps.seller_id);
  const role: 'buyer' | 'seller' | null = isBuyer ? 'buyer' : isSeller ? 'seller' : null;

  const load = async () => {
    if (!transactionId) return;
    const { data } = await supabase
      .from('protected_sales')
      .select('*')
      .eq('sale_transaction_id', transactionId)
      .maybeSingle();
    setPs((data as ProtectedSale) ?? null);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transactionId]);

  const currentStep = useMemo(() => stepFromStatus(ps, user?.id ?? null), [ps, user?.id]);

  async function initiate() {
    if (!transactionId) return;
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke('protected-sale-initiate', {
        body: { sale_transaction_id: transactionId },
      });
      if (error) throw error;
      toast({ title: 'Protected Sale started', description: `Fee ${formatCents(data.protectionFeeCents)} · Deposit ${formatCents(data.depositCents)}` });
      await load();
    } catch (e) {
      toast({ title: 'Could not start protection', description: (e as Error).message, variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  }

  async function callUpdate(action: Record<string, unknown>) {
    if (!ps) return;
    setBusy(true);
    try {
      const { error } = await supabase.functions.invoke('protected-sale-update', {
        body: { protected_sale_id: ps.id, action },
      });
      if (error) throw error;
      await load();
    } catch (e) {
      toast({ title: 'Update failed', description: (e as Error).message, variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  }

  async function startDeposit() {
    if (!ps) return;
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke('protected-sale-deposit-checkout', {
        body: { protected_sale_id: ps.id },
      });
      if (error) throw error;
      if (data?.url) window.location.href = data.url as string;
    } catch (e) {
      toast({ title: 'Checkout failed', description: (e as Error).message, variant: 'destructive' });
      setBusy(false);
    }
  }

  async function confirmHandoff() {
    if (!ps) return;
    setBusy(true);
    try {
      const { error } = await supabase.functions.invoke('protected-sale-confirm-handoff', {
        body: { protected_sale_id: ps.id },
      });
      if (error) throw error;
      toast({ title: 'Handoff confirmed' });
      await load();
    } catch (e) {
      toast({ title: 'Confirmation failed', description: (e as Error).message, variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#08080a] text-white">
        <Header />
        <div className="grid place-items-center py-24"><Loader2 className="h-6 w-6 animate-spin text-orange-400" /></div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#08080a] text-white">
      <Header />
      <main className="mx-auto max-w-3xl px-4 py-10">
        <div className="mb-6 flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-xl bg-orange-500/15 text-orange-400">
            <Shield className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold">Vendibook Protected Sale</h1>
            <p className="text-sm text-white/60">Verified, held, and confirmed — end to end.</p>
          </div>
          {ps ? <div className="ml-auto"><ProtectedSaleStatusBadge status={ps.status} /></div> : null}
        </div>

        {!ps ? (
          <Card className="border-white/10 bg-white/[0.03] p-6">
            <h2 className="text-lg font-semibold">Add protection to this sale</h2>
            <p className="mt-2 text-sm text-white/70">
              Vendibook holds the buyer's deposit and balance until both parties confirm the handoff. Identity verification and an immutable agreement are captured on both sides.
            </p>
            <Button
              disabled={busy || !user}
              onClick={initiate}
              className="mt-4 bg-orange-500 text-black hover:bg-orange-400"
            >
              {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Start Protected Sale
            </Button>
          </Card>
        ) : (
          <>
            <JourneyProgress steps={STEPS} currentIndex={STEP_ORDER.indexOf(currentStep)} className="mb-6" />

            <div className="mb-6 grid gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-5 sm:grid-cols-3">
              <Stat label="Sale price" value={formatCents(ps.sale_price_cents)} />
              <Stat label="Deposit" value={formatCents(ps.deposit_cents)} />
              <Stat label="Protection fee" value={formatCents(ps.protection_fee_cents)} />
            </div>

            <div className="space-y-4">
              <StepCard
                icon={<ShieldCheck className="h-5 w-5" />}
                title="Verify identity"
                done={role === 'buyer' ? !!ps.buyer_identity_verified_at : !!ps.seller_identity_verified_at}
                description="Confirms you are who you say you are. Handled through Stripe Identity."
              >
                {role && !(role === 'buyer' ? ps.buyer_identity_verified_at : ps.seller_identity_verified_at) ? (
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" onClick={() => navigate('/verify-identity')}>
                      Verify with Stripe Identity
                    </Button>
                    <Button
                      variant="ghost"
                      className="text-white/60"
                      onClick={() => callUpdate({ type: 'mark_identity_verified' })}
                      disabled={busy}
                    >
                      I've completed verification
                    </Button>
                  </div>
                ) : (
                  <p className="text-sm text-emerald-300">Your identity is verified.</p>
                )}
              </StepCard>

              <StepCard
                icon={<FileSignature className="h-5 w-5" />}
                title="Sign the agreement"
                done={!!ps.agreement_signed_at}
                description="Immutable snapshot of price, deposit, fee, and handoff terms — the same record the dispute team sees."
              >
                {isBuyer && !ps.agreement_signed_at ? (
                  <Button
                    disabled={busy || !ps.buyer_identity_verified_at || !ps.seller_identity_verified_at}
                    onClick={() => callUpdate({
                      type: 'sign_agreement',
                      agreement_snapshot: {
                        sale_price_cents: ps.sale_price_cents,
                        deposit_cents: ps.deposit_cents,
                        protection_fee_cents: ps.protection_fee_cents,
                        balance_cents: ps.balance_cents,
                        signed_at: new Date().toISOString(),
                      },
                    })}
                    className="bg-orange-500 text-black hover:bg-orange-400"
                  >
                    Sign agreement
                  </Button>
                ) : (
                  <p className="text-sm text-white/70">
                    {ps.agreement_signed_at ? `Signed ${new Date(ps.agreement_signed_at).toLocaleString()}` : 'Waiting on buyer to sign after both IDs verify.'}
                  </p>
                )}
              </StepCard>

              <StepCard
                icon={<CreditCard className="h-5 w-5" />}
                title="Pay deposit"
                done={!!ps.deposit_paid_at}
                description={`${formatCents(ps.deposit_cents)} held by Vendibook. Balance of ${formatCents(ps.balance_cents)} is due at handoff.`}
              >
                {isBuyer && !ps.deposit_paid_at && ps.agreement_signed_at ? (
                  <Button disabled={busy} onClick={startDeposit} className="bg-orange-500 text-black hover:bg-orange-400">
                    Pay {formatCents(ps.deposit_cents)} deposit
                  </Button>
                ) : ps.deposit_paid_at ? (
                  <p className="text-sm text-emerald-300">Deposit received {new Date(ps.deposit_paid_at).toLocaleString()}.</p>
                ) : (
                  <p className="text-sm text-white/60">Buyer pays deposit after signing the agreement.</p>
                )}
              </StepCard>

              <HandoffCard ps={ps} role={role} busy={busy} onSave={callUpdate} />

              <StepCard
                icon={<Handshake className="h-5 w-5" />}
                title="Confirm handoff"
                done={!!ps.handoff_confirmed_by_buyer_at && !!ps.handoff_confirmed_by_seller_at}
                description="Both parties confirm the exchange happened. Funds release once both confirmations are in."
              >
                <div className="space-y-2 text-sm text-white/70">
                  <div>Buyer confirmed: {ps.handoff_confirmed_by_buyer_at ? new Date(ps.handoff_confirmed_by_buyer_at).toLocaleString() : '—'}</div>
                  <div>Seller confirmed: {ps.handoff_confirmed_by_seller_at ? new Date(ps.handoff_confirmed_by_seller_at).toLocaleString() : '—'}</div>
                </div>
                {role && !((role === 'buyer' ? ps.handoff_confirmed_by_buyer_at : ps.handoff_confirmed_by_seller_at)) ? (
                  <Button
                    disabled={busy || !ps.handoff_scheduled_at}
                    onClick={confirmHandoff}
                    className="mt-3 bg-orange-500 text-black hover:bg-orange-400"
                  >
                    Confirm handoff completed
                  </Button>
                ) : null}
              </StepCard>

              {ps.funds_released_at ? (
                <StepCard
                  icon={<PartyPopper className="h-5 w-5" />}
                  title="Funds released"
                  done
                  description={`Released ${new Date(ps.funds_released_at).toLocaleString()}. Seller payout follows the standard 25-day sale window.`}
                />
              ) : null}
            </div>
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-white/50">{label}</div>
      <div className="mt-1 text-lg font-semibold text-white">{value}</div>
    </div>
  );
}

function StepCard({
  icon, title, description, done, children,
}: { icon: React.ReactNode; title: string; description: string; done?: boolean; children?: React.ReactNode }) {
  return (
    <Card className={`border-white/10 bg-white/[0.03] p-5 ${done ? 'ring-1 ring-emerald-500/25' : ''}`}>
      <div className="flex items-start gap-3">
        <div className={`grid h-9 w-9 place-items-center rounded-lg ${done ? 'bg-emerald-500/15 text-emerald-300' : 'bg-white/5 text-white/70'}`}>
          {icon}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-white">{title}</h3>
            {done ? <span className="text-xs text-emerald-300">Complete</span> : null}
          </div>
          <p className="mt-1 text-sm text-white/70">{description}</p>
          {children ? <div className="mt-3">{children}</div> : null}
        </div>
      </div>
    </Card>
  );
}

function HandoffCard({
  ps, role, busy, onSave,
}: {
  ps: ProtectedSale;
  role: 'buyer' | 'seller' | null;
  busy: boolean;
  onSave: (action: Record<string, unknown>) => void;
}) {
  const [mode, setMode] = useState<'pickup' | 'delivery'>(
    (ps.handoff_mode as 'pickup' | 'delivery' | null) ?? 'pickup',
  );
  const initialLoc = (ps.handoff_location as { address?: string; notes?: string } | null) ?? {};
  const [address, setAddress] = useState(initialLoc.address ?? '');
  const [notes, setNotes] = useState(initialLoc.notes ?? '');
  const [scheduled, setScheduled] = useState(
    ps.handoff_scheduled_at ? new Date(ps.handoff_scheduled_at).toISOString().slice(0, 16) : '',
  );

  const done = !!ps.handoff_scheduled_at;

  return (
    <StepCard
      icon={<MapPin className="h-5 w-5" />}
      title="Schedule handoff"
      done={done}
      description="Pickup or delivery details lock in when both parties see the same plan."
    >
      {role === 'seller' ? (
        <div className="space-y-3">
          <RadioGroup value={mode} onValueChange={(v) => setMode(v as 'pickup' | 'delivery')} className="flex gap-4">
            <label className="flex items-center gap-2 text-sm text-white/80">
              <RadioGroupItem value="pickup" /> Pickup
            </label>
            <label className="flex items-center gap-2 text-sm text-white/80">
              <RadioGroupItem value="delivery" /> Delivery
            </label>
          </RadioGroup>
          <div>
            <Label htmlFor="ps-address" className="text-white/80">Address</Label>
            <Input id="ps-address" value={address} onChange={(e) => setAddress(e.target.value)}
              placeholder="123 Main St, City, ST" className="mt-1 bg-black/30 text-white" />
          </div>
          <div>
            <Label htmlFor="ps-when" className="text-white/80">Scheduled time</Label>
            <Input id="ps-when" type="datetime-local" value={scheduled}
              onChange={(e) => setScheduled(e.target.value)} className="mt-1 bg-black/30 text-white" />
          </div>
          <div>
            <Label htmlFor="ps-notes" className="text-white/80">Notes</Label>
            <Textarea id="ps-notes" value={notes} onChange={(e) => setNotes(e.target.value)}
              placeholder="Gate code, ID, or delivery instructions." className="mt-1 bg-black/30 text-white" />
          </div>
          <Button
            disabled={busy || !address || !scheduled}
            onClick={() => onSave({
              type: 'set_handoff',
              handoff_mode: mode,
              handoff_location: { address, notes },
              handoff_scheduled_at: new Date(scheduled).toISOString(),
            })}
            className="bg-orange-500 text-black hover:bg-orange-400"
          >
            Save handoff details
          </Button>
        </div>
      ) : (
        <div className="text-sm text-white/70">
          {ps.handoff_scheduled_at ? (
            <>
              <div><strong className="text-white">{ps.handoff_mode === 'delivery' ? 'Delivery' : 'Pickup'}</strong> — {initialLoc.address}</div>
              <div>When: {new Date(ps.handoff_scheduled_at).toLocaleString()}</div>
              {initialLoc.notes ? <div className="mt-1 text-white/60">Notes: {initialLoc.notes}</div> : null}
            </>
          ) : (
            <span>Seller is setting the handoff plan.</span>
          )}
        </div>
      )}
    </StepCard>
  );
}
