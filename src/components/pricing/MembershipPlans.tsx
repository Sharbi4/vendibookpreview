import { Link } from 'react-router-dom';
import { ArrowRight, Check } from 'lucide-react';
import type { ReactNode } from 'react';
import FeaturedBadge from '@/components/listing/FeaturedBadge';
import './MembershipPlans.css';

interface Props {
  annual: boolean;
  onAnnualChange: (value: boolean) => void;
  proPrice: string;
  featuredPrice: string;
  proAction: ReactNode;
  isPro: boolean;
  membershipStatus: string | null;
}
const checks = (items: string[]) => <ul>{items.map(item => <li key={item}><Check aria-hidden="true"/><span>{item}</span></li>)}</ul>;

export default function MembershipPlans({ annual, onAnnualChange, proPrice, featuredPrice, proAction, isPro, membershipStatus }: Props) {
  return <section className="membership-plans" aria-labelledby="membership">
    <h2 id="membership" className="sr-only">Membership plans and Featured subscription</h2>
    <div className="membership-period" role="group" aria-label="Pro billing period">
      <button aria-pressed={!annual} onClick={() => onAnnualChange(false)}>Monthly</button>
      <button aria-pressed={annual} onClick={() => onAnnualChange(true)}>Annual <span>2 months free</span></button>
    </div>
    <p className="membership-period-note">Save $158 a year with annual Pro. Featured stays monthly.</p>
    <div className="membership-grid">
      <article className="membership-card">
        <header><h3>Starter</h3><p>For getting your listing online</p></header>
        <div className="membership-body">
          <p className="membership-price">$0<small>/listing</small></p>
          <p className="membership-billing">List at no cost. Transaction fees apply when a deal completes.</p>
          {checks(['Two active sale or rental listings', 'Your listing share kit', 'Inquiries in your dashboard', 'Free electronic agreements', 'PermitPath Basic roadmaps'])}
          <p className="membership-exclusions">BuyerMatch AI and a Featured Boost credit are not included.</p>
          <Link className="membership-secondary" to="/list/start">Create a listing <ArrowRight aria-hidden="true"/></Link>
        </div>
      </article>
      <article className="membership-card membership-pro">
        <header><div className="membership-pro-heading"><h3><img src="/brand/vendibook-logo-email.png" alt="Vendibook"/><span>PRO</span></h3><span className="membership-recommended">{isPro ? 'Your plan' : 'Recommended'}</span></div><p>For active sellers and hosts</p></header>
        <div className="membership-body">
          <p className="membership-price">{proPrice}<small>/{annual ? 'year' : 'month'}</small></p>
          <p className="membership-billing">{annual ? 'Billed annually. Save $158 (16.7%) compared with monthly billing.' : 'Billed monthly.'} Cancel anytime.</p>
          {membershipStatus && <p className="membership-status">{membershipStatus}</p>}
          {checks(['BuyerMatch AI — priority buyer discovery for eligible sale listings', 'Reviewed outreach activity reports', '1 Featured Boost credit each billing period', 'PricePilot equipment appraisals', 'PermitPath Plus permit roadmaps', 'Priority placement and support'])}
          <nav className="membership-explore" aria-label="Explore Pro tools"><a href="#buyermatch-overview">Explore BuyerMatch AI <ArrowRight aria-hidden="true"/></a><Link to="/tools/pricepilot">Explore PricePilot <ArrowRight aria-hidden="true"/></Link><Link to="/tools/permitpath">Explore PermitPath <ArrowRight aria-hidden="true"/></Link></nav>
          <div className="membership-primary">{proAction}</div>
        </div>
      </article>
      <article className="membership-card">
        <header><h3><FeaturedBadge variant="card" size="md" force/><span className="sr-only"> listing</span></h3><p>A spotlight for one listing</p></header>
        <div className="membership-body">
          <p className="membership-price">{featuredPrice}<small>/month</small></p>
          <p className="membership-billing">A monthly subscription for the listing you choose.</p>
          {checks(['Featured visibility for your listing', 'A highlighted listing card', 'Manage renewal from your account'])}
          <p className="membership-exclusions">Cancel anytime. Automatically cancels when the listing is marked sold. Rental listings renew until you cancel. No annual option.</p>
          <Link className="membership-featured-action" to="/dashboard/listings">Make a listing Featured <ArrowRight aria-hidden="true"/></Link>
        </div>
      </article>
    </div>
    <p className="membership-fineprint">Applicable taxes are shown at checkout. BuyerMatch requires activation, eligibility and campaign capacity; no leads or sales are guaranteed. Pro includes one 30-day Featured Boost credit per billing period, with no rollover. Pro does not discount transaction commissions.</p>
  </section>;
}
