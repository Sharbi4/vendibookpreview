import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { PayPalWordmark, EquinoxFundingLogo } from '@/components/brand/ProviderLogos';
import vendibookWordmark from '@/assets/vendibook-wordmark.png';
import { FLIP_INSURANCE } from '@/lib/flipInsurance';
import './home-explainer.css';

/**
 * Homepage explainer: what Vendibook is, the buyer and seller paths, and the
 * partners behind a deal.
 */

type Audience = 'buy' | 'sell';

const PATHS: Record<Audience, { steps: { title: string; body: string }[]; cta: { label: string; href: string }; secondary: { label: string; href: string } }> = {
  buy: {
    steps: [
      { title: 'Browse and compare', body: 'Photos, specs, condition, price and location for trucks, trailers, kitchens and spaces nationwide.' },
      { title: 'Talk to the seller', body: 'Message, ask for a live video walkthrough and make an offer, all inside Vendibook.' },
      { title: 'Pay or finance', body: 'Check out with PayPal where the seller offers it, or apply for equipment financing through a third-party lender.' },
      { title: 'Pick up or get it delivered', body: 'Meet locally, use the seller’s delivery, or request Vendibook Freight on eligible listings.' },
      { title: 'Close with a record', body: 'Agreements, payment status and handoff details stay together on your order.' },
    ],
    cta: { label: 'Browse equipment', href: '/search' },
    secondary: { label: 'How payments work', href: '/payments' },
  },
  sell: {
    steps: [
      { title: 'Create a free account', body: 'Listing is free. You only pay a fee when a sale or booking completes.' },
      { title: 'Build your listing', body: 'Add photos, specs, price and location. PricePilot suggests a market-backed range.' },
      { title: 'Answer buyers', body: 'Reply to messages and offers, and run video walkthroughs from your dashboard.' },
      { title: 'Get paid through PayPal', body: 'Connect your PayPal Business account to accept online checkout on your listings.' },
      { title: 'Hand it off', body: 'Agreements, handoff steps and records are kept on the order for both sides.' },
    ],
    cta: { label: 'Start selling — free to list', href: '/list' },
    secondary: { label: 'See pricing', href: '/pricing' },
  },
};

export function HomeTrustStrip() {
  const items = [
    { key: 'paypal', logo: <span className="hx-logo-paypal"><PayPalWordmark surface="light" className="hx-logo" /><b>PayPal</b></span>, label: 'Secure checkout', href: '/payments' },
    { key: 'equinox', logo: <span className="hx-logo-plate"><EquinoxFundingLogo className="hx-logo" /></span>, label: 'Equipment financing', href: '/financing' },
    ...(FLIP_INSURANCE.enabled ? [{ key: 'flip', logo: <img src={FLIP_INSURANCE.logoUrl} alt="FLIP" className="hx-logo" loading="lazy" />, label: 'Food business insurance', href: '/insurance' }] : []),
    { key: 'freight', logo: <img src={vendibookWordmark} alt="Vendibook Freight" className="hx-logo" loading="lazy" />, label: 'Freight delivery', href: '/vendibook-freight' },
  ];
  return (
    <nav className="hx-trust" aria-label="Partners built into every Vendibook deal">
      <p className="hx-trust-title">Trusted partners on every deal</p>
      <div className="hx-trust-row">
        {items.map((item) => (
          <Link key={item.key} to={item.href} className="hx-trust-item">
            <span className="hx-trust-logo">{item.logo}</span>
            <span className="hx-trust-label">{item.label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}

export default function HomeExplainer({ sellerHref }: { sellerHref: string }) {
  const [audience, setAudience] = useState<Audience>('buy');
  const path = PATHS[audience];
  const cta = audience === 'sell' ? { ...path.cta, href: sellerHref } : path.cta;

  return (
    <section className="hx" aria-labelledby="hx-title">
      <div className="hx-intro">
        <p className="v2-home-eyebrow">What is Vendibook</p>
        <h2 id="hx-title">The marketplace for mobile food equipment, with the deal built in.</h2>
        <p className="hx-lede">
          Vendibook is where owners, operators, dealers and new entrepreneurs buy, sell and rent food trucks,
          trailers, kitchens and vendor spaces. Payments, financing, delivery, agreements and transaction records
          live in one place, instead of cash deals and lost paperwork.
        </p>
      </div>

      <div className="hx-paths">
        <div className="hx-tabs" role="tablist" aria-label="Choose your path">
          <button type="button" role="tab" id="hx-tab-buy" aria-controls="hx-panel" aria-selected={audience === 'buy'} onClick={() => setAudience('buy')}>
            I want to buy or rent
          </button>
          <button type="button" role="tab" id="hx-tab-sell" aria-controls="hx-panel" aria-selected={audience === 'sell'} onClick={() => setAudience('sell')}>
            I want to sell or list
          </button>
        </div>
        <div id="hx-panel" role="tabpanel" aria-labelledby={`hx-tab-${audience}`} className="hx-panel">
          <ol className="hx-steps">
            {path.steps.map((step, i) => (
              <li key={step.title}>
                <span className="hx-step-num">{i + 1}</span>
                <div><h3>{step.title}</h3><p>{step.body}</p></div>
              </li>
            ))}
          </ol>
          {audience === 'sell' && (
            <ul className="hx-pricing" aria-label="Seller pricing">
              <li><strong>Free</strong> to list</li>
              <li><strong>12.9%</strong> only when it sells</li>
              <li><strong>10.9%</strong> with Vendibook Pro</li>
              <li><strong>$0</strong> buyer fees on purchases</li>
            </ul>
          )}
          <div className="hx-actions">
            <Link to={cta.href} className="v2-home-btn">{cta.label}<ArrowRight aria-hidden="true" /></Link>
            <Link to={path.secondary.href} className="v2-home-btn is-quiet">{path.secondary.label}</Link>
          </div>
        </div>
      </div>
    </section>
  );
}
