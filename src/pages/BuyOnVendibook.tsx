import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, BadgeCheck, FileSignature, MapPinned, Navigation, Play, ShieldCheck, Truck, Video } from 'lucide-react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import SEO from '@/components/SEO';
import { Button } from '@/components/ui/button';
import { GuideBreadcrumb } from '@/components/education/GuideBreadcrumb';
import { FINANCING_FOOTNOTE } from '@/lib/financing/copy';
import { supabase } from '@/integrations/supabase/client';
import { filterPubliclyVisible } from '@/lib/listings/publicVisibility';
import type { Listing } from '@/types/listing';
import ListingCard from '@/components/listing/ListingCard';

const VIDEO_ID = 'CuMMcINEezs';

const steps = [
  { icon: Truck, title: 'Find your truck or trailer', body: 'Compare the seller’s photos, equipment list, condition, location, and asking price. Ask questions before you commit.' },
  { icon: Video, title: 'See it before you decide', body: 'Request a live video walkthrough where the seller offers one. Arrange an independent inspection when you need a closer look.' },
  { icon: FileSignature, title: 'Agree, sign, and pay online', body: 'Make an offer or submit purchase details. Once the seller accepts, review the agreement, delivery choice, and final total, then pay through Vendibook checkout.' },
  { icon: MapPinned, title: 'Follow the order to handoff', body: 'Open Transactions for payment, delivery, paperwork, and handoff updates. Live location appears only while the delivery driver is actively sharing it.' },
];

export default function BuyOnVendibook() {
  const [playVideo, setPlayVideo] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locationState, setLocationState] = useState<'idle' | 'loading' | 'denied'>('idle');

  const requestLocation = () => {
    if (!navigator.geolocation) { setLocationState('denied'); return; }
    setLocationState('loading');
    navigator.geolocation.getCurrentPosition(
      ({ coords: position }) => { setCoords({ lat: position.latitude, lng: position.longitude }); setLocationState('idle'); },
      () => setLocationState('denied'),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 600000 },
    );
  };

  useEffect(() => {
    // Reuse permission already granted; a new visitor can opt in with the button.
    if (!navigator.permissions) return;
    void navigator.permissions.query({ name: 'geolocation' }).then((permission) => {
      if (permission.state === 'granted') requestLocation();
    }).catch(() => undefined);
  }, []);

  const nearby = useQuery({
    queryKey: ['buy-on-vendibook-nearby', coords],
    enabled: !!coords,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('search-listings', {
        body: { mode: 'sale', latitude: coords!.lat, longitude: coords!.lng, radius_miles: 500, auto_expand_radius: false, page: 1, page_size: 6, sort_by: 'distance' },
      });
      if (error) throw error;
      return filterPubliclyVisible((data?.listings ?? []) as Listing[]);
    },
  });
  const nearbyHref = coords ? `/search?mode=sale&lat=${coords.lat}&lng=${coords.lng}&radius=500&sort=distance` : '/search?mode=sale';

  return (
    <div className="sale-light flex min-h-screen flex-col overflow-x-hidden bg-[#faf8f5]">
      <SEO
        title="Buy a Food Truck or Food Trailer on Vendibook"
        description="Explore food trucks and food trailers for sale on Vendibook. See how walkthroughs, offers, online checkout, financing, delivery, signatures, and order tracking fit together."
        canonical="/buy-on-vendibook"
      />
      <Header />
      <main className="flex-1 pb-24 md:pb-0">
        <section className="relative overflow-hidden bg-[#f7f3ee] pb-16 pt-5 md:pb-24">
          <div className="pointer-events-none absolute -right-20 top-0 h-80 w-80 rounded-full bg-[#f66b32]/10 blur-3xl" aria-hidden />
          <div className="container relative mx-auto max-w-6xl px-4">
            <GuideBreadcrumb items={[{ label: 'Home', to: '/' }, { label: 'Buy on Vendibook' }]} className="mb-12" />
            <div className="grid items-center gap-12 lg:grid-cols-[1fr,0.93fr]">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#c9532a]">The buyer experience</p>
                <h1 className="mt-5 max-w-3xl text-4xl font-semibold leading-[1.06] tracking-tight text-[#222629] sm:text-5xl lg:text-6xl">Buy the right food truck. Know what happens next.</h1>
                <p className="mt-7 max-w-xl text-lg leading-8 text-[#59616a]">From the first live walkthrough to the final signature, your listing, offer, payment, delivery, and handoff stay connected in one order.</p>
                <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                  <Button variant="cta" size="lg" className="rounded-full" asChild><Link to="/food-trucks-for-sale">Shop food trucks <ArrowRight className="ml-2 h-4 w-4" /></Link></Button>
                  <Button variant="cta-outline" size="lg" className="rounded-full" asChild><Link to="/food-trailers-for-sale">Shop food trailers</Link></Button>
                </div>
                <p className="mt-6 flex items-center gap-2 text-sm text-[#58616a]"><ShieldCheck className="h-4 w-4 text-[#c9532a]" /> Review the details and final total before paying.</p>
              </div>
              <figure className="group overflow-hidden rounded-[28px] border border-[#e5ddd3] bg-white p-2 shadow-[0_30px_75px_-42px_#36292366] transition-shadow duration-500 hover:shadow-[0_40px_90px_-35px_#36292388]">
                <div className="overflow-hidden rounded-[22px]"><img src="/images/operations/buyer-order-journey.png" alt="Illustrative Vendibook order showing food truck delivery progress, a map, walkthrough, signatures, and receipt confirmation" width="1536" height="1024" className="w-full transition-transform duration-700 ease-out group-hover:scale-[1.035] motion-reduce:transition-none" fetchPriority="high" /></div>
                <figcaption className="px-4 py-3 text-xs text-[#70777c]">Illustrative order. Live location and route estimates appear when a driver actively shares them.</figcaption>
              </figure>
            </div>
          </div>
        </section>

        <section className="border-y border-[#e8e0d8] bg-white py-16 md:py-20" aria-labelledby="nearby-title">
          <div className="container mx-auto max-w-6xl px-4">
            <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
              <div><p className="text-xs font-bold uppercase tracking-[0.2em] text-[#c9532a]">Explore nearby</p><h2 id="nearby-title" className="mt-3 text-3xl font-semibold tracking-tight text-[#222629] sm:text-4xl">Find your next truck closer to home.</h2><p className="mt-4 max-w-xl leading-7 text-[#59616a]">Browse food trucks and trailers for sale within 500 miles of your location. Your browser shares your position only if you allow it.</p></div>
              <div className="flex flex-wrap gap-3"><Button variant="cta" className="rounded-full" onClick={requestLocation} disabled={locationState === 'loading'}><Navigation className="mr-2 h-4 w-4" />{locationState === 'loading' ? 'Finding your area…' : coords ? 'Update my location' : 'Use my location'}</Button><Button variant="cta-outline" className="rounded-full" asChild><Link to={nearbyHref}>Browse all for sale <ArrowRight className="ml-2 h-4 w-4" /></Link></Button></div>
            </div>
            {locationState === 'denied' && <p className="mt-6 text-sm text-[#59616a]" role="status">Location isn’t available. You can search by city on the browse page.</p>}
            {nearby.isPending && coords && <p className="mt-8 text-sm text-[#59616a]" role="status">Loading listings near you…</p>}
            {nearby.isError && <p className="mt-8 text-sm text-[#9c4126]" role="alert">Nearby listings couldn’t load right now. Try again or browse all listings.</p>}
            {nearby.isSuccess && nearby.data.length === 0 && <p className="mt-8 text-sm text-[#59616a]">No current sale listings within 500 miles. Browse nationwide inventory or try another city.</p>}
            {nearby.isSuccess && nearby.data.length > 0 && <><div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{nearby.data.map((listing) => <ListingCard key={listing.id} listing={listing} />)}</div><Link to={nearbyHref} className="mt-8 inline-flex items-center gap-2 font-semibold text-[#bd4c23] underline underline-offset-4">See all nearby listings <ArrowRight className="h-4 w-4" /></Link></>}
          </div>
        </section>

        <section className="border-y border-[#e8e0d8] bg-white py-16 md:py-20" aria-labelledby="buy-video-title">
          <div className="container mx-auto grid max-w-6xl items-center gap-12 px-4 lg:grid-cols-[0.9fr,1.1fr]">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#c9532a]">Watch the journey</p>
              <h2 id="buy-video-title" className="mt-4 text-3xl font-semibold tracking-tight text-[#222629] sm:text-4xl">See what buying here feels like.</h2>
              <p className="mt-5 max-w-lg leading-7 text-[#59616a]">Our short video follows a purchase from invoice to handoff. The page below explains each part in more detail.</p>
              <Link to="/how-purchasing-works" className="mt-7 inline-flex items-center gap-2 font-semibold text-[#bd4c23] underline underline-offset-4">Read the full purchase process <ArrowRight className="h-4 w-4" /></Link>
            </div>
            <div className="flex justify-center rounded-[28px] bg-[#25282a] p-5 sm:p-8">
              <div className="aspect-[9/16] w-full max-w-[260px] overflow-hidden rounded-2xl bg-black shadow-2xl">
                {playVideo ? (
                  <iframe title="Buying a food truck on Vendibook: what happens after you buy" src={`https://www.youtube-nocookie.com/embed/${VIDEO_ID}?autoplay=1&rel=0&playsinline=1`} className="h-full w-full" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen />
                ) : (
                  <button type="button" onClick={() => setPlayVideo(true)} aria-label="Play buying on Vendibook video" className="relative h-full w-full text-white">
                    <img src={`https://i.ytimg.com/vi/${VIDEO_ID}/hqdefault.jpg`} alt="" className="h-full w-full object-cover" loading="lazy" />
                    <span className="absolute inset-0 grid place-items-center bg-black/25"><span className="grid h-16 w-16 place-items-center rounded-full bg-[#ef6330] shadow-[0_0_38px_#f36a45aa]"><Play className="ml-1 h-7 w-7 fill-current" /></span></span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </section>

        <section className="bg-[#faf8f5] py-16 md:py-24" aria-labelledby="buy-steps-title">
          <div className="container mx-auto max-w-6xl px-4">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#c9532a]">One connected purchase</p>
            <h2 id="buy-steps-title" className="mt-4 max-w-2xl text-3xl font-semibold tracking-tight text-[#222629] sm:text-4xl">A clear step from search to handoff.</h2>
            <div className="mt-10 grid gap-4 md:grid-cols-2">
              {steps.map(({ icon: Icon, title, body }, index) => <article key={title} className="group relative isolate min-h-64 overflow-hidden rounded-[28px] border border-[#e8e0d8] bg-white p-7 shadow-[0_16px_42px_-35px_#30241c88] transition-[transform,box-shadow,border-color] duration-500 hover:-translate-y-1 hover:border-[#e6ae93] hover:shadow-[0_28px_65px_-38px_#30241c99] motion-reduce:transform-none sm:p-9"><div className="pointer-events-none absolute -right-16 -top-20 h-52 w-52 rounded-full bg-[#f9e5d9]/0 blur-2xl transition-colors duration-500 group-hover:bg-[#f9e5d9]/80" aria-hidden /><div className="relative flex items-start justify-between"><span className="grid h-12 w-12 place-items-center rounded-2xl bg-[#fff0e9] text-[#c9532a] transition-transform duration-500 group-hover:rotate-[-8deg] group-hover:scale-110 motion-reduce:transform-none"><Icon className="h-6 w-6" /></span><span className="text-xs font-medium tracking-[0.2em] text-[#a29a93]">0{index + 1}</span></div><h3 className="relative mt-8 text-xl font-semibold text-[#222629]">{title}</h3><p className="relative mt-3 max-w-md text-sm leading-7 text-[#59616a]">{body}</p><span className="absolute inset-x-7 bottom-0 h-[2px] origin-left scale-x-0 bg-[#e56a3c] transition-transform duration-500 group-hover:scale-x-100 motion-reduce:transition-none" aria-hidden /></article>)}
            </div>
          </div>
        </section>

        <section className="border-y border-[#e8e0d8] bg-white py-16 md:py-24" aria-labelledby="buy-support-title">
          <div className="container mx-auto grid max-w-6xl gap-10 px-4 lg:grid-cols-2">
            <div className="rounded-[28px] bg-[#25282a] p-8 text-white sm:p-10">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#ff986f]">Financing</p>
              <h2 id="buy-support-title" className="mt-4 text-3xl font-semibold tracking-tight">Make room for the right equipment.</h2>
              <p className="mt-5 leading-7 text-white/75">Eligible buyers can apply with a third-party financing partner. Decisions on complete applications typically arrive in 24–48 hours.* Ask about including eligible transportation costs in the financing arrangement.</p>
              <Button variant="cta" className="mt-8 rounded-full" asChild><Link to="/financing">Explore financing <ArrowRight className="ml-2 h-4 w-4" /></Link></Button>
              <p className="mt-6 text-xs leading-5 text-white/60">{FINANCING_FOOTNOTE}</p>
            </div>
            <div className="rounded-[28px] border border-[#e8e0d8] bg-[#f7f3ee] p-8 sm:p-10">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#c9532a]">Pickup & delivery</p>
              <h2 className="mt-4 text-3xl font-semibold tracking-tight text-[#222629]">Near you or across the country.</h2>
              <p className="mt-5 leading-7 text-[#59616a]">Choose buyer pickup, seller delivery when offered, or request Vendibook Freight. Standard Freight coverage is the lower 48 states. Alaska and Hawaii routes can be requested for individual review; availability and price must be confirmed before you commit.</p>
              <Link to="/vendibook-freight" className="mt-8 inline-flex items-center gap-2 font-semibold text-[#bd4c23] underline underline-offset-4">Explore transport options <ArrowRight className="h-4 w-4" /></Link>
            </div>
          </div>
        </section>

        <section className="bg-[#faf8f5] py-16 md:py-24" aria-labelledby="buy-documents-title">
          <div className="container mx-auto grid max-w-6xl gap-10 px-4 lg:grid-cols-[0.8fr,1.2fr] lg:items-center">
            <div><BadgeCheck className="h-9 w-9 text-[#c9532a]" /><h2 id="buy-documents-title" className="mt-5 text-3xl font-semibold tracking-tight text-[#222629] sm:text-4xl">The handoff is on the record.</h2><p className="mt-5 leading-7 text-[#59616a]">At pickup or delivery, review the equipment, document its condition, and complete the required signatures and receipt confirmations. Report an issue before accepting the handoff if something is wrong.</p></div>
            <div className="rounded-[28px] border border-[#e8e0d8] bg-white p-8 sm:p-10"><FileSignature className="h-7 w-7 text-[#c9532a]" /><h3 className="mt-5 text-xl font-semibold text-[#222629]">Agreement, bill of sale, and title</h3><p className="mt-4 text-sm leading-7 text-[#59616a]">Where enabled, both parties sign the purchase agreement and bill of sale electronically through Vendibook’s SignNow integration. The seller and buyer must still complete the title transfer required by their states. Remote title notarization is being prepared and is not yet available in checkout; contact support if your state requires a notarized title.</p><Link to="/contact" className="mt-6 inline-flex items-center gap-2 font-semibold text-[#bd4c23] underline underline-offset-4">Ask about title paperwork <ArrowRight className="h-4 w-4" /></Link></div>
          </div>
        </section>

        <section className="bg-[#25282a] px-4 py-16 text-center text-white md:py-20"><div className="mx-auto max-w-2xl"><h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">Your next food truck starts here.</h2><p className="mt-5 leading-7 text-white/70">Explore real listings, see the equipment live, and follow the purchase all the way to handoff.</p><Button variant="cta" size="lg" className="mt-8 rounded-full" asChild><Link to="/food-trucks-for-sale">Browse equipment for sale <ArrowRight className="ml-2 h-4 w-4" /></Link></Button></div></section>
      </main>
      <Footer />
    </div>
  );
}
