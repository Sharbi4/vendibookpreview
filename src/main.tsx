import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./lib/i18n"; // Initialize i18n
import { Capacitor } from '@capacitor/core';
import { isFontPreviewEnabled } from './lib/fontPairs';

// Native resilience: disable Service Worker in the Capacitor container
// to prevent stale cache / chunk-loading issues after app updates.
if (Capacitor.isNativePlatform() && "serviceWorker" in navigator) {
  navigator.serviceWorker
    .getRegistrations()
    .then((regs) => Promise.all(regs.map((r) => r.unregister())))
    .catch(() => { /* no-op */ });
}

// Dev resilience: avoid stale Service Worker / cache causing
// "TypeError: Importing a module script failed" after hot updates.
if (import.meta.env.DEV && "serviceWorker" in navigator) {
  navigator.serviceWorker
    .getRegistrations()
    .then((regs) => Promise.all(regs.map((r) => r.unregister())))
    .catch(() => {
      // noop
    });

  if ("caches" in window) {
    caches
      .keys()
      .then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
      .catch(() => {
        // noop
      });
  }
}

// Recover from broken chunk/module loads (usually a stale cached bundle)
window.addEventListener("vite:preloadError", () => {
  window.location.reload();
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

// Font diagnostic: reports whether the Avenir site font actually loaded in this browser.
if (typeof document !== 'undefined' && 'fonts' in document) {
  window.setTimeout(() => {
    void document.fonts.ready.then(() => {
      const faces = [...document.fonts].filter((f) => f.family.includes('Avenir'));
      console.info('[font-check]', faces.map((f) => `${f.weight}/${f.style}:${f.status}`).join(', '), 'regular-available:', document.fonts.check("16px 'Avenir Next LT Pro'"));
    });
  }, 4000);
}

// Preview-only font pairing comparison panel. Never mounted on the published site.
if (isFontPreviewEnabled()) {
  void import('./components/preview/FontPairSwitcher')
    .then((m) => m.mountFontPairSwitcher())
    .catch(() => {
      /* preview chrome is optional */
    });
}
