import React from 'react';
import { Link } from 'react-router-dom';
import SEO from '@/components/SEO';
import { getLegalDocument, type LegalDocumentSlug } from '@/lib/legal/versions';

/**
 * Shared shell for a versioned Vendibook legal document.
 *
 * The version and effective date always come from the registry, so a page can
 * never drift from what gets written to a consent record.
 */
export const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <section className="space-y-2">
    <h2 className="text-lg font-semibold">{title}</h2>
    <div className="space-y-2 text-sm leading-relaxed text-muted-foreground">{children}</div>
  </section>
);

type Props = {
  slug: LegalDocumentSlug;
  heading: string;
  seoTitle: string;
  seoDescription: string;
  related?: LegalDocumentSlug[];
  children: React.ReactNode;
};

const LegalDocumentLayout: React.FC<Props> = ({ slug, heading, seoTitle, seoDescription, related = [], children }) => {
  const doc = getLegalDocument(slug);
  return (
    <>
      <SEO title={seoTitle} description={seoDescription} canonical={`https://vendibook.com${doc.route}`} />
      <main className="mx-auto max-w-3xl px-4 py-12 space-y-8 text-foreground">
        <header className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            <Link to="/legal" className="underline">Legal Center</Link>
          </p>
          <h1 className="text-3xl font-semibold">{heading}</h1>
          <p className="text-sm text-muted-foreground">
            Version {doc.version} · Effective {doc.effectiveDate}
          </p>
        </header>

        {children}

        {related.length > 0 && (
          <Section title="Related documents">
            <ul className="list-disc pl-5">
              {related.map((s) => {
                const r = getLegalDocument(s);
                return (
                  <li key={s}>
                    <Link to={r.route} className="underline">{r.title}</Link> — {r.summary}
                  </li>
                );
              })}
            </ul>
          </Section>
        )}

        <Section title="Contact">
          <p>
            Questions about this document: <a className="underline" href="mailto:support@vendibook.com">support@vendibook.com</a>{' '}
            or (725) 755-9598, Monday–Friday, 9am–5pm Arizona time.
          </p>
        </Section>
      </main>
    </>
  );
};

export default LegalDocumentLayout;
