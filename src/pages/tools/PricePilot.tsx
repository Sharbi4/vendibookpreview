import { useState } from 'react';
import { Link } from 'react-router-dom';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import SEO from '@/components/SEO';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  DollarSign, 
  Loader2, 
  ArrowLeft,
  TrendingUp,
  Sparkles,
  Target,
  Zap,
  BarChart3,
  CheckCircle,
  ArrowRight
} from 'lucide-react';
import ToolCrossLinks from '@/components/tools/ToolCrossLinks';

// JSON-LD structured data for SEO
const pageJsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "Vendi PricePilot - AI Pricing Tool for Food Trucks",
  "applicationCategory": "BusinessApplication",
  "operatingSystem": "Web",
  "offers": {
    "@type": "Offer",
    "price": "0",
    "priceCurrency": "USD"
  },
  "description": "AI-powered pricing recommendations for food trucks, trailers, and ghost kitchens. Get data-backed pricing that helps you book faster and earn more.",
  "featureList": [
    "Competitive market pricing analysis",
    "Daily, weekly, and monthly rate suggestions",
    "Sale price recommendations",
    "Pricing optimization tips"
  ]
};

interface PricingResult {
  dailyRate: number | null;
  weeklyRate: number | null;
  salePrice: number | null;
  reasoning: string;
  tips: string[];
}

const PricePilot = () => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [pricingForm, setPricingForm] = useState({
    category: '',
    location: '',
    mode: '',
    features: '',
    condition: '',
    additional: '',
  });
  const [pricingResult, setPricingResult] = useState<PricingResult | null>(null);

  const handlePricingSubmit = async () => {
    setIsLoading(true);
    try {
      const { data: response, error } = await supabase.functions.invoke('ai-tools', {
        body: { tool: 'pricing', data: pricingForm },
      });
      if (error) throw error;
      if (response.error) {
        toast({ title: 'Error', description: response.error, variant: 'destructive' });
        return;
      }
      setPricingResult(response.result);
    } catch (error) {
      console.error('AI tool error:', error);
      toast({ title: 'Error', description: 'Failed to generate pricing. Please try again.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <SEO
        title="Vendi PricePilot | AI Pricing for Food Trucks & Trailers | Vendibook"
        description="Get data-backed pricing recommendations for your food truck, trailer, or ghost kitchen. AI-powered analysis helps you book faster and earn more. Free to use."
        canonical="/tools/pricepilot"
      />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(pageJsonLd) }} />
      
      <div className="min-h-screen flex flex-col bg-background">
        <Header />

        <main className="flex-1">
          {/* Hero Section */}
          <section className="relative py-16 md:py-24 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/10 via-amber-500/5 to-orange-500/10" />
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <div className="absolute top-10 right-10 w-[400px] h-[400px] bg-gradient-to-br from-yellow-500/10 to-amber-500/8 rounded-full blur-3xl animate-pulse" />
              <div className="absolute bottom-10 left-10 w-[350px] h-[350px] bg-gradient-to-tr from-amber-500/8 to-orange-500/6 rounded-full blur-3xl" />
            </div>
            
            <div className="container relative z-10">
              <Link to="/ai-tools" className="inline-flex items-center gap-2 text-foreground/70 hover:text-foreground mb-6 transition-colors">
                <ArrowLeft className="h-4 w-4" />
                Back to Command Center
              </Link>
              
              <div className="max-w-3xl">
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center shadow-lg">
                    <DollarSign className="h-6 w-6 text-white" />
                  </div>
                  <Badge className="bg-gradient-to-r from-yellow-500 to-amber-500 text-white border-0">
                    PricePilot
                  </Badge>
                </div>
                
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-4 leading-tight">
                  Price smarter in minutes, not days.
                </h1>
                <p className="text-xl text-foreground/70 mb-8">
                  Data-backed pricing that helps you book faster and earn more. Let AI analyze your asset and market to suggest optimal rates.
                </p>
                
                <div className="flex flex-wrap gap-4">
                  <Button size="lg" className="bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-600 hover:to-amber-600" onClick={() => document.getElementById('tool-section')?.scrollIntoView({ behavior: 'smooth' })}>
                    Start Pricing
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                  <Button size="lg" variant="outline" asChild>
                    <Link to="/search">See Example Listings</Link>
                  </Button>
                </div>
              </div>
            </div>
          </section>

          {/* 3 Outcome Cards */}
          <section className="py-16 bg-muted/30">
            <div className="container">
              <div className="grid gap-6 md:grid-cols-3">
                <Card className="border-0 shadow-lg bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20">
                  <CardContent className="pt-6">
                    <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center mb-4">
                      <TrendingUp className="h-6 w-6 text-green-600" />
                    </div>
                    <h3 className="font-bold text-lg mb-2">Increase Bookings</h3>
                    <p className="text-muted-foreground">Price competitively based on market data to attract more renters and close deals faster.</p>
                  </CardContent>
                </Card>
                
                <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20">
                  <CardContent className="pt-6">
                    <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center mb-4">
                      <Target className="h-6 w-6 text-blue-600" />
                    </div>
                    <h3 className="font-bold text-lg mb-2">Maximize Earnings</h3>
                    <p className="text-muted-foreground">Don't leave money on the table. Get pricing that reflects your asset's true value.</p>
                  </CardContent>
                </Card>
                
                <Card className="border-0 shadow-lg bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-950/20 dark:to-violet-950/20">
                  <CardContent className="pt-6">
                    <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center mb-4">
                      <Zap className="h-6 w-6 text-purple-600" />
                    </div>
                    <h3 className="font-bold text-lg mb-2">Save Research Time</h3>
                    <p className="text-muted-foreground">Skip hours of competitor research. Get instant recommendations backed by market analysis.</p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </section>

          {/* How It Works */}
          <section className="py-16">
            <div className="container">
              <h2 className="text-3xl font-bold text-center mb-12">How PricePilot Works</h2>
              <div className="grid gap-8 md:grid-cols-3 max-w-4xl mx-auto">
                <div className="text-center">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl font-bold text-primary">1</span>
                  </div>
                  <h3 className="font-bold mb-2">Enter Your Details</h3>
                  <p className="text-muted-foreground text-sm">Tell us about your asset: type, location, condition, and equipment.</p>
                </div>
                <div className="text-center">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl font-bold text-primary">2</span>
                  </div>
                  <h3 className="font-bold mb-2">AI Analyzes Market</h3>
                  <p className="text-muted-foreground text-sm">Our AI compares your asset to market data and generates optimal pricing.</p>
                </div>
                <div className="text-center">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl font-bold text-primary">3</span>
                  </div>
                  <h3 className="font-bold mb-2">Apply to Your Listing</h3>
                  <p className="text-muted-foreground text-sm">Use the suggested rates directly on your Vendibook listing.</p>
                </div>
              </div>
            </div>
          </section>

          {/* The Tool */}
          <section id="tool-section" className="py-16 bg-muted/30">
            <div className="container max-w-5xl">
              <div className="grid gap-6 lg:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <DollarSign className="h-5 w-5 text-primary" />
                      PricePilot
                    </CardTitle>
                    <CardDescription>Enter your asset details to get pricing recommendations.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Category *</Label>
                        <Select value={pricingForm.category} onValueChange={(v) => setPricingForm({ ...pricingForm, category: v })}>
                          <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="food_truck">Food Truck</SelectItem>
                            <SelectItem value="food_trailer">Food Trailer</SelectItem>
                            <SelectItem value="ghost_kitchen">Ghost Kitchen</SelectItem>
                            <SelectItem value="vendor_lot">Vendor Lot</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Mode *</Label>
                        <Select value={pricingForm.mode} onValueChange={(v) => setPricingForm({ ...pricingForm, mode: v })}>
                          <SelectTrigger><SelectValue placeholder="Rent or Sale" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="rent">For Rent</SelectItem>
                            <SelectItem value="sale">For Sale</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Location</Label>
                      <Input placeholder="City, State" value={pricingForm.location} onChange={(e) => setPricingForm({ ...pricingForm, location: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Condition</Label>
                      <Select value={pricingForm.condition} onValueChange={(v) => setPricingForm({ ...pricingForm, condition: v })}>
                        <SelectTrigger><SelectValue placeholder="Select condition" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="new">New / Like New</SelectItem>
                          <SelectItem value="excellent">Excellent</SelectItem>
                          <SelectItem value="good">Good</SelectItem>
                          <SelectItem value="fair">Fair</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Equipment & Features</Label>
                      <Textarea placeholder="List key equipment: fryer, griddle, refrigeration, generator, etc." value={pricingForm.features} onChange={(e) => setPricingForm({ ...pricingForm, features: e.target.value })} rows={3} />
                    </div>
                    <div className="space-y-2">
                      <Label>Additional Details (Optional)</Label>
                      <Textarea placeholder="Year, brand, recent upgrades, unique features..." value={pricingForm.additional} onChange={(e) => setPricingForm({ ...pricingForm, additional: e.target.value })} rows={2} />
                    </div>
                    <Button onClick={handlePricingSubmit} disabled={isLoading || !pricingForm.category || !pricingForm.mode} className="w-full">
                      {isLoading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Generating...</> : <><Sparkles className="h-4 w-4 mr-2" />Generate Pricing</>}
                    </Button>
                  </CardContent>
                </Card>

                {/* Results */}
                <Card className={pricingResult ? '' : 'flex items-center justify-center'}>
                  {pricingResult ? (
                    <>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <BarChart3 className="h-5 w-5 text-green-500" />
                          Suggested Pricing
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid gap-3">
                          {pricingResult.dailyRate && (
                            <div className="p-4 bg-primary/5 rounded-lg">
                              <p className="text-sm text-muted-foreground">Daily Rate</p>
                              <p className="text-2xl font-bold text-primary">${pricingResult.dailyRate.toLocaleString()}/day</p>
                            </div>
                          )}
                          {pricingResult.weeklyRate && (
                            <div className="p-4 bg-primary/5 rounded-lg">
                              <p className="text-sm text-muted-foreground">Weekly Rate</p>
                              <p className="text-2xl font-bold text-primary">${pricingResult.weeklyRate.toLocaleString()}/week</p>
                            </div>
                          )}
                          {pricingResult.salePrice && (
                            <div className="p-4 bg-green-500/10 rounded-lg">
                              <p className="text-sm text-muted-foreground">Sale Price</p>
                              <p className="text-2xl font-bold text-green-600">${pricingResult.salePrice.toLocaleString()}</p>
                            </div>
                          )}
                        </div>
                        <div className="pt-4 border-t">
                          <p className="text-sm text-muted-foreground mb-3">{pricingResult.reasoning}</p>
                          {pricingResult.tips && pricingResult.tips.length > 0 && (
                            <div className="space-y-2">
                              <p className="text-sm font-medium">Tips to charge more:</p>
                              <ul className="text-sm text-muted-foreground space-y-1">
                                {pricingResult.tips.map((tip, i) => (
                                  <li key={i} className="flex items-start gap-2">
                                    <CheckCircle className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                                    {tip}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                        <Button className="w-full" variant="outline" asChild>
                          <Link to="/create-listing">Apply to New Listing</Link>
                        </Button>
                      </CardContent>
                    </>
                  ) : (
                    <div className="text-center p-8 text-muted-foreground">
                      <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-20" />
                      <p>Fill in the details to get pricing suggestions</p>
                    </div>
                  )}
                </Card>
              </div>
            </div>
          </section>

          {/* Trust & FAQ */}
          <section className="py-16">
            <div className="container max-w-3xl">
              <div className="text-center mb-8">
                <Badge variant="outline" className="mb-4">Your data is private</Badge>
                <p className="text-sm text-muted-foreground">We don't store your asset details. All analysis happens in real-time.</p>
              </div>
              
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="q1">
                  <AccordionTrigger>How accurate is the pricing?</AccordionTrigger>
                  <AccordionContent>Our AI analyzes market trends and comparable listings to provide competitive pricing. Results are suggestions—you should always consider local market conditions.</AccordionContent>
                </AccordionItem>
                <AccordionItem value="q2">
                  <AccordionTrigger>Is PricePilot free?</AccordionTrigger>
                  <AccordionContent>Yes, PricePilot is completely free to use. Generate as many pricing suggestions as you need.</AccordionContent>
                </AccordionItem>
                <AccordionItem value="q3">
                  <AccordionTrigger>Can I use this for any location?</AccordionTrigger>
                  <AccordionContent>Yes, PricePilot works for any U.S. location. Enter your city and state for the most accurate local pricing recommendations.</AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
          </section>

          {/* Cross-Links */}
          <ToolCrossLinks 
            currentTool="pricepilot" 
            title="Maximize Your Success"
            subtitle="Got your pricing? Write compelling copy, research your market, or check permit requirements."
          />

          {/* Final CTA */}
          <section className="py-20 bg-gradient-to-r from-yellow-500/10 via-amber-500/10 to-orange-500/10">
            <div className="container text-center">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to price your listing?</h2>
              <p className="text-lg text-muted-foreground mb-8 max-w-xl mx-auto">Get started with PricePilot now, or create a listing and we'll help you price it right.</p>
              <div className="flex flex-wrap gap-4 justify-center">
                <Button size="lg" className="bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-600 hover:to-amber-600" onClick={() => document.getElementById('tool-section')?.scrollIntoView({ behavior: 'smooth' })}>
                  Start Pricing Now
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <Link to="/create-listing">Create a Listing</Link>
                </Button>
              </div>
            </div>
          </section>
        </main>

        <Footer />
      </div>
    </>
  );
};

export default PricePilot;
