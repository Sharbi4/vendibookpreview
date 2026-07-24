import { useMemo, useState } from 'react';
import { Shield, Calculator, TrendingUp, TrendingDown } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import {
  computeProtectedSaleAmounts,
  formatCents,
  isProtectedSaleEligible,
  PROTECTED_SALE_MIN_PRICE_CENTS,
  PROTECTION_FEE_BPS,
  PROTECTION_FEE_MIN_CENTS,
  PROTECTION_FEE_MAX_CENTS,
} from '@/lib/protectedSale/fees';

interface Props {
  initialSalePriceCents?: number;
  className?: string;
  compact?: boolean;
}

/** Sale price at which the raw 4.9% fee equals the $499 floor. */
const FLOOR_BREAK_CENTS = Math.ceil((PROTECTION_FEE_MIN_CENTS * 10_000) / PROTECTION_FEE_BPS);
/** Sale price at which the raw 4.9% fee reaches the $3,000 ceiling. */
const CEILING_BREAK_CENTS = Math.floor((PROTECTION_FEE_MAX_CENTS * 10_000) / PROTECTION_FEE_BPS);

const SLIDER_MIN = 1_000_00;   // $1,000
const SLIDER_MAX = 100_000_00; // $100,000

export function ProtectedSaleFeeCalculator({
  initialSalePriceCents = 15_000_00,
  className = '',
  compact = false,
}: Props) {
  const [dollars, setDollars] = useState<string>(
    (Math.max(SLIDER_MIN, initialSalePriceCents) / 100).toString(),
  );

  const cents = useMemo(() => {
    const n = Number.parseFloat(dollars);
    if (!Number.isFinite(n) || n <= 0) return 0;
    return Math.round(n * 100);
  }, [dollars]);

  const eligible = isProtectedSaleEligible(cents);
  const amounts = eligible ? computeProtectedSaleAmounts(cents) : null;

  const rawFeeCents = Math.round((cents * PROTECTION_FEE_BPS) / 10_000);
  const feeBand: 'floor' | 'linear' | 'ceiling' | 'none' =
    !eligible ? 'none'
      : rawFeeCents <= PROTECTION_FEE_MIN_CENTS ? 'floor'
      : rawFeeCents >= PROTECTION_FEE_MAX_CENTS ? 'ceiling'
      : 'linear';

  const effectiveRate = amounts && cents > 0 ? (amounts.protectionFeeCents / cents) * 100 : 0;

  return (
    <div className={`rounded-2xl border border-white/10 bg-white/[0.03] p-5 ${className}`}>
      <div className="flex items-start gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-orange-500/15 text-orange-400">
          <Calculator className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <h3 className="text-base font-semibold text-white">Protected Sale fee preview</h3>
          <p className="mt-1 text-xs text-white/60">
            4.9% of the sale price, with a {formatCents(PROTECTION_FEE_MIN_CENTS)} minimum and{' '}
            {formatCents(PROTECTION_FEE_MAX_CENTS)} maximum.
          </p>
        </div>
      </div>

      {/* Price input */}
      <div className="mt-5">
        <label htmlFor="ps-calc-price" className="text-xs font-medium uppercase tracking-wider text-white/60">
          Sale price
        </label>
        <div className="mt-1.5 flex items-center gap-2 rounded-xl border border-white/10 bg-black/30 px-3 focus-within:border-orange-400/60">
          <span className="text-lg text-white/50">$</span>
          <Input
            id="ps-calc-price"
            type="number"
            inputMode="decimal"
            min={0}
            step={100}
            value={dollars}
            onChange={(e) => setDollars(e.target.value)}
            className="border-0 bg-transparent text-lg font-semibold text-white shadow-none focus-visible:ring-0"
          />
        </div>
        <Slider
          value={[Math.min(SLIDER_MAX, Math.max(SLIDER_MIN, cents || SLIDER_MIN))]}
          min={SLIDER_MIN}
          max={SLIDER_MAX}
          step={100_00}
          onValueChange={([v]) => setDollars((v / 100).toString())}
          className="mt-4"
          aria-label="Sale price slider"
        />
        <div className="mt-1 flex justify-between text-[10px] uppercase tracking-wider text-white/40">
          <span>{formatCents(SLIDER_MIN)}</span>
          <span>{formatCents(SLIDER_MAX)}</span>
        </div>
      </div>

      {/* Result */}
      {!eligible ? (
        <div className="mt-5 rounded-xl border border-amber-500/25 bg-amber-500/5 p-4 text-sm text-amber-200">
          <div className="flex items-center gap-2 font-medium">
            <Shield className="h-4 w-4" /> Below Protected Sale threshold
          </div>
          <p className="mt-1 text-xs text-amber-200/80">
            Protection is available on sales of {formatCents(PROTECTED_SALE_MIN_PRICE_CENTS)} or more.
          </p>
        </div>
      ) : (
        <>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <FeeTile
              label="Protection fee"
              value={formatCents(amounts!.protectionFeeCents)}
              accent
              caption={
                feeBand === 'floor' ? `Minimum · would be ${formatCents(rawFeeCents)} at 4.9%`
                : feeBand === 'ceiling' ? `Maximum · would be ${formatCents(rawFeeCents)} at 4.9%`
                : `${effectiveRate.toFixed(2)}% effective`
              }
              band={feeBand}
            />
            <FeeTile
              label={`Deposit today`}
              value={formatCents(amounts!.depositCents)}
              caption="Held by Vendibook"
            />
            <FeeTile
              label="Balance at handoff"
              value={formatCents(amounts!.balanceCents)}
              caption="Released after both confirm"
            />
          </div>

          {!compact ? (
            <div className="mt-4 grid gap-2 text-xs text-white/60 sm:grid-cols-2">
              <BandRow
                label="Minimum kicks in below"
                value={formatCents(FLOOR_BREAK_CENTS)}
                icon={<TrendingDown className="h-3 w-3" />}
                active={feeBand === 'floor'}
              />
              <BandRow
                label="Maximum caps at"
                value={formatCents(CEILING_BREAK_CENTS)}
                icon={<TrendingUp className="h-3 w-3" />}
                active={feeBand === 'ceiling'}
              />
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}

function FeeTile({
  label, value, caption, accent, band,
}: { label: string; value: string; caption?: string; accent?: boolean; band?: 'floor' | 'linear' | 'ceiling' | 'none' }) {
  const ring =
    band === 'floor' ? 'ring-1 ring-amber-400/30'
    : band === 'ceiling' ? 'ring-1 ring-sky-400/30'
    : accent ? 'ring-1 ring-orange-400/40' : '';
  return (
    <div className={`rounded-xl border border-white/10 bg-black/30 p-3 ${ring}`}>
      <div className="text-[10px] font-medium uppercase tracking-wider text-white/50">{label}</div>
      <div className={`mt-1 text-xl font-semibold ${accent ? 'text-orange-300' : 'text-white'}`}>{value}</div>
      {caption ? <div className="mt-0.5 text-[11px] text-white/50">{caption}</div> : null}
    </div>
  );
}

function BandRow({
  label, value, icon, active,
}: { label: string; value: string; icon: React.ReactNode; active?: boolean }) {
  return (
    <div className={`flex items-center justify-between rounded-lg border px-2.5 py-1.5 ${
      active ? 'border-orange-400/40 bg-orange-500/5 text-white' : 'border-white/10 bg-white/[0.02]'
    }`}>
      <span className="inline-flex items-center gap-1.5">{icon}{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
