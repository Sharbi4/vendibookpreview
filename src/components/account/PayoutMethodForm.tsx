import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  PAYOUT_METHODS,
  PAYOUT_METHOD_LABEL,
  type PayoutMethod,
  type PayoutPreferenceInput,
  type VenmoIdentifierType,
} from '@/lib/payouts/methods';
import { PayoutBrandMark } from '@/components/payouts/PayoutBrandMark';
import { cn } from '@/lib/utils';

interface Props {
  initialMethod?: PayoutMethod;
  isSaving?: boolean;
  onCancel?: () => void;
  onSubmit: (input: PayoutPreferenceInput) => void | Promise<void>;
}

const METHOD_BLURB: Record<PayoutMethod, string> = {
  paypal: 'Paid to your PayPal email',
  venmo: 'Paid to your Venmo handle',
  cash_app: 'Paid to your $Cashtag',
  ach: 'Direct deposit to your bank',
};

/** Brand-tinted ring for the selected method tile. */
const METHOD_RING: Record<PayoutMethod, string> = {
  paypal: 'border-[#009CDE] shadow-[0_0_0_1px_#009CDE,0_0_24px_-8px_#009CDE]',
  venmo: 'border-[#008CFF] shadow-[0_0_0_1px_#008CFF,0_0_24px_-8px_#008CFF]',
  cash_app: 'border-[#00D64F] shadow-[0_0_0_1px_#00D64F,0_0_24px_-8px_#00D64F]',
  ach: 'border-foreground/40 shadow-[0_0_0_1px_hsl(var(--foreground)/0.35)]',
};

/**
 * Collects a MANUAL payout preference: the payee identity block every method
 * needs (name, email, phone, mailing address) plus the method-specific
 * destination. ACH numbers are posted straight to the `payout-preference-save`
 * edge function, which encrypts them server-side — they are never written to a
 * client-readable table and never logged.
 */
export default function PayoutMethodForm({
  initialMethod = 'paypal',
  isSaving,
  onCancel,
  onSubmit,
}: Props) {
  const [method, setMethod] = useState<PayoutMethod>(initialMethod);

  // Shared payee identity — required for every method.
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [line1, setLine1] = useState('');
  const [line2, setLine2] = useState('');
  const [city, setCity] = useState('');
  const [region, setRegion] = useState('');
  const [postal, setPostal] = useState('');

  const [paypalEmail, setPaypalEmail] = useState('');
  const [venmoType, setVenmoType] = useState<VenmoIdentifierType>('handle');
  const [venmoIdentifier, setVenmoIdentifier] = useState('');
  const [cashtag, setCashtag] = useState('');
  const [bankName, setBankName] = useState('');
  const [accountHolder, setAccountHolder] = useState('');
  const [accountType, setAccountType] = useState<'checking' | 'savings'>('checking');
  const [routing, setRouting] = useState('');
  const [accountNumber, setAccountNumber] = useState('');

  const submit = () => {
    const input: PayoutPreferenceInput = {
      method,
      payee_first_name: firstName,
      payee_last_name: lastName,
      contact_email: email,
      contact_phone: phone,
      address_line1: line1,
      address_line2: line2,
      address_city: city,
      address_region: region,
      address_postal_code: postal,
      address_country: 'US',
    };
    if (method === 'paypal') input.paypal_email = paypalEmail || email;
    if (method === 'venmo') {
      input.venmo_identifier_type = venmoType;
      input.venmo_identifier = venmoIdentifier;
    }
    if (method === 'cash_app') input.cash_app_cashtag = cashtag;
    if (method === 'ach') {
      input.ach_bank_name = bankName;
      input.ach_account_holder = accountHolder || `${firstName} ${lastName}`.trim();
      input.ach_account_type = accountType;
      input.ach_routing_number = routing;
      input.ach_account_number = accountNumber;
    }
    void onSubmit(input);
  };

  return (
    <div className="space-y-5">
      <div>
        <Label className="text-xs uppercase tracking-wide text-muted-foreground">
          How do you want to get paid?
        </Label>
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {PAYOUT_METHODS.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMethod(m)}
              aria-pressed={method === m}
              className={cn(
                'group flex flex-col items-start gap-2 rounded-xl border bg-card/60 p-3 text-left transition-all',
                'hover:border-foreground/30 hover:bg-card',
                method === m ? METHOD_RING[m] : 'border-border',
              )}
            >
              <PayoutBrandMark method={m} className="h-8 w-8" />
              <span className="text-sm font-semibold leading-none">{PAYOUT_METHOD_LABEL[m]}</span>
              <span className="text-[11px] leading-tight text-muted-foreground">
                {METHOD_BLURB[m]}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Payee identity — required for every payout method */}
      <div className="space-y-3 rounded-xl border border-border bg-card/40 p-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Payee details
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="payout-first" className="text-xs">First name</Label>
            <Input id="payout-first" autoComplete="given-name" value={firstName}
              onChange={(e) => setFirstName(e.target.value)} className="mt-1 text-base" />
          </div>
          <div>
            <Label htmlFor="payout-last" className="text-xs">Last name</Label>
            <Input id="payout-last" autoComplete="family-name" value={lastName}
              onChange={(e) => setLastName(e.target.value)} className="mt-1 text-base" />
          </div>
          <div>
            <Label htmlFor="payout-email" className="text-xs">Email</Label>
            <Input id="payout-email" type="email" inputMode="email" autoComplete="email"
              placeholder="you@example.com" value={email}
              onChange={(e) => setEmail(e.target.value)} className="mt-1 text-base" />
          </div>
          <div>
            <Label htmlFor="payout-phone" className="text-xs">Phone number</Label>
            <Input id="payout-phone" type="tel" inputMode="tel" autoComplete="tel"
              placeholder="(555) 555-1234" value={phone}
              onChange={(e) => setPhone(e.target.value)} className="mt-1 text-base" />
          </div>
        </div>
        <div>
          <Label htmlFor="payout-line1" className="text-xs">Street address</Label>
          <Input id="payout-line1" autoComplete="address-line1" value={line1}
            onChange={(e) => setLine1(e.target.value)} className="mt-1 text-base" />
        </div>
        <div>
          <Label htmlFor="payout-line2" className="text-xs">Apt, suite (optional)</Label>
          <Input id="payout-line2" autoComplete="address-line2" value={line2}
            onChange={(e) => setLine2(e.target.value)} className="mt-1 text-base" />
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <Label htmlFor="payout-city" className="text-xs">City</Label>
            <Input id="payout-city" autoComplete="address-level2" value={city}
              onChange={(e) => setCity(e.target.value)} className="mt-1 text-base" />
          </div>
          <div>
            <Label htmlFor="payout-region" className="text-xs">State</Label>
            <Input id="payout-region" autoComplete="address-level1" value={region}
              onChange={(e) => setRegion(e.target.value)} className="mt-1 text-base" />
          </div>
          <div>
            <Label htmlFor="payout-postal" className="text-xs">ZIP code</Label>
            <Input id="payout-postal" inputMode="numeric" autoComplete="postal-code" value={postal}
              onChange={(e) => setPostal(e.target.value)} className="mt-1 text-base" />
          </div>
        </div>
      </div>

      {method === 'paypal' && (
        <div>
          <Label htmlFor="payout-paypal-email" className="text-xs">PayPal email</Label>
          <Input
            id="payout-paypal-email" type="email" inputMode="email" placeholder="you@example.com"
            value={paypalEmail} onChange={(e) => setPaypalEmail(e.target.value)}
            className="mt-1 text-base"
          />
          <p className="mt-1 text-xs text-muted-foreground">
            Leave blank to use the email above.
          </p>
        </div>
      )}

      {method === 'venmo' && (
        <div className="grid gap-3 sm:grid-cols-[160px_1fr]">
          <div>
            <Label className="text-xs">Identifier type</Label>
            <Select value={venmoType} onValueChange={(v) => setVenmoType(v as VenmoIdentifierType)}>
              <SelectTrigger className="mt-1 text-base" aria-label="Venmo identifier type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="handle">@handle</SelectItem>
                <SelectItem value="phone">Phone</SelectItem>
                <SelectItem value="email">Email</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="payout-venmo" className="text-xs">Venmo {venmoType}</Label>
            <Input
              id="payout-venmo"
              placeholder={venmoType === 'handle' ? '@jane-doe' : venmoType === 'phone' ? '(555) 555-1234' : 'you@example.com'}
              value={venmoIdentifier} onChange={(e) => setVenmoIdentifier(e.target.value)}
              className="mt-1 text-base"
            />
          </div>
        </div>
      )}

      {method === 'cash_app' && (
        <div>
          <Label htmlFor="payout-cashtag" className="text-xs">$Cashtag</Label>
          <Input
            id="payout-cashtag" placeholder="$janedoe"
            value={cashtag} onChange={(e) => setCashtag(e.target.value)}
            className="mt-1 text-base"
          />
        </div>
      )}

      {method === 'ach' && (
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="payout-bank" className="text-xs">Bank name</Label>
              <Input id="payout-bank" value={bankName} onChange={(e) => setBankName(e.target.value)} className="mt-1 text-base" />
            </div>
            <div>
              <Label htmlFor="payout-holder" className="text-xs">Account holder</Label>
              <Input id="payout-holder" placeholder="Same as payee name" value={accountHolder} onChange={(e) => setAccountHolder(e.target.value)} className="mt-1 text-base" />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <Label className="text-xs">Account type</Label>
              <Select value={accountType} onValueChange={(v) => setAccountType(v as 'checking' | 'savings')}>
                <SelectTrigger className="mt-1 text-base" aria-label="Account type"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="checking">Checking</SelectItem>
                  <SelectItem value="savings">Savings</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="payout-routing" className="text-xs">Routing number</Label>
              <Input id="payout-routing" inputMode="numeric" autoComplete="off" value={routing} onChange={(e) => setRouting(e.target.value)} className="mt-1 text-base" />
            </div>
            <div>
              <Label htmlFor="payout-account" className="text-xs">Account number</Label>
              <Input id="payout-account" inputMode="numeric" autoComplete="off" value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} className="mt-1 text-base" />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Bank details are encrypted and stored securely for Vendibook operations only. Your
            browser only ever sees the bank name, account type and last four digits. ACH goes
            through a short manual verification before your first payout.
          </p>
        </div>
      )}

      <div className="flex gap-2">
        <Button size="sm" onClick={submit} disabled={isSaving}>
          {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
          Save payout preference
        </Button>
        {onCancel && (
          <Button size="sm" variant="ghost" onClick={onCancel} disabled={isSaving}>Cancel</Button>
        )}
      </div>
    </div>
  );
}
