import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { X, Crown } from 'lucide-react';
import { useHostEntitlements } from '@/hooks/useHostEntitlements';

const DISMISS_KEY = 'vb.sidebarUpgradeDismissedAt';
const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;

/**
 * Compact upgrade card above the Account group. Free tier only.
 * Dismissible with 7-day suppression, reappears after.
 */
export const SidebarUpgradeCard = () => {
  const { tier, isLoading } = useHostEntitlements();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isLoading || tier !== 'free') { setVisible(false); return; }
    try {
      const raw = localStorage.getItem(DISMISS_KEY);
      const at = raw ? parseInt(raw, 10) : 0;
      setVisible(!at || Date.now() - at > SEVEN_DAYS);
    } catch { setVisible(true); }
  }, [tier, isLoading]);

  if (!visible) return null;

  const dismiss = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try { localStorage.setItem(DISMISS_KEY, String(Date.now())); } catch { /* noop */ }
    setVisible(false);
  };

  return (
    <div className="mx-4 my-3 relative rounded-[14px] gold-card p-3.5">
      <button
        onClick={dismiss}
        aria-label="Dismiss for 7 days"
        className="absolute top-1.5 right-1.5 h-6 w-6 rounded-full inline-flex items-center justify-center text-[#3a2a00] hover:bg-black/10"
      >
        <X className="h-3.5 w-3.5" />
      </button>
      <div className="flex items-center gap-1.5">
        <Crown className="h-3.5 w-3.5 text-[#3a2a00]" strokeWidth={2.4} />
        <span className="text-[12px] font-bold uppercase tracking-[0.14em] text-[#1A1400]">
          Vendibook Pro
        </span>
      </div>
      <p className="mt-1.5 text-[12px] font-medium text-[#2b2100] leading-snug">
        Featured placement · Lower fees
      </p>
      <Link
        to="/dashboard?view=host&tab=promote"
        className="mt-2.5 inline-flex items-center gap-1 text-[12px] font-semibold text-[#1A1400] hover:underline underline-offset-2"
      >
        See upgrades →
      </Link>
    </div>
  );
};

export default SidebarUpgradeCard;
