import { EQUINOX_APPLY_URL } from '@/lib/financing/disclosure';

/** Official APPROVE creative, directly below the application button. */
export function ApproveListingBanner() {
  return (
    <a href={EQUINOX_APPLY_URL} target="_blank" rel="noopener noreferrer"
      aria-label="Apply for financing with APPROVE — opens in a new tab"
      className="mx-auto block w-full max-w-[728px] overflow-hidden rounded-lg shadow-lg ring-1 ring-black/10 transition-shadow hover:shadow-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600">
      <img src="/images/partners/approve-financing-horizontal.png" width={728} height={90}
        alt="Fast, flexible financing available. Learn more with APPROVE."
        loading="lazy" className="block h-auto w-full" />
    </a>
  );
}
