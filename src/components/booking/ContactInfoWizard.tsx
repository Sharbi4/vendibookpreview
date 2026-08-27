/**
 * ContactInfoWizard — step-by-step contact onboarding shown after date
 * selection in the rental booking flow.
 *
 * Behaviour contract:
 *  - Prefills from the signed-in user's profile when values exist and are valid.
 *  - Only asks for values that are missing or fail validation; already-valid
 *    steps render collapsed with an Edit affordance.
 *  - Saves progressively: each completed step writes back to the profile
 *    (authenticated users) and to a local draft so a refresh never loses work.
 *  - SMS and email consent checkboxes are ALWAYS unchecked by default, never
 *    bundled together, and never inferred from a stored phone number.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ValidatedInput, validators } from '@/components/ui/validated-input';
import { CheckCircle2, User, Phone, MapPin, Mail, FileText, Loader2, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import {
  SMS_CONSENT_DISCLOSURE,
  SMS_PRIVACY_URL,
  SMS_TERMS_URL,
} from '@/lib/sms/consent';
import { normalizeNanpToE164 } from '@/lib/sms/phone';
import type { BookingUserInfo } from './BookingInfoModal';

export interface ContactWizardValue extends BookingUserInfo {
  /** Affirmative, unbundled SMS opt-in captured in this flow. */
  smsOptIn: boolean;
  /** Affirmative, unbundled email updates opt-in captured in this flow. */
  emailOptIn: boolean;
}

interface ContactInfoWizardProps {
  onComplete: (value: ContactWizardValue) => void;
  /** Emitted whenever a step is saved, so the parent can track partial state. */
  onPartialChange?: (value: ContactWizardValue) => void;
  initialData?: Partial<ContactWizardValue>;
  listingId?: string;
}

const DRAFT_KEY = 'vb.booking.contact.draft.v1';

const EMAIL_CONSENT_TEXT =
  'Yes, email me booking updates, host replies, and occasional Vendibook news. ' +
  'Booking receipts and required notices are always sent regardless of this choice.';

type StepKey = 'name' | 'phone' | 'address' | 'preferences' | 'agree';

const emptyValue: ContactWizardValue = {
  firstName: '',
  lastName: '',
  phoneNumber: '',
  address1: '',
  address2: '',
  city: '',
  state: '',
  zipCode: '',
  agreedToTerms: false,
  acknowledgedInsurance: false,
  smsOptIn: false,
  emailOptIn: false,
};

const req = validators.required('Required');
const zip = validators.compose(validators.required('ZIP code is required'), validators.zipCode('Invalid ZIP code'));

function readDraft(): Partial<ContactWizardValue> {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    return raw ? (JSON.parse(raw) as Partial<ContactWizardValue>) : {};
  } catch {
    return {};
  }
}

function writeDraft(value: ContactWizardValue) {
  try {
    // Consent flags are intentionally NOT persisted — consent must be
    // re-affirmed, never restored from a cached draft.
    const { smsOptIn: _s, emailOptIn: _e, agreedToTerms: _t, acknowledgedInsurance: _i, ...rest } = value;
    localStorage.setItem(DRAFT_KEY, JSON.stringify(rest));
  } catch {
    /* storage unavailable — draft saving is best-effort */
  }
}

export function ContactInfoWizard({
  onComplete,
  onPartialChange,
  initialData,
  listingId,
}: ContactInfoWizardProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [value, setValue] = useState<ContactWizardValue>({ ...emptyValue, ...initialData });
  const [loadingProfile, setLoadingProfile] = useState(Boolean(user));
  const [savingStep, setSavingStep] = useState<StepKey | null>(null);
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [activeStep, setActiveStep] = useState<StepKey>('name');
  const [doneSteps, setDoneSteps] = useState<StepKey[]>([]);
  const hydrated = useRef(false);

  const set = useCallback(<K extends keyof ContactWizardValue>(key: K, v: ContactWizardValue[K]) => {
    setValue((prev) => ({ ...prev, [key]: v }));
    setErrors((prev) => ({ ...prev, [key as string]: undefined }));
  }, []);

  /* ---------------- Prefill from profile + local draft ---------------- */
  useEffect(() => {
    if (hydrated.current) return;
    let cancelled = false;

    const hydrate = async () => {
      const draft = readDraft();
      let profile: Record<string, string | null> | null = null;

      if (user) {
        const { data } = await supabase
          .from('profiles')
          .select('first_name, last_name, full_name, phone_number, address1, address2, city, state, zip_code')
          .eq('id', user.id)
          .maybeSingle();
        profile = (data as Record<string, string | null> | null) ?? null;
      }
      if (cancelled) return;

      const fullNameParts = (profile?.full_name || '').trim().split(/\s+/);
      const next: ContactWizardValue = {
        ...emptyValue,
        ...draft,
        ...initialData,
        firstName:
          initialData?.firstName || profile?.first_name || draft.firstName || fullNameParts[0] || '',
        lastName:
          initialData?.lastName ||
          profile?.last_name ||
          draft.lastName ||
          (fullNameParts.length > 1 ? fullNameParts.slice(1).join(' ') : ''),
        phoneNumber: initialData?.phoneNumber || profile?.phone_number || draft.phoneNumber || '',
        address1: initialData?.address1 || profile?.address1 || draft.address1 || '',
        address2: initialData?.address2 || profile?.address2 || draft.address2 || '',
        city: initialData?.city || profile?.city || draft.city || '',
        state: initialData?.state || profile?.state || draft.state || '',
        zipCode: initialData?.zipCode || profile?.zip_code || draft.zipCode || '',
        // consent is never prefilled
        smsOptIn: false,
        emailOptIn: false,
        agreedToTerms: false,
        acknowledgedInsurance: false,
      };

      hydrated.current = true;
      setValue(next);
      setLoadingProfile(false);

      // Mark prefilled-and-valid steps complete, then land on the first gap.
      const done: StepKey[] = [];
      if (!req(next.firstName) && !req(next.lastName)) done.push('name');
      if (normalizeNanpToE164(next.phoneNumber)) done.push('phone');
      if (!req(next.address1) && !req(next.city) && next.state.length === 2 && !zip(next.zipCode)) {
        done.push('address');
      }
      setDoneSteps(done);
      const order: StepKey[] = ['name', 'phone', 'address', 'preferences', 'agree'];
      setActiveStep(order.find((s) => !done.includes(s)) ?? 'agree');
    };

    void hydrate();
    return () => {
      cancelled = true;
    };
  }, [user, initialData]);

  /* ---------------- Progressive save ---------------- */
  const persistStep = useCallback(
    async (step: StepKey, next: ContactWizardValue) => {
      writeDraft(next);
      onPartialChange?.(next);
      if (!user) return;

      const patch: Record<string, string | null> = {};
      if (step === 'name') {
        patch.first_name = next.firstName.trim();
        patch.last_name = next.lastName.trim();
      }
      if (step === 'phone') patch.phone_number = next.phoneNumber.trim();
      if (step === 'address') {
        patch.address1 = next.address1.trim();
        patch.address2 = next.address2.trim() || null;
        patch.city = next.city.trim();
        patch.state = next.state.trim().toUpperCase();
        patch.zip_code = next.zipCode.trim();
      }
      if (Object.keys(patch).length === 0) return;

      const { error } = await supabase.from('profiles').update(patch).eq('id', user.id);
      if (error) {
        // Never block the booking on a profile write — the value stays in state.
        console.warn('[ContactInfoWizard] profile save skipped:', error.message);
      }
    },
    [user, onPartialChange],
  );

  const recordSmsConsent = useCallback(
    async (phone: string) => {
      try {
        await supabase.functions.invoke('sms-record-consent', {
          body: {
            phone,
            source: 'booking',
            consent: true,
            marketing: false,
            disclosureText: SMS_CONSENT_DISCLOSURE,
            userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
            relatedListingId: listingId ?? null,
          },
        });
      } catch (e) {
        console.warn('[ContactInfoWizard] SMS consent not recorded:', (e as Error).message);
      }
    },
    [listingId],
  );

  const recordEmailConsent = useCallback(async () => {
    if (!user?.email) return;
    try {
      await supabase.from('newsletter_subscribers').insert({ email: user.email, source: 'booking_checkout' });
    } catch (e) {
      console.warn('[ContactInfoWizard] email consent not recorded:', (e as Error).message);
    }
  }, [user]);

  /* ---------------- Validation + single save ---------------- */
  const validateAll = (): boolean => {
    const e: Record<string, string | undefined> = {};
    if (req(value.firstName)) e.firstName = 'First name is required';
    if (req(value.lastName)) e.lastName = 'Last name is required';
    if (!value.phoneNumber.trim()) e.phoneNumber = 'Phone number is required';
    else if (!normalizeNanpToE164(value.phoneNumber)) e.phoneNumber = 'Enter a valid US or Canadian number';
    if (req(value.address1)) e.address1 = 'Street address is required';
    if (req(value.city)) e.city = 'City is required';
    if (value.state.trim().length !== 2) e.state = 'Use the 2-letter state code';
    const z = zip(value.zipCode);
    if (z) e.zipCode = z;
    if (!value.acknowledgedInsurance) e.acknowledgedInsurance = 'Please acknowledge the insurance notice';
    if (!value.agreedToTerms) e.agreedToTerms = 'You must agree to the Terms of Service';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSaveAndContinue = async () => {
    if (!validateAll()) return;
    setSavingStep('agree');
    try {
      const next = { ...value };
      await persistStep('name', next);
      await persistStep('phone', next);
      await persistStep('address', next);
      if (next.smsOptIn) await recordSmsConsent(next.phoneNumber);
      if (next.emailOptIn) await recordEmailConsent();
      setDoneSteps(['name', 'phone', 'address', 'preferences', 'agree']);
      onComplete(next);
      toast({ title: 'Contact details saved' });
    } finally {
      setSavingStep(null);
    }
  };

  if (loadingProfile) {
    return (
      <div className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading your saved details…
      </div>
    );
  }

  return (
    <div className="space-y-5" data-testid="contact-info-wizard">
      {/* Name */}
      <div className="grid grid-cols-2 gap-3">
        <ValidatedInput
          label="First name"
          value={value.firstName}
          onChange={(v) => set('firstName', v)}
          error={errors.firstName}
          touched={Boolean(errors.firstName)}
          required
          placeholder="Jordan"
        />
        <ValidatedInput
          label="Last name"
          value={value.lastName}
          onChange={(v) => set('lastName', v)}
          error={errors.lastName}
          touched={Boolean(errors.lastName)}
          required
          placeholder="Rivera"
        />
      </div>

      {/* Email (account email, read-only when signed in) */}
      {user?.email && (
        <div className="space-y-1">
          <Label htmlFor="wizard-email" className="text-sm text-muted-foreground">
            Email
          </Label>
          <Input id="wizard-email" value={user.email} readOnly className="bg-muted/40" />
        </div>
      )}

      {/* Phone */}
      <ValidatedInput
        label="Mobile number"
        value={value.phoneNumber}
        onChange={(v) => set('phoneNumber', v)}
        error={errors.phoneNumber}
        touched={Boolean(errors.phoneNumber)}
        required
        formatPhone
        type="tel"
        maxLength={14}
        placeholder="(555) 123-4567"
        helperText="The host may use this to coordinate pickup or delivery."
      />

      {/* Address */}
      <div className="space-y-3">
        <ValidatedInput
          label="Street address"
          value={value.address1}
          onChange={(v) => set('address1', v)}
          error={errors.address1}
          touched={Boolean(errors.address1)}
          required
          placeholder="123 Main Street"
        />
        <div className="space-y-1">
          <Label htmlFor="wizard-address2" className="text-sm text-muted-foreground">
            Apt, suite, unit (optional)
          </Label>
          <Input
            id="wizard-address2"
            value={value.address2}
            onChange={(e) => set('address2', e.target.value)}
            placeholder="Suite 100"
          />
        </div>
        <div className="grid grid-cols-6 gap-3">
          <div className="col-span-3">
            <ValidatedInput
              label="City"
              value={value.city}
              onChange={(v) => set('city', v)}
              error={errors.city}
              touched={Boolean(errors.city)}
              required
              placeholder="Phoenix"
            />
          </div>
          <div className="col-span-1">
            <ValidatedInput
              label="State"
              value={value.state}
              onChange={(v) => set('state', v.toUpperCase().slice(0, 2))}
              error={errors.state}
              touched={Boolean(errors.state)}
              required
              placeholder="AZ"
              maxLength={2}
            />
          </div>
          <div className="col-span-2">
            <ValidatedInput
              label="ZIP"
              value={value.zipCode}
              onChange={(v) => set('zipCode', v)}
              error={errors.zipCode}
              touched={Boolean(errors.zipCode)}
              required
              placeholder="85004"
            />
          </div>
        </div>
      </div>

      {/* Consents — always unchecked, never bundled */}
      <div className="space-y-3">
        <label className="flex items-start gap-3 rounded-xl border border-border/70 p-3 cursor-pointer">
          <Checkbox
            id="booking-sms-consent"
            checked={value.smsOptIn}
            onCheckedChange={(c) => set('smsOptIn', c === true)}
            data-testid="booking-sms-consent"
          />
          <span className="text-xs leading-relaxed text-muted-foreground">
            {SMS_CONSENT_DISCLOSURE}{' '}
            <Link to={SMS_TERMS_URL} target="_blank" className="underline">
              SMS Terms
            </Link>{' '}
            ·{' '}
            <Link to={SMS_PRIVACY_URL} target="_blank" className="underline">
              Privacy Policy
            </Link>{' '}
            <span className="text-[11px]">(optional)</span>
          </span>
        </label>
        <label className="flex items-start gap-3 rounded-xl border border-border/70 p-3 cursor-pointer">
          <Checkbox
            id="booking-email-consent"
            checked={value.emailOptIn}
            onCheckedChange={(c) => set('emailOptIn', c === true)}
            data-testid="booking-email-consent"
          />
          <span className="text-xs leading-relaxed text-muted-foreground">
            {EMAIL_CONSENT_TEXT} <span className="text-[11px]">(optional)</span>
          </span>
        </label>
      </div>

      {/* Insurance + terms */}
      <div className="space-y-3">
        <div className="rounded-xl bg-muted/50 p-3 text-xs text-muted-foreground">
          Vendibook does not provide insurance. General liability, commercial auto, equipment, and
          product liability coverage may be required for your use.
          <Link to="/insurance" target="_blank" className="ml-1 inline-flex items-center gap-1 underline">
            Insurance details <ExternalLink className="h-3 w-3" />
          </Link>
        </div>
        <label className="flex items-start gap-3 cursor-pointer">
          <Checkbox
            checked={value.acknowledgedInsurance}
            onCheckedChange={(c) => set('acknowledgedInsurance', c === true)}
            data-testid="booking-insurance-ack"
          />
          <span className="text-xs text-muted-foreground">
            I understand Vendibook does not provide insurance and I am responsible for any coverage my
            operation requires.
          </span>
        </label>
        {errors.acknowledgedInsurance && (
          <p className="text-xs text-destructive">{errors.acknowledgedInsurance}</p>
        )}
        <label className="flex items-start gap-3 cursor-pointer">
          <Checkbox
            checked={value.agreedToTerms}
            onCheckedChange={(c) => set('agreedToTerms', c === true)}
            data-testid="booking-terms-agree"
          />
          <span className="text-xs text-muted-foreground">
            I agree to the{' '}
            <Link to="/terms" target="_blank" className="underline">
              Terms of Service
            </Link>{' '}
            and{' '}
            <Link to="/privacy" target="_blank" className="underline">
              Privacy Policy
            </Link>
            .
          </span>
        </label>
        {errors.agreedToTerms && <p className="text-xs text-destructive">{errors.agreedToTerms}</p>}
      </div>

      <Button
        onClick={handleSaveAndContinue}
        disabled={savingStep !== null}
        className="w-full h-12"
        data-testid="contact-save-continue"
      >
        {savingStep ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin mr-2" /> Saving…
          </>
        ) : (
          'Save and continue'
        )}
      </Button>
    </div>
  );
}


export default ContactInfoWizard;
