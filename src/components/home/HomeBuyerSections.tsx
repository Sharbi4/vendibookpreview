import { useEffect, useRef, useState, type RefObject } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ArrowUpRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EquinoxFundingLogo, PayPalWordmark, PlaidLogo } from '@/components/brand/ProviderLogos';
import { FLIP_INSURANCE } from '@/lib/flipInsurance';
import { trackLeadEvent } from '@/lib/leadTracking';
/*
 * "For sale" card photos: real photos from actual published sale listings
 * (public listing-images bucket). Rotates daily so returning visitors see
 * different real inventory. Do not replace with stock or AI imagery.
 */
const SALE_CARD_PHOTOS = [
  'https://nbrehbwfsmedbelzntqs.supabase.co/storage/v1/object/public/listing-images/b78636fe-5a08-4cb3-b585-88c981f56dfc/446a2b43-2414-4673-9af2-b2fda38bcaf0/1792845421472-s9ub2e.jpg',
  'https://nbrehbwfsmedbelzntqs.supabase.co/storage/v1/object/public/listing-images/4c2cdfa0-e03f-4148-97a9-ebe6e208c2a3/1ade62f4-62d2-4e3b-b854-b65fb9da08aa/1792692408499-1ib0rl.jpeg',
  'https://nbrehbwfsmedbelzntqs.supabase.co/storage/v1/object/public/listing-images/73aee451-57c0-43d7-90e5-b7eddaaee153/c0dedf9e-2c6d-4ccd-9f85-aadfdbe6fccc/1792287511712-scyvn5.jpeg',
  'https://nbrehbwfsmedbelzntqs.supabase.co/storage/v1/object/public/listing-images/b60bfa3e-e495-4597-a31f-00816102e5c4/2ca657ff-abdb-4f81-bd19-c3f657a91c00/1792245299189-qxait.jpeg',
] as const;

const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
const cardSaleImg = SALE_CARD_PHOTOS[dayOfYear % SALE_CARD_PHOTOS.length];
import cardRentImg from '@/assets/food-truck-coffee.jpg';
import cardKitchenImg from '@/assets/home/trust-kitchen.jpg';
import cardFinancingImg from '@/assets/trailer-black.jpg';
import tileFoodTrucksImg from '@/assets/home/hb-tile-food-trucks.jpg';
import tileFoodTrailersImg from '@/assets/home/trust-handoff.jpg';
import tileCoffeeImg from '@/assets/trailer-cafecito.jpg';
import tileIceCreamImg from '@/assets/home/hb-tile-ice-cream.jpg';
import tileTrucksRentImg from '@/assets/food-truck-popcorn.jpg';
import tileTrailersRentImg from '@/assets/trailer-cream-party.jpg';
import tileKitchensImg from '@/assets/concierge-kitchen.jpg';
import tileVendorSpacesImg from '@/assets/home/trust-vendor-lot.jpg';
import sellBandImg from '@/assets/home/hb-sell-band.jpg';

/*
 * Homepage building blocks (IronPlanet-style rhythm, Vendibook brand).
 * Copy guardrails: payment protection only — Vendibook never holds, escrows
 * or safekeeps funds and is never a bank, lender, insurer, broker, agent or
 * party to a sale. Partners provide financing, payments, verification and
 * insurance. No inspection promises, no counts or stats. Every link points at
 * a real route (search modes, CategoryIndex and specialty hub paths).
 */

const SALE_SEARCH_HREF = '/search?mode=sale';
const RENT_SEARCH_HREF = '/search?mode=rent';
const SIGNUP_HREF = '/auth?mode=signup';

/* ── Guarantee + partner strip (directly under the hero) ── */

function SquareWordmark() {
  return (
    <span className="hb-square-mark" aria-label="Square">
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect x="2.5" y="2.5" width="19" height="19" rx="4.5" fill="none" stroke="currentColor" strokeWidth="3" />
        <rect x="8.5" y="8.5" width="7" height="7" rx="1.2" fill="currentColor" />
      </svg>
      Square
    </span>
  );
}

export function HomePartnerStrip({ guaranteeHref, financingLive }: { guaranteeHref: string; financingLive: boolean }) {
  const partners = [
    { key: 'paypal', href: '/payments', role: 'Checkout', mark: <PayPalWordmark surface="dark" className="hb-logo hb-logo-paypal" /> },
    { key: 'square', href: '/payments', role: 'Card payments', mark: <SquareWordmark /> },
    ...(financingLive
      ? [{ key: 'equinox', href: '/financing', role: 'Financing', mark: <EquinoxFundingLogo className="hb-logo hb-logo-equinox" /> }]
      : []),
    { key: 'plaid', href: '/identity-verification', role: 'ID verification', mark: <PlaidLogo surface="light" className="hb-logo hb-logo-plaid" /> },
    {
      key: 'flip',
      href: '/insurance',
      role: 'Vendor insurance',
      mark: <img src={FLIP_INSURANCE.logoUrl} alt="FLIP" width={300} height={138} loading="lazy" className="hb-logo hb-logo-flip" />,
    },
  ];

  return (
    <section className="hb-partners" aria-label="The Vendibook Guarantee and our partners">
      <div className="hb-wrap hb-partners-inner">
        <a href={guaranteeHref} className="hb-partners-guarantee" data-cta-location="home_partner_strip_guarantee">
          <span className="hb-seal" aria-hidden="true">
            <svg viewBox="0 0 48 48">
              <path d="M24 4 40 10v12c0 10.5-6.8 18.6-16 22-9.2-3.4-16-11.5-16-22V10z" fill="currentColor" />
              <path d="m17 24.5 5 5 9.5-10" fill="none" stroke="#fff" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <span>
            <strong>The Vendibook Guarantee</strong>
            <small>Secure checkout and a protected, recorded handoff on every purchase.</small>
          </span>
          <ArrowRight className="hb-partners-arrow" aria-hidden="true" />
        </a>
        <div className="hb-partners-logos">
          <p className="hb-partners-label">Payments, financing, verification &amp; insurance partners</p>
          <ul>
            {partners.map((p) => (
              <li key={p.key}>
                <Link
                  to={p.href}
                  className="hb-partner-link"
                  data-cta-location={`home_partner_${p.key}`}
                  onClick={() => trackLeadEvent('homepage_premium_discovery_click', { source: 'home_partner_strip', card: p.key, destination: p.href })}
                >
                  <span className="hb-partner-mark">{p.mark}</span>
                  <span className="hb-partner-role">{p.role}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

/* ── Buying-flow video (YouTube Short, IronPlanet "inspection video" slot) ── */

const BUYING_VIDEO_ID = 'CuMMcINEezs';
const BUYING_VIDEO_TITLE = 'Buying a food truck on Vendibook: what happens after you buy';
const BUYING_VIDEO_SRC =
  `https://www.youtube-nocookie.com/embed/${BUYING_VIDEO_ID}` +
  `?autoplay=1&mute=1&loop=1&playlist=${BUYING_VIDEO_ID}&playsinline=1&rel=0&modestbranding=1`;

/**
 * Plays muted as soon as it scrolls into view (browsers only allow silent
 * autoplay); viewers unmute with the player's sound button. The YouTube
 * player loads only when the section is near the viewport.
 */
export function HomeGuaranteeVideo() {
  const [load, setLoad] = useState(false);
  const frameRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = frameRef.current;
    if (!el || load) return;
    if (typeof IntersectionObserver === 'undefined') { setLoad(true); return; }
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) { setLoad(true); io.disconnect(); }
    }, { rootMargin: '200px 0px' });
    io.observe(el);
    return () => io.disconnect();
  }, [load]);

  return (
    <figure className="hb-video">
      <div className="hb-video-frame" ref={frameRef}>
        <img
          className="hb-video-poster"
          src={`https://i.ytimg.com/vi/${BUYING_VIDEO_ID}/oardefault.jpg`}
          alt=""
          width={1080}
          height={1920}
          loading="lazy"
          decoding="async"
        />
        {load && (
          <iframe
            src={BUYING_VIDEO_SRC}
            title={BUYING_VIDEO_TITLE}
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
            onLoad={() => trackLeadEvent('homepage_premium_discovery_click', { source: 'home_guarantee_video', destination: `youtube:${BUYING_VIDEO_ID}` })}
          />
        )}
      </div>
      <figcaption>Playing muted. Tap the sound icon to listen: what happens after you buy, from invoice to handoff.</figcaption>
    </figure>
  );
}

/* ── Four photo cards ── */

const FEATURED_CARDS = [
  { key: 'sale', img: cardSaleImg, title: 'For sale', sub: 'Food trucks and trailers from owners across the country', cta: 'Shop for sale', href: SALE_SEARCH_HREF },
  { key: 'rent', img: cardRentImg, title: 'For rent', sub: 'Trucks and trailers by the day, week or month', cta: 'Browse rentals', href: RENT_SEARCH_HREF },
  { key: 'kitchens', img: cardKitchenImg, title: 'Commissary kitchens', sub: 'Licensed prep space near where you vend', cta: 'Find a kitchen', href: '/shared-kitchens-for-rent' },
  { key: 'financing', img: cardFinancingImg, title: 'Financing', sub: 'Apply with Equinox Funding before you make an offer', cta: 'See financing', href: '/financing' },
] as const;

/* ── Touch: phones have no hover, so the card in view lights up instead ── */

/**
 * On touch screens, marks the card nearest the middle of the screen (axis y)
 * or of a swipe row (axis x) with `is-active`, which plays the same orange
 * fill and call to action as the desktop hover. Also fades the cards in, one
 * after another, the first time the list scrolls into view. Off on mouse
 * devices and with reduced motion.
 */
function useTouchSpotlight(listRef: RefObject<HTMLUListElement>, axis: 'x' | 'y', onActive?: (index: number) => void) {
  const onActiveRef = useRef(onActive);
  onActiveRef.current = onActive;
  useEffect(() => {
    const list = listRef.current;
    if (!list || typeof window.matchMedia !== 'function') return;
    const touch = window.matchMedia('(hover: none)');
    const still = window.matchMedia('(prefers-reduced-motion: reduce)');
    const items = () => Array.from(list.querySelectorAll<HTMLElement>('[data-spotlight]'));

    let reveal: IntersectionObserver | null = null;
    if (!still.matches && typeof IntersectionObserver === 'function') {
      list.classList.add('will-reveal');
      reveal = new IntersectionObserver((entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          list.classList.add('is-revealed');
          reveal?.disconnect();
        }
      }, { threshold: 0.15 });
      reveal.observe(list);
    }

    let frame = 0;
    let active: HTMLElement | null = null;
    const update = () => {
      frame = 0;
      const all = items();
      let best: HTMLElement | null = null;
      if (touch.matches && !still.matches) {
        const box = list.getBoundingClientRect();
        const onScreen = box.bottom > 0 && box.top < window.innerHeight;
        const center = axis === 'x' ? box.left + box.width / 2 : window.innerHeight * 0.55;
        let bestDistance = Infinity;
        for (const el of all) {
          const r = el.getBoundingClientRect();
          const mid = axis === 'x' ? r.left + r.width / 2 : r.top + r.height / 2;
          const distance = Math.abs(mid - center);
          if (distance < bestDistance) { bestDistance = distance; best = el; }
        }
        if (!onScreen || (best && axis === 'y' && bestDistance > best.getBoundingClientRect().height)) best = null;
      }
      if (best !== active) {
        active?.classList.remove('is-active');
        best?.classList.add('is-active');
        active = best;
        if (best) onActiveRef.current?.(all.indexOf(best));
      }
    };
    const schedule = () => { if (!frame) frame = window.requestAnimationFrame(update); };
    schedule();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    list.addEventListener('scroll', schedule, { passive: true });
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      list.removeEventListener('scroll', schedule);
      reveal?.disconnect();
      active?.classList.remove('is-active');
    };
  }, [listRef, axis]);
}

export function HomeFeaturedCards() {
  const listRef = useRef<HTMLUListElement>(null);
  const [current, setCurrent] = useState(0);
  useTouchSpotlight(listRef, 'x', setCurrent);
  const goTo = (i: number) => {
    const card = listRef.current?.children[i] as HTMLElement | undefined;
    card?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'start' });
  };
  return (
    <section className="hb-section" aria-labelledby="hb-featured-title">
      <div className="hb-wrap">
        <header className="hb-head">
          <h2 id="hb-featured-title">Buy it, rent it, or finance it</h2>
        </header>
        <ul className="hb-cards" ref={listRef}>
          {FEATURED_CARDS.map((card) => (
            <li key={card.key}>
              <Link
                to={card.href}
                data-spotlight
                className="hb-card"
                data-cta-location={`home_featured_${card.key}`}
                onClick={() => trackLeadEvent('homepage_premium_discovery_click', { source: 'home_featured_cards', card: card.key, destination: card.href })}
              >
                <img src={card.img} alt="" width={800} height={1000} loading="lazy" decoding="async" />
                <span className="hb-card-text">
                  <strong>{card.title}<ArrowUpRight aria-hidden="true" /></strong>
                  <small>{card.sub}</small>
                  <span className="hb-card-cta" aria-hidden="true">{card.cta}<ArrowRight /></span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
        {/* Swipe position on phones (hidden from the 4-up desktop grid). */}
        <div className="hb-cards-dots" aria-hidden="true">
          {FEATURED_CARDS.map((card, i) => (
            <button key={card.key} type="button" tabIndex={-1} className={i === current ? 'is-current' : undefined} onClick={() => goTo(i)} />
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── Signed-out register band ── */

export function HomeRegisterBand() {
  return (
    <section className="hb-register" aria-labelledby="hb-register-title">
      <div className="hb-wrap hb-register-inner">
        <h2 id="hb-register-title">Make offers, request to buy and save listings with a free account.</h2>
        <Link
          to={SIGNUP_HREF}
          className="hb-register-btn"
          data-cta-location="home_register_band"
          onClick={() => trackLeadEvent('homepage_primary_cta_click', { source: 'home_register_band', destination: SIGNUP_HREF })}
        >
          Create free account
        </Link>
      </div>
    </section>
  );
}

/* ── Category tiles ── */

const CATEGORY_TILES = [
  { label: 'Food trucks for sale', href: '/food-trucks-for-sale', img: tileFoodTrucksImg },
  { label: 'Food trailers for sale', href: '/food-trailers-for-sale', img: tileFoodTrailersImg },
  { label: 'Coffee trucks & trailers', href: '/coffee-trucks-trailers-for-sale', img: tileCoffeeImg },
  { label: 'Ice cream trucks & trailers', href: '/ice-cream-trucks-trailers-for-sale', img: tileIceCreamImg },
  { label: 'Food trucks for rent', href: '/food-trucks-for-rent', img: tileTrucksRentImg },
  { label: 'Food trailers for rent', href: '/food-trailers-for-rent', img: tileTrailersRentImg },
  { label: 'Shared kitchens', href: '/shared-kitchens', img: tileKitchensImg },
  { label: 'Vendor spaces', href: '/vendor-spaces', img: tileVendorSpacesImg },
] as const;

export function HomeCategoryTiles() {
  const listRef = useRef<HTMLUListElement>(null);
  useTouchSpotlight(listRef, 'y');
  return (
    <section className="hb-section" aria-labelledby="hb-tiles-title">
      <div className="hb-wrap">
        <header className="hb-head">
          <h2 id="hb-tiles-title">Shop by type</h2>
        </header>
        <ul className="hb-tiles" ref={listRef}>
          {CATEGORY_TILES.map((tile) => (
            <li key={tile.href}>
              <Link
                to={tile.href}
                data-spotlight
                className="hb-tile"
                data-cta-location="home_category_tiles"
                onClick={() => trackLeadEvent('homepage_premium_discovery_click', { source: 'home_category_tiles', destination: tile.href })}
              >
                <img src={tile.img} alt="" width={640} height={480} loading="lazy" decoding="async" />
                <span className="hb-tile-label">{tile.label}<ArrowUpRight aria-hidden="true" /></span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* ── Sell band (full-bleed photo) ── */

export function HomeSellBand({ sellerStartHref }: { sellerStartHref: string }) {
  return (
    <section className="hb-sellband" id="start-selling" aria-labelledby="hb-sell-title">
      <img className="hb-sellband-photo" src={sellBandImg} alt="" width={1600} height={1067} loading="lazy" decoding="async" />
      <div className="hb-sellband-shade" aria-hidden="true" />
      <div className="hb-wrap hb-sellband-inner">
        <h2 id="hb-sell-title">Selling or renting out your truck?</h2>
        <p>
          Listing is free. Vendibook’s fee comes out only when a sale or booking completes.{' '}
          <Link to="/pricing" data-cta-location="home_sell_band_pricing">See pricing</Link>
        </p>
        <Button asChild variant="cta" className="h-[54px] w-full rounded-full px-9 text-base sm:w-auto">
          <Link
            to={sellerStartHref}
            data-cta-location="home_sell_band"
            onClick={() => trackLeadEvent('homepage_host_list_click', { source: 'home_seller_strip', destination: sellerStartHref })}
          >
            List your equipment<ArrowRight aria-hidden="true" />
          </Link>
        </Button>
      </div>
    </section>
  );
}
