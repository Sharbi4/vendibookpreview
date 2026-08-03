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

interface Props {
  initialMethod?: PayoutMethod;
  isSaving?: boolean;
  onCancel?: () => void;
  onSubmit: (input: PayoutPreferenceInput) => void | Promise<void>;
}

/**
 * Collects a MANUAL payout preference. ACH numbers are posted straight to the
 * `payout-preference-save` edge function, which encrypts them server-side —
 * they are never written to a client-readable table and never logged.
 */
export default function PayoutMethodForm({
  initialMethod = 'paypal',
  isSaving,
  onCancel,
  onSubmit,
}: Props) {
  const [method, setMethod] = useState<PayoutMethod>(initialMethod);
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
    const input: PayoutPreferenceInput = { method };
    if (method === 'paypal') input.paypal_email = paypalEmail;
    if (method === 'venmo') {
      input.venmo_identifier_type = venmoType;
      input.venmo_identifier = venmoIdentifier;
    }
    if (method === 'cash_app') input.cash_app_cashtag = cashtag;
    if (method === 'ach') {
      input.ach_bank_name = bankName;
      input.ach_account_holder = accountHolder;
      input.ach_account_type = accountType;
      input.ach_routing_number = routing;
      input.ach_account_number = accountNumber;
    }
    void onSubmit(input);
  };

  return (
    <div className="space-y-4">
      <div>
        <Label className="text-xs">Payout method</Label>
        <Select value={method} onValueChange={(v) => setMethod(v as PayoutMethod)}>
          <SelectTrigger className="mt-1 text-base" aria-label="Payout method">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PAYOUT_METHODS.map((m) => (
              <SelectItem key={m} value={m}>{PAYOUT_METHOD_LABEL[m]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {method === 'paypal' && (
        <div>
          <Label htmlFor="payout-paypal-email" className="text-xs">PayPal email</Label>
          <Input
            id="payout-paypal-email" type="email" inputMode="email" placeholder="you@example.com"
            value={paypalEmail} onChange={(e) => setPaypalEmail(e.target.value)}
            className="mt-1 text-base"
          />
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
              <Input id="payout-holder" value={accountHolder} onChange={(e) => setAccountHolder(e.target.value)} className="mt-1 text-base" />
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
