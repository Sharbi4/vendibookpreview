/**
 * Share Kit preflight verification.
 *
 * Before a host copies or posts anything from the Share Kit, we verify the
 * three things that actually break a social post:
 *   1. image  — the cover/preview image really loads (not 404 / not tiny)
 *   2. title  — present and short enough to survive social-card truncation
 *   3. link   — points at a listing that is live and publicly visible
 *
 * Pure verification only — no side effects, no money logic.
 */

import { supabase } from "@/integrations/supabase/client";
import {
  isListingPubliclyVisible,
  LISTING_UNAVAILABLE_TITLE,
} from "@/lib/listings/publicVisibility";

export type CheckStatus = "pending" | "checking" | "pass" | "warn" | "fail";

export interface ShareCheck {
  id: "image" | "title" | "link";
  label: string;
  status: CheckStatus;
  message: string;
  /** Extra detail shown under the message (dimensions, resolved URL, etc). */
  detail?: string;
}

export const TITLE_SOFT_MAX = 70;
export const MIN_IMAGE_WIDTH = 600;
const IMAGE_TIMEOUT_MS = 8000;

export interface ImageProbeResult {
  ok: boolean;
  width: number;
  height: number;
  reason?: "missing" | "error" | "timeout";
}

/** Loads the image in the browser to confirm it renders and is big enough. */
export function probeShareImage(url: string | null | undefined): Promise<ImageProbeResult> {
  return new Promise((resolve) => {
    if (!url || !url.trim()) {
      resolve({ ok: false, width: 0, height: 0, reason: "missing" });
      return;
    }
    if (typeof window === "undefined" || typeof Image === "undefined") {
      resolve({ ok: true, width: 0, height: 0 });
      return;
    }
    const img = new Image();
    let settled = false;
    const finish = (r: ImageProbeResult) => {
      if (settled) return;
      settled = true;
      img.onload = null;
      img.onerror = null;
      resolve(r);
    };
    const timer = window.setTimeout(
      () => finish({ ok: false, width: 0, height: 0, reason: "timeout" }),
      IMAGE_TIMEOUT_MS,
    );
    img.onload = () => {
      window.clearTimeout(timer);
      finish({ ok: true, width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => {
      window.clearTimeout(timer);
      finish({ ok: false, width: 0, height: 0, reason: "error" });
    };
    img.referrerPolicy = "no-referrer";
    img.src = url;
  });
}

export function checkImage(result: ImageProbeResult): ShareCheck {
  if (!result.ok) {
    const message =
      result.reason === "missing"
        ? "No cover photo yet — posts will share without an image."
        : result.reason === "timeout"
          ? "Image took too long to load and may not appear in posts."
          : "Image failed to load — it may have been deleted.";
    return {
      id: "image",
      label: "Preview image",
      status: result.reason === "missing" ? "warn" : "fail",
      message,
    };
  }
  if (result.width && result.width < MIN_IMAGE_WIDTH) {
    return {
      id: "image",
      label: "Preview image",
      status: "warn",
      message: `Image is small (${result.width}×${result.height}) and may look blurry when shared.`,
      detail: `Recommended at least ${MIN_IMAGE_WIDTH}px wide.`,
    };
  }
  return {
    id: "image",
    label: "Preview image",
    status: "pass",
    message: "Image loads correctly.",
    detail: result.width ? `${result.width}×${result.height}` : undefined,
  };
}

export function checkTitle(title: string | null | undefined): ShareCheck {
  const value = (title ?? "").trim();
  if (!value) {
    return { id: "title", label: "Title", status: "fail", message: "Title is missing." };
  }
  if (value.length < 10) {
    return {
      id: "title",
      label: "Title",
      status: "warn",
      message: "Title is very short — add detail so people know what it is.",
    };
  }
  if (value.length > TITLE_SOFT_MAX) {
    return {
      id: "title",
      label: "Title",
      status: "warn",
      message: `Title is ${value.length} characters and will be cut off in social previews.`,
      detail: `${value.slice(0, TITLE_SOFT_MAX)}…`,
    };
  }
  return { id: "title", label: "Title", status: "pass", message: "Title reads well in previews." };
}

export interface LinkProbeResult {
  ok: boolean;
  reason?: "invalid_url" | "not_found" | "not_public" | "error";
  title?: string | null;
  coverImageUrl?: string | null;
}

/** Confirms the shared URL is well-formed and resolves to a live listing. */
export async function probeShareLink(
  listingId: string | null | undefined,
  shareUrl: string,
): Promise<LinkProbeResult> {
  try {
    const parsed = new URL(shareUrl);
    if (!/^https?:$/.test(parsed.protocol)) return { ok: false, reason: "invalid_url" };
  } catch {
    return { ok: false, reason: "invalid_url" };
  }
  if (!listingId) return { ok: false, reason: "invalid_url" };

  try {
    const { data, error } = await supabase
      .from("listings")
      .select("id, title, cover_image_url, status, published_at, deleted_at, moderation_status")
      .eq("id", listingId)
      .maybeSingle();

    if (error) return { ok: false, reason: "error" };
    if (!data) return { ok: false, reason: "not_found" };
    if (!isListingPubliclyVisible(data)) {
      return { ok: false, reason: "not_public", title: data.title, coverImageUrl: data.cover_image_url };
    }
    return { ok: true, title: data.title, coverImageUrl: data.cover_image_url };
  } catch {
    return { ok: false, reason: "error" };
  }
}

export function checkLink(result: LinkProbeResult, shareUrl: string): ShareCheck {
  if (result.ok) {
    return {
      id: "link",
      label: "Destination link",
      status: "pass",
      message: "Link opens a live listing.",
      detail: shareUrl.replace(/^https?:\/\//, ""),
    };
  }
  const message =
    result.reason === "invalid_url"
      ? "Share link is not a valid URL."
      : result.reason === "not_found"
        ? "Link does not resolve to a listing."
        : result.reason === "not_public"
          ? LISTING_UNAVAILABLE_TITLE
          : "Could not verify the link right now.";
  return {
    id: "link",
    label: "Destination link",
    status: result.reason === "error" ? "warn" : "fail",
    message,
    detail: shareUrl.replace(/^https?:\/\//, ""),
  };
}

export function summarize(checks: ShareCheck[]): {
  verified: boolean;
  blocked: boolean;
  failing: ShareCheck[];
  warnings: ShareCheck[];
} {
  const failing = checks.filter((c) => c.status === "fail");
  const warnings = checks.filter((c) => c.status === "warn");
  const settled = checks.every((c) => c.status !== "pending" && c.status !== "checking");
  return {
    verified: settled && failing.length === 0,
    blocked: failing.length > 0,
    failing,
    warnings,
  };
}
