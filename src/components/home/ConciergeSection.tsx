import { MessageCircle, HeadphonesIcon, Send, Sparkles, Clock, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';

const ConciergeSection = () => {
  const openZendeskChat = () => {
    if (window.zE) {
      try {
        window.zE('messenger', 'open');
      } catch (error) {
        console.debug('Zendesk messenger open:', error);
      }
    }
  };

  const openZendeskTicket = () => {
    if (window.zE) {
      try {
        // Open messenger in ticket/contact form mode
        window.zE('messenger', 'open');
        // Some Zendesk configs use this to switch to contact form
        window.zE('messenger:set', 'conversationFields', [
          { id: 'subject', value: 'Manual Match Request' }
        ]);
      } catch (error) {
        console.debug('Zendesk ticket open:', error);
      }
    }
  };

  return (
    <section className="py-16 md:py-24 relative overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,hsl(var(--primary)/0.15),transparent_50%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,hsl(38_92%_50%/0.1),transparent_50%)]" />
      
      <div className="container relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="max-w-4xl mx-auto"
        >
          {/* Glass Card */}
          <div className="relative rounded-3xl overflow-hidden">
            {/* Glass background */}
            <div className="absolute inset-0 bg-white/[0.08] backdrop-blur-xl border border-white/10" />
            
            {/* Content */}
            <div className="relative p-8 md:p-12">
              <div className="flex flex-col lg:flex-row items-center gap-8 lg:gap-12">
                {/* Left: Icon/Visual */}
                <div className="flex-shrink-0">
                  <div className="relative">
                    {/* Glow effect */}
                    <div className="absolute inset-0 bg-gradient-to-br from-amber-400/30 to-primary/30 rounded-full blur-2xl scale-150" />
                    
                    {/* Icon container */}
                    <div className="relative w-28 h-28 md:w-32 md:h-32 rounded-full bg-gradient-to-br from-amber-400/20 to-primary/20 border border-white/20 flex items-center justify-center">
                      <HeadphonesIcon className="w-14 h-14 md:w-16 md:h-16 text-amber-400" />
                      
                      {/* Online indicator */}
                      <span className="absolute bottom-2 right-2 w-5 h-5 rounded-full bg-green-400 border-2 border-slate-800">
                        <span className="absolute inset-0 rounded-full bg-green-400 animate-ping opacity-50" />
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right: Content */}
                <div className="flex-1 text-center lg:text-left">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-400 text-xs font-semibold uppercase tracking-wider mb-4">
                    <Sparkles className="w-3 h-3" />
                    Concierge Service
                  </div>
                  
                  <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                    Skip the search. Let us match you.
                  </h2>
                  
                  <p className="text-white/70 text-lg mb-6 max-w-xl">
                    Don't want to filter through listings? Chat with our team. Tell us your requirements and budget, and we'll manually find the best deals for you.
                  </p>

                  {/* Benefits */}
                  <div className="flex flex-wrap gap-4 mb-8 justify-center lg:justify-start">
                    <div className="flex items-center gap-2 text-sm text-white/60">
                      <CheckCircle2 className="w-4 h-4 text-green-400" />
                      <span>Free service</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-white/60">
                      <Clock className="w-4 h-4 text-amber-400" />
                      <span>Response in 2 hours</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-white/60">
                      <CheckCircle2 className="w-4 h-4 text-green-400" />
                      <span>No commitment</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col sm:flex-row items-center gap-4">
                    <Button
                      onClick={openZendeskChat}
                      size="lg"
                      className="w-full sm:w-auto rounded-xl h-14 px-8 bg-amber-500 hover:bg-amber-400 text-slate-900 font-semibold shadow-lg shadow-amber-500/25"
                    >
                      <MessageCircle className="w-5 h-5 mr-2" />
                      Chat with an Expert
                    </Button>
                    
                    <button
                      onClick={openZendeskTicket}
                      className="flex items-center gap-2 text-white/60 hover:text-white transition-colors text-sm font-medium group"
                    >
                      <Send className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                      Send us a Ticket
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default ConciergeSection;
