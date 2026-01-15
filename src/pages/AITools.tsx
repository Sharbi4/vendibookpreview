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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  Sparkles, 
  DollarSign, 
  FileText, 
  Lightbulb, 
  Loader2, 
  ArrowLeft,
  TrendingUp,
  Copy,
  Check,
  Wrench,
  FileCheck,
  Search,
  AlertTriangle,
  Clock,
  MapPin,
  Shield,
  CheckCircle,
  ExternalLink
} from 'lucide-react';

// JSON-LD structured data for SEO
const toolsJsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "Vendibook AI Business Tools",
  "applicationCategory": "BusinessApplication",
  "operatingSystem": "Web",
  "offers": {
    "@type": "Offer",
    "price": "0",
    "priceCurrency": "USD"
  },
  "description": "Free AI-powered tools for food truck operators, mobile food vendors, and commercial kitchen owners. Includes pricing calculator, description generator, business idea generator, equipment maintenance guides, license finder, and industry research tools.",
  "featureList": [
    "AI Pricing Generator for Food Trucks and Trailers",
    "Listing Description Generator",
    "Food Business Idea Generator",
    "Commercial Kitchen Equipment Maintenance Guides",
    "Food Truck License and Permit Finder by State",
    "AI-Powered Industry Research"
  ]
};

interface PricingResult {
  dailyRate: number | null;
  weeklyRate: number | null;
  salePrice: number | null;
  reasoning: string;
  tips: string[];
}

interface DescriptionResult {
  description: string;
  headline: string;
  highlights: string[];
}

interface BusinessIdea {
  name: string;
  concept: string;
  targetMarket: string;
  menuHighlights: string[];
  estimatedStartup: string;
  uniqueAngle: string;
}

interface BusinessIdeaResult {
  ideas: BusinessIdea[];
}

interface EquipmentGuideResult {
  title: string;
  equipment: string;
  overview: string;
  maintenanceSchedule: {
    daily: string[];
    weekly: string[];
    monthly: string[];
    quarterly: string[];
  };
  stepByStepGuide: Array<{
    step: number;
    title: string;
    instructions: string;
    tips: string;
    warnings?: string;
  }>;
  troubleshooting: Array<{
    problem: string;
    cause: string;
    solution: string;
  }>;
  safetyTips: string[];
  estimatedTime: string;
  toolsNeeded: string[];
  professionalHelpNeeded: string;
}

interface LicenseResult {
  location: {
    city: string;
    state: string;
    stateAbbreviation: string;
  };
  businessType: string;
  overview: string;
  disclaimer: string;
  licenses: Array<{
    name: string;
    category: string;
    description: string;
    issuingAuthority: string;
    estimatedCost: string;
    renewalPeriod: string;
    processingTime: string;
    requirements: string[];
    websiteHint: string;
    priority: string;
  }>;
  insuranceRequirements: Array<{
    type: string;
    minimumCoverage: string;
    description: string;
  }>;
  inspectionRequirements: Array<{
    type: string;
    frequency: string;
    authority: string;
  }>;
  estimatedTotalCost: string;
  estimatedTimeline: string;
  tips: string[];
  commonMistakes: string[];
  helpfulResources: Array<{
    name: string;
    description: string;
    searchTerm: string;
  }>;
}

interface WebResearchResult {
  query: string;
  title: string;
  summary: string;
  sections: Array<{
    heading: string;
    content: string;
    keyPoints: string[];
  }>;
  quickFacts: Array<{
    label: string;
    value: string;
  }>;
  actionItems: string[];
  relatedTopics: string[];
  sources: string[];
  expertTips: string[];
}

const US_STATES = [
  { value: 'AL', label: 'Alabama' },
  { value: 'AK', label: 'Alaska' },
  { value: 'AZ', label: 'Arizona' },
  { value: 'AR', label: 'Arkansas' },
  { value: 'CA', label: 'California' },
  { value: 'CO', label: 'Colorado' },
  { value: 'CT', label: 'Connecticut' },
  { value: 'DE', label: 'Delaware' },
  { value: 'FL', label: 'Florida' },
  { value: 'GA', label: 'Georgia' },
  { value: 'HI', label: 'Hawaii' },
  { value: 'ID', label: 'Idaho' },
  { value: 'IL', label: 'Illinois' },
  { value: 'IN', label: 'Indiana' },
  { value: 'IA', label: 'Iowa' },
  { value: 'KS', label: 'Kansas' },
  { value: 'KY', label: 'Kentucky' },
  { value: 'LA', label: 'Louisiana' },
  { value: 'ME', label: 'Maine' },
  { value: 'MD', label: 'Maryland' },
  { value: 'MA', label: 'Massachusetts' },
  { value: 'MI', label: 'Michigan' },
  { value: 'MN', label: 'Minnesota' },
  { value: 'MS', label: 'Mississippi' },
  { value: 'MO', label: 'Missouri' },
  { value: 'MT', label: 'Montana' },
  { value: 'NE', label: 'Nebraska' },
  { value: 'NV', label: 'Nevada' },
  { value: 'NH', label: 'New Hampshire' },
  { value: 'NJ', label: 'New Jersey' },
  { value: 'NM', label: 'New Mexico' },
  { value: 'NY', label: 'New York' },
  { value: 'NC', label: 'North Carolina' },
  { value: 'ND', label: 'North Dakota' },
  { value: 'OH', label: 'Ohio' },
  { value: 'OK', label: 'Oklahoma' },
  { value: 'OR', label: 'Oregon' },
  { value: 'PA', label: 'Pennsylvania' },
  { value: 'RI', label: 'Rhode Island' },
  { value: 'SC', label: 'South Carolina' },
  { value: 'SD', label: 'South Dakota' },
  { value: 'TN', label: 'Tennessee' },
  { value: 'TX', label: 'Texas' },
  { value: 'UT', label: 'Utah' },
  { value: 'VT', label: 'Vermont' },
  { value: 'VA', label: 'Virginia' },
  { value: 'WA', label: 'Washington' },
  { value: 'WV', label: 'West Virginia' },
  { value: 'WI', label: 'Wisconsin' },
  { value: 'WY', label: 'Wyoming' },
  { value: 'DC', label: 'Washington D.C.' },
];

const AITools = () => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('pricing');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Pricing form state
  const [pricingForm, setPricingForm] = useState({
    category: '',
    location: '',
    mode: '',
    features: '',
    condition: '',
    additional: '',
  });
  const [pricingResult, setPricingResult] = useState<PricingResult | null>(null);

  // Description form state
  const [descriptionForm, setDescriptionForm] = useState({
    title: '',
    category: '',
    features: '',
    location: '',
    condition: '',
    unique: '',
  });
  const [descriptionResult, setDescriptionResult] = useState<DescriptionResult | null>(null);

  // Business idea form state
  const [ideaForm, setIdeaForm] = useState({
    cuisine: '',
    locationType: '',
    budget: '',
    experience: '',
    interests: '',
  });
  const [ideaResult, setIdeaResult] = useState<BusinessIdeaResult | null>(null);

  // Equipment guide form state
  const [equipmentForm, setEquipmentForm] = useState({
    equipment: '',
    issue: '',
    maintenanceType: 'general',
  });
  const [equipmentResult, setEquipmentResult] = useState<EquipmentGuideResult | null>(null);

  // License finder form state
  const [licenseForm, setLicenseForm] = useState({
    city: '',
    state: '',
    businessType: 'food_truck',
  });
  const [licenseResult, setLicenseResult] = useState<LicenseResult | null>(null);

  // Web research form state
  const [researchForm, setResearchForm] = useState({
    query: '',
    category: 'general',
  });
  const [researchResult, setResearchResult] = useState<WebResearchResult | null>(null);

  const callAITool = async (tool: string, data: Record<string, string>) => {
    setIsLoading(true);
    try {
      const { data: response, error } = await supabase.functions.invoke('ai-tools', {
        body: { tool, data },
      });

      if (error) throw error;
      if (response.error) {
        toast({
          title: 'Error',
          description: response.error,
          variant: 'destructive',
        });
        return null;
      }
      return response.result;
    } catch (error) {
      console.error('AI tool error:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate. Please try again.',
        variant: 'destructive',
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const callEquipmentGuide = async () => {
    setIsLoading(true);
    try {
      const { data: response, error } = await supabase.functions.invoke('ai-equipment-guide', {
        body: equipmentForm,
      });

      if (error) throw error;
      if (response.error) {
        toast({
          title: 'Error',
          description: response.error,
          variant: 'destructive',
        });
        return;
      }
      setEquipmentResult(response.result);
    } catch (error) {
      console.error('Equipment guide error:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate equipment guide. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const callLicenseFinder = async () => {
    setIsLoading(true);
    try {
      const { data: response, error } = await supabase.functions.invoke('ai-license-finder', {
        body: licenseForm,
      });

      if (error) throw error;
      if (response.error) {
        toast({
          title: 'Error',
          description: response.error,
          variant: 'destructive',
        });
        return;
      }
      setLicenseResult(response.result);
    } catch (error) {
      console.error('License finder error:', error);
      toast({
        title: 'Error',
        description: 'Failed to find license requirements. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const callWebResearch = async () => {
    setIsLoading(true);
    try {
      const { data: response, error } = await supabase.functions.invoke('ai-web-research', {
        body: researchForm,
      });

      if (error) throw error;
      if (response.error) {
        toast({
          title: 'Error',
          description: response.error,
          variant: 'destructive',
        });
        return;
      }
      setResearchResult(response.result);
    } catch (error) {
      console.error('Web research error:', error);
      toast({
        title: 'Error',
        description: 'Failed to research. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePricingSubmit = async () => {
    const result = await callAITool('pricing', pricingForm);
    if (result) setPricingResult(result);
  };

  const handleDescriptionSubmit = async () => {
    const result = await callAITool('description', descriptionForm);
    if (result) setDescriptionResult(result);
  };

  const handleIdeaSubmit = async () => {
    const result = await callAITool('business-idea', ideaForm);
    if (result) setIdeaResult(result);
  };

  const copyToClipboard = async (text: string, field: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedField(field);
    toast({ title: 'Copied to clipboard!' });
    setTimeout(() => setCopiedField(null), 2000);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'required': return 'destructive';
      case 'recommended': return 'default';
      default: return 'secondary';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'health': return <Shield className="h-4 w-4" />;
      case 'fire': return <AlertTriangle className="h-4 w-4" />;
      case 'state': return <MapPin className="h-4 w-4" />;
      case 'city': return <MapPin className="h-4 w-4" />;
      default: return <FileCheck className="h-4 w-4" />;
    }
  };

  return (
    <>
      <SEO
        title="Free AI Tools for Food Truck Business | Pricing, Licenses, Maintenance | Vendibook"
        description="Free AI-powered tools for food truck operators. Generate pricing, find permits & licenses by state, get equipment maintenance guides, write descriptions, and research the mobile food industry."
        canonical="/ai-tools"
      />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(toolsJsonLd) }} />
      <div className="min-h-screen flex flex-col bg-background">
        <Header />

        <main className="flex-1">
          {/* Hero Section */}
          <section className="bg-gradient-to-br from-primary/10 via-background to-secondary/10 py-16">
            <div className="container">
              <Link
                to="/"
                className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Home
              </Link>
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-primary/10 rounded-xl">
                  <Sparkles className="h-8 w-8 text-primary" />
                </div>
                <h1 className="text-4xl md:text-5xl font-bold text-foreground">
                  AI Business Tools
                </h1>
              </div>
              <p className="text-xl text-muted-foreground max-w-3xl mb-6">
                Free AI-powered tools to help you price listings, find licenses & permits, 
                maintain equipment, write descriptions, and research the mobile food industry.
              </p>
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary" className="text-sm">
                  <DollarSign className="h-3 w-3 mr-1" /> Pricing Generator
                </Badge>
                <Badge variant="secondary" className="text-sm">
                  <FileCheck className="h-3 w-3 mr-1" /> License Finder
                </Badge>
                <Badge variant="secondary" className="text-sm">
                  <Wrench className="h-3 w-3 mr-1" /> Equipment Guides
                </Badge>
                <Badge variant="secondary" className="text-sm">
                  <Search className="h-3 w-3 mr-1" /> AI Research
                </Badge>
              </div>
            </div>
          </section>

          {/* Tools Section */}
          <section className="py-12">
            <div className="container max-w-5xl">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-3 lg:grid-cols-6 mb-8 h-auto gap-1">
                  <TabsTrigger value="pricing" className="flex items-center gap-2 py-3">
                    <DollarSign className="h-4 w-4" />
                    <span className="hidden sm:inline">Pricing</span>
                  </TabsTrigger>
                  <TabsTrigger value="description" className="flex items-center gap-2 py-3">
                    <FileText className="h-4 w-4" />
                    <span className="hidden sm:inline">Description</span>
                  </TabsTrigger>
                  <TabsTrigger value="ideas" className="flex items-center gap-2 py-3">
                    <Lightbulb className="h-4 w-4" />
                    <span className="hidden sm:inline">Ideas</span>
                  </TabsTrigger>
                  <TabsTrigger value="equipment" className="flex items-center gap-2 py-3">
                    <Wrench className="h-4 w-4" />
                    <span className="hidden sm:inline">Equipment</span>
                  </TabsTrigger>
                  <TabsTrigger value="licenses" className="flex items-center gap-2 py-3">
                    <FileCheck className="h-4 w-4" />
                    <span className="hidden sm:inline">Licenses</span>
                  </TabsTrigger>
                  <TabsTrigger value="research" className="flex items-center gap-2 py-3">
                    <Search className="h-4 w-4" />
                    <span className="hidden sm:inline">Research</span>
                  </TabsTrigger>
                </TabsList>

                {/* Pricing Generator */}
                <TabsContent value="pricing">
                  <div className="grid gap-6 md:grid-cols-2">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <DollarSign className="h-5 w-5 text-primary" />
                          Pricing Generator
                        </CardTitle>
                        <CardDescription>
                          Get AI-suggested pricing based on your asset details and market conditions.
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid gap-4 sm:grid-cols-2">
                          <div className="space-y-2">
                            <Label>Category</Label>
                            <Select
                              value={pricingForm.category}
                              onValueChange={(v) => setPricingForm({ ...pricingForm, category: v })}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select type" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="food_truck">Food Truck</SelectItem>
                                <SelectItem value="food_trailer">Food Trailer</SelectItem>
                                <SelectItem value="ghost_kitchen">Ghost Kitchen</SelectItem>
                                <SelectItem value="vendor_lot">Vendor Lot</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label>Mode</Label>
                            <Select
                              value={pricingForm.mode}
                              onValueChange={(v) => setPricingForm({ ...pricingForm, mode: v })}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Rent or Sale" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="rent">For Rent</SelectItem>
                                <SelectItem value="sale">For Sale</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>Location</Label>
                          <Input
                            placeholder="City, State"
                            value={pricingForm.location}
                            onChange={(e) => setPricingForm({ ...pricingForm, location: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Condition</Label>
                          <Select
                            value={pricingForm.condition}
                            onValueChange={(v) => setPricingForm({ ...pricingForm, condition: v })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select condition" />
                            </SelectTrigger>
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
                          <Textarea
                            placeholder="List key equipment: fryer, griddle, refrigeration, generator, etc."
                            value={pricingForm.features}
                            onChange={(e) => setPricingForm({ ...pricingForm, features: e.target.value })}
                            rows={3}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Additional Details (Optional)</Label>
                          <Textarea
                            placeholder="Year, brand, recent upgrades, unique features..."
                            value={pricingForm.additional}
                            onChange={(e) => setPricingForm({ ...pricingForm, additional: e.target.value })}
                            rows={2}
                          />
                        </div>
                        <Button
                          onClick={handlePricingSubmit}
                          disabled={isLoading || !pricingForm.category}
                          className="w-full"
                        >
                          {isLoading ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Generating...
                            </>
                          ) : (
                            <>
                              <Sparkles className="h-4 w-4 mr-2" />
                              Generate Pricing
                            </>
                          )}
                        </Button>
                      </CardContent>
                    </Card>

                    {/* Pricing Results */}
                    <Card className={pricingResult ? '' : 'flex items-center justify-center'}>
                      {pricingResult ? (
                        <>
                          <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                              <TrendingUp className="h-5 w-5 text-green-500" />
                              Suggested Pricing
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <div className="grid gap-3">
                              {pricingResult.dailyRate && (
                                <div className="p-4 bg-primary/5 rounded-lg">
                                  <p className="text-sm text-muted-foreground">Daily Rate</p>
                                  <p className="text-2xl font-bold text-primary">
                                    ${pricingResult.dailyRate.toLocaleString()}/day
                                  </p>
                                </div>
                              )}
                              {pricingResult.weeklyRate && (
                                <div className="p-4 bg-primary/5 rounded-lg">
                                  <p className="text-sm text-muted-foreground">Weekly Rate</p>
                                  <p className="text-2xl font-bold text-primary">
                                    ${pricingResult.weeklyRate.toLocaleString()}/week
                                  </p>
                                </div>
                              )}
                              {pricingResult.salePrice && (
                                <div className="p-4 bg-green-500/10 rounded-lg">
                                  <p className="text-sm text-muted-foreground">Sale Price</p>
                                  <p className="text-2xl font-bold text-green-600">
                                    ${pricingResult.salePrice.toLocaleString()}
                                  </p>
                                </div>
                              )}
                            </div>
                            <div className="pt-4 border-t">
                              <p className="text-sm text-muted-foreground mb-3">{pricingResult.reasoning}</p>
                              {pricingResult.tips && (
                                <div className="space-y-2">
                                  <p className="text-sm font-medium">Tips:</p>
                                  <ul className="text-sm text-muted-foreground space-y-1">
                                    {pricingResult.tips.map((tip, i) => (
                                      <li key={i} className="flex items-start gap-2">
                                        <span className="text-primary">•</span>
                                        {tip}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </>
                      ) : (
                        <div className="text-center p-8 text-muted-foreground">
                          <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-20" />
                          <p>Fill in the details and generate pricing suggestions</p>
                        </div>
                      )}
                    </Card>
                  </div>
                </TabsContent>

                {/* Description Generator */}
                <TabsContent value="description">
                  <div className="grid gap-6 md:grid-cols-2">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <FileText className="h-5 w-5 text-primary" />
                          Description Generator
                        </CardTitle>
                        <CardDescription>
                          Create compelling listing descriptions that convert browsers into bookers.
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="space-y-2">
                          <Label>Listing Title</Label>
                          <Input
                            placeholder="e.g., 2019 Custom Food Truck with Full Kitchen"
                            value={descriptionForm.title}
                            onChange={(e) => setDescriptionForm({ ...descriptionForm, title: e.target.value })}
                          />
                        </div>
                        <div className="grid gap-4 sm:grid-cols-2">
                          <div className="space-y-2">
                            <Label>Category</Label>
                            <Select
                              value={descriptionForm.category}
                              onValueChange={(v) => setDescriptionForm({ ...descriptionForm, category: v })}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select type" />
                              </SelectTrigger>
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
                            <Select
                              value={descriptionForm.condition}
                              onValueChange={(v) => setDescriptionForm({ ...descriptionForm, condition: v })}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select condition" />
                              </SelectTrigger>
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
                          <Input
                            placeholder="City, State"
                            value={descriptionForm.location}
                            onChange={(e) => setDescriptionForm({ ...descriptionForm, location: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Key Features & Equipment</Label>
                          <Textarea
                            placeholder="List equipment, dimensions, capacity, amenities..."
                            value={descriptionForm.features}
                            onChange={(e) => setDescriptionForm({ ...descriptionForm, features: e.target.value })}
                            rows={3}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>What Makes It Special?</Label>
                          <Textarea
                            placeholder="Recent upgrades, unique features, success stories..."
                            value={descriptionForm.unique}
                            onChange={(e) => setDescriptionForm({ ...descriptionForm, unique: e.target.value })}
                            rows={2}
                          />
                        </div>
                        <Button
                          onClick={handleDescriptionSubmit}
                          disabled={isLoading || !descriptionForm.title}
                          className="w-full"
                        >
                          {isLoading ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Generating...
                            </>
                          ) : (
                            <>
                              <Sparkles className="h-4 w-4 mr-2" />
                              Generate Description
                            </>
                          )}
                        </Button>
                      </CardContent>
                    </Card>

                    {/* Description Results */}
                    <Card className={descriptionResult ? '' : 'flex items-center justify-center'}>
                      {descriptionResult ? (
                        <>
                          <CardHeader>
                            <CardTitle className="flex items-center justify-between">
                              <span>Generated Content</span>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => copyToClipboard(descriptionResult.description, 'description')}
                              >
                                {copiedField === 'description' ? (
                                  <Check className="h-4 w-4 text-green-500" />
                                ) : (
                                  <Copy className="h-4 w-4" />
                                )}
                              </Button>
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <div className="p-3 bg-primary/5 rounded-lg">
                              <p className="text-sm text-muted-foreground mb-1">Headline</p>
                              <p className="font-semibold">{descriptionResult.headline}</p>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground mb-2">Description</p>
                              <p className="text-sm leading-relaxed whitespace-pre-wrap">
                                {descriptionResult.description}
                              </p>
                            </div>
                            {descriptionResult.highlights && (
                              <div className="pt-4 border-t">
                                <p className="text-sm text-muted-foreground mb-2">Highlights</p>
                                <div className="flex flex-wrap gap-2">
                                  {descriptionResult.highlights.map((h, i) => (
                                    <Badge key={i} variant="secondary">{h}</Badge>
                                  ))}
                                </div>
                              </div>
                            )}
                          </CardContent>
                        </>
                      ) : (
                        <div className="text-center p-8 text-muted-foreground">
                          <FileText className="h-12 w-12 mx-auto mb-4 opacity-20" />
                          <p>Fill in the details and generate a compelling description</p>
                        </div>
                      )}
                    </Card>
                  </div>
                </TabsContent>

                {/* Business Ideas Generator */}
                <TabsContent value="ideas">
                  <div className="space-y-6">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Lightbulb className="h-5 w-5 text-primary" />
                          Business Idea Generator
                        </CardTitle>
                        <CardDescription>
                          Discover creative food business concepts tailored to your interests and market.
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                          <div className="space-y-2">
                            <Label>Preferred Cuisine/Style</Label>
                            <Input
                              placeholder="e.g., Mexican, BBQ, Fusion, Healthy..."
                              value={ideaForm.cuisine}
                              onChange={(e) => setIdeaForm({ ...ideaForm, cuisine: e.target.value })}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Target Location Type</Label>
                            <Select
                              value={ideaForm.locationType}
                              onValueChange={(v) => setIdeaForm({ ...ideaForm, locationType: v })}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select location" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="urban">Urban / Downtown</SelectItem>
                                <SelectItem value="suburban">Suburban</SelectItem>
                                <SelectItem value="events">Events & Festivals</SelectItem>
                                <SelectItem value="office">Office Parks</SelectItem>
                                <SelectItem value="beach">Beach / Tourist Areas</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label>Budget Level</Label>
                            <Select
                              value={ideaForm.budget}
                              onValueChange={(v) => setIdeaForm({ ...ideaForm, budget: v })}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select budget" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="low">Low ($10k-$30k)</SelectItem>
                                <SelectItem value="medium">Medium ($30k-$75k)</SelectItem>
                                <SelectItem value="high">High ($75k+)</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label>Experience Level</Label>
                            <Select
                              value={ideaForm.experience}
                              onValueChange={(v) => setIdeaForm({ ...ideaForm, experience: v })}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select experience" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="beginner">Beginner</SelectItem>
                                <SelectItem value="some">Some Experience</SelectItem>
                                <SelectItem value="experienced">Experienced Operator</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2 sm:col-span-2">
                            <Label>Interests & Passions</Label>
                            <Input
                              placeholder="e.g., sustainability, comfort food, late-night dining..."
                              value={ideaForm.interests}
                              onChange={(e) => setIdeaForm({ ...ideaForm, interests: e.target.value })}
                            />
                          </div>
                        </div>
                        <Button
                          onClick={handleIdeaSubmit}
                          disabled={isLoading}
                          className="w-full mt-6"
                        >
                          {isLoading ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Generating Ideas...
                            </>
                          ) : (
                            <>
                              <Sparkles className="h-4 w-4 mr-2" />
                              Generate Business Ideas
                            </>
                          )}
                        </Button>
                      </CardContent>
                    </Card>

                    {/* Business Ideas Results */}
                    {ideaResult?.ideas && ideaResult.ideas.length > 0 && (
                      <div className="grid gap-4 md:grid-cols-3">
                        {ideaResult.ideas.map((idea, index) => (
                          <Card key={index} className="overflow-hidden">
                            <div className="h-2 bg-gradient-to-r from-primary to-primary/50" />
                            <CardHeader>
                              <CardTitle className="text-lg">{idea.name}</CardTitle>
                              <CardDescription>{idea.concept}</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                              <div>
                                <p className="text-sm font-medium mb-1">Target Market</p>
                                <p className="text-sm text-muted-foreground">{idea.targetMarket}</p>
                              </div>
                              <div>
                                <p className="text-sm font-medium mb-2">Menu Highlights</p>
                                <div className="flex flex-wrap gap-1">
                                  {idea.menuHighlights.map((item, i) => (
                                    <Badge key={i} variant="outline" className="text-xs">
                                      {item}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                              <div className="pt-3 border-t">
                                <div className="flex items-center justify-between text-sm">
                                  <span className="text-muted-foreground">Startup Cost</span>
                                  <Badge variant={
                                    idea.estimatedStartup === 'Low' ? 'secondary' :
                                    idea.estimatedStartup === 'Medium' ? 'default' : 'destructive'
                                  }>
                                    {idea.estimatedStartup}
                                  </Badge>
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

                    {!ideaResult && (
                      <Card className="flex items-center justify-center p-12">
                        <div className="text-center text-muted-foreground">
                          <Lightbulb className="h-12 w-12 mx-auto mb-4 opacity-20" />
                          <p>Fill in your preferences and discover unique business ideas</p>
                        </div>
                      </Card>
                    )}
                  </div>
                </TabsContent>

                {/* Equipment Maintenance Guide */}
                <TabsContent value="equipment">
                  <div className="space-y-6">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Wrench className="h-5 w-5 text-primary" />
                          Equipment Maintenance Guide
                        </CardTitle>
                        <CardDescription>
                          Get detailed maintenance guides, troubleshooting tips, and care instructions for commercial kitchen equipment.
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                          <div className="space-y-2 lg:col-span-2">
                            <Label>Equipment Name</Label>
                            <Input
                              placeholder="e.g., Commercial Deep Fryer, Flat Top Griddle, Walk-in Cooler..."
                              value={equipmentForm.equipment}
                              onChange={(e) => setEquipmentForm({ ...equipmentForm, equipment: e.target.value })}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Guide Focus</Label>
                            <Select
                              value={equipmentForm.maintenanceType}
                              onValueChange={(v) => setEquipmentForm({ ...equipmentForm, maintenanceType: v })}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select focus" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="general">General Maintenance</SelectItem>
                                <SelectItem value="preventive">Preventive Care</SelectItem>
                                <SelectItem value="troubleshooting">Troubleshooting</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2 sm:col-span-2 lg:col-span-3">
                            <Label>Specific Issue or Concern (Optional)</Label>
                            <Textarea
                              placeholder="Describe any specific problems, symptoms, or areas you need help with..."
                              value={equipmentForm.issue}
                              onChange={(e) => setEquipmentForm({ ...equipmentForm, issue: e.target.value })}
                              rows={2}
                            />
                          </div>
                        </div>
                        <Button
                          onClick={callEquipmentGuide}
                          disabled={isLoading || !equipmentForm.equipment}
                          className="w-full mt-6"
                        >
                          {isLoading ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Generating Guide...
                            </>
                          ) : (
                            <>
                              <Sparkles className="h-4 w-4 mr-2" />
                              Generate Maintenance Guide
                            </>
                          )}
                        </Button>
                      </CardContent>
                    </Card>

                    {/* Equipment Results */}
                    {equipmentResult ? (
                      <Card>
                        <CardHeader>
                          <CardTitle>{equipmentResult.title}</CardTitle>
                          <CardDescription>{equipmentResult.overview}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                            <div className="p-3 bg-muted rounded-lg">
                              <Clock className="h-4 w-4 text-muted-foreground mb-1" />
                              <p className="text-xs text-muted-foreground">Estimated Time</p>
                              <p className="text-sm font-medium">{equipmentResult.estimatedTime}</p>
                            </div>
                            <div className="p-3 bg-muted rounded-lg col-span-2 lg:col-span-3">
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
                                      <li key={i} className="flex gap-1">
                                        <CheckCircle className="h-3 w-3 text-green-500 shrink-0 mt-0.5" />
                                        {task}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Step by Step Guide */}
                          <div>
                            <h3 className="font-semibold mb-3">Step-by-Step Guide</h3>
                            <Accordion type="single" collapsible className="w-full">
                              {equipmentResult.stepByStepGuide.map((step, i) => (
                                <AccordionItem key={i} value={`step-${i}`}>
                                  <AccordionTrigger>
                                    <span className="flex items-center gap-2">
                                      <Badge variant="outline">{step.step}</Badge>
                                      {step.title}
                                    </span>
                                  </AccordionTrigger>
                                  <AccordionContent className="space-y-3">
                                    <p className="text-sm">{step.instructions}</p>
                                    {step.tips && (
                                      <div className="p-2 bg-blue-50 dark:bg-blue-950 rounded text-sm">
                                        <strong>Pro Tip:</strong> {step.tips}
                                      </div>
                                    )}
                                    {step.warnings && (
                                      <div className="p-2 bg-yellow-50 dark:bg-yellow-950 rounded text-sm flex gap-2">
                                        <AlertTriangle className="h-4 w-4 text-yellow-600 shrink-0" />
                                        <span>{step.warnings}</span>
                                      </div>
                                    )}
                                  </AccordionContent>
                                </AccordionItem>
                              ))}
                            </Accordion>
                          </div>

                          {/* Troubleshooting */}
                          {equipmentResult.troubleshooting.length > 0 && (
                            <div>
                              <h3 className="font-semibold mb-3">Troubleshooting</h3>
                              <div className="space-y-2">
                                {equipmentResult.troubleshooting.map((item, i) => (
                                  <div key={i} className="p-3 border rounded-lg">
                                    <p className="font-medium text-sm text-destructive">{item.problem}</p>
                                    <p className="text-xs text-muted-foreground mt-1"><strong>Cause:</strong> {item.cause}</p>
                                    <p className="text-xs text-muted-foreground"><strong>Solution:</strong> {item.solution}</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Safety Tips */}
                          <div className="p-4 bg-yellow-50 dark:bg-yellow-950 rounded-lg">
                            <h3 className="font-semibold mb-2 flex items-center gap-2">
                              <AlertTriangle className="h-4 w-4 text-yellow-600" />
                              Safety Tips
                            </h3>
                            <ul className="text-sm space-y-1">
                              {equipmentResult.safetyTips.map((tip, i) => (
                                <li key={i} className="flex gap-2">
                                  <span>•</span>
                                  {tip}
                                </li>
                              ))}
                            </ul>
                          </div>

                          <div className="p-4 bg-muted rounded-lg">
                            <h3 className="font-semibold mb-2">When to Call a Professional</h3>
                            <p className="text-sm text-muted-foreground">{equipmentResult.professionalHelpNeeded}</p>
                          </div>
                        </CardContent>
                      </Card>
                    ) : (
                      <Card className="flex items-center justify-center p-12">
                        <div className="text-center text-muted-foreground">
                          <Wrench className="h-12 w-12 mx-auto mb-4 opacity-20" />
                          <p>Enter your equipment to get a comprehensive maintenance guide</p>
                        </div>
                      </Card>
                    )}
                  </div>
                </TabsContent>

                {/* License Finder */}
                <TabsContent value="licenses">
                  <div className="space-y-6">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <FileCheck className="h-5 w-5 text-primary" />
                          License & Permit Finder
                        </CardTitle>
                        <CardDescription>
                          Find all the licenses, permits, and requirements needed to operate your mobile food business in any state.
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="grid gap-4 sm:grid-cols-3">
                          <div className="space-y-2">
                            <Label>State *</Label>
                            <Select
                              value={licenseForm.state}
                              onValueChange={(v) => setLicenseForm({ ...licenseForm, state: v })}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select state" />
                              </SelectTrigger>
                              <SelectContent>
                                {US_STATES.map((state) => (
                                  <SelectItem key={state.value} value={state.label}>
                                    {state.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label>City (Optional)</Label>
                            <Input
                              placeholder="e.g., Austin, Miami, Portland..."
                              value={licenseForm.city}
                              onChange={(e) => setLicenseForm({ ...licenseForm, city: e.target.value })}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Business Type</Label>
                            <Select
                              value={licenseForm.businessType}
                              onValueChange={(v) => setLicenseForm({ ...licenseForm, businessType: v })}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select type" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="food_truck">Food Truck</SelectItem>
                                <SelectItem value="food_trailer">Food Trailer</SelectItem>
                                <SelectItem value="ghost_kitchen">Ghost Kitchen</SelectItem>
                                <SelectItem value="vendor_lot">Mobile Vendor</SelectItem>
                                <SelectItem value="catering">Catering Business</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <Button
                          onClick={callLicenseFinder}
                          disabled={isLoading || !licenseForm.state}
                          className="w-full mt-6"
                        >
                          {isLoading ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Finding Requirements...
                            </>
                          ) : (
                            <>
                              <Sparkles className="h-4 w-4 mr-2" />
                              Find License Requirements
                            </>
                          )}
                        </Button>
                      </CardContent>
                    </Card>

                    {/* License Results */}
                    {licenseResult ? (
                      <div className="space-y-6">
                        <Card>
                          <CardHeader>
                            <div className="flex items-start justify-between">
                              <div>
                                <CardTitle className="flex items-center gap-2">
                                  <MapPin className="h-5 w-5 text-primary" />
                                  {licenseResult.location.city ? `${licenseResult.location.city}, ${licenseResult.location.state}` : licenseResult.location.state}
                                </CardTitle>
                                <CardDescription>{licenseResult.businessType} Requirements</CardDescription>
                              </div>
                              <div className="text-right">
                                <p className="text-sm font-medium">Est. Total Cost</p>
                                <p className="text-lg font-bold text-primary">{licenseResult.estimatedTotalCost}</p>
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent>
                            <p className="text-sm text-muted-foreground mb-4">{licenseResult.overview}</p>
                            <div className="flex gap-2 flex-wrap mb-4">
                              <Badge variant="outline" className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {licenseResult.estimatedTimeline}
                              </Badge>
                            </div>
                            <div className="p-3 bg-yellow-50 dark:bg-yellow-950 rounded-lg text-sm">
                              <AlertTriangle className="h-4 w-4 text-yellow-600 inline mr-2" />
                              {licenseResult.disclaimer}
                            </div>
                          </CardContent>
                        </Card>

                        {/* Licenses Grid */}
                        <div>
                          <h3 className="font-semibold text-lg mb-4">Required Licenses & Permits</h3>
                          <div className="grid gap-4 md:grid-cols-2">
                            {licenseResult.licenses.map((license, i) => (
                              <Card key={i} className="overflow-hidden">
                                <div className={`h-1 ${
                                  license.priority === 'required' ? 'bg-destructive' :
                                  license.priority === 'recommended' ? 'bg-primary' : 'bg-muted'
                                }`} />
                                <CardHeader className="pb-2">
                                  <div className="flex items-start justify-between gap-2">
                                    <CardTitle className="text-base flex items-center gap-2">
                                      {getCategoryIcon(license.category)}
                                      {license.name}
                                    </CardTitle>
                                    <Badge variant={getPriorityColor(license.priority)}>
                                      {license.priority}
                                    </Badge>
                                  </div>
                                  <CardDescription>{license.description}</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-3 text-sm">
                                  <div className="grid grid-cols-2 gap-2">
                                    <div>
                                      <p className="text-xs text-muted-foreground">Cost</p>
                                      <p className="font-medium">{license.estimatedCost}</p>
                                    </div>
                                    <div>
                                      <p className="text-xs text-muted-foreground">Processing Time</p>
                                      <p className="font-medium">{license.processingTime}</p>
                                    </div>
                                  </div>
                                  <div>
                                    <p className="text-xs text-muted-foreground">Issuing Authority</p>
                                    <p>{license.issuingAuthority}</p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-muted-foreground">Renewal</p>
                                    <p>{license.renewalPeriod}</p>
                                  </div>
                                  {license.requirements.length > 0 && (
                                    <div>
                                      <p className="text-xs text-muted-foreground mb-1">Requirements</p>
                                      <ul className="text-xs space-y-0.5">
                                        {license.requirements.slice(0, 3).map((req, j) => (
                                          <li key={j} className="flex gap-1">
                                            <CheckCircle className="h-3 w-3 text-green-500 shrink-0 mt-0.5" />
                                            {req}
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        </div>

                        {/* Insurance Requirements */}
                        {licenseResult.insuranceRequirements.length > 0 && (
                          <Card>
                            <CardHeader>
                              <CardTitle className="text-lg flex items-center gap-2">
                                <Shield className="h-5 w-5" />
                                Insurance Requirements
                              </CardTitle>
                            </CardHeader>
                            <CardContent>
                              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                                {licenseResult.insuranceRequirements.map((ins, i) => (
                                  <div key={i} className="p-3 border rounded-lg">
                                    <p className="font-medium text-sm">{ins.type}</p>
                                    <p className="text-xs text-muted-foreground mt-1">{ins.description}</p>
                                    <p className="text-sm font-medium text-primary mt-2">{ins.minimumCoverage}</p>
                                  </div>
                                ))}
                              </div>
                            </CardContent>
                          </Card>
                        )}

                        {/* Tips and Mistakes */}
                        <div className="grid gap-4 md:grid-cols-2">
                          <Card>
                            <CardHeader>
                              <CardTitle className="text-base text-green-600">Pro Tips</CardTitle>
                            </CardHeader>
                            <CardContent>
                              <ul className="space-y-2 text-sm">
                                {licenseResult.tips.map((tip, i) => (
                                  <li key={i} className="flex gap-2">
                                    <CheckCircle className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                                    {tip}
                                  </li>
                                ))}
                              </ul>
                            </CardContent>
                          </Card>
                          <Card>
                            <CardHeader>
                              <CardTitle className="text-base text-destructive">Common Mistakes</CardTitle>
                            </CardHeader>
                            <CardContent>
                              <ul className="space-y-2 text-sm">
                                {licenseResult.commonMistakes.map((mistake, i) => (
                                  <li key={i} className="flex gap-2">
                                    <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                                    {mistake}
                                  </li>
                                ))}
                              </ul>
                            </CardContent>
                          </Card>
                        </div>
                      </div>
                    ) : (
                      <Card className="flex items-center justify-center p-12">
                        <div className="text-center text-muted-foreground">
                          <FileCheck className="h-12 w-12 mx-auto mb-4 opacity-20" />
                          <p>Select your state to find license and permit requirements</p>
                        </div>
                      </Card>
                    )}
                  </div>
                </TabsContent>

                {/* Web Research */}
                <TabsContent value="research">
                  <div className="space-y-6">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Search className="h-5 w-5 text-primary" />
                          AI Industry Research
                        </CardTitle>
                        <CardDescription>
                          Get comprehensive, AI-powered research on any food truck or commercial kitchen topic.
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="grid gap-4 sm:grid-cols-3">
                          <div className="space-y-2 sm:col-span-2">
                            <Label>What do you want to research?</Label>
                            <Input
                              placeholder="e.g., Best practices for food truck menu pricing, How to pass health inspections..."
                              value={researchForm.query}
                              onChange={(e) => setResearchForm({ ...researchForm, query: e.target.value })}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Category</Label>
                            <Select
                              value={researchForm.category}
                              onValueChange={(v) => setResearchForm({ ...researchForm, category: v })}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select category" />
                              </SelectTrigger>
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
                        <Button
                          onClick={callWebResearch}
                          disabled={isLoading || !researchForm.query}
                          className="w-full mt-6"
                        >
                          {isLoading ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Researching...
                            </>
                          ) : (
                            <>
                              <Sparkles className="h-4 w-4 mr-2" />
                              Research This Topic
                            </>
                          )}
                        </Button>
                      </CardContent>
                    </Card>

                    {/* Research Results */}
                    {researchResult ? (
                      <div className="space-y-6">
                        <Card>
                          <CardHeader>
                            <CardTitle>{researchResult.title}</CardTitle>
                            <CardDescription>{researchResult.summary}</CardDescription>
                          </CardHeader>
                          <CardContent>
                            {/* Quick Facts */}
                            {researchResult.quickFacts.length > 0 && (
                              <div className="flex flex-wrap gap-2 mb-6">
                                {researchResult.quickFacts.map((fact, i) => (
                                  <Badge key={i} variant="secondary" className="text-sm py-1">
                                    <strong>{fact.label}:</strong>&nbsp;{fact.value}
                                  </Badge>
                                ))}
                              </div>
                            )}

                            {/* Sections */}
                            <div className="space-y-6">
                              {researchResult.sections.map((section, i) => (
                                <div key={i} className="border-l-2 border-primary pl-4">
                                  <h3 className="font-semibold mb-2">{section.heading}</h3>
                                  <p className="text-sm text-muted-foreground mb-3">{section.content}</p>
                                  {section.keyPoints.length > 0 && (
                                    <ul className="text-sm space-y-1">
                                      {section.keyPoints.map((point, j) => (
                                        <li key={j} className="flex gap-2">
                                          <CheckCircle className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                                          {point}
                                        </li>
                                      ))}
                                    </ul>
                                  )}
                                </div>
                              ))}
                            </div>
                          </CardContent>
                        </Card>

                        <div className="grid gap-4 md:grid-cols-2">
                          {/* Action Items */}
                          {researchResult.actionItems.length > 0 && (
                            <Card>
                              <CardHeader>
                                <CardTitle className="text-base">Action Items</CardTitle>
                              </CardHeader>
                              <CardContent>
                                <ul className="space-y-2 text-sm">
                                  {researchResult.actionItems.map((item, i) => (
                                    <li key={i} className="flex gap-2">
                                      <span className="font-bold text-primary">{i + 1}.</span>
                                      {item}
                                    </li>
                                  ))}
                                </ul>
                              </CardContent>
                            </Card>
                          )}

                          {/* Expert Tips */}
                          {researchResult.expertTips.length > 0 && (
                            <Card>
                              <CardHeader>
                                <CardTitle className="text-base">Expert Tips</CardTitle>
                              </CardHeader>
                              <CardContent>
                                <ul className="space-y-2 text-sm">
                                  {researchResult.expertTips.map((tip, i) => (
                                    <li key={i} className="flex gap-2">
                                      <Lightbulb className="h-4 w-4 text-yellow-500 shrink-0 mt-0.5" />
                                      {tip}
                                    </li>
                                  ))}
                                </ul>
                              </CardContent>
                            </Card>
                          )}
                        </div>

                        {/* Related Topics */}
                        {researchResult.relatedTopics.length > 0 && (
                          <Card>
                            <CardHeader>
                              <CardTitle className="text-base">Related Topics to Explore</CardTitle>
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
                                  >
                                    {topic}
                                    <ExternalLink className="h-3 w-3 ml-1" />
                                  </Button>
                                ))}
                              </div>
                            </CardContent>
                          </Card>
                        )}
                      </div>
                    ) : (
                      <Card className="flex items-center justify-center p-12">
                        <div className="text-center text-muted-foreground">
                          <Search className="h-12 w-12 mx-auto mb-4 opacity-20" />
                          <p>Enter a topic to get comprehensive AI-powered research</p>
                        </div>
                      </Card>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </section>

          {/* SEO Content Section */}
          <section className="py-12 bg-muted/30">
            <div className="container max-w-4xl">
              <h2 className="text-2xl font-bold mb-6">Free AI Tools for Food Truck Operators</h2>
              <div className="prose prose-sm max-w-none text-muted-foreground">
                <p className="mb-4">
                  Vendibook's AI-powered business tools help food truck owners, mobile vendors, and commercial kitchen operators 
                  make smarter decisions. Whether you're starting a new food truck business or optimizing an existing operation, 
                  our free tools provide the insights you need.
                </p>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mt-6">
                  <div className="p-4 bg-background rounded-lg border">
                    <h3 className="font-semibold text-foreground mb-2">Pricing Calculator</h3>
                    <p className="text-sm">Get market-based pricing suggestions for food trucks, trailers, and ghost kitchens.</p>
                  </div>
                  <div className="p-4 bg-background rounded-lg border">
                    <h3 className="font-semibold text-foreground mb-2">License Finder</h3>
                    <p className="text-sm">Find all permits and licenses required in your state and city to legally operate.</p>
                  </div>
                  <div className="p-4 bg-background rounded-lg border">
                    <h3 className="font-semibold text-foreground mb-2">Equipment Guides</h3>
                    <p className="text-sm">Detailed maintenance guides for commercial fryers, griddles, refrigeration, and more.</p>
                  </div>
                  <div className="p-4 bg-background rounded-lg border">
                    <h3 className="font-semibold text-foreground mb-2">Description Writer</h3>
                    <p className="text-sm">Generate compelling listing descriptions that convert browsers into customers.</p>
                  </div>
                  <div className="p-4 bg-background rounded-lg border">
                    <h3 className="font-semibold text-foreground mb-2">Business Ideas</h3>
                    <p className="text-sm">Discover unique food truck concepts tailored to your interests and budget.</p>
                  </div>
                  <div className="p-4 bg-background rounded-lg border">
                    <h3 className="font-semibold text-foreground mb-2">Industry Research</h3>
                    <p className="text-sm">Get AI-powered answers to any food service business question.</p>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </main>

        <Footer />
      </div>
    </>
  );
};

export default AITools;
