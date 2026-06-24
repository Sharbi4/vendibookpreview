import { ExternalLink, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export interface ResearchSource {
  index: number;
  title: string;
  url: string;
  agency?: string;
}

interface SourcesSectionProps {
  sources?: ResearchSource[] | null;
  lastUpdated?: string | null;
  label?: string;
}

/**
 * Displays a compact "Verified Sources" block under AI tool results.
 * Hidden when there are no sources to show.
 */
export const SourcesSection = ({ sources, lastUpdated, label = "Verified Sources" }: SourcesSectionProps) => {
  const items = Array.isArray(sources) ? sources.filter((s) => s && s.url) : [];
  if (!items.length && !lastUpdated) return null;

  return (
    <div className="rounded-xl border border-border/60 bg-muted/30 p-4 space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-emerald-600" />
          <span className="text-sm font-semibold text-foreground">{label}</span>
        </div>
        {lastUpdated && (
          <Badge variant="outline" className="text-xs">
            Updated {lastUpdated}
          </Badge>
        )}
      </div>
      {items.length > 0 && (
        <ul className="space-y-1.5">
          {items.slice(0, 8).map((s) => (
            <li key={`${s.index}-${s.url}`} className="text-xs text-muted-foreground flex items-start gap-2">
              <span className="font-mono text-foreground/60 shrink-0">[{s.index}]</span>
              <a
                href={s.url}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="hover:text-foreground hover:underline inline-flex items-start gap-1 break-words"
              >
                <span className="line-clamp-2">{s.title}</span>
                <ExternalLink className="h-3 w-3 shrink-0 mt-0.5" />
              </a>
              {s.agency && (
                <span className="text-foreground/40 shrink-0 hidden sm:inline">· {s.agency}</span>
              )}
            </li>
          ))}
        </ul>
      )}
      <p className="text-[11px] text-muted-foreground/80">
        AI synthesis grounded in live web sources. Verify specifics with the official source before acting.
      </p>
    </div>
  );
};
