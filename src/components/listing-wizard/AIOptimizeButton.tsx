import React, { useState } from 'react';
import { Loader2, Check, Flame, Lock, RefreshCw } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useHostEntitlements } from '@/hooks/useHostEntitlements';
import { usePremiumUpsell, isPremiumError } from '@/hooks/usePremiumUpsell';
import { SparkChip } from '@/components/spark/SparkChip';
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
 * AI Optimize button.
 * - NEVER a dead click: button is only disabled while busy. Short-description
 *   validation surfaces as a toast so the user sees why nothing generated.
 * - Entitled users: generates via edge function, shows before/after preview,
 *   applies only after explicit "Use this" (never silently overwrites).
 * - Free users: one watermarked sample per account, then upsell overlay.
 * - Non-2xx from the edge function ALWAYS produces visible feedback.
 */
export const AIOptimizeButton: React.FC<Props> = ({
  description, category, mode, title, onApply,
  showOptimized, size = 'sm', variant = 'outline', className, label = 'Optimize with AI',
}) => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const { tier, isLoading: entLoading } = useHostEntitlements();
  const { show: showUpsell, overlay } = usePremiumUpsell();
  const [busy, setBusy] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewText, setPreviewText] = useState<string | null>(null);
  const [isSamplePreview, setIsSamplePreview] = useState(false);

  const isEntitled = tier !== 'free';

  const run = async () => {
    const trimmed = (description ?? '').trim();
    if (trimmed.length < 10) {
      toast({
        title: 'Add a bit more first',
        description: 'Write at least 10 characters (a rough draft is fine) — AI will polish it.',
        variant: 'destructive',
      });
      return;
    }
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke('optimize-description', {
        body: { rawDescription: trimmed, category, mode, title },
      });

      if (error) {
        // supabase-js hides the response body on non-2xx — parse it back.
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

        if (code === 'auth_required' || code === 'auth_invalid' || status === 401) {
          toast({
            title: 'Sign in to use AI',
            description: 'Redirecting to sign in — your draft will be preserved.',
          });
          const returnTo = location.pathname + location.search;
          navigate(`/auth?returnTo=${encodeURIComponent(returnTo)}`);
          return;
        }
        if (isPremiumError({ status, code, raw: parsed })) {
          showUpsell('ai-description', 'listing_wizard_ai_optimize');
          return;
        }
        if (code === 'rate_limited' || status === 429) {
          toast({ title: 'Slow down a sec', description: 'Too many requests — try again in a moment.', variant: 'destructive' });
          return;
        }
        if (code === 'credits_exhausted' || status === 402) {
          toast({ title: 'AI temporarily unavailable', description: 'Please try again shortly.', variant: 'destructive' });
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

      setPreviewText(optimized);
      setIsSamplePreview(!!data?.is_sample);
      setPreviewOpen(true);
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
    if (entLoading || busy) return;
    void run();
  };

  const handleUseThis = () => {
    if (!previewText) return;
    onApply(previewText);
    setPreviewOpen(false);
    toast({
      title: 'Applied',
      description: 'Your description has been updated. You can still edit it.',
    });
  };

  return (
    <>
      <Button
        type="button"
        size={size}
        variant={variant}
        onClick={handleClick}
        disabled={busy}
        className={cn('gap-1.5', className)}
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

      {/* Before/After preview — required for entitled users; watermarked + upsell for the free sample. */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wand2 className="w-5 h-5 text-primary" />
              {isSamplePreview ? 'Your free AI sample' : 'AI-polished description'}
            </DialogTitle>
          </DialogHeader>
          {isSamplePreview && (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-amber-600 dark:text-amber-400">
              This is a one-time free sample. Upgrade to Starter or above to apply AI copy directly to your listing and generate unlimited rewrites.
            </div>
          )}
          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-lg border border-border bg-muted/20 p-3">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Your draft</div>
              <p className="text-sm whitespace-pre-wrap text-foreground/80 max-h-[380px] overflow-y-auto">
                {description}
              </p>
            </div>
            <div className="relative rounded-lg border border-primary/40 bg-primary/[0.04] p-3">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-primary mb-2">AI suggestion</div>
              {isSamplePreview && (
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-[0.08] select-none">
                  <span className="text-6xl font-black rotate-[-18deg] tracking-widest">SAMPLE</span>
                </div>
              )}
              <p className="text-sm whitespace-pre-wrap text-foreground max-h-[380px] overflow-y-auto relative">
                {previewText}
              </p>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => setPreviewOpen(false)}>
              Keep my draft
            </Button>
            {!isSamplePreview && (
              <Button variant="outline" onClick={() => { setPreviewOpen(false); void run(); }} className="gap-1.5">
                <RefreshCw className="w-4 h-4" /> Regenerate
              </Button>
            )}
            {isSamplePreview ? (
              <Button
                onClick={() => {
                  setPreviewOpen(false);
                  showUpsell('ai-description', 'listing_wizard_ai_sample');
                }}
                className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-black font-semibold"
              >
                Upgrade to apply
              </Button>
            ) : (
              <Button onClick={handleUseThis} className="gap-1.5">
                <Check className="w-4 h-4" /> Use this
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {overlay}
    </>
  );
};

export default AIOptimizeButton;
