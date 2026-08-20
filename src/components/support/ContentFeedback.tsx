import { useState } from "react";
import { ThumbsUp, ThumbsDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { trackEventToDb } from "@/hooks/useAnalyticsEvents";
import { ReportIssueButton } from "./ReportIssueButton";

export type FeedbackContentType = "faq_entry" | "help_article";

interface ContentFeedbackProps {
  /** Stable id of the answer/article (FAQ entry id or help article slug). */
  contentId: string;
  /** Human-readable title, sent along so support can find it fast. */
  contentTitle: string;
  contentType: FeedbackContentType;
  /** FAQ category id or help article category, when known. */
  categoryId?: string;
  className?: string;
  /** Compact = inline row under an FAQ answer; card = standalone block. */
  variant?: "inline" | "card";
}

/**
 * "Was this helpful?" + "Report an issue" control for Help Center articles and
 * FAQ answers. Votes go to `analytics_events` so support can spot content that
 * consistently misses; the report button opens the shared support ticket
 * dialog pre-scoped to outdated/incorrect help content.
 *
 * Styling uses semantic tokens only, so it reads correctly on the dark app
 * shell and inside the `.sale-light` Help Center / FAQ scope.
 */
export const ContentFeedback = ({
  contentId,
  contentTitle,
  contentType,
  categoryId,
  className,
  variant = "inline",
}: ContentFeedbackProps) => {
  const [choice, setChoice] = useState<"up" | "down" | null>(null);

  const vote = (v: "up" | "down") => {
    if (choice) return;
    setChoice(v);
    void trackEventToDb(v === "up" ? "content_helpful_yes" : "content_helpful_no", "help_content", {
      content_id: contentId,
      content_type: contentType,
      category_id: categoryId ?? null,
      path: typeof window !== "undefined" ? window.location.pathname : null,
    });
  };

  const reportButton = (
    <ReportIssueButton
      variant="ghost"
      size="sm"
      label="Report an issue"
      className="h-8 rounded-full px-3 text-xs text-muted-foreground hover:text-foreground"
      context={{
        featureArea: "other",
        defaultCategory: "content_outdated",
      }}
    />
  );

  const thumbClasses =
    "inline-flex items-center justify-center h-9 w-9 rounded-full border border-border bg-card text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors";

  const body = choice ? (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
      <span className="inline-flex items-center gap-2 text-xs text-muted-foreground">
        <Check className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
        {choice === "up"
          ? "Thanks — glad this helped."
          : "Thanks. Tell us what's wrong or outdated and we'll fix it."}
      </span>
      {reportButton}
    </div>
  ) : (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
      <span className="text-xs text-muted-foreground">Was this helpful?</span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => vote("up")}
          aria-label={`Mark "${contentTitle}" as helpful`}
          className={thumbClasses}
        >
          <ThumbsUp className="h-4 w-4" aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={() => vote("down")}
          aria-label={`Mark "${contentTitle}" as not helpful`}
          className={thumbClasses}
        >
          <ThumbsDown className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
      <span className="hidden sm:inline text-border" aria-hidden="true">
        |
      </span>
      {reportButton}
    </div>
  );

  if (variant === "card") {
    return (
      <div className={cn("rounded-2xl border border-border bg-card px-5 py-4", className)}>
        <p aria-live="polite" className="sr-only">
          {choice ? "Feedback recorded" : ""}
        </p>
        {body}
      </div>
    );
  }

  return (
    <div className={cn("mt-4 pt-3 border-t border-border", className)}>
      <p aria-live="polite" className="sr-only">
        {choice ? "Feedback recorded" : ""}
      </p>
      {body}
    </div>
  );
};

export default ContentFeedback;
