import { useEffect, useState } from 'react';
import { Link2, Ruler, Plug, Truck, Weight, Info } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Towing & handoff facts for a mobile rental (food truck / trailer).
 *
 * Explicit facts only: every value is host-provided, either as a first-class
 * listing column (hitch ball size / coupler / plug / tow vehicle) or from the
 * listing's saved spec sheet. Nothing is inferred and no safety rating is
 * invented — anything the host has not answered renders as "Ask host".
 */

interface TowingHandoffPanelProps {
  listingId: string;
  category?: string | null;
  /** First-class handoff columns from `listings`. */
  hitchBallSize?: string | null;
  couplerType?: string | null;
  trailerPlugType?: string | null;
  renterProvidesTowVehicle?: boolean | null;
  towVehicleRequirement?: string | null;
  pickupInstructions?: string | null;
  returnInstructions?: string | null;
}

type Json = Record<string, unknown>;

const str = (v: unknown): string | null => {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  if (!s || /^not sure$/i.test(s)) return null;
  return s;
};

const num = (v: unknown): string | null => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? String(n) : null;
};

const ASK_HOST = 'Ask host';

const TowingHandoffPanel = ({
  listingId,
  category,
  hitchBallSize,
  couplerType,
  trailerPlugType,
  renterProvidesTowVehicle,
  towVehicleRequirement,
  pickupInstructions,
  returnInstructions,
}: TowingHandoffPanelProps) => {
  const [trailer, setTrailer] = useState<Json>({});
  const [dimensions, setDimensions] = useState<Json>({});

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('listing_specs')
        .select('trailer, dimensions')
        .eq('listing_id', listingId)
        .maybeSingle();
      if (cancelled || !data) return;
      setTrailer((data.trailer as Json) ?? {});
      setDimensions((data.dimensions as Json) ?? {});
    })();
    return () => {
      cancelled = true;
    };
  }, [listingId]);

  const isTrailer = category === 'food_trailer';

  const coupler = str(couplerType) ?? str(trailer.hitch_type);
  const ball = str(hitchBallSize) ?? str(trailer.ball_size);
  const plug = str(trailerPlugType) ?? str(trailer.connector);
  const gvwr = num(trailer.gvwr_lbs);
  const dryWeight = num(trailer.dry_weight_lbs);
  const length = num(trailer.length_ft) ?? num(dimensions.overall_length_ft);
  const width = num(trailer.width_ft) ?? num(dimensions.width_ft);
  const height = num(dimensions.height_ft) ?? num(trailer.interior_height_ft);
  const towCapacity = str(towVehicleRequirement) ?? str(trailer.recommended_tow_capacity);

  const size = [
    length ? `${length} ft long` : null,
    width ? `${width} ft wide` : null,
    height ? `${height} ft tall` : null,
  ].filter(Boolean).join(' · ');

  const weight = [
    dryWeight ? `${Number(dryWeight).toLocaleString()} lb dry` : null,
    gvwr ? `${Number(gvwr).toLocaleString()} lb GVWR` : null,
  ].filter(Boolean).join(' · ');

  const rows: { icon: typeof Link2; label: string; value: string | null }[] = [
    ...(isTrailer
      ? [
          { icon: Link2, label: 'Coupler / hitch type', value: coupler },
          { icon: Link2, label: 'Hitch ball size', value: ball },
          { icon: Plug, label: 'Trailer plug', value: plug },
        ]
      : []),
    { icon: Ruler, label: 'Size', value: size || null },
    { icon: Weight, label: 'Weight', value: weight || null },
    {
      icon: Truck,
      label: 'Tow vehicle',
      value:
        renterProvidesTowVehicle === true
          ? `You bring the tow vehicle${towCapacity ? ` — ${towCapacity}` : ''}`
          : renterProvidesTowVehicle === false
            ? 'Host tows or delivers'
            : towCapacity,
    },
  ];

  const instructions = [
    { label: 'Pickup instructions', value: str(pickupInstructions) },
    { label: 'Return instructions', value: str(returnInstructions) },
  ].filter((i) => i.value);

  return (
    <div className="rounded-xl border border-border bg-background p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Truck className="h-4 w-4 text-primary" />
        <h4 className="text-sm font-semibold text-foreground">Towing &amp; handoff</h4>
      </div>

      <dl className="divide-y divide-border/60">
        {rows.map(({ icon: Icon, label, value }) => (
          <div key={label} className="flex items-start justify-between gap-4 py-2">
            <dt className="flex items-center gap-2 text-sm text-muted-foreground">
              <Icon className="h-3.5 w-3.5" />
              {label}
            </dt>
            <dd
              className={
                value
                  ? 'text-sm font-medium text-foreground text-right'
                  : 'text-sm text-muted-foreground italic text-right'
              }
            >
              {value ?? ASK_HOST}
            </dd>
          </div>
        ))}
      </dl>

      {instructions.map((i) => (
        <div key={i.label} className="rounded-lg bg-muted/50 p-3">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{i.label}</p>
          <p className="mt-1 text-sm text-foreground whitespace-pre-line">{i.value}</p>
        </div>
      ))}

      <p className="flex items-start gap-2 text-xs text-muted-foreground">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        These details come from the host. Vendibook does not rate whether your vehicle can tow this
        safely — confirm your own vehicle&apos;s towing capacity and hitch before pickup, and message
        the host about anything marked &ldquo;{ASK_HOST}&rdquo;.
      </p>
    </div>
  );
};

export default TowingHandoffPanel;
