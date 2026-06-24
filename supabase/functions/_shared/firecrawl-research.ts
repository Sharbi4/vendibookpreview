// Shared Firecrawl-grounded research helpers for Vendi AI tools.
// Lightweight, no external deps — safe to import from any edge function.

export interface FirecrawlResult {
  url: string;
  title?: string;
  description?: string;
  markdown?: string;
}

export interface ResearchSource {
  index: number;
  title: string;
  url: string;
  agency: string;
}

export async function firecrawlSearch(query: string, limit = 5): Promise<FirecrawlResult[]> {
  const apiKey = Deno.env.get("FIRECRAWL_API_KEY");
  if (!apiKey) return [];
  try {
    const res = await fetch("https://api.firecrawl.dev/v1/search", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        query,
        limit,
        scrapeOptions: { formats: ["markdown"], onlyMainContent: true },
      }),
    });
    if (!res.ok) {
      console.warn("Firecrawl search failed:", res.status, await res.text().catch(() => ""));
      return [];
    }
    const json = await res.json();
    const items = (json?.data ?? json?.web ?? []) as any[];
    return items.slice(0, limit).map((it) => ({
      url: it.url,
      title: it.title,
      description: it.description,
      markdown: typeof it.markdown === "string" ? it.markdown.slice(0, 3500) : undefined,
    }));
  } catch (e) {
    console.warn("Firecrawl error:", e);
    return [];
  }
}

export async function gatherSources(queries: string[], perQuery = 4, max = 10): Promise<FirecrawlResult[]> {
  const batches = await Promise.all(queries.map((q) => firecrawlSearch(q, perQuery)));
  const seen = new Set<string>();
  const out: FirecrawlResult[] = [];
  for (const b of batches) {
    for (const r of b) {
      if (!r.url || seen.has(r.url)) continue;
      seen.add(r.url);
      out.push(r);
      if (out.length >= max) return out;
    }
  }
  return out;
}

export function formatSourceContext(sources: FirecrawlResult[]): string {
  if (!sources.length) {
    return "(No live web sources retrieved — rely on your most current training knowledge and clearly flag uncertain figures with 'verify locally'.)";
  }
  return sources
    .map(
      (s, i) =>
        `[Source ${i + 1}] ${s.title || s.url}\nURL: ${s.url}\n${s.description ? `Summary: ${s.description}\n` : ""}${s.markdown ? `Excerpt:\n${s.markdown}\n` : ""}`,
    )
    .join("\n---\n");
}

export function sourcesToCitations(sources: FirecrawlResult[]): ResearchSource[] {
  return sources.map((s, i) => {
    let agency = "";
    try {
      agency = new URL(s.url).hostname.replace(/^www\./, "");
    } catch { /* ignore */ }
    return { index: i + 1, title: s.title || s.url, url: s.url, agency };
  });
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}
