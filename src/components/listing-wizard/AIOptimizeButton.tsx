import React, { useState } from 'react';
import { Loader2, Check, Wand2, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useHostEntitlements } from '@/hooks/useHostEntitlements';
import { usePremiumUpsell, isPremiumError } from '@/hooks/usePremiumUpsell';
import { cn } from '@/lib/utils';

interface Props {
  description: string;
  category: string | null;
  mode: 'rent' | 'sale';
  title: string;
  onApply: (optimized: string) => void;
  showOptimized?: boolean;
  size?: 'sm' | 'default';
  variant?: 'outline' | 'default';
  className?: string;
  label?: string;
}

/**
 * AI Optimize button that:
 * - For entitled users: calls edge function and applies the result directly.
 * - For free users: shows a one-time free sample in a preview dialog (watermarked)
 *   with an "Upgrade to apply" CTA. After the sample is used, subsequent clicks
 *   open the premium upsell overlay.
 * - Never a dead click, never a silent disable.
 */
export const AIOptimizeButton: React.FC<Props> = ({
  description, category, mode, title, onApply,
  showOptimized, size = 'sm', variant = 'outline', className, label = 'Optimize with AI',
}) => {
  const { toast } = useToast();
  const { tier, isLoading: entLoading } = useHostEntitlements();
  const { show: showUpsell, overlay } = usePremiumUpsell();
  const [busy, setBusy] = useState(false);
  const [sample, setSample] = useState<string | null>(null);
  const [sampleOpen, setSampleOpen] = useState(false);

  const isEntitled = tier !== 'free';
  const tooShort = !description || description.trim().length < 10;

  const run = async () => {
    if (tooShort) {
      toast({
        title: 'Description too short',
        description: 'Please write at least 10 characters before optimizing.',
        variant: 'destructive',
      });
      return;
    }
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke('optimize-description', {
        body: { rawDescription: description, category, mode, title },
      });

      // supabase-js swallows the body on non-2xx; re-parse it.
      if (error) {
        // Try to extract structured code
        const ctx: any = (error as any).context;
        let parsed: any = null;
        try {
          if (ctx && typeof ctx.text === 'function') {
            const text = await ctx.text();
            parsed = text ? JSON.parse(text) : null;
          }
        } catch { /* ignore */ }
        const status = ctx?.status ?? null;
        const code = parsed?.code ?? null;
        if (isPremiumError({ status, code, raw: parsed })) {
          showUpsell('ai-description', 'listing_wizard_ai_optimize');
          return;
        }
        toast({
          title: 'Optimization failed',
          description: parsed?.error ?? error.message ?? 'Please try again.',
          variant: 'destructive',
        });
        return;
      }

      const optimized: string | undefined = data?.optimizedDescription;
      if (!optimized) {
        toast({ title: 'No output', description: 'AI returned nothing. Please try again.', variant: 'destructive' });
        return;
      }

      if (data?.is_sample) {
        setSample(optimized);
        setSampleOpen(true);
        return;
      }

      onApply(optimized);
      toast({
        title: 'Description optimized',
        description: 'Your listing description has been professionally rewritten.',
      });
    } catch (err) {
      toast({
        title: 'Optimization failed',
        description: err instanceof Error ? err.message : 'Please try again later.',
        variant: 'destructive',
      });
    } finally {
      setBusy(false);
    }
  };

  const handleClick = () => {
    if (entLoading) return;
    void run();
  };

  return (
    <>
      <Button
        type="button"
        size={size}
        variant={variant}
        onClick={handleClick}
        disabled={busy || tooShort}
        className={cn('gap-1.5', className)}
        title={tooShort ? 'Write at least 10 characters first' : undefined}
      >
        {busy ? (
          <><Loader2 className="w-4 h-4 animate-spin" /> Optimizing…</>
        ) : showOptimized ? (
          <><Check className="w-4 h-4 text-green-500" /> Optimized</>
        ) : (
          <>
            <Wand2 className="w-4 h-4" />
            {label}
            {!isEntitled && !entLoading && (
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px] uppercase tracking-wide bg-amber-500/15 text-amber-500 border border-amber-500/30">
                <Lock className="w-2.5 h-2.5 mr-1" />Pro
              </Badge>
            )}
          </>
        )}
      </Button>

      {/* Sample preview dialog for free users */}
      <Dialog open={sampleOpen} onOpenChange={setSampleOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wand2 className="w-5 h-5 text-primary" />
              Your free AI sample
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-amber-600 dark:text-amber-400">
              This is a one-time free sample. Upgrade to Starter or above to generate unlimited AI descriptions and apply them directly.
            </div>
            <div className="relative rounded-lg border border-border bg-muted/30 p-4 max-h-[380px] overflow-y-auto">
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-[0.08] select-none">
                <span className="text-6xl font-black rotate-[-18deg] tracking-widest">SAMPLE</span>
              </div>
              <p className="text-sm whitespace-pre-wrap relative">{sample}</p>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => setSampleOpen(false)}>Close</Button>
            <Button
              onClick={() => {
                setSampleOpen(false);
                showUpsell('ai-description', 'listing_wizard_ai_sample');
              }}
              className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-black font-semibold"
            >
              Upgrade to apply
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {overlay}
    </>
  );
};

export default AIOptimizeButton;
