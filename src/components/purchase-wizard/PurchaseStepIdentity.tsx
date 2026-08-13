import { ShieldCheck, BadgeCheck, Lock, Loader2, ExternalLink, UserCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import NextStepHint from '@/components/shared/NextStepHint';

interface PurchaseStepIdentityProps {
  /** Server-derived: the buyer already holds an active identity check. */
  verified: boolean;
  loading: boolean;
  buyerName?: string | null;
  /** True once the buyer explicitly chose to continue without verifying. */
  acknowledged: boolean;
  setAcknowledged: (value: boolean) => void;
  onVerify: () => void;
  onBack: () => void;
  onContinue: () => void;
}

const ASSURANCES = [
  {
    icon: Lock,
    title: 'Your ID is never shared with the seller',
    body: 'Verification is handled by Plaid. Vendibook only receives a pass/fail result — never your document images.',
  },
  {
    icon: UserCheck,
    title: 'Sellers release faster to verified buyers',
    body: 'Verified buyers get pickup addresses and scheduling confirmed sooner, because the seller knows who they are meeting.',
  },
  {
    icon: ShieldCheck,
    title: 'Stronger protection if something goes wrong',
    body: 'A verified identity on both sides makes payment-protection claims materially quicker to resolve.',
  },
];

const PurchaseStepIdentity = ({
  verified,
  loading,
  buyerName,
  acknowledged,
  setAcknowledged,
  onVerify,
  onBack,
  onContinue,
}: PurchaseStepIdentityProps) => {
  if (loading) {
    return (
      <div className="py-16 flex flex-col items-center justify-center gap-3">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Checking your verification status…</p>
      </div>
    );
  }

  if (verified) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground tracking-tight">Identity confirmed</h2>
          <p className="text-sm text-muted-foreground mt-1">
            You're verified — nothing to do here.
          </p>
        </div>

        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/[0.07] p-5 flex items-start gap-4">
          <BadgeCheck className="h-8 w-8 text-emerald-400 shrink-0" />
          <div>
            <p className="font-semibold text-foreground">
              {buyerName ? `${buyerName} — verified buyer` : 'Verified buyer'}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              The seller will see your verified badge on this order. Your documents stay private.
            </p>
          </div>
        </div>

        <NextStepHint text="Next: choose how you'll receive the item." />

        <div className="flex gap-3">
          <Button variant="outline" onClick={onBack} className="flex-1" size="lg">Back</Button>
          <Button onClick={onContinue} className="flex-1" size="lg">Continue</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground tracking-tight">Verify your identity</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Recommended before a high-value purchase. It takes about two minutes and carries over to every future order.
        </p>
      </div>

      <div className="space-y-3">
        {ASSURANCES.map(({ icon: Icon, title, body }) => (
          <div key={title} className="rounded-lg border border-border bg-card/40 p-4 flex gap-3">
            <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Icon className="h-4.5 w-4.5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">{title}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{body}</p>
            </div>
          </div>
        ))}
      </div>

      <Button onClick={onVerify} size="lg" className="w-full">
        <ShieldCheck className="h-4 w-4 mr-2" />
        Verify my identity
        <ExternalLink className="h-3.5 w-3.5 ml-2 opacity-70" />
      </Button>

      <label className="flex items-start gap-3 rounded-lg border border-border bg-muted/20 p-4 cursor-pointer">
        <input
          type="checkbox"
          checked={acknowledged}
          onChange={(e) => setAcknowledged(e.target.checked)}
          className="mt-0.5 h-4 w-4 accent-[hsl(var(--primary))]"
        />
        <span className="text-xs text-muted-foreground">
          Continue without verifying. I understand the seller may ask me to verify before releasing the
          item, and that unverified orders can take longer to schedule.
        </span>
      </label>

      <div className="flex gap-3">
        <Button variant="outline" onClick={onBack} className="flex-1" size="lg">Back</Button>
        <Button onClick={onContinue} disabled={!acknowledged} className="flex-1" size="lg">
          Continue
        </Button>
      </div>
    </div>
  );
};

export default PurchaseStepIdentity;
