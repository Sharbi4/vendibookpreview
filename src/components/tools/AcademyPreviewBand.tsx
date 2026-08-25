import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, GraduationCap } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AcademyPreviewBandProps {
  title: string;
  body: string;
}

/**
 * Shared "Vendibook Academy is coming soon" preview band.
 * Preview only. Academy is not live, so this never links to an Academy
 * route or implies enrollment. The single CTA goes to /subscribe.
 */
const AcademyPreviewBand = ({ title, body }: AcademyPreviewBandProps) => {
  const reduced = useReducedMotion();

  return (
    <section className="py-16 md:py-24">
      <div className="container max-w-5xl">
        <motion.div
          initial={{ opacity: 0, y: reduced ? 0 : 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: reduced ? 0 : 0.5, ease: 'easeOut' }}
          className="rounded-[2rem] bg-[#1c1917] text-[#faf8f5] px-6 py-12 md:px-14 md:py-16 shadow-xl"
        >
          <div className="flex flex-col items-start gap-6 max-w-2xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-xs font-semibold tracking-[0.18em] uppercase text-white/80">
              <GraduationCap className="h-3.5 w-3.5" aria-hidden="true" />
              Coming soon
            </span>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">{title}</h2>
            <p className="text-base md:text-lg leading-relaxed text-white/70">{body}</p>
            <Button variant="cta" size="cta" asChild>
              <Link to="/subscribe">
                Get Academy launch updates
                <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
            <p className="text-xs text-white/50">
              Vendibook Academy is in development. Join the list and we will email you when it opens.
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default AcademyPreviewBand;
