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
  transcript: string;
  ctaLabel: string;
  ctaRoute: string;
  secondaryCtaLabel: string;
  secondaryCtaRoute: string;
  scenes: SceneDef[];
}

const buildScenes = (
  fns: Array<() => JSX.Element>,
  captions: string[],
  perSceneMs = 10000,
): SceneDef[] =>
  fns.map((Component, i) => ({
    Component: Component as ComponentType,
    durationMs: perSceneMs,
    caption: captions[i] ?? '',
  }));

export const explainers: Explainer[] = [
  {
    id: 'buying',
    title: 'Buying on Vendibook',
    tileHeadline: 'How Buying Works',
    description:
      'Find a food truck or trailer, connect with the seller, and complete your purchase with greater confidence.',
    durationSeconds: 60,
    accessory: 'search',
    heroImage: buyingHero,
    ctaLabel: 'Browse Food Trucks & Trailers',
    ctaRoute: '/browse',
    secondaryCtaLabel: 'Learn About Buying',
    secondaryCtaRoute: '/how-it-works',
    transcript:
      'Your food business starts with the right equipment. On Vendibook, buyers can search food trucks and trailers by location, price, and equipment type, review photos, seller info, and available documentation, and message sellers directly. When you find the right fit, you can move through the purchase steps together and start serving customers.',
    scenes: buildScenes(buyingScenes, [
      'Your food business starts with the right equipment.',
      'Search. Compare. Find the right fit.',
      'Photos, specs, seller info — all in one place.',
      'Connect directly and make an informed decision.',
      'Sign documents and choose a payment option.',
      'Find the equipment. Build the business.',
    ]),
  },
  {
    id: 'renting',
    title: 'Renting on Vendibook',
    tileHeadline: 'How Renting Works',
    description:
      'Choose your dates, request a rental, complete verification, and manage the rental process in one place.',
    durationSeconds: 60,
    accessory: 'calendar',
    heroImage: rentingHero,
    ctaLabel: 'Explore Rentals',
    ctaRoute: '/browse?mode=rent',
    secondaryCtaLabel: 'How Rentals Work',
    secondaryCtaRoute: '/how-it-works',
    transcript:
      'Renting on Vendibook lets you start sooner without buying upfront. Browse rentals by location and dates, pick the truck or trailer you need, and send a request to the host. Complete identity verification and upload the required documents, then coordinate pickup or delivery through Vendibook messaging.',
    scenes: buildScenes(rentingScenes, [
      'Start sooner without buying upfront.',
      'Browse rentals by location, dates, and equipment.',
      'Pick your dates and send a request.',
      'Clear steps. Organized documentation.',
      'Coordinate pickup or delivery through Vendibook.',
      'Rent the equipment. Test your concept. Grow from there.',
    ]),
  },
  {
    id: 'selling',
    title: 'Selling on Vendibook',
    tileHeadline: 'How Selling Works',
    description:
      'Create a listing, reach serious buyers, manage inquiries, and sell your equipment faster.',
    durationSeconds: 60,
    accessory: 'camera',
    heroImage: sellingHero,
    ctaLabel: 'List Your Food Truck for Free',
    ctaRoute: '/list',
    secondaryCtaLabel: 'Explore Selling Tools',
    secondaryCtaRoute: '/how-it-works-seller',
    transcript:
      'Selling on Vendibook is free. Upload photos, add equipment details and price, and publish your listing. Buyers searching for trucks and trailers will find you. Answer inquiries, schedule inspections, and complete the sale together.',
    scenes: buildScenes(sellingScenes, [
      'Turn your equipment into your next opportunity.',
      'Create your listing in a few simple steps.',
      'Reach buyers actively searching for equipment.',
      'Answer questions and schedule inspections.',
      'Review the agreement and complete the sale.',
      'List for free. Reach serious buyers. Sell smarter.',
    ]),
  },
  {
    id: 'hosting',
    title: 'Hosting on Vendibook',
    tileHeadline: 'How Hosting Works',
    description:
      'List your food truck, trailer, kitchen, or vendor space and earn from available inventory or unused space.',
    durationSeconds: 60,
    accessory: 'dashboard',
    heroImage: hostingHero,
    ctaLabel: 'Become a Vendibook Host',
    ctaRoute: '/how-it-works-host',
    secondaryCtaLabel: 'See Hosting Benefits',
    secondaryCtaRoute: '/how-it-works-host',
    transcript:
      'Hosting turns unused availability into income. List your food truck, trailer, commercial kitchen, or vendor space with photos, pricing, and rules. Review renter requests and documents, then manage bookings from your host dashboard.',
    scenes: buildScenes(hostingScenes, [
      'Your unused availability could become income.',
      'Create a host listing with photos, pricing, and rules.',
      'Qualified renters discover your listing.',
      'Review renter profile, dates, and documents.',
      'Manage bookings and communicate from one dashboard.',
      'Make your equipment or space work harder for you.',
    ]),
  },
];

export const getExplainer = (id: ExplainerType) =>
  explainers.find((e) => e.id === id)!;
