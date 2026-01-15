import { useState } from 'react';
import { z } from 'zod';
import { Phone, Mail, Clock, Send, Loader2, CheckCircle, Ticket, Headphones, CalendarClock, Sparkles, ArrowRight } from 'lucide-react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import ZendeskTicketForm from '@/components/support/ZendeskTicketForm';
import CallbackScheduler from '@/components/support/CallbackScheduler';
import TicketStatusTracker from '@/components/support/TicketStatusTracker';
import SocialContactOptions from '@/components/support/SocialContactOptions';
import FeaturedArticles from '@/components/support/FeaturedArticles';

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
        description: 'We have received your message and will get back to you soon.',
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
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      
      <main className="flex-1">
        {/* Hero Section - GRADIENT */}
        <section className="relative py-16 md:py-24 overflow-hidden">
          {/* Orange-Yellow Gradient Background */}
          <div className="absolute inset-0 bg-gradient-to-br from-yellow-300/30 via-amber-200/25 to-orange-300/20" />
          
          {/* Decorative orbs - orange/yellow only */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-20 right-20 w-96 h-96 bg-yellow-400/30 rounded-full blur-3xl animate-pulse" />
            <div className="absolute bottom-20 left-20 w-80 h-80 bg-orange-400/25 rounded-full blur-3xl" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-amber-300/20 rounded-full blur-3xl animate-pulse" />
            <div className="absolute top-40 left-1/4 w-64 h-64 bg-yellow-300/20 rounded-full blur-2xl" />
          </div>
          
          <div className="container relative z-10">
            <div className="text-center mb-12">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
                <Sparkles className="h-4 w-4" />
                We're here to help
              </div>
              
              <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-6 tracking-tight">
                Get in Touch
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
                Have questions about renting, selling, or listing your mobile kitchen? 
                Our support team is ready to assist you.
              </p>
              
              {/* Live Chat Button - Enhanced */}
              <div className="max-w-md mx-auto">
                <SocialContactOptions />
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-3 gap-4 max-w-2xl mx-auto mb-12">
              <div className="text-center p-4 rounded-2xl bg-card/50 backdrop-blur-sm border border-border/50">
                <div className="text-2xl md:text-3xl font-bold text-primary mb-1">&lt;2hr</div>
                <div className="text-xs md:text-sm text-muted-foreground">Avg Response</div>
              </div>
              <div className="text-center p-4 rounded-2xl bg-card/50 backdrop-blur-sm border border-border/50">
                <div className="text-2xl md:text-3xl font-bold text-primary mb-1">98%</div>
                <div className="text-xs md:text-sm text-muted-foreground">Satisfaction</div>
              </div>
              <div className="text-center p-4 rounded-2xl bg-card/50 backdrop-blur-sm border border-border/50">
                <div className="text-2xl md:text-3xl font-bold text-primary mb-1">24/7</div>
                <div className="text-xs md:text-sm text-muted-foreground">Ticket Support</div>
              </div>
            </div>

            {/* Featured Articles - Enhanced */}
            <div className="max-w-4xl mx-auto">
              <Card className="border-0 shadow-xl bg-card/80 backdrop-blur-sm">
                <CardContent className="p-6 md:p-8">
                  <FeaturedArticles />
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Main Content - NATURAL */}
        <section className="py-16 md:py-20 bg-background">
          <div className="container">
            <div className="max-w-6xl mx-auto">
              {/* Section Header */}
              <div className="text-center mb-10">
                <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
                  How Can We Help?
                </h2>
                <p className="text-muted-foreground">
                  Choose your preferred method of contact
                </p>
              </div>

              <Tabs defaultValue="ticket" className="w-full">
                {/* Enhanced Tab List */}
                <TabsList className="grid w-full grid-cols-4 mb-10 p-1.5 h-auto bg-card border border-border rounded-2xl shadow-sm">
                  <TabsTrigger 
                    value="ticket" 
                    className="flex items-center justify-center gap-2 py-4 rounded-xl data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg transition-all duration-200"
                  >
                    <Ticket className="h-5 w-5" />
                    <span className="hidden sm:inline font-medium">New Ticket</span>
                  </TabsTrigger>
                  <TabsTrigger 
                    value="form" 
                    className="flex items-center justify-center gap-2 py-4 rounded-xl data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg transition-all duration-200"
                  >
                    <Send className="h-5 w-5" />
                    <span className="hidden sm:inline font-medium">Message</span>
                  </TabsTrigger>
                  <TabsTrigger 
                    value="schedule" 
                    className="flex items-center justify-center gap-2 py-4 rounded-xl data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg transition-all duration-200"
                  >
                    <CalendarClock className="h-5 w-5" />
                    <span className="hidden sm:inline font-medium">Schedule</span>
                  </TabsTrigger>
                  <TabsTrigger 
                    value="tickets" 
                    className="flex items-center justify-center gap-2 py-4 rounded-xl data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg transition-all duration-200"
                  >
                    <Headphones className="h-5 w-5" />
                    <span className="hidden sm:inline font-medium">My Tickets</span>
                  </TabsTrigger>
                </TabsList>

                {/* Zendesk Ticket Form - Enhanced */}
                <TabsContent value="ticket" className="mt-0">
                  <div className="grid lg:grid-cols-5 gap-8">
                    <div className="lg:col-span-3">
                      <Card className="border-0 shadow-xl">
                        <CardContent className="p-6 md:p-8">
                          <div className="flex items-center gap-3 mb-6">
                            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground flex items-center justify-center shadow-lg">
                              <Ticket className="h-6 w-6" />
                            </div>
                            <div>
                              <h2 className="text-xl font-bold text-foreground">Create a Support Ticket</h2>
                              <p className="text-sm text-muted-foreground">We'll respond within 2 hours</p>
                            </div>
                          </div>
                          <ZendeskTicketForm />
                        </CardContent>
                      </Card>
                    </div>
                    
                    <div className="lg:col-span-2 space-y-4">
                      {/* Contact Cards - Enhanced */}
                      <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow group cursor-pointer">
                        <CardContent className="p-5">
                          <a href="tel:+18778836342" className="flex items-center gap-4">
                            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 text-white flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
                              <Phone className="h-6 w-6" />
                            </div>
                            <div className="flex-1">
                              <h3 className="font-semibold text-foreground mb-0.5">Call Us</h3>
                              <p className="text-primary font-medium">1-877-8-VENDI-2</p>
                            </div>
                            <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                          </a>
                        </CardContent>
                      </Card>

                      <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow group cursor-pointer">
                        <CardContent className="p-5">
                          <a href="mailto:support@vendibook.com" className="flex items-center gap-4">
                            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-green-500 to-green-600 text-white flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
                              <Mail className="h-6 w-6" />
                            </div>
                            <div className="flex-1">
                              <h3 className="font-semibold text-foreground mb-0.5">Email Us</h3>
                              <p className="text-primary font-medium text-sm">support@vendibook.com</p>
                            </div>
                            <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                          </a>
                        </CardContent>
                      </Card>

                      <Card className="border-0 shadow-lg bg-gradient-to-br from-primary/5 to-primary/10">
                        <CardContent className="p-5">
                          <div className="flex items-center gap-4">
                            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground flex items-center justify-center shadow-lg">
                              <Clock className="h-6 w-6" />
                            </div>
                            <div>
                              <h3 className="font-semibold text-foreground mb-1">Business Hours</h3>
                              <p className="text-sm text-muted-foreground leading-relaxed">
                                Mon-Fri: 9am - 6pm EST<br />
                                Saturday: 10am - 4pm EST
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                </TabsContent>

                {/* Contact Form - Enhanced */}
                <TabsContent value="form" className="mt-0">
                  <div className="max-w-3xl mx-auto">
                    {isSuccess ? (
                      <Card className="border-0 shadow-xl">
                        <CardContent className="p-12 text-center">
                          <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-br from-green-500 to-green-600 text-white mb-8 shadow-xl">
                            <CheckCircle className="h-12 w-12" />
                          </div>
                          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
                            Thank you for reaching out!
                          </h2>
                          <p className="text-muted-foreground mb-2 text-lg">
                            We have received your message and will get back to you as soon as possible.
                          </p>
                          <p className="text-sm text-muted-foreground mb-8">
                            If you do not hear from us, please check your phone or email us directly at{' '}
                            <a href="mailto:support@vendibook.com" className="text-primary hover:underline font-medium">
                              support@vendibook.com
                            </a>
                          </p>
                          <Button onClick={() => setIsSuccess(false)} variant="outline" size="lg" className="rounded-xl">
                            Send Another Message
                          </Button>
                        </CardContent>
                      </Card>
                    ) : (
                      <Card className="border-0 shadow-xl">
                        <CardContent className="p-6 md:p-10">
                          <div className="flex items-center gap-3 mb-8">
                            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground flex items-center justify-center shadow-lg">
                              <Send className="h-6 w-6" />
                            </div>
                            <div>
                              <h2 className="text-xl font-bold text-foreground">Send us a Message</h2>
                              <p className="text-sm text-muted-foreground">We'd love to hear from you</p>
                            </div>
                          </div>
                          
                          <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="grid md:grid-cols-2 gap-5">
                              <div className="space-y-2">
                                <Label htmlFor="name" className="text-sm font-medium">Full Name *</Label>
                                <Input
                                  id="name"
                                  name="name"
                                  value={formData.name}
                                  onChange={handleChange}
                                  placeholder="John Doe"
                                  className={`h-12 rounded-xl border-border/60 focus:border-primary ${errors.name ? 'border-destructive' : ''}`}
                                  disabled={isSubmitting}
                                />
                                {errors.name && (
                                  <p className="text-sm text-destructive">{errors.name}</p>
                                )}
                              </div>

                              <div className="space-y-2">
                                <Label htmlFor="email" className="text-sm font-medium">Email Address *</Label>
                                <Input
                                  id="email"
                                  name="email"
                                  type="email"
                                  value={formData.email}
                                  onChange={handleChange}
                                  placeholder="john@example.com"
                                  className={`h-12 rounded-xl border-border/60 focus:border-primary ${errors.email ? 'border-destructive' : ''}`}
                                  disabled={isSubmitting}
                                />
                                {errors.email && (
                                  <p className="text-sm text-destructive">{errors.email}</p>
                                )}
                              </div>
                            </div>

                            <div className="grid md:grid-cols-2 gap-5">
                              <div className="space-y-2">
                                <Label htmlFor="phone" className="text-sm font-medium">Phone Number *</Label>
                                <Input
                                  id="phone"
                                  name="phone"
                                  type="tel"
                                  value={formData.phone}
                                  onChange={handleChange}
                                  placeholder="(555) 123-4567"
                                  className={`h-12 rounded-xl border-border/60 focus:border-primary ${errors.phone ? 'border-destructive' : ''}`}
                                  disabled={isSubmitting}
                                />
                                {errors.phone && (
                                  <p className="text-sm text-destructive">{errors.phone}</p>
                                )}
                              </div>

                              <div className="space-y-2">
                                <Label htmlFor="subject" className="text-sm font-medium">Subject *</Label>
                                <Input
                                  id="subject"
                                  name="subject"
                                  value={formData.subject}
                                  onChange={handleChange}
                                  placeholder="How can we help?"
                                  className={`h-12 rounded-xl border-border/60 focus:border-primary ${errors.subject ? 'border-destructive' : ''}`}
                                  disabled={isSubmitting}
                                />
                                {errors.subject && (
                                  <p className="text-sm text-destructive">{errors.subject}</p>
                                )}
                              </div>
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor="message" className="text-sm font-medium">Message *</Label>
                              <Textarea
                                id="message"
                                name="message"
                                value={formData.message}
                                onChange={handleChange}
                                placeholder="Tell us more about your inquiry..."
                                rows={6}
                                className={`rounded-xl border-border/60 focus:border-primary resize-none ${errors.message ? 'border-destructive' : ''}`}
                                disabled={isSubmitting}
                              />
                              {errors.message && (
                                <p className="text-sm text-destructive">{errors.message}</p>
                              )}
                            </div>

                            <Button 
                              type="submit" 
                              size="lg" 
                              className="w-full h-14 text-base font-semibold rounded-xl shadow-lg hover:shadow-xl transition-shadow" 
                              disabled={isSubmitting}
                            >
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
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </TabsContent>

                {/* Schedule Callback - Enhanced */}
                <TabsContent value="schedule" className="mt-0">
                  <div className="grid lg:grid-cols-5 gap-8">
                    <div className="lg:col-span-3">
                      <Card className="border-0 shadow-xl">
                        <CardContent className="p-6 md:p-8">
                          <div className="flex items-center gap-3 mb-6">
                            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground flex items-center justify-center shadow-lg">
                              <CalendarClock className="h-6 w-6" />
                            </div>
                            <div>
                              <h2 className="text-xl font-bold text-foreground">Schedule a Callback</h2>
                              <p className="text-sm text-muted-foreground">We'll call you at your preferred time</p>
                            </div>
                          </div>
                          <CallbackScheduler />
                        </CardContent>
                      </Card>
                    </div>
                    
                    <div className="lg:col-span-2 space-y-4">
                      <Card className="border-0 shadow-lg bg-gradient-to-br from-primary/5 via-primary/10 to-primary/5">
                        <CardContent className="p-6">
                          <h3 className="font-bold text-foreground mb-4 flex items-center gap-2">
                            <Sparkles className="h-5 w-5 text-primary" />
                            Why Schedule a Callback?
                          </h3>
                          <ul className="space-y-3">
                            {[
                              'No waiting on hold – we call you',
                              'Speak with a real person, not a chatbot',
                              'Get personalized help for your situation',
                              'Available Mon-Sat during business hours'
                            ].map((item, i) => (
                              <li key={i} className="flex items-start gap-3 text-sm">
                                <div className="w-5 h-5 rounded-full bg-primary/20 text-primary flex items-center justify-center flex-shrink-0 mt-0.5">
                                  <CheckCircle className="h-3 w-3" />
                                </div>
                                <span className="text-muted-foreground">{item}</span>
                              </li>
                            ))}
                          </ul>
                        </CardContent>
                      </Card>
                      
                      <Card className="border-0 shadow-lg">
                        <CardContent className="p-5">
                          <div className="flex items-center gap-4">
                            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground flex items-center justify-center shadow-lg">
                              <Clock className="h-6 w-6" />
                            </div>
                            <div>
                              <h3 className="font-semibold text-foreground mb-1">Business Hours</h3>
                              <p className="text-sm text-muted-foreground leading-relaxed">
                                Mon-Fri: 9am - 6pm EST<br />
                                Saturday: 10am - 4pm EST
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                </TabsContent>

                {/* Ticket Status - Enhanced */}
                <TabsContent value="tickets" className="mt-0">
                  <div className="grid lg:grid-cols-5 gap-8">
                    <div className="lg:col-span-3">
                      <Card className="border-0 shadow-xl">
                        <CardContent className="p-6 md:p-8">
                          <div className="flex items-center gap-3 mb-6">
                            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground flex items-center justify-center shadow-lg">
                              <Headphones className="h-6 w-6" />
                            </div>
                            <div>
                              <h2 className="text-xl font-bold text-foreground">Check Ticket Status</h2>
                              <p className="text-sm text-muted-foreground">Track your support requests</p>
                            </div>
                          </div>
                          <TicketStatusTracker />
                        </CardContent>
                      </Card>
                    </div>
                    
                    <div className="lg:col-span-2">
                      <Card className="border-0 shadow-lg bg-gradient-to-br from-muted/50 to-muted/30">
                        <CardContent className="p-6">
                          <h3 className="font-bold text-foreground mb-5">Understanding Ticket Statuses</h3>
                          <ul className="space-y-4">
                            {[
                              { color: 'bg-blue-500', label: 'New', desc: 'Received and awaiting review' },
                              { color: 'bg-yellow-500', label: 'Open', desc: 'Agent actively working on it' },
                              { color: 'bg-orange-500', label: 'Pending', desc: 'Waiting for your response' },
                              { color: 'bg-green-500', label: 'Solved', desc: 'Request has been resolved' },
                            ].map((status, i) => (
                              <li key={i} className="flex items-start gap-4">
                                <span className={`w-4 h-4 rounded-full ${status.color} mt-0.5 flex-shrink-0 shadow-sm`} />
                                <div>
                                  <span className="font-semibold text-foreground text-sm">{status.label}</span>
                                  <p className="text-muted-foreground text-sm">{status.desc}</p>
                                </div>
                              </li>
                            ))}
                          </ul>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Contact;
