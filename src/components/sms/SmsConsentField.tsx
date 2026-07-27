import React from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  SMS_CONSENT_DISCLOSURE,
  SMS_PRIVACY_URL,
  SMS_TERMS_URL,
} from '@/lib/sms/consent';

export interface SmsConsentFieldProps {
  phone: string;
  onPhoneChange: (v: string) => void;
  consent: boolean;
  onConsentChange: (v: boolean) => void;
  phoneLabel?: string;
  helperText?: string;
  showPhoneInput?: boolean;
  error?: string;
  testIdPrefix?: string;
}

/**
 * Reusable SMS consent block — a mobile-number field plus an unchecked,
 * unbundled consent checkbox with the full carrier-required disclosure.
 * Never preselect the checkbox; never wrap it inside another consent.
 */
export const SmsConsentField: React.FC<SmsConsentFieldProps> = ({
  phone,
  onPhoneChange,
  consent,
  onConsentChange,
  phoneLabel = 'Mobile number',
  helperText = 'Providing a mobile number does not automatically enroll you in SMS updates.',
  showPhoneInput = true,
  error,
  testIdPrefix = 'sms',
}) => {
  const inputId = `${testIdPrefix}-phone`;
  const cbId = `${testIdPrefix}-consent`;
  return (
    <div className="space-y-3">
      {showPhoneInput && (
        <div className="space-y-1.5">
          <Label htmlFor={inputId}>{phoneLabel}</Label>
          <Input
            id={inputId}
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="(555) 555-1234"
            value={phone}
            onChange={(e) => onPhoneChange(e.target.value)}
            data-testid={`${testIdPrefix}-phone-input`}
            style={{ fontSize: '16px' }}
          />
          <p className="text-xs text-muted-foreground">{helperText}</p>
        </div>
      )}
      <label
        htmlFor={cbId}
        className="flex items-start gap-3 cursor-pointer rounded-lg border border-border/60 bg-background/50 p-3"
      >
        <Checkbox
          id={cbId}
          checked={consent}
          onCheckedChange={(v) => onConsentChange(v === true)}
          data-testid={`${testIdPrefix}-consent-checkbox`}
          aria-describedby={`${cbId}-disclosure`}
        />
        <span
          id={`${cbId}-disclosure`}
          className="text-xs leading-relaxed text-muted-foreground"
        >
          {SMS_CONSENT_DISCLOSURE}{' '}
          <a
            href={SMS_TERMS_URL}
            target="_blank"
            rel="noreferrer"
            className="underline underline-offset-2 text-foreground hover:text-primary"
          >
            SMS Terms
          </a>{' '}
          and{' '}
          <a
            href={SMS_PRIVACY_URL}
            target="_blank"
            rel="noreferrer"
            className="underline underline-offset-2 text-foreground hover:text-primary"
          >
            Privacy Policy
          </a>
          .
        </span>
      </label>
      {error && (
        <p role="alert" className="text-xs text-destructive" data-testid={`${testIdPrefix}-error`}>
          {error}
        </p>
      )}
    </div>
  );
};

export default SmsConsentField;
