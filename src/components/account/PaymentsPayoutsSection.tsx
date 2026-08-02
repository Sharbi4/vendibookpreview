import { useEffect, useState } from 'react';
import { Landmark, Loader2, CheckCircle2, AlertCircle, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { usePayoutAccount } from '@/hooks/usePayoutAccount';
import { SectionCard } from './RowLink';

/**
 * Payments & payouts — single source of truth for money settings.
 * Vendibook collects every payment through PayPal, tracks your proceeds, and
 * sends payouts to the PayPal email below. There is no processor onboarding.
 */
export default function PaymentsPayoutsSection() {
  const { payoutEmail, isPayoutReady, isLoading, isSaving, savePayoutEmail } = usePayoutAccount();
  const [email, setEmail] = useState('');
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    setEmail(payoutEmail ?? '');
  }, [payoutEmail]);

  const handleSave = async () => {
    try {
      await savePayoutEmail(email);
      setEditing(false);
      toast.success('Payout destination saved.');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not save payout destination.');
    }
  };

  return (
    <SectionCard
      id="section-payments"
      title="Payments & payouts"
      description="Update where money comes in and goes out."
    >
      {/* Payout destination (host / seller) */}
      <div className="p-5 flex flex-col gap-4">
        <div className="flex items-start gap-4 min-w-0">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border bg-muted/50">
            <Landmark className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold text-foreground">Payout destination</span>
              {isLoading ? (
                <Badge variant="outline" className="text-[10px] h-4 px-1.5">Checking</Badge>
              ) : isPayoutReady ? (
                <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30 text-[10px] h-4 px-1.5">
                  <CheckCircle2 className="h-2.5 w-2.5 mr-0.5" />Ready
                </Badge>
              ) : (
                <Badge className="bg-amber-500/15 text-amber-600 border-amber-500/30 text-[10px] h-4 px-1.5">
                  <AlertCircle className="h-2.5 w-2.5 mr-0.5" />Not set up
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {isPayoutReady && !editing
                ? <>Payouts are sent to <span className="text-foreground/80">{payoutEmail}</span> after each completed rental or sale.</>
                : 'Add the PayPal email where you want your rental and sale proceeds sent.'}
            </p>

            {(editing || !isPayoutReady) && (
              <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end">
                <div className="flex-1">
                  <Label htmlFor="payout-email" className="text-xs">PayPal email</Label>
                  <Input
                    id="payout-email"
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="mt-1 text-base"
                  />
                </div>
                <Button size="sm" onClick={handleSave} disabled={isSaving || !email.trim()}>
                  {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                  Save payout email
                </Button>
              </div>
            )}
          </div>
          {isPayoutReady && !editing && (
            <div className="shrink-0">
              <Button variant="outline" size="sm" onClick={() => setEditing(true)}>Change</Button>
            </div>
          )}
        </div>
      </div>

      {/* How buyers pay */}
      <div className="p-5 flex items-start gap-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border bg-muted/50">
          <Wallet className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <span className="text-sm font-semibold text-foreground">Payment methods</span>
          <p className="text-xs text-muted-foreground mt-0.5">
            Checkout runs on PayPal — pay with a PayPal balance, a card, or Pay Later without storing card
            details on Vendibook. Receipts for every purchase live in your Purchases page.
          </p>
        </div>
      </div>
    </SectionCard>
  );
}
