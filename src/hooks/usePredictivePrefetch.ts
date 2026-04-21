import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Predictive prefetch — lightweight ML-lite scoring of what listing the user
 * is most likely to click next, then prefetches it via TanStack Query cache.
 *
 * Heuristics (weights):
 *   - hover dwell time on a card  (1.5x)
 *   - card visible in viewport    (1.0x)
 *   - position from top of list   (0.5x decay)
 *
 * The top-scoring listing has its detail data warmed via supabase
 * `from('listings').select(*).eq('id', X).maybeSingle()` so navigation feels
 * instant.
 */

type Score = { id: string; score: number };

const PREFETCHED = new Set<string>();

async function prefetchListing(id: string) {
  if (PREFETCHED.has(id)) return;
  PREFETCHED.add(id);
  try {
    // Warm Supabase HTTP cache + browser HTTP cache
    await supabase.from("listings").select("*").eq("id", id).maybeSingle();
    // Also prefetch the prerendered HTML at the edge (warms CDN cache)
    fetch(`/listing/${id}`, { method: "HEAD", credentials: "omit" }).catch(() => {});
  } catch {
    // ignore
  }
}

export function usePredictivePrefetch(rootSelector = '[data-listing-id]') {
  const scoresRef = useRef<Map<string, Score>>(new Map());
  const hoverStartRef = useRef<Map<string, number>>(new Map());
  const tickRef = useRef<number | null>(null);

  useEffect(() => {
    const updateScore = (id: string, delta: number) => {
      const cur = scoresRef.current.get(id) ?? { id, score: 0 };
      cur.score += delta;
      scoresRef.current.set(id, cur);
    };

    const onMouseEnter = (e: Event) => {
      const el = e.currentTarget as HTMLElement;
      const id = el.dataset.listingId;
      if (!id) return;
      hoverStartRef.current.set(id, Date.now());
    };
    const onMouseLeave = (e: Event) => {
      const el = e.currentTarget as HTMLElement;
      const id = el.dataset.listingId;
      if (!id) return;
      const start = hoverStartRef.current.get(id);
      if (start) {
        const dwellMs = Date.now() - start;
        updateScore(id, Math.min(dwellMs / 1000, 5) * 1.5);
        hoverStartRef.current.delete(id);
      }
    };

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((en) => {
          const id = (en.target as HTMLElement).dataset.listingId;
          if (!id) return;
          if (en.isIntersecting) {
            updateScore(id, 1.0 * en.intersectionRatio);
          }
        });
      },
      { threshold: [0.25, 0.75] },
    );

    const attach = () => {
      const nodes = document.querySelectorAll<HTMLElement>(rootSelector);
      nodes.forEach((el, idx) => {
        const id = el.dataset.listingId;
        if (!id) return;
        // Position decay
        updateScore(id, Math.max(0, 1 - idx * 0.05) * 0.5);
        el.addEventListener("mouseenter", onMouseEnter);
        el.addEventListener("mouseleave", onMouseLeave);
        io.observe(el);
      });
      return nodes;
    };

    let nodes = attach();

    // Re-attach when DOM changes (infinite scroll, etc.)
    const mo = new MutationObserver(() => {
      nodes.forEach((el) => {
        el.removeEventListener("mouseenter", onMouseEnter);
        el.removeEventListener("mouseleave", onMouseLeave);
      });
      io.disconnect();
      nodes = attach();
    });
    mo.observe(document.body, { childList: true, subtree: true });

    // Tick: every 2s, prefetch top scoring listing if it has changed
    let lastTopId: string | null = null;
    const tick = () => {
      const arr = Array.from(scoresRef.current.values()).sort(
        (a, b) => b.score - a.score,
      );
      const top = arr[0];
      if (top && top.score > 1.5 && top.id !== lastTopId) {
        lastTopId = top.id;
        // requestIdleCallback if available
        const ric = (window as any).requestIdleCallback ?? ((fn: any) => setTimeout(fn, 200));
        ric(() => prefetchListing(top.id));
      }
    };
    tickRef.current = window.setInterval(tick, 2000);

    return () => {
      if (tickRef.current) window.clearInterval(tickRef.current);
      mo.disconnect();
      io.disconnect();
      nodes.forEach((el) => {
        el.removeEventListener("mouseenter", onMouseEnter);
        el.removeEventListener("mouseleave", onMouseLeave);
      });
    };
  }, [rootSelector]);
}
