import { useEffect, useState } from 'react';
import { getPayPalConfig } from '@/lib/paypalClient';

/** Independent of the Vendibook case flow; never creates a provider dispute. */
export default function PayPalResolutionLink() {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let current = true;
    getPayPalConfig().then(config => {
      if (current) setUrl(`https://www.${config.environment === 'sandbox' ? 'sandbox.' : ''}paypal.com/disputes/`);
    }).catch(() => { /* Do not route sandbox users to a guessed live environment. */ });
    return () => { current = false; };
  }, []);
  return <div className="mt-4 rounded-xl border border-border p-4 text-sm">
    <p className="font-medium">PayPal Resolution Center</p>
    <p className="mt-1 text-muted-foreground">You can contact PayPal independently. A Vendibook case does not open a PayPal dispute or change PayPal's deadlines. Check your PayPal account for eligibility and deadlines.</p>
    {url ? <a className="inline-block mt-3 underline underline-offset-4" href={url} target="_blank" rel="noopener noreferrer">Open PayPal Resolution Center ↗</a> : <p className="mt-2 text-muted-foreground">Open the Resolution Center from the PayPal account used for this payment.</p>}
  </div>;
}
