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
      "Hey — thinking about buying a food truck or a trailer? Let me walk you through what that actually looks like on Vendibook, because it's a lot calmer than chasing scattered posts on social media. So, you land on the marketplace, and right away you can search by what actually matters to you — your city, your budget, the type of build, the equipment inside. You compare a few side by side, save the ones you like, and open the listing to really dig in… photos, the equipment list, the seller's info, any documents they've shared, verification badges, and which payment methods they accept. From there, you just message the seller — ask your questions, line up an inspection, get comfortable. When you're ready to move forward, you'll see the full transaction details laid out clearly, and you pick a payment method that's available for that listing. Online payments run securely through Stripe, some purchases may be eligible for Affirm — that's subject to eligibility and approval — and if the seller offers it, you can also pay in person. Once the purchase is created, everything lives in your buyer dashboard — payment status, the agreement, messages, the transaction timeline, and whatever the next step is. And for pay-in-person deals, both sides confirm the handoff right inside Vendibook, so nothing gets lost. That's really it — find the equipment, pick a payment option that fits, and manage the whole thing from one place.",
    scenes: buildScenes(
      buyingScenes,
      [
        "So, here's where it starts — a marketplace built just for food-business equipment.",
        "You search, you compare, you save the ones you like.",
        "Open a listing and you get the full picture before you commit.",
        "Message the seller right here — questions, inspections, all of it.",
        "When you're ready, review the total and pick a payment method that works.",
        "After you buy, your dashboard tells you exactly what's done and what's next.",
        "Paying in person? That gets tracked too — both sides confirm the handoff.",
        "That's the flow — find it, fund it, and manage it, all in one place.",
      ],
      [
        'Marketplace',
        'Search & compare',
        'Listing details',
        'Message seller',
        'Stripe & Affirm checkout',
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
      "Okay — so maybe you're not looking to buy just yet. Maybe you've got a catering gig, a weekend pop-up, a festival coming up, or you just want to test a concept before you commit. That's exactly what renting on Vendibook is for. Here's how it flows. You start by searching rentals — your location, your dates, the kind of equipment you need — and when a listing catches your eye, you open the booking calendar. You'll see what's available, what's already booked, and what you've picked, all color-coded, so there's no guesswork. Choose your dates, review the price and the full cost breakdown, and send your request — with your intended use, your business info, and any documents the host asked for. The host reviews everything from their dashboard, and once they approve, the calendar updates automatically. From there, you just work through your requirements — identity verification, driver's license, insurance if it applies, business info, and the rental agreement. Online rental payments go through Stripe, safely. Your renter dashboard then keeps the payment status, booking details, documents, messages, and the next step all in one view. At pickup, and again at return, both sides confirm the handoff — so the whole rental has a clean, clear record from start to finish. Start smaller, test the idea, and grow from there.",
    scenes: buildScenes(
      rentingScenes,
      [
        "Not ready to buy? Renting is how a lot of food businesses get going.",
        "First step — find a rental that actually fits what you're doing.",
        "Open the calendar, pick your dates, and see your total upfront.",
        "Send everything the host needs, in one organized request.",
        "Once they approve, the calendar updates automatically.",
        "Then you work through your requirements — verification, docs, the agreement.",
        "Pay securely through Stripe and track everything in one place.",
        "Book it, run your event, and you're on your way.",
      ],
      [
        'Why rent',
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
