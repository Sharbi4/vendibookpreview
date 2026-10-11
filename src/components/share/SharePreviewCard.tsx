import { AlertTriangle, CheckCircle2, ImageOff, Loader2, RefreshCw, ShieldCheck, XCircle } from "lucide-react";
import type { ShareCheck } from "@/lib/share/sharePreflight";

interface SharePreviewCardProps {
  title: string;
  imageUrl?: string | null;
  shareUrl: string;
  subtitle?: string;
  checks: ShareCheck[];
  running: boolean;
  verified: boolean;
  blocked: boolean;
  onRecheck: () => void;
  /** Dark glass styling for the dashboard modal, light for the wizard. */
  tone?: "dark" | "light";
}

const statusIcon = (status: ShareCheck["status"]) => {
  switch (status) {
    case "pass":
      return <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />;
    case "warn":
      return <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0" />;
    case "fail":
      return <XCircle className="h-4 w-4 text-red-400 shrink-0" />;
    default:
      return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground shrink-0" />;
  }
};

/**
 * Shows exactly what will be posted (image, title, link) with a per-item
 * verification result, so nothing is copied or shared unchecked.
 */
export const SharePreviewCard = ({
  title,
  imageUrl,
  shareUrl,
  subtitle,
  checks,
  running,
  verified,
  blocked,
  onRecheck,
  tone = "light",
}: SharePreviewCardProps) => {
  const dark = tone === "dark";
  const imageCheck = checks.find((c) => c.id === "image");
  const imageBroken = imageCheck?.status === "fail" || imageCheck?.status === "warn";

  return (
    <div
      className={
        dark
          ? "rounded-xl overflow-hidden border border-white/10 bg-white/[0.03]"
          : "rounded-2xl overflow-hidden border bg-card shadow-sm"
      }
    >
      {/* What the post will look like */}
      <div className="flex gap-3 p-3">
        <div
          className={`h-20 w-20 shrink-0 overflow-hidden rounded-xl ${dark ? "bg-white/5 ring-1 ring-white/10" : "bg-muted ring-1 ring-border"} flex items-center justify-center`}
        >
          {imageUrl && !imageBroken ? (
            <img src={imageUrl} alt={title} className="h-full w-full object-cover" loading="lazy" />
          ) : (
            <ImageOff className={`h-6 w-6 ${dark ? "text-white/30" : "text-muted-foreground"}`} />
          )}
        </div>
        <div className="min-w-0 flex-1 py-0.5">
          <p className={`text-[11px] uppercase tracking-wide ${dark ? "text-white/40" : "text-muted-foreground"}`}>
            Preview of what people will see
          </p>
          <h3 className={`mt-0.5 line-clamp-2 text-[15px] font-semibold ${dark ? "text-white" : ""}`}>
            {title || "Untitled listing"}
          </h3>
          {subtitle && (
            <p className={`mt-0.5 truncate text-xs ${dark ? "text-white/50" : "text-muted-foreground"}`}>{subtitle}</p>
          )}
          <p className={`mt-1 truncate font-mono text-[11px] ${dark ? "text-white/40" : "text-muted-foreground"}`}>
            {shareUrl.replace(/^https?:\/\//, "")}
          </p>
        </div>
      </div>

      {/* Verification results */}
      <div className={`space-y-2 border-t px-3 py-3 ${dark ? "border-white/10" : ""}`}>
        <div className="flex items-center justify-between gap-2">
          <span
            className={`inline-flex items-center gap-1.5 text-xs font-medium ${
              blocked ? "text-red-400" : verified ? "text-emerald-400" : dark ? "text-white/60" : "text-muted-foreground"
            }`}
          >
            <ShieldCheck className="h-4 w-4" />
            {running
              ? "Verifying image, title and link…"
              : blocked
                ? "Fix the issues below before sharing"
                : verified
                  ? "Verified — safe to copy and post"
                  : "Verification incomplete"}
          </span>
          <button
            type="button"
            onClick={onRecheck}
            disabled={running}
            className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] transition-colors disabled:opacity-50 ${
              dark ? "text-white/60 hover:bg-white/10 hover:text-white" : "text-muted-foreground hover:bg-muted"
            }`}
          >
            <RefreshCw className={`h-3 w-3 ${running ? "animate-spin" : ""}`} />
            Re-check
          </button>
        </div>

        <ul className="space-y-1.5">
          {checks.map((check) => (
            <li key={check.id} className="flex items-start gap-2">
              {statusIcon(check.status)}
              <div className="min-w-0">
                <p className={`text-xs ${dark ? "text-white/80" : "text-foreground"}`}>
                  <span className="font-medium">{check.label}:</span> {check.message}
                </p>
                {check.detail && (
                  <p className={`truncate text-[11px] ${dark ? "text-white/40" : "text-muted-foreground"}`}>
                    {check.detail}
                  </p>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default SharePreviewCard;
