import { useState } from 'react';
import { ChevronDown, Check, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Row { label: string; starter: boolean | string; pro: boolean | string; premium: boolean | string; }

const ROWS: Row[] = [
  { label: 'Active listings', starter: 'Up to 3', pro: 'Unlimited', premium: 'Unlimited' },
  { label: 'Enhanced listing tools', starter: true, pro: true, premium: true },
  { label: 'Booking calendar & inquiries', starter: true, pro: true, premium: true },
  { label: 'Automated renter messages', starter: true, pro: true, premium: true },
  { label: 'Recurring availability', starter: false, pro: true, premium: true },
  { label: 'Custom deposits & cancellation rules', starter: false, pro: true, premium: true },
  { label: 'Automated contracts', starter: false, pro: true, premium: true },
  { label: 'Revenue dashboard', starter: false, pro: true, premium: true },
  { label: 'Multi-location / fleet management', starter: false, pro: false, premium: true },
  { label: 'Team member access & permissions', starter: false, pro: false, premium: true },
  { label: 'Utilization analytics & accounting exports', starter: false, pro: false, premium: true },
  { label: 'Branded booking page', starter: false, pro: false, premium: true },
  { label: 'Priority support', starter: 'Email', pro: 'Email + chat', premium: 'Dedicated' },
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
          <p className="mt-0.5 text-sm text-muted-foreground">Full breakdown of what's in every plan.</p>
        </div>
        <ChevronDown className={cn('h-5 w-5 text-muted-foreground transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="border-t-[1.5px] border-white/10 overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <thead>
              <tr className="border-b-[1.5px] border-white/10 bg-white/[0.02]">
                <th className="sticky left-0 z-10 bg-[#0e0e10] text-left px-6 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Feature</th>
                <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-muted-foreground">Starter</th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-orange-300">Pro</th>
                <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-muted-foreground">Premium</th>
              </tr>
            </thead>
            <tbody>
              {ROWS.map((r, i) => (
                <tr key={r.label} className={cn('border-b border-white/[0.06]', i % 2 === 1 && 'bg-white/[0.015]')}>
                  <td className="sticky left-0 z-10 bg-[#0e0e10] px-6 py-3 text-foreground/90">{r.label}</td>
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
