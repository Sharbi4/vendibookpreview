import { useCallback, useEffect, useMemo, useState } from "react";
import {
  checkImage,
  checkLink,
  checkTitle,
  probeShareImage,
  probeShareLink,
  summarize,
  type ShareCheck,
} from "@/lib/share/sharePreflight";

interface Options {
  listingId?: string | null;
  title?: string | null;
  imageUrl?: string | null;
  shareUrl: string;
  /** Skip while a modal is closed. */
  enabled?: boolean;
}

const pendingChecks = (): ShareCheck[] => [
  { id: "image", label: "Preview image", status: "checking", message: "Loading image…" },
  { id: "title", label: "Title", status: "checking", message: "Checking title…" },
  { id: "link", label: "Destination link", status: "checking", message: "Opening link…" },
];

/**
 * Verifies image, title and link before a host copies or posts a share.
 * Returns per-item results plus a single `verified` gate for the UI.
 */
export function useSharePreflight({ listingId, title, imageUrl, shareUrl, enabled = true }: Options) {
  const [checks, setChecks] = useState<ShareCheck[]>(pendingChecks);
  const [running, setRunning] = useState(false);
  const [lastRunAt, setLastRunAt] = useState<number | null>(null);

  const run = useCallback(async () => {
    setRunning(true);
    setChecks(pendingChecks());
    const [imageResult, linkResult] = await Promise.all([
      probeShareImage(imageUrl),
      probeShareLink(listingId, shareUrl),
    ]);
    setChecks([
      checkImage(imageResult),
      checkTitle(title),
      checkLink(linkResult, shareUrl),
    ]);
    setLastRunAt(Date.now());
    setRunning(false);
  }, [imageUrl, listingId, shareUrl, title]);

  useEffect(() => {
    if (!enabled) return;
    void run();
  }, [enabled, run]);

  const summary = useMemo(() => summarize(checks), [checks]);

  return { checks, running, lastRunAt, recheck: run, ...summary };
}
