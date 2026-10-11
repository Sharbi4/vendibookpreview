import { Link } from 'react-router-dom';
import { Crown, ArrowRight } from 'lucide-react';
import { isListingFeatured } from '@/lib/featured';
import { canBoostListing } from '@/lib/listings/publicVisibility';

export default function FeaturedPromotionBanner({ listings }: { listings: any[] }) {
  const eligible = listings.filter(l => canBoostListing(l) && !isListingFeatured(l));
  const active = listings.filter(l => isListingFeatured(l)).length;
  return (
    <section aria-label="Featured listing promotion" className="relative overflow-hidden rounded-3xl border border-amber-200 bg-gradient-to-br from-[#fffdf7] via-[#fff7e5] to-[#f6e5c0] p-6 shadow-[0_12px_36px_-18px_rgba(180,120,35,0.3)] sm:p-8">
      <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="max-w-xl space-y-3">
          <span className="featured-gold inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wider"><Crown className="h-3.5 w-3.5" aria-hidden="true" /> Featured on Vendibook</span>
          <h2 className="text-2xl font-semibold tracking-tight text-[#291e12]">Give your listing the spotlight.</h2>
          <p className="text-sm leading-relaxed text-[#69543a]">Stand out with a gold Featured badge and dedicated Featured placement. Choose a listing to review boost options and pricing.</p>
          {active > 0 && <p className="text-xs font-medium text-[#69543a]">{active} active Featured {active === 1 ? 'listing' : 'listings'}</p>}
        </div>
        <div className="flex shrink-0 flex-col items-start gap-3">
          <Link className="v2-btn" to={eligible.length === 1 ? `/dashboard/listings?boost=${eligible[0].id}` : '/dashboard/listings?status=published'}>{eligible.length ? 'Boost a listing' : 'View live listings'}<ArrowRight /></Link>
          <Link className="text-sm font-semibold text-[#69543a] underline underline-offset-4" to="/dashboard/listings?status=featured">My Featured listings</Link>
        </div>
      </div>
    </section>
  );
}
