import { useEffect, useState, type CSSProperties } from 'react';
import { createRoot } from 'react-dom/client';
import '@/styles/font-pairs.css';
import { FONT_PAIRS, applyFontPair, savedFontPair, type FontPair } from '@/lib/fontPairs';

function sampleStyle(pair: FontPair): CSSProperties {
  return {
    '--vb-sample-heading': `'${pair.heading}', system-ui, sans-serif`,
    '--vb-sample-body': `'${pair.body}', system-ui, sans-serif`,
  } as CSSProperties;
}

function FontPairSwitcher() {
  const [open, setOpen] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(() => savedFontPair()?.id ?? null);

  useEffect(() => {
    const saved = savedFontPair();
    if (saved) applyFontPair(saved);
  }, []);

  return (
    <div className="pointer-events-none fixed bottom-20 left-3 z-[210] w-[17.5rem] max-w-[calc(100vw-1.5rem)] sm:bottom-6 sm:left-6">
      <div className="pointer-events-auto overflow-hidden rounded-xl border border-border bg-card text-foreground shadow-2xl">
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-xs font-semibold"
        >
          <span>Font pairing · preview</span>
          <span className="text-muted-foreground">{open ? 'Hide' : 'Show'}</span>
        </button>

        {open && (
          <div className="max-h-[46vh] overflow-y-auto px-2 pb-2">
            <ul className="space-y-1">
              {FONT_PAIRS.map((pair) => {
                const active = pair.id === activeId;
                return (
                  <li key={pair.id}>
                    <button
                      type="button"
                      onClick={() => {
                        applyFontPair(pair);
                        setActiveId(pair.id);
                      }}
                      className={`w-full rounded-lg border px-2.5 py-2 text-left transition-colors ${
                        active ? 'border-primary bg-muted' : 'border-transparent hover:bg-muted'
                      }`}
                    >
                      <span className="block text-[13px] font-semibold leading-tight">
                        {pair.label}
                      </span>
                      <span className="mt-0.5 block text-[11px] leading-snug text-muted-foreground">
                        {pair.note}
                      </span>
                      <span
                        className="mt-1.5 flex items-baseline gap-2.5 text-[15px] leading-none"
                        style={sampleStyle(pair)}
                      >
                        <span data-vb-sample="heading" className="font-bold">
                          Aa
                        </span>
                        <span data-vb-sample="body">Aa</span>
                        <span data-vb-sample="body" className="text-[11px] text-muted-foreground">
                          Browse by category
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>

            <div className="mt-2 flex items-center justify-between gap-2 px-1">
              <span className="text-[10px] text-muted-foreground">Preview only · not published</span>
              <button
                type="button"
                onClick={() => {
                  applyFontPair(null);
                  setActiveId(null);
                }}
                className="text-[10px] font-semibold text-primary"
              >
                Reset to site default
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function mountFontPairSwitcher(): void {
  if (typeof document === 'undefined') return;
  if (document.getElementById('vb-font-pair-switcher')) return;
  const host = document.createElement('div');
  host.id = 'vb-font-pair-switcher';
  document.body.appendChild(host);
  createRoot(host).render(<FontPairSwitcher />);
}
