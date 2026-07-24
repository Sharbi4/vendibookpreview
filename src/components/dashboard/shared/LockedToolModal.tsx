import { Link } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Lock, ArrowRight, LucideIcon } from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  toolName: string;
  toolIcon: LucideIcon;
  toolDescription: string;
  requiredTier: 'starter' | 'pro' | 'premium';
  price?: string;
}

const tierCopy: Record<Props['requiredTier'], { label: string; blurb: string }> = {
  starter: { label: 'Starter', blurb: 'Unlocks 4 tools including PricePilot and Listing Studio.' },
  pro: { label: 'Pro', blurb: 'Everything in Starter, plus Marketing Studio, Concept Lab, and Market Radar.' },
  premium: { label: 'Premium', blurb: 'The full stack — BuildKit, blueprints, sourcing, and priority support.' },
};

/**
 * Locked tool card => explainer modal (what it does, which plan unlocks it,
 * one CTA to /pricing). Prevents silent redirects to the packages page.
 */
const LockedToolModal = ({
  open, onOpenChange, toolName, toolIcon: Icon, toolDescription, requiredTier, price,
}: Props) => {
  const tier = tierCopy[requiredTier];
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="mx-auto h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center mb-2">
            <Icon className="h-6 w-6 text-primary" />
          </div>
          <DialogTitle className="text-center">{toolName}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground text-center">{toolDescription}</p>

          <div className="rounded-md border border-border bg-muted/30 p-4">
            <div className="flex items-center gap-2 text-xs font-medium text-primary">
              <Lock className="h-3.5 w-3.5" />
              Included with {tier.label}
              {price && <span className="ml-auto text-foreground font-semibold">{price}</span>}
            </div>
            <p className="mt-2 text-xs text-muted-foreground leading-relaxed">{tier.blurb}</p>
          </div>
        </div>
        <DialogFooter className="sm:justify-between gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Not now</Button>
          <Button asChild>
            <Link to="/pricing">View packages <ArrowRight className="h-4 w-4 ml-1.5" /></Link>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default LockedToolModal;
