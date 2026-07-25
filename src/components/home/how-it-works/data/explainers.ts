import type { ComponentType } from 'react';
import { buyingScenes } from '../scenes/BuyingScenes';
import { rentingScenes } from '../scenes/RentingScenes';
import { sellingScenes } from '../scenes/SellingScenes';
import { hostingScenes } from '../scenes/HostingScenes';
import type { VendiAccessory } from '../Vendi';
import buyingHero from '@/assets/how-buying-hero.jpg';
import rentingHero from '@/assets/how-renting-hero.jpg';
import sellingHero from '@/assets/how-selling-hero.jpg';
import hostingHero from '@/assets/how-hosting-hero.jpg';

export type ExplainerType = 'buying' | 'renting' | 'selling' | 'hosting';

export interface SceneDef {
  Component: ComponentType;
  /** Sentence spoken while this scene is on screen (also renders as caption). */
  caption: string;
  chapterLabel: string;
  /** Relative weight for time allocation — defaults to word count. */
  weight?: number;
}

export interface Explainer {
  id: ExplainerType;
  title: string;
  tileHeadline: string;
  description: string;
  /** Approx spoken duration; refined at runtime from real audio.duration. */
  durationSeconds: number;
  accessory: VendiAccessory;
  heroImage: string;
  /** Full narration script — spoken end-to-end by the TTS engine. */
  narrationScript: string;
  /** One caption per scene, in the same order the sentences are spoken. */
  scenes: SceneDef[];
  ctaLabel: string;
  ctaRoute: string;
  secondaryCtaLabel: string;
  secondaryCtaRoute: string;
  transcript: string;
}

const build = (
  bank: Array<() => JSX.Element>,
  sceneIndices: number[],
  captions: string[],
  chapterLabels: string[],
): SceneDef[] =>
  sceneIndices.map((idx, i) => ({
    Component: bank[idx] as ComponentType,
    caption: captions[i],
    chapterLabel: chapterLabels[i] ?? captions[i],
    weight: (captions[i].match(/\S+/g) ?? []).length,
  }));

// Scripts are the authoritative source for both TTS and captions.
// Each sentence maps 1:1 to one scene, in order. Scenes render real UI
// (search results, listing detail, checkout w/ Affirm, agreement signing,
// host dashboard, PermitPath) — the mascot only appears in the closing frame.

const BUYING_SENTENCES = [
  'Buying a food truck is a big deal — Vendibook makes it safe.',
  'Browse verified listings with real photos and specs.',
  'Message sellers and make offers directly.',
  'Pay by card, or split it into monthly payments with Affirm.',
  'Your money stays protected until you confirm delivery.',
  'And every permit and license you need? Our free PermitPath tool maps it out.',
  'Find your truck on Vendibook.',
];

const RENTING_SENTENCES = [
  'Need a food truck or commercial kitchen — without buying one?',
  'Search by city and pick your dates on a live calendar.',
  'Send a request, and pay securely when the host approves.',
  'Your rental agreement is signed online, free.',
  'Track your rental, message your host, and manage it all from one dashboard.',
  'Rent with confidence on Vendibook.',
];

const SELLING_SENTENCES = [
  'Ready to sell your truck or trailer?',
  'List it free in minutes with photos and specs.',
  'Our tools help you write a listing that sells — and Featured placement gets you seen first.',
  'Serious buyers message you and make offers.',
  'Payments are protected, and your bill of sale is signed online.',
  'Sell faster on Vendibook.',
];

const HOSTING_SENTENCES = [
  'Own a commercial kitchen or vendor space? Turn it into income.',
  'List free, set your own calendar and rates.',
  'Review and approve booking requests in one tap.',
  'Agreements sign online, and payouts land straight in your bank.',
  'Track earnings and bookings from your host dashboard.',
  'Start hosting on Vendibook.',
];

export const explainers: Explainer[] = [
  {
    id: 'buying',
    title: 'Buying on Vendibook',
    tileHeadline: 'How Buying Works',
    description:
      'Browse verified listings, message sellers, and pay protected — all from one dashboard.',
    durationSeconds: 28,
    accessory: 'none',
    heroImage: buyingHero,
    narrationScript: BUYING_SENTENCES.join(' '),
    // Sentence -> scene:
    // 1) Marketplace intro (0)
    // 2) Verified listings & search (1)
    // 3) Listing detail + messaging (3)
    // 4) Checkout with card & Affirm (4)
    // 5) Protected payment status (5)
    // 6) PermitPath / requirements (2)
    // 7) Close (7)
    scenes: build(
      buyingScenes,
      [0, 1, 3, 4, 5, 2, 7],
      BUYING_SENTENCES,
      [
        'Intro',
        'Verified listings',
        'Message & offer',
        'Card or Affirm',
        'Protected payment',
        'PermitPath',
        'Close',
      ],
    ),
    ctaLabel: 'Browse Food Trucks & Trailers',
    ctaRoute: '/browse',
    secondaryCtaLabel: 'Learn About Buying',
    secondaryCtaRoute: '/how-it-works',
    transcript: BUYING_SENTENCES.join(' '),
  },
  {
    id: 'renting',
    title: 'Renting on Vendibook',
    tileHeadline: 'How Renting Works',
    description:
      'Pick your dates, send one request, and manage the rental from one dashboard.',
    durationSeconds: 26,
    accessory: 'none',
    heroImage: rentingHero,
    narrationScript: RENTING_SENTENCES.join(' '),
    // Sentence -> scene:
    // 1) Rental intro (0)
    // 2) Live calendar (2)
    // 3) Request & approval / secure pay (4)
    // 4) Agreement signed online (5)
    // 5) Rental dashboard (6)
    // 6) Close (7)
    scenes: build(
      rentingScenes,
      [0, 2, 4, 5, 6, 7],
      RENTING_SENTENCES,
      [
        'Intro',
        'Calendar',
        'Request & pay',
        'Agreement',
        'Dashboard',
        'Close',
      ],
    ),
    ctaLabel: 'Explore Rentals',
    ctaRoute: '/browse?mode=rent',
    secondaryCtaLabel: 'How Rentals Work',
    secondaryCtaRoute: '/how-it-works',
    transcript: RENTING_SENTENCES.join(' '),
  },
  {
    id: 'selling',
    title: 'Selling on Vendibook',
    tileHeadline: 'How Selling Works',
    description:
      'List free in minutes, reach serious buyers, and get paid — protected.',
    durationSeconds: 28,
    accessory: 'none',
    heroImage: sellingHero,
    narrationScript: SELLING_SENTENCES.join(' '),
    // Sentence -> scene:
    // 1) Selling intro (0)
    // 2) List free + wizard (1)
    // 3) Listing tools & Featured placement (3)
    // 4) Buyer offers (4)
    // 5) Protected payment + bill of sale (5)
    // 6) Close (7)
    scenes: build(
      sellingScenes,
      [0, 1, 3, 4, 5, 7],
      SELLING_SENTENCES,
      [
        'Intro',
        'List free',
        'Featured placement',
        'Offers',
        'Protected payment',
        'Close',
      ],
    ),
    ctaLabel: 'Sell on Vendibook',
    ctaRoute: '/list',
    secondaryCtaLabel: 'Explore Selling Tools',
    secondaryCtaRoute: '/how-it-works-seller',
    transcript: SELLING_SENTENCES.join(' '),
  },
  {
    id: 'hosting',
    title: 'Hosting on Vendibook',
    tileHeadline: 'How Hosting Works',
    description:
      'Open your calendar, approve real requests, and get paid straight to your bank.',
    durationSeconds: 26,
    accessory: 'none',
    heroImage: hostingHero,
    narrationScript: HOSTING_SENTENCES.join(' '),
    // Sentence -> scene:
    // 1) Hosting intro (0)
    // 2) Calendar & rates (2)
    // 3) Approve requests (3)
    // 4) Payouts / agreements (5)
    // 5) Host dashboard (4)
    // 6) Close (7)
    scenes: build(
      hostingScenes,
      [0, 2, 3, 5, 4, 7],
      HOSTING_SENTENCES,
      [
        'Intro',
        'Calendar & rates',
        'Approve requests',
        'Payouts',
        'Host dashboard',
        'Close',
      ],
    ),
    ctaLabel: 'Become a Host',
    ctaRoute: '/how-it-works-host',
    secondaryCtaLabel: 'See Hosting Benefits',
    secondaryCtaRoute: '/how-it-works-host',
    transcript: HOSTING_SENTENCES.join(' '),
  },
];

export const getExplainer = (id: ExplainerType) =>
  explainers.find((e) => e.id === id)!;
