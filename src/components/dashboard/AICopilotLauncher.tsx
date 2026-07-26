import { Wand2, MessageSquare, ArrowRight, PenLine } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { trackLeadEvent } from '@/lib/leadTracking';

/**
 * Prominent entry-point card for Spark-powered host tools.
 * Surfaces the conversational AI Listing Creator + Vendi voice/text chat
 * so hosts can find AI assistance without hunting through nav.
 */
export const AICopilotLauncher = () => {
  const openVendiChat = () => {
    trackLeadEvent('ai_copilot_opened', { surface: 'dashboard', channel: 'chat' });
    window.dispatchEvent(new CustomEvent('open-vendi-chat'));
  };

  return (
    <Card className="border border-border bg-gradient-to-br from-primary/5 via-card to-card overflow-hidden">
      <CardContent className="p-5 sm:p-6">
        <div className="flex items-start gap-4 flex-wrap">
          <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-primary to-primary/70 text-primary-foreground flex items-center justify-center shadow-sm shrink-0">
            <Wand2 className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-[220px]">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-base font-semibold text-foreground">Vendi Copilot</h3>
              <Badge variant="outline" className="text-[10px] uppercase tracking-wide">AI</Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Draft listings, sharpen descriptions, price competitively, and get
              answers about your bookings — all in one place.
            </p>
          </div>
        </div>

        <div className="mt-4 grid sm:grid-cols-2 gap-2">
          <Button
            asChild
            variant="dark-shine"
            className="justify-between rounded-xl h-11"
            onClick={() =>
              trackLeadEvent('ai_copilot_opened', {
                surface: 'dashboard',
                channel: 'listing_creator',
              })
            }
          >
            <Link to="/list/ai">
              <span className="flex items-center gap-2">
                <PenLine className="h-4 w-4" />
                Draft my listing with Spark
              </span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button
            variant="outline"
            className="justify-between rounded-xl h-11"
            onClick={openVendiChat}
          >
            <span className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Ask Vendi
            </span>
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default AICopilotLauncher;
