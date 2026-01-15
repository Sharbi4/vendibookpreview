import { useState } from 'react';
import { z } from 'zod';
import { Phone, Mail, Clock, Send, Loader2, CheckCircle, MessageSquare, Headphones, CalendarClock } from 'lucide-react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import FAQChatbot from '@/components/support/FAQChatbot';
import CallbackScheduler from '@/components/support/CallbackScheduler';
import TicketStatusTracker from '@/components/support/TicketStatusTracker';
import SocialContactOptions from '@/components/support/SocialContactOptions';

const contactSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100, "Name must be less than 100 characters"),
  email: z.string().trim().email("Invalid email address").max(255, "Email must be less than 255 characters"),
  phone: z.string().trim().min(1, "Phone number is required").max(20, "Phone number must be less than 20 characters"),
  subject: z.string().trim().min(1, "Subject is required").max(200, "Subject must be less than 200 characters"),
  message: z.string().trim().min(1, "Message is required").max(2000, "Message must be less than 2000 characters"),
});

type ContactFormData = z.infer<typeof contactSchema>;

const Contact = () => {
  const [formData, setFormData] = useState<ContactFormData>({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: '',
  });
  const [errors, setErrors] = useState<Partial<Record<keyof ContactFormData, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const { toast } = useToast();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name as keyof ContactFormData]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const result = contactSchema.safeParse(formData);
    if (!result.success) {
      const fieldErrors: Partial<Record<keyof ContactFormData, string>> = {};
      result.error.errors.forEach(err => {
        if (err.path[0]) {
          fieldErrors[err.path[0] as keyof ContactFormData] = err.message;
        }
      });
      setErrors(fieldErrors);
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase.functions.invoke('send-contact-email', {
        body: result.data,
      });

      if (error) throw error;

      setIsSuccess(true);
      toast({
        title: 'Message sent!',
        description: 'We will call you within 2 minutes during business hours.',
      });
    } catch (error) {
      console.error('Contact form error:', error);
      toast({
        title: 'Something went wrong',
        description: 'Please try again or email us directly at support@vendibook.com',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1">
        {/* Hero Section */}
        <section className="py-12 md:py-16 bg-gradient-to-b from-vendibook-cream to-background">
          <div className="container text-center">
            <h1 className="text-3xl md:text-5xl font-bold text-foreground mb-4">
              Contact Us
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
              Have questions? We would love to hear from you. Choose your preferred way to reach us.
            </p>
            
            {/* Quick Contact Options */}
            <div className="max-w-2xl mx-auto">
              <SocialContactOptions />
            </div>
          </div>
        </section>

        {/* Main Content */}
        <section className="py-12 md:py-16">
          <div className="container">
            <Tabs defaultValue="chat" className="max-w-6xl mx-auto">
              <TabsList className="grid w-full grid-cols-4 mb-8">
                <TabsTrigger value="chat" className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  <span className="hidden sm:inline">Quick Help</span>
                </TabsTrigger>
                <TabsTrigger value="form" className="flex items-center gap-2">
                  <Send className="h-4 w-4" />
                  <span className="hidden sm:inline">Message</span>
                </TabsTrigger>
                <TabsTrigger value="schedule" className="flex items-center gap-2">
                  <CalendarClock className="h-4 w-4" />
                  <span className="hidden sm:inline">Schedule</span>
                </TabsTrigger>
                <TabsTrigger value="tickets" className="flex items-center gap-2">
                  <Headphones className="h-4 w-4" />
                  <span className="hidden sm:inline">Tickets</span>
                </TabsTrigger>
              </TabsList>

              {/* Quick Help / FAQ Chatbot */}
              <TabsContent value="chat">
                <div className="grid lg:grid-cols-2 gap-8">
                  <div>
                    <h2 className="text-2xl font-bold text-foreground mb-2">Get Instant Answers</h2>
                    <p className="text-muted-foreground mb-6">
                      Ask VendiBot any question about rentals, payments, or how Vendibook works. Get answers instantly, 24/7.
                    </p>
                    <FAQChatbot />
                  </div>
                  <div className="space-y-6">
                    <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                          <Phone className="h-6 w-6" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-foreground mb-1">Call Us</h3>
                          <a 
                            href="tel:+18778836342" 
                            className="text-sm text-primary hover:underline font-medium"
                          >
                            1877-8VENDI2
                          </a>
                          <p className="text-sm text-muted-foreground mt-1">
                            We will call you back within 2 minutes during business hours
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                          <Mail className="h-6 w-6" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-foreground mb-1">Email Us</h3>
                          <a 
                            href="mailto:support@vendibook.com" 
                            className="text-sm text-primary hover:underline"
                          >
                            support@vendibook.com
                          </a>
                        </div>
                      </div>
                    </div>

                    <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                          <Clock className="h-6 w-6" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-foreground mb-1">Business Hours</h3>
                          <p className="text-sm text-muted-foreground">
                            Monday - Friday: 9am - 6pm EST<br />
                            Saturday: 10am - 4pm EST
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* Contact Form */}
              <TabsContent value="form">
                <div className="max-w-3xl mx-auto">
                  {isSuccess ? (
                    <div className="bg-card border border-border rounded-xl p-12 text-center">
                      <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 text-primary mb-6">
                        <CheckCircle className="h-10 w-10" />
                      </div>
                      <h2 className="text-2xl font-bold text-foreground mb-4">
                        Thank you for reaching out!
                      </h2>
                      <p className="text-muted-foreground mb-2">
                        We have received your message and will call you within 2 minutes during business hours.
                      </p>
                      <p className="text-sm text-muted-foreground mb-8">
                        If you do not hear from us, please check your phone or email us directly at{' '}
                        <a href="mailto:support@vendibook.com" className="text-primary hover:underline">
                          support@vendibook.com
                        </a>
                      </p>
                      <Button onClick={() => setIsSuccess(false)} variant="outline">
                        Send Another Message
                      </Button>
                    </div>
                  ) : (
                    <div className="bg-card border border-border rounded-xl p-8 shadow-sm">
                      <h2 className="text-xl font-semibold text-foreground mb-6">
                        Send us a message
                      </h2>
                      
                      <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid md:grid-cols-2 gap-6">
                          <div className="space-y-2">
                            <Label htmlFor="name">Full Name *</Label>
                            <Input
                              id="name"
                              name="name"
                              value={formData.name}
                              onChange={handleChange}
                              placeholder="John Doe"
                              className={errors.name ? 'border-destructive' : ''}
                              disabled={isSubmitting}
                            />
                            {errors.name && (
                              <p className="text-sm text-destructive">{errors.name}</p>
                            )}
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="email">Email Address *</Label>
                            <Input
                              id="email"
                              name="email"
                              type="email"
                              value={formData.email}
                              onChange={handleChange}
                              placeholder="john@example.com"
                              className={errors.email ? 'border-destructive' : ''}
                              disabled={isSubmitting}
                            />
                            {errors.email && (
                              <p className="text-sm text-destructive">{errors.email}</p>
                            )}
                          </div>
                        </div>

                        <div className="grid md:grid-cols-2 gap-6">
                          <div className="space-y-2">
                            <Label htmlFor="phone">Phone Number *</Label>
                            <Input
                              id="phone"
                              name="phone"
                              type="tel"
                              value={formData.phone}
                              onChange={handleChange}
                              placeholder="(555) 123-4567"
                              className={errors.phone ? 'border-destructive' : ''}
                              disabled={isSubmitting}
                            />
                            {errors.phone && (
                              <p className="text-sm text-destructive">{errors.phone}</p>
                            )}
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="subject">Subject *</Label>
                            <Input
                              id="subject"
                              name="subject"
                              value={formData.subject}
                              onChange={handleChange}
                              placeholder="How can we help?"
                              className={errors.subject ? 'border-destructive' : ''}
                              disabled={isSubmitting}
                            />
                            {errors.subject && (
                              <p className="text-sm text-destructive">{errors.subject}</p>
                            )}
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="message">Message *</Label>
                          <Textarea
                            id="message"
                            name="message"
                            value={formData.message}
                            onChange={handleChange}
                            placeholder="Tell us more about your inquiry..."
                            rows={6}
                            className={errors.message ? 'border-destructive' : ''}
                            disabled={isSubmitting}
                          />
                          {errors.message && (
                            <p className="text-sm text-destructive">{errors.message}</p>
                          )}
                        </div>

                        <div className="bg-muted/50 rounded-lg p-4">
                          <p className="text-sm text-muted-foreground flex items-center gap-2">
                            <Phone className="h-4 w-4 text-primary" />
                            We will call you within 2 minutes during business hours after you submit this form.
                          </p>
                        </div>

                        <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
                          {isSubmitting ? (
                            <>
                              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                              Sending...
                            </>
                          ) : (
                            <>
                              <Send className="h-5 w-5 mr-2" />
                              Send Message
                            </>
                          )}
                        </Button>
                      </form>
                    </div>
                  )}
                </div>
              </TabsContent>

              {/* Schedule Callback */}
              <TabsContent value="schedule">
                <div className="grid lg:grid-cols-2 gap-8">
                  <div>
                    <h2 className="text-2xl font-bold text-foreground mb-2">Schedule a Callback</h2>
                    <p className="text-muted-foreground mb-6">
                      Pick a date and time that works for you, and we'll call you at that exact time. No waiting on hold.
                    </p>
                    <CallbackScheduler />
                  </div>
                  <div className="space-y-6">
                    <div className="bg-primary/5 border border-primary/20 rounded-xl p-6">
                      <h3 className="font-semibold text-foreground mb-3">Why Schedule a Callback?</h3>
                      <ul className="space-y-2 text-sm text-muted-foreground">
                        <li className="flex items-start gap-2">
                          <CheckCircle className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                          No waiting on hold – we call you at your chosen time
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                          Speak with a real person, not a chatbot
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                          Get personalized help with your specific situation
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                          Available Monday-Saturday during business hours
                        </li>
                      </ul>
                    </div>
                    <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                          <Clock className="h-6 w-6" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-foreground mb-1">Business Hours</h3>
                          <p className="text-sm text-muted-foreground">
                            Monday - Friday: 9am - 6pm EST<br />
                            Saturday: 10am - 4pm EST
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* Ticket Status */}
              <TabsContent value="tickets">
                <div className="grid lg:grid-cols-2 gap-8">
                  <div>
                    <h2 className="text-2xl font-bold text-foreground mb-2">Check Ticket Status</h2>
                    <p className="text-muted-foreground mb-6">
                      Already submitted a support request? Track the status of your tickets here.
                    </p>
                    <TicketStatusTracker />
                  </div>
                  <div className="space-y-6">
                    <div className="bg-muted/50 border border-border rounded-xl p-6">
                      <h3 className="font-semibold text-foreground mb-3">Understanding Ticket Statuses</h3>
                      <ul className="space-y-3 text-sm">
                        <li className="flex items-start gap-3">
                          <span className="w-3 h-3 rounded-full bg-blue-500 mt-1 flex-shrink-0"></span>
                          <div>
                            <span className="font-medium text-foreground">New</span>
                            <p className="text-muted-foreground">Your request has been received and is awaiting review</p>
                          </div>
                        </li>
                        <li className="flex items-start gap-3">
                          <span className="w-3 h-3 rounded-full bg-yellow-500 mt-1 flex-shrink-0"></span>
                          <div>
                            <span className="font-medium text-foreground">Open</span>
                            <p className="text-muted-foreground">An agent is actively working on your request</p>
                          </div>
                        </li>
                        <li className="flex items-start gap-3">
                          <span className="w-3 h-3 rounded-full bg-orange-500 mt-1 flex-shrink-0"></span>
                          <div>
                            <span className="font-medium text-foreground">Pending</span>
                            <p className="text-muted-foreground">Waiting for additional information from you</p>
                          </div>
                        </li>
                        <li className="flex items-start gap-3">
                          <span className="w-3 h-3 rounded-full bg-green-500 mt-1 flex-shrink-0"></span>
                          <div>
                            <span className="font-medium text-foreground">Solved</span>
                            <p className="text-muted-foreground">Your request has been resolved</p>
                          </div>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Contact;
