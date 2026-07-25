import { useState } from 'react';
import { Loader2, Check, Copy, TrendingUp, ArrowRightLeft, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { parseEdgeError } from '@/lib/edgeErrors';
import { usePremiumUpsell, isPremiumError, featureFromParsed } from '@/hooks/usePremiumUpsell';
import { PremiumChip } from '@/components/monetization/PremiumChip';
import { cn } from '@/lib/utils';


interface NegotiationCoachProps {
  offerId: string;
  /** Called with chosen counter amount when user clicks "Use this counter" */
  onUseCounter: (amount: number) => void;
  className?: string;
}

interface Advice {
  recommended_counter: number;
  range_aggressive: number;
  range_balanced: number;
  range_quick_close: number;
  signal: 'accept' | 'counter' | 'decline';
  reasoning: string;
  reply_script: string;
  confidence: number;
}

export const NegotiationCoach = ({ offerId, onUseCounter, className }: NegotiationCoachProps) => {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [advice, setAdvice] = useState<Advice | null>(null);
  const premiumUpsell = usePremiumUpsell();

  const fetchAdvice = async () => {
    if (advice) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-negotiation-coach', {
        body: { offerId }});
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setAdvice(data.advice as Advice);
    } catch (e: any) {
      const parsed = await parseEdgeError(e);
      if (isPremiumError(parsed)) {
        setOpen(false);
        premiumUpsell.show(featureFromParsed(parsed) ?? 'negotiation-coach', 'offer_thread');
      } else {
        toast({ title: 'Coach unavailable', description: parsed.message || 'Try again later', variant: 'destructive' });
      }
    } finally {
      setLoading(false);
    }
  };


  const copyScript = () => {
    if (!advice) return;
    navigator.clipboard.writeText(advice.reply_script);
    toast({ title: 'Reply copied' });
  };

  const signalColor = advice?.signal === 'accept'
    ? 'text-emerald-600 dark:text-emerald-400'
    : advice?.signal === 'decline'
    ? 'text-destructive'
    : 'text-primary';

  return (
    <Collapsible open={open} onOpenChange={(v) => { setOpen(v); if (v) fetchAdvice(); }} className={className}>
      <CollapsibleTrigger asChild>
        <button
          type="button"
          className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg border border-primary/30 bg-gradient-to-r from-primary/10 to-primary/5 hover:from-primary/15 hover:to-primary/10 text-left transition-all"
        >
          <div className="flex items-center gap-2 min-w-0">
            
            <span className="text-xs font-semibold text-foreground">AI Negotiation Coach</span>
            <PremiumChip />
            <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4">Beta</Badge>
          </div>

          <ChevronDown className={cn("h-3.5 w-3.5 text-muted-foreground transition-transform", open && "rotate-180")} />
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-2">
        {loading && (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <span className="text-xs text-muted-foreground ml-2">Analyzing market data…</span>
          </div>
        )}
        {advice && (
          <div className="space-y-3 p-3 rounded-xl bg-card border border-border/60">
            {/* Signal */}
            <div className="flex items-center gap-2">
              <TrendingUp className={cn("h-4 w-4", signalColor)} />
              <span className={cn("text-xs font-bold uppercase tracking-wide", signalColor)}>
                {advice.signal === 'accept' ? 'Suggest: Accept' : advice.signal === 'decline' ? 'Suggest: Decline' : 'Suggest: Counter'}
              </span>
              <span className="ml-auto text-[10px] text-muted-foreground">{Math.round(advice.confidence * 100)}% confidence</span>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">{advice.reasoning}</p>

            {/* Counter range */}
            {advice.signal !== 'accept' && (
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { label: 'Aggressive', amt: advice.range_aggressive, hint: 'Max profit' },
                  { label: 'Balanced', amt: advice.range_balanced, hint: 'Recommended', highlight: true },
                  { label: 'Quick close', amt: advice.range_quick_close, hint: 'Fast deal' }].map((opt) => (
                  <button
                    key={opt.label}
                    type="button"
                    onClick={() => onUseCounter(opt.amt)}
                    className={cn(
                      "p-2 rounded-lg border text-left transition-all hover:scale-[1.02]",
                      opt.highlight
                        ? "bg-primary/10 border-primary/40 hover:border-primary"
                        : "bg-muted/40 border-border/60 hover:border-foreground/30"
                    )}
                  >
                    <div className="text-[9px] uppercase text-muted-foreground tracking-wide">{opt.label}</div>
                    <div className="text-sm font-bold text-foreground tabular-nums">${opt.amt.toLocaleString()}</div>
                    <div className="text-[9px] text-muted-foreground">{opt.hint}</div>
                  </button>
                ))}
              </div>
            )}

            {/* Reply script */}
            {advice.reply_script && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase text-muted-foreground tracking-wide font-semibold">Suggested reply</span>
                  <button onClick={copyScript} className="text-[10px] text-primary hover:underline flex items-center gap-1">
                    <Copy className="h-2.5 w-2.5" />Copy
                  </button>
                </div>
                <p className="text-xs text-muted-foreground italic leading-relaxed p-2 rounded-lg bg-muted/40 border border-border/40">
                  "{advice.reply_script}"
                </p>
              </div>
            )}
          </div>
        )}
      </CollapsibleContent>
      {premiumUpsell.overlay}
    </Collapsible>
  );
};

