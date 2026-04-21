import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export type ShareChannel = "facebook" | "x" | "sms" | "email" | "whatsapp" | "copy" | "native";

export interface ShareTemplate {
  channel: string;
  caption: string;
  hashtags: string[] | null;
  cta_text: string | null;
}

export const useShareKit = (listingId?: string) => {
  const { user } = useAuth();
  const [templates, setTemplates] = useState<ShareTemplate[]>([]);
  const [loading, setLoading] = useState(false);

  const generate = useCallback(async (variant: "default" | "hype" | "professional" | "casual" = "default") => {
    if (!listingId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-share-content", {
        body: { listing_id: listingId, channels: ["facebook", "x", "sms", "email", "whatsapp"], variant },
      });
      if (error) throw error;
      setTemplates(data?.templates ?? []);
    } catch (e: any) {
      toast.error("Could not generate share captions");
    } finally {
      setLoading(false);
    }
  }, [listingId]);

  const logShare = useCallback(async (channel: ShareChannel, opts: { entity_id?: string; share_url?: string; caption?: string; content_type?: string } = {}) => {
    try {
      await supabase.from("share_events").insert({
        user_id: user?.id ?? null,
        channel,
        content_type: opts.content_type ?? (listingId ? "listing" : "referral"),
        entity_id: opts.entity_id ?? listingId ?? null,
        share_url: opts.share_url ?? null,
        caption: opts.caption ?? null,
        utm_source: "share_kit",
        utm_medium: channel,
      });
    } catch {
      // non-blocking
    }
  }, [user?.id, listingId]);

  const share = useCallback(async (channel: ShareChannel, url: string, caption: string) => {
    const encodedUrl = encodeURIComponent(url);
    const encodedText = encodeURIComponent(caption);
    let target: string | null = null;

    switch (channel) {
      case "facebook": target = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}&quote=${encodedText}`; break;
      case "x": target = `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedText}`; break;
      case "whatsapp": target = `https://wa.me/?text=${encodedText}%20${encodedUrl}`; break;
      case "sms": target = `sms:?&body=${encodedText}%20${encodedUrl}`; break;
      case "email": target = `mailto:?subject=${encodeURIComponent("Check this out on Vendibook")}&body=${encodedText}%20${encodedUrl}`; break;
      case "copy":
        await navigator.clipboard.writeText(`${caption} ${url}`);
        toast.success("Copied to clipboard");
        break;
      case "native":
        if (navigator.share) {
          try { await navigator.share({ title: "Vendibook", text: caption, url }); } catch {}
        } else {
          await navigator.clipboard.writeText(`${caption} ${url}`);
          toast.success("Copied to clipboard");
        }
        break;
    }
    if (target) window.open(target, "_blank", "noopener,noreferrer");
    logShare(channel, { share_url: url, caption });
  }, [logShare]);

  return { templates, loading, generate, share, logShare };
};
