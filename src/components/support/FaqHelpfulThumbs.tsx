import { useState } from "react";
import { ThumbsUp, ThumbsDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { trackEventToDb } from "@/hooks/useAnalyticsEvents";

/**
 * "Was this helpful?" thumbs shown under every FAQ answer.
 * Fires an analytics event to `analytics_events` so we can spot
 * questions that consistently miss the mark.
 */
export const FaqHelpfulThumbs = ({
  entryId,
  categoryId,
}: {
  entryId: string;
  categoryId: string;
}) => {
  const [choice, setChoice] = useState<"up" | "down" | null>(null);

  const vote = (v: "up" | "down") => {
    if (choice) return;
    setChoice(v);
    void trackEventToDb(
      v === "up" ? "faq_helpful_yes" : "faq_helpful_no",
      "faq",
      { entry_id: entryId, category_id: categoryId },
    );
  };

  if (choice) {
    return (
      <div className="mt-4 pt-3 border-t border-white/10 flex items-center gap-2 text-xs text-white/50">
        <Check className="h-3.5 w-3.5 text-primary" />
        <span>Thanks for the feedback.</span>
      </div>
    );
  }

  return (
    <div className="mt-4 pt-3 border-t border-white/10 flex items-center gap-3">
      <span className="text-xs text-white/50">Was this helpful?</span>
      <button
        type="button"
        onClick={() => vote("up")}
        aria-label="Mark answer as helpful"
        className={cn(
          "inline-flex items-center justify-center h-8 w-8 rounded-md border border-white/10",
          "bg-white/[0.02] hover:bg-white/[0.06] hover:border-white/25",
          "text-white/60 hover:text-white transition-colors",
        )}
      >
        <ThumbsUp className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        onClick={() => vote("down")}
        aria-label="Mark answer as not helpful"
        className={cn(
          "inline-flex items-center justify-center h-8 w-8 rounded-md border border-white/10",
          "bg-white/[0.02] hover:bg-white/[0.06] hover:border-white/25",
          "text-white/60 hover:text-white transition-colors",
        )}
      >
        <ThumbsDown className="h-3.5 w-3.5" />
      </button>
    </div>
  );
};

export default FaqHelpfulThumbs;
