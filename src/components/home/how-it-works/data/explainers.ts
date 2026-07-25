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
  durationMs: number;
  caption: string;
  chapterLabel: string;
}

export interface Explainer {
  id: ExplainerType;
  title: string;
  tileHeadline: string;
  description: string;
  durationSeconds: number;
  accessory: VendiAccessory;
  /** Cinematic hero image used behind the tile and as scene backdrop. */
  heroImage: string;
  /** Future MP4 slot. When set, modal renders <video> instead of AnimatedExplainer. */
  videoSource?: string;
  captionsVtt?: string;
  /** Long-form narrative for SEO/accessibility. Not read by the runtime player. */
  transcript: string;
  ctaLabel: string;
  ctaRoute: string;
  secondaryCtaLabel: string;
  secondaryCtaRoute: string;
  scenes: SceneDef[];
}

/**
 * Compose 3 tight scenes. `sceneIndices` picks which of the 8 available
 * scene components in a bank to reuse (visuals only — the captions on this
 * player come from the short strings below, not from any caption baked
 * inside the scene component).
 */
const build3 = (
  bank: Array<() => JSX.Element>,
  sceneIndices: [number, number, number],
  captions: [string, string, string],
  chapterLabels: [string, string, string],
  perSceneMs = 7000,
): SceneDef[] =>
  sceneIndices.map((idx, i) => ({
    Component: bank[idx] as ComponentType,
    durationMs: perSceneMs,
    caption: captions[i],
    chapterLabel: chapterLabels[i],
  }));

export const explainers: Explainer[] = [
  {
    id: 'buying',
    title: 'Buying on Vendibook',
    tileHeadline: 'How Buying Works',
    description:
      'Compare listings, message sellers, and pay protected — all from one dashboard.',
    durationSeconds: 21,
    accessory: 'search',
    heroImage: buyingHero,
    ctaLabel: 'Browse Food Trucks & Trailers',
    ctaRoute: '/browse',
    secondaryCtaLabel: 'Learn About Buying',
    secondaryCtaRoute: '/how-it-works',
    transcript:
      'Search real food-truck and trailer inventory. Message sellers directly on the listing. Pay through Vendibook — buyer protection, receipts, and handoff confirmations all in one dashboard.',
    scenes: build3(
      buyingScenes,
      [0, 3, 5],
      [
        'Search real inventory.',
        'Message the seller.',
        'Pay protected — one dashboard.',
      ],
      ['Search', 'Message', 'Buyer dashboard'],
    ),
  },

  {
    id: 'renting',
    title: 'Renting on Vendibook',
    tileHeadline: 'How Renting Works',
    description:
      'Pick your dates, send one request, and manage the rental from one dashboard.',
    durationSeconds: 21,
    accessory: 'calendar',
    heroImage: rentingHero,
    ctaLabel: 'Explore Rentals',
    ctaRoute: '/browse?mode=rent',
    secondaryCtaLabel: 'How Rentals Work',
    secondaryCtaRoute: '/how-it-works',
    transcript:
      'Choose your dates on the booking calendar. Submit one request with docs and payment. Track the rental, documents, and payout status from one dashboard.',
    scenes: build3(
      rentingScenes,
      [2, 3, 6],
      [
        'Pick your dates.',
        'Send one request.',
        'Rental, docs, payment — one place.',
      ],
      ['Calendar', 'Request', 'Renter dashboard'],
    ),
  },

  {
    id: 'selling',
    title: 'Selling on Vendibook',
    tileHeadline: 'How Selling Works',
    description:
      'List free in minutes, reach serious buyers, and get paid — protected.',
    durationSeconds: 21,
    accessory: 'camera',
    heroImage: sellingHero,
    ctaLabel: 'Sell on Vendibook',
    ctaRoute: '/list',
    secondaryCtaLabel: 'Explore Selling Tools',
    secondaryCtaRoute: '/how-it-works-seller',
    transcript:
      'Create your listing free. Reach buyers already searching for food-business equipment. Get paid through Vendibook with buyer protection and clear handoff steps.',
    scenes: build3(
      sellingScenes,
      [1, 4, 5],
      [
        'List free in minutes.',
        'Reach serious buyers.',
        'Get paid — protected.',
      ],
      ['Publish', 'Buyers', 'Payout'],
    ),
  },

  {
    id: 'hosting',
    title: 'Hosting on Vendibook',
    tileHeadline: 'How Hosting Works',
    description:
      'Open your calendar, approve real requests, and get paid 24 hours after return.',
    durationSeconds: 21,
    accessory: 'dashboard',
    heroImage: hostingHero,
    ctaLabel: 'Become a Host',
    ctaRoute: '/how-it-works-host',
    secondaryCtaLabel: 'See Hosting Benefits',
    secondaryCtaRoute: '/how-it-works-host',
    transcript:
      'Open your host calendar. Review and approve real booking requests. Track payments and payouts — you get paid 24 hours after each rental ends.',
    scenes: build3(
      hostingScenes,
      [2, 3, 5],
      [
        'Open your calendar.',
        'Approve real requests.',
        'Payouts 24 hours after return.',
      ],
      ['Calendar', 'Approve', 'Payouts'],
    ),
  },
];

export const getExplainer = (id: ExplainerType) =>
  explainers.find((e) => e.id === id)!;
