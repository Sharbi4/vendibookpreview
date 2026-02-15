import { useState } from 'react';
import { MessageCircle, Send, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import TicketFormDialog from './TicketFormDialog';

const ConciergeSection = () => {
  const [isTicketDialogOpen, setIsTicketDialogOpen] = useState(false);

  return (
    <section className="py-16 sm:py-24 relative overflow-hidden">
      {/* Subtle amber glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[400px] bg-primary/[0.04] rounded-full blur-[100px]" />
      
      <div className="container relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="max-w-3xl mx-auto"
        >
          <div className="rounded-2xl border border-border bg-card/50 backdrop-blur-sm p-8 sm:p-12 text-center">
            {/* Badge */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-semibold uppercase tracking-widest mb-6">
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
                <span key={text} className="text-xs text-muted-foreground px-3 py-1.5 rounded-full bg-accent border border-border">
                  {text}
                </span>
              ))}
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Button
                onClick={() => setIsTicketDialogOpen(true)}
                size="lg"
                className="rounded-full px-8 bg-primary hover:bg-primary/90 text-primary-foreground gap-2 shadow-lg shadow-primary/20"
              >
                <MessageCircle className="w-4 h-4" />
                Match Me
              </Button>
              <button
                onClick={() => setIsTicketDialogOpen(true)}
                className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors text-sm"
              >
                <Send className="w-3.5 h-3.5" />
                Send a Ticket
              </button>
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
