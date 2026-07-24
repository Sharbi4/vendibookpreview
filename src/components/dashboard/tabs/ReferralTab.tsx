import { useMemo, useState } from 'react';
import { Copy, Check, Users, DollarSign, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import SharePopover from '../shared/SharePopover';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

const ReferralTab = () => {
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);
  const [howOpen, setHowOpen] = useState(false);

  const link = useMemo(() => {
    const base = typeof window !== 'undefined' ? window.location.origin : 'https://vendibook.com';
    const code = user?.id ? user.id.slice(0, 8) : 'friend';
    return `${base}/?ref=${code}`;
  }, [user?.id]);

  // Earnings breakdown placeholders — wire to `useReferrals` when data exists.
  const pending = 0;
  const paid = 0;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      toast.success('Referral link copied');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Couldn't copy — long-press the link to copy manually.");
    }
  };

  return (
    <div className="max-w-[840px] mx-auto space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-foreground">Refer & Earn</h1>
        <p className="text-sm text-muted-foreground mt-1">Share Vendibook, earn credit when friends book or list.</p>
      </header>

      <section className="rounded-md border border-border bg-card p-5 space-y-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Your referral link</p>
          <div className="mt-2 flex items-stretch gap-2">
            <input
              readOnly
              value={link}
              onFocus={(e) => e.currentTarget.select()}
              className="flex-1 min-w-0 px-3 py-2 rounded-md border border-border bg-muted/30 text-sm text-foreground font-mono truncate"
            />
            <Button onClick={handleCopy} className="gap-1.5 shrink-0" aria-label="Copy referral link">
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? 'Copied' : 'Copy'}
            </Button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <SharePopover
            url={link}
            title="Try Vendibook"
            text="I use Vendibook to rent and sell food trucks — try it out"
            label="Share"
          />
          <span className="text-xs text-muted-foreground">Opens native share on mobile, or SMS / email.</span>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3">
        <Popover>
          <PopoverTrigger asChild>
            <button className="rounded-md border border-border bg-card p-4 text-left hover:bg-muted/30 transition">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <DollarSign className="h-3.5 w-3.5" /> Earnings
              </div>
              <div className="mt-2 text-2xl font-semibold text-foreground">
                ${(pending + paid).toFixed(2)}
              </div>
              <div className="mt-1 text-[11px] text-muted-foreground">Tap to see breakdown</div>
            </button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-64">
            <p className="text-sm font-semibold">Referral earnings</p>
            <ul className="mt-3 text-sm space-y-1.5">
              <li className="flex justify-between">
                <span className="text-muted-foreground">Pending</span>
                <span className="text-foreground font-medium">${pending.toFixed(2)}</span>
              </li>
              <li className="flex justify-between">
                <span className="text-muted-foreground">Paid</span>
                <span className="text-foreground font-medium">${paid.toFixed(2)}</span>
              </li>
            </ul>
            <p className="mt-3 text-[11px] text-muted-foreground">
              Pending clears once your referral completes their first booking or sale.
            </p>
          </PopoverContent>
        </Popover>

        <div className="rounded-md border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Users className="h-3.5 w-3.5" /> Friends joined
          </div>
          <div className="mt-2 text-2xl font-semibold text-foreground">0</div>
          <div className="mt-1 text-[11px] text-muted-foreground">Referrals show up here once they sign up.</div>
        </div>
      </section>

      <Collapsible open={howOpen} onOpenChange={setHowOpen}>
        <div className="rounded-md border border-border bg-card">
          <CollapsibleTrigger className="w-full flex items-center justify-between p-4 text-left">
            <span className="text-sm font-medium text-foreground">How it works</span>
            <ChevronDown className={'h-4 w-4 text-muted-foreground transition-transform ' + (howOpen ? 'rotate-180' : '')} />
          </CollapsibleTrigger>
          <CollapsibleContent className="px-4 pb-4 text-sm text-muted-foreground space-y-2">
            <p><span className="text-foreground font-medium">1.</span> Share your link with anyone who might rent or list on Vendibook.</p>
            <p><span className="text-foreground font-medium">2.</span> When they sign up and complete their first booking or sale, you both earn credit.</p>
            <p><span className="text-foreground font-medium">3.</span> Credit clears into your Payouts once the transaction is final. Contact support for cash-out options.</p>
          </CollapsibleContent>
        </div>
      </Collapsible>
    </div>
  );
};

export default ReferralTab;
