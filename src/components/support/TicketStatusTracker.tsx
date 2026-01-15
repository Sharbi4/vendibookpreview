import { useState } from 'react';
import { Ticket, Search, Loader2, CheckCircle, Clock, AlertCircle, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface TicketStatus {
  id: number;
  subject: string;
  status: 'new' | 'open' | 'pending' | 'hold' | 'solved' | 'closed';
  created_at: string;
  updated_at: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
}

const statusConfig = {
  new: { label: 'New', icon: AlertCircle, variant: 'default' as const, color: 'bg-blue-500' },
  open: { label: 'Open', icon: MessageSquare, variant: 'default' as const, color: 'bg-yellow-500' },
  pending: { label: 'Pending', icon: Clock, variant: 'secondary' as const, color: 'bg-orange-500' },
  hold: { label: 'On Hold', icon: Clock, variant: 'secondary' as const, color: 'bg-gray-500' },
  solved: { label: 'Solved', icon: CheckCircle, variant: 'default' as const, color: 'bg-green-500' },
  closed: { label: 'Closed', icon: CheckCircle, variant: 'outline' as const, color: 'bg-gray-400' },
};

const TicketStatusTracker = () => {
  const [email, setEmail] = useState('');
  const [ticketId, setTicketId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [tickets, setTickets] = useState<TicketStatus[] | null>(null);
  const { toast } = useToast();

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email && !ticketId) {
      toast({
        title: 'Enter search criteria',
        description: 'Please enter your email address or ticket ID.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    setTickets(null);

    try {
      const { data, error } = await supabase.functions.invoke('check-ticket-status', {
        body: { email, ticketId: ticketId || undefined },
      });

      if (error) throw error;

      if (data.tickets && data.tickets.length > 0) {
        setTickets(data.tickets);
      } else {
        toast({
          title: 'No tickets found',
          description: 'We couldn\'t find any tickets matching your search.',
        });
        setTickets([]);
      }
    } catch (error) {
      console.error('Ticket status error:', error);
      toast({
        title: 'Something went wrong',
        description: 'Please try again or contact support directly.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
      <div className="flex items-start gap-3 mb-6">
        <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
          <Ticket className="h-6 w-6" />
        </div>
        <div>
          <h3 className="font-semibold text-foreground">Check Ticket Status</h3>
          <p className="text-sm text-muted-foreground">
            Track the status of your support requests
          </p>
        </div>
      </div>

      <form onSubmit={handleSearch} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="ticket-email">Email Address</Label>
          <Input
            id="ticket-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your@email.com"
            disabled={isLoading}
          />
        </div>

        <div className="text-center text-sm text-muted-foreground">or</div>

        <div className="space-y-2">
          <Label htmlFor="ticket-id">Ticket ID</Label>
          <Input
            id="ticket-id"
            value={ticketId}
            onChange={(e) => setTicketId(e.target.value)}
            placeholder="Enter ticket number"
            disabled={isLoading}
          />
        </div>

        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Searching...
            </>
          ) : (
            <>
              <Search className="h-4 w-4 mr-2" />
              Check Status
            </>
          )}
        </Button>
      </form>

      {/* Results */}
      {tickets !== null && (
        <div className="mt-6 space-y-3">
          {tickets.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <Ticket className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No tickets found</p>
            </div>
          ) : (
            tickets.map((ticket) => {
              const config = statusConfig[ticket.status] || statusConfig.new;
              const StatusIcon = config.icon;
              
              return (
                <div
                  key={ticket.id}
                  className="border border-border rounded-lg p-4 bg-muted/30"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs text-muted-foreground">#{ticket.id}</span>
                        <Badge variant={config.variant} className="text-xs">
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {config.label}
                        </Badge>
                        {ticket.priority === 'urgent' && (
                          <Badge variant="destructive" className="text-xs">Urgent</Badge>
                        )}
                      </div>
                      <p className="font-medium text-sm text-foreground truncate">
                        {ticket.subject}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Created {format(new Date(ticket.created_at), 'MMM d, yyyy')}
                        {ticket.updated_at !== ticket.created_at && (
                          <> · Updated {format(new Date(ticket.updated_at), 'MMM d, h:mm a')}</>
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};

export default TicketStatusTracker;
