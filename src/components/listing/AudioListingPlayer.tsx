import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Headphones, Loader2, Pause, Play, Square } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Props {
  listingId: string;
  className?: string;
  variant?: "compact" | "card";
}

/**
 * On-demand AI audio narration. First tap fetches /listing-narration
 * which returns raw MP3, plays in-browser. Per session we keep the
 * generated blob URL so re-tapping replays instantly.
 */
export function AudioListingPlayer({ listingId, className, variant = "card" }: Props) {
  const [state, setState] = useState<"idle" | "loading" | "playing" | "paused">("idle");
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    return () => {
      if (blobUrl) URL.revokeObjectURL(blobUrl);
      audioRef.current?.pause();
    };
  }, [blobUrl]);

  const fetchAndPlay = async () => {
    try {
      setState("loading");
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/listing-narration`;
      const resp = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ listing_id: listingId }),
      });
      if (!resp.ok) {
        if (resp.status === 429) toast.error("Audio narration is busy — try again in a moment.");
        else if (resp.status === 402) toast.error("AI credits exhausted. Please add funds.");
        else toast.error("Couldn't generate audio.");
        setState("idle");
        return;
      }
      const blob = await resp.blob();
      const u = URL.createObjectURL(blob);
      setBlobUrl(u);
      const a = new Audio(u);
      audioRef.current = a;
      a.onended = () => setState("idle");
      a.onpause = () => setState((s) => (s === "playing" ? "paused" : s));
      a.onplay = () => setState("playing");
      await a.play();
    } catch (e) {
      console.error(e);
      setState("idle");
      toast.error("Couldn't play narration.");
    }
  };

  const handleClick = async () => {
    if (state === "loading") return;
    if (!audioRef.current) return fetchAndPlay();
    if (state === "playing") {
      audioRef.current.pause();
    } else if (state === "paused") {
      await audioRef.current.play();
    } else {
      audioRef.current.currentTime = 0;
      await audioRef.current.play();
    }
  };

  const handleStop = () => {
    audioRef.current?.pause();
    if (audioRef.current) audioRef.current.currentTime = 0;
    setState("idle");
  };

  if (variant === "compact") {
    return (
      <Button
        type="button"
        size="sm"
        variant="ghost"
        onClick={handleClick}
        className={cn("h-8 gap-1.5 text-xs", className)}
      >
        {state === "loading" ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : state === "playing" ? (
          <Pause className="h-3.5 w-3.5" />
        ) : (
          <Headphones className="h-3.5 w-3.5" />
        )}
        {state === "playing" ? "Pause" : "Listen"}
      </Button>
    );
  }

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-xl border border-border bg-card/60 p-3",
        className,
      )}
    >
      <Button
        type="button"
        size="icon"
        onClick={handleClick}
        disabled={state === "loading"}
        className="h-11 w-11 rounded-full"
      >
        {state === "loading" ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : state === "playing" ? (
          <Pause className="h-5 w-5" />
        ) : (
          <Play className="h-5 w-5" />
        )}
      </Button>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 text-sm font-medium text-foreground">
          <Headphones className="h-3.5 w-3.5 text-primary" />
          Listen to this listing
        </div>
        <div className="text-xs text-muted-foreground">
          Audio walkthrough — about 60 seconds
        </div>
      </div>
      {state !== "idle" && state !== "loading" && (
        <Button
          type="button"
          size="icon"
          variant="ghost"
          onClick={handleStop}
          className="h-9 w-9"
        >
          <Square className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}

export default AudioListingPlayer;
