export type FontPair = {
  id: string;
  label: string;
  heading: string;
  body: string;
  note: string;
};

/**
 * Preview-only comparison set. Every family here is bundled as a local WOFF2
 * in src/assets/fonts (see src/styles/font-pairs.css) so the comparison is
 * honest in browsers that cannot reach a font CDN.
 */
export const FONT_PAIRS: FontPair[] = [
  {
    id: 'outfit-figtree',
    label: 'Current: Outfit + Figtree',
    heading: 'Outfit',
    body: 'Figtree',
    note: 'Geometric headlines, friendly body',
  },
  {
    id: 'sora-manrope',
    label: 'Sora + Manrope',
    heading: 'Sora',
    body: 'Manrope',
    note: 'Crisp and modern, tight and premium',
  },
  {
    id: 'space-grotesk-dm-sans',
    label: 'Space Grotesk + DM Sans',
    heading: 'Space Grotesk',
    body: 'DM Sans',
    note: 'Distinctive headlines, very readable body',
  },
  {
    id: 'syne-jakarta',
    label: 'Syne + Plus Jakarta Sans',
    heading: 'Syne',
    body: 'Plus Jakarta Sans',
    note: 'Bold editorial headlines, clean body',
  },
  {
    id: 'archivo-epilogue',
    label: 'Archivo + Epilogue',
    heading: 'Archivo',
    body: 'Epilogue',
    note: 'Wide, confident headlines, warm body',
  },
  {
    id: 'instrument-serif-work-sans',
    label: 'Instrument Serif + Work Sans',
    heading: 'Instrument Serif',
    body: 'Work Sans',
    note: 'Elegant serif headlines, quiet body',
  },
];

const STORAGE_KEY = 'vb-preview-font-pair';

export function applyFontPair(pair: FontPair | null): void {
  const root = document.documentElement;
  if (!pair) {
    root.style.removeProperty('--font-heading');
    root.style.removeProperty('--font-site');
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* storage unavailable */
    }
    return;
  }

  root.style.setProperty('--font-heading', `'${pair.heading}', system-ui, sans-serif`);
  root.style.setProperty('--font-site', `'${pair.body}', system-ui, sans-serif`);
  try {
    localStorage.setItem(STORAGE_KEY, pair.id);
  } catch {
    /* storage unavailable */
  }

  // Warm the faces so the swap lands instantly instead of flickering.
  if (typeof document !== 'undefined' && 'fonts' in document) {
    ['300', '400', '500', '600', '700'].forEach((weight) => {
      void document.fonts.load(`${weight} 16px '${pair.body}'`).catch(() => undefined);
      void document.fonts.load(`${weight} 16px '${pair.heading}'`).catch(() => undefined);
    });
  }
}

export function savedFontPair(): FontPair | null {
  try {
    const id = localStorage.getItem(STORAGE_KEY);
    return FONT_PAIRS.find((pair) => pair.id === id) ?? null;
  } catch {
    return null;
  }
}

/** Preview chrome only: never enabled on the published site. */
export function isFontPreviewEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  const { hostname, search } = window.location;
  try {
    if (new URLSearchParams(search).has('fonts')) return true;
  } catch {
    /* malformed query string */
  }
  if (import.meta.env.DEV) return true;
  return (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname.includes('id-preview--')
  );
}
