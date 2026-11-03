// Isolated APPROVE (approvepayments.com) embed.
// The vendor loader is NEVER run on the Vendibook origin: it only runs inside
// a sandboxed srcDoc iframe with an opaque origin (no allow-same-origin), so it
// cannot read the Vendibook session, cookies, storage or parent DOM.

export const APPROVE_FLAG_KEY = "approve_financing_enabled";

export const APPROVE_LOADER_URL =
  "https://plugin.approvepayments.com/plugin/4.0/loader/ZWuUVF07aZI0sE48tFFhb1cTMHOVaQq0CyLHFQA0";

/** Exact sandbox tokens. Never add allow-same-origin / top-navigation / downloads. */
export const APPROVE_SANDBOX = "allow-scripts allow-forms";

/**
 * Static document for the iframe. Takes no arguments on purpose: no listing,
 * location, user or customer data can ever be interpolated into it.
 */
export function buildApproveSrcDoc(): string {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="referrer" content="no-referrer">
<style>
body{margin:0;font-family:system-ui,-apple-system,sans-serif;background:#fff;color:#111}
main{padding:20px}
#approve-status{font-size:14px;color:#555;margin-top:12px}
.approve-open{font:inherit;font-size:16px;padding:12px 20px;border-radius:8px;border:0;background:#111;color:#fff;cursor:pointer}
</style>
<script>
// In-memory sessionStorage for the vendor's own form session. The real
// storage is blocked in this opaque-origin frame; nothing is persisted and
// nothing from the parent page is reachable.
(function(){
  var m = new Map();
  var shim = {
    getItem: function(k){ k=String(k); return m.has(k) ? m.get(k) : null; },
    setItem: function(k,v){ m.set(String(k), String(v)); },
    removeItem: function(k){ m.delete(String(k)); },
    clear: function(){ m.clear(); },
    key: function(i){ return Array.from(m.keys())[i] ?? null; },
    get length(){ return m.size; }
  };
  try { Object.defineProperty(window, 'sessionStorage', { value: shim, configurable: true }); }
  catch (e) { window.__approveShimFailed = true; }
})();
</script>
</head><body><main>
<approve-plugin></approve-plugin>
<button type="button" class="approve-open" approve-function="embedded_app" approve-action="open_app">Start an APPROVE application</button>
<div id="approve-status" role="status">Loading APPROVE…</div>
</main>
<script>
(function(){
  var status = document.getElementById('approve-status');
  function fail(msg){ status.textContent = msg; }
  if (window.__approveShimFailed) { fail('APPROVE could not start in this browser. Please try again later.'); return; }
  if (document.querySelector('script[data-approve-loader]')) return; // singleton
  var s = document.createElement('script');
  s.async = true;
  s.src = ${JSON.stringify(APPROVE_LOADER_URL)};
  s.setAttribute('data-approve-loader', '1');
  var timer = setTimeout(function(){ fail('APPROVE is taking too long to load. Please try again later.'); }, 15000);
  s.onload = function(){ clearTimeout(timer); status.textContent = ''; };
  s.onerror = function(){ clearTimeout(timer); fail('APPROVE could not be loaded. Please try again later.'); };
  document.body.appendChild(s);
})();
</script>
</body></html>`;
}
