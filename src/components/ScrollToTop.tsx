import { useEffect } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';

/**
 * Scroll to top on navigation — but preserve scroll position when the user
 * hits browser Back/Forward (POP navigations). This matches native browser
 * behavior for search results and dashboard lists.
 */
const ScrollToTop = () => {
  const { pathname, hash } = useLocation();
  const navType = useNavigationType();

  useEffect(() => {
    // Respect anchor links (e.g. /faq#refunds) — the browser handles scrolling.
    if (hash) return;
    // Don't fight the browser on back/forward — let it restore prior scroll.
    if (navType === 'POP') return;
    window.scrollTo(0, 0);
  }, [pathname, hash, navType]);

  return null;
};

export default ScrollToTop;
