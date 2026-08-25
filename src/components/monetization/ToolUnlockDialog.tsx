/**
 * ToolUnlockDialog — the unified gate/upsell overlay for premium tools.
 *
 * Renders the real ToolSamplePreview (what you get) on top of the
 * UnlockLadder (how to buy — cheapest first, best value marked). Used by
 * usePremiumUpsell(), the route-level ToolAccessGate, and the standalone
 * ToolPreview page.
 */
import * as React from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { useIsMobile } from '@/hooks/use-mobile';
import { getToolBySlug } from '@/lib/tools/catalog';
import { trackLeadEvent } from '@/lib/leadTracking';
import { ToolSamplePreview } from '@/components/tools/previews/ToolSamplePreview';
import { UnlockLadder } from './UnlockLadder';
import { cn } from '@/lib/utils';

export interface ToolUnlockDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  toolSlug: string;
  /** Analytics surface, e.g. "tool_gate", "wizard_ai", "premium_tab". */
  surface: string;
}

export function ToolUnlockDialog({ open, onOpenChange, toolSlug, surface }: ToolUnlockDialogProps) {
  const isMobile = useIsMobile();
  const tool = getToolBySlug(toolSlug);
  const openedRef = React.useRef(false);

  React.useEffect(() => {
    if (open && !openedRef.current) {
      openedRef.current = true;
      trackLeadEvent('tool_preview_viewed', { tool_slug: toolSlug, surface });
    }
    if (!open) openedRef.current = false;
  }, [open, toolSlug, surface]);

  // Parked tools (enabled: false in the catalog) never render an upsell.
  if (!tool || tool.enabled === false) return null;
  const Icon = tool.icon;

  const Body = (
    <div className="space-y-5">
      <header className="flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md border-[1.5px] border-orange-500/40 bg-orange-500/[0.08] text-orange-300">
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <h2 className="font-display text-2xl leading-tight text-foreground">
            {tool.name}
          </h2>
          <p className="text-sm text-foreground/75">{tool.tagline}</p>
        </div>
      </header>

      <section>
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          What you'll get
        </p>
        <ToolSamplePreview toolSlug={toolSlug} />
      </section>

      <section>
        <UnlockLadder
          toolSlug={toolSlug}
          surface={surface}
          headline="Choose how to unlock"
          onCheckoutStarted={() => onOpenChange(false)}
        />
      </section>
    </div>
  );

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="bottom"
          className="max-h-[92dvh] overflow-y-auto rounded-t-[20px] border-t-[1.5px] border-white/12 bg-[rgba(22,22,25,0.98)] p-5 backdrop-blur-xl"
        >
          <SheetTitle className="sr-only">Unlock {tool.name}</SheetTitle>
          <SheetDescription className="sr-only">{tool.tagline}</SheetDescription>
          {Body}
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          'max-w-2xl overflow-hidden rounded-[20px] border-[1.5px] border-white/12 bg-[rgba(22,22,25,0.98)] p-0 backdrop-blur-xl',
        )}
      >
        <DialogTitle className="sr-only">Unlock {tool.name}</DialogTitle>
        <DialogDescription className="sr-only">{tool.tagline}</DialogDescription>
        <div className="max-h-[88vh] overflow-y-auto p-6">{Body}</div>
      </DialogContent>
    </Dialog>
  );
}

export default ToolUnlockDialog;
