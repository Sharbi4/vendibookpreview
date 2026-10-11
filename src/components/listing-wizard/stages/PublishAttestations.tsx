import React from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';

export type AttestationKey =
  | 'ownership'
  | 'accuracy'
  | 'condition'
  | 'marketplace_rules'
  | 'electronic_consent';

export const ATTESTATIONS: { key: AttestationKey; text: string }[] = [
  {
    key: 'ownership',
    text: 'I own this equipment or have authority from the owner to list it for this transaction.',
  },
  {
    key: 'accuracy',
    text: 'The information and photos in this listing are accurate and show the actual item being offered.',
  },
  {
    key: 'condition',
    text: 'I have disclosed the known condition, including any problems, repairs or approvals still needed.',
  },
  {
    key: 'marketplace_rules',
    text: 'I agree to the VendiBook marketplace rules, including the prohibition on misleading listings.',
  },
  {
    key: 'electronic_consent',
    text: 'I consent to do business electronically and to sign this listing agreement electronically.',
  },
];

export interface PublishAttestationsProps {
  value: Record<AttestationKey, boolean>;
  onChange: (key: AttestationKey, checked: boolean) => void;
  className?: string;
}

export function emptyAttestations(): Record<AttestationKey, boolean> {
  return {
    ownership: false,
    accuracy: false,
    condition: false,
    marketplace_rules: false,
    electronic_consent: false,
  };
}

export function allAttested(value: Record<AttestationKey, boolean>): boolean {
  return ATTESTATIONS.every((a) => value[a.key]);
}

/**
 * The exact acceptance wording recorded with the publish consent. Shared by
 * the step-by-step wizard's ConsentModal and the List with Vendi chat gate so
 * both flows attest to identical language.
 */
export function publishAcceptanceText(mode: 'rent' | 'sale' | string | null | undefined): string {
  return mode === 'rent'
    ? "I agree to VendiBook's Host / Renter Terms and confirm this listing accurately represents my asset."
    : "I agree to VendiBook's Seller Terms and confirm this listing accurately represents my asset.";
}


/**
 * Stage 6 attestations. Always rendered unchecked — never pre-selected — and
 * recorded through the existing versioned agreement logging on publish.
 */
export const PublishAttestations: React.FC<PublishAttestationsProps> = ({
  value,
  onChange,
  className,
}) => (
  <fieldset className={cn('space-y-3 rounded-xl border border-border bg-card/40 p-4', className)}>
    <legend className="px-1 text-sm font-semibold">Before you publish</legend>
    {ATTESTATIONS.map((a) => (
      <label key={a.key} className="flex items-start gap-3 text-sm leading-relaxed">
        <Checkbox
          className="mt-0.5"
          checked={value[a.key]}
          onCheckedChange={(c) => onChange(a.key, c === true)}
          aria-label={a.text}
        />
        <span>{a.text}</span>
      </label>
    ))}
  </fieldset>
);

export default PublishAttestations;
