import { Link } from 'react-router-dom';
import {
  ShieldCheck,
  Lock,
  Zap,
  MapPin,
  FileText,
  HeadphonesIcon,
  Truck,
  Box,
  Building2,
  ExternalLink,
  ChevronRight,
} from 'lucide-react';
import ListingLocationMap from '@/components/listing-detail/ListingLocationMap';
import { SaleCard } from './SaleCard';

/* ------------------------------- Trust strip ------------------------------ */

const TrustItem = ({
  icon: Icon,
  title,
  sub,
}: { icon: any; title: string; sub: string }) => (
  <div className="flex flex-col items-start gap-2">
    <div className="w-9 h-9 rounded-full ring-1 flex items-center justify-center text-primary bg-primary/10 ring-primary/30">
      <Icon className="h-4 w-4" />
    </div>
    <div className="leading-tight">
      <div className="text-xs sm:text-sm font-semibold">{title}</div>
      <div className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">{sub}</div>
    </div>
  </div>
);

/** Premium glass trust strip — sits under the listing hero on the sale page. */
export const SaleTrustStrip = ({ className }: { className?: string }) => (
  <SaleCard variant="default" padding="md" className={className}>
    <div className="grid grid-cols-3 gap-3">
      <TrustItem icon={ShieldCheck} title="Verified Listing" sub="Reviewed for quality and authenticity" />
      <TrustItem icon={Lock} title="Secure Payments" sub="Your payment is safe with Vendibook" />
      <TrustItem icon={Zap} title="Responsive Seller" sub="Typically responds within 1 hour" />
    </div>
  </SaleCard>
);

/* --------------------------- Purchase protection -------------------------- */

const ProtectionCard = ({
  icon: Icon,
  title,
  body,
  tone,
}: { icon: any; title: string; body: string; tone: 'primary' | 'emerald' | 'blue' | 'amber' }) => {
  const toneCls: Record<string, string> = {
    primary: 'bg-primary/10 ring-primary/30 text-primary',
    emerald: 'bg-emerald-500/10 ring-emerald-500/30 text-emerald-400',
    blue: 'bg-blue-500/10 ring-blue-500/30 text-blue-400',
    amber: 'bg-amber-500/10 ring-amber-500/30 text-amber-400',
  };
  return (
    <SaleCard padding="md">
      <div className={`w-9 h-9 rounded-full ring-1 flex items-center justify-center mb-3 ${toneCls[tone]}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="text-sm font-semibold mb-1">{title}</div>
      <div className="text-xs text-muted-foreground leading-relaxed">{body}</div>
    </SaleCard>
  );
};

/** "Your purchase is protected" grid + all-sales-final safety notice. */
export const SaleProtectionSection = () => (
  <div className="space-y-4">
    <div>
      <h2 className="text-lg font-semibold mb-3">Your purchase is protected</h2>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
        <ProtectionCard icon={ShieldCheck} title="Verified Users" body="All users are verified to keep our marketplace safe." tone="emerald" />
        <ProtectionCard icon={Lock} title="Secure Payments" body="Your payment is protected with industry-standard encryption." tone="primary" />
        <ProtectionCard icon={FileText} title="Document Workflow" body="We help verify documents and important information." tone="blue" />
        <ProtectionCard icon={HeadphonesIcon} title="Dispute Support" body="Our team is here to help if something doesn't go as planned." tone="amber" />
      </div>
    </div>
    <SaleCard padding="md">
      <div className="flex items-start gap-3">
        <ShieldCheck className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
        <div>
          <div className="text-sm font-medium">
            All sales are final. Please review all details and ask questions before purchasing.
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            Your payment is only released to the seller once you confirm delivery or pickup.
          </div>
        </div>
      </div>
    </SaleCard>
  </div>
);

/* ------------------------------ Location card ----------------------------- */

interface SaleLocationCardProps {
  city?: string | null;
  state?: string | null;
  zipCode?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  mapHeight?: number;
}

/** Glass location card with approximate-area badge — never a broken map box. */
export const SaleLocationCard = ({ city, state, zipCode, latitude, longitude, mapHeight = 240 }: SaleLocationCardProps) => {
  const locationShort = [city, state].filter(Boolean).join(', ');
  if (!locationShort) return null;
  return (
    <SaleCard padding="lg" className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold inline-flex items-center gap-2">
          <MapPin className="h-4 w-4 text-emerald-400" />
          Location
        </h2>
        <span className="text-[11px] px-2 py-0.5 rounded-full bg-background/60 ring-hairline text-muted-foreground">
          Approximate area
        </span>
      </div>
      <div className="text-sm">{locationShort}{zipCode ? ` ${zipCode}` : ''}</div>
      <div className="text-xs text-muted-foreground">
        Exact location provided after purchase confirmation.
      </div>
      <div className="rounded-xl overflow-hidden ring-hairline" style={{ height: mapHeight }}>
        <ListingLocationMap
          address={null}
          city={city ?? null}
          state={state ?? null}
          zipCode={zipCode ?? null}
          latitude={latitude ?? null}
          longitude={longitude ?? null}
          className="h-full"
        />
      </div>
    </SaleCard>
  );
};

/* ------------------------------- Browse more ------------------------------ */

const BrowseRow = ({ to, icon: Icon, label }: { to: string; icon: any; label: string }) => (
  <Link
    to={to}
    className="flex items-center gap-3 px-4 py-3.5 hover:bg-white/[0.03] transition-colors"
  >
    <div className="shrink-0 w-8 h-8 rounded-lg bg-primary/10 ring-1 ring-primary/20 flex items-center justify-center">
      <Icon className="h-4 w-4 text-primary" />
    </div>
    <span className="flex-1 text-sm font-medium">{label}</span>
    <ChevronRight className="h-4 w-4 text-muted-foreground/60" />
  </Link>
);

const Divider = () => <div className="h-px bg-white/[0.05] mx-4" />;

/** Browse More on Vendibook — internal link card. */
export const SaleBrowseMore = () => (
  <div>
    <h2 className="text-lg font-semibold mb-3">Browse More on Vendibook</h2>
    <SaleCard padding="none">
      <BrowseRow to="/search?category=food_truck&mode=sale" icon={Truck} label="Food Trucks for Sale" />
      <Divider />
      <BrowseRow to="/search?category=food_truck&mode=rent" icon={Truck} label="Food Trucks for Rent" />
      <Divider />
      <BrowseRow to="/search?category=food_trailer&mode=sale" icon={Box} label="Food Trailers for Sale" />
      <Divider />
      <BrowseRow to="/search?category=food_trailer&mode=rent" icon={Box} label="Food Trailers for Rent" />
      <Divider />
      <BrowseRow to="/search?category=ghost_kitchen&mode=rent" icon={Building2} label="Shared Kitchens for Rent" />
      <Divider />
      <BrowseRow to="/search?category=vendor_space&mode=rent" icon={MapPin} label="Vendor Spaces for Rent" />
      <Divider />
      <BrowseRow to="/cities" icon={MapPin} label="Browse by City" />
      <Divider />
      <BrowseRow to="/how-it-works" icon={ExternalLink} label="How It Works" />
    </SaleCard>
  </div>
);
