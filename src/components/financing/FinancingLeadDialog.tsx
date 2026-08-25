import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export interface FinancingLeadValues {
  name: string;
  email: string;
}

interface FinancingLeadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Submitted with details, or skipped entirely (values === null). */
  onContinue: (values: FinancingLeadValues | null) => void;
  submitting?: boolean;
}

/**
 * Lightweight pre-handoff capture for signed-out buyers.
 *
 * This must never block the handoff: "Continue without signing in" is always
 * available and goes straight to the financing partner.
 */
export const FinancingLeadDialog = ({
  open,
  onOpenChange,
  onContinue,
  submitting = false,
}: FinancingLeadDialogProps) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [touched, setTouched] = useState(false);

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (!emailValid) return;
    onContinue({ name: name.trim(), email: email.trim() });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Before we hand you off</DialogTitle>
          <DialogDescription>
            So we can follow up and help with your purchase. Your application itself is completed
            with Equinox Funding.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="financing-lead-name">Name</Label>
            <Input
              id="financing-lead-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              autoComplete="name"
              className="text-base"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="financing-lead-email">Email</Label>
            <Input
              id="financing-lead-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              className="text-base"
            />
            {touched && !emailValid && (
              <p className="text-xs text-destructive">Enter a valid email address.</p>
            )}
          </div>

          <div className="flex flex-col gap-2 pt-1">
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Continue to Equinox Funding
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="w-full text-muted-foreground"
              disabled={submitting}
              onClick={() => onContinue(null)}
            >
              Continue without signing in
            </Button>
          </div>
        </form>

        <p className="text-[11px] leading-relaxed text-muted-foreground/80">
          Vendibook is not a lender. Financing is subject to Equinox Funding and/or its funding
          providers&rsquo; approval and terms.
        </p>
      </DialogContent>
    </Dialog>
  );
};

export default FinancingLeadDialog;
