import { useMemo, useState, useEffect, useDeferredValue } from "react";
import { Link } from "react-router-dom";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import SEO from "@/components/SEO";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Search as SearchIcon,
  ArrowRight,
  HelpCircle,
  MessageCircle,
  X,
} from "lucide-react";
import { faqCategories, allFaqEntries, type FaqAction, type FaqEntry, type FaqCategory } from "@/data/faqContent";
import { searchFaq, relatedEntries } from "@/lib/faq/search";
import { ReportIssueButton } from "@/components/support/ReportIssueButton";
import { useAuth } from "@/contexts/AuthContext";

const useQueryParam = (key: string) => {
  const [value, setValue] = useState<string>(() => {
    if (typeof window === "undefined") return "";
    return new URLSearchParams(window.location.search).get(key) ?? "";
  });
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (value) params.set(key, value);
    else params.delete(key);
    const qs = params.toString();
    const next = `${window.location.pathname}${qs ? `?${qs}` : ""}${window.location.hash}`;
    window.history.replaceState(null, "", next);
  }, [key, value]);
  return [value, setValue] as const;
};

const ActionLink = ({ action }: { action: FaqAction }) => {
  const { user } = useAuth();
  const isExternal = action.href.startsWith("http") || action.href.startsWith("mailto:") || action.href.startsWith("tel:");
  const needsAuth = action.requiresAuth && !user;
  const href = needsAuth ? `/auth?redirect=${encodeURIComponent(action.href)}` : action.href;
  const label = needsAuth ? `Sign in to ${action.label.toLowerCase()}` : action.label;
  const cls = "inline-flex items-center gap-1.5 h-8 px-3 rounded-md border border-white/15 bg-white/[0.03] hover:bg-white/[0.08] text-xs text-white/80 hover:text-white transition-colors";
  if (isExternal) {
    return (
      <a href={href} className={cls}>
        {label}
        <ArrowRight className="h-3 w-3" />
      </a>
    );
  }
  return (
    <Link to={href} className={cls}>
      {label}
      <ArrowRight className="h-3 w-3" />
    </Link>
  );
};

const EntryCard = ({ entry, category }: { entry: FaqEntry; category: FaqCategory }) => {
  const related = useMemo(() => relatedEntries(faqCategories, entry, 3), [entry]);
  return (
    <AccordionItem value={entry.id} id={entry.id} className="border-white/10">
      <AccordionTrigger className="text-left text-white hover:no-underline hover:text-primary">
        <span>{entry.question}</span>
      </AccordionTrigger>
      <AccordionContent className="text-white/70 leading-relaxed">
        <p className="whitespace-pre-line">{entry.answer}</p>
        {entry.actions && entry.actions.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {entry.actions.map((a) => (
              <ActionLink key={a.href} action={a} />
            ))}
          </div>
        )}
        {related.length > 0 && (
          <div className="mt-5 pt-4 border-t border-white/10">
            <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/40 mb-2">
              Related
            </div>
            <ul className="space-y-1">
              {related.map((r) => (
                <li key={r.entry.id}>
                  <a
                    href={`#${r.entry.id}`}
                    onClick={(e) => {
                      e.preventDefault();
                      document.getElementById(r.entry.id)?.scrollIntoView({ behavior: "smooth", block: "start" });
                    }}
                    className="text-xs text-white/60 hover:text-white transition-colors inline-flex items-start gap-1.5"
                  >
                    <ArrowRight className="h-3 w-3 mt-0.5 shrink-0 text-white/30" />
                    <span>{r.entry.question}</span>
                    <span className="text-white/30 ml-1">· {r.category.title}</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
        <div className="sr-only" aria-hidden>Category: {category.title}</div>
      </AccordionContent>
    </AccordionItem>
  );
};

const FAQ = () => {
  const [query, setQuery] = useQueryParam("q");
  const [categoryId, setCategoryId] = useQueryParam("cat");
  const deferredQuery = useDeferredValue(query);

  const results = useMemo(() => {
    return searchFaq(faqCategories, deferredQuery, {
      categoryId: categoryId || undefined,
    });
  }, [deferredQuery, categoryId]);

  const groupedResults = useMemo(() => {
    const map = new Map<string, { category: FaqCategory; entries: FaqEntry[] }>();
    for (const r of results) {
      const bucket = map.get(r.category.id);
      if (bucket) bucket.entries.push(r.entry);
      else map.set(r.category.id, { category: r.category, entries: [r.entry] });
    }
    // preserve category source order when not searching
    if (!deferredQuery) {
      return faqCategories
        .filter((c) => map.has(c.id))
        .map((c) => map.get(c.id)!);
    }
    return Array.from(map.values());
  }, [results, deferredQuery]);

  const faqSchema = useMemo(
    () => ({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: allFaqEntries.map((e) => ({
        "@type": "Question",
        name: e.question,
        acceptedAnswer: { "@type": "Answer", text: e.answer },
      })),
    }),
    [],
  );

  const activeCategory = categoryId
    ? faqCategories.find((c) => c.id === categoryId)
    : undefined;

  return (
    <div className="min-h-screen flex flex-col bg-[#08080a] text-white">
      <SEO
        title="Help & FAQ — Vendibook"
        description="Answers to how Vendibook works: buying, selling, renting, hosting, payments, payouts, deposits, refunds, verification, documents, and more."
        canonical="/faq"
        type="website"
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      <Header />

      <main className="flex-1">
        {/* Hero */}
        <section className="relative pt-12 md:pt-16 pb-8">
          <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[500px] overflow-hidden">
            <div className="absolute top-[-160px] left-1/2 -translate-x-1/2 w-[900px] h-[900px] rounded-full bg-[radial-gradient(circle_at_center,hsl(var(--primary)/0.15),transparent_60%)] blur-3xl" />
          </div>
          <div className="container relative z-10 max-w-4xl text-center">
            <Badge variant="secondary" className="mb-4 bg-white/[0.06] border-white/10 text-white/70">
              <HelpCircle className="h-3 w-3 mr-1" />
              Help & FAQ
            </Badge>
            <h1 className="text-3xl md:text-5xl font-medium tracking-tight">
              Everything about how Vendibook works.
            </h1>
            <p className="mt-3 text-white/60 text-sm md:text-base max-w-2xl mx-auto">
              Search over 100 questions, filter by topic, and jump straight to the action you need.
            </p>

            {/* Search bar */}
            <div className="mt-8 max-w-2xl mx-auto">
              <label htmlFor="faq-search" className="sr-only">Search FAQ</label>
              <div className="relative">
                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
                <Input
                  id="faq-search"
                  type="search"
                  inputMode="search"
                  placeholder="Search payouts, deposits, cancellations, verification…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="h-12 pl-10 pr-10 bg-white/[0.04] border-white/15 text-white placeholder:text-white/40 text-base md:text-sm"
                />
                {query && (
                  <button
                    type="button"
                    aria-label="Clear search"
                    onClick={() => setQuery("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-md hover:bg-white/10 flex items-center justify-center text-white/50 hover:text-white"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* Category chips */}
              <div className="mt-4 flex flex-wrap gap-2 justify-center">
                <button
                  onClick={() => setCategoryId("")}
                  className={cn(
                    "text-[11px] px-3 py-1.5 rounded-full border transition-colors",
                    !categoryId
                      ? "bg-primary/90 text-white border-primary"
                      : "bg-white/[0.03] border-white/10 text-white/60 hover:text-white hover:border-white/25",
                  )}
                >
                  All topics
                </button>
                {faqCategories.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setCategoryId(c.id)}
                    className={cn(
                      "text-[11px] px-3 py-1.5 rounded-full border transition-colors",
                      categoryId === c.id
                        ? "bg-primary/90 text-white border-primary"
                        : "bg-white/[0.03] border-white/10 text-white/60 hover:text-white hover:border-white/25",
                    )}
                  >
                    {c.title}
                  </button>
                ))}
              </div>

              {/* Result summary */}
              <div className="mt-3 text-xs text-white/40" aria-live="polite">
                {query || activeCategory
                  ? `${results.length} answer${results.length === 1 ? "" : "s"}${activeCategory ? ` in ${activeCategory.title}` : ""}${query ? ` for "${query}"` : ""}`
                  : `${allFaqEntries.length} answers across ${faqCategories.length} topics`}
              </div>
            </div>
          </div>
        </section>

        {/* Results */}
        <section className="py-8 md:py-12">
          <div className="container max-w-4xl">
            {results.length === 0 ? (
              <div className="text-center py-16 border border-white/10 rounded-2xl bg-white/[0.02]">
                <MessageCircle className="h-10 w-10 mx-auto text-white/30 mb-3" />
                <h2 className="text-lg font-medium">No matching answers</h2>
                <p className="text-sm text-white/50 mt-1 max-w-md mx-auto">
                  Try different words, remove the category filter, or ask our support team directly.
                </p>
                <div className="mt-5 flex flex-wrap gap-2 justify-center">
                  <Button asChild variant="outline" size="sm">
                    <Link to="/contact">Contact support</Link>
                  </Button>
                  <ReportIssueButton
                    variant="outline"
                    label="Report a missing answer"
                    context={{ featureArea: "other" }}
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-10">
                {groupedResults.map(({ category, entries }) => (
                  <section key={category.id} id={category.id}>
                    <div className="flex items-baseline justify-between mb-3">
                      <h2 className="text-xl md:text-2xl font-medium tracking-tight">{category.title}</h2>
                      <span className="text-[10px] uppercase tracking-[0.2em] font-mono text-white/30">
                        {entries.length} answer{entries.length === 1 ? "" : "s"}
                      </span>
                    </div>
                    {category.blurb && (
                      <p className="text-sm text-white/55 mb-4 max-w-2xl">{category.blurb}</p>
                    )}
                    <Accordion type="multiple" className="w-full rounded-xl border border-white/10 bg-white/[0.02] divide-y divide-white/10 px-4">
                      {entries.map((entry) => (
                        <EntryCard key={entry.id} entry={entry} category={category} />
                      ))}
                    </Accordion>
                  </section>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Still need help */}
        <section className="py-12 border-t border-white/[0.06]">
          <div className="container max-w-3xl text-center">
            <h2 className="text-2xl font-medium tracking-tight">Still have questions?</h2>
            <p className="text-white/60 mt-2 mb-6 text-sm">
              Call (725) 755-9598, email support@vendibook.com, or open a support ticket.
              Live support is available Mon–Fri, 9am–5pm Arizona time.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button asChild size="lg">
                <Link to="/contact">
                  Contact support
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link to="/help">
                  Visit Help Center
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default FAQ;
