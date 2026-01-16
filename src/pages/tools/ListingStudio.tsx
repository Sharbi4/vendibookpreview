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
  FileText, 
  Loader2, 
  ArrowLeft,
  Sparkles,
  ArrowRight,
  Copy,
  Check,
  TrendingUp,
  Zap,
  Target
} from 'lucide-react';
import ToolCrossLinks from '@/components/tools/ToolCrossLinks';

const pageJsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "Vendi Listing Studio - AI Listing Generator for Food Trucks",
  "applicationCategory": "BusinessApplication",
  "operatingSystem": "Web",
  "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" },
  "description": "Turn specs into high-converting listings in minutes. AI-powered title, description, and highlights generator for food trucks and trailers.",
  "featureList": ["AI-generated titles", "Compelling descriptions", "Key highlights", "SEO optimization"]
};

interface DescriptionResult {
  description: string;
  headline: string;
  highlights: string[];
}

const ListingStudio = () => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [descriptionForm, setDescriptionForm] = useState({
    title: '', category: '', features: '', location: '', condition: '', unique: '',
  });
  const [descriptionResult, setDescriptionResult] = useState<DescriptionResult | null>(null);

  const handleSubmit = async () => {
    setIsLoading(true);
    try {
      const { data: response, error } = await supabase.functions.invoke('ai-tools', {
        body: { tool: 'description', data: descriptionForm },
      });
      if (error) throw error;
      if (response.error) { toast({ title: 'Error', description: response.error, variant: 'destructive' }); return; }
      setDescriptionResult(response.result);
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to generate description. Please try again.', variant: 'destructive' });
    } finally { setIsLoading(false); }
  };

  const copyToClipboard = async (text: string, field: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedField(field);
    toast({ title: 'Copied to clipboard!' });
    setTimeout(() => setCopiedField(null), 2000);
  };

  return (
    <>
      <SEO
        title="Vendi Listing Studio | AI Listing Generator | Vendibook"
        description="Turn specs into high-converting food truck listings in minutes. AI-powered title, description, and highlights generator. Free to use."
        canonical="/tools/listing-studio"
      />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(pageJsonLd) }} />
      
      <div className="min-h-screen flex flex-col bg-background">
        <Header />

        <main className="flex-1">
          {/* Hero */}
          <section className="relative py-16 md:py-24 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-red-500/10 via-orange-500/5 to-amber-500/10" />
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <div className="absolute top-10 right-10 w-[400px] h-[400px] bg-gradient-to-br from-red-500/10 to-orange-500/8 rounded-full blur-3xl animate-pulse" />
            </div>
            
            <div className="container relative z-10">
              <Link to="/ai-tools" className="inline-flex items-center gap-2 text-foreground/70 hover:text-foreground mb-6 transition-colors">
                <ArrowLeft className="h-4 w-4" />Back to Command Center
              </Link>
              
              <div className="max-w-3xl">
                <Badge className="mb-4 bg-gradient-to-r from-red-500 to-orange-500 text-white border-0">
                  <FileText className="h-3 w-3 mr-1" />Listing Studio
                </Badge>
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-4 leading-tight">
                  Write listings that sell, in minutes.
                </h1>
                <p className="text-xl text-foreground/70 mb-8">
                  Turn specs into a high-converting listing in minutes. AI generates compelling titles, descriptions, and highlights.
                </p>
                <div className="flex flex-wrap gap-4">
                  <Button size="lg" className="bg-gradient-to-r from-red-500 to-orange-500" onClick={() => document.getElementById('tool-section')?.scrollIntoView({ behavior: 'smooth' })}>
                    Write My Listing<ArrowRight className="h-4 w-4 ml-2" />
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
                    <h3 className="font-bold text-lg mb-2">Increase Conversions</h3>
                    <p className="text-muted-foreground">Compelling copy that turns browsers into bookers.</p>
                  </CardContent>
                </Card>
                <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20">
                  <CardContent className="pt-6">
                    <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center mb-4">
                      <Zap className="h-6 w-6 text-blue-600" />
                    </div>
                    <h3 className="font-bold text-lg mb-2">Save Hours of Writing</h3>
                    <p className="text-muted-foreground">Skip writer's block. Get professional copy instantly.</p>
                  </CardContent>
                </Card>
                <Card className="border-0 shadow-lg bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-950/20 dark:to-violet-950/20">
                  <CardContent className="pt-6">
                    <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center mb-4">
                      <Target className="h-6 w-6 text-purple-600" />
                    </div>
                    <h3 className="font-bold text-lg mb-2">SEO Optimized</h3>
                    <p className="text-muted-foreground">Keywords and phrases that help your listing get found.</p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </section>

          {/* How It Works */}
          <section className="py-16">
            <div className="container">
              <h2 className="text-3xl font-bold text-center mb-12">How Listing Studio Works</h2>
              <div className="grid gap-8 md:grid-cols-3 max-w-4xl mx-auto">
                <div className="text-center">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4"><span className="text-2xl font-bold text-primary">1</span></div>
                  <h3 className="font-bold mb-2">Enter Your Specs</h3>
                  <p className="text-muted-foreground text-sm">Tell us about your asset: title, features, condition, and what makes it special.</p>
                </div>
                <div className="text-center">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4"><span className="text-2xl font-bold text-primary">2</span></div>
                  <h3 className="font-bold mb-2">AI Writes Your Listing</h3>
                  <p className="text-muted-foreground text-sm">Get a compelling headline, description, and key highlights.</p>
                </div>
                <div className="text-center">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4"><span className="text-2xl font-bold text-primary">3</span></div>
                  <h3 className="font-bold mb-2">Copy & Publish</h3>
                  <p className="text-muted-foreground text-sm">Use the generated copy directly on your Vendibook listing.</p>
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
                    <CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5 text-primary" />Listing Studio</CardTitle>
                    <CardDescription>Enter your asset details to generate compelling listing copy.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>Listing Title *</Label>
                      <Input placeholder="e.g., 2019 Custom Food Truck with Full Kitchen" value={descriptionForm.title} onChange={(e) => setDescriptionForm({ ...descriptionForm, title: e.target.value })} />
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Category</Label>
                        <Select value={descriptionForm.category} onValueChange={(v) => setDescriptionForm({ ...descriptionForm, category: v })}>
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
                        <Label>Condition</Label>
                        <Select value={descriptionForm.condition} onValueChange={(v) => setDescriptionForm({ ...descriptionForm, condition: v })}>
                          <SelectTrigger><SelectValue placeholder="Select condition" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="new">New / Like New</SelectItem>
                            <SelectItem value="excellent">Excellent</SelectItem>
                            <SelectItem value="good">Good</SelectItem>
                            <SelectItem value="fair">Fair</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Location</Label>
                      <Input placeholder="City, State" value={descriptionForm.location} onChange={(e) => setDescriptionForm({ ...descriptionForm, location: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Key Features & Equipment</Label>
                      <Textarea placeholder="List equipment, dimensions, capacity, amenities..." value={descriptionForm.features} onChange={(e) => setDescriptionForm({ ...descriptionForm, features: e.target.value })} rows={3} />
                    </div>
                    <div className="space-y-2">
                      <Label>What Makes It Special?</Label>
                      <Textarea placeholder="Recent upgrades, unique features, success stories..." value={descriptionForm.unique} onChange={(e) => setDescriptionForm({ ...descriptionForm, unique: e.target.value })} rows={2} />
                    </div>
                    <Button onClick={handleSubmit} disabled={isLoading || !descriptionForm.title} className="w-full">
                      {isLoading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Generating...</> : <><Sparkles className="h-4 w-4 mr-2" />Generate Listing Copy</>}
                    </Button>
                  </CardContent>
                </Card>

                {/* Results */}
                <Card className={descriptionResult ? '' : 'flex items-center justify-center'}>
                  {descriptionResult ? (
                    <>
                      <CardHeader>
                        <CardTitle>Your Listing Copy</CardTitle>
                        <CardDescription>Copy and use this on your listing</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Label>Headline</Label>
                            <Button size="sm" variant="ghost" onClick={() => copyToClipboard(descriptionResult.headline, 'headline')}>
                              {copiedField === 'headline' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                            </Button>
                          </div>
                          <div className="p-3 bg-muted rounded-lg"><p className="font-semibold">{descriptionResult.headline}</p></div>
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Label>Description</Label>
                            <Button size="sm" variant="ghost" onClick={() => copyToClipboard(descriptionResult.description, 'description')}>
                              {copiedField === 'description' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                            </Button>
                          </div>
                          <div className="p-3 bg-muted rounded-lg"><p className="text-sm whitespace-pre-line">{descriptionResult.description}</p></div>
                        </div>
                        <div className="space-y-2">
                          <Label>Key Highlights</Label>
                          <div className="flex flex-wrap gap-2">
                            {descriptionResult.highlights.map((h, i) => <Badge key={i} variant="secondary">{h}</Badge>)}
                          </div>
                        </div>
                        <Button className="w-full" variant="outline" asChild>
                          <Link to="/create-listing">Create Listing Now</Link>
                        </Button>
                      </CardContent>
                    </>
                  ) : (
                    <div className="text-center p-8 text-muted-foreground">
                      <FileText className="h-12 w-12 mx-auto mb-4 opacity-20" />
                      <p>Fill in the details to generate listing copy</p>
                    </div>
                  )}
                </Card>
              </div>
            </div>
          </section>

          {/* FAQ */}
          <section className="py-16">
            <div className="container max-w-3xl">
              <Accordion type="single" collapsible>
                <AccordionItem value="q1">
                  <AccordionTrigger>Can I edit the generated copy?</AccordionTrigger>
                  <AccordionContent>Absolutely! The generated copy is a starting point. Edit it to match your voice and add any details we missed.</AccordionContent>
                </AccordionItem>
                <AccordionItem value="q2">
                  <AccordionTrigger>Is this optimized for search?</AccordionTrigger>
                  <AccordionContent>Yes, our AI includes relevant keywords and phrases that help your listing rank better in search results.</AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
          </section>

          {/* Cross-Links */}
          <ToolCrossLinks 
            currentTool="listing-studio" 
            title="Perfect Your Listing"
            subtitle="Got your copy ready? Set competitive pricing, research your market, or explore new concepts."
          />

          {/* Final CTA */}
          <section className="py-20 bg-gradient-to-r from-red-500/10 via-orange-500/10 to-amber-500/10">
            <div className="container text-center">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to write your listing?</h2>
              <p className="text-lg text-muted-foreground mb-8 max-w-xl mx-auto">Generate compelling copy that converts browsers into bookers.</p>
              <div className="flex flex-wrap gap-4 justify-center">
                <Button size="lg" className="bg-gradient-to-r from-red-500 to-orange-500" onClick={() => document.getElementById('tool-section')?.scrollIntoView({ behavior: 'smooth' })}>
                  Write My Listing
                </Button>
                <Button size="lg" variant="outline" asChild><Link to="/create-listing">Create a Listing</Link></Button>
              </div>
            </div>
          </section>
        </main>

        <Footer />
      </div>
    </>
  );
};

export default ListingStudio;
