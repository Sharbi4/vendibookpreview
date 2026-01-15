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
  Check
} from 'lucide-react';

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

  return (
    <>
      <SEO
        title="AI Tools for Food Truck Operators | Vendibook"
        description="Free AI-powered tools to help grow your mobile food business. Generate pricing, write listing descriptions, and discover business ideas."
        canonical="/ai-tools"
      />
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
              <p className="text-xl text-muted-foreground max-w-3xl">
                Free AI-powered tools to help you price your listings, write compelling descriptions, 
                and discover new business opportunities.
              </p>
            </div>
          </section>

          {/* Tools Section */}
          <section className="py-12">
            <div className="container max-w-4xl">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-3 mb-8">
                  <TabsTrigger value="pricing" className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    <span className="hidden sm:inline">Pricing</span>
                  </TabsTrigger>
                  <TabsTrigger value="description" className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    <span className="hidden sm:inline">Description</span>
                  </TabsTrigger>
                  <TabsTrigger value="ideas" className="flex items-center gap-2">
                    <Lightbulb className="h-4 w-4" />
                    <span className="hidden sm:inline">Business Ideas</span>
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
              </Tabs>
            </div>
          </section>
        </main>

        <Footer />
      </div>
    </>
  );
};

export default AITools;
