import { useState } from 'react';
import { z } from 'zod';
import { Send, Loader2, CheckCircle, Ticket } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const ticketSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100, "Name must be less than 100 characters"),
  email: z.string().trim().email("Invalid email address").max(255, "Email must be less than 255 characters"),
  phone: z.string().trim().max(20, "Phone number must be less than 20 characters").optional(),
  subject: z.string().trim().min(1, "Subject is required").max(200, "Subject must be less than 200 characters"),
  category: z.enum(['question', 'incident', 'problem', 'task']),
  priority: z.enum(['low', 'normal', 'high', 'urgent']),
  message: z.string().trim().min(1, "Message is required").max(2000, "Message must be less than 2000 characters"),
});

type TicketFormData = z.infer<typeof ticketSchema>;

const ZendeskTicketForm = () => {
  const [formData, setFormData] = useState<TicketFormData>({
    name: '',
    email: '',
    phone: '',
    subject: '',
    category: 'question',
    priority: 'normal',
    message: '',
  });
  const [errors, setErrors] = useState<Partial<Record<keyof TicketFormData, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [ticketId, setTicketId] = useState<number | null>(null);
  const { toast } = useToast();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name as keyof TicketFormData]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  const handleSelectChange = (name: keyof TicketFormData, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const result = ticketSchema.safeParse(formData);
    if (!result.success) {
      const fieldErrors: Partial<Record<keyof TicketFormData, string>> = {};
      result.error.errors.forEach(err => {
        if (err.path[0]) {
          fieldErrors[err.path[0] as keyof TicketFormData] = err.message;
        }
      });
      setErrors(fieldErrors);
      return;
    }

    setIsSubmitting(true);

    try {
      const { data, error } = await supabase.functions.invoke('create-zendesk-ticket', {
        body: {
          requester_name: result.data.name,
          requester_email: result.data.email,
          requester_phone: result.data.phone || undefined,
          subject: result.data.subject,
          description: result.data.message,
          type: result.data.category,
          priority: result.data.priority,
          tags: ['vendibook', 'contact-form', result.data.category],
        },
      });

      if (error) throw error;

      setTicketId(data.ticket_id);
      toast({
        title: 'Ticket created!',
        description: `Your ticket #${data.ticket_id} has been submitted. We'll be in touch soon.`,
      });
    } catch (error) {
      console.error('Ticket creation error:', error);
      toast({
        title: 'Something went wrong',
        description: 'Please try again or email us directly at support@vendibook.com',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setTicketId(null);
    setFormData({
      name: '',
      email: '',
      phone: '',
      subject: '',
      category: 'question',
      priority: 'normal',
      message: '',
    });
  };

  if (ticketId) {
    return (
      <div className="bg-card border border-border rounded-xl p-8 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 text-primary mb-4">
          <CheckCircle className="h-8 w-8" />
        </div>
        <h3 className="text-xl font-semibold text-foreground mb-2">
          Ticket Created Successfully!
        </h3>
        <p className="text-muted-foreground mb-2">
          Your support ticket <span className="font-mono font-semibold text-primary">#{ticketId}</span> has been created.
        </p>
        <p className="text-sm text-muted-foreground mb-6">
          We'll respond to your request as soon as possible. You can also track your ticket status in the "Tickets" tab.
        </p>
        <Button onClick={resetForm} variant="outline">
          Submit Another Ticket
        </Button>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center">
          <Ticket className="h-5 w-5" />
        </div>
        <div>
          <h3 className="font-semibold text-foreground">Create Support Ticket</h3>
          <p className="text-sm text-muted-foreground">We'll respond via email</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="ticket-name">Full Name *</Label>
            <Input
              id="ticket-name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="John Doe"
              className={errors.name ? 'border-destructive' : ''}
              disabled={isSubmitting}
            />
            {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="ticket-email">Email Address *</Label>
            <Input
              id="ticket-email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="john@example.com"
              className={errors.email ? 'border-destructive' : ''}
              disabled={isSubmitting}
            />
            {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="ticket-phone">Phone Number (optional)</Label>
            <Input
              id="ticket-phone"
              name="phone"
              type="tel"
              value={formData.phone}
              onChange={handleChange}
              placeholder="(555) 123-4567"
              className={errors.phone ? 'border-destructive' : ''}
              disabled={isSubmitting}
            />
            {errors.phone && <p className="text-sm text-destructive">{errors.phone}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="ticket-category">Category *</Label>
            <Select
              value={formData.category}
              onValueChange={(value) => handleSelectChange('category', value)}
              disabled={isSubmitting}
            >
              <SelectTrigger id="ticket-category">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="question">General Question</SelectItem>
                <SelectItem value="incident">Issue / Incident</SelectItem>
                <SelectItem value="problem">Technical Problem</SelectItem>
                <SelectItem value="task">Feature Request</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="ticket-subject">Subject *</Label>
            <Input
              id="ticket-subject"
              name="subject"
              value={formData.subject}
              onChange={handleChange}
              placeholder="Brief summary of your request"
              className={errors.subject ? 'border-destructive' : ''}
              disabled={isSubmitting}
            />
            {errors.subject && <p className="text-sm text-destructive">{errors.subject}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="ticket-priority">Priority *</Label>
            <Select
              value={formData.priority}
              onValueChange={(value) => handleSelectChange('priority', value)}
              disabled={isSubmitting}
            >
              <SelectTrigger id="ticket-priority">
                <SelectValue placeholder="Select priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="ticket-message">Description *</Label>
          <Textarea
            id="ticket-message"
            name="message"
            value={formData.message}
            onChange={handleChange}
            placeholder="Please describe your issue or question in detail..."
            rows={5}
            className={errors.message ? 'border-destructive' : ''}
            disabled={isSubmitting}
          />
          {errors.message && <p className="text-sm text-destructive">{errors.message}</p>}
        </div>

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Creating Ticket...
            </>
          ) : (
            <>
              <Send className="h-4 w-4 mr-2" />
              Submit Ticket
            </>
          )}
        </Button>
      </form>
    </div>
  );
};

export default ZendeskTicketForm;
