import { Link } from 'react-router-dom';
import { ArrowUpRight, Check, MessageCircle, Phone } from 'lucide-react';
import { isAtlasEnabled, startAtlas } from '@/lib/atlas/atlasFlag';
import './home-atlas-banner.css';

const FEATURES = [
  { title: 'Find your next truck or trailer', detail: 'Compare listings by menu, location and budget.' },
  { title: 'Prepare a stronger offer', detail: 'Explore terms and review seller messages before sending.' },
  { title: 'Bring your menu to life', detail: 'Discover ideas based on the equipment in a listing.' },
  { title: 'Navigate your next step', detail: 'Get purchase guidance and help finding meeting times.' },
];

/** Compact, responsive introduction; exploring never starts a voice session. */
export default function HomeAtlasBand() {
  return (
    <section className="home-atlas-banner-section" aria-labelledby="home-atlas-title">
      <div className="hb-wrap">
        <div className="home-atlas-banner">
          <span className="home-atlas-watermark" aria-hidden="true" />
          <div className="home-atlas-intro">
            <img className="home-atlas-wordmark" src="/brand/vendibook-logo-email-white.png" alt="Vendibook" width={156} />
            <p className="home-atlas-eyebrow">Your AI sales assistant</p>
            <h2 id="home-atlas-title">Your next move.<br />Made easier with Atlas.</h2>
            <p className="home-atlas-description">From finding the right equipment to planning what comes next. Get a little guidance at every step.</p>
            {isAtlasEnabled() && (
              <div className="home-atlas-conversation" data-atlas-ui role="group" aria-label="Talk or chat with Atlas">
                <div className="home-atlas-conversation-heading">
                  <span className="home-atlas-conversation-orb" aria-hidden="true" />
                  <div><strong>Meet Atlas</strong><p>Your AI sales assistant</p></div>
                </div>
                <div className="home-atlas-conversation-actions">
                  <button type="button" onClick={() => startAtlas({ mode: 'voice' })}>
                    <Phone aria-hidden="true" /> Talk to Atlas
                  </button>
                  <button type="button" onClick={() => startAtlas({ mode: 'text' })}>
                    <MessageCircle aria-hidden="true" /> Chat
                  </button>
                </div>
                <p className="home-atlas-conversation-note">Voice or text. Powered by ElevenLabs.</p>
              </div>
            )}
            <Link to="/atlas" className="home-atlas-explore" data-cta-location="home_atlas_band_more">
              Explore Atlas <ArrowUpRight aria-hidden="true" />
            </Link>
          </div>
          <div className="home-atlas-features">
            <p className="home-atlas-features-label">A smarter way to get started</p>
            <ul>
              {FEATURES.map(({ title, detail }) => (
                <li key={title}>
                  <span className="home-atlas-check"><Check aria-hidden="true" /></span>
                  <div><h3>{title}</h3><p>{detail}</p></div>
                </li>
              ))}
            </ul>
            <p className="home-atlas-assurance">You stay in control. You review the next move.</p>
          </div>
        </div>
      </div>
    </section>
  );
}
