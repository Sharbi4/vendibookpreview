import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import type { PostalAddress } from '../../../supabase/functions/_shared/checkoutAddress';

export type { PostalAddress };
export const addressText = (address: PostalAddress) => [...address.addressLines, address.locality, address.administrativeArea, address.postalCode, address.regionCode].filter(Boolean).join(', ');
type Result = { decision: 'accept' | 'confirm' | 'fix'; formattedAddress: string; address: PostalAddress; coordinates: [number, number] | null };
interface Props {
  address: PostalAddress;
  onApproved: (value: string, storedAddress: PostalAddress, coordinates: [number, number] | null) => void;
  /** Apply only after the customer chooses the suggested correction; return the stored address. */
  onUseSuggestion: (result: Result) => PostalAddress;
  disabled?: boolean;
}

export default function CheckoutAddressCheck({ address, onApproved, onUseSuggestion, disabled }: Props) {
  const value = addressText(address);
  const latest = useRef(value); latest.current = value;
  const request = useRef(0);
  useEffect(() => () => { request.current++; }, []);
  const [checked, setChecked] = useState<{ value: string; result?: Result; unavailable?: boolean; approved?: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  const current = checked?.value === value ? checked : null;
  const approve = (storedAddress: PostalAddress, verified: boolean, coordinates: [number, number] | null = null) => {
    const approvedValue = addressText(storedAddress);
    setChecked({ value: approvedValue, approved: true, unavailable: !verified });
    onApproved(approvedValue, storedAddress, coordinates);
  };
  const check = async () => {
    const sequence = ++request.current;
    const submitted = value;
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke('validate-checkout-address', { body: { address } });
      if (sequence !== request.current || latest.current !== submitted) return;
      if (error || !['accept', 'confirm', 'fix'].includes(data?.decision)) setChecked({ value: submitted, unavailable: true });
      else if (data.decision === 'accept') approve(address, true, data.coordinates ?? null);
      else setChecked({ value: submitted, result: data });
    } catch {
      if (sequence === request.current && latest.current === submitted) setChecked({ value: submitted, unavailable: true });
    } finally { if (sequence === request.current) setBusy(false); }
  };
  return <div className="space-y-2 rounded-xl border border-border p-3 text-sm" aria-label="Google address check">
    <p className="text-xs text-muted-foreground">Check your address with Google before continuing.</p>
    {current?.approved ? <p role="status">{current.unavailable ? 'Using the address you confirmed. Google verification was unavailable.' : 'Address checked with Google.'}</p> : <>
      <Button type="button" variant="outline" disabled={disabled || busy || !address.addressLines.some(line => line.trim())} onClick={() => void check()}>{busy ? 'Checking address…' : 'Check address'}</Button>
      {current?.result?.decision === 'fix' && <p role="alert">Google could not confirm a complete address. Check the street number, apartment or suite, city and postal code, then try again.</p>}
      {current?.result?.decision === 'confirm' && <div>
        <p>Google suggests:</p><p className="font-medium">{current.result.formattedAddress}</p>
        <Button type="button" variant="outline" disabled={disabled} onClick={() => {
          const next = onUseSuggestion(current.result!);
          approve(next, true, current.result!.coordinates);
        }}>Use suggested address</Button>
        <p className="mt-1 text-xs text-muted-foreground">Review any apartment or suite details before accepting.</p>
      </div>}
      {current?.unavailable && <div>
        <p role="alert">Google address checking is unavailable. Retry, or carefully review your entered address.</p>
        <Button type="button" variant="outline" disabled={disabled} onClick={() => approve(address, false)}>I confirm my entered address</Button>
      </div>}
    </>}
  </div>;
}
