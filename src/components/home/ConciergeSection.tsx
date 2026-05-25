import { useState } from 'react';
import { MessageCircle, Send, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import TicketFormDialog from './TicketFormDialog';

const ConciergeSection = () => {
  const [isTicketDialogOpen, setIsTicketDialogOpen] = useState(false);

  return (
    <section className="py-16 sm:py-24 relative overflow-hidden">
      {/* Subtle warm ambient */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[500px] rounded-full blur-[140px]" style={{ background: 'radial-gradient(ellipse, rgba(255,81,36,0.02) 0%, rgba(255,186,8,0.008) 40%, transparent 70%)' }} />
      
      <div className="container relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="max-w-3xl mx-auto"
        >
          <div className="rounded-2xl border-2 border-border/60 bg-card/90 p-8 sm:p-12 text-center shadow-2xl shadow-black/20">
            {/* Badge */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-foreground/10 border-2 border-foreground/20 text-foreground text-[10px] font-semibold uppercase tracking-widest mb-6">
              <Sparkles className="w-2.5 h-2.5" />
              Concierge
            </div>
            
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-4">
              Skip the search.{' '}
              <span className="gradient-text-warm">Let us match you.</span>
            </h2>
            
            <p className="text-muted-foreground text-base sm:text-lg mb-8 max-w-lg mx-auto">
              Tell us your requirements and budget. Our team will find and present the best options — free, no commitment.
            </p>

            {/* Trust pills */}
            <div className="flex flex-wrap justify-center gap-2 mb-8">
              {['Free service', 'Response in 2 hrs', 'No commitment'].map((text) => (
                <span key={text} className="text-xs text-muted-foreground px-3 py-1.5 rounded-full bg-accent border-2 border-border/80">
                  {text}
                </span>
              ))}
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Button
                onClick={() => setIsTicketDialogOpen(true)}
                size="lg"
                variant="glass-cta"
                className="rounded-full px-8 gap-2"
              >
                <MessageCircle className="w-4 h-4" />
                Match Me
              </Button>
              
            </div>
          </div>
        </motion.div>

        <TicketFormDialog 
          open={isTicketDialogOpen} 
          onOpenChange={setIsTicketDialogOpen} 
        />
      </div>
    </section>
  );
};

export default ConciergeSection;
