import React, { useEffect, useState } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { useAuth } from '@/contexts/AuthContext';
import { recordLegalAcceptance, hasCurrentAcceptance, type LegalRelatedEntityType } from '@/lib/legal/recordAcceptance';
import { getLegalDocument } from '@/lib/legal/versions';

const SLUGS = ['terms-of-service', 'payments-terms', 'privacy-policy'] as const;

type Props = {
  /** Called with true once the box is ticked and the acceptance is stored. */
  onChange: (accepted: boolean) => void;
  surface: string;
  relatedEntityType?: LegalRelatedEntityType;
  relatedEntityId?: string | null;
};

/**
 * The single required checkout acceptance. It sits above the pay button, is
 * never pre-ticked, and writes a versioned acceptance row. The matching
 * server-side gate lives in `create-sale-intent` and `paypal-create-order`, so
 * skipping this UI does not skip the acceptance.
 */
const CheckoutLegalConsent: React.FC<Props> = ({ onChange, surface, relatedEntityType, relatedEntityId }) => {
  const { user } = useAuth();
  const [checked, setChecked] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // A previously stored acceptance of the CURRENT versions still has to be
  // confirmed here, but we surface it so we do not write a duplicate row for
  // every attempt.
  const [alreadyOnFile, setAlreadyOnFile] = useState(false);
  useEffect(() => {
    let active = true;
    if (!user?.id) return;
    hasCurrentAcceptance(user.id, [...SLUGS]).then((ok) => {
      if (active) setAlreadyOnFile(ok);
    });
    return () => {
      active = false;
    };
  }, [user?.id]);

  const toggle = async (next: boolean) => {
    setChecked(next);
    setError(null);
    if (!next) {
      onChange(false);
      return;
    }
    if (!user?.id) {
      setError('Please sign in to continue.');
      setChecked(false);
      return;
    }
    if (alreadyOnFile) {
      onChange(true);
      return;
    }
    setSaving(true);
    const { error: writeError } = await recordLegalAcceptance({
      userId: user.id,
      slugs: [...SLUGS],
      surface,
      relatedEntityType: relatedEntityType ?? 'order',
      relatedEntityId: relatedEntityId ?? null,
    });
    setSaving(false);
    if (writeError) {
      setError("We couldn't record your agreement. Please try again.");
      setChecked(false);
      onChange(false);
      return;
    }
    setAlreadyOnFile(true);
    onChange(true);
  };

  const link = (slug: (typeof SLUGS)[number], label: string) => {
    const doc = getLegalDocument(slug);
    return (
      <a href={doc.route} target="_blank" rel="noreferrer" className="underline underline-offset-2">
        {label}
      </a>
    );
  };

  return (
    <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
      <label className="flex items-start gap-3 cursor-pointer">
        <Checkbox
          checked={checked}
          disabled={saving}
          onCheckedChange={(v) => void toggle(v === true)}
          aria-label="Agree to the Vendibook Terms of Service, Payments Terms, and Privacy Policy"
          className="mt-0.5"
        />
        <span className="text-sm leading-snug text-foreground">
          I agree to the Vendibook {link('terms-of-service', 'Terms of Service')},{' '}
          {link('payments-terms', 'Payments Terms')}, and {link('privacy-policy', 'Privacy Policy')}.
        </span>
      </label>
      {error ? <p className="mt-2 text-xs text-destructive">{error}</p> : null}
    </div>
  );
};

export default CheckoutLegalConsent;
