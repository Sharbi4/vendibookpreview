/**
 * Scroll a settings section under the sticky top bar. Done by hand because the
 * global `[id]` scroll margin plus `html` scroll padding would double the gap.
 */
export function scrollToSection(id: string, smooth = true) {
  const el = document.getElementById(id);
  if (!el) return false;
  const top = el.getBoundingClientRect().top + window.scrollY - 88;
  window.scrollTo({ top: Math.max(0, top), behavior: smooth ? 'smooth' : 'auto' });
  try { history.replaceState(history.state, '', `#${id}`); } catch { /* ignore */ }
  return true;
}
