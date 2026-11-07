import { useEffect } from 'react';
import { APPROVE_LOADER_URL } from '@/lib/financing/approveFrame';
import { EQUINOX_APPLY_URL } from '@/lib/financing/disclosure';
import { isUsedCondition } from '@/lib/listings/condition';

/** APPROVE owns the embedded application and reveals its button when ready. */
export function ApproveApplicationButton({ listing }: {
  listing: { id: string; title?: string; price_sale?: number; condition?: string | null };
}) {
  useEffect(() => {
    if (!document.querySelector('approve-plugin')) {
      document.body.appendChild(document.createElement('approve-plugin'));
    }
    if (!document.querySelector('script[data-vendibook-approve]')) {
      const script = document.createElement('script');
      script.src = APPROVE_LOADER_URL;
      script.async = true;
      script.dataset.vendibookApprove = 'true';
      document.body.appendChild(script);
    }
  }, []);

  const type = listing.condition === 'new' ? 'new_product'
    : isUsedCondition(listing.condition) ? 'used_product' : undefined;
  const hasEquipment = !!type && Number(listing.price_sale) > 0;
  return <div className="flex flex-col gap-2 sm:col-span-2">
    <button
      key={listing.id}
      type="button"
      approve-function="embedded_app"
      approve-action={hasEquipment ? 'add_to_app' : 'open_app'}
      approve-model={hasEquipment ? listing.title : undefined}
      approve-price={hasEquipment ? String(listing.price_sale) : undefined}
      approve-qty={hasEquipment ? '1' : undefined}
      approve-item-type={type}
      style={{ display: 'none' }}
      className="finance-cta rounded-md px-4 py-3 text-sm font-semibold"
    >Apply with APPROVE</button>
    <a href={EQUINOX_APPLY_URL} target="_blank" rel="noopener noreferrer"
      className="finance-cta-outline rounded-md px-4 py-3 text-center text-sm font-semibold">
      Apply on APPROVE’s website
    </a>
  </div>;
}
