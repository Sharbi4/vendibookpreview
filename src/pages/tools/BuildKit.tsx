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
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  Wrench, 
  Loader2, 
  Home,
  Sparkles,
  CheckCircle,
  ArrowRight,
  Clock,
  AlertTriangle,
  Zap,
  Package,
  Target
} from 'lucide-react';
import ToolCrossLinks from '@/components/tools/ToolCrossLinks';

const pageJsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "Vendi BuildKit - Equipment Guide for Food Trucks",
  "applicationCategory": "BusinessApplication",
  "operatingSystem": "Web",
  "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" },
  "description": "Get equipment recommendations and maintenance guides for commercial kitchen equipment. Match your menu, volume, and budget.",
  "featureList": ["Equipment recommendations by cuisine", "Maintenance schedules", "Troubleshooting guides", "Safety tips"]
};

interface EquipmentGuideResult {
  title: string; equipment: string; overview: string;
  maintenanceSchedule: { daily: string[]; weekly: string[]; monthly: string[]; quarterly: string[] };
  stepByStepGuide: Array<{ step: number; title: string; instructions: string; tips: string; warnings?: string }>;
  troubleshooting: Array<{ problem: string; cause: string; solution: string }>;
  safetyTips: string[]; estimatedTime: string; toolsNeeded: string[]; professionalHelpNeeded: string;
}

const POPULAR_EQUIPMENT = [
  { name: 'Commercial Deep Fryer', icon: '🍟' }, { name: 'Flat Top Griddle', icon: '🥓' },
  { name: 'Walk-in Cooler', icon: '❄️' }, { name: 'Ice Machine', icon: '🧊' },
  { name: 'Commercial Oven', icon: '🔥' }, { name: 'Exhaust Hood System', icon: '💨' },
  { name: 'Refrigerator/Freezer', icon: '🧊' }, { name: 'Commercial Dishwasher', icon: '🍽️' },
  { name: 'Steam Table', icon: '♨️' }, { name: 'Propane System', icon: '⛽' },
  { name: 'Generator', icon: '⚡' }, { name: 'POS System', icon: '💳' },
];

const BuildKit = () => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [equipmentForm, setEquipmentForm] = useState({ equipment: '', issue: '', maintenanceType: 'general' });
  const [equipmentResult, setEquipmentResult] = useState<EquipmentGuideResult | null>(null);

  const handleSubmit = async () => {
    setIsLoading(true);
    try {
      const { data: response, error } = await supabase.functions.invoke('ai-equipment-guide', { body: equipmentForm });
      if (error) throw error;
      if (response.error) { toast({ title: 'Error', description: response.error, variant: 'destructive' }); return; }
      setEquipmentResult(response.result);
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to generate guide. Please try again.', variant: 'destructive' });
    } finally { setIsLoading(false); }
  };

  return (
    <>
      <SEO
        title="Vendi BuildKit | Equipment Guide for Food Trucks | Vendibook"
        description="Get equipment recommendations and maintenance guides for commercial kitchen equipment. Match your menu, volume, and budget. Free AI-powered tool."
        canonical="/tools/buildkit"
      />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(pageJsonLd) }} />
      
      <div className="min-h-screen flex flex-col bg-background">
        <Header />

        <main className="flex-1">
          {/* Hero */}
          <section className="relative py-16 md:py-24 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 via-red-500/5 to-amber-500/10" />
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <div className="absolute top-10 right-10 w-[400px] h-[400px] bg-gradient-to-br from-orange-500/10 to-red-500/8 rounded-full blur-3xl animate-pulse" />
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
                    <BreadcrumbPage>BuildKit</BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
              
              <div className="max-w-3xl">
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center shadow-lg">
                    <Wrench className="h-6 w-6 text-white" />
                  </div>
                  <Badge className="bg-gradient-to-r from-orange-500 to-red-500 text-white border-0">
                    BuildKit
                  </Badge>
                </div>
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-4 leading-tight">
                  Master your equipment in minutes.
                </h1>
                <p className="text-xl text-foreground/70 mb-8">
                  Equipment recommendations that match your menu, volume, and budget. Plus detailed maintenance guides to keep everything running.
                </p>
                <div className="flex flex-wrap gap-4">
                  <Button size="lg" variant="dark-shine" onClick={() => document.getElementById('tool-section')?.scrollIntoView({ behavior: 'smooth' })}>
                    Get Equipment Guide<ArrowRight className="h-4 w-4 ml-2" />
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
                      <Package className="h-6 w-6 text-green-600" />
                    </div>
                    <h3 className="font-bold text-lg mb-2">Right Equipment First Time</h3>
                    <p className="text-muted-foreground">Avoid costly mistakes. Get recommendations matched to your specific needs.</p>
                  </CardContent>
                </Card>
                <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20">
                  <CardContent className="pt-6">
                    <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center mb-4">
                      <Zap className="h-6 w-6 text-blue-600" />
                    </div>
                    <h3 className="font-bold text-lg mb-2">Extend Equipment Life</h3>
                    <p className="text-muted-foreground">Proper maintenance schedules to maximize your investment.</p>
                  </CardContent>
                </Card>
                <Card className="border-0 shadow-lg bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-950/20 dark:to-violet-950/20">
                  <CardContent className="pt-6">
                    <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center mb-4">
                      <Target className="h-6 w-6 text-purple-600" />
                    </div>
                    <h3 className="font-bold text-lg mb-2">Fix Issues Fast</h3>
                    <p className="text-muted-foreground">Troubleshooting guides to diagnose and resolve problems quickly.</p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </section>

          {/* How It Works */}
          <section className="py-16">
            <div className="container">
              <h2 className="text-3xl font-bold text-center mb-12">How BuildKit Works</h2>
              <div className="grid gap-8 md:grid-cols-3 max-w-4xl mx-auto">
                <div className="text-center">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4"><span className="text-2xl font-bold text-primary">1</span></div>
                  <h3 className="font-bold mb-2">Select Equipment</h3>
                  <p className="text-muted-foreground text-sm">Choose from popular equipment or enter your own.</p>
                </div>
                <div className="text-center">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4"><span className="text-2xl font-bold text-primary">2</span></div>
                  <h3 className="font-bold mb-2">AI Generates Guide</h3>
                  <p className="text-muted-foreground text-sm">Get maintenance schedules, troubleshooting, and safety tips.</p>
                </div>
                <div className="text-center">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4"><span className="text-2xl font-bold text-primary">3</span></div>
                  <h3 className="font-bold mb-2">Save & Reference</h3>
                  <p className="text-muted-foreground text-sm">Use the guide to maintain your equipment properly.</p>
                </div>
              </div>
            </div>
          </section>

          {/* The Tool */}
          <section id="tool-section" className="py-16 bg-muted/30">
            <div className="container max-w-5xl">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><Wrench className="h-5 w-5 text-primary" />BuildKit</CardTitle>
                  <CardDescription>Get detailed maintenance guides for commercial kitchen equipment.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="mb-4">
                    <Label className="mb-2 block">Quick Select Popular Equipment</Label>
                    <div className="flex flex-wrap gap-2">
                      {POPULAR_EQUIPMENT.map((item) => (
                        <Button key={item.name} type="button" variant={equipmentForm.equipment === item.name ? 'default' : 'outline'} size="sm"
                          onClick={() => setEquipmentForm({ ...equipmentForm, equipment: item.name })} className="text-xs">
                          <span className="mr-1">{item.icon}</span>{item.name}
                        </Button>
                      ))}
                    </div>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Equipment Name</Label>
                      <Input placeholder="Or type custom equipment..." value={equipmentForm.equipment} onChange={(e) => setEquipmentForm({ ...equipmentForm, equipment: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Guide Focus</Label>
                      <Select value={equipmentForm.maintenanceType} onValueChange={(v) => setEquipmentForm({ ...equipmentForm, maintenanceType: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="general">General Maintenance</SelectItem>
                          <SelectItem value="preventive">Preventive Care</SelectItem>
                          <SelectItem value="troubleshooting">Troubleshooting</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Specific Issue (Optional)</Label>
                    <Textarea placeholder="Describe any specific problems or concerns..." value={equipmentForm.issue} onChange={(e) => setEquipmentForm({ ...equipmentForm, issue: e.target.value })} rows={2} />
                  </div>
                  <Button onClick={handleSubmit} disabled={isLoading || !equipmentForm.equipment} className="w-full">
                    {isLoading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Generating Guide...</> : <><Sparkles className="h-4 w-4 mr-2" />Generate Maintenance Guide</>}
                  </Button>
                </CardContent>
              </Card>

              {/* Results */}
              {equipmentResult && (
                <Card className="mt-8">
                  <CardHeader>
                    <CardTitle>{equipmentResult.title}</CardTitle>
                    <CardDescription>{equipmentResult.overview}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="p-3 bg-muted rounded-lg">
                        <Clock className="h-4 w-4 text-muted-foreground mb-1" />
                        <p className="text-xs text-muted-foreground">Estimated Time</p>
                        <p className="text-sm font-medium">{equipmentResult.estimatedTime}</p>
                      </div>
                      <div className="p-3 bg-muted rounded-lg">
                        <Wrench className="h-4 w-4 text-muted-foreground mb-1" />
                        <p className="text-xs text-muted-foreground">Tools Needed</p>
                        <p className="text-sm">{equipmentResult.toolsNeeded.join(', ')}</p>
                      </div>
                    </div>

                    {/* Maintenance Schedule */}
                    <div>
                      <h3 className="font-semibold mb-3">Maintenance Schedule</h3>
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        {Object.entries(equipmentResult.maintenanceSchedule).map(([period, tasks]) => (
                          <div key={period} className="p-3 border rounded-lg">
                            <p className="font-medium capitalize text-sm mb-2">{period}</p>
                            <ul className="text-xs text-muted-foreground space-y-1">
                              {tasks.map((task, i) => (
                                <li key={i} className="flex gap-1"><CheckCircle className="h-3 w-3 text-green-500 shrink-0 mt-0.5" />{task}</li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Step by Step */}
                    <div>
                      <h3 className="font-semibold mb-3">Step-by-Step Guide</h3>
                      <Accordion type="single" collapsible className="w-full">
                        {equipmentResult.stepByStepGuide.map((step, i) => (
                          <AccordionItem key={i} value={`step-${i}`}>
                            <AccordionTrigger><span className="flex items-center gap-2"><Badge variant="outline">{step.step}</Badge>{step.title}</span></AccordionTrigger>
                            <AccordionContent className="space-y-3">
                              <p className="text-sm">{step.instructions}</p>
                              {step.tips && <div className="p-2 bg-blue-50 dark:bg-blue-950 rounded text-sm"><strong>Pro Tip:</strong> {step.tips}</div>}
                              {step.warnings && <div className="p-2 bg-yellow-50 dark:bg-yellow-950 rounded text-sm flex gap-2"><AlertTriangle className="h-4 w-4 text-yellow-600 shrink-0" />{step.warnings}</div>}
                            </AccordionContent>
                          </AccordionItem>
                        ))}
                      </Accordion>
                    </div>

                    {/* Safety Tips */}
                    <div className="p-4 bg-yellow-50 dark:bg-yellow-950 rounded-lg">
                      <h3 className="font-semibold mb-2 flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-yellow-600" />Safety Tips</h3>
                      <ul className="text-sm space-y-1">
                        {equipmentResult.safetyTips.map((tip, i) => <li key={i} className="flex gap-2"><span>•</span>{tip}</li>)}
                      </ul>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </section>

          {/* FAQ */}
          <section className="py-16">
            <div className="container max-w-3xl">
              <Accordion type="single" collapsible>
                <AccordionItem value="q1">
                  <AccordionTrigger>What equipment can I get guides for?</AccordionTrigger>
                  <AccordionContent>BuildKit covers all common commercial kitchen equipment including fryers, griddles, ovens, refrigeration, and more.</AccordionContent>
                </AccordionItem>
                <AccordionItem value="q2">
                  <AccordionTrigger>Are the maintenance schedules accurate?</AccordionTrigger>
                  <AccordionContent>Our guides are based on industry best practices. Always follow manufacturer recommendations for your specific equipment.</AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
          </section>

          {/* Cross-Links */}
          <ToolCrossLinks 
            currentTool="buildkit" 
            title="Complete Your Setup"
            subtitle="Got your equipment? Find the permits you need, set pricing, and write your listing."
          />

          {/* Final CTA */}
          <section className="py-20 bg-gradient-to-r from-orange-500/10 via-red-500/10 to-amber-500/10">
            <div className="container text-center">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to master your equipment?</h2>
              <p className="text-lg text-muted-foreground mb-8 max-w-xl mx-auto">Get detailed maintenance guides and keep your kitchen running smoothly.</p>
              <div className="flex flex-wrap gap-4 justify-center">
                <Button size="lg" variant="dark-shine" onClick={() => document.getElementById('tool-section')?.scrollIntoView({ behavior: 'smooth' })}>
                  Get Equipment Guide
                </Button>
                <Button size="lg" variant="dark-shine" asChild><Link to="/host">List Your Asset</Link></Button>
              </div>
            </div>
          </section>
        </main>

        <Footer />
      </div>
    </>
  );
};

export default BuildKit;
