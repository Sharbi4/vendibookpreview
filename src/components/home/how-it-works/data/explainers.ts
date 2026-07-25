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
// Each sentence maps 1:1 to one scene, in order.

const BUYING_SENTENCES = [
  'Looking to buy a food truck?',
  'Browse verified listings, message sellers directly, and make an offer.',
  'Pay securely by card, or finance with Affirm — your money is protected until you confirm delivery.',
  'Track everything from your dashboard.',
  'Find your truck on Vendibook.',
];

const RENTING_SENTENCES = [
  'Need a truck or kitchen for your next event?',
  'Pick your dates, send a request, and pay securely once the host approves.',
  'Your rental agreement is signed online — free.',
  'Manage everything from your dashboard.',
  'Rent with confidence on Vendibook.',
];

const SELLING_SENTENCES = [
  'Selling your food truck or trailer?',
  'List it free in minutes.',
  'Reach serious buyers, accept offers, and get paid with protected payments.',
  'Documents and handoff — all handled in one place.',
  'Sell faster on Vendibook.',
];

const HOSTING_SENTENCES = [
  'Own a commercial kitchen or vendor space?',
  'List it free, set your calendar, and approve booking requests.',
  'Payouts land straight in your bank.',
  'Run it all from your host dashboard.',
  'Start hosting on Vendibook.',
];

export const explainers: Explainer[] = [
  {
    id: 'buying',
    title: 'Buying on Vendibook',
    tileHeadline: 'How Buying Works',
    description:
      'Browse verified listings, message sellers, and pay protected — all from one dashboard.',
    durationSeconds: 22,
    accessory: 'none',
    heroImage: buyingHero,
    narrationScript: BUYING_SENTENCES.join(' '),
    scenes: build(
      buyingScenes,
      [0, 3, 4, 5, 7],
      BUYING_SENTENCES,
      ['Intro', 'Listings & offers', 'Protected payment', 'Dashboard', 'Close'],
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
    durationSeconds: 22,
    accessory: 'none',
    heroImage: rentingHero,
    narrationScript: RENTING_SENTENCES.join(' '),
    scenes: build(
      rentingScenes,
      [0, 2, 3, 6, 7],
      RENTING_SENTENCES,
      ['Intro', 'Dates & request', 'Agreement', 'Dashboard', 'Close'],
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
    durationSeconds: 22,
    accessory: 'none',
    heroImage: sellingHero,
    narrationScript: SELLING_SENTENCES.join(' '),
    scenes: build(
      sellingScenes,
      [0, 1, 4, 5, 7],
      SELLING_SENTENCES,
      ['Intro', 'List free', 'Offers & payout', 'Handoff', 'Close'],
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
    durationSeconds: 22,
    accessory: 'none',
    heroImage: hostingHero,
    narrationScript: HOSTING_SENTENCES.join(' '),
    scenes: build(
      hostingScenes,
      [0, 2, 3, 5, 7],
      HOSTING_SENTENCES,
      ['Intro', 'Calendar & approvals', 'Payouts', 'Dashboard', 'Close'],
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
