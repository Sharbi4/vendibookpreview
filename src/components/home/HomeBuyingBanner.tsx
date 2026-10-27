import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, Pause, Play } from 'lucide-react';
import { useReducedMotion } from 'framer-motion';
import { filterPubliclyVisible } from '@/lib/listings/publicVisibility';
import type { Listing } from '@/types/listing';
import './home-buying-banner.css';

export default function HomeBuyingBanner({ listings }: { listings: Listing[] }) {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [failedImages, setFailedImages] = useState<string[]>([]);
  const reduceMotion = useReducedMotion();
  const photos = useMemo(() => {
    const available = filterPubliclyVisible(listings)
      .filter((listing) => listing.mode === 'sale' && ['food_truck', 'food_trailer'].includes(listing.category))
      .map((listing) => ({ id: listing.id, title: listing.title, subcategory: listing.subcategory,
        src: listing.cover_image_url || listing.image_urls?.[0] }))
      .filter((photo) => photo.src && !failedImages.includes(photo.src));
    // Prefer variety when the current inventory actually includes these concepts.
    // Never label a general-purpose kitchen as a particular cuisine.
    const preferred = [/taco/i, /ice.?cream/i, /burger/i].map((pattern) =>
      available.find((photo) => pattern.test(`${photo.title} ${photo.subcategory ?? ''}`)),
    ).filter(Boolean);
    return [...preferred, ...available].filter((photo, index, all) =>
      all.findIndex((other) => other.src === photo.src) === index,
    ).slice(0, 3);
  }, [listings, failedImages]);
  const current = active % Math.max(photos.length, 1);

  useEffect(() => {
    if (reduceMotion || paused || hovered || photos.length < 2) return;
    const timer = window.setInterval(() => {
      if (!document.hidden) setActive((index) => index + 1);
    }, 5500);
    return () => window.clearInterval(timer);
  }, [reduceMotion, paused, hovered, photos.length]);

  if (!photos.length) return null;

  return (
    <section className="hb-buying-wrap hb-wrap" aria-label="Explore buying on Vendibook">
      <div className="hb-buying-banner" onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
        onFocusCapture={() => setHovered(true)} onBlurCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setHovered(false); }}>
        <div className="hb-buying-photos" aria-hidden="true">
          {photos.map((photo, index) => <img key={photo.src} src={photo.src} alt="" loading="lazy" decoding="async"
            className={index === current ? 'is-active' : ''}
            onError={() => setFailedImages((failed) => [...failed, photo.src])} />)}
        </div>
        <div className="hb-buying-shade" />
        <div className="hb-buying-copy">
          <p className="hb-buying-eyebrow">Your next chapter, on wheels.</p>
          <h2>See it. Love it.<br />Make it yours.</h2>
          <Link to="/buy-on-vendibook" className="hb-buying-cta" data-cta-location="home_buying_banner">
            Explore buying on Vendibook <ArrowUpRight size={17} aria-hidden="true" />
          </Link>
        </div>
        <div className="hb-buying-caption"><span>From the marketplace</span><p>{photos[current].title}</p></div>
        {photos.length > 1 && <div className="hb-buying-controls" aria-label="Listing photos">
          {photos.map((photo, index) => <button key={photo.src} type="button" className="hb-buying-dot"
            aria-label={`Show photo: ${photo.title}`} aria-pressed={index === current}
            onClick={() => { setActive(index); setPaused(true); }}><span /></button>)}
          <button type="button" className="hb-buying-pause" aria-label={paused ? 'Play photo rotation' : 'Pause photo rotation'}
            disabled={!!reduceMotion} onClick={() => setPaused((value) => !value)}>
            {paused || reduceMotion ? <Play size={13} aria-hidden="true" /> : <Pause size={13} aria-hidden="true" />}
          </button>
        </div>}
      </div>
    </section>
  );
}
