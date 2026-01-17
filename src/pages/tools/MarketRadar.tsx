import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
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
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  Search, 
  Loader2, 
  Home,
  Sparkles,
  ArrowRight,
  TrendingUp,
  MapPin,
  BarChart3,
  CheckCircle,
  Lightbulb,
  BookOpen,
  ListChecks
} from 'lucide-react';
import ToolCrossLinks from '@/components/tools/ToolCrossLinks';
import { OutputCard, OutputSection, OutputList, OutputHighlightBadges } from '@/components/tools/OutputCard';

const pageJsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "Vendi Market Radar - Food Truck Industry Research Tool",
  "applicationCategory": "BusinessApplication",
  "operatingSystem": "Web",
  "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" },
  "description": "AI-powered market research for food truck and mobile food businesses. Location intel, competitor snapshots, and demand signals.",
  "featureList": ["Industry research", "Competitor analysis", "Location insights", "Expert tips"]
};

interface WebResearchResult {
  query: string; title: string; summary: string;
  sections: Array<{ heading: string; content: string; keyPoints: string[] }>;
  quickFacts: Array<{ label: string; value: string }>;
  actionItems: string[]; relatedTopics: string[]; sources: string[]; expertTips: string[];
}

const MarketRadar = () => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [researchForm, setResearchForm] = useState({ query: '', category: 'general' });
  const [researchResult, setResearchResult] = useState<WebResearchResult | null>(null);

  const handleSubmit = async () => {
    setIsLoading(true);
    try {
      const { data: response, error } = await supabase.functions.invoke('ai-web-research', { body: researchForm });
      if (error) throw error;
      if (response.error) { toast({ title: 'Error', description: response.error, variant: 'destructive' }); return; }
      setResearchResult(response.result);
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to research. Please try again.', variant: 'destructive' });
    } finally { setIsLoading(false); }
  };

  const quickTopics = [
    "Food truck profit margins in 2024",
    "Best locations for food trucks",
    "Food truck insurance requirements",
    "How to pass health inspections",
    "Food truck financing options",
    "Menu pricing strategies"
  ];

  return (
    <>
      <SEO
        title="Vendi Market Radar | Food Truck Industry Research | Vendibook"
        description="AI-powered market research for food truck businesses. Get location intel, competitor snapshots, and demand signals for smarter decisions."
        canonical="/tools/market-radar"
      />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(pageJsonLd) }} />
      
      <div className="min-h-screen flex flex-col bg-background">
        <Header />

        <main className="flex-1">
          {/* Hero */}
          <section className="relative py-16 md:py-24 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 via-yellow-500/5 to-orange-500/10" />
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <div className="absolute top-10 right-10 w-[400px] h-[400px] bg-gradient-to-br from-amber-500/10 to-yellow-500/8 rounded-full blur-3xl animate-pulse" />
            </div>
            
            <div className="container relative z-10">
              <Breadcrumb className="mb-6">
                <BreadcrumbList>
                  <BreadcrumbItem>
                    <BreadcrumbLink asChild>
                      <Link to="/" className="flex items-center gap-1">
                        <Home className="h-4 w-4" />
                        Home
                      </Link>
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <BreadcrumbLink asChild>
                      <Link to="/tools">Host Tools</Link>
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <BreadcrumbPage>Market Radar</BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
              
              <div className="max-w-3xl">
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-blue-400 to-indigo-600 flex items-center justify-center shadow-lg">
                    <Search className="h-6 w-6 text-white" />
                  </div>
                  <Badge className="bg-gradient-to-r from-amber-500 to-yellow-500 text-white border-0">
                    Market Radar
                  </Badge>
                </div>
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-4 leading-tight">
                  Research smarter, decide faster.
                </h1>
                <p className="text-xl text-foreground/70 mb-8">
                  Location intel + competitor snapshots for smarter decisions. AI-powered research on any food truck topic.
                </p>
                <div className="flex flex-wrap gap-4">
                  <Button size="lg" className="bg-gradient-to-r from-amber-500 to-yellow-500" onClick={() => document.getElementById('tool-section')?.scrollIntoView({ behavior: 'smooth' })}>
                    Start Research<ArrowRight className="h-4 w-4 ml-2" />
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
                      <BarChart3 className="h-6 w-6 text-green-600" />
                    </div>
                    <h3 className="font-bold text-lg mb-2">Data-Driven Decisions</h3>
                    <p className="text-muted-foreground">Get comprehensive research on any industry topic instantly.</p>
                  </CardContent>
                </Card>
                <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20">
                  <CardContent className="pt-6">
                    <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center mb-4">
                      <MapPin className="h-6 w-6 text-blue-600" />
                    </div>
                    <h3 className="font-bold text-lg mb-2">Location Intelligence</h3>
                    <p className="text-muted-foreground">Understand demand signals and best spots for your business.</p>
                  </CardContent>
                </Card>
                <Card className="border-0 shadow-lg bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-950/20 dark:to-violet-950/20">
                  <CardContent className="pt-6">
                    <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center mb-4">
                      <TrendingUp className="h-6 w-6 text-purple-600" />
                    </div>
                    <h3 className="font-bold text-lg mb-2">Competitor Insights</h3>
                    <p className="text-muted-foreground">Know your market and position yourself for success.</p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </section>

          {/* How It Works */}
          <section className="py-16">
            <div className="container">
              <h2 className="text-3xl font-bold text-center mb-12">How Market Radar Works</h2>
              <div className="grid gap-8 md:grid-cols-3 max-w-4xl mx-auto">
                <div className="text-center">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4"><span className="text-2xl font-bold text-primary">1</span></div>
                  <h3 className="font-bold mb-2">Ask Your Question</h3>
                  <p className="text-muted-foreground text-sm">Enter any food truck or mobile food business topic.</p>
                </div>
                <div className="text-center">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4"><span className="text-2xl font-bold text-primary">2</span></div>
                  <h3 className="font-bold mb-2">AI Researches</h3>
                  <p className="text-muted-foreground text-sm">Get comprehensive research with key insights and action items.</p>
                </div>
                <div className="text-center">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4"><span className="text-2xl font-bold text-primary">3</span></div>
                  <h3 className="font-bold mb-2">Export & Act</h3>
                  <p className="text-muted-foreground text-sm">Use the insights to make informed business decisions.</p>
                </div>
              </div>
            </div>
          </section>

          {/* The Tool */}
          <section id="tool-section" className="py-16 bg-muted/30">
            <div className="container max-w-5xl">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><Search className="h-5 w-5 text-primary" />Market Radar</CardTitle>
                  <CardDescription>Get comprehensive AI-powered research on any food truck topic.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Quick Topics */}
                  <div>
                    <Label className="mb-2 block">Quick Topics</Label>
                    <div className="flex flex-wrap gap-2">
                      {quickTopics.map((topic) => (
                        <Button key={topic} type="button" variant={researchForm.query === topic ? 'default' : 'outline'} size="sm"
                          onClick={() => setResearchForm({ ...researchForm, query: topic })} className="text-xs">
                          {topic}
                        </Button>
                      ))}
                    </div>
                  </div>
                  
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div className="space-y-2 sm:col-span-2">
                      <Label>What do you want to research?</Label>
                      <Input placeholder="e.g., Best practices for food truck menu pricing..." value={researchForm.query} onChange={(e) => setResearchForm({ ...researchForm, query: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Category</Label>
                      <Select value={researchForm.category} onValueChange={(v) => setResearchForm({ ...researchForm, category: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="general">General</SelectItem>
                          <SelectItem value="equipment">Equipment</SelectItem>
                          <SelectItem value="maintenance">Maintenance</SelectItem>
                          <SelectItem value="safety">Safety & Health</SelectItem>
                          <SelectItem value="business">Business</SelectItem>
                          <SelectItem value="marketing">Marketing</SelectItem>
                          <SelectItem value="regulations">Regulations</SelectItem>
                          <SelectItem value="recipes">Recipes & Menu</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <Button onClick={handleSubmit} disabled={isLoading || !researchForm.query} className="w-full">
                    {isLoading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Researching...</> : <><Sparkles className="h-4 w-4 mr-2" />Research This Topic</>}
                  </Button>
                </CardContent>
              </Card>

              {/* Results */}
              {researchResult && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="mt-8 space-y-6"
                >
                  <OutputCard
                    title={researchResult.title}
                    subtitle={researchResult.summary}
                    icon={<Search className="h-5 w-5" />}
                    gradient="from-amber-50 to-yellow-50 dark:from-amber-950/30 dark:to-yellow-950/30"
                  >
                    <div className="space-y-6">
                      {/* Quick Facts */}
                      {researchResult.quickFacts.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {researchResult.quickFacts.map((fact, i) => (
                            <motion.div
                              key={i}
                              initial={{ opacity: 0, scale: 0.9 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ delay: i * 0.05 }}
                            >
                              <Badge variant="secondary" className="text-sm py-1.5 px-3">
                                <strong className="font-semibold">{fact.label}:</strong>&nbsp;{fact.value}
                              </Badge>
                            </motion.div>
                          ))}
                        </div>
                      )}

                      {/* Sections */}
                      <div className="space-y-6">
                        {researchResult.sections.map((section, i) => (
                          <motion.div 
                            key={i} 
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.1 }}
                            className="border-l-2 border-primary/50 pl-4 hover:border-primary transition-colors"
                          >
                            <h3 className="font-semibold mb-2 flex items-center gap-2">
                              <BookOpen className="h-4 w-4 text-primary" />
                              {section.heading}
                            </h3>
                            <p className="text-sm text-muted-foreground mb-3 leading-relaxed">{section.content}</p>
                            {section.keyPoints.length > 0 && (
                              <OutputList items={section.keyPoints} variant="check" />
                            )}
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  </OutputCard>

                  <div className="grid gap-4 md:grid-cols-2">
                    {/* Action Items */}
                    {researchResult.actionItems.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                      >
                        <Card className="h-full border-0 shadow-lg bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30">
                          <CardHeader className="pb-2">
                            <CardTitle className="text-base flex items-center gap-2">
                              <ListChecks className="h-4 w-4 text-blue-600" />
                              Action Items
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <OutputList items={researchResult.actionItems} variant="number" />
                          </CardContent>
                        </Card>
                      </motion.div>
                    )}

                    {/* Expert Tips */}
                    {researchResult.expertTips.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                      >
                        <Card className="h-full border-0 shadow-lg bg-gradient-to-br from-yellow-50 to-amber-50 dark:from-yellow-950/30 dark:to-amber-950/30">
                          <CardHeader className="pb-2">
                            <CardTitle className="text-base flex items-center gap-2">
                              <Lightbulb className="h-4 w-4 text-yellow-600" />
                              Expert Tips
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <ul className="space-y-2 text-sm">
                              {researchResult.expertTips.map((tip, i) => (
                                <motion.li 
                                  key={i} 
                                  initial={{ opacity: 0 }}
                                  animate={{ opacity: 1 }}
                                  transition={{ delay: 0.3 + i * 0.05 }}
                                  className="flex gap-2"
                                >
                                  <Lightbulb className="h-4 w-4 text-yellow-500 shrink-0 mt-0.5" />
                                  {tip}
                                </motion.li>
                              ))}
                            </ul>
                          </CardContent>
                        </Card>
                      </motion.div>
                    )}
                  </div>

                  {/* Related Topics */}
                  {researchResult.relatedTopics.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4 }}
                    >
                      <Card className="border-0 shadow-lg">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base">Explore Related Topics</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="flex flex-wrap gap-2">
                            {researchResult.relatedTopics.map((topic, i) => (
                              <Button 
                                key={i} 
                                variant="outline" 
                                size="sm" 
                                onClick={() => { 
                                  setResearchForm({ ...researchForm, query: topic }); 
                                }}
                                className="hover:bg-primary hover:text-primary-foreground transition-colors"
                              >
                                {topic}
                              </Button>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  )}
                </motion.div>
              )}
            </div>
          </section>

          {/* FAQ */}
          <section className="py-16">
            <div className="container max-w-3xl">
              <Accordion type="single" collapsible>
                <AccordionItem value="q1">
                  <AccordionTrigger>How current is the research?</AccordionTrigger>
                  <AccordionContent>Our AI uses the latest available information. However, always verify critical details with primary sources.</AccordionContent>
                </AccordionItem>
                <AccordionItem value="q2">
                  <AccordionTrigger>Can I research any topic?</AccordionTrigger>
                  <AccordionContent>Market Radar is optimized for food truck and mobile food industry topics. General business questions work best.</AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
          </section>

          {/* Cross-Links */}
          <ToolCrossLinks 
            currentTool="market-radar" 
            title="Take Action on Your Research"
            subtitle="Now that you understand your market, explore business concepts, set pricing, or find permits."
          />

          {/* Final CTA */}
          <section className="py-20 bg-gradient-to-r from-amber-500/10 via-yellow-500/10 to-orange-500/10">
            <div className="container text-center">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to research your market?</h2>
              <p className="text-lg text-muted-foreground mb-8 max-w-xl mx-auto">Get comprehensive insights on any food truck topic in seconds.</p>
              <div className="flex flex-wrap gap-4 justify-center">
                <Button size="lg" className="bg-gradient-to-r from-amber-500 to-yellow-500" onClick={() => document.getElementById('tool-section')?.scrollIntoView({ behavior: 'smooth' })}>
                  Start Research
                </Button>
                <Button size="lg" variant="outline" asChild><Link to="/host">List Your Asset</Link></Button>
              </div>
            </div>
          </section>
        </main>

        <Footer />
      </div>
    </>
  );
};

export default MarketRadar;
