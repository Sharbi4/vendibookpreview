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
    durationSeconds: 80,
    accessory: 'search',
    heroImage: buyingHero,
    ctaLabel: 'Browse Food Trucks & Trailers',
    ctaRoute: '/browse',
    secondaryCtaLabel: 'Learn About Buying',
    secondaryCtaRoute: '/how-it-works',
    transcript:
      "Hey — thinking about buying a food truck or trailer? Let me actually walk you through it, step by step, so you can see how this works on Vendibook. Picture this: you're launching a taco concept, and you need a fully-equipped truck under sixty thousand dollars, somewhere near Phoenix. Step one — you open the marketplace and filter by city, price, and equipment, say a flat-top griddle and a three-compartment sink. Boom, you get a real shortlist. Step two — you tap the trucks that look promising, hit save, and now you can compare them side by side. Step three — open one up. You'll see the full photo gallery, the equipment list, the seller's profile, verification badges, any documents they've uploaded, like inspection reports or title info, and which payment methods they accept. Step four — you message the seller right from the listing. Ask about the generator hours, schedule an inspection for Saturday, get a video walkaround — all in one thread. Step five, you're ready. You review the transaction details, pick your payment method: Stripe for card, Affirm if you're eligible and approved, or pay-in-person if the seller enabled it. Step six — the buyer dashboard takes over. You'll see payment status, the signed agreement, your message history, the transaction timeline, and the next required action, right there. And if you paid in person, both you and the seller confirm the handoff inside Vendibook so nothing gets forgotten. That's the whole flow — find it, fund it, and manage it, all in one dashboard.",
    scenes: buildScenes(
      buyingScenes,
      [
        "Say you're launching a taco truck — here's where you start.",
        "Step one: filter by city, budget, and the equipment you actually need.",
        "Step two: open a listing and see photos, specs, docs, and verification.",
        "Step three: message the seller — ask about hours, schedule an inspection.",
        "Step four: review the total and pick Stripe, Affirm, or pay-in-person.",
        "Step five: your buyer dashboard shows payment, agreement, and next steps.",
        "Paying cash? Both sides confirm the handoff inside Vendibook.",
        "That's it — find it, fund it, and manage it, all in one place.",
      ],
      [
        'Your scenario',
        'Search & filter',
        'Listing details',
        'Message seller',
        'Checkout options',
        'Buyer dashboard',
        'Handoff confirmation',
        'Wrap-up',
      ],
    ),

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
      "Okay — picture this. You've got a three-day music festival next month, and buying a truck outright doesn't make sense yet. That's exactly what renting on Vendibook is for. Let me walk you through it, step by step. Step one — search rentals by your city, your dates, say Friday through Sunday, and the equipment you need, like a smoker or a full BBQ trailer. Step two — open the booking calendar. Available dates are green, booked dates are gray, and your selection lights up in orange, so there's zero guesswork. You'll see the nightly rate, the weekly rate if you're going longer, and the full cost breakdown right there. Step three — submit your booking request. You tell the host what you're using it for, share your business info, and upload anything they've asked for, like your event permit or a certificate of insurance. Step four — the host reviews everything from their host dashboard, approves, and the calendar locks in automatically. Step five — you knock out your requirements: identity verification, driver's license, insurance if it applies, and the rental agreement. Step six — you pay securely through Stripe, and your renter dashboard becomes mission control. Payment status, booking details, uploaded documents, messages with the host, and the next required action — all in one view. Step seven — at pickup, both sides do a walkaround and confirm the handoff inside the app. Same thing at return. Clean record, start to finish. Rent it, run your event, and grow from there.",
    scenes: buildScenes(
      rentingScenes,
      [
        "Say you've got a festival next month — renting is how a lot of businesses start.",
        "Step one: search by city, your dates, and the equipment you actually need.",
        "Step two: open the calendar — available, booked, and your pick, color-coded.",
        "Step three: send your dates, intended use, and any docs the host requires.",
        "Step four: host approves from their dashboard, calendar locks in.",
        "Step five: knock out verification, license, insurance, and the agreement.",
        "Step six: pay through Stripe, and track everything from your renter dashboard.",
        "Step seven: confirm pickup and return in-app — clean record, start to finish.",
      ],
      [
        'Your scenario',
        'Search rentals',
        'Booking calendar',
        'Booking request',
        'Host approval',
        'Verification & docs',
        'Stripe payment',
        'Pickup & return handoff',
      ],
    ),

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
      "Alright — flip it around. Say you upgraded to a bigger rig and your old twenty-foot trailer is just sitting in the yard. On a general marketplace, you'd get tire-kickers asking questions you already answered in the ad. Vendibook is different, because every buyer here is specifically shopping for food-business equipment. Let me walk you through selling, step by step. Step one — open the listing wizard. It guides you: upload your photos, pick the type — trailer, truck, or concession — set your asking price, drop your location, note the condition, list the equipment inside, add specs like generator hours or fuel type, and attach any documents, like the title or a recent inspection. Step two — preview and publish. Listing is completely free, always. Step three — buyers actively searching Vendibook can now find you, save you, and reach out. Step four — your seller dashboard becomes home base. You'll see messages, listing views, saves, and buyer activity, all in one place, so you know exactly who's serious. Step five — when a buyer's ready, eligible buyers may see more options: online checkout through Stripe, Affirm for eligible purchases subject to approval, and pay-in-person if you enabled it. Step six — once a purchase is created, your sale dashboard shows the payment method, payment status, the signed agreement, documents, messages, the handoff date, and the next required action from each side. For Stripe purchases, you'll see the payment hold and payout timeline right there. For pay-in-person sales, both sides confirm the handoff inside Vendibook. And here's the kicker — pay-in-person sales are one-hundred-percent free, no commission, no buyer fee. List free, sell smart, and stay on top of every step.",
    scenes: buildScenes(
      sellingScenes,
      [
        "Got a truck or trailer sitting idle? Serious buyers are already here looking.",
        "Step one: the wizard walks you through photos, price, equipment, and docs.",
        "Step two: preview and publish — listing is always free.",
        "Step three: your seller dashboard shows messages, views, saves, and buyers.",
        "Step four: eligible buyers see Stripe, Affirm, and pay-in-person options.",
        "Step five: follow the sale from checkout through completion.",
        "Step six: cash sales are free — both sides confirm the handoff in-app.",
        "That's it — list free, sell smart, and manage every step in one place.",
      ],
      [
        'Your scenario',
        'Listing wizard',
        'Free to list',
        'Seller dashboard',
        'Checkout options',
        'Sale timeline',
        'Cash sale handoff',
        'Wrap-up',
      ],
    ),

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
      "Now — think about this. Say you own a food truck that only rolls out on weekends, or a commercial kitchen that sits empty Monday through Wednesday. That downtime could actually be earning. That's what hosting on Vendibook is about. Let me walk you through it, step by step. Step one — build your host listing. Photos, nightly and weekly pricing, amenities, house rules, required documents like insurance or a food handler card, and access instructions. Step two — open your host booking calendar. Mark which dates are available, block the ones that aren't — say the Fourth of July because you're using it yourself — and see everything upcoming, so no double-booking. Step three — a request comes in. From your host dashboard, you review the renter's profile, their dates, what they're using it for, their verification status, and every document they uploaded, before you say yes. Step four — approve, and now the whole booking lives in one dashboard. Messages, agreement, documents, payment status, handoff details, return date, and your upcoming payout, all in one place. Step five — the renter pays securely through Stripe. Your dashboard shows exactly when they've paid, when the rental's in progress, and when your payout lands. Here's the money part: you set your rental price, the renter sees the platform fee at checkout, and your payout is scheduled twenty-four hours after the rental ends. Step six — confirm pickup and return right in the dashboard, and reviews start building your reputation. And step seven — invite other hosts through your referrals link. When they earn on Vendibook, you earn too. You bring the opportunity — Vendibook keeps the whole thing organized.",
    scenes: buildScenes(
      hostingScenes,
      [
        "Truck sitting idle midweek? Kitchen empty Mondays? That's income waiting.",
        "Step one: build your listing — pricing, rules, docs, access instructions.",
        "Step two: your booking calendar — mark available, block off what's not.",
        "Step three: review the renter, dates, and documents before you approve.",
        "Step four: your host dashboard manages messages, docs, and payout status.",
        "Step five: renter pays through Stripe, and you see the payout timeline.",
        "You set the price. Payout drops twenty-four hours after the rental ends.",
        "Step six: invite other hosts through referrals — when they earn, you earn.",
      ],
      [
        'Your scenario',
        'Host listing setup',
        'Host booking calendar',
        'Review & approve',
        'Host dashboard',
        'Stripe payout timeline',
        'Commission & payout',
        'Referrals',
      ],
    ),

  },

];

export const getExplainer = (id: ExplainerType) =>
  explainers.find((e) => e.id === id)!;
