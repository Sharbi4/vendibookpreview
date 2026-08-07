import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

const FAQ = [
  { q: 'Can I cancel anytime?', a: 'Yes. Cancel online from Account → Subscription in one click. Your plan stays active through the end of the current paid period — no early-termination fees, no phone calls.' },
  { q: 'What happens to my listings if I downgrade?', a: 'Your listings stay live. If a downgrade would exceed your new plan\'s active-listing count, the newest ones are auto-paused and you can choose which to keep active. Nothing is deleted.' },
  { q: 'Is basic listing still free?', a: 'Yes. Free hosts and sellers keep every core tool: unlimited photos on your first listing, booking calendar basics, messaging, and payment protection at checkout.' },
  { q: 'How do the fees work?', a: 'We charge a 12.9% host commission and a 12.9% renter fee on rentals, and a 12.9% seller commission on card and PayPal sales. Cash sales are 100% free. Plans currently add tools, not fee discounts.' },
  { q: 'Do you offer refunds?', a: 'Subscription charges are non-refundable, but you can cancel anytime and access continues through the paid period. One-time boosts follow the refund policy shown at purchase.' },
];

export function PlansFAQ() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <div className="space-y-2">
      <h3 className="text-lg font-semibold text-foreground mb-4">Questions people ask before subscribing</h3>
      {FAQ.map((item, i) => {
        const isOpen = open === i;
        return (
          <div key={item.q} className="rounded-[14px] border-[1.5px] border-white/12 bg-white/[0.02] overflow-hidden">
            <button
              onClick={() => setOpen(isOpen ? null : i)}
              className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left hover:bg-white/[0.03] transition"
              aria-expanded={isOpen}
            >
              <span className="text-sm font-medium text-foreground">{item.q}</span>
              <ChevronDown className={cn('h-4 w-4 text-muted-foreground shrink-0 transition-transform', isOpen && 'rotate-180')} />
            </button>
            {isOpen && (
              <div className="px-5 pb-5 pt-1 text-sm text-foreground/75 leading-relaxed border-t border-white/[0.06]">
                {item.a}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default PlansFAQ;
