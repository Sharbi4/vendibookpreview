import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { motion } from 'framer-motion';
import { Package, QrCode, Loader2, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import SEO from '@/components/SEO';

const US_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY', 'DC'
];

const formSchema = z.object({
  fullName: z.string().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().email('Invalid email address'),
  phone: z.string().optional(),
  streetAddress: z.string().min(5, 'Please enter a valid street address').max(200),
  city: z.string().min(2, 'Please enter a valid city').max(100),
  state: z.string().min(2, 'Please select a state'),
  zipCode: z.string().regex(/^\d{5}(-\d{4})?$/, 'Please enter a valid ZIP code'),
  signageType: z.enum(['6x6_cards', '24x24_sign'], {
    required_error: 'Please select a signage type',
  }),
  signageText: z.string()
    .min(1, 'Please enter signage text')
    .max(20, 'Maximum 20 characters allowed')
    .regex(/^[a-zA-Z0-9\s]+$/, 'Only letters, numbers, and spaces allowed'),
});

type FormData = z.infer<typeof formSchema>;

const SignageRequest = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [listingInfo, setListingInfo] = useState<{ title: string; category: string } | null>(null);

  const listingId = searchParams.get('listing');

  // Get default signage text based on listing category
  const getDefaultSignageText = () => {
    if (!listingInfo?.category) return 'Rent This';
    
    const categoryMap: Record<string, string> = {
      commercial_kitchen: 'Rent Kitchen',
      food_truck: 'Rent Truck',
      food_trailer: 'Rent Trailer',
      vendor_space: 'Book Space',
    };
    
    return categoryMap[listingInfo.category] || 'Rent This';
  };

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fullName: '',
      email: '',
      phone: '',
      streetAddress: '',
      city: '',
      state: '',
      zipCode: '',
      signageType: undefined,
      signageText: '',
    },
  });

  // Update signage text default when listing info loads
  useEffect(() => {
    if (listingInfo && !form.getValues('signageText')) {
      form.setValue('signageText', getDefaultSignageText());
    }
  }, [listingInfo]);

  // Fetch listing info if listing ID is provided
  useEffect(() => {
    const fetchListing = async () => {
      if (!listingId) return;

      const { data, error } = await supabase
        .from('listings')
        .select('title, category')
        .eq('id', listingId)
        .single();

      if (!error && data) {
        setListingInfo(data);
      }
    };

    fetchListing();
  }, [listingId]);

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);

    try {
      const signageLabel = data.signageType === '6x6_cards' 
        ? '6x6 QR Code Cards (Pack of 10)' 
        : '24x24 Outdoor Double Stake Sign';

      const fullAddress = `${data.streetAddress}, ${data.city}, ${data.state} ${data.zipCode}`;

      // Submit to Zendesk via edge function
      const { data: result, error } = await supabase.functions.invoke('create-zendesk-ticket', {
        body: {
          requester_name: data.fullName,
          requester_email: data.email,
          requester_phone: data.phone || undefined,
          subject: `Free Signage Request: ${signageLabel}`,
          description: `
New signage request from VendiBook host:

**Contact Information**
- Name: ${data.fullName}
- Email: ${data.email}
- Phone: ${data.phone || 'Not provided'}

**Shipping Address**
${data.streetAddress}
${data.city}, ${data.state} ${data.zipCode}

**Signage Selection**
${signageLabel}

**Custom Signage Text**
"${data.signageText.toUpperCase()}"

**Listing Information**
- Listing ID: ${listingId || 'Not specified'}
- Listing Title: ${listingInfo?.title || 'Not specified'}
- Category: ${listingInfo?.category || 'Not specified'}

---
This request was submitted via the VendiBook signage request form.
          `.trim(),
          type: 'task',
          priority: 'normal',
          tags: ['vendibook', 'signage-request', 'free-signage', data.signageType],
          external_id: listingId || undefined,
        },
      });

      if (error) throw error;

      setIsSubmitted(true);
      toast({
        title: 'Request Submitted! 🎉',
        description: 'Your free signage will be shipped within 7-10 business days.',
      });

    } catch (error) {
      console.error('Error submitting signage request:', error);
      toast({
        title: 'Submission Failed',
        description: 'Please try again or contact support@vendibook.com',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <>
        <SEO
          title="Signage Request Submitted | VendiBook"
          description="Your free QR signage request has been submitted successfully."
        />
        <Header />
        <main className="min-h-screen bg-gradient-to-b from-background to-muted/30 pt-20">
          <div className="container max-w-2xl py-16">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
            >
              <Card className="border-2 border-primary/20">
                <CardContent className="pt-12 pb-10 text-center">
                  <div className="mx-auto w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-6">
                    <CheckCircle2 className="w-10 h-10 text-primary" />
                  </div>
                  <h1 className="text-3xl font-bold mb-4">You're All Set! 🎉</h1>
                  <p className="text-lg text-muted-foreground mb-6">
                    Your free QR signage is on its way! Expect delivery within 7-10 business days.
                  </p>
                  <div className="bg-muted/50 rounded-lg p-4 mb-8 text-left">
                    <p className="text-sm font-medium mb-2">What's Next:</p>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• You'll receive a shipping confirmation email</li>
                      <li>• Place your signage at your location's entrance</li>
                      <li>• Renters scan to book instantly—no phone calls needed!</li>
                    </ul>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <Button onClick={() => navigate('/dashboard')}>
                      Go to Dashboard
                    </Button>
                    <Button variant="outline" onClick={() => navigate('/')}>
                      Back to Home
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
        <SEO
          title="Request Free QR Signage | VendiBook"
          description="Get free professional signage with your unique QR code. Choose from 6x6 cards or 24x24 outdoor signs."
        />
        <Header />
      <main className="min-h-screen bg-gradient-to-b from-background to-muted/30 pt-20">
        <div className="container max-w-3xl py-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            {/* Header */}
            <div className="text-center mb-10">
              <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                <QrCode className="w-8 h-8 text-primary" />
              </div>
              <h1 className="text-3xl md:text-4xl font-bold mb-3">
                Claim Your Free QR Signage
              </h1>
              <p className="text-lg text-muted-foreground max-w-xl mx-auto">
                Professional signage with your unique QR code. Renters scan to book and pay instantly—no phone calls needed!
              </p>
              {listingInfo && (
                <p className="mt-2 text-sm text-primary font-medium">
                  For listing: "{listingInfo.title}"
                </p>
              )}
            </div>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                {/* Signage Selection */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Package className="w-5 h-5" />
                      Choose Your Signage
                    </CardTitle>
                    <CardDescription>
                      Select the signage type that works best for your location
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <FormField
                      control={form.control}
                      name="signageType"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <RadioGroup
                              onValueChange={field.onChange}
                              value={field.value}
                              className="grid sm:grid-cols-2 gap-4"
                            >
                              {/* 6x6 Cards Option */}
                              <Label
                                htmlFor="6x6_cards"
                                className={`flex flex-col items-center gap-3 p-6 border-2 rounded-xl cursor-pointer transition-all hover:border-primary/50 ${
                                  field.value === '6x6_cards'
                                    ? 'border-primary bg-primary/5'
                                    : 'border-border'
                                }`}
                              >
                                <RadioGroupItem value="6x6_cards" id="6x6_cards" className="sr-only" />
                                <div className="w-24 h-24 bg-muted rounded-lg flex items-center justify-center">
                                  <div className="w-16 h-16 bg-primary/20 rounded border-2 border-primary/40 flex items-center justify-center">
                                    <QrCode className="w-8 h-8 text-primary" />
                                  </div>
                                </div>
                                <div className="text-center">
                                  <p className="font-semibold">6×6 QR Cards</p>
                                  <p className="text-sm text-muted-foreground">Pack of 10 cards</p>
                                  <p className="text-xs text-muted-foreground mt-1">
                                    Perfect for counters, windows & indoor displays
                                  </p>
                                </div>
                              </Label>

                              {/* 24x24 Sign Option */}
                              <Label
                                htmlFor="24x24_sign"
                                className={`flex flex-col items-center gap-3 p-6 border-2 rounded-xl cursor-pointer transition-all hover:border-primary/50 ${
                                  field.value === '24x24_sign'
                                    ? 'border-primary bg-primary/5'
                                    : 'border-border'
                                }`}
                              >
                                <RadioGroupItem value="24x24_sign" id="24x24_sign" className="sr-only" />
                                <div className="w-24 h-24 bg-muted rounded-lg flex items-center justify-center relative">
                                  <div className="w-20 h-20 bg-primary/20 rounded border-2 border-primary/40 flex items-center justify-center">
                                    <QrCode className="w-10 h-10 text-primary" />
                                  </div>
                                  {/* Stakes illustration */}
                                  <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 flex gap-4">
                                    <div className="w-1 h-6 bg-primary/40 rounded-full" />
                                    <div className="w-1 h-6 bg-primary/40 rounded-full" />
                                  </div>
                                </div>
                                <div className="text-center">
                                  <p className="font-semibold">24×24 Outdoor Sign</p>
                                  <p className="text-sm text-muted-foreground">Double stake yard sign</p>
                                  <p className="text-xs text-muted-foreground mt-1">
                                    Weather-resistant for parking lots & entrances
                                  </p>
                                </div>
                              </Label>
                            </RadioGroup>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Custom Signage Text Input */}
                    <div className="mt-6 space-y-4">
                      <FormField
                        control={form.control}
                        name="signageText"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-base font-semibold">
                              Customize Your Signage Text *
                            </FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Input
                                  {...field}
                                  maxLength={20}
                                  placeholder="Rent Kitchen"
                                  className="text-center text-lg font-bold uppercase tracking-wide"
                                  onChange={(e) => {
                                    // Convert to uppercase and allow only letters, numbers, spaces
                                    const value = e.target.value.toUpperCase().replace(/[^A-Z0-9\s]/g, '');
                                    field.onChange(value);
                                  }}
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                                  {field.value?.length || 0}/20
                                </span>
                              </div>
                            </FormControl>
                            <p className="text-xs text-muted-foreground">
                              Examples: "RENT KITCHEN", "BOOK SPACE", "RENT TRAILER"
                            </p>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Live Preview */}
                      {form.watch('signageText') && (
                        <div className="p-6 bg-primary rounded-xl text-center">
                          <p className="text-2xl md:text-3xl font-bold text-white tracking-wide uppercase">
                            {form.watch('signageText') || 'YOUR TEXT'}
                          </p>
                          <div className="mt-4 mx-auto w-24 h-24 bg-white rounded-lg flex items-center justify-center">
                            <QrCode className="w-16 h-16 text-foreground" />
                          </div>
                          <p className="mt-3 text-xs text-white/70">
                            Preview of your signage
                          </p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Contact Information */}
                <Card>
                  <CardHeader>
                    <CardTitle>Contact Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid sm:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="fullName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Full Name *</FormLabel>
                            <FormControl>
                              <Input placeholder="John Smith" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email *</FormLabel>
                            <FormControl>
                              <Input type="email" placeholder="john@example.com" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone (optional)</FormLabel>
                          <FormControl>
                            <Input type="tel" placeholder="(555) 123-4567" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>

                {/* Shipping Address */}
                <Card>
                  <CardHeader>
                    <CardTitle>Shipping Address</CardTitle>
                    <CardDescription>
                      Where should we send your free signage?
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FormField
                      control={form.control}
                      name="streetAddress"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Street Address *</FormLabel>
                          <FormControl>
                            <Input placeholder="123 Main Street" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="grid sm:grid-cols-3 gap-4">
                      <FormField
                        control={form.control}
                        name="city"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>City *</FormLabel>
                            <FormControl>
                              <Input placeholder="Houston" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="state"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>State *</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {US_STATES.map((state) => (
                                  <SelectItem key={state} value={state}>
                                    {state}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="zipCode"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>ZIP Code *</FormLabel>
                            <FormControl>
                              <Input placeholder="77001" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Submit Button */}
                <div className="flex flex-col items-center gap-4">
                  <Button
                    type="submit"
                    size="lg"
                    className="w-full sm:w-auto px-12"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        <Package className="w-4 h-4 mr-2" />
                        Request Free Signage
                      </>
                    )}
                  </Button>
                  <p className="text-sm text-muted-foreground text-center">
                    📦 Free shipping • Arrives in 7-10 business days
                  </p>
                </div>
              </form>
            </Form>
          </motion.div>
        </div>
      </main>
      <Footer />
    </>
  );
};

export default SignageRequest;
