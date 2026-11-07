import { Link } from 'react-router-dom';
import { ArrowRight, Megaphone, ClipboardCheck, LineChart } from 'lucide-react';
import { trackLeadEvent } from '@/lib/leadTracking';
import BuyerMatchFeedScene from './BuyerMatchFeedScene';

const POINTS = [
  { icon: Megaphone, title: 'Buyer & renter matching', text: 'for eligible listings' },
  { icon: ClipboardCheck, title: 'Reviewed outreach', text: 'nothing goes out without review' },
  { icon: LineChart, title: 'Real activity reports', text: 'nothing invented' },
];

/** Homepage BuyerMatch AI band — compact warm glass with an illustrative feed animation. Sends users to /pricing. */
const PremiumDiscoveryBlock = () => {
  const handleClick = () => {
    trackLeadEvent('homepage_premium_discovery_click', {
      route: '/',
      source: 'home_premium_discovery',
      destination: '/pricing#buyermatch-overview',
    });
  };

  return (
    <section className="hb-ai hb-ai--compact" aria-labelledby="home-buyermatch-title">
      <div className="hb-wrap">
        <div className="hb-ai-panel hb-ai-compact-panel">
          <div className="hb-ai-copy">
            <span className="hb-ai-chip">
              <img src="/brand/vendibook-logo-email.png" alt="Vendibook" />
              <span>Pro · BuyerMatch AI</span>
            </span>
            <h2 id="home-buyermatch-title">Find your next buyer or renter.</h2>
            <p className="hb-ai-lede">
              Tell us about your equipment or space and who you want to reach. Included with Vendibook Pro.
            </p>
            <ul className="hb-ai-points">
              {POINTS.map(({ icon: Icon, title, text }) => (
                <li key={title}>
                  <Icon aria-hidden="true" />
                  <span><b>{title}</b> — {text}</span>
                </li>
              ))}
            </ul>
            <div className="hb-ai-actions">
              <Link to="/pricing#buyermatch-overview" className="hb-ai-btn" onClick={handleClick}>
                Explore BuyerMatch AI <ArrowRight aria-hidden="true" />
              </Link>
              <span className="hb-ai-note">Start free. Upgrade when it makes sense.</span>
            </div>
            <p className="hb-ai-fine">Campaign review and capacity apply; results are not guaranteed.</p>
          </div>
          <BuyerMatchFeedScene />
        </div>
      </div>
    </section>
  );
};

export default PremiumDiscoveryBlock;
