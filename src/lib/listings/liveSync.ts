/**
 * Live listing sync.
 *
 * When a host pauses, archives, or deletes a listing it must disappear from
 * every public surface (homepage rows, featured row, search results, related
 * listings, category carousels) immediately — not after the React Query
 * staleTime expires.
 *
 * Two channels are used together:
 *  1. Postgres changes on `public.listings` — authoritative, but Realtime
 *     applies RLS to the new row, so a listing that just became non-public
 *     may not reach anonymous subscribers.
 *  2. A broadcast on the same channel, emitted by the client performing the
 *     change. Broadcasts are not row-filtered, so every open tab hears it.
 */

import { useEffect } from "react";
import { useQueryClient, type QueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const LISTINGS_LIVE_CHANNEL = "listings-live";
export const LISTING_CHANGED_EVENT = "listing-changed";

/** Query-key fragments that render public listing collections. */
const LISTING_QUERY_HINTS = [
  "listing",
  "listings",
  "search",
  "featured",
  "trending",
  "nearby",
  "category",
  "home-row",
  "favorites",
];

/** Invalidates every cached query that can render listing collections. */
export function invalidateListingQueries(queryClient: QueryClient) {
  queryClient.invalidateQueries({
    predicate: (query) => {
      const key = JSON.stringify(query.queryKey).toLowerCase();
      return LISTING_QUERY_HINTS.some((hint) => key.includes(hint));
    },
  });
}

/** Tells every other open client that a listing's visibility changed. */
export async function broadcastListingChanged(listingId: string) {
  try {
    const channel = supabase.channel(`${LISTINGS_LIVE_CHANNEL}-emit`);
    await channel.subscribe();
    await channel.send({
      type: "broadcast",
      event: LISTING_CHANGED_EVENT,
      payload: { listingId, at: Date.now() },
    });
    supabase.removeChannel(channel);
  } catch {
    // Non-blocking: local invalidation still happens.
  }
}

/**
 * Mount once, app-wide. Keeps every listing surface in sync with the
 * database in real time.
 */
export function useListingsLiveSync() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel(LISTINGS_LIVE_CHANNEL)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "listings" },
        () => invalidateListingQueries(queryClient),
      )
      .on("broadcast", { event: LISTING_CHANGED_EVENT }, () =>
        invalidateListingQueries(queryClient),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
}
