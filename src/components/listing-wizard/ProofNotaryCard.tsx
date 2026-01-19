import React from 'react';
import { Stamp, ShieldCheck, CheckCircle2, FileSignature, Clock } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';

interface ProofNotaryCardProps {
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
}

const PROOF_NOTARY_FEE = 45;

export const ProofNotaryCard: React.FC<ProofNotaryCardProps> = ({
  enabled,
  onEnabledChange,
}) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Stamp className="w-5 h-5 text-primary" />
        <h3 className="text-lg font-semibold">Proof Notary Add-On</h3>
        <Badge variant="secondary" className="ml-2 text-xs font-medium">
          Optional
        </Badge>
      </div>

      <div className={`rounded-xl border-2 p-4 transition-all ${
        enabled 
          ? 'border-primary bg-primary/5' 
          : 'border-border bg-card hover:border-primary/50'
      }`}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 space-y-3">
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-xl ${enabled ? 'bg-primary/20' : 'bg-muted'}`}>
                <FileSignature className={`w-5 h-5 ${enabled ? 'text-primary' : 'text-muted-foreground'}`} />
              </div>
              <div>
                <Label 
                  htmlFor="proof_notary_toggle" 
                  className="text-base font-semibold cursor-pointer"
                >
                  Notarized Sale Receipt
                </Label>
                <p className="text-sm text-muted-foreground">
                  Add legal protection with remote notarization
                </p>
              </div>
            </div>

            {/* Benefits */}
            <div className="grid sm:grid-cols-2 gap-2 mt-3">
              <div className="flex items-start gap-2 text-sm text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
                <span>Remote notarization (no appointment)</span>
              </div>
              <div className="flex items-start gap-2 text-sm text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
                <span>Verified signing process</span>
              </div>
              <div className="flex items-start gap-2 text-sm text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
                <span>Time-stamped audit trail</span>
              </div>
              <div className="flex items-start gap-2 text-sm text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
                <span>Extra confidence for buyers & lenders</span>
              </div>
            </div>

            {/* Price tag */}
            <div className="flex items-center gap-2 pt-2">
              <span className="text-2xl font-bold text-foreground">${PROOF_NOTARY_FEE}</span>
              <span className="text-sm text-muted-foreground">one-time fee</span>
            </div>

            {enabled && (
              <div className="flex items-start gap-2 p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-lg mt-2">
                <ShieldCheck className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
                <div className="text-sm text-emerald-700 dark:text-emerald-300">
                  <strong>You're protected.</strong> When the sale completes, both parties will receive a link to complete notarization online via Proof.
                </div>
              </div>
            )}
          </div>

          <Switch
            id="proof_notary_toggle"
            checked={enabled}
            onCheckedChange={onEnabledChange}
          />
        </div>

        {/* How it works - collapsed by default */}
        {enabled && (
          <div className="mt-4 pt-4 border-t border-border/50">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground mb-3">
              <Clock className="w-4 h-4" />
              How it works
            </div>
            <ol className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="bg-primary/20 text-primary rounded-full w-5 h-5 flex items-center justify-center text-xs font-semibold shrink-0">1</span>
                <span>Complete your sale through VendiBook</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="bg-primary/20 text-primary rounded-full w-5 h-5 flex items-center justify-center text-xs font-semibold shrink-0">2</span>
                <span>Both parties receive a Proof notarization link via email</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="bg-primary/20 text-primary rounded-full w-5 h-5 flex items-center justify-center text-xs font-semibold shrink-0">3</span>
                <span>Complete identity verification and sign remotely online</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="bg-primary/20 text-primary rounded-full w-5 h-5 flex items-center justify-center text-xs font-semibold shrink-0">4</span>
                <span>Receive your notarized sale receipt PDF instantly</span>
              </li>
            </ol>
          </div>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        Powered by <strong>Proof</strong> – the trusted leader in online notarization.
      </p>
    </div>
  );
};
