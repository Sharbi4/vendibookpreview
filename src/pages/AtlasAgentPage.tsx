import type { ComponentType } from 'react';
import {
  CalendarDays,
  ChefHat,
  ClipboardCheck,
  DollarSign,
  Megaphone,
  MapPin,
  MessageCircle,
  Phone,
  Rocket,
  ShoppingBag,
  Store,
  Truck,
} from 'lucide-react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import SEO from '@/components/SEO';
import { startAtlas, type AtlasTopic } from '@/lib/atlas/atlasFlag';
import '@/components/atlas/atlas.css';

type Icon = ComponentType<{ className?: string; 'aria-hidden'?: boolean | 'true' | 'false' }>;

const HELP: { topic: AtlasTopic; icon: Icon; title: string; cta: string; points: string[] }[] = [
  {
    topic: 'buy',
    icon: Truck,
    title: 'Buy a truck or trailer',
    cta: 'Help me buy',
    points: [
      'Finds listings that fit what you cook, your budget and your tow vehicle',
      'Walks you through each one on screen, checks delivery or shipping to your ZIP',
      'Reaches out to the seller and negotiates for you, with your OK',
    ],
  },
  {
    topic: 'rent',
    icon: CalendarDays,
    title: 'Rent one',
    cta: 'Help me rent',
    points: [
      'Finds rentals near you for an event, a season or a trial run',
      'Explains the daily, weekly and monthly rates and the fees',
      'Gets you to the dates and booking request',
    ],
  },
  {
    topic: 'list',
    icon: Store,
    title: 'Sell or rent out yours',
    cta: 'Help me list mine',
    points: [
      'Walks you through creating a listing that gets messages',
      'Photos to take, what to write, how to price it',
      'Rent it while you sell it, so it earns while it waits',
    ],
  },
  {
    topic: 'launch',
    icon: Rocket,
    title: 'Launch and grow after you buy',
    cta: 'Help me launch',
    points: [
      'Menu ideas that fit your equipment and your city',
      'Where to set up, permits checklist and marketing',
      'Ways to earn more: catering, events, renting it out',
    ],
  },
];

const COACH: { icon: Icon; title: string; body: string }[] = [
  { icon: ChefHat, title: 'A menu that sells', body: 'A few signature items built on your equipment, plus a crowd-pleaser that is cheap to make.' },
  { icon: DollarSign, title: 'Price it right', body: 'Work out food cost per plate and what to charge, using your own numbers.' },
  { icon: MapPin, title: 'Where to set up', body: 'Breweries, office lunch spots, markets, festivals and regular weekly stops.' },
  { icon: ClipboardCheck, title: 'Get organized', body: 'A launch checklist: permits and inspection, commissary, POS, suppliers and prep.' },
  { icon: Megaphone, title: 'Get the word out', body: 'Social posts, a Google Business Profile, your weekly schedule and an opening special.' },
  { icon: ShoppingBag, title: 'Earn more', body: 'Catering and private events, and renting it out on Vendibook on days you are not using it.' },
];

const FAQ: { q: string; a: string }[] = [
  { q: 'Is Atlas a person?', a: 'Atlas is Vendibook’s AI agent. Want a real person? Ask him: he’ll set up a follow-up from the Vendibook team within 2 hours (Monday to Friday, 8 AM to 8 PM Eastern) and give you a reference number.' },
  { q: 'Does it cost anything?', a: 'No. Talking with Atlas is free.' },
  { q: 'What will he do on my screen?', a: 'He opens listings and pages, scrolls to and highlights things, fills in searches and ZIP codes, and can fill in your listing with you as you answer his questions. He never presses pay, buy, sign in, publish or send offer for you, and never ticks agreements or uploads photos.' },
  { q: 'Can he contact a seller for me?', a: 'Yes, if you’re signed in. He shows you the message first and only sends it after you say yes. Sellers reply in your Vendibook inbox.' },
  { q: 'Can I type instead of talk?', a: 'Yes. Press the chat button to talk to Atlas by typing.' },
  { q: 'Are calls recorded?', a: 'Calls may be recorded to improve the service.' },
];

const orange = 'inline-flex items-center justify-center gap-2 rounded-full bg-[#FF5124] font-semibold text-white shadow-[0_0_0_1px_rgba(255,255,255,0.12)_inset,0_12px_40px_rgba(255,81,36,0.45)] transition hover:bg-[#FF6A3D] hover:shadow-[0_0_0_1px_rgba(255,255,255,0.18)_inset,0_16px_48px_rgba(255,81,36,0.6)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF8A66]';
// Card buttons: same orange, tighter glow so it doesn't bleed across the card.
const orangeSm = 'inline-flex items-center justify-center gap-2 rounded-full bg-[#FF5124] font-semibold text-white shadow-[0_6px_18px_rgba(255,81,36,0.35)] transition hover:bg-[#FF6A3D] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF8A66]';
const glass = 'inline-flex items-center justify-center gap-2 rounded-full border border-white/15 bg-white/[0.06] font-semibold text-white backdrop-blur transition hover:border-white/35 hover:bg-white/[0.1] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF8A66]';
const eyebrow = 'text-[12px] font-semibold uppercase tracking-[0.18em] text-[#FF8A66]';

export default function AtlasAgentPage() {
  return (
    <div className="atlas-page flex min-h-screen flex-col bg-[#0B0A09] text-white">
      <SEO
        title="Atlas, your Vendibook agent: buy, rent, sell and launch a food truck"
        description="Talk to Atlas, Vendibook's AI agent. He finds food trucks and trailers that fit you, walks you through listings, reaches out to sellers with your OK, helps you list yours, and coaches your launch."
        canonical="https://vendibook.com/atlas"
      />
      <Header />
      <main className="relative flex-1 overflow-hidden">
        <div className="atlas-page-grid" aria-hidden="true" />
        <div className="atlas-page-glow" aria-hidden="true" />

        {/* Hero: the large inline call card. */}
        <section className="relative px-4 pb-14 pt-14 sm:pt-20">
          <div className="mx-auto max-w-3xl text-center">
            <div className="atlas-page-orb mx-auto">
              <span className="atlas-orb is-active" style={{ width: 128, height: 128 }} aria-hidden="true" />
            </div>
            <p className={`${eyebrow} mt-8`}>Atlas · Vendibook AI agent</p>
            <h1 className="mt-3 text-[36px] font-bold leading-[1.05] tracking-tight sm:text-[56px]">
              Speak to our agent <span className="atlas-page-gradient">Atlas</span>
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-[16px] leading-relaxed text-white/65 sm:text-[17px]">
              Buying, renting or selling a food truck or trailer, or growing the business after you buy: Atlas talks it through with you and works the site on your screen in real time.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <button type="button" className={`${orange} h-14 w-full px-9 text-[17px] sm:w-auto`} onClick={() => startAtlas({ mode: 'voice' })}>
                <Phone className="h-5 w-5" aria-hidden="true" /> Start a call
              </button>
              <button type="button" className={`${glass} h-14 w-full px-7 text-[16px] sm:w-auto`} onClick={() => startAtlas({ mode: 'text' })}>
                <MessageCircle className="h-5 w-5" aria-hidden="true" /> Chat by typing
              </button>
            </div>
          </div>
        </section>

        {/* What can he help with? */}
        <section className="relative px-4 py-12" aria-labelledby="atlas-help">
          <div className="mx-auto max-w-6xl">
            <p className={`${eyebrow} text-center`}>One agent, every step</p>
            <h2 id="atlas-help" className="mt-2 text-center text-[26px] font-bold tracking-tight sm:text-[34px]">What can Atlas help you with?</h2>
            <div className="mt-9 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {HELP.map(({ topic, icon: IconC, title, cta, points }) => (
                <article key={topic} className="atlas-page-card flex flex-col p-5">
                  <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#FF5124]/15 text-[#FF8A66] ring-1 ring-[#FF5124]/30">
                    <IconC className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <h3 className="mt-4 text-[17px] font-semibold">{title}</h3>
                  <ul className="mt-2 flex-1 space-y-1.5 text-[14px] leading-snug text-white/65">
                    {points.map((pt) => (
                      <li key={pt} className="flex gap-2">
                        <span className="mt-[7px] h-1.5 w-1.5 flex-none rounded-full bg-[#FF5124] shadow-[0_0_8px_#FF5124]" aria-hidden="true" />
                        {pt}
                      </li>
                    ))}
                  </ul>
                  <button type="button" className={`${orangeSm} mt-5 h-11 px-5 text-[15px]`} onClick={() => startAtlas({ mode: 'voice', topic })}>
                    <Phone className="h-4 w-4" aria-hidden="true" /> {cta}
                  </button>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* After the purchase. */}
        <section className="relative px-4 py-12" aria-labelledby="atlas-coach">
          <div className="atlas-page-card mx-auto max-w-6xl px-6 py-10 sm:px-10">
            <p className={eyebrow}>After the purchase</p>
            <h2 id="atlas-coach" className="mt-2 text-[26px] font-bold tracking-tight sm:text-[34px]">Your launch coach</h2>
            <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-white/65">
              Got the keys? Call Atlas back and plan the business together. Ideas are suggestions to talk through, not promises of what you'll earn.
            </p>
            <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {COACH.map(({ icon: IconC, title, body }) => (
                <div key={title} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 transition hover:border-[#FF5124]/40">
                  <IconC className="h-5 w-5 text-[#FF8A66]" aria-hidden="true" />
                  <h3 className="mt-3 text-[16px] font-semibold">{title}</h3>
                  <p className="mt-1 text-[14px] leading-snug text-white/65">{body}</p>
                </div>
              ))}
            </div>
            <button type="button" className={`${orange} mt-8 h-12 px-6 text-[16px]`} onClick={() => startAtlas({ mode: 'voice', topic: 'launch' })}>
              <Rocket className="h-4 w-4" aria-hidden="true" /> Plan my launch with Atlas
            </button>
          </div>
        </section>

        {/* Questions. */}
        <section className="relative px-4 pb-20 pt-8" aria-labelledby="atlas-faq">
          <div className="mx-auto max-w-3xl">
            <h2 id="atlas-faq" className="text-[24px] font-bold tracking-tight sm:text-[28px]">Questions about Atlas</h2>
            <div className="atlas-page-card mt-5 divide-y divide-white/10">
              {FAQ.map(({ q, a }) => (
                <details key={q} className="group px-5 py-4">
                  <summary className="cursor-pointer list-none text-[15.5px] font-semibold marker:hidden">
                    <span className="flex items-center justify-between gap-4">
                      {q}
                      <span className="text-[20px] leading-none text-[#FF8A66] transition group-open:rotate-45" aria-hidden="true">+</span>
                    </span>
                  </summary>
                  <p className="mt-2 text-[14.5px] leading-relaxed text-white/65">{a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
