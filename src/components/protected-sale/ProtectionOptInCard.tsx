import { useState } from 'react';
import { Shield, Check, ChevronDown } from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  computeProtectedSaleAmounts,
  formatCents,
  isProtectedSaleEligible,
} from '@/lib/protectedSale/fees';
import { ProtectedSaleFeeCalculator } from './ProtectedSaleFeeCalculator';

interface Props {
  salePriceCents: number;
  saleTransactionId?: string;
}

/**
 * Opt-in card for Vendibook Protected Sale.
 * Rendered on the sale checkout review step above the final CTA.
 * Only shown when the sale meets the protection floor.
 */
export function ProtectionOptInCard({ salePriceCents, saleTransactionId }: Props) {
  const [showCalculator, setShowCalculator] = useState(false);
  if (!isProtectedSaleEligible(salePriceCents)) return null;
  const { protectionFeeCents, depositCents, balanceCents } =
    computeProtectedSaleAmounts(salePriceCents);

  return (
    <div className="mt-4 rounded-2xl border border-white/10 bg-[hsla(0,0%,100%,0.02)] p-5 backdrop-blur-sm">
      <div className="flex items-start gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-orange-500/15 text-orange-400">
          <Shield className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <h4 className="text-base font-semibold text-white">
            Add Vendibook Protection
          </h4>
          <p className="mt-1 text-sm text-white/70">
            Verified identities on both sides, immutable agreement, and funds held until the handoff is confirmed by both parties.
          </p>

          <ul className="mt-3 grid gap-1.5 text-sm text-white/80 sm:grid-cols-2">
            <li className="flex items-center gap-2"><Check className="h-4 w-4 text-orange-400" /> Stripe Identity verification</li>
            <li className="flex items-center gap-2"><Check className="h-4 w-4 text-orange-400" /> Signed digital agreement</li>
            <li className="flex items-center gap-2"><Check className="h-4 w-4 text-orange-400" /> Secure deposit & held balance</li>
            <li className="flex items-center gap-2"><Check className="h-4 w-4 text-orange-400" /> Dual-confirmed handoff</li>
          </ul>

          <div className="mt-4 rounded-xl border border-white/10 bg-black/20 p-3 text-sm text-white/80">
            <div className="flex items-center justify-between">
              <span>Protection fee (4.9%)</span>
              <span className="font-medium text-white">{formatCents(protectionFeeCents)}</span>
            </div>
            <div className="mt-1 flex items-center justify-between">
              <span>Deposit today</span>
              <span className="font-medium text-white">{formatCents(depositCents)}</span>
            </div>
            <div className="mt-1 flex items-center justify-between text-white/60">
              <span>Balance at handoff</span>
              <span>{formatCents(balanceCents)}</span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowCalculator((v) => !v)}
            className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-orange-300 hover:text-orange-200"
            aria-expanded={showCalculator}
          >
            <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showCalculator ? 'rotate-180' : ''}`} />
            {showCalculator ? 'Hide fee calculator' : 'Preview the fee at other prices'}
          </button>
          {showCalculator ? (
            <ProtectedSaleFeeCalculator
              initialSalePriceCents={salePriceCents}
              className="mt-3"
              compact
            />
          ) : null}

          {saleTransactionId ? (
            <Link
              to={`/sale/${saleTransactionId}/protection`}
              className="mt-4 inline-flex items-center justify-center rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-orange-400"
            >
              Continue with Protected Sale
            </Link>
          ) : (
            <p className="mt-4 text-xs text-white/50">
              Complete this purchase to unlock the Protected Sale flow, or contact the seller to arrange it before payment.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
