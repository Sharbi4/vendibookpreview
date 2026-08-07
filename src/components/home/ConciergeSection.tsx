import { motion } from 'framer-motion';
import { ShieldCheck, Lock } from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

const ConciergeSection = () => {
  return (
    <section className="py-16 sm:py-24 relative overflow-hidden">
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[500px] rounded-full blur-[140px]"
        style={{
          background:
            'radial-gradient(ellipse, rgba(255,81,36,0.03) 0%, rgba(255,186,8,0.01) 40%, transparent 70%)',
        }}
      />

      <div className="container relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.6 }}
          className="max-w-3xl mx-auto"
        >
          <div className="glass-premium rounded-3xl p-8 sm:p-12 text-center">
            {/* Dynamic animated trust icon */}
            <div className="relative mx-auto mb-6 w-24 h-24 flex items-center justify-center">
              {/* Pulsing rings */}
              {[0, 1, 2].map((i) => (
                <motion.span
                  key={i}
                  className="absolute inset-0 rounded-full border border-[#FF6B00]/40"
                  initial={{ scale: 0.6, opacity: 0.6 }}
                  animate={{ scale: 1.6, opacity: 0 }}
                  transition={{
                    duration: 2.4,
                    repeat: Infinity,
                    delay: i * 0.8,
                    ease: 'easeOut',
                  }}
                />
              ))}
              {/* Rotating conic gradient ring */}
              <motion.div
                className="absolute inset-0 rounded-full"
                style={{
                  background:
                    'conic-gradient(from 0deg, transparent 0%, rgba(255,107,0,0.55) 25%, transparent 50%, rgba(255,186,8,0.4) 75%, transparent 100%)',
                  mask: 'radial-gradient(circle, transparent 58%, black 60%)',
                  WebkitMask: 'radial-gradient(circle, transparent 58%, black 60%)',
                }}
                animate={{ rotate: 360 }}
                transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
              />
              {/* Inner glass disc */}
              <div className="relative w-16 h-16 rounded-full flex items-center justify-center glass-premium">
                <motion.div
                  animate={{ y: [0, -2, 0] }}
                  transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
                >
                  <ShieldCheck className="w-8 h-8 text-[#FF6B00]" strokeWidth={2.2} />
                </motion.div>
              </div>
            </div>

            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-foreground/10 border border-foreground/15 text-foreground text-[10px] font-semibold uppercase tracking-widest mb-5">
              <Lock className="w-3 h-3" />
              Secure Payments
            </div>

            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-4">
              Pay with confidence on{' '}
              <span className="text-[#FF6B00]">Vendibook</span>
            </h2>

            <p className="text-muted-foreground text-base sm:text-lg mb-8 max-w-xl mx-auto leading-relaxed">
              Every transaction is processed through enterprise-grade infrastructure with buyer
              protection, encrypted card data, and flexible financing options.
            </p>

            {/* Payment partner logos */}
            <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 mb-10">
              {[
                { name: 'PayPal', sub: 'Card processing' },
                { name: 'Affirm', sub: 'Monthly financing' },
                { name: 'Afterpay', sub: 'Pay in 4' },
              ].map((p) => (
                <div
                  key={p.name}
                  className="glass-premium rounded-xl px-4 py-3 min-w-[110px] flex flex-col items-center"
                >
                  <span className="text-foreground font-bold text-base tracking-tight">
                    {p.name}
                  </span>
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5">
                    {p.sub}
                  </span>
                </div>
              ))}
            </div>

            {/* FAQ */}
            <div className="text-left max-w-2xl mx-auto">
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="q1" className="border-foreground/10">
                  <AccordionTrigger className="text-foreground hover:no-underline text-sm sm:text-base">
                    Is my payment information secure?
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground text-sm leading-relaxed">
                    Yes. All payments are processed by PayPal, a PCI-DSS Level 1 certified provider.
                    Vendibook never sees or stores your full card number — data is tokenized and
                    encrypted end-to-end.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="q2" className="border-foreground/10">
                  <AccordionTrigger className="text-foreground hover:no-underline text-sm sm:text-base">
                    Can I finance a food truck purchase?
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground text-sm leading-relaxed">
                    Yes. Affirm offers monthly installments up to 36 months on eligible purchases,
                    and Afterpay lets you split smaller charges into 4 interest-free payments at
                    checkout.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="q3" className="border-foreground/10">
                  <AccordionTrigger className="text-foreground hover:no-underline text-sm sm:text-base">
                    When is my money released to the seller?
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground text-sm leading-relaxed">
                    Funds are held in payment protection until the transaction is complete — 24 hours for
                    rentals and 25 days for sales — so you have time to confirm everything is as
                    described.
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default ConciergeSection;
