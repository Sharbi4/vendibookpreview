import { useState } from 'react';
import { Link } from 'react-router-dom';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import SEO from '@/components/SEO';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  Lightbulb, 
  Loader2, 
  ArrowLeft,
  Sparkles,
  ArrowRight,
  TrendingUp,
  Zap,
  DollarSign
} from 'lucide-react';
import ToolCrossLinks from '@/components/tools/ToolCrossLinks';

const pageJsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "Vendi Concept Lab - Food Truck Business Idea Generator",
  "applicationCategory": "BusinessApplication",
  "operatingSystem": "Web",
  "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" },
  "description": "Generate sellable food truck concepts designed for your market and margins. AI-powered business idea generator.",
  "featureList": ["10 unique concept ideas", "Target market analysis", "Menu suggestions", "Startup cost estimates"]
};

interface BusinessIdea {
  name: string; concept: string; targetMarket: string;
  menuHighlights: string[]; estimatedStartup: string; uniqueAngle: string;
}

interface BusinessIdeaResult { ideas: BusinessIdea[] }

const ConceptLab = () => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [ideaForm, setIdeaForm] = useState({
    cuisine: '', locationType: '', budget: '', experience: '', interests: '',
  });
  const [ideaResult, setIdeaResult] = useState<BusinessIdeaResult | null>(null);

  const handleSubmit = async () => {
    setIsLoading(true);
    try {
      const { data: response, error } = await supabase.functions.invoke('ai-tools', {
        body: { tool: 'business-idea', data: ideaForm },
      });
      if (error) throw error;
      if (response.error) { toast({ title: 'Error', description: response.error, variant: 'destructive' }); return; }
      setIdeaResult(response.result);
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to generate ideas. Please try again.', variant: 'destructive' });
    } finally { setIsLoading(false); }
  };

  return (
    <>
      <SEO
        title="Vendi Concept Lab | Food Truck Business Idea Generator | Vendibook"
        description="Generate sellable food truck concepts designed for your market and margins. Get 10 unique business ideas with menu suggestions and startup estimates."
        canonical="/tools/concept-lab"
      />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(pageJsonLd) }} />
      
      <div className="min-h-screen flex flex-col bg-background">
        <Header />

        <main className="flex-1">
          {/* Hero */}
          <section className="relative py-16 md:py-24 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 via-amber-500/5 to-yellow-500/10" />
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <div className="absolute top-10 right-10 w-[400px] h-[400px] bg-gradient-to-br from-orange-500/10 to-amber-500/8 rounded-full blur-3xl animate-pulse" />
            </div>
            
            <div className="container relative z-10">
              <Link to="/ai-tools" className="inline-flex items-center gap-2 text-foreground/70 hover:text-foreground mb-6 transition-colors">
                <ArrowLeft className="h-4 w-4" />Back to Command Center
              </Link>
              
              <div className="max-w-3xl">
                <Badge className="mb-4 bg-gradient-to-r from-orange-500 to-amber-500 text-white border-0">
                  <Lightbulb className="h-3 w-3 mr-1" />Concept Lab
                </Badge>
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-4 leading-tight">
                  Discover your next big idea.
                </h1>
                <p className="text-xl text-foreground/70 mb-8">
                  Generate sellable concepts designed for your market and margins. Get 10 unique business ideas tailored to your preferences.
                </p>
                <div className="flex flex-wrap gap-4">
                  <Button size="lg" className="bg-gradient-to-r from-orange-500 to-amber-500" onClick={() => document.getElementById('tool-section')?.scrollIntoView({ behavior: 'smooth' })}>
                    Generate Ideas<ArrowRight className="h-4 w-4 ml-2" />
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
                    <h3 className="font-bold text-lg mb-2">Market-Validated Ideas</h3>
                    <p className="text-muted-foreground">Concepts designed around proven demand and profit potential.</p>
                  </CardContent>
                </Card>
                <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20">
                  <CardContent className="pt-6">
                    <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center mb-4">
                      <Zap className="h-6 w-6 text-blue-600" />
                    </div>
                    <h3 className="font-bold text-lg mb-2">Skip the Brainstorming</h3>
                    <p className="text-muted-foreground">Get 10 unique ideas instantly instead of weeks of research.</p>
                  </CardContent>
                </Card>
                <Card className="border-0 shadow-lg bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-950/20 dark:to-violet-950/20">
                  <CardContent className="pt-6">
                    <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center mb-4">
                      <DollarSign className="h-6 w-6 text-purple-600" />
                    </div>
                    <h3 className="font-bold text-lg mb-2">Budget-Matched</h3>
                    <p className="text-muted-foreground">Ideas scaled to your available startup capital.</p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </section>

          {/* How It Works */}
          <section className="py-16">
            <div className="container">
              <h2 className="text-3xl font-bold text-center mb-12">How Concept Lab Works</h2>
              <div className="grid gap-8 md:grid-cols-3 max-w-4xl mx-auto">
                <div className="text-center">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4"><span className="text-2xl font-bold text-primary">1</span></div>
                  <h3 className="font-bold mb-2">Share Your Preferences</h3>
                  <p className="text-muted-foreground text-sm">Tell us about your cuisine interests, location, and budget.</p>
                </div>
                <div className="text-center">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4"><span className="text-2xl font-bold text-primary">2</span></div>
                  <h3 className="font-bold mb-2">AI Generates Concepts</h3>
                  <p className="text-muted-foreground text-sm">Get 10 unique business ideas with menus, positioning, and estimates.</p>
                </div>
                <div className="text-center">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4"><span className="text-2xl font-bold text-primary">3</span></div>
                  <h3 className="font-bold mb-2">Turn Into a Plan</h3>
                  <p className="text-muted-foreground text-sm">Use other tools to build equipment lists, find permits, and price your services.</p>
                </div>
              </div>
            </div>
          </section>

          {/* The Tool */}
          <section id="tool-section" className="py-16 bg-muted/30">
            <div className="container max-w-5xl">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><Lightbulb className="h-5 w-5 text-primary" />Concept Lab</CardTitle>
                  <CardDescription>Tell us your preferences and we'll generate unique business concepts.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Cuisine Interests</Label>
                      <Input placeholder="e.g., Mexican, Asian fusion, BBQ, healthy bowls..." value={ideaForm.cuisine} onChange={(e) => setIdeaForm({ ...ideaForm, cuisine: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Location Type</Label>
                      <Select value={ideaForm.locationType} onValueChange={(v) => setIdeaForm({ ...ideaForm, locationType: v })}>
                        <SelectTrigger><SelectValue placeholder="Where will you operate?" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="urban">Urban / Downtown</SelectItem>
                          <SelectItem value="suburban">Suburban</SelectItem>
                          <SelectItem value="events">Events / Festivals</SelectItem>
                          <SelectItem value="industrial">Industrial / Office Parks</SelectItem>
                          <SelectItem value="mixed">Mixed / Multiple</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Startup Budget</Label>
                      <Select value={ideaForm.budget} onValueChange={(v) => setIdeaForm({ ...ideaForm, budget: v })}>
                        <SelectTrigger><SelectValue placeholder="Select budget range" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Under $25,000</SelectItem>
                          <SelectItem value="medium">$25,000 - $75,000</SelectItem>
                          <SelectItem value="high">$75,000 - $150,000</SelectItem>
                          <SelectItem value="premium">$150,000+</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Experience Level</Label>
                      <Select value={ideaForm.experience} onValueChange={(v) => setIdeaForm({ ...ideaForm, experience: v })}>
                        <SelectTrigger><SelectValue placeholder="Your food industry experience" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No experience</SelectItem>
                          <SelectItem value="some">Some experience</SelectItem>
                          <SelectItem value="experienced">Experienced</SelectItem>
                          <SelectItem value="professional">Professional chef</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Personal Interests (Optional)</Label>
                    <Input placeholder="e.g., sustainability, sports, late-night, families..." value={ideaForm.interests} onChange={(e) => setIdeaForm({ ...ideaForm, interests: e.target.value })} />
                  </div>
                  <Button onClick={handleSubmit} disabled={isLoading} className="w-full">
                    {isLoading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Generating Ideas...</> : <><Sparkles className="h-4 w-4 mr-2" />Generate 10 Business Ideas</>}
                  </Button>
                </CardContent>
              </Card>

              {/* Results */}
              {ideaResult && ideaResult.ideas && (
                <div className="mt-8 grid gap-4 md:grid-cols-2">
                  {ideaResult.ideas.map((idea, i) => (
                    <Card key={i} className="hover:shadow-lg transition-shadow">
                      <CardHeader>
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <Badge variant="outline" className="mb-2">Concept {i + 1}</Badge>
                            <CardTitle className="text-lg">{idea.name}</CardTitle>
                          </div>
                          <Badge variant={idea.estimatedStartup === 'Low' ? 'secondary' : idea.estimatedStartup === 'Medium' ? 'default' : 'destructive'}>
                            {idea.estimatedStartup} Startup
                          </Badge>
                        </div>
                        <CardDescription>{idea.concept}</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div>
                          <p className="text-sm font-medium mb-1">Target Market</p>
                          <p className="text-sm text-muted-foreground">{idea.targetMarket}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium mb-2">Menu Highlights</p>
                          <div className="flex flex-wrap gap-1">
                            {idea.menuHighlights.map((item, j) => <Badge key={j} variant="outline" className="text-xs">{item}</Badge>)}
                          </div>
                        </div>
                        <div className="p-3 bg-muted rounded-lg">
                          <p className="text-xs font-medium mb-1">Unique Angle</p>
                          <p className="text-xs text-muted-foreground">{idea.uniqueAngle}</p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {ideaResult && (
                <div className="mt-8 flex flex-wrap gap-4 justify-center">
                  <Button variant="outline" asChild><Link to="/tools/buildkit">→ BuildKit: Get Equipment List</Link></Button>
                  <Button variant="outline" asChild><Link to="/tools/permitpath">→ PermitPath: Find Permits</Link></Button>
                  <Button variant="outline" asChild><Link to="/tools/pricepilot">→ PricePilot: Set Pricing</Link></Button>
                </div>
              )}
            </div>
          </section>

          {/* FAQ */}
          <section className="py-16">
            <div className="container max-w-3xl">
              <Accordion type="single" collapsible>
                <AccordionItem value="q1">
                  <AccordionTrigger>Are these ideas guaranteed to succeed?</AccordionTrigger>
                  <AccordionContent>No business idea is guaranteed. These are AI-generated concepts based on your inputs. Always validate with local market research.</AccordionContent>
                </AccordionItem>
                <AccordionItem value="q2">
                  <AccordionTrigger>Can I regenerate ideas?</AccordionTrigger>
                  <AccordionContent>Yes! Adjust your inputs and generate again to get fresh concepts.</AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
          </section>

          {/* Cross-Links */}
          <ToolCrossLinks 
            currentTool="concept-lab" 
            title="Turn Your Concept Into Reality"
            subtitle="Got an idea? Use these tools to build your equipment list, find permits, and set pricing."
          />

          {/* Final CTA */}
          <section className="py-20 bg-gradient-to-r from-orange-500/10 via-amber-500/10 to-yellow-500/10">
            <div className="container text-center">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to find your concept?</h2>
              <p className="text-lg text-muted-foreground mb-8 max-w-xl mx-auto">Generate 10 unique business ideas matched to your preferences and budget.</p>
              <div className="flex flex-wrap gap-4 justify-center">
                <Button size="lg" className="bg-gradient-to-r from-orange-500 to-amber-500" onClick={() => document.getElementById('tool-section')?.scrollIntoView({ behavior: 'smooth' })}>
                  Generate Ideas
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

export default ConceptLab;
