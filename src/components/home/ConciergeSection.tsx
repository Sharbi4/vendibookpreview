import { useState } from 'react';
import { MessageCircle, UserRound, Send, Sparkles, Clock, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import TicketFormDialog from './TicketFormDialog';

const ConciergeSection = () => {
  const [isTicketDialogOpen, setIsTicketDialogOpen] = useState(false);
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
    <section className="py-12 sm:py-16 md:py-24 relative overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900" />
      
      {/* Floating orbs for glassmorphism effect */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/30 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-amber-500/25 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      <div className="absolute top-1/2 right-1/3 w-64 h-64 bg-emerald-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
      
      {/* Grid pattern overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:50px_50px]" />
      
      <div className="container relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="max-w-4xl mx-auto"
        >
          {/* Glass Card */}
          <div className="relative rounded-3xl overflow-hidden shadow-2xl">
            {/* Glass background - enhanced glassmorphism */}
            <div 
              className="absolute inset-0 border border-white/20 rounded-3xl"
              style={{
                background: 'rgba(255, 255, 255, 0.08)',
                backdropFilter: 'blur(20px) saturate(180%)',
                WebkitBackdropFilter: 'blur(20px) saturate(180%)',
              }}
            />
            
            {/* Inner glow */}
            <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-white/10 via-transparent to-transparent" />
            
            {/* Content */}
            <div className="relative p-5 sm:p-8 md:p-12">
              <div className="flex flex-col lg:flex-row items-center gap-8 lg:gap-12">
                {/* Left: Icon/Visual */}
                <div className="flex-shrink-0">
                  <div className="relative">
                    {/* Glow effect */}
                    <div className="absolute inset-0 bg-gradient-to-br from-amber-400/40 to-primary/40 rounded-full blur-2xl scale-150" />
                    
                    {/* Icon container - glass effect */}
                    <div 
                      className="relative w-28 h-28 md:w-32 md:h-32 rounded-full border border-white/30 flex items-center justify-center shadow-xl"
                      style={{
                        background: 'rgba(255, 255, 255, 0.1)',
                        backdropFilter: 'blur(12px)',
                        WebkitBackdropFilter: 'blur(12px)',
                      }}
                    >
                      <UserRound className="w-14 h-14 md:w-16 md:h-16 text-amber-400 drop-shadow-lg" />
                      
                      {/* Online indicator */}
                      <span className="absolute bottom-2 right-2 w-5 h-5 rounded-full bg-green-400 border-2 border-white/30 shadow-lg shadow-green-400/50">
                        <span className="absolute inset-0 rounded-full bg-green-400 animate-ping opacity-50" />
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right: Content */}
                <div className="flex-1 text-center lg:text-left">
                  {/* Badge - glass effect */}
                  <div 
                    className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-amber-400/30 text-amber-400 text-xs font-semibold uppercase tracking-wider mb-4"
                    style={{
                      background: 'rgba(245, 158, 11, 0.15)',
                      backdropFilter: 'blur(8px)',
                      WebkitBackdropFilter: 'blur(8px)',
                    }}
                  >
                    <Sparkles className="w-3 h-3" />
                    Concierge Service
                  </div>
                  
                  <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 drop-shadow-sm">
                    Skip the search. Let us match you.
                  </h2>
                  
                  <p className="text-white/80 text-lg mb-6 max-w-xl">
                    Don't want to filter through listings? Chat with our team. Tell us your requirements and budget, and we'll manually find the best deals for you.
                  </p>

                  {/* Benefits - glass pills */}
                  <div className="flex flex-wrap gap-3 mb-8 justify-center lg:justify-start">
                    <div 
                      className="flex items-center gap-2 text-sm text-white/90 px-3 py-1.5 rounded-full border border-white/10"
                      style={{
                        background: 'rgba(255, 255, 255, 0.05)',
                        backdropFilter: 'blur(8px)',
                        WebkitBackdropFilter: 'blur(8px)',
                      }}
                    >
                      <CheckCircle2 className="w-4 h-4 text-green-400" />
                      <span>Free service</span>
                    </div>
                    <div 
                      className="flex items-center gap-2 text-sm text-white/90 px-3 py-1.5 rounded-full border border-white/10"
                      style={{
                        background: 'rgba(255, 255, 255, 0.05)',
                        backdropFilter: 'blur(8px)',
                        WebkitBackdropFilter: 'blur(8px)',
                      }}
                    >
                      <Clock className="w-4 h-4 text-amber-400" />
                      <span>Response in 2 hours</span>
                    </div>
                    <div 
                      className="flex items-center gap-2 text-sm text-white/90 px-3 py-1.5 rounded-full border border-white/10"
                      style={{
                        background: 'rgba(255, 255, 255, 0.05)',
                        backdropFilter: 'blur(8px)',
                        WebkitBackdropFilter: 'blur(8px)',
                      }}
                    >
                      <CheckCircle2 className="w-4 h-4 text-green-400" />
                      <span>No commitment</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col sm:flex-row items-center gap-4">
                    <Button
                      onClick={openZendeskChat}
                      size="lg"
                      className="w-full sm:w-auto rounded-full h-14 px-8 bg-black text-white hover:bg-gray-800 font-semibold shadow-lg transition-colors"
                    >
                      <MessageCircle className="w-5 h-5 mr-2" />
                      Chat with an Expert
                    </Button>
                    
                    <button
                      onClick={() => setIsTicketDialogOpen(true)}
                      className="flex items-center gap-2 text-white/70 hover:text-white transition-colors text-sm font-medium group"
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

        <TicketFormDialog 
          open={isTicketDialogOpen} 
          onOpenChange={setIsTicketDialogOpen} 
        />
      </div>
    </section>
  );
};

export default ConciergeSection;
