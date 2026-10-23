import { Link } from 'react-router-dom';
import { ArrowRight, Phone } from 'lucide-react';
import { isAtlasEnabled, startAtlas, type AtlasTopic } from '@/lib/atlas/atlasFlag';
import '@/components/atlas/atlas.css';

const CAN_DO: { title: string; text: string; topic: AtlasTopic; cta: string }[] = [
  { title: 'Find the right equipment', text: 'Compare actual listings around your menu, location and budget.', topic: 'buy', cta: 'Find my match' },
  { title: 'Make a stronger offer', text: 'Choose your terms and review a seller message before Atlas sends it.', topic: 'negotiate', cta: 'How negotiation works' },
  { title: 'Picture your menu', text: 'See dish ideas based on the equipment a listing actually describes.', topic: 'menu', cta: 'Explore menu ideas' },
  { title: 'Talk through the purchase', text: 'Ask Atlas to check meeting times with our customer-success team.', topic: 'meeting', cta: 'Ask about a meeting' },
];

/** Homepage band: a short intro to Atlas with a call button (or a link to /atlas when Atlas is off). */
export default function HomeAtlasBand() {
  const live = isAtlasEnabled();
  return (
    <section className="hb-section hb-section-tight" aria-labelledby="home-atlas-title">
      <div className="hb-wrap">
        <div className="flex flex-col gap-6 rounded-[28px] border border-border bg-card p-6 shadow-[0_15px_60px_-35px_rgba(30,35,40,.3)] sm:p-8">
          <div className="flex items-start gap-4">
            <span className="atlas-orb flex-none" style={{ width: 56, height: 56 }} aria-hidden="true" />
            <div className="min-w-0">
              <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-primary">Vendibook AI sales assistant</p>
              <h2 id="home-atlas-title" className="mt-1 text-2xl font-bold tracking-tight text-foreground sm:text-[28px]">
                Your next move, with Atlas
              </h2>
              <p className="mt-1 text-[15px] text-muted-foreground">A buying assistant that browses with you, helps you negotiate, and turns equipment into possibilities.</p>
            </div>
          </div>
          <ul className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
            {CAN_DO.map((item) => (
              <li key={item.topic} className="flex flex-col rounded-2xl border border-border/70 bg-background/60 p-5">
                <h3 className="font-semibold text-foreground">{item.title}</h3>
                <p className="mt-2 flex-1 leading-relaxed text-muted-foreground">{item.text}</p>
                {live && <button className="mt-4 text-left text-sm font-semibold text-primary underline-offset-4 hover:underline" onClick={() => startAtlas({ mode: 'voice', topic: item.topic })}>{item.cta} <span aria-hidden="true">↗</span></button>}
              </li>
            ))}
          </ul>
          <div className="flex flex-col gap-2 sm:flex-row">
            {live ? (
              <button
                type="button"
                onClick={() => startAtlas({ mode: 'voice' })}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-[#FF5124] px-6 text-[15px] font-semibold text-white shadow-[0_8px_22px_rgba(255,81,36,0.35)] transition hover:bg-[#FF6A3D]"
                data-cta-location="home_atlas_band"
              >
                <Phone className="h-4 w-4" aria-hidden="true" /> Speak to Atlas
              </button>
            ) : null}
            <Link
              to="/atlas"
              className="inline-flex h-12 items-center justify-center gap-1.5 rounded-full border border-border px-6 text-[15px] font-semibold text-foreground transition hover:border-foreground"
              data-cta-location="home_atlas_band_more"
            >
              {live ? 'What Atlas can do' : 'Meet Atlas'}<ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
