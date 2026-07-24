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
      'Compare listings, message sellers, explore available Stripe and eligible Affirm payment options, and track your purchase from one dashboard.',
    durationSeconds: 80,
    accessory: 'search',
    heroImage: buyingHero,
    ctaLabel: 'Browse Food Trucks & Trailers',
    ctaRoute: '/browse',
    secondaryCtaLabel: 'Learn About Buying',
    secondaryCtaRoute: '/how-it-works',
    transcript:
      "Buying a food truck or trailer should not mean chasing scattered social posts. On Vendibook, you can search food trucks and trailers, apply filters like price, location, condition, and equipment, and compare listings side by side. Open a listing to review photos, included equipment, seller information, available documents, verification indicators, and accepted payment methods. Message the seller directly to ask questions and schedule an inspection. When you're ready, review the full transaction details and pick an available payment method. Online payments are securely processed through Stripe, and eligible purchases may offer Affirm — subject to eligibility and approval. If the seller offers it, you can also pay in person. Once the purchase is created, your buyer dashboard keeps the payment status, agreement, messages, transaction timeline, and the next required action in one place. For pay-in-person purchases, both sides can confirm the handoff and payment through Vendibook. Find the right equipment, choose an available payment option, and manage the whole purchase in one place.",
    scenes: buildScenes(buyingScenes, [
      'A marketplace built for food-business equipment.',
      'Search. Compare. Save your favorites.',
      'More information before you commit.',
      'Listing details and conversations together.',
      'Review your total, then pick an available payment method.',
      "Know what's complete and what's next.",
      'Even offline payments stay organized.',
      'Find it. Finance it when eligible. Manage the purchase.',
    ]),
  },
  {
    id: 'renting',
    title: 'Renting on Vendibook',
    tileHeadline: 'How Renting Works',
    description:
      'Choose available dates, submit your request, complete verification, make payment, and manage the rental from one dashboard.',
    durationSeconds: 80,
    accessory: 'calendar',
    heroImage: rentingHero,
    ctaLabel: 'Explore Rentals',
    ctaRoute: '/browse?mode=rent',
    secondaryCtaLabel: 'How Rentals Work',
    secondaryCtaRoute: '/how-it-works',
    transcript:
      "Renting on Vendibook helps you test a concept, cover a catering event, or run a weekend pop-up without buying equipment upfront. Search rentals by location, equipment, and price, then open a listing's booking calendar. Available, booked, and selected dates are clearly distinguished, so you can pick your dates and see the rental price and cost breakdown before requesting. Submit your dates, intended use, business information, and any requested documents in one organized booking request. The host reviews your request from their dashboard and, once approved, the calendar updates automatically. Complete the requirements that apply to your booking — identity verification, driver's license, insurance, business info, and the rental agreement. Online rental payments are securely processed through Stripe. Your renter dashboard then shows the payment status, booking details, documents, messages, and the next action required. At pickup and return, both sides confirm the handoff so the rental has a clear record from beginning to end.",
    scenes: buildScenes(rentingScenes, [
      'Rent the equipment you need.',
      'Find a rental that fits your business.',
      'Choose your dates and see your total.',
      'One organized booking request.',
      'Approval updates the booking automatically.',
      'Complete your requirements in one place.',
      'Payment and booking status together.',
      'Book it. Manage it. Put it to work.',
    ]),
  },
  {
    id: 'selling',
    title: 'Selling on Vendibook',
    tileHeadline: 'How Selling Works',
    description:
      'Create your listing for free, connect with food-business buyers, and track payments, documents, and handoff steps.',
    durationSeconds: 80,
    accessory: 'camera',
    heroImage: sellingHero,
    ctaLabel: 'Sell on Vendibook',
    ctaRoute: '/list',
    secondaryCtaLabel: 'Explore Selling Tools',
    secondaryCtaRoute: '/how-it-works-seller',
    transcript:
      "Selling specialized equipment through a general marketplace usually means incomplete listings and repetitive questions. Vendibook guides you through creating a detailed listing with your photos, food truck or trailer type, asking price, location, condition, equipment, specifications, and available documents. Preview and publish for free so buyers searching Vendibook can find you. From your seller dashboard, respond to messages, track listing views and saves, and manage buyer activity in one place. Eligible buyers may see additional ways to complete the purchase: online checkout is processed through Stripe, Affirm may be available for eligible purchases and buyers subject to approval, and you can also enable pay-in-person when appropriate. When a purchase is created, the sale dashboard shows the payment method, payment status, agreement, documents, messages, handoff date, and the next action required from each side. For online transactions your dashboard displays the applicable payment hold and payout timeline; for pay-in-person sales, both sides confirm the handoff and payment through Vendibook. Create your listing, connect with serious buyers, and manage the sale without losing track of payments, documents, or next steps.",
    scenes: buildScenes(sellingScenes, [
      'List where food-business buyers are searching.',
      'Build a professional listing step by step.',
      'Always free to list.',
      'Your listing and buyer activity in one place.',
      'More ways for eligible buyers to complete the purchase.',
      'Follow the sale from purchase to completion.',
      'Pay-in-person sales stay tracked too.',
      'List for free. Sell with a better process.',
    ]),
  },
  {
    id: 'hosting',
    title: 'Hosting on Vendibook',
    tileHeadline: 'How Hosting Works',
    description:
      'Control your calendar, review booking requests, manage renters, and track upcoming payouts from your host dashboard.',
    durationSeconds: 80,
    accessory: 'dashboard',
    heroImage: hostingHero,
    ctaLabel: 'Become a Host',
    ctaRoute: '/how-it-works-host',
    secondaryCtaLabel: 'See Hosting Benefits',
    secondaryCtaRoute: '/how-it-works-host',
    transcript:
      "If your food truck, trailer, commercial kitchen, or vendor space is not used every day, Vendibook can help turn that availability into booking opportunities. Create a detailed host listing with your pricing, amenities, rules, required documents, and access instructions. Use your host booking calendar to open available dates, block unavailable dates, and review upcoming bookings, so you can reduce scheduling conflicts. When a request arrives, review the renter, requested dates, intended use, verification status, and documents from your host dashboard before approving. Once approved, manage the booking from one place — messages, agreements, documents, payment status, handoff details, return date, and your upcoming payout. Online rental payments are securely processed through Stripe. Your dashboard shows when payment has been completed, when the rental is in progress, and when your payout is scheduled. You set your rental price. The renter reviews the applicable platform fee at checkout, and your host payout is scheduled 24 hours after the rental ends. Use the same dashboard to complete pickup and return confirmations and build your reputation through reviews. You provide the opportunity — Vendibook organizes the process.",
    scenes: buildScenes(hostingScenes, [
      'Make available equipment and space work harder.',
      'Set expectations before the request arrives.',
      'You control when your listing is available.',
      'Review the details before you approve.',
      'One dashboard for your hosting activity.',
      'See payment and payout status clearly.',
      'Your listed rental price is what you receive.',
      'You provide the opportunity. Vendibook organizes the process.',
    ]),
  },
];

export const getExplainer = (id: ExplainerType) =>
  explainers.find((e) => e.id === id)!;
