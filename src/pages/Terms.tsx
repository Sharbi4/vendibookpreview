import { Link, useSearchParams } from 'react-router-dom';
import { Printer } from 'lucide-react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import SEO from '@/components/SEO';
import { Button } from '@/components/ui/button';
import { LEGAL_DOCUMENTS } from '@/lib/legal/versions';
import {
  MARKETPLACE_TERMS_EFFECTIVE,
  MARKETPLACE_TERMS_TABS,
  MARKETPLACE_TERMS_VERSION,
  type TermsBlock,
  type TermsTab,
} from '@/lib/legal/marketplaceTerms';

function Block({ block }: { block: TermsBlock }) {
  if (typeof block === 'string') return <p>{block}</p>;
  if ('list' in block) return <ul className="list-disc space-y-1.5 pl-5">{block.list.map((item) => <li key={item}>{item}</li>)}</ul>;
  return <p className="text-[13px] font-medium uppercase leading-6 tracking-[0.01em]">{block.caps}</p>;
}

function TabBody({ tab }: { tab: TermsTab }) {
  return (
    <article className="space-y-8">
      <header className="space-y-3">
        <h2 className="text-2xl font-semibold tracking-tight">{tab.title}</h2>
        {tab.intro.map((p) => <p key={p} className="leading-7 text-muted-foreground">{p}</p>)}
      </header>
      {tab.keyPoints && (
        <section className="rounded-2xl border border-orange-200 bg-orange-50/60 p-5" aria-label="Key points">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-orange-800">{tab.sections.length ? 'Key points' : 'Summary'}</h3>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6">{tab.keyPoints.map((p) => <li key={p}>{p}</li>)}</ul>
          {tab.sections.length > 0 && <p className="mt-3 text-xs text-muted-foreground">These key points summarize the full terms below, which control.</p>}
        </section>
      )}
      {tab.sections.map((section) => (
        <section key={section.id} id={section.id} className="scroll-mt-28 space-y-3 text-[15px] leading-7">
          <h3 className="text-lg font-semibold">{section.title}</h3>
          {section.blocks.map((block, i) => <Block key={i} block={block} />)}
        </section>
      ))}
      {tab.id === 'site-usage' && (
        <section className="space-y-3 text-[15px] leading-7">
          <h3 className="text-lg font-semibold">Other documents that form part of these terms</h3>
          <ul className="list-disc space-y-1.5 pl-5">
            {LEGAL_DOCUMENTS.filter((d) => d.slug !== 'terms-of-service').map((d) => (
              <li key={d.slug}><Link className="underline" to={d.route}>{d.title}</Link>: {d.summary} (v{d.version})</li>
            ))}
            <li><Link className="underline" to="/legal/sms">SMS Terms</Link>: Vendibook text messages are optional. Message frequency varies, message and data rates may apply, reply STOP to opt out or HELP for help.</li>
          </ul>
        </section>
      )}
      {tab.id === 'privacy' && (
        <p className="flex flex-wrap gap-3">
          <Button asChild><Link to="/privacy">Read the full Privacy Policy</Link></Button>
          <Button asChild variant="outline"><Link to="/california-privacy">California Privacy Notice</Link></Button>
        </p>
      )}
    </article>
  );
}

/** Tabbed Vendibook terms (owner request 2026-10-13). ?tab=<id> selects a tab. */
const Terms = () => {
  const [params, setParams] = useSearchParams();
  const active = MARKETPLACE_TERMS_TABS.find((t) => t.id === params.get('tab')) ?? MARKETPLACE_TERMS_TABS[0];
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SEO
        title={`${active.title} | Vendibook`}
        description="Vendibook's site usage, buyer, seller, rental, payment protection, abandonment and privacy terms in one place."
        canonical={active.id === 'site-usage' ? '/terms' : `/terms?tab=${active.id}`}
      />
      <Header />
      <main className="container max-w-5xl flex-1 py-10">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Vendibook terms and conditions</p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight">Terms &amp; Policies</h1>
          </div>
          <div className="flex items-center gap-3 text-sm text-muted-foreground print:hidden">
            <span>Revised {MARKETPLACE_TERMS_EFFECTIVE} · v{MARKETPLACE_TERMS_VERSION}</span>
            <Button variant="outline" size="sm" onClick={() => window.print()}><Printer className="mr-2 h-4 w-4" />Print</Button>
          </div>
        </div>
        <div role="tablist" aria-label="Terms" className="mt-6 flex gap-1 overflow-x-auto border-b print:hidden">
          {MARKETPLACE_TERMS_TABS.map((tab) => {
            const selected = tab.id === active.id;
            return (
              <button
                key={tab.id}
                role="tab"
                type="button"
                aria-selected={selected}
                aria-controls={`terms-panel-${tab.id}`}
                onClick={() => { setParams(tab.id === 'site-usage' ? {} : { tab: tab.id }, { replace: true }); window.scrollTo({ top: 0 }); }}
                className={`shrink-0 rounded-t-xl border border-b-0 px-4 py-2.5 text-sm font-semibold transition ${selected ? 'border-border bg-background text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
        <div id={`terms-panel-${active.id}`} role="tabpanel" className="pt-8">
          <TabBody tab={active} />
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Terms;
