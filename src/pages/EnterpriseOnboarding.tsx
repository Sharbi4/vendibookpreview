import { useState } from 'react';
import { Link } from 'react-router-dom';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import SEO from '@/components/SEO';
import { usePageTracking } from '@/hooks/usePageTracking';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  Building2,
  Users,
  MapPin,
  Phone,
  Mail,
  CheckCircle2,
  ArrowRight,
  Loader2,
  Store,
  Calendar,
  DollarSign,
  Shield,
  Headphones,
  Sparkles,
} from 'lucide-react';

interface FormData {
  // Contact Info
  contactName: string;
  companyName: string;
  email: string;
  phone: string;
  jobTitle: string;
  
  // Business Details
  numberOfLocations: string;
  locationStates: string;
  kitchenTypes: string[];
  totalSquareFootage: string;
  
  // Listing Preferences
  listingMode: string[];
  dailyRateRange: string;
  monthlyRateRange: string;
  availabilityStart: string;
  
  // Additional Info
  currentlyListed: string;
  primaryGoal: string;
  additionalNotes: string;
  
  // Consent
  agreeToTerms: boolean;
  wantsDemoCall: boolean;
}

const initialFormData: FormData = {
  contactName: '',
  companyName: '',
  email: '',
  phone: '',
  jobTitle: '',
  numberOfLocations: '',
  locationStates: '',
  kitchenTypes: [],
  totalSquareFootage: '',
  listingMode: [],
  dailyRateRange: '',
  monthlyRateRange: '',
  availabilityStart: '',
  currentlyListed: '',
  primaryGoal: '',
  additionalNotes: '',
  agreeToTerms: false,
  wantsDemoCall: false,
};

const kitchenTypeOptions = [
  { id: 'commercial', label: 'Commercial Kitchen' },
  { id: 'ghost_kitchen', label: 'Ghost Kitchen / Cloud Kitchen' },
  { id: 'commissary', label: 'Commissary Kitchen' },
  { id: 'shared', label: 'Shared Kitchen Space' },
  { id: 'production', label: 'Production Facility' },
  { id: 'catering', label: 'Catering Kitchen' },
];

const EnterpriseOnboarding = () => {
  usePageTracking();
  const { toast } = useToast();
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleInputChange = (field: keyof FormData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleKitchenTypeToggle = (typeId: string) => {
    setFormData(prev => ({
      ...prev,
      kitchenTypes: prev.kitchenTypes.includes(typeId)
        ? prev.kitchenTypes.filter(t => t !== typeId)
        : [...prev.kitchenTypes, typeId],
    }));
  };

  const handleListingModeToggle = (mode: string) => {
    setFormData(prev => ({
      ...prev,
      listingMode: prev.listingMode.includes(mode)
        ? prev.listingMode.filter(m => m !== mode)
        : [...prev.listingMode, mode],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.contactName || !formData.email || !formData.companyName) {
      toast({
        title: 'Missing required fields',
        description: 'Please fill in your name, email, and company name.',
        variant: 'destructive',
      });
      return;
    }

    if (!formData.agreeToTerms) {
      toast({
        title: 'Terms required',
        description: 'Please agree to the terms to continue.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Build description for Zendesk ticket
      const description = `
ENTERPRISE KITCHEN LISTING REQUEST

=== CONTACT INFORMATION ===
Name: ${formData.contactName}
Company: ${formData.companyName}
Email: ${formData.email}
Phone: ${formData.phone || 'Not provided'}
Job Title: ${formData.jobTitle || 'Not provided'}

=== BUSINESS DETAILS ===
Number of Locations: ${formData.numberOfLocations || 'Not specified'}
States/Regions: ${formData.locationStates || 'Not specified'}
Kitchen Types: ${formData.kitchenTypes.length > 0 ? formData.kitchenTypes.join(', ') : 'Not specified'}
Total Square Footage: ${formData.totalSquareFootage || 'Not specified'}

=== LISTING PREFERENCES ===
Listing Mode: ${formData.listingMode.length > 0 ? formData.listingMode.join(', ') : 'Not specified'}
Daily Rate Range: ${formData.dailyRateRange || 'Not specified'}
Monthly Rate Range: ${formData.monthlyRateRange || 'Not specified'}
Availability Start: ${formData.availabilityStart || 'Not specified'}

=== ADDITIONAL INFORMATION ===
Currently Listed Elsewhere: ${formData.currentlyListed || 'Not specified'}
Primary Goal: ${formData.primaryGoal || 'Not specified'}
Additional Notes: ${formData.additionalNotes || 'None'}

=== PREFERENCES ===
Wants Demo Call: ${formData.wantsDemoCall ? 'Yes' : 'No'}
      `.trim();

      const { data, error } = await supabase.functions.invoke('create-zendesk-ticket', {
        body: {
          requester_name: formData.contactName,
          requester_email: formData.email,
          requester_phone: formData.phone || undefined,
          subject: `Enterprise Listing Request: ${formData.companyName} (${formData.numberOfLocations || 'Multiple'} locations)`,
          description,
          priority: 'high',
          type: 'task',
          tags: ['enterprise', 'multi-kitchen', 'listing-request', 'high-value'],
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setIsSubmitted(true);
      toast({
        title: 'Request submitted!',
        description: 'Our enterprise team will contact you within 24 hours.',
      });
    } catch (error) {
      console.error('Enterprise form submission error:', error);
      toast({
        title: 'Submission failed',
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
          title="Thank You | Enterprise Onboarding | Vendibook"
          description="Your enterprise listing request has been submitted."
        />
        <Header />
        <main className="min-h-screen bg-gradient-to-b from-background to-muted/30 py-16 px-4">
          <div className="container mx-auto max-w-2xl text-center">
            <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="h-10 w-10 text-green-600" />
            </div>
            <h1 className="text-3xl font-bold mb-4">Request Submitted!</h1>
            <p className="text-lg text-muted-foreground mb-8">
              Thank you for your interest in listing with Vendibook. Our enterprise team will review your information and contact you within 24 hours.
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <Button asChild>
                <Link to="/">Return Home</Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/tools">Explore Our Tools</Link>
              </Button>
            </div>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <SEO 
        title="Enterprise Onboarding | Multi-Kitchen Listings | Vendibook"
        description="List multiple commercial kitchens on Vendibook. Dedicated support for enterprise clients with 2+ locations."
      />
      <Header />
      
      <main className="min-h-screen bg-gradient-to-b from-background to-muted/30">
        {/* Hero Section */}
        <section className="relative py-16 px-4 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/10" />
          <div className="container mx-auto max-w-6xl relative">
            <div className="text-center mb-12">
              <Badge variant="secondary" className="mb-4">
                <Building2 className="h-4 w-4 mr-1" />
                Enterprise Program
              </Badge>
              <h1 className="text-4xl md:text-5xl font-bold mb-4">
                Multi-Kitchen Onboarding
              </h1>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Streamlined listing process for commercial kitchen operators with multiple locations. Get dedicated support and priority placement.
              </p>
            </div>

            {/* Benefits */}
            <div className="grid md:grid-cols-4 gap-4 mb-12">
              {[
                { icon: Users, label: 'Dedicated Account Manager' },
                { icon: Sparkles, label: 'Priority Listing Review' },
                { icon: DollarSign, label: 'Volume Pricing Available' },
                { icon: Headphones, label: '24/7 Enterprise Support' },
              ].map(({ icon: Icon, label }) => (
                <Card key={label} className="text-center p-4 bg-card/50 backdrop-blur-sm">
                  <Icon className="h-8 w-8 mx-auto mb-2 text-primary" />
                  <p className="text-sm font-medium">{label}</p>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Form Section */}
        <section className="py-8 px-4 pb-16">
          <div className="container mx-auto max-w-3xl">
            <Card className="shadow-xl">
              <CardHeader>
                <CardTitle className="text-2xl">Enterprise Listing Application</CardTitle>
                <CardDescription>
                  Fill out the form below and our team will help you get all your locations listed quickly.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-8">
                  {/* Contact Information */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <Mail className="h-5 w-5 text-primary" />
                      Contact Information
                    </h3>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="contactName">Full Name *</Label>
                        <Input
                          id="contactName"
                          value={formData.contactName}
                          onChange={(e) => handleInputChange('contactName', e.target.value)}
                          placeholder="John Smith"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="companyName">Company Name *</Label>
                        <Input
                          id="companyName"
                          value={formData.companyName}
                          onChange={(e) => handleInputChange('companyName', e.target.value)}
                          placeholder="Kitchen Co."
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email">Email Address *</Label>
                        <Input
                          id="email"
                          type="email"
                          value={formData.email}
                          onChange={(e) => handleInputChange('email', e.target.value)}
                          placeholder="john@company.com"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="phone">Phone Number</Label>
                        <Input
                          id="phone"
                          type="tel"
                          value={formData.phone}
                          onChange={(e) => handleInputChange('phone', e.target.value)}
                          placeholder="(555) 123-4567"
                        />
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="jobTitle">Job Title</Label>
                        <Input
                          id="jobTitle"
                          value={formData.jobTitle}
                          onChange={(e) => handleInputChange('jobTitle', e.target.value)}
                          placeholder="Director of Operations"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Business Details */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <Building2 className="h-5 w-5 text-primary" />
                      Business Details
                    </h3>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="numberOfLocations">Number of Locations</Label>
                        <Select
                          value={formData.numberOfLocations}
                          onValueChange={(value) => handleInputChange('numberOfLocations', value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select range" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="2-5">2-5 locations</SelectItem>
                            <SelectItem value="6-10">6-10 locations</SelectItem>
                            <SelectItem value="11-25">11-25 locations</SelectItem>
                            <SelectItem value="26-50">26-50 locations</SelectItem>
                            <SelectItem value="50+">50+ locations</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="totalSquareFootage">Total Square Footage (all locations)</Label>
                        <Select
                          value={formData.totalSquareFootage}
                          onValueChange={(value) => handleInputChange('totalSquareFootage', value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select range" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="under-10k">Under 10,000 sq ft</SelectItem>
                            <SelectItem value="10k-25k">10,000 - 25,000 sq ft</SelectItem>
                            <SelectItem value="25k-50k">25,000 - 50,000 sq ft</SelectItem>
                            <SelectItem value="50k-100k">50,000 - 100,000 sq ft</SelectItem>
                            <SelectItem value="100k+">100,000+ sq ft</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="locationStates">States/Regions Where Located</Label>
                        <Input
                          id="locationStates"
                          value={formData.locationStates}
                          onChange={(e) => handleInputChange('locationStates', e.target.value)}
                          placeholder="e.g., California, Texas, Florida"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Kitchen Types (select all that apply)</Label>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {kitchenTypeOptions.map(({ id, label }) => (
                          <div
                            key={id}
                            className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-colors ${
                              formData.kitchenTypes.includes(id)
                                ? 'bg-primary/10 border-primary'
                                : 'bg-card hover:bg-muted/50'
                            }`}
                            onClick={() => handleKitchenTypeToggle(id)}
                          >
                            <Checkbox
                              checked={formData.kitchenTypes.includes(id)}
                              onCheckedChange={() => handleKitchenTypeToggle(id)}
                            />
                            <span className="text-sm">{label}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Listing Preferences */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <Store className="h-5 w-5 text-primary" />
                      Listing Preferences
                    </h3>
                    
                    <div className="space-y-2">
                      <Label>How would you like to list? (select all that apply)</Label>
                      <div className="flex flex-wrap gap-3">
                        {[
                          { id: 'hourly', label: 'Hourly Rentals' },
                          { id: 'daily', label: 'Daily Rentals' },
                          { id: 'weekly', label: 'Weekly Rentals' },
                          { id: 'monthly', label: 'Monthly Rentals' },
                          { id: 'membership', label: 'Memberships' },
                        ].map(({ id, label }) => (
                          <div
                            key={id}
                            className={`flex items-center gap-2 px-4 py-2 rounded-full border cursor-pointer transition-colors ${
                              formData.listingMode.includes(id)
                                ? 'bg-primary text-primary-foreground border-primary'
                                : 'bg-card hover:bg-muted/50'
                            }`}
                            onClick={() => handleListingModeToggle(id)}
                          >
                            <span className="text-sm font-medium">{label}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="dailyRateRange">Typical Daily Rate Range</Label>
                        <Select
                          value={formData.dailyRateRange}
                          onValueChange={(value) => handleInputChange('dailyRateRange', value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select range" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="under-200">Under $200/day</SelectItem>
                            <SelectItem value="200-500">$200 - $500/day</SelectItem>
                            <SelectItem value="500-1000">$500 - $1,000/day</SelectItem>
                            <SelectItem value="1000-2000">$1,000 - $2,000/day</SelectItem>
                            <SelectItem value="2000+">$2,000+/day</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="monthlyRateRange">Typical Monthly Rate Range</Label>
                        <Select
                          value={formData.monthlyRateRange}
                          onValueChange={(value) => handleInputChange('monthlyRateRange', value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select range" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="under-2k">Under $2,000/month</SelectItem>
                            <SelectItem value="2k-5k">$2,000 - $5,000/month</SelectItem>
                            <SelectItem value="5k-10k">$5,000 - $10,000/month</SelectItem>
                            <SelectItem value="10k-20k">$10,000 - $20,000/month</SelectItem>
                            <SelectItem value="20k+">$20,000+/month</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="availabilityStart">When can you start listing?</Label>
                        <Select
                          value={formData.availabilityStart}
                          onValueChange={(value) => handleInputChange('availabilityStart', value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select timeline" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="immediately">Immediately</SelectItem>
                            <SelectItem value="1-2-weeks">1-2 weeks</SelectItem>
                            <SelectItem value="1-month">Within 1 month</SelectItem>
                            <SelectItem value="2-3-months">2-3 months</SelectItem>
                            <SelectItem value="exploring">Just exploring</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="currentlyListed">Currently listed elsewhere?</Label>
                        <Select
                          value={formData.currentlyListed}
                          onValueChange={(value) => handleInputChange('currentlyListed', value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select option" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="no">No, not listed anywhere</SelectItem>
                            <SelectItem value="own-website">Yes, on our own website</SelectItem>
                            <SelectItem value="other-platforms">Yes, on other platforms</SelectItem>
                            <SelectItem value="both">Yes, website + other platforms</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  {/* Additional Information */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <Calendar className="h-5 w-5 text-primary" />
                      Additional Information
                    </h3>
                    <div className="space-y-2">
                      <Label htmlFor="primaryGoal">What's your primary goal?</Label>
                      <Select
                        value={formData.primaryGoal}
                        onValueChange={(value) => handleInputChange('primaryGoal', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select your main objective" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="maximize-occupancy">Maximize occupancy</SelectItem>
                          <SelectItem value="fill-off-hours">Fill off-peak hours</SelectItem>
                          <SelectItem value="new-revenue">Create new revenue stream</SelectItem>
                          <SelectItem value="expand-reach">Expand market reach</SelectItem>
                          <SelectItem value="streamline-booking">Streamline booking process</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="additionalNotes">Additional Notes or Questions</Label>
                      <Textarea
                        id="additionalNotes"
                        value={formData.additionalNotes}
                        onChange={(e) => handleInputChange('additionalNotes', e.target.value)}
                        placeholder="Tell us anything else we should know about your kitchens or any questions you have..."
                        rows={4}
                      />
                    </div>
                  </div>

                  {/* Consent */}
                  <div className="space-y-4 border-t pt-6">
                    <div className="flex items-start gap-3">
                      <Checkbox
                        id="wantsDemoCall"
                        checked={formData.wantsDemoCall}
                        onCheckedChange={(checked) => handleInputChange('wantsDemoCall', checked as boolean)}
                      />
                      <Label htmlFor="wantsDemoCall" className="text-sm leading-relaxed cursor-pointer">
                        I'd like to schedule a demo call with the enterprise team
                      </Label>
                    </div>
                    <div className="flex items-start gap-3">
                      <Checkbox
                        id="agreeToTerms"
                        checked={formData.agreeToTerms}
                        onCheckedChange={(checked) => handleInputChange('agreeToTerms', checked as boolean)}
                        required
                      />
                      <Label htmlFor="agreeToTerms" className="text-sm leading-relaxed cursor-pointer">
                        I agree to the{' '}
                        <Link to="/terms" className="text-primary underline">Terms of Service</Link>
                        {' '}and{' '}
                        <Link to="/privacy" className="text-primary underline">Privacy Policy</Link>
                        {' '}*
                      </Label>
                    </div>
                  </div>

                  {/* Submit */}
                  <Button
                    type="submit"
                    size="lg"
                    className="w-full"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        Submit Application
                        <ArrowRight className="h-5 w-5 ml-2" />
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
};

export default EnterpriseOnboarding;
