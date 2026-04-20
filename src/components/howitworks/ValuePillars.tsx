import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface Pillar {
  icon: LucideIcon;
  title: string;
  description: string;
}

const ValuePillars = ({ pillars, tone = 'neutral' }: { pillars: Pillar[]; tone?: 'neutral' | 'host' | 'seller' }) => {
  const accent =
    tone === 'host' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
    : tone === 'seller' ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
    : 'bg-foreground/10 text-foreground';

  return (
    <section className="py-16 md:py-20">
      <div className="container max-w-6xl mx-auto px-4">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
          {pillars.map((p, i) => {
            const Icon = p.icon;
            return (
              <motion.div
                key={p.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-50px' }}
                transition={{ duration: 0.4, delay: i * 0.08 }}
                whileHover={{ y: -4 }}
                className="rounded-2xl bg-card/70 backdrop-blur-xl border border-border p-5 md:p-6 hover:shadow-lg transition-shadow"
              >
                <div className={cn('w-11 h-11 rounded-xl flex items-center justify-center mb-3', accent)}>
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="text-base font-semibold text-foreground mb-1">{p.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{p.description}</p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default ValuePillars;
