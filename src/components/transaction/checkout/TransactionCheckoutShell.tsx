import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Lock } from 'lucide-react';

interface TransactionCheckoutShellProps {
  /** Small uppercase label above the page title. */
  eyebrow?: string;
  title: string;
  subtitle?: string;
  /** Where "back" goes — usually the listing page. */
  exitHref: string;
  exitLabel?: string;
  /** Sticky right-hand rail (desktop) / collapsible summary (mobile). */
  summary?: ReactNode;
  /** Compact mobile-only summary rendered above the first section. */
  mobileSummary?: ReactNode;
  /** Persistent bottom action bar on mobile. */
  stickyAction?: ReactNode;
  children: ReactNode;
}

/**
 * Shared premium checkout chrome for both the for-sale purchase flow and the
 * rental booking flow: warm ivory canvas, charcoal type, one continuous
 * column of sections with a sticky summary rail. No stepper, no wizard.
 */
const TransactionCheckoutShell = ({
  eyebrow = 'Vendibook',
  title,
  subtitle,
  exitHref,
  exitLabel = 'Back to listing',
  summary,
  mobileSummary,
  stickyAction,
  children,
}: TransactionCheckoutShellProps) => (
  <div className="sale-light v2-checkout">
    <header className="v2-checkout-topbar">
      <Link to={exitHref} className="v2-checkout-back">
        <ArrowLeft aria-hidden />
        <span>{exitLabel}</span>
      </Link>
      <span className="v2-checkout-secure">
        <Lock aria-hidden />
        Secure checkout
      </span>
    </header>

    <main className="v2-checkout-main">
      <div className="v2-checkout-head">
        {eyebrow ? <p className="v2-checkout-eyebrow">{eyebrow}</p> : null}
        <h1>{title}</h1>
        {subtitle ? <p className="v2-checkout-sub">{subtitle}</p> : null}
      </div>

      <div className="v2-checkout-grid">
        <div className="v2-checkout-column">
          {mobileSummary ? <div className="v2-checkout-mobile-summary">{mobileSummary}</div> : null}
          {children}
        </div>
        {summary ? (
          <aside className="v2-checkout-rail">
            <div className="v2-checkout-rail-inner">{summary}</div>
          </aside>
        ) : null}
      </div>
    </main>

    {stickyAction ? <div className="v2-checkout-sticky">{stickyAction}</div> : null}
  </div>
);

export default TransactionCheckoutShell;
