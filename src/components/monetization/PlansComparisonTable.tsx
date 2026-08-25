import { useState } from 'react';
import { ChevronDown, Check, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Row {
  label: string;
  free: boolean | string;
  starter: boolean | string;
  pro: boolean | string;
  premium: boolean | string;
}

const ROWS: Row[] = [
  { label: 'Active listings', free: 'Up to 2 active', starter: 'Up to 5 active', pro: 'Unlimited', premium: 'Unlimited' },
  { label: 'Free e-signatures on every agreement', free: true, starter: true, pro: true, premium: true },
  { label: 'Payment protection at checkout', free: true, starter: true, pro: true, premium: true },
  { label: 'Buyer & renter inquiries', free: 'Unlimited', starter: 'Unlimited', pro: 'Unlimited', premium: 'Unlimited' },
  { label: 'Enhanced listing tools (extra photos, badges)', free: false, starter: true, pro: true, premium: true },
  { label: 'AI listing description generator', free: false, starter: true, pro: true, premium: true },
  { label: 'Booking calendar & automated renter messages', free: 'Basic', starter: true, pro: true, premium: true },
  { label: 'Custom deposits & cancellation rules', free: false, starter: false, pro: true, premium: true },
  { label: 'Storage add-ons, cleaning fees', free: false, starter: false, pro: true, premium: true },
  { label: 'Featured Boost included', free: false, starter: false, pro: '1 credit', premium: '1 credit' },
  { label: 'Premium tools bundle (PricePilot, PermitPath Plus)', free: false, starter: false, pro: true, premium: true },
  { label: '$10 off notarization', free: false, starter: false, pro: true, premium: true },
  { label: 'Portfolio dashboard across every listing', free: false, starter: false, pro: false, premium: true },
  { label: 'Custom intake questions per booking', free: false, starter: false, pro: false, premium: true },
  { label: 'Support priority', free: 'Standard', starter: 'Standard', pro: 'High', premium: 'Urgent' },
];

function Cell({ v }: { v: boolean | string }) {
  if (typeof v === 'string') return <span className="text-sm text-foreground/90">{v}</span>;
  return v
    ? <Check className="h-4 w-4 text-orange-400" strokeWidth={3} />
    : <Minus className="h-4 w-4 text-muted-foreground/50" />;
}

export function PlansComparisonTable() {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-[20px] border-[1.5px] border-white/12 bg-white/[0.02] overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-6 py-5 text-left hover:bg-white/[0.03] transition"
        aria-expanded={open}
      >
        <div>
          <h3 className="text-lg font-semibold text-foreground">Compare all features</h3>
          <p className="mt-0.5 text-sm text-muted-foreground">Full breakdown across Free, Starter, Growth, and Operator.</p>
        </div>
        <ChevronDown className={cn('h-5 w-5 text-muted-foreground transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="border-t-[1.5px] border-white/10 overflow-x-auto">
          <table className="w-full text-sm min-w-[720px]">
            <thead>
              <tr className="border-b-[1.5px] border-white/10 bg-white/[0.02]">
                <th className="sticky left-0 z-10 bg-[#0e0e10] text-left px-6 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Feature</th>
                <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-muted-foreground">Free</th>
                <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-muted-foreground">Starter</th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-orange-300">Growth</th>
                <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-muted-foreground">Operator</th>
              </tr>
            </thead>
            <tbody>
              {ROWS.map((r, i) => (
                <tr key={r.label} className={cn('border-b border-white/[0.06]', i % 2 === 1 && 'bg-white/[0.015]')}>
                  <td className="sticky left-0 z-10 bg-[#0e0e10] px-6 py-3 text-foreground/90">{r.label}</td>
                  <td className="px-4 py-3 text-center"><div className="inline-flex justify-center"><Cell v={r.free} /></div></td>
                  <td className="px-4 py-3 text-center"><div className="inline-flex justify-center"><Cell v={r.starter} /></div></td>
                  <td className="px-4 py-3 text-center bg-orange-500/[0.04]"><div className="inline-flex justify-center"><Cell v={r.pro} /></div></td>
                  <td className="px-4 py-3 text-center"><div className="inline-flex justify-center"><Cell v={r.premium} /></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default PlansComparisonTable;
