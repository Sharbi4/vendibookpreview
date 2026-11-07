import { ApproveFinancingLogo } from '@/components/brand/ProviderLogos';
import { useEffect } from 'react';
import { toast } from 'sonner';

const attachedApplications = new WeakSet<object>();
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
    let attempts = 0;
    const timer = window.setInterval(() => {
      const provider = (window as unknown as { kwipped_approve?: { embedded_app?: { app_reference?: { add_listener: (listener: (message: { action?: string }) => void) => void } } } }).kwipped_approve;
      const application = provider?.embedded_app?.app_reference;
      if (application && typeof application.add_listener === 'function') {
        window.clearInterval(timer);
        if (!attachedApplications.has(application)) {
          application.add_listener((message) => {
            if (message?.action === 'app_submitted') {
              toast.success(<>Application submitted to <ApproveFinancingLogo className="h-4" />. Watch for updates from your financing provider.</>);
            }
          });
          attachedApplications.add(application);
        }
      } else if (++attempts >= 300) {
        window.clearInterval(timer);
      }
    }, 100);
    return () => window.clearInterval(timer);
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
      className="approve-premium-cta"
    >Apply with <ApproveFinancingLogo className="mx-0.5 !h-[1em] !w-auto !px-0.5 !py-0 align-baseline" /></button>
    <a href={EQUINOX_APPLY_URL} target="_blank" rel="noopener noreferrer"
      className="approve-premium-cta">
      Apply on <ApproveFinancingLogo className="mx-0.5 !h-[1em] !w-auto !px-0.5 !py-0 align-baseline" />’s website
    </a>
  </div>;
}
