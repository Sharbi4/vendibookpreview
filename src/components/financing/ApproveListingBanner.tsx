import { EQUINOX_APPLY_URL } from '@/lib/financing/disclosure';

/** Official APPROVE creative, below the sale purchase module. */
export function ApproveListingBanner() {
  return (
    <a href={EQUINOX_APPLY_URL} target="_blank" rel="noopener noreferrer"
      aria-label="Apply for financing with APPROVE — opens in a new tab"
      className="mx-auto mt-5 block w-[250px] max-w-full overflow-hidden rounded-2xl shadow-lg ring-1 ring-black/10 transition-shadow hover:shadow-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600">
      <img src="/images/partners/approve-financing-square.png" width={250} height={250}
        alt="Fast, flexible financing available. Apply online, match with lenders and choose your best offer. APPROVE — Learn more."
        loading="lazy" className="block h-auto w-full" />
    </a>
  );
}
