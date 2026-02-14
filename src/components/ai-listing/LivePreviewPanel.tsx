import React from 'react';
import { ImagePlus, MapPin, Clock, Shield, Zap, Calendar, Ruler } from 'lucide-react';
import { motion } from 'framer-motion';

export interface ListingPreview {
  title: string | null;
  description: string | null;
  category: string | null;
  mode: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  price_daily?: number | null;
  price_weekly?: number | null;
  price_monthly?: number | null;
  price_hourly?: number | null;
  price_sale?: number | null;
  amenities?: string[];
  fulfillment_type?: string | null;
  length_inches?: number | null;
  width_inches?: number | null;
  height_inches?: number | null;
  weight_lbs?: number | null;
  highlights?: string[];
  instant_book?: boolean | null;
  deposit_amount?: number | null;
  available_from?: string | null;
  available_to?: string | null;
  operating_hours_start?: string | null;
  operating_hours_end?: string | null;
  subcategory?: string | null;
  total_slots?: number | null;
  slot_names?: string[];
}

const CATEGORY_LABELS: Record<string, string> = {
  food_truck: 'Food Truck',
  food_trailer: 'Food Trailer',
  ghost_kitchen: 'Commercial Kitchen',
  vendor_lot: 'Vendor Lot',
  vendor_space: 'Vendor Space',
};

const FieldPlaceholder: React.FC<{ label: string; filled: boolean }> = ({ label, filled }) => (
  <div className={`flex items-center gap-2 text-xs px-2 py-1 rounded-md transition-all ${
    filled ? 'bg-green-500/10 text-green-600 dark:text-green-400' : 'bg-muted text-muted-foreground'
  }`}>
    <div className={`w-1.5 h-1.5 rounded-full ${filled ? 'bg-green-500' : 'bg-muted-foreground/30'}`} />
    {label}
  </div>
);

const LivePreviewPanel: React.FC<{ preview: ListingPreview | null; images: string[]; ready: boolean }> = ({
  preview,
  images,
  ready,
}) => {
  const p = preview;

  const fields = [
    { label: 'Category', filled: !!p?.category },
    { label: 'Rent / Sale', filled: !!p?.mode },
    { label: 'Title', filled: !!p?.title },
    { label: 'Location', filled: !!(p?.city || p?.address) },
    { label: 'Description', filled: !!p?.description },
    { label: 'Pricing', filled: !!(p?.price_daily || p?.price_sale || p?.price_hourly) },
    { label: 'Deposit & Booking', filled: p?.instant_book !== null && p?.instant_book !== undefined },
    { label: 'Availability', filled: !!(p?.available_from || p?.operating_hours_start) },
    { label: 'Photos', filled: images.length > 0 },
    { label: 'Amenities', filled: !!(p?.amenities && p.amenities.length > 0) },
    { label: 'Fulfillment', filled: !!p?.fulfillment_type },
    { label: 'Dimensions', filled: !!(p?.length_inches || p?.width_inches) },
  ];

  const filledCount = fields.filter(f => f.filled).length;
  const progress = Math.round((filledCount / fields.length) * 100);

  const price = p?.mode === 'sale'
    ? p?.price_sale ? `$${p.price_sale.toLocaleString()}` : null
    : p?.price_daily ? `$${p.price_daily}/day` : p?.price_hourly ? `$${p.price_hourly}/hr` : null;

  return (
    <div className="h-full flex flex-col">
      {/* Progress bar */}
      <div className="px-4 pt-4 pb-3">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold text-foreground">Live Preview</h2>
          <span className="text-xs text-muted-foreground font-medium">{progress}% complete</span>
        </div>
        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-primary rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
        </div>
      </div>

      {/* Preview card */}
      <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-4">
        <motion.div
          layout
          className={`rounded-2xl border overflow-hidden transition-all ${
            ready ? 'border-primary shadow-lg shadow-primary/10' : 'border-border'
          } bg-card`}
        >
          {/* Cover image */}
          {images.length > 0 ? (
            <div className="h-44 overflow-hidden">
              <img src={images[0]} alt="Listing" className="w-full h-full object-cover" />
            </div>
          ) : (
            <div className="h-32 bg-muted/50 flex items-center justify-center">
              <div className="text-center">
                <ImagePlus className="h-8 w-8 text-muted-foreground/30 mx-auto" />
                <p className="text-[10px] text-muted-foreground/40 mt-1">Photos will appear here</p>
              </div>
            </div>
          )}

          {/* Multiple photos strip */}
          {images.length > 1 && (
            <div className="flex gap-1 p-1 bg-muted/30">
              {images.slice(1, 5).map((url, i) => (
                <div key={i} className="w-14 h-10 rounded overflow-hidden flex-shrink-0">
                  <img src={url} alt="" className="w-full h-full object-cover" />
                </div>
              ))}
              {images.length > 5 && (
                <div className="w-14 h-10 rounded bg-muted flex items-center justify-center text-[10px] text-muted-foreground flex-shrink-0">
                  +{images.length - 5}
                </div>
              )}
            </div>
          )}

          <div className="p-4 space-y-3">
            {/* Category & Mode badges */}
            <div className="flex items-center gap-2 flex-wrap">
              {p?.category && (
                <span className="text-[10px] font-semibold uppercase tracking-wider text-primary">
                  {CATEGORY_LABELS[p.category] || p.category}
                </span>
              )}
              {p?.mode && (
                <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                  p.mode === 'sale' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                }`}>
                  {p.mode === 'sale' ? 'For Sale' : 'For Rent'}
                </span>
              )}
            </div>

            {/* Title */}
            {p?.title ? (
              <h3 className="text-base font-bold text-foreground leading-tight">{p.title}</h3>
            ) : (
              <div className="h-5 bg-muted/60 rounded w-3/4 animate-pulse" />
            )}

            {/* Price */}
            {price && (
              <p className="text-lg font-bold text-foreground">{price}</p>
            )}

            {/* Location */}
            {(p?.city || p?.address) && (
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <MapPin className="h-3.5 w-3.5" />
                <span>{p.city}{p.state ? `, ${p.state}` : ''}</span>
              </div>
            )}

            {/* Description */}
            {p?.description ? (
              <p className="text-xs text-muted-foreground line-clamp-4 leading-relaxed">{p.description}</p>
            ) : (
              <div className="space-y-1.5">
                <div className="h-3 bg-muted/40 rounded w-full" />
                <div className="h-3 bg-muted/40 rounded w-5/6" />
              </div>
            )}

            {/* Pricing breakdown */}
            {p?.mode === 'rent' && (p?.price_daily || p?.price_weekly || p?.price_monthly || p?.price_hourly) && (
              <div className="flex flex-wrap gap-2 pt-1">
                {p.price_hourly && <span className="text-[10px] px-2 py-1 rounded-md bg-muted font-medium">${p.price_hourly}/hr</span>}
                {p.price_daily && <span className="text-[10px] px-2 py-1 rounded-md bg-muted font-medium">${p.price_daily}/day</span>}
                {p.price_weekly && <span className="text-[10px] px-2 py-1 rounded-md bg-muted font-medium">${p.price_weekly}/wk</span>}
                {p.price_monthly && <span className="text-[10px] px-2 py-1 rounded-md bg-muted font-medium">${p.price_monthly}/mo</span>}
              </div>
            )}

            {/* Highlights */}
            {p?.highlights && p.highlights.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {p.highlights.map((h, i) => (
                  <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                    {h}
                  </span>
                ))}
              </div>
            )}

            {/* Feature chips */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {p?.instant_book && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 flex items-center gap-1">
                  <Zap className="h-2.5 w-2.5" /> Instant Book
                </span>
              )}
              {p?.deposit_amount && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 flex items-center gap-1">
                  <Shield className="h-2.5 w-2.5" /> ${p.deposit_amount} deposit
                </span>
              )}
              {p?.operating_hours_start && p?.operating_hours_end && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground flex items-center gap-1">
                  <Clock className="h-2.5 w-2.5" /> {p.operating_hours_start}–{p.operating_hours_end}
                </span>
              )}
              {p?.available_from && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground flex items-center gap-1">
                  <Calendar className="h-2.5 w-2.5" /> From {p.available_from}
                </span>
              )}
              {(p?.length_inches || p?.width_inches) && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground flex items-center gap-1">
                  <Ruler className="h-2.5 w-2.5" />
                  {p.length_inches ? `${Math.round(p.length_inches / 12)}'` : ''}
                  {p.width_inches ? ` × ${Math.round(p.width_inches / 12)}'` : ''}
                  {p.weight_lbs ? ` • ${p.weight_lbs.toLocaleString()} lbs` : ''}
                </span>
              )}
            </div>

            {/* Amenities */}
            {p?.amenities && p.amenities.length > 0 && (
              <div className="flex flex-wrap gap-1 pt-1">
                {p.amenities.slice(0, 8).map((a, i) => (
                  <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                    {a}
                  </span>
                ))}
                {p.amenities.length > 8 && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                    +{p.amenities.length - 8} more
                  </span>
                )}
              </div>
            )}

            {/* Fulfillment */}
            {p?.fulfillment_type && (
              <p className="text-[10px] text-muted-foreground pt-1">
                📦 {p.fulfillment_type === 'pickup' ? 'Pickup only' : p.fulfillment_type === 'delivery' ? 'Delivery available' : p.fulfillment_type === 'both' ? 'Pickup & Delivery' : 'On-site access'}
              </p>
            )}
          </div>
        </motion.div>

        {/* Field checklist */}
        <div className="space-y-1.5">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Fields</h3>
          <div className="flex flex-wrap gap-1.5">
            {fields.map((f, i) => (
              <FieldPlaceholder key={i} label={f.label} filled={f.filled} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LivePreviewPanel;
