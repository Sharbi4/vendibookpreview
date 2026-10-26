/**
 * Where the user is in their Vendibook journey, for Atlas (sales) and Allison
 * (support): the page and stage they're on, and what they're looking at or
 * pointing at right now, so each agent can open with "I see you're looking
 * at…" and stay relevant as the user moves around.
 *
 * Privacy: private pages (account, messages, checkout, admin…) report only
 * their stage, never page content; field values are never read; attention is
 * only watched during a live call or chat.
 */
import { isPrivateContext, labelOf } from './atlasPage';
import { ATLAS_DEFAULT_OPENING } from './atlasConfig';
import { ALLISON_DEFAULT_OPENING } from './allisonConfig';

export type JourneyStage =
  | 'home' | 'browsing' | 'listing' | 'checkout' | 'selling' | 'messages' | 'orders' | 'walkthrough'
  | 'payouts' | 'pricing' | 'support' | 'learning' | 'tools' | 'legal' | 'account' | 'admin' | 'other';

export interface Journey {
  stage: JourneyStage;
  /** Plain description of the page, e.g. "a food truck listed for sale". */
  where: string;
  /** Listing title, search terms or page heading (public pages only). */
  subject?: string;
  private: boolean;
  /** Spoken right after each agent's name in its first message. */
  salesOpening: string;
  supportOpening: string;
  /** Short line for the idle launcher. */
  teaser: string;
}

const clean = (s: string | null | undefined, max = 80) => {
  const t = (s ?? '').replace(/\s+/g, ' ').trim();
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
};

function heading(): string {
  const h1 = Array.from(document.querySelectorAll('h1')).find((h) => !h.closest('[data-atlas-ui]') && clean(h.textContent));
  return clean(h1?.textContent);
}

/** "Black 14ft food trailer available for rent! Can start…" → "Black 14ft food trailer available for rent". */
function shortName(title: string): string {
  const first = title.split(/\s*(?:[!?.|•]|\s[-–—]\s|,\s)\s*/)[0] || title;
  const words = first.split(' ');
  return (words.length > 9 ? words.slice(0, 9).join(' ') : first).replace(/[\s.,:;!?-]+$/, '');
}

/** "the 2019 Step Van", but not "the The Taco Truck" or "the A-frame trailer". */
const theName = (title: string) => (/^(the|a|an)\s/i.test(title) ? title : `the ${title}`);

function searchSubject(search: string): string {
  const p = new URLSearchParams(search);
  const [what, where] = [p.get('q') || p.get('query') || p.get('category') || p.get('type'), p.get('location') || p.get('city') || p.get('state')]
    .map((v) => clean(v?.replace(/[-_]/g, ' '), 40));
  if (!what && !where) return '';
  return `${what || ''} listings${where ? ` in ${where}` : ''}`.trim();
}

type Rule = { test: RegExp; stage: JourneyStage; private?: boolean };

// First match wins: specific paths before their broader parents.
const RULES: Rule[] = [
  { test: /^\/admin(\/|$)/, stage: 'admin', private: true },
  { test: /^\/(listing|listings|share\/listing)\/[^/]+\/?$/, stage: 'listing' },
  { test: /^\/(search|browse|rentals|rent\/|vendor-lots|wanted|buyer\/?$)/, stage: 'browsing' },
  { test: /^\/(checkout|book|purchase-request|meta-checkout|payment|payment-success|payment-cancelled|orders\/[^/]+\/payment)(\/|$)/, stage: 'checkout', private: true },
  { test: /^\/walkthrough(\/|$)/, stage: 'walkthrough', private: true },
  { test: /^\/(dashboard\/messages|dashboard\/inbox|messages|host\/messages|inquiries)(\/|$)/, stage: 'messages', private: true },
  { test: /^\/(dashboard\/transactions|transactions|transaction|orders|order-tracking|order-confirmation|receipt|sale\/[^/]+\/protection|dashboard\/cases|cases|handoff|delivery|dashboard\/bookings|host\/bookings|booking-confirmation|dashboard\/offers|purchases|account\/purchases|dashboard\/invoices|invoices)(\/|$)/, stage: 'orders', private: true },
  { test: /^\/(dashboard\/payments|dashboard\/account\/payouts|host\/payments|dashboard\/seller-setup)(\/|$)/, stage: 'payouts', private: true },
  { test: /^\/(list|create-listing|new-listing|listing-wizard|edit-listing|dashboard\/listings\/new|dashboard\/listings\/[^/]+\/edit|list-with-vendi|listing-published|listings\/[^/]+\/(improve|rent-it-out|payments-financing))(\/|$)/, stage: 'selling' },
  { test: /^\/(sell-|rent-out-my-food-truck|rent-my-commercial-kitchen|become-a-host|how-it-works-(host|seller)|how-it-works\/(host|seller)|why-list-on-vendibook|best-place-to-sell|list-food-truck-for-sale|host\/?$)/, stage: 'selling' },
  { test: /^\/(pricing|plans|host\/plans|account\/subscription|financing|pricing-calculator|kitchen-earnings-calculator|subscribe)(\/|$)/, stage: 'pricing' },
  { test: /^\/(help|support|contact|faq|account\/support|feedback)(\/|$)/, stage: 'support' },
  { test: /^\/(legal|terms|privacy|insurance|california-privacy)(\/|$)/, stage: 'legal' },
  { test: /^\/(tools|pricepilot|build-studio|ai-tools|vendi-ai-suite|atlas|agent)(\/|$)/, stage: 'tools' },
  { test: /^\/(how-it-works|how-purchasing-works|how-to-buy-a-food-truck|guides|blog|resources|vendibook-freight|ship-your-food-truck|what-is-vendibook|payments|identity-verification|community|spotlight)(\/|$)/, stage: 'learning' },
  { test: /^\/(dashboard|account|host|profile|settings|favorites|notifications|notification-preferences|referral|u\/)(\/|$)?/, stage: 'account', private: true },
  { test: /^\/?$/, stage: 'home' },
];

/** Reads the current page. Call after the page has rendered. */
export function currentJourney(pathname = window.location.pathname, search = window.location.search): Journey {
  const rule = RULES.find((r) => r.test.test(pathname));
  const stage: JourneyStage = rule?.stage ?? 'other';
  const hidden = Boolean(rule?.private) || isPrivateContext();
  const title = hidden ? '' : heading();
  const mode = document.querySelector('[data-atlas-listing]')?.getAttribute('data-atlas-listing');
  const about = (s: string) => (s ? ` ${s}` : '');

  switch (stage) {
    case 'listing': {
      const what = mode === 'rental' ? 'a rental listing' : 'a listing for sale';
      const t = title ? theName(shortName(title)) : 'this listing';
      return {
        stage, where: what, subject: title || undefined, private: false,
        salesOpening: mode === 'rental'
          ? `I see you're looking at ${t}. Want help with dates, pricing, or what's included with the rental?`
          : `I see you're looking at ${t}. Want help with the price, what's included, or how buying with Purchase Protection works?`,
        supportOpening: `I see you're on ${t}. Is something about this listing I can help you with?`,
        teaser: mode === 'rental' ? 'Questions about this rental?' : 'Questions about this listing?',
      };
    }
    case 'browsing': {
      const terms = searchSubject(search);
      return {
        stage, where: 'search results', subject: terms || undefined, private: false,
        salesOpening: terms
          ? `I see you're browsing ${terms}. Want me to narrow it down by budget, size or must-have equipment?`
          : "I see you're browsing listings. Tell me the city and what you need, and I'll narrow it down for you.",
        supportOpening: "I see you're browsing listings. Having any trouble finding what you need?",
        teaser: 'Want help narrowing these down?',
      };
    }
    case 'checkout':
      return {
        stage, where: 'checkout (private)', private: true,
        salesOpening: "I see you're checking out. Any questions about Purchase Protection, payment or delivery before you finish?",
        supportOpening: "I see you're at checkout. Is anything giving you trouble with payment?",
        teaser: 'Questions before you check out?',
      };
    case 'selling':
      return {
        stage, where: 'listing or selling equipment', subject: title || undefined, private: hidden,
        salesOpening: "I see you're getting ready to list. Want help with pricing, photos or writing the description?",
        supportOpening: "I see you're working on a listing. Is anything about listing your equipment giving you trouble?",
        teaser: 'Want help with your listing?',
      };
    case 'messages':
      return {
        stage, where: 'their messages (private)', private: true,
        salesOpening: "I see you're in your messages. Want help with a seller conversation or an offer?",
        supportOpening: "I see you're in your messages. Need help with a conversation or a reply that hasn't come through?",
        teaser: 'Need help with a conversation?',
      };
    case 'orders':
      return {
        stage, where: 'their orders, bookings or offers (private)', private: true,
        salesOpening: "I see you're checking on an order. Want me to walk you through what happens next?",
        supportOpening: "I see you're looking at an order. Questions about the walkthrough, signing, or when funds are released?",
        teaser: 'Questions about your order?',
      };
    case 'walkthrough':
      return {
        stage, where: 'a video walkthrough (private)', private: true,
        salesOpening: "I see you're on your video walkthrough. Want tips on what to check before you confirm?",
        supportOpening: "I see you're on your video walkthrough. Need help joining, scheduling, or with what happens after?",
        teaser: 'Help with your walkthrough?',
      };
    case 'payouts':
      return {
        stage, where: 'payments and payouts setup (private)', private: true,
        salesOpening: "I see you're setting up how you get paid. Want me to explain how payouts work?",
        supportOpening: "I see you're on payments and payouts. Is something about getting paid I can help with?",
        teaser: 'Questions about getting paid?',
      };
    case 'pricing':
      return {
        stage, where: 'plans and pricing', subject: title || undefined, private: hidden,
        salesOpening: "I see you're looking at pricing. Want me to help figure out which option fits what you're doing?",
        supportOpening: "I see you're on pricing. Want me to explain the plans or fees?",
        teaser: 'Which plan fits you?',
      };
    case 'support':
      return {
        stage, where: 'help and support', subject: title || undefined, private: hidden,
        salesOpening: "I see you're on our help pages. Is there something I can help you find or buy?",
        supportOpening: "I see you're looking for help. Tell me what's going on and I'll sort it out with you.",
        teaser: 'Need a hand?',
      };
    case 'learning':
      return {
        stage, where: 'a guide or article', subject: title || undefined, private: false,
        salesOpening: title
          ? `I see you're reading about${about(title)}. Want me to answer anything on it, or show you listings that fit?`
          : "I see you're reading up. Want me to answer anything, or show you listings that fit?",
        supportOpening: title ? `I see you're reading about${about(title)}. Any questions I can answer?` : "I see you're reading up. Any questions I can answer?",
        teaser: 'Questions about this?',
      };
    case 'tools':
      return {
        stage, where: 'Vendibook tools', subject: title || undefined, private: hidden,
        salesOpening: title ? `I see you're using${about(title)}. Want help getting the most out of it?` : 'I see you\'re checking out our tools. Want help getting started with one?',
        supportOpening: title ? `I see you're on${about(title)}. Is something not working the way you expected?` : 'I see you\'re on our tools. Is something not working the way you expected?',
        teaser: 'Want help with this tool?',
      };
    case 'legal':
      return {
        stage, where: 'terms and policies', subject: title || undefined, private: false,
        salesOpening: 'I see you\'re reading our terms. Want me to explain anything in plain English?',
        supportOpening: 'I see you\'re reading our policies. Want me to explain any part of them?',
        teaser: 'Want this in plain English?',
      };
    case 'account':
      return {
        stage, where: 'their account area (private)', private: true,
        salesOpening: "I see you're in your account. Want help finding equipment or managing your listings?",
        supportOpening: "I see you're in your account. Is something here I can help you with?",
        teaser: 'Need help with your account?',
      };
    case 'home':
      return {
        stage, where: 'the home page', private: false,
        salesOpening: ATLAS_DEFAULT_OPENING,
        supportOpening: ALLISON_DEFAULT_OPENING,
        teaser: 'Find, compare and negotiate by voice.',
      };
    default:
      return {
        stage, where: title ? `the "${title}" page` : 'a Vendibook page', subject: title || undefined, private: hidden,
        salesOpening: ATLAS_DEFAULT_OPENING,
        supportOpening: ALLISON_DEFAULT_OPENING,
        teaser: 'Find, compare and negotiate by voice.',
      };
  }
}

/** Contextual update sent to an agent when the call starts and on every page change. */
export function journeyBriefing(j: Journey, outline?: string): string {
  const subject = j.subject ? ` (${j.subject})` : '';
  const privacy = j.private ? ' This page is private: you only know its type, not what is on it.' : '';
  return `Journey: the user is on ${j.where}${subject}, stage "${j.stage}".${privacy}${outline ? ` ${outline}` : ''} Keep your help relevant to this step.`;
}

// ── Attention: what the user is pointing at, focused on or reading ─────────────

const POINT_TARGET =
  '[data-atlas-label], [data-atlas-section], a[href], button, [role="button"], [role="tab"], [role="link"], [role="switch"], [role="radio"], [role="checkbox"], [role="combobox"], select, input, textarea, h1, h2, h3, img[alt]';
const SENSITIVE = /(card|cvv|cvc|expir|ssn|social security|password|passcode|one-time|otp|routing|account ?number|iban|tax ?id|ein|date of birth|dob|email|e-mail|phone|tel)/i;
const DWELL_MS = 1400;
const FOCUS_MS = 800;
const SCROLL_IDLE_MS = 2200;
const MIN_GAP_MS = 5000;
const REPEAT_WINDOW_MS = 60000;

export interface AttentionItem { label: string; kind: 'pointing at' | 'focused on' | 'reading' }

function sectionOf(el: Element): string {
  const box = el.closest('[data-atlas-section], section, article, [role="region"], [role="dialog"]');
  const h = box?.querySelector('h1, h2, h3, h4, [data-atlas-section]');
  return clean(box?.getAttribute('data-atlas-label') || box?.getAttribute('aria-label') || h?.textContent, 60);
}

function describe(target: Element): string | null {
  const el = target.closest(POINT_TARGET);
  if (!el || el.closest('[data-atlas-ui], [data-atlas-private], footer')) return null;
  if (el instanceof HTMLInputElement && (el.type === 'password' || el.type === 'hidden')) return null;
  const label = el instanceof HTMLImageElement ? clean(el.alt, 60) : labelOf(el);
  if (!label || SENSITIVE.test(label) || SENSITIVE.test(el.getAttribute('autocomplete') ?? '')) return null;
  const section = sectionOf(el);
  return section && section.toLowerCase() !== label.toLowerCase() ? `"${label}" in the "${section}" section` : `"${label}"`;
}

/** The section heading nearest the top of the viewport (what they're reading after scrolling). */
function sectionInView(): string | null {
  const heads = Array.from(document.querySelectorAll('h1, h2, h3, [data-atlas-section]')).filter((h) => !h.closest('[data-atlas-ui], footer'));
  let best: { label: string; top: number } | null = null;
  for (const h of heads) {
    const top = h.getBoundingClientRect().top;
    if (top < -40 || top > window.innerHeight * 0.6) continue;
    const label = clean(h.getAttribute('data-atlas-label') || h.textContent, 60);
    if (label && (!best || Math.abs(top) < Math.abs(best.top))) best = { label, top };
  }
  return best ? `the "${best.label}" section` : null;
}

/**
 * Watches what the user rests their pointer on, focuses with the keyboard, or
 * stops scrolling at, and reports it at most every few seconds. Never on
 * private pages; never field values. Returns a stop function.
 */
export function watchAttention(report: (item: AttentionItem) => void): () => void {
  let dwell = 0;
  let scrollTimer = 0;
  let lastAt = 0;
  const recent = new Map<string, number>();

  const emit = (label: string | null, kind: AttentionItem['kind']) => {
    if (!label || isPrivateContext()) return;
    const now = Date.now();
    if (now - lastAt < MIN_GAP_MS) return;
    if ((recent.get(label) ?? 0) > now - REPEAT_WINDOW_MS) return;
    lastAt = now;
    recent.set(label, now);
    report({ label, kind });
  };

  const onOver = (e: PointerEvent) => {
    if (e.pointerType && e.pointerType !== 'mouse') return;
    window.clearTimeout(dwell);
    const target = e.target as Element | null;
    if (!target) return;
    dwell = window.setTimeout(() => emit(describe(target), 'pointing at'), DWELL_MS);
  };
  const onFocus = (e: FocusEvent) => {
    window.clearTimeout(dwell);
    const target = e.target as Element | null;
    if (!target) return;
    dwell = window.setTimeout(() => emit(describe(target), 'focused on'), FOCUS_MS);
  };
  const onScroll = () => {
    window.clearTimeout(scrollTimer);
    scrollTimer = window.setTimeout(() => emit(sectionInView(), 'reading'), SCROLL_IDLE_MS);
  };

  document.addEventListener('pointerover', onOver, { passive: true });
  document.addEventListener('focusin', onFocus);
  window.addEventListener('scroll', onScroll, { passive: true });
  return () => {
    window.clearTimeout(dwell);
    window.clearTimeout(scrollTimer);
    document.removeEventListener('pointerover', onOver);
    document.removeEventListener('focusin', onFocus);
    window.removeEventListener('scroll', onScroll);
  };
}

/** Contextual update for one attention item. The agent does not reply to these by itself. */
export const attentionBriefing = (a: AttentionItem) =>
  `Attention: the user is ${a.kind} ${a.label}. Use this only if it helps (they go quiet, ask "what's this", or it answers their question).`;

// ── Speaking up: offer help with what they're looking at ───────────────────────

/** How long the conversation must be quiet after the user settles on something before the agent offers help. */
export const NUDGE_QUIET_MS = 7000;
const NUDGE_GAP_MS = 45000;
const NUDGE_MAX_PER_CALL = 4;
export const SCREEN_NOTE_PREFIX = '[Screen note';

/**
 * Sent as a user-turn so the agent actually speaks (contextual updates are
 * silent). Marked as a website note so the agent never treats it as the
 * user's words.
 */
export const attentionNudge = (a: AttentionItem) =>
  `${SCREEN_NOTE_PREFIX} from the website, not words the user said: they paused, ${a.kind} ${a.label}. In one short, friendly sentence, say you see what they're looking at and offer help with it or say what you can do there. Then wait for them.]`;

/**
 * When the user rests on something and nobody has said anything for
 * NUDGE_QUIET_MS, the agent offers help with it ("I see you're looking at the
 * delivery options. Want me to walk you through them?"). At most one offer
 * every 45 seconds, four per call, once per item; never while the agent is
 * talking or the user is typing.
 */
export function createAttentionNudger(opts: { isBusy: () => boolean; nudge: (text: string) => void }) {
  let lastActivity = Date.now();
  let lastNudge = 0;
  let count = 0;
  let timer = 0;
  const offered = new Set<string>();
  return {
    /** Anyone said something (or the user is typing): restart the quiet clock. */
    activity() {
      lastActivity = Date.now();
    },
    attention(item: AttentionItem) {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        const now = Date.now();
        if (count >= NUDGE_MAX_PER_CALL || offered.has(item.label) || opts.isBusy()) return;
        if (now - lastNudge < NUDGE_GAP_MS || now - lastActivity < NUDGE_QUIET_MS) return;
        lastNudge = now;
        lastActivity = now;
        count += 1;
        offered.add(item.label);
        opts.nudge(attentionNudge(item));
      }, NUDGE_QUIET_MS);
    },
    stop() {
      window.clearTimeout(timer);
    },
  };
}
