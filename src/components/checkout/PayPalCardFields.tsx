import { useEffect, useId, useRef, useState } from 'react';
import { CreditCard, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { loadPayPalSdk } from '@/lib/paypalClient';
import { parseEdgeError } from '@/lib/edgeErrors';
import type { PayPalCheckoutTarget } from './PayPalPaymentPanel';

type BillingAddress = {
  addressLine1: string; addressLine2: string; adminArea1: string;
  adminArea2: string; postalCode: string; countryCode: string;
};
const regionNames = new Intl.DisplayNames(['en'], { type: 'region' });
const countries = 'AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG UM US UY UZ VA VC VE VG VI VN VU WF WS YE YT ZA ZM ZW'
  .split(' ').map(code => ({ code, name: regionNames.of(code) || code })).sort((a, b) => a.name.localeCompare(b.name));
export function validCardBilling(address: BillingAddress): boolean {
  return !!address.addressLine1.trim() && !!address.adminArea2.trim() &&
    !!address.adminArea1.trim() && !!address.postalCode.trim() && countries.some(country => country.code === address.countryCode) &&
    (address.countryCode !== 'US' || /^\d{5}(-\d{4})?$/.test(address.postalCode.trim()));
}

interface Props {
  target: PayPalCheckoutTarget;
  createOrder: () => Promise<string>;
  onApprove: (orderId: string) => void;
}

/** PAN, expiry, CVV and cardholder name live only in PayPal-hosted iframes. */
export default function PayPalCardFields({ target, createOrder, onApprove }: Props) {
  const id = `pp-card-${useId().replace(/:/g, '')}`;
  const targetKey = JSON.stringify(target);
  const callbacks = useRef({ createOrder, onApprove });
  callbacks.current = { createOrder, onApprove };
  const cardForm = useRef<any>(null);
  const submitting = useRef(false);
  const alive = useRef(false);
  const [state, setState] = useState<'loading' | 'ready' | 'unavailable' | 'error'>('loading');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [billing, setBilling] = useState<BillingAddress>({
    addressLine1: '', addressLine2: '', adminArea1: '', adminArea2: '', postalCode: '', countryCode: 'US',
  });

  useEffect(() => {
    let cancelled = false;
    alive.current = true;
    const fields: any[] = [];
    setState('loading');
    setError(null);
    const reportError = () => {
      if (cancelled) return;
      // An SDK exception is not proof of a decline. Declines come from PayPal's server response.
      setError('Card details could not be approved. Check the highlighted fields and complete any bank verification, then try again.');
      submitting.current = false;
      setBusy(false);
    };
    void (async () => {
      const { data, error: availabilityError } = await supabase.functions.invoke('paypal-checkout-intent', {
        body: { ...JSON.parse(targetKey), card_fields: true },
      });
      if (cancelled) return;
      if (availabilityError) {
        const parsed = await parseEdgeError(availabilityError);
        throw new Error(parsed.message || 'Card checkout could not load.');
      }
      if (data?.card_fields_eligible !== true) { setState('unavailable'); return; }
      const paypal = await loadPayPalSdk({ merchantId: data.merchant_id, cardFields: true });
      if (cancelled) return;
      if (!paypal.CardFields) throw new Error('Card checkout could not load.');
      const form = paypal.CardFields({
        style: { input: { 'font-size': '16px', 'font-family': 'sans-serif', color: '#27231f' }, '.invalid': { color: '#b91c1c' } },
        createOrder: () => callbacks.current.createOrder(),
        onApprove: (approval: { orderID?: string }) => {
          if (cancelled) return;
          if (!approval.orderID) { reportError(); return; }
          // Approval only opens final review. This component never captures a payment.
          callbacks.current.onApprove(approval.orderID);
        },
        onError: reportError,
        onCancel: () => {
          if (cancelled) return;
          submitting.current = false;
          setBusy(false);
          setError('Card verification was cancelled. You can try again or choose another payment method.');
        },
      });
      cardForm.current = form;
      if (!form.isEligible()) { setState('unavailable'); return; }
      const definitions = [
        ['name', form.NameField({ placeholder: 'Full name on card' })],
        ['number', form.NumberField({ placeholder: 'Card number' })],
        ['expiry', form.ExpiryField({ placeholder: 'MM / YY' })],
        ['cvv', form.CVVField({ placeholder: 'Security code' })],
      ] as const;
      fields.push(...definitions.map(([, field]) => field));
      await Promise.all(definitions.map(([key, field]) => field.render(`#${id}-${key}`)));
      if (!cancelled) setState('ready');
    })().catch((failure: unknown) => {
      if (!cancelled) {
        setState('error');
        setError(failure instanceof Error ? failure.message : 'Card checkout could not load.');
      }
    });
    return () => {
      cancelled = true;
      alive.current = false;
      cardForm.current = null;
      submitting.current = false;
      fields.forEach(field => { try { void Promise.resolve(field.close?.()).catch(() => {}); } catch { /* already closed */ } });
    };
    // Callback identities, focus, billing input and parent renders must not reset the hosted fields.
  }, [targetKey, id, attempt]);

  const submit = async () => {
    if (submitting.current || state !== 'ready' || !cardForm.current) return;
    setError(null);
    if (!validCardBilling(billing)) {
      setError('Complete your billing street address, city, state or region, postal code and country.');
      return;
    }
    submitting.current = true;
    setBusy(true);
    try {
      const current = await cardForm.current.getState();
      if (!current.isFormValid || current.fields?.cardNameField?.isEmpty !== false) {
        setError('Check the cardholder name, card number, expiration date and security code.');
        return;
      }
      await cardForm.current.submit({ billingAddress: billing });
      // Resolution alone is not payment or approval; only onApprove advances the UI.
    } catch {
      if (alive.current) setError('Card details could not be approved. Check the highlighted fields and complete any bank verification, then try again.');
    } finally {
      submitting.current = false;
      if (alive.current) setBusy(false);
    }
  };

  if (state === 'unavailable') return null;
  const inputClass = 'mt-1.5 h-12 w-full rounded-xl border border-[#ded7ce] bg-white px-3 text-sm text-[#27231f] focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15';
  return (
    <section aria-label="Debit or credit card" aria-busy={busy || state === 'loading'} className="relative rounded-2xl border border-[#e5dfd7] bg-[#fffdf9] p-4 sm:p-5 space-y-4">
      <h3 className="flex items-center gap-2 text-sm font-semibold"><CreditCard className="h-4 w-4" />Debit or credit card</h3>
      {state === 'loading' ? <Loader2 aria-label="Loading card fields" className="mx-auto h-5 w-5 animate-spin" /> : null}
      <div className={state === 'ready' ? 'space-y-3' : 'absolute inset-x-4 top-12 invisible pointer-events-none'}>
        <div className="grid grid-cols-2 gap-3">
          {([['name', 'Name on card'], ['number', 'Card number'], ['expiry', 'Expiration date'], ['cvv', 'Security code']] as const).map(([key, label]) => (
            <div key={key} className={key === 'name' || key === 'number' ? 'col-span-2' : ''}>
              <p id={`${id}-${key}-label`} className="text-xs font-medium">{label}</p>
              <div id={`${id}-${key}`} aria-labelledby={`${id}-${key}-label`} className="mt-1.5 h-14 overflow-hidden rounded-xl border border-[#ded7ce] bg-white" />
            </div>
          ))}
        </div>
        <p className="pt-2 text-xs font-semibold">Billing address</p>
        {([
          ['addressLine1', 'Street address', 'billing address-line1'], ['addressLine2', 'Apartment or suite (optional)', 'billing address-line2'],
          ['adminArea2', 'City', 'billing address-level2'], ['adminArea1', 'State / region', 'billing address-level1'],
          ['postalCode', 'ZIP / postal code', 'billing postal-code'],
        ] as const).map(([key, label, autoComplete]) => (
          <label key={key} className="block text-xs font-medium">{label}
            <input autoComplete={autoComplete} value={billing[key]} disabled={busy} maxLength={300}
              onChange={event => setBilling(previous => ({ ...previous, [key]: event.target.value }))}
              className={inputClass} />
          </label>
        ))}
        <label className="block text-xs font-medium">Country
          <select autoComplete="billing country" value={billing.countryCode} disabled={busy} className={inputClass}
            onChange={event => setBilling(previous => ({ ...previous, countryCode: event.target.value }))}>
            {countries.map(country => <option key={country.code} value={country.code}>{country.name}</option>)}
          </select>
        </label>
        <button type="button" onClick={() => void submit()} disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-xl bg-cta-primary px-4 py-3.5 text-sm font-bold text-white shadow-cta-primary disabled:opacity-60">
          {busy ? <Loader2 aria-label="Checking card" className="h-4 w-4 animate-spin" /> : 'Continue to payment review'}
        </button>
        <p className="text-center text-xs text-muted-foreground">Review your total before submitting payment.</p>
      </div>
      {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
      {state === 'error' ? <button type="button" className="text-sm underline" onClick={() => setAttempt(value => value + 1)}>Reload card fields</button> : null}
    </section>
  );
}
