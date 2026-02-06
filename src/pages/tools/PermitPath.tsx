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
  FileCheck, 
  Loader2, 
  Home,
  Sparkles,
  Shield,
  Clock,
  MapPin,
  AlertTriangle,
  CheckCircle,
  ArrowRight,
  ExternalLink,
  DollarSign,
  Calendar,
  Building,
  Flame,
  Heart
} from 'lucide-react';
import ToolCrossLinks from '@/components/tools/ToolCrossLinks';
import { OutputCard, OutputMetric, OutputList, OutputSection } from '@/components/tools/OutputCard';

// JSON-LD structured data
const pageJsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "Vendi PermitPath - License & Permit Finder for Food Trucks",
  "applicationCategory": "BusinessApplication",
  "operatingSystem": "Web",
  "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" },
  "description": "Find all licenses, permits, and compliance requirements for your mobile food business. Mapped to your city and setup.",
  "featureList": ["State and city license requirements", "Health department permits", "Fire safety certifications", "Insurance requirements", "Estimated costs and timelines"]
};

const US_STATES = [
  { value: 'AL', label: 'Alabama' }, { value: 'AK', label: 'Alaska' }, { value: 'AZ', label: 'Arizona' },
  { value: 'AR', label: 'Arkansas' }, { value: 'CA', label: 'California' }, { value: 'CO', label: 'Colorado' },
  { value: 'CT', label: 'Connecticut' }, { value: 'DE', label: 'Delaware' }, { value: 'FL', label: 'Florida' },
  { value: 'GA', label: 'Georgia' }, { value: 'HI', label: 'Hawaii' }, { value: 'ID', label: 'Idaho' },
  { value: 'IL', label: 'Illinois' }, { value: 'IN', label: 'Indiana' }, { value: 'IA', label: 'Iowa' },
  { value: 'KS', label: 'Kansas' }, { value: 'KY', label: 'Kentucky' }, { value: 'LA', label: 'Louisiana' },
  { value: 'ME', label: 'Maine' }, { value: 'MD', label: 'Maryland' }, { value: 'MA', label: 'Massachusetts' },
  { value: 'MI', label: 'Michigan' }, { value: 'MN', label: 'Minnesota' }, { value: 'MS', label: 'Mississippi' },
  { value: 'MO', label: 'Missouri' }, { value: 'MT', label: 'Montana' }, { value: 'NE', label: 'Nebraska' },
  { value: 'NV', label: 'Nevada' }, { value: 'NH', label: 'New Hampshire' }, { value: 'NJ', label: 'New Jersey' },
  { value: 'NM', label: 'New Mexico' }, { value: 'NY', label: 'New York' }, { value: 'NC', label: 'North Carolina' },
  { value: 'ND', label: 'North Dakota' }, { value: 'OH', label: 'Ohio' }, { value: 'OK', label: 'Oklahoma' },
  { value: 'OR', label: 'Oregon' }, { value: 'PA', label: 'Pennsylvania' }, { value: 'RI', label: 'Rhode Island' },
  { value: 'SC', label: 'South Carolina' }, { value: 'SD', label: 'South Dakota' }, { value: 'TN', label: 'Tennessee' },
  { value: 'TX', label: 'Texas' }, { value: 'UT', label: 'Utah' }, { value: 'VT', label: 'Vermont' },
  { value: 'VA', label: 'Virginia' }, { value: 'WA', label: 'Washington' }, { value: 'WV', label: 'West Virginia' },
  { value: 'WI', label: 'Wisconsin' }, { value: 'WY', label: 'Wyoming' }, { value: 'DC', label: 'Washington D.C.' },
];

interface LicenseResult {
  location: { city: string; state: string; stateAbbreviation: string };
  businessType: string;
  overview: string;
  disclaimer: string;
  licenses: Array<{
    name: string; category: string; description: string; issuingAuthority: string;
    estimatedCost: string; renewalPeriod: string; processingTime: string;
    requirements: string[]; websiteHint: string; priority: string;
  }>;
  insuranceRequirements: Array<{ type: string; minimumCoverage: string; description: string }>;
  inspectionRequirements: Array<{ type: string; frequency: string; authority: string }>;
  estimatedTotalCost: string;
  estimatedTimeline: string;
  tips: string[];
  commonMistakes: string[];
  helpfulResources: Array<{ name: string; description: string; searchTerm: string }>;
}

const PermitPath = () => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [licenseForm, setLicenseForm] = useState({ city: '', state: '', businessType: 'food_truck' });
  const [licenseResult, setLicenseResult] = useState<LicenseResult | null>(null);

  const handleSubmit = async () => {
    setIsLoading(true);
    try {
      const { data: response, error } = await supabase.functions.invoke('ai-license-finder', { body: licenseForm });
      if (error) throw error;
      if (response.error) { toast({ title: 'Error', description: response.error, variant: 'destructive' }); return; }
      setLicenseResult(response.result);
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to find requirements. Please try again.', variant: 'destructive' });
    } finally { setIsLoading(false); }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) { case 'required': return 'destructive'; case 'recommended': return 'default'; default: return 'secondary'; }
  };

  return (
    <>
      <SEO
        title="Vendi PermitPath | License & Permit Finder for Food Trucks | Vendibook"
        description="Find all licenses, permits, and compliance requirements for your mobile food business. Mapped to your city and setup. Avoid compliance mistakes."
        canonical="/tools/permitpath"
      />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(pageJsonLd) }} />
      
      <div className="min-h-screen flex flex-col bg-background">
        <Header />

        <main className="flex-1">
          {/* Hero */}
          <section className="relative py-16 md:py-24 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-red-500/10" />
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <div className="absolute top-10 right-10 w-[400px] h-[400px] bg-gradient-to-br from-amber-500/10 to-orange-500/8 rounded-full blur-3xl animate-pulse" />
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
                    <BreadcrumbPage>PermitPath</BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
              
              <div className="max-w-3xl">
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-amber-400 to-orange-600 flex items-center justify-center shadow-lg">
                    <FileCheck className="h-6 w-6 text-white" />
                  </div>
                  <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0">
                    PermitPath
                  </Badge>
                </div>
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-4 leading-tight">
                  Navigate permits in minutes, not weeks.
                </h1>
                <p className="text-xl text-foreground/70 mb-8">
                  Permits, licenses, and compliance—mapped to your city and setup. Know exactly what you need before you start.
                </p>
                <div className="flex flex-wrap gap-4">
                  <Button size="lg" variant="dark-shine" onClick={() => document.getElementById('tool-section')?.scrollIntoView({ behavior: 'smooth' })}>
                    Find My Permits<ArrowRight className="h-4 w-4 ml-2" />
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
                      <Shield className="h-6 w-6 text-green-600" />
                    </div>
                    <h3 className="font-bold text-lg mb-2">Avoid Compliance Mistakes</h3>
                    <p className="text-muted-foreground">Get a complete checklist so you don't miss critical permits that could shut you down.</p>
                  </CardContent>
                </Card>
                <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20">
                  <CardContent className="pt-6">
                    <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center mb-4">
                      <Clock className="h-6 w-6 text-blue-600" />
                    </div>
                    <h3 className="font-bold text-lg mb-2">Save Weeks of Research</h3>
                    <p className="text-muted-foreground">Skip the endless Googling. Get all requirements in one organized view.</p>
                  </CardContent>
                </Card>
                <Card className="border-0 shadow-lg bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-950/20 dark:to-violet-950/20">
                  <CardContent className="pt-6">
                    <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center mb-4">
                      <DollarSign className="h-6 w-6 text-purple-600" />
                    </div>
                    <h3 className="font-bold text-lg mb-2">Know Your Costs Upfront</h3>
                    <p className="text-muted-foreground">Estimated costs and timelines so you can budget properly.</p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </section>

          {/* How It Works */}
          <section className="py-16">
            <div className="container">
              <h2 className="text-3xl font-bold text-center mb-12">How PermitPath Works</h2>
              <div className="grid gap-8 md:grid-cols-3 max-w-4xl mx-auto">
                <div className="text-center">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl font-bold text-primary">1</span>
                  </div>
                  <h3 className="font-bold mb-2">Enter Your Location</h3>
                  <p className="text-muted-foreground text-sm">Tell us your state, city, and business type.</p>
                </div>
                <div className="text-center">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl font-bold text-primary">2</span>
                  </div>
                  <h3 className="font-bold mb-2">AI Maps Requirements</h3>
                  <p className="text-muted-foreground text-sm">Get a complete checklist of permits, licenses, and inspections.</p>
                </div>
                <div className="text-center">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl font-bold text-primary">3</span>
                  </div>
                  <h3 className="font-bold mb-2">Download & Apply</h3>
                  <p className="text-muted-foreground text-sm">Use official resources to apply for each requirement.</p>
                </div>
              </div>
            </div>
          </section>

          {/* The Tool */}
          <section id="tool-section" className="py-16 bg-muted/30">
            <div className="container max-w-5xl">
              {/* Disclaimer */}
              <div className="p-4 bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 rounded-lg mb-6">
                <div className="flex gap-3">
                  <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-amber-800 dark:text-amber-400 mb-1">Important Disclaimer</h4>
                    <p className="text-sm text-amber-700 dark:text-amber-300">
                      This AI tool provides general guidance only. <strong>Always verify requirements directly with your local government agencies</strong> before starting your business.
                    </p>
                  </div>
                </div>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><FileCheck className="h-5 w-5 text-primary" />PermitPath</CardTitle>
                  <CardDescription>Find all licenses, permits, and requirements for your location.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div className="space-y-2">
                      <Label>State *</Label>
                      <Select value={licenseForm.state} onValueChange={(v) => setLicenseForm({ ...licenseForm, state: v })}>
                        <SelectTrigger><SelectValue placeholder="Select state" /></SelectTrigger>
                        <SelectContent>{US_STATES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>City (Optional)</Label>
                      <Input placeholder="e.g., Austin" value={licenseForm.city} onChange={(e) => setLicenseForm({ ...licenseForm, city: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Business Type</Label>
                      <Select value={licenseForm.businessType} onValueChange={(v) => setLicenseForm({ ...licenseForm, businessType: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="food_truck">Food Truck</SelectItem>
                          <SelectItem value="food_trailer">Food Trailer</SelectItem>
                          <SelectItem value="food_cart">Food Cart</SelectItem>
                          <SelectItem value="ghost_kitchen">Shared Kitchen</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <Button onClick={handleSubmit} disabled={isLoading || !licenseForm.state} className="w-full">
                    {isLoading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Finding Requirements...</> : <><Sparkles className="h-4 w-4 mr-2" />Find My Permits</>}
                  </Button>
                </CardContent>
              </Card>

              {/* Results */}
              {licenseResult && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="mt-8 space-y-6"
                >
                  {/* Overview */}
                  <OutputCard
                    title={`${licenseResult.location.city ? `${licenseResult.location.city}, ` : ''}${licenseResult.location.state}`}
                    subtitle={licenseResult.overview}
                    icon={<MapPin className="h-5 w-5" />}
                    gradient="from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30"
                  >
                    <div className="grid gap-4 sm:grid-cols-2">
                      <OutputMetric
                        label="Estimated Total Cost"
                        value={licenseResult.estimatedTotalCost}
                        variant="highlight"
                        icon={<DollarSign className="h-4 w-4" />}
                      />
                      <OutputMetric
                        label="Estimated Timeline"
                        value={licenseResult.estimatedTimeline}
                        variant="default"
                        icon={<Calendar className="h-4 w-4" />}
                      />
                    </div>
                  </OutputCard>

                  {/* Licenses List */}
                  <Card className="border-0 shadow-lg">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <FileCheck className="h-5 w-5 text-primary" />
                        Required Licenses & Permits
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {licenseResult.licenses.map((license, i) => (
                          <motion.div 
                            key={i} 
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.05 }}
                            className="p-4 border rounded-xl hover:shadow-md transition-shadow bg-gradient-to-r from-background to-muted/20"
                          >
                            <div className="flex items-start justify-between gap-4 mb-2">
                              <div>
                                <h4 className="font-semibold">{license.name}</h4>
                                <p className="text-sm text-muted-foreground">{license.issuingAuthority}</p>
                              </div>
                              <Badge variant={getPriorityColor(license.priority)}>{license.priority}</Badge>
                            </div>
                            <p className="text-sm mb-3">{license.description}</p>
                            <div className="grid gap-2 sm:grid-cols-3 text-sm">
                              <div className="flex items-center gap-1.5">
                                <DollarSign className="h-3.5 w-3.5 text-muted-foreground" />
                                <span className="text-muted-foreground">Cost:</span> {license.estimatedCost}
                              </div>
                              <div className="flex items-center gap-1.5">
                                <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                                <span className="text-muted-foreground">Processing:</span> {license.processingTime}
                              </div>
                              <div className="flex items-center gap-1.5">
                                <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                                <span className="text-muted-foreground">Renewal:</span> {license.renewalPeriod}
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Government Resources */}
                  <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2"><ExternalLink className="h-5 w-5 text-primary" />Official Government Resources</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        <a href="https://www.sba.gov/business-guide/launch-your-business/apply-licenses-permits" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 border rounded-lg hover:bg-background transition-colors">
                          <span className="text-lg">🏛️</span>
                          <div><p className="font-medium text-sm">U.S. Small Business Administration</p><p className="text-xs text-muted-foreground">Federal licenses & permits</p></div>
                        </a>
                        <a href="https://www.fda.gov/food/food-industry/retail-food-protection" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 border rounded-lg hover:bg-background transition-colors">
                          <span className="text-lg">🍽️</span>
                          <div><p className="font-medium text-sm">FDA Food Safety</p><p className="text-xs text-muted-foreground">Retail food protection</p></div>
                        </a>
                        <a href="https://www.usa.gov/state-health" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 border rounded-lg hover:bg-background transition-colors">
                          <span className="text-lg">🏥</span>
                          <div><p className="font-medium text-sm">State Health Departments</p><p className="text-xs text-muted-foreground">Find your state agency</p></div>
                        </a>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </div>
          </section>

          {/* FAQ */}
          <section className="py-16">
            <div className="container max-w-3xl">
              <Accordion type="single" collapsible>
                <AccordionItem value="q1">
                  <AccordionTrigger>Is this legal advice?</AccordionTrigger>
                  <AccordionContent>No. PermitPath provides general guidance only. Always verify with your local government agencies.</AccordionContent>
                </AccordionItem>
                <AccordionItem value="q2">
                  <AccordionTrigger>How often are requirements updated?</AccordionTrigger>
                  <AccordionContent>Our AI uses the latest available information, but regulations change frequently. Always check official sources.</AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
          </section>

          {/* Cross-Links */}
          <ToolCrossLinks 
            currentTool="permitpath" 
            title="Continue Building Your Business"
            subtitle="Got your permits sorted? Next, get equipment recommendations, set pricing, and create your listing."
          />

          {/* Final CTA */}
          <section className="py-20 bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-red-500/10">
            <div className="container text-center">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to get compliant?</h2>
              <p className="text-lg text-muted-foreground mb-8 max-w-xl mx-auto">Find your permit requirements now and start your business the right way.</p>
              <div className="flex flex-wrap gap-4 justify-center">
                <Button size="lg" variant="dark-shine" onClick={() => document.getElementById('tool-section')?.scrollIntoView({ behavior: 'smooth' })}>
                  Find My Permits
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

export default PermitPath;
