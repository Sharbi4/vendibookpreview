import { Link } from 'react-router-dom';
import { ArrowRight, Phone } from 'lucide-react';
import { isAtlasEnabled, startAtlas } from '@/lib/atlas/atlasFlag';
import '@/components/atlas/atlas.css';

const CAN_DO = [
  'Finds trucks and trailers that fit your menu, budget and tow vehicle',
  'Walks you through listings on screen and checks delivery to your ZIP',
  'Reaches out to sellers and negotiates for you, with your OK',
  'Helps you list yours, and coaches your launch after you buy',
];

/** Homepage band: a short intro to Atlas with a call button (or a link to /atlas when Atlas is off). */
export default function HomeAtlasBand() {
  const live = isAtlasEnabled();
  return (
    <section className="hb-section hb-section-tight" aria-labelledby="home-atlas-title">
      <div className="hb-wrap">
        <div className="flex flex-col gap-6 rounded-[24px] border border-border bg-card p-6 shadow-sm sm:p-8 lg:flex-row lg:items-center lg:gap-10">
          <div className="flex items-start gap-4 lg:w-[40%]">
            <span className="atlas-orb flex-none" style={{ width: 56, height: 56 }} aria-hidden="true" />
            <div className="min-w-0">
              <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-primary">Vendibook AI sales assistant</p>
              <h2 id="home-atlas-title" className="mt-1 text-2xl font-bold tracking-tight text-foreground sm:text-[28px]">
                Speak to Atlas
              </h2>
              <p className="mt-1 text-[15px] text-muted-foreground">Talk it through and Atlas works the site with you. Free, by voice or chat.</p>
            </div>
          </div>
          <ul className="grid flex-1 gap-2 text-[14.5px] leading-snug text-foreground/80 sm:grid-cols-2">
            {CAN_DO.map((t) => (
              <li key={t} className="flex gap-2">
                <span className="mt-[7px] h-1.5 w-1.5 flex-none rounded-full bg-primary" aria-hidden="true" />
                {t}
              </li>
            ))}
          </ul>
          <div className="flex flex-col gap-2 sm:flex-row lg:flex-col">
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
