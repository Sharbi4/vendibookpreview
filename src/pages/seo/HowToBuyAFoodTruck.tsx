import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import AiContentLayout, { FaqList } from '@/components/seo/AiContentLayout';
import { useBuyerSeoTracking } from '@/hooks/useBuyerSeoTracking';

import {
  HOW_TO_BUY_PATH, HOW_TO_BUY_TITLE, HOW_TO_BUY_DESCRIPTION, HOW_TO_BUY_H1,
  HOW_TO_BUY_STEPS, HOW_TO_BUY_FAQS, HOW_TO_BUY_QUICK_ANSWER,
} from '../../../supabase/functions/_shared/buyerSeoContent';

export { HOW_TO_BUY_PATH, HOW_TO_BUY_TITLE, HOW_TO_BUY_DESCRIPTION, HOW_TO_BUY_H1, HOW_TO_BUY_STEPS, HOW_TO_BUY_FAQS };

const HowToBuyAFoodTruck = () => {
  const onTrackedClick = useBuyerSeoTracking(HOW_TO_BUY_PATH, 'food_truck');
  return (
  <AiContentLayout
    onMainClickCapture={onTrackedClick}
    title={HOW_TO_BUY_TITLE}
    description={HOW_TO_BUY_DESCRIPTION}
    path={HOW_TO_BUY_PATH}
    h1={HOW_TO_BUY_H1}
    article
    breadcrumbParent={{ label: 'Food Trucks for Sale', href: '/food-trucks-for-sale' }}
    quickAnswer={HOW_TO_BUY_QUICK_ANSWER}
    faqSchema={HOW_TO_BUY_FAQS}
    extraSchemas={[
      {
        '@context': 'https://schema.org',
        '@type': 'HowTo',
        name: HOW_TO_BUY_H1,
        description: HOW_TO_BUY_DESCRIPTION,
        step: HOW_TO_BUY_STEPS.map((s, i) => ({
          '@type': 'HowToStep',
          position: i + 1,
          name: s.title,
          text: s.body.join(' '),
          url: `https://vendibook.com${HOW_TO_BUY_PATH}#${s.id}`,
        })),
      },
    ]}
  >
    <nav aria-labelledby="contents-heading" className="rounded-2xl border border-border bg-card p-5">
      <h2 id="contents-heading" className="text-lg font-semibold text-foreground mb-3">In this guide</h2>
      <ol className="grid gap-2 sm:grid-cols-2 text-sm">
        {HOW_TO_BUY_STEPS.map((s, i) => (
          <li key={s.id}>
            <a href={`#${s.id}`} className="text-foreground hover:text-primary">
              <span className="text-muted-foreground mr-2">{i + 1}.</span>{s.title}
            </a>
          </li>
        ))}
        <li><a href="#faq" className="text-foreground hover:text-primary"><span className="text-muted-foreground mr-2">?</span>Common questions</a></li>
      </ol>
    </nav>

    <ol className="space-y-8">
      {HOW_TO_BUY_STEPS.map((s, i) => (
        <li key={s.id} id={s.id} className="scroll-mt-24" data-cta-location={`step_${i + 1}`}>
          <section className="rounded-2xl border border-border bg-card p-5 md:p-7 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">Step {i + 1}</p>
            <h2 className="text-xl md:text-2xl font-semibold text-foreground">{s.title}</h2>
            {s.body.map((p) => (
              <p key={p} className="text-muted-foreground leading-relaxed">{p}</p>
            ))}
            {s.checklist && (
              <ul className="grid gap-1.5 sm:grid-cols-2 text-sm text-foreground">
                {s.checklist.map((c) => (
                  <li key={c} className="flex gap-2"><span aria-hidden="true" className="text-primary">✓</span>{c}</li>
                ))}
              </ul>
            )}
            {s.links && (
              <div className="flex flex-wrap gap-2 pt-1">
                {s.links.map((l) => (
                  <Link key={l.href} to={l.href} className="inline-block px-3 py-1.5 rounded-full border border-border bg-background text-sm text-foreground hover:border-primary hover:text-primary transition-colors">
                    {l.label}
                  </Link>
                ))}
              </div>
            )}
          </section>
        </li>
      ))}
    </ol>

    <section data-cta-location="final_cta" className="rounded-3xl border border-border bg-card p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-5 shadow-sm">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Ready to start comparing?</h2>
        <p className="text-sm text-muted-foreground">Browse live listings and message sellers with your questions.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button asChild variant="cta" size="cta" className="w-full sm:w-auto">
          <Link to="/food-trucks-for-sale" data-cta-id="final_shop_trucks">Shop food trucks for sale <ArrowRight className="h-5 w-5" /></Link>
        </Button>
        <Button asChild variant="cta-outline" size="cta" className="w-full sm:w-auto">
          <Link to="/food-trailers-for-sale" data-cta-id="final_shop_trailers">Food trailers for sale</Link>
        </Button>
      </div>
    </section>

    <section id="faq" data-cta-location="faq" className="space-y-3 scroll-mt-24">
      <h2 className="text-2xl font-semibold text-foreground">Common questions about buying a food truck</h2>
      <FaqList items={HOW_TO_BUY_FAQS} />
    </section>
  </AiContentLayout>
  );
};

export default HowToBuyAFoodTruck;
