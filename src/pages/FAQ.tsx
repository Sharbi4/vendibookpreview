import { useMemo, useState, useEffect, useDeferredValue, useCallback } from "react";
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
import { cn } from "@/lib/utils";
import {
  Search as SearchIcon,
  ArrowRight,
  HelpCircle,
  MessageCircle,
  X,
} from "lucide-react";
import {
  faqCategories,
  allFaqEntries,
  resolvePriceTokens,
  type FaqAction,
  type FaqEntry,
  type FaqCategory,
} from "@/data/faqContent";
import { searchFaq, relatedEntries } from "@/lib/faq/search";
import { ReportIssueButton } from "@/components/support/ReportIssueButton";
import { FaqHelpfulThumbs } from "@/components/support/FaqHelpfulThumbs";
import { useAuth } from "@/contexts/AuthContext";
import { useCatalogPrices } from "@/hooks/useCatalogPrices";
import { priceWithCadence } from "@/lib/monetization/catalogPricing";

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

/**
 * Swaps `{{price:slug}}` tokens in answers for the live `monetization_products`
 * price so Help/FAQ copy can never drift from what checkout charges.
 */
const usePriceResolver = () => {
  const { data } = useCatalogPrices();
  return useCallback(
    (text: string) =>
      resolvePriceTokens(text, (slug) => {
        const row = data?.[slug];
        if (!row) return undefined;
        return priceWithCadence(row);
      }),
    [data],
  );
};

const ActionLink = ({ action }: { action: FaqAction }) => {
  const { user } = useAuth();
  const isExternal =
    action.href.startsWith("http") || action.href.startsWith("mailto:") || action.href.startsWith("tel:");
  const needsAuth = action.requiresAuth && !user;
  const href = needsAuth ? `/auth?redirect=${encodeURIComponent(action.href)}` : action.href;
  const label = needsAuth ? `Sign in to ${action.label.toLowerCase()}` : action.label;
  const cls =
    "inline-flex items-center gap-1.5 h-8 px-3 rounded-full border border-border bg-card text-xs font-medium text-foreground/80 hover:text-foreground hover:border-foreground/25 transition-colors";
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

const EntryCard = ({
  entry,
  category,
  resolve,
}: {
  entry: FaqEntry;
  category: FaqCategory;
  resolve: (text: string) => string;
}) => {
  const related = useMemo(() => relatedEntries(faqCategories, entry, 3), [entry]);
  return (
    <AccordionItem value={entry.id} id={entry.id} className="border-border">
      <AccordionTrigger className="text-left text-foreground hover:no-underline hover:text-primary">
        <span className="text-[15px] font-medium">{entry.question}</span>
      </AccordionTrigger>
      <AccordionContent className="text-muted-foreground leading-relaxed">
        <p className="whitespace-pre-line text-[15px]">{resolve(entry.answer)}</p>
        {entry.actions && entry.actions.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {entry.actions.map((a) => (
              <ActionLink key={a.href} action={a} />
            ))}
          </div>
        )}
        <FaqHelpfulThumbs entryId={entry.id} categoryId={category.id} />
        {related.length > 0 && (
          <div className="mt-5 pt-4 border-t border-border">
            <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground/70 mb-2">
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
                      history.replaceState(null, "", `#${r.entry.id}`);
                    }}
                    className="text-xs text-muted-foreground hover:text-primary transition-colors inline-flex items-start gap-1.5"
                  >
                    <ArrowRight className="h-3 w-3 mt-0.5 shrink-0 opacity-50" />
                    <span>{r.entry.question}</span>
                    <span className="opacity-60 ml-1">· {r.category.title}</span>
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
  const resolve = usePriceResolver();

  // Deep-link support: scroll to the anchored answer when the page loads
  // with a #slug hash (also opens the accordion via `defaultValue`).
  const [hash, setHash] = useState<string>(() =>
    typeof window !== "undefined" ? window.location.hash.replace(/^#/, "") : "",
  );
  useEffect(() => {
    if (!hash) return;
    const el = document.getElementById(hash);
    if (el) {
      setTimeout(() => el.scrollIntoView({ behavior: "smooth", block: "start" }), 120);
    }
    const onHash = () => setHash(window.location.hash.replace(/^#/, ""));
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, [hash]);

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
    if (!deferredQuery) {
      return faqCategories
        .filter((c) => map.has(c.id))
        .map((c) => map.get(c.id)!);
    }
    return Array.from(map.values());
  }, [results, deferredQuery]);

  // Schema must mirror the rendered answers exactly (tokens resolved) so
  // structured data can never preserve retired prices or fees.
  const faqSchema = useMemo(
    () => ({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: allFaqEntries.map((e) => ({
        "@type": "Question",
        name: e.question,
        acceptedAnswer: { "@type": "Answer", text: resolve(e.answer) },
      })),
    }),
    [resolve],
  );

  const activeCategory = categoryId
    ? faqCategories.find((c) => c.id === categoryId)
    : undefined;

  return (
    <div className="sale-light min-h-screen flex flex-col">
      <SEO
        title="Help & FAQ — Fees, Payouts, Financing | Vendibook"
        description="Current answers on Vendibook fees, PayPal payments and payouts, buyer financing, delivery and freight, memberships and add-ons, PermitPath, verification, and support."
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
        <section className="pt-12 md:pt-16 pb-6">
          <div className="container max-w-3xl text-center">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
              <HelpCircle className="h-3.5 w-3.5 text-primary" />
              Help &amp; FAQ
            </span>
            <h1 className="mt-4 text-3xl md:text-[2.75rem] leading-tight font-semibold tracking-tight text-foreground">
              Everything about how Vendibook works.
            </h1>
            <p className="mt-3 text-muted-foreground text-sm md:text-base max-w-2xl mx-auto">
              Fees, payouts, financing, delivery, memberships, and account questions — kept in sync
              with the live product.
            </p>

            {/* Search bar */}
            <div className="mt-8">
              <label htmlFor="faq-search" className="sr-only">Search FAQ</label>
              <div className="relative">
                <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="faq-search"
                  type="search"
                  inputMode="search"
                  placeholder="Search fees, payouts, financing, verification…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="h-12 pl-11 pr-11 rounded-2xl bg-card border-border text-foreground placeholder:text-muted-foreground text-base"
                />
                {query && (
                  <button
                    type="button"
                    aria-label="Clear search"
                    onClick={() => setQuery("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full hover:bg-muted flex items-center justify-center text-muted-foreground"
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
                    "text-xs px-3 py-1.5 rounded-full border transition-colors",
                    !categoryId
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-card border-border text-muted-foreground hover:text-foreground hover:border-foreground/25",
                  )}
                >
                  All topics
                </button>
                {faqCategories.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setCategoryId(c.id)}
                    className={cn(
                      "text-xs px-3 py-1.5 rounded-full border transition-colors",
                      categoryId === c.id
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-card border-border text-muted-foreground hover:text-foreground hover:border-foreground/25",
                    )}
                  >
                    {c.title}
                  </button>
                ))}
              </div>

              <div className="mt-3 text-xs text-muted-foreground" aria-live="polite">
                {query || activeCategory
                  ? `${results.length} answer${results.length === 1 ? "" : "s"}${activeCategory ? ` in ${activeCategory.title}` : ""}${query ? ` for "${query}"` : ""}`
                  : `${allFaqEntries.length} answers across ${faqCategories.length} topics`}
              </div>
            </div>
          </div>
        </section>

        {/* Results */}
        <section className="py-8 md:py-12">
          <div className="container max-w-3xl">
            {results.length === 0 ? (
              <div className="text-center py-16 rounded-3xl border border-border bg-card">
                <MessageCircle className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
                <h2 className="text-lg font-semibold text-foreground">No matching answers</h2>
                <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
                  Try different words, remove the category filter, or ask our support team directly.
                </p>
                <div className="mt-5 flex flex-wrap gap-2 justify-center">
                  <Button asChild variant="outline" size="sm" className="rounded-full">
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
                    <div className="flex items-baseline justify-between mb-2">
                      <h2 className="text-xl md:text-2xl font-semibold tracking-tight text-foreground">
                        {category.title}
                      </h2>
                      <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground/70">
                        {entries.length} answer{entries.length === 1 ? "" : "s"}
                      </span>
                    </div>
                    {category.blurb && (
                      <p className="text-sm text-muted-foreground mb-4 max-w-2xl">{category.blurb}</p>
                    )}
                    <Accordion
                      type="multiple"
                      defaultValue={hash && entries.some((e) => e.id === hash) ? [hash] : undefined}
                      className="w-full rounded-3xl border border-border bg-card divide-y divide-border px-5"
                    >
                      {entries.map((entry) => (
                        <EntryCard key={entry.id} entry={entry} category={category} resolve={resolve} />
                      ))}
                    </Accordion>
                  </section>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Still need help */}
        <section className="py-12 border-t border-border">
          <div className="container max-w-3xl text-center">
            <h2 className="text-2xl font-semibold tracking-tight text-foreground">Still need help?</h2>
            <p className="text-muted-foreground mt-2 mb-6 text-sm">
              Chat with our support assistant, call (725) 755-9598, or email support@vendibook.com.
              Support hours are Mon–Fri, 9am–5pm Arizona time.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                size="lg"
                variant="cta"
                onClick={() => {
                  window.dispatchEvent(new CustomEvent("open-vendi-chat", { detail: { prefill: "" } }));
                }}
              >
                <MessageCircle className="h-4 w-4 mr-2" />
                Chat with support
              </Button>
              <Button asChild variant="outline" size="lg" className="rounded-2xl">
                <Link to="/contact">
                  Contact form
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
