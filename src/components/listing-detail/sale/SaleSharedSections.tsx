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
  EyeOff,
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
      <TrustItem icon={ShieldCheck} title="Detailed Listing" sub="Specs, documents, and owner details in one place" />
      <TrustItem icon={Lock} title="PayPal Checkout" sub="Supported payments run through PayPal" />
      <TrustItem icon={Zap} title="Responsive Seller" sub="Typically responds within 1 hour" />
    </div>
  </SaleCard>
);

/* --------------------------- Purchase protection -------------------------- */

const ProtectionItem = ({
  icon: Icon,
  title,
  body,
}: { icon: any; title: string; body: string }) => (
  <div className="flex items-start gap-3">
    <Icon className="h-[18px] w-[18px] mt-0.5 shrink-0 text-muted-foreground" />
    <div>
      <div className="text-sm font-medium leading-tight">{title}</div>
      <div className="text-xs text-muted-foreground leading-relaxed mt-0.5">{body}</div>
    </div>
  </div>
);

/** Calm, compact "how we support your purchase" block — icon/text rows only. */
export const SaleProtectionSection = () => (
  <SaleCard padding="lg" className="space-y-4">
    <h2 className="text-lg font-semibold">Buying on Vendibook</h2>
    <div className="grid sm:grid-cols-2 gap-x-8 gap-y-4">
      <ProtectionItem
        icon={ShieldCheck}
        title="Identity verification"
        body="Sellers can verify their identity with Plaid and display a badge. Optional paid add-on."
      />
      <ProtectionItem
        icon={Lock}
        title="PayPal checkout"
        body="Supported payments are processed by PayPal, not handled on Vendibook."
      />
      <ProtectionItem
        icon={FileText}
        title="Document workflow"
        body="We help collect and organize the paperwork tied to your purchase."
      />
      <ProtectionItem
        icon={HeadphonesIcon}
        title="Dispute support"
        body="Our team is here to help if something doesn't go as planned."
      />
    </div>
    <div className="h-px bg-border/70" />
    <p className="text-xs text-muted-foreground leading-relaxed">
      All sales are final — review the details and ask questions before purchasing. Payment
      disputes are handled through PayPal&rsquo;s buyer protection process and Vendibook support.
    </p>
  </SaleCard>
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
        <h2 className="text-lg font-semibold">Location</h2>
        <span className="text-xs text-muted-foreground">Approximate area</span>
      </div>
      <div className="text-sm inline-flex items-center gap-1.5">
        <MapPin className="h-4 w-4 text-muted-foreground" />
        {locationShort}{zipCode ? ` ${zipCode}` : ''}
      </div>
      <div className="rounded-2xl overflow-hidden border border-border/70" style={{ height: mapHeight }}>
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
      <div className="flex items-start gap-2 text-xs text-muted-foreground">
        <EyeOff className="h-3.5 w-3.5 shrink-0 mt-0.5" />
        <span>
          Only city, state, and ZIP are shown publicly. The exact street address and pickup details
          stay private until your purchase is confirmed.
        </span>
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
