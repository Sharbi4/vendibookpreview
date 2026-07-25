import { Search, FileSignature, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface CheckoutAddOn {
  id: string;
  title: string;
  description: string;
  priceLabel: string;
  icon: 'inspection' | 'notarization';
  eligible: boolean;
}

interface StepAddOnsProps {
  addOns: CheckoutAddOn[];
  selected: Record<string, boolean>;
  onToggle: (id: string, next: boolean) => void;
  onBack: () => void;
  onContinue: () => void;
  onSkip: () => void;
}

const iconFor = (i: CheckoutAddOn['icon']) => {
  switch (i) {
    case 'inspection': return Search;
    case 'notarization': return FileSignature;
  }
};

const StepAddOns = ({
  addOns,
  selected,
  onToggle,
  onBack,
  onContinue,
  onSkip,
}: StepAddOnsProps) => {
  const eligible = addOns.filter((a) => a.eligible);
  const nothing = eligible.length === 0;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-bold text-foreground">
          Anything to add?
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Optional protections and services. Skip anything you don't need — nothing
          is pre-selected.
        </p>
      </div>

      {nothing ? (
        <div className="rounded-xl border border-border/70 bg-muted/30 p-6 text-sm text-muted-foreground">
          No optional add-ons apply to this purchase. You can continue.
        </div>
      ) : (
        <div className="space-y-3">
          {eligible.map((addon) => {
            const Icon = iconFor(addon.icon);
            const isOn = !!selected[addon.id];
            return (
              <button
                key={addon.id}
                type="button"
                onClick={() => onToggle(addon.id, !isOn)}
                className={cn(
                  'w-full text-left rounded-xl p-4 flex gap-4 items-start transition-all',
                  isOn
                    ? 'border-2 border-primary bg-primary/[0.06]'
                    : 'border-[1.5px] border-border/70 bg-card hover:border-primary/50',
                )}
              >
                <div
                  className={cn(
                    'h-10 w-10 rounded-lg flex items-center justify-center shrink-0',
                    isOn ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground',
                  )}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-3">
                    <div className="font-semibold text-foreground">{addon.title}</div>
                    <div
                      className="text-sm font-semibold text-foreground shrink-0"
                      style={{ fontVariantNumeric: 'tabular-nums' }}
                    >
                      {addon.priceLabel}
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{addon.description}</p>
                </div>
                <div
                  className={cn(
                    'h-6 w-6 rounded-full border-[1.5px] flex items-center justify-center shrink-0',
                    isOn ? 'bg-primary border-primary text-primary-foreground' : 'border-border',
                  )}
                  aria-hidden
                >
                  {isOn && <Check className="h-3.5 w-3.5" />}
                </div>
              </button>
            );
          })}
        </div>
      )}

      <div className="flex flex-col-reverse sm:flex-row gap-3">
        <Button variant="outline" onClick={onBack} className="flex-1" size="lg">
          Back
        </Button>
        {nothing ? (
          <Button onClick={onContinue} className="flex-1" size="lg">
            Add your details
          </Button>
        ) : (
          <>
            <Button variant="ghost" onClick={onSkip} className="flex-1" size="lg">
              No thanks, continue
            </Button>
            <Button onClick={onContinue} className="flex-1" size="lg">
              Add your details
            </Button>
          </>
        )}
      </div>
    </div>
  );
};

export default StepAddOns;
