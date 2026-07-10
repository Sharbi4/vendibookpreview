/**
 * LegalDocumentPage — renders any active document from the `legal_documents`
 * table at /legal/:slug. Public route (no auth), TOC, jump-to affordances,
 * printable, and every version-specific link in an email or transaction
 * receipt resolves here.
 */
import { useEffect, useMemo, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { ArrowLeft, ArrowUp, ArrowDown, Printer, ExternalLink } from 'lucide-react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import SEO from '@/components/SEO';
import { useLegalDocumentBySlug } from '@/hooks/useLegalDocument';

interface TocEntry {
  id: string;
  text: string;
  level: number;
}

const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .slice(0, 60);

const LegalDocumentPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const { data: doc, isLoading, error } = useLegalDocumentBySlug(slug);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [slug]);

  const toc = useMemo<TocEntry[]>(() => {
    if (!doc?.body_markdown) return [];
    return doc.body_markdown
      .split('\n')
      .filter((line) => /^#{1,3}\s+/.test(line))
      .map((line) => {
        const level = (line.match(/^#+/) ?? [''])[0].length;
        const text = line.replace(/^#+\s+/, '').trim();
        return { id: slugify(text), text, level };
      });
  }, [doc?.body_markdown]);

  const jumpTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const scrollWindow = (to: 'top' | 'bottom') => {
    window.scrollTo({
      top: to === 'bottom' ? document.body.scrollHeight : 0,
      behavior: 'smooth',
    });
  };

  const isDraft = doc?.body_markdown?.toLowerCase().includes('pending qualified legal review');

  return (
    <div className="min-h-dvh bg-background flex flex-col">
      <SEO
        title={doc ? `${doc.title} | Vendibook` : 'Legal | Vendibook'}
        description={doc?.summary ?? undefined}
      />
      <Header />
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-8 print:py-2">
        <div className="mb-4 print:hidden">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/">
              <ArrowLeft className="h-4 w-4 mr-1" aria-hidden />
              Back
            </Link>
          </Button>
        </div>

        {isLoading && (
          <p className="text-sm text-muted-foreground">Loading document…</p>
        )}
        {(error || (!isLoading && !doc)) && (
          <div className="rounded-xl border border-border p-6">
            <h1 className="text-xl font-semibold mb-2">Document not found</h1>
            <p className="text-sm text-muted-foreground">
              We couldn't find <code>/legal/{slug}</code>. It may have been
              renamed or retired. If you followed a link from an email, please
              contact <a className="underline" href="mailto:support@vendibook.com">support@vendibook.com</a>.
            </p>
          </div>
        )}

        {doc && (
          <article className="space-y-6">
            <header className="space-y-2">
              <h1 className="text-3xl font-semibold tracking-tight">{doc.title}</h1>
              {doc.summary && (
                <p className="text-muted-foreground">{doc.summary}</p>
              )}
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                <span>Version {doc.version}</span>
                <span>
                  Effective {new Date(doc.effective_at).toLocaleDateString()}
                </span>
                <span className="font-mono truncate max-w-[240px]">
                  hash {doc.content_hash.slice(0, 12)}…
                </span>
              </div>
              {isDraft && (
                <div
                  role="note"
                  className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-200"
                >
                  This document is a working draft and is pending review by
                  qualified counsel. It is displayed so the platform functions;
                  do not rely on it as final legal advice.
                </div>
              )}
              <div className="flex flex-wrap gap-2 print:hidden">
                <Button variant="ghost" size="sm" onClick={() => scrollWindow('bottom')}>
                  <ArrowDown className="h-3.5 w-3.5 mr-1" aria-hidden />
                  Jump to bottom
                </Button>
                <Button variant="ghost" size="sm" onClick={() => window.print()}>
                  <Printer className="h-3.5 w-3.5 mr-1" aria-hidden />
                  Print
                </Button>
                <Button variant="ghost" size="sm" asChild>
                  <a href={`/legal/${doc.slug}`} target="_blank" rel="noreferrer">
                    <ExternalLink className="h-3.5 w-3.5 mr-1" aria-hidden />
                    Open in new tab
                  </a>
                </Button>
              </div>
            </header>

            {toc.length > 2 && (
              <nav
                aria-label="Table of contents"
                className="rounded-xl border border-border/60 bg-card/40 p-4 print:hidden"
              >
                <div className="text-sm font-medium mb-2">Contents</div>
                <ul className="space-y-1 text-sm">
                  {toc.map((e) => (
                    <li key={e.id} style={{ paddingLeft: (e.level - 1) * 12 }}>
                      <button
                        type="button"
                        onClick={() => jumpTo(e.id)}
                        className="text-muted-foreground hover:text-foreground underline-offset-4 hover:underline text-left"
                      >
                        {e.text}
                      </button>
                    </li>
                  ))}
                </ul>
              </nav>
            )}

            <div
              ref={contentRef}
              className="prose prose-sm sm:prose-base dark:prose-invert max-w-none prose-headings:scroll-mt-24"
            >
              <ReactMarkdown
                components={{
                  h1: ({ children }) => {
                    const id = slugify(String(children));
                    return <h1 id={id}>{children}</h1>;
                  },
                  h2: ({ children }) => {
                    const id = slugify(String(children));
                    return <h2 id={id}>{children}</h2>;
                  },
                  h3: ({ children }) => {
                    const id = slugify(String(children));
                    return <h3 id={id}>{children}</h3>;
                  },
                }}
              >
                {doc.body_markdown}
              </ReactMarkdown>
            </div>

            <div className="flex justify-end print:hidden">
              <Button variant="ghost" size="sm" onClick={() => scrollWindow('top')}>
                <ArrowUp className="h-3.5 w-3.5 mr-1" aria-hidden />
                Back to top
              </Button>
            </div>
          </article>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default LegalDocumentPage;
