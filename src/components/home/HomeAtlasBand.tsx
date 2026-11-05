import { Link } from 'react-router-dom';
import { ArrowRight, Phone, Search, Handshake, ChefHat, CalendarClock } from 'lucide-react';
import { isAtlasEnabled, startAtlas, type AtlasTopic } from '@/lib/atlas/atlasFlag';
import '@/components/atlas/atlas.css';

const CAN_DO = [
  { icon: Search, title: 'Find the right equipment', text: 'Compare actual listings around your menu, location and budget.', topic: 'buy' as AtlasTopic, cta: 'Find my match' },
  { icon: Handshake, title: 'Make a stronger offer', text: 'Choose your terms and review a seller message before Atlas sends it.', topic: 'negotiate' as AtlasTopic, cta: 'How negotiation works' },
  { icon: ChefHat, title: 'Picture your menu', text: 'See dish ideas based on the equipment a listing actually describes.', topic: 'menu' as AtlasTopic, cta: 'Explore menu ideas' },
  { icon: CalendarClock, title: 'Talk through the purchase', text: 'Ask Atlas to check meeting times with our customer-success team.', topic: 'meeting' as AtlasTopic, cta: 'Ask about a meeting' },
];

/** Homepage band: Atlas intro in warm white glass, with a call button (or /atlas link when Atlas is off). */
export default function HomeAtlasBand() {
  const live = isAtlasEnabled();
  return (
    <section className="hb-ai hb-ai-atlas" aria-labelledby="home-atlas-title">
      <div className="hb-wrap">
        <div className="hb-ai-panel">
          <div className="hb-ai-head">
            <span className="atlas-orb flex-none" style={{ width: 64, height: 64 }} aria-hidden="true" />
            <div className="min-w-0">
              <p className="hb-eyebrow">Vendibook AI sales assistant</p>
              <h2 id="home-atlas-title">Your next move, with Atlas.</h2>
              <p className="hb-ai-lede">A buying assistant that browses with you, helps you negotiate, and turns equipment into possibilities.</p>
            </div>
          </div>
          <ul className="hb-ai-grid">
            {CAN_DO.map(({ icon: Icon, ...item }) => (
              <li key={item.topic} className="hb-ai-card hb-ai-card-col">
                <span className="hb-ai-icon"><Icon aria-hidden="true" /></span>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
                {live && (
                  <button type="button" className="hb-ai-link" onClick={() => startAtlas({ mode: 'voice', topic: item.topic })}>
                    {item.cta} <ArrowRight aria-hidden="true" />
                  </button>
                )}
              </li>
            ))}
          </ul>
          <div className="hb-ai-actions">
            {live && (
              <button type="button" onClick={() => startAtlas({ mode: 'voice' })} className="hb-ai-btn" data-cta-location="home_atlas_band">
                <Phone aria-hidden="true" /> Speak to Atlas
              </button>
            )}
            <Link to="/atlas" className="hb-ai-btn-ghost" data-cta-location="home_atlas_band_more">
              {live ? 'What Atlas can do' : 'Meet Atlas'} <ArrowRight aria-hidden="true" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
