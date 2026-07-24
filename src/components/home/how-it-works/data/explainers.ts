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
  chapterLabels: string[],
  perSceneMs = 10000,
): SceneDef[] =>
  fns.map((Component, i) => ({
    Component: Component as ComponentType,
    durationMs: perSceneMs,
    caption: captions[i] ?? '',
    chapterLabel: chapterLabels[i] ?? captions[i] ?? `Chapter ${i + 1}`,
  }));

export const explainers: Explainer[] = [
  {
    id: 'buying',
    title: 'Buying on Vendibook',
    tileHeadline: 'How Buying Works',
    description:
      'Compare listings, message sellers, explore available Stripe and eligible Affirm payment options, and track your purchase from one dashboard.',
    durationSeconds: 85,
    accessory: 'search',
    heroImage: buyingHero,
    ctaLabel: 'Browse Food Trucks & Trailers',
    ctaRoute: '/browse',
    secondaryCtaLabel: 'Learn About Buying',
    secondaryCtaRoute: '/how-it-works',
    transcript:
      "Buying a food truck or trailer should not mean searching through random posts, chasing sellers for basic details, and trying to keep everything organized yourself. Vendibook is a marketplace built specifically for food-business equipment. Search food trucks and trailers, filter by location, price, condition, equipment, listing type, and payment options, and save the listings you want to compare. Open a listing and review the photos, asking price, included equipment, vehicle or trailer details, condition, seller profile, location, available documents, verification indicators, and accepted payment methods before you decide to move forward. Message the seller directly from the listing to ask about equipment, request maintenance records, or schedule an inspection — every conversation stays connected to the listing. When you are ready to buy, review the full transaction details and select an available payment method. Online payments are securely processed through Stripe, and eligible purchases may offer Affirm, subject to eligibility and approval. If the seller offers payment in person, that option can be selected too. Once the purchase is created, your buyer dashboard keeps the important information in one place: the purchased listing, seller information, payment status, messages, documents, agreement status, transaction timeline, next required action, and handoff details. Pay-in-person purchases stay organized inside Vendibook as well — both sides confirm the handoff and payment received so nothing gets lost. At handoff, complete the required confirmations so both sides have a clear record of the transaction. Find the right equipment, choose an available payment option, and manage your purchase with Vendibook.",
    scenes: buildScenes(
      buyingScenes,
      [
        'A marketplace built for food-business equipment.',
        'Search. Compare. Save your favorites.',
        'More information before you commit.',
        'Listing details and conversations stay together.',
        'Review your total, then pick an available payment method.',
        'Payment status, agreement, timeline, and next action — in one place.',
        'Even pay-in-person purchases stay organized on Vendibook.',
        'Find it. Finance it when eligible. Manage the purchase.',
      ],
      [
        'A better way to search',
        'Search & compare',
        'Review the details',
        'Message the seller',
        'Review payment options',
        'Buyer dashboard',
        'Pay-in-person workflow',
        'Complete the handoff',
      ],
    ),
  },

  {
    id: 'renting',
    title: 'Renting on Vendibook',
    tileHeadline: 'How Renting Works',
    description:
      'Choose available dates, submit your request, complete verification, make payment, and manage the rental from one dashboard.',
    durationSeconds: 85,
    accessory: 'calendar',
    heroImage: rentingHero,
    ctaLabel: 'Explore Rentals',
    ctaRoute: '/browse?mode=rent',
    secondaryCtaLabel: 'How Rentals Work',
    secondaryCtaRoute: '/how-it-works',
    transcript:
      "You do not always have to purchase equipment before launching or testing your food-business concept. Vendibook lets you rent the equipment you need. Search available food trucks and trailers based on location, truck or trailer type, equipment, price, rental requirements, and available dates. Open the booking calendar — available dates, booked dates, and your selected rental dates are clearly distinguished, with the minimum rental period shown when it applies. Choose your start and end dates and review the rental price, applicable platform fee, taxes when they apply, and the total before submitting your request. Submit your dates, intended use, business information, a message to the host, and any requested documents directly from the listing. The host reviews everything from their dashboard. Once approved, the dates are reserved and both sides receive the next required steps. Depending on the listing, you may need to complete identity verification, upload your driver's license, insurance or certificate of insurance, business information, food-safety documentation or permits, and sign the rental agreement before the booking begins. Online rental payments are securely processed through Stripe. Your renter dashboard then shows the payment status, booking details, uploaded documents, host messages, rental dates, and the next required action. At pickup and return, both sides complete the required confirmations and keep a clear record of the rental. Choose your dates, complete the required steps, and manage your rental without juggling separate calendars, payments, documents, and messages.",
    scenes: buildScenes(
      rentingScenes,
      [
        'Rent the equipment you need.',
        'Find a rental that fits your business.',
        'Choose your dates and see your total.',
        'One organized booking request.',
        'Approval updates the booking automatically.',
        'Complete your requirements in one place.',
        'Payment and booking status together.',
        'Track the rental from approval through return.',
      ],
      [
        'Rent before you buy',
        'Find a rental',
        'Use the booking calendar',
        'Send the rental request',
        'Host review & approval',
        'Verification, documents & agreement',
        'Stripe payment & dashboard',
        'Pickup & return',
      ],
    ),
  },

  {
    id: 'selling',
    title: 'Selling on Vendibook',
    tileHeadline: 'How Selling Works',
    description:
      'Create your listing for free, connect with food-business buyers, and track payments, documents, and handoff steps.',
    durationSeconds: 85,
    accessory: 'camera',
    heroImage: sellingHero,
    ctaLabel: 'Sell on Vendibook',
    ctaRoute: '/list',
    secondaryCtaLabel: 'Explore Selling Tools',
    secondaryCtaRoute: '/how-it-works-seller',
    transcript:
      "Selling specialized equipment through a general marketplace often means incomplete listings, repetitive questions, and buyers who are difficult to evaluate. Vendibook lets you list where food-business buyers are already searching. The listing wizard guides you through adding your photos, the food truck or trailer type, asking price, location, condition, equipment, dimensions or specifications, description, available documents, and accepted payment methods, with a progress indicator as you complete each section. Preview your information and publish your listing for free so buyers can discover it through the Vendibook marketplace. From your seller dashboard, manage your listing, respond to buyer messages, share information, and track listing views, saves where supported, and buyer activity in one place. Eligible buyers may see more ways to complete the purchase: online checkout through Stripe, Affirm for eligible purchases subject to approval, and pay in person when you enable it. Vendibook and Stripe are not lenders — Affirm is subject to eligibility and approval. Once a purchase is created, your sale dashboard shows the buyer, payment method, payment status, messages, documents, agreement, handoff date, transaction timeline, payment-release status, and the next required action. For online sales, the applicable payment-hold and release timeline is displayed directly in the dashboard. For pay-in-person sales, both sides confirm the handoff — and pay-in-person sales carry no commission and no buyer fee. Complete the handoff and transaction confirmations through Vendibook so the sale has a clear record from beginning to end. Create your listing, connect with serious buyers, and manage the sale without losing track of payments, documents, messages, or next steps.",
    scenes: buildScenes(
      sellingScenes,
      [
        'List where food-business buyers are searching.',
        'Build a professional listing step by step.',
        'Always free to list.',
        'Your listing and buyer activity in one place.',
        'More ways for eligible buyers to complete the purchase.',
        'Follow the sale from purchase to completion.',
        'Pay-in-person sales: no commission, no buyer fee.',
        'List for free. Sell with a better process.',
      ],
      [
        'Sell to the right audience',
        'Create the listing',
        'Publish for free',
        'Manage buyers & messages',
        'Payment options',
        'Track the sale',
        'Pay-in-person handoff',
        'Confirm the handoff',
      ],
    ),
  },

  {
    id: 'hosting',
    title: 'Hosting on Vendibook',
    tileHeadline: 'How Hosting Works',
    description:
      'Control your calendar, review booking requests, manage renters, and track upcoming payouts from your host dashboard.',
    durationSeconds: 85,
    accessory: 'dashboard',
    heroImage: hostingHero,
    ctaLabel: 'Become a Host',
    ctaRoute: '/how-it-works-host',
    secondaryCtaLabel: 'See Hosting Benefits',
    secondaryCtaRoute: '/how-it-works-host',
    transcript:
      "If your food truck, trailer, commercial kitchen, or vendor space is not being used every day, Vendibook can help turn that availability into booking opportunities. Create a detailed host listing with your photos, description, equipment or amenities, rental price, deposit or additional charges when they apply, location, rental rules, required documents, and pickup or access instructions — so renters know exactly what to expect before requesting a booking. Use your host booking calendar to open available dates, block unavailable dates, review upcoming bookings, and reduce scheduling conflicts. When a request arrives, review the renter profile, requested dates, intended use, messages, verification status, uploaded documents, and price summary before you approve or decline. Once approved, manage the booking from your host dashboard: pending requests, confirmed bookings, calendar, renter messages, agreement status, document status, payment status, pickup information, return date, upcoming payout, and the next required action all stay in one place. Online rental payments are securely processed through Stripe. Your dashboard shows exactly when payment has been completed, when the rental is in progress, and when your payout is scheduled. You set your rental price. The renter reviews the applicable platform fee at checkout, and your payout is scheduled 24 hours after the rental ends. Use the same dashboard to confirm pickup and return, complete the booking, and build your reputation through reviews. Set your availability, review renters, manage every booking, and track your earnings through Vendibook.",
    scenes: buildScenes(
      hostingScenes,
      [
        'Make available equipment and space work harder.',
        'Set expectations before the request arrives.',
        'You control when your listing is available.',
        'Review the details before you approve.',
        'One dashboard for your hosting activity.',
        'See payment and payout status clearly.',
        'Your listed rental price is what you receive.',
        'Manage each booking from request through payout.',
      ],
      [
        'Turn availability into income',
        'Create the host listing',
        'Control the booking calendar',
        'Review booking requests',
        'Host dashboard',
        'Stripe payment & payout',
        'Pricing & payout timing',
        'Handoff, return & review',
      ],
    ),
  },

];

export const getExplainer = (id: ExplainerType) =>
  explainers.find((e) => e.id === id)!;
