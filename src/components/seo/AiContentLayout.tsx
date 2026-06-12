import { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import SEO from '@/components/SEO';
import JsonLd from '@/components/JsonLd';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';

export interface AiContentLayoutProps {
  title: string;
  description: string;
  path: string;
  h1: string;
  /** Quick-answer block rendered right under the H1. */
  quickAnswer: { question: string; answer: ReactNode };
  /** Optional Article schema for guide pages. */
  article?: boolean;
  /** Optional FAQ schema source (paired with visible FAQ section). */
  faqSchema?: { question: string; answer: string }[];
  /** Additional JSON-LD schemas (FAQPage, ItemList, etc.). */
  extraSchemas?: object[];
  /** Optional intermediate breadcrumb (e.g. Resources). */
  breadcrumbParent?: { label: string; href: string };
  children: ReactNode;
}

const BASE = 'https://vendibook.com';

const AiContentLayout = ({
  title,
  description,
  path,
  h1,
  quickAnswer,
  article,
  faqSchema,
  extraSchemas = [],
  breadcrumbParent,
  children,
}: AiContentLayoutProps) => {
  const breadcrumbItems = [
    { '@type': 'ListItem', position: 1, name: 'Home', item: `${BASE}/` },
    ...(breadcrumbParent
      ? [{ '@type': 'ListItem', position: 2, name: breadcrumbParent.label, item: `${BASE}${breadcrumbParent.href}` }]
      : []),
    {
      '@type': 'ListItem',
      position: breadcrumbParent ? 3 : 2,
      name: h1,
      item: `${BASE}${path}`,
    },
  ];

  const schemas: object[] = [
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: breadcrumbItems,
    },
  ];

  if (article) {
    schemas.push({
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: h1,
      description,
      mainEntityOfPage: `${BASE}${path}`,
      author: { '@type': 'Organization', name: 'Vendibook' },
      publisher: {
        '@type': 'Organization',
        name: 'Vendibook',
        logo: { '@type': 'ImageObject', url: `${BASE}/images/vendibook-logo.png` },
      },
      datePublished: '2026-06-12',
      dateModified: new Date().toISOString().split('T')[0],
    });
  }

  if (faqSchema && faqSchema.length > 0) {
    schemas.push({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: faqSchema.map((f) => ({
        '@type': 'Question',
        name: f.question,
        acceptedAnswer: { '@type': 'Answer', text: f.answer },
      })),
    });
  }

  schemas.push(...extraSchemas);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SEO title={title} description={description} canonical={path} type={article ? 'article' : 'website'} />
      <JsonLd schema={schemas} />
      <Header />
      <main className="flex-1">
        <div className="container max-w-5xl py-6 md:py-10 space-y-10">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link to="/">Home</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              {breadcrumbParent && (
                <>
                  <BreadcrumbItem>
                    <BreadcrumbLink asChild>
                      <Link to={breadcrumbParent.href}>{breadcrumbParent.label}</Link>
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator />
                </>
              )}
              <BreadcrumbItem>
                <BreadcrumbPage>{h1}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          <header className="space-y-4">
            <h1 className="text-3xl md:text-5xl font-bold tracking-tight text-foreground">{h1}</h1>
          </header>

          {/* Quick Answer block */}
          <section
            aria-label="Quick answer"
            className="rounded-2xl border border-primary/30 bg-primary/5 p-5 md:p-6 space-y-2"
          >
            <div className="text-xs uppercase tracking-wide text-primary font-semibold">
              Quick answer
            </div>
            <h2 className="text-base md:text-lg font-semibold text-foreground">
              {quickAnswer.question}
            </h2>
            <div className="text-sm md:text-base text-muted-foreground leading-relaxed">
              {quickAnswer.answer}
            </div>
          </section>

          {children}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default AiContentLayout;

/** Reusable visible FAQ list paired with the FAQPage schema in AiContentLayout. */
export const FaqList = ({ items }: { items: { question: string; answer: string }[] }) => (
  <div className="space-y-3">
    {items.map((f) => (
      <details key={f.question} className="rounded-xl border border-border bg-card p-4 group">
        <summary className="cursor-pointer font-medium text-foreground list-none flex items-center justify-between">
          <span>{f.question}</span>
          <ChevronRight className="h-4 w-4 text-muted-foreground group-open:rotate-90 transition-transform flex-shrink-0" />
        </summary>
        <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{f.answer}</p>
      </details>
    ))}
  </div>
);

/** Simple comparison table that renders responsively. */
export const ComparisonTable = ({
  columns,
  rows,
}: {
  columns: string[];
  rows: (string | ReactNode)[][];
}) => (
  <div className="overflow-x-auto rounded-2xl border border-border">
    <table className="w-full text-sm">
      <thead className="bg-card">
        <tr>
          {columns.map((c) => (
            <th
              key={c}
              className="text-left font-semibold text-foreground px-4 py-3 border-b border-border whitespace-nowrap"
            >
              {c}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={i} className="border-b border-border last:border-0 align-top">
            {row.map((cell, j) => (
              <td key={j} className="px-4 py-3 text-muted-foreground">
                {cell}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);
