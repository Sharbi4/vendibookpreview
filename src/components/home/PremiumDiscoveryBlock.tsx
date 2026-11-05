import { Link } from 'react-router-dom';
import { ArrowRight, Megaphone, ClipboardCheck, LineChart } from 'lucide-react';
import { trackLeadEvent } from '@/lib/leadTracking';

const POINTS = [
  { icon: Megaphone, title: 'Buyer & renter matching', text: 'For eligible sale and rental listings.' },
  { icon: ClipboardCheck, title: 'Reviewed outreach', text: 'Every campaign is reviewed before it goes out.' },
  { icon: LineChart, title: 'Real activity reports', text: 'See what actually happened, nothing invented.' },
];

/** Homepage BuyerMatch AI band — warm white glass. Sends users to /pricing for upgrades. */
const PremiumDiscoveryBlock = () => {
  const handleClick = () => {
    trackLeadEvent('homepage_premium_discovery_click', {
      route: '/',
      source: 'home_premium_discovery',
      destination: '/pricing#buyermatch-overview',
    });
  };

  return (
    <section className="hb-ai" aria-labelledby="home-buyermatch-title">
      <div className="hb-wrap">
        <div className="hb-ai-panel hb-ai-split">
          <div className="hb-ai-copy">
            <span className="hb-ai-chip">
              <img src="/brand/vendibook-logo-email.png" alt="Vendibook" />
              <span>Pro · BuyerMatch AI</span>
            </span>
            <h2 id="home-buyermatch-title">Find your next buyer or renter.</h2>
            <p className="hb-ai-lede">
              Tell us about your equipment or space and who you want to reach. BuyerMatch AI is included with Vendibook Pro.
            </p>
            <div className="hb-ai-actions">
              <Link to="/pricing#buyermatch-overview" className="hb-ai-btn" onClick={handleClick}>
                Explore BuyerMatch AI <ArrowRight aria-hidden="true" />
              </Link>
              <span className="hb-ai-note">Start free. Upgrade only when it makes sense.</span>
            </div>
          </div>
          <ul className="hb-ai-cards">
            {POINTS.map(({ icon: Icon, title, text }) => (
              <li key={title} className="hb-ai-card">
                <span className="hb-ai-icon"><Icon aria-hidden="true" /></span>
                <div>
                  <h3>{title}</h3>
                  <p>{text}</p>
                </div>
              </li>
            ))}
          </ul>
          <p className="hb-ai-fine">Campaign review and capacity apply; results are not guaranteed.</p>
        </div>
      </div>
    </section>
  );
};

export default PremiumDiscoveryBlock;
