/**
 * Atlas page actions: lets Atlas see the page the buyer is on and act on it
 * the way a person sitting next to them would — scroll to a section, point
 * at something, read a section, flip photos, open a tab, type a ZIP code.
 *
 * Works on any page from the DOM (headings, buttons, links, fields), so no
 * component needs special markup. Optional hooks for precision:
 *   data-atlas-label="…"   a clearer name for an element
 *   data-atlas-section     treat an element as a section even without a heading
 *   data-atlas-ui          Atlas's own UI (never listed or touched)
 *   data-atlas-no-click    never clickable by Atlas
 *
 * Hard rule: Atlas never sends, pays, submits, signs in or accepts anything.
 * Those controls are listed as "buyer_only" and page_action refuses them;
 * Atlas points at them and the buyer taps.
 */

export type AtlasPageAction = 'scroll' | 'highlight' | 'read' | 'click' | 'fill';

export interface AtlasPageItem {
  ref: string;
  label: string;
  kind: 'section' | 'button' | 'link' | 'field' | 'select' | 'tab' | 'toggle';
  buyer_only?: true;
  /** Greyed out right now (loading, or not offered on this listing). */
  unavailable?: true;
  value?: string;
  in_view?: true;
}

const REF_ATTR = 'data-atlas-ref';
/** Fired on window after Atlas acts on the page (the call card shrinks out of the way on phones). */
export const ATLAS_PAGE_EVENT = 'atlas:page-action';
const SPOTLIGHT_CLASS = 'atlas-spotlight';
const SPOTLIGHT_MS = 4500;
const MAX_SECTIONS = 24;
const MAX_CONTROLS = 50;
/** Embedded map widgets (zoom, keyboard shortcuts) are noise to Atlas. */
const SKIP_WIDGETS = '.gm-style, .leaflet-container, .mapboxgl-map';

/**
 * Words on controls only the buyer may press. Matched on the visible label,
 * aria-label and title. Errs wide: a refused click costs one sentence, a
 * wrong click could send an offer or a payment.
 */
const BUYER_ONLY =
  /\b(send|pay|payment|submit|sign ?in|log ?in|sign ?up|register|create account|accept|decline|reject|confirm|place order|purchase|check ?out|buy|request to (buy|book)|book( now)?|reserve|delete|remove|cancel|report|block|subscribe|upgrade|start (my )?(trial|subscription)|save|verify|log ?out|sign ?out|publish|withdraw|counter|approve|agree|apply|donate)\b/i;

/** Fields Atlas must never type into (card, bank, identity, login). */
const SENSITIVE_FIELD =
  /(card|cc-|cvv|cvc|expir|ssn|social security|password|passcode|one-time|otp|routing|account ?number|iban|tax ?id|ein|license number|date of birth|dob|email|e-mail|phone|tel)/i;

const SECTION_SELECTOR = 'h1, h2, h3, [data-atlas-section]';
const CONTROL_SELECTOR =
  'a[href], button, input, select, textarea, [role="button"], [role="tab"], [role="link"], [role="switch"], [aria-expanded]';

const clean = (s: string | null | undefined, max = 70) => {
  const t = (s ?? '').replace(/\s+/g, ' ').trim();
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
};

function isVisible(el: Element): boolean {
  if (!(el instanceof HTMLElement)) return false;
  if (el.closest(`[data-atlas-ui], [aria-hidden="true"], [inert], footer, ${SKIP_WIDGETS}`)) return false;
  if (el.hidden) return false;
  const style = window.getComputedStyle(el);
  if (style.display === 'none' || style.visibility === 'hidden') return false;
  // jsdom has no layout; trust computed style there.
  if (typeof el.getClientRects === 'function' && el.getClientRects().length === 0 && document.body.getClientRects().length > 0) {
    return false;
  }
  return true;
}

function labelledByText(el: HTMLElement): string {
  const ids = el.getAttribute('aria-labelledby');
  if (!ids) return '';
  return ids
    .split(/\s+/)
    .map((id) => document.getElementById(id)?.textContent ?? '')
    .join(' ');
}

export function labelOf(el: Element): string {
  const h = el as HTMLElement;
  const explicit = h.getAttribute('data-atlas-label') || h.getAttribute('aria-label') || labelledByText(h);
  if (explicit) return clean(explicit);
  if (h instanceof HTMLInputElement || h instanceof HTMLTextAreaElement || h instanceof HTMLSelectElement) {
    const fromLabel = Array.from(h.labels ?? [])
      .map((l) => l.textContent)
      .join(' ');
    return clean(fromLabel || h.getAttribute('placeholder') || h.name || h.title);
  }
  return clean(h.innerText || h.textContent || h.title);
}

function kindOf(el: Element): AtlasPageItem['kind'] {
  const role = el.getAttribute('role');
  if (role === 'tab') return 'tab';
  if (el.matches('input[type="checkbox"], input[type="radio"], [role="switch"]')) return 'toggle';
  if (el instanceof HTMLSelectElement || role === 'combobox') return 'select';
  if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) return 'field';
  if (el instanceof HTMLAnchorElement || role === 'link') return 'link';
  return 'button';
}

function fieldIsSensitive(el: HTMLInputElement | HTMLTextAreaElement): boolean {
  if (el instanceof HTMLInputElement && !['text', 'search', 'number', ''].includes(el.type)) return true;
  const hints = [el.name, el.id, el.autocomplete, el.getAttribute('placeholder'), labelOf(el)].join(' ');
  return SENSITIVE_FIELD.test(hints);
}

/** True when Atlas must leave this control to the buyer. */
export function isBuyerOnly(el: Element): boolean {
  if (el.closest('[data-atlas-no-click]')) return true;
  if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
    if (el instanceof HTMLInputElement && (el.type === 'submit' || el.type === 'password' || el.type === 'file')) return true;
    return fieldIsSensitive(el);
  }
  if (el instanceof HTMLButtonElement && el.type === 'submit' && el.form) return true;
  if (el instanceof HTMLAnchorElement) {
    const href = el.getAttribute('href') ?? '';
    if (/^(mailto|tel|sms|javascript):/i.test(href)) return true;
    try {
      if (new URL(el.href, window.location.href).origin !== window.location.origin) return true;
    } catch {
      return true;
    }
    if (/\/(checkout|pay|invoice)/i.test(href)) return true;
  }
  const words = [labelOf(el), el.getAttribute('title') ?? ''].join(' ');
  return BUYER_ONLY.test(words);
}

const isDisabled = (el: Element) =>
  (el as HTMLButtonElement).disabled === true || el.getAttribute('aria-disabled') === 'true';

function inViewport(el: Element): boolean {
  const r = el.getBoundingClientRect();
  if (!r.width && !r.height) return false;
  return r.bottom > 0 && r.top < window.innerHeight;
}

function clearRefs(root: ParentNode) {
  root.querySelectorAll(`[${REF_ATTR}]`).forEach((el) => el.removeAttribute(REF_ATTR));
}

/**
 * Private pages Atlas must never read or operate on (messages, account/identity,
 * checkout/payment, admin, authenticated transactional pages). Fail closed:
 * on a match Atlas sees nothing and can do nothing but scroll.
 */
const PRIVATE_PATH =
  /^\/(?:(?:dashboard|messages|account|profile|settings|notifications?|notification-preferences|favorites|saved|payments?|checkout|pay|invoices?|orders?|transactions?|bookings?|host|seller|buyer|admin|partner|welcome|auth|verify|identity|billing|payouts?|offers?|purchase|build-studio\/my-builds)(?:[/?#]|$)|my-|square|paypal)/i;
const PRIVATE_MARKER = '[data-atlas-private]';
const PRIVATE_DIALOG_FIELD = 'input[type="password"], input[autocomplete^="cc-"], input[autocomplete="one-time-code"]';

export function isPrivateContext(): boolean {
  if (PRIVATE_PATH.test(window.location.pathname || '/')) return true;
  if (document.querySelector(PRIVATE_MARKER)) return true;
  const root = scopeRoot();
  return root !== document && Boolean((root as Element).querySelector(PRIVATE_DIALOG_FIELD));
}

const PRIVATE_REPLY = 'This page is private to the buyer (account, messages, payment or admin). I can not look at or use it; ask the buyer to handle it themselves.';

/** The topmost open dialog, if any: Atlas works inside it while it's open. */
function scopeRoot(): ParentNode {
  const dialogs = Array.from(document.querySelectorAll('[role="dialog"], [role="alertdialog"], dialog[open]')).filter(
    (d) => isVisible(d),
  );
  return dialogs[dialogs.length - 1] ?? document;
}

export interface AtlasPageMap {
  page: string;
  title: string;
  scrolled_percent: number;
  in_dialog?: true;
  sections: AtlasPageItem[];
  controls: AtlasPageItem[];
  note: string;
}

/** Scan the page and tag what Atlas can refer to (refs are valid until the next scan). */
export function scanPage(): AtlasPageMap {
  clearRefs(document);
  if (isPrivateContext()) {
    return { page: 'private', title: '', scrolled_percent: 0, sections: [], controls: [], note: PRIVATE_REPLY };
  }
  const root = scopeRoot();
  const sections: AtlasPageItem[] = [];
  const controls: AtlasPageItem[] = [];
  const seen = new Set<string>();

  let s = 0;
  for (const el of Array.from(root.querySelectorAll(SECTION_SELECTOR))) {
    if (sections.length >= MAX_SECTIONS) break;
    if (!isVisible(el)) continue;
    const label = labelOf(el);
    if (!label || seen.has(`s:${label.toLowerCase()}`)) continue;
    seen.add(`s:${label.toLowerCase()}`);
    const ref = `s${++s}`;
    el.setAttribute(REF_ATTR, ref);
    sections.push({ ref, label, kind: 'section', ...(inViewport(el) ? { in_view: true as const } : {}) });
  }

  // Main content first; the site header after it.
  const all = Array.from(root.querySelectorAll(CONTROL_SELECTOR)).filter((el) => isVisible(el));
  const inHeader = (el: Element) => Boolean(el.closest('header, nav'));
  const ordered = [...all.filter((el) => !inHeader(el)), ...all.filter(inHeader)];

  let c = 0;
  for (const el of ordered) {
    if (controls.length >= MAX_CONTROLS) break;
    if ((el as HTMLInputElement).type === 'hidden') continue;
    const label = labelOf(el);
    if (!label) continue;
    const kind = kindOf(el);
    // "Open photo 3 of 16" ×16 → keep the first; the others crowd out real controls.
    const key = `${kind}:${label.toLowerCase().replace(/\b\d+ of \d+\b/, '# of #')}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const ref = `c${++c}`;
    el.setAttribute(REF_ATTR, ref);
    const item: AtlasPageItem = { ref, label, kind };
    if (isBuyerOnly(el)) item.buyer_only = true;
    if (isDisabled(el)) item.unavailable = true;
    if (el instanceof HTMLSelectElement) item.value = clean(el.selectedOptions[0]?.textContent, 40);
    else if ((el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) && !item.buyer_only && el.value) {
      item.value = clean(el.value, 40);
    }
    if (el.getAttribute('aria-expanded')) item.label = `${label} (${el.getAttribute('aria-expanded') === 'true' ? 'open' : 'closed'})`;
    if (el.getAttribute('aria-selected') === 'true' || el.getAttribute('aria-pressed') === 'true') item.label = `${item.label} (selected)`;
    if (inViewport(el)) item.in_view = true;
    controls.push(item);
  }

  const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
  return {
    page: `${window.location.pathname}${window.location.search}`,
    title: clean(document.title, 90),
    scrolled_percent: Math.round((Math.min(window.scrollY, max) / max) * 100),
    ...(root !== document ? { in_dialog: true as const } : {}),
    sections,
    controls,
    note:
      'Use page_action with a ref. buyer_only controls (send, pay, submit, sign in, accept, buy, save) are for the buyer: highlight them and ask the buyer to tap. Refs change after the page changes; look again if one is not found.',
  };
}

/** Short outline (headings only) for a contextual update after navigation. */
export function pageOutline(maxSections = 12): string {
  if (isPrivateContext()) return 'This page is private; Atlas can not see it.';
  const map = scanPage();
  const heads = map.sections.slice(0, maxSections).map((s) => s.label);
  return heads.length ? `Sections on this page: ${heads.join(' · ')}.` : 'This page has no section headings.';
}

const reduceMotion = () => typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function find(ref: unknown): HTMLElement | null {
  if (typeof ref !== 'string' || !/^[sc]\d{1,3}$/.test(ref)) return null;
  return document.querySelector<HTMLElement>(`[${REF_ATTR}="${ref}"]`);
}

// Near the top (under the sticky header, via scroll-margin-top): the call card sits at the bottom.
function scrollToEl(el: HTMLElement) {
  el.scrollIntoView?.({ behavior: reduceMotion() ? 'auto' : 'smooth', block: 'start' });
}

const spotlightTimers = new WeakMap<HTMLElement, number>();

export function spotlight(el: HTMLElement) {
  const prev = spotlightTimers.get(el);
  if (prev) window.clearTimeout(prev);
  el.classList.add(SPOTLIGHT_CLASS);
  spotlightTimers.set(
    el,
    window.setTimeout(() => {
      el.classList.remove(SPOTLIGHT_CLASS);
      spotlightTimers.delete(el);
    }, SPOTLIGHT_MS),
  );
}

/** Text under a heading, up to the next heading of the same or higher level. */
export function readSection(el: HTMLElement, max = 700): string {
  if (isPrivateContext() || el.closest(PRIVATE_MARKER)) return '';
  const level = /^H([1-6])$/.exec(el.tagName)?.[1];
  if (!level) return clean(el.innerText || el.textContent, max);
  const stop = (n: Element) => {
    const m = /^H([1-6])$/.exec(n.tagName);
    return Boolean(m && Number(m[1]) <= Number(level));
  };
  const parts: string[] = [];
  let length = 0;
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
  walker.currentNode = el;
  // Start after the heading's own text.
  let node: Node | null = nextOutside(walker, el);
  while (node && length < max) {
    if (node instanceof Element) {
      if (node !== el && stop(node)) break;
      if (node.closest('[data-atlas-ui], script, style, [aria-hidden="true"]')) {
        node = nextOutside(walker, node);
        continue;
      }
    } else if (node.nodeType === Node.TEXT_NODE) {
      const t = node.textContent?.replace(/\s+/g, ' ').trim();
      if (t) {
        parts.push(t);
        length += t.length + 1;
      }
    }
    node = walker.nextNode();
  }
  return clean(parts.join(' '), max) || 'This section has no readable text.';
}

function nextOutside(walker: TreeWalker, from: Node): Node | null {
  let n: Node | null = from;
  while (n && n !== document.body) {
    walker.currentNode = n;
    const sib = walker.nextSibling();
    if (sib) return sib;
    n = n.parentNode;
  }
  return null;
}

function setFieldValue(el: HTMLInputElement | HTMLTextAreaElement, value: string) {
  // React tracks the native setter; set through it so onChange fires.
  const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(proto, 'value')?.set?.call(el, value);
  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
}

function setSelectValue(el: HTMLSelectElement, value: string): string | null {
  const want = value.trim().toLowerCase();
  const option =
    Array.from(el.options).find((o) => o.textContent?.trim().toLowerCase() === want || o.value.toLowerCase() === want) ??
    Array.from(el.options).find((o) => o.textContent?.toLowerCase().includes(want));
  if (!option) return null;
  Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value')?.set?.call(el, option.value);
  el.dispatchEvent(new Event('change', { bubbles: true }));
  return clean(option.textContent, 40);
}

const isSearchy = (el: HTMLElement) =>
  el.matches('input[type="search"], [role="searchbox"]') || /search|zip|postal|city|location/i.test(labelOf(el));

/**
 * Do one thing on the page. Returns a short sentence for Atlas to speak from.
 * Never presses a buyer_only control and never types into sensitive fields.
 */
export function pageAction(p: Record<string, unknown> = {}): string {
  const action = String(p.action ?? '') as AtlasPageAction;
  const target = typeof p.target === 'string' ? p.target.trim() : '';

  if (action === 'scroll' && ['up', 'down', 'top', 'bottom'].includes(target)) {
    const behavior: ScrollBehavior = reduceMotion() ? 'auto' : 'smooth';
    window.dispatchEvent(new CustomEvent(ATLAS_PAGE_EVENT, { detail: { action } }));
    if (target === 'top') window.scrollTo({ top: 0, behavior });
    else if (target === 'bottom') window.scrollTo({ top: document.documentElement.scrollHeight, behavior });
    else window.scrollBy({ top: (target === 'down' ? 1 : -1) * Math.round(window.innerHeight * 0.75), behavior });
    return `Scrolled ${target}.`;
  }

  if (isPrivateContext()) return PRIVATE_REPLY;
  const el = find(target);
  if (!el || !el.isConnected) return 'That part of the page is not there anymore. Call look_at_page and try again with a fresh ref.';
  window.dispatchEvent(new CustomEvent(ATLAS_PAGE_EVENT, { detail: { action } }));
  const label = labelOf(el) || 'that';

  switch (action) {
    case 'scroll':
      scrollToEl(el);
      return `Scrolled to "${label}".`;

    case 'highlight':
      scrollToEl(el);
      spotlight(el);
      return isBuyerOnly(el)
        ? `Highlighted "${label}" on their screen. That one is theirs to tap — let them know it's lit up.`
        : `Highlighted "${label}" on their screen.`;

    case 'read':
      scrollToEl(el);
      return JSON.stringify({ section: label, text: readSection(el) });

    case 'click': {
      if (isDisabled(el)) {
        scrollToEl(el);
        spotlight(el);
        return `"${label}" is greyed out right now — the page may still be loading, or it isn't offered here.`;
      }
      if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
        el.focus();
        scrollToEl(el);
        return `Put the cursor in "${label}".`;
      }
      if (isBuyerOnly(el)) {
        scrollToEl(el);
        spotlight(el);
        return `"${label}" is something the buyer has to press themselves. It's highlighted on their screen — ask them to tap it when they're ready.`;
      }
      scrollToEl(el);
      spotlight(el);
      el.click();
      return `Pressed "${label}".`;
    }

    case 'fill': {
      const value = typeof p.value === 'string' ? p.value.slice(0, 120) : String(p.value ?? '').slice(0, 120);
      if (!value) return 'Nothing to type. Give a value.';
      if (el instanceof HTMLSelectElement) {
        const picked = setSelectValue(el, value);
        spotlight(el);
        return picked ? `Set "${label}" to ${picked}.` : `"${label}" has no option like "${value}".`;
      }
      if (!(el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement)) return `"${label}" is not a field Atlas can type into.`;
      if (isBuyerOnly(el)) {
        spotlight(el);
        return `"${label}" is private (payment, login or contact details). Ask the buyer to type it themselves.`;
      }
      scrollToEl(el);
      el.focus();
      setFieldValue(el, value);
      spotlight(el);
      if (p.press_enter === true && isSearchy(el)) {
        el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', bubbles: true }));
        el.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', code: 'Enter', bubbles: true }));
        const form = el.form;
        if (form && (form.getAttribute('role') === 'search' || form.querySelectorAll('input:not([type="hidden"])').length === 1)) {
          form.requestSubmit?.();
        }
      }
      return `Typed "${value}" into "${label}".`;
    }

    default:
      return 'Unknown action. Use scroll, highlight, read, click or fill.';
  }
}
