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
      "Alright — flip it around for a second. Maybe you've got a truck or a trailer sitting there, and you're ready to sell it. On a general marketplace, that usually means half-answered questions and buyers who don't really know what they're looking at. Vendibook is built differently, because everyone here is shopping for food-business equipment. Here's how selling works. You walk through the listing wizard step by step — your photos, the truck or trailer type, your asking price, location, condition, the equipment inside, specs, and any documents you want to share. You preview, and you publish — and yes, listing is completely free. From that point on, buyers searching Vendibook can actually find you. Your seller dashboard becomes your home base — messages, listing views, saves, buyer activity, all in one place. When a buyer's ready, eligible buyers may see more ways to complete the purchase — online checkout through Stripe, Affirm for eligible purchases subject to approval, and pay-in-person when you enable it. Once a purchase is created, the sale dashboard shows you the payment method, the payment status, the agreement, documents, messages, the handoff date, and what's needed next from each side. For online transactions, you'll see your payment hold and payout timeline right there. For pay-in-person sales, both sides confirm the handoff inside Vendibook. So — list for free, connect with serious buyers, and manage the sale without losing track of anything.",
    scenes: buildScenes(
      sellingScenes,
      [
        "Got a truck or trailer to sell? Here's where the right buyers are already looking.",
        "The wizard walks you through the listing, step by step.",
        "And listing is free — always.",
        "Once you're live, your dashboard shows everything happening around your listing.",
        "Eligible buyers see more ways to complete the purchase.",
        "Follow the whole sale from checkout through completion.",
        "Even cash sales stay organized — both sides confirm the handoff.",
        "That's it — list free, sell smart, stay on top of every step.",
      ],
      [
        'Where buyers search',
        'Listing wizard',
        'Free to list',
        'Seller dashboard',
        'Stripe & Affirm options',
        'Sale timeline & escrow',
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
      "Now — here's a thought. If your food truck, trailer, commercial kitchen, or vendor space isn't in use every single day, that downtime could actually be earning for you. That's what hosting on Vendibook is about. Let me show you how it works. You start by building your host listing — your pricing, your amenities, your rules, the documents you require, access instructions, all of it. Then you open your host booking calendar — you pick which dates are available, block out the ones that aren't, and see what's coming up, so you're not double-booking yourself. When a request comes in, you review the renter, their dates, what they're using it for, their verification status, and any documents they've submitted — all before you ever say yes. Once you approve, the whole booking lives in one place — messages, agreements, documents, payment status, the handoff, the return date, and your upcoming payout. Renter payments go through Stripe securely. Your dashboard shows you when the renter has paid, when the rental's in progress, and when your payout is scheduled. And here's the part hosts love — you set your rental price, and the renter sees the platform fee at checkout. Your payout is scheduled twenty-four hours after the rental ends. You handle pickup and return confirmations right in the same dashboard, and reviews build up your reputation over time. You bring the opportunity — Vendibook keeps the whole process organized.",
    scenes: buildScenes(
      hostingScenes,
      [
        "So — got a truck, trailer, kitchen, or space sitting idle? That's income waiting to happen.",
        "First, set the expectations — pricing, rules, documents, all of it.",
        "You stay in control of your calendar, always.",
        "When a request comes in, you review the details before you approve.",
        "Everything about your hosting activity lives in one dashboard.",
        "Payment and payout status are always clearly shown.",
        "You set the price — that's what you receive, on your payout schedule.",
        "You bring the opportunity. Vendibook keeps it all organized.",
      ],
      [
        'Why host',
        'Host listing setup',
        'Host booking calendar',
        'Review request & verification',
        'Host dashboard',
        'Stripe payout timeline',
        'Commission & payout',
        'Wrap-up',
      ],
    ),
  },

];

export const getExplainer = (id: ExplainerType) =>
  explainers.find((e) => e.id === id)!;
