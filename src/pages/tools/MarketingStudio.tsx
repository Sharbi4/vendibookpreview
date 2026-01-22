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
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  Megaphone, 
  Loader2, 
  Home,
  Sparkles,
  ArrowRight,
  Instagram,
  Mail,
  FileImage,
  Type,
  Utensils,
  Copy,
  Check,
  Image,
  Download,
  Hash,
  Clock
} from 'lucide-react';
import ToolCrossLinks from '@/components/tools/ToolCrossLinks';

const pageJsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "Vendi Marketing Studio - AI Marketing Materials Creator",
  "applicationCategory": "BusinessApplication",
  "operatingSystem": "Web",
  "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" },
  "description": "Create social media posts, flyers, emails, menu descriptions, taglines, and marketing images with AI.",
  "featureList": ["Social media posts", "Flyer copy", "Email campaigns", "Menu descriptions", "Taglines", "AI image generation"]
};

type ContentType = 'social-post' | 'flyer' | 'promo-email' | 'menu-description' | 'tagline' | 'image';

const MarketingStudio = () => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<ContentType>('social-post');
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);

  // Form states
  const [socialForm, setSocialForm] = useState({
    businessName: '', businessType: '', purpose: '', keyMessage: '', audience: '', tone: '', offer: ''
  });
  const [flyerForm, setFlyerForm] = useState({
    businessName: '', promotion: '', dateTime: '', location: '', offer: '', audience: '', sellingPoints: ''
  });
  const [emailForm, setEmailForm] = useState({
    businessName: '', purpose: '', offer: '', audience: '', tone: '', goal: ''
  });
  const [menuForm, setMenuForm] = useState({
    businessName: '', cuisine: '', items: '', personality: '', priceRange: ''
  });
  const [taglineForm, setTaglineForm] = useState({
    businessName: '', businessType: '', specialty: '', personality: '', usp: '', audience: ''
  });
  const [imageForm, setImageForm] = useState({
    prompt: '', style: '', purpose: '', platform: ''
  });

  const handleGenerate = async () => {
    setIsLoading(true);
    setResult(null);
    
    let data: Record<string, string> = {};
    switch (activeTab) {
      case 'social-post': data = socialForm; break;
      case 'flyer': data = flyerForm; break;
      case 'promo-email': data = emailForm; break;
      case 'menu-description': data = menuForm; break;
      case 'tagline': data = taglineForm; break;
      case 'image': data = imageForm; break;
    }

    try {
      const { data: response, error } = await supabase.functions.invoke('ai-marketing-creator', {
        body: { type: activeTab, data },
      });
      
      if (error) throw error;
      if (response.error) {
        toast({ title: 'Error', description: response.error, variant: 'destructive' });
        return;
      }
      setResult(response.result);
      toast({ title: 'Success!', description: 'Marketing content generated.' });
    } catch (error) {
      console.error('Marketing creator error:', error);
      toast({ title: 'Error', description: 'Failed to generate content. Please try again.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = async (text: string, field: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedField(field);
    toast({ title: 'Copied to clipboard!' });
    setTimeout(() => setCopiedField(null), 2000);
  };

  const CopyButton = ({ text, field }: { text: string; field: string }) => (
    <Button variant="ghost" size="sm" onClick={() => copyToClipboard(text, field)} className="h-8">
      {copiedField === field ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
    </Button>
  );

  return (
    <>
      <SEO
        title="Vendi Marketing Studio | AI Marketing Materials Creator | Vendibook"
        description="Create social media posts, flyers, emails, menu descriptions, taglines, and marketing images with AI. Free marketing tools for food truck businesses."
        canonical="/tools/marketing-studio"
      />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(pageJsonLd) }} />
      
      <div className="min-h-screen flex flex-col bg-background">
        <Header />

        <main className="flex-1">
          {/* Hero */}
          <section className="relative py-16 md:py-24 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-pink-500/10 via-purple-500/5 to-indigo-500/10" />
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <div className="absolute top-10 right-10 w-[400px] h-[400px] bg-gradient-to-br from-pink-500/10 to-purple-500/8 rounded-full blur-3xl animate-pulse" />
            </div>
            
            <div className="container relative z-10">
              <Breadcrumb className="mb-6">
                <BreadcrumbList>
                  <BreadcrumbItem>
                    <BreadcrumbLink asChild>
                      <Link to="/" className="flex items-center gap-1"><Home className="h-4 w-4" />Home</Link>
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <BreadcrumbLink asChild><Link to="/tools">Host Tools</Link></BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem><BreadcrumbPage>Marketing Studio</BreadcrumbPage></BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
              
              <div className="max-w-3xl">
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center shadow-lg">
                    <Megaphone className="h-6 w-6 text-white" />
                  </div>
                  <Badge className="bg-gradient-to-r from-pink-500 to-purple-600 text-white border-0">Marketing Studio</Badge>
                </div>
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-4 leading-tight">
                  Marketing that <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-purple-600">sells</span>
                </h1>
                <p className="text-xl text-foreground/70 mb-8">
                  Create social posts, flyers, emails, menu copy, taglines, and even AI-generated images — all tailored for your food business.
                </p>
                <div className="flex flex-wrap gap-4">
                  <Button size="lg" variant="dark-shine" onClick={() => document.getElementById('tool-section')?.scrollIntoView({ behavior: 'smooth' })}>
                    Start Creating<ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </div>
            </div>
          </section>

          {/* Features */}
          <section className="py-16 bg-muted/30">
            <div className="container">
              <div className="grid gap-6 md:grid-cols-3">
                <Card className="border-0 shadow-lg bg-gradient-to-br from-pink-50 to-rose-50 dark:from-pink-950/20 dark:to-rose-950/20">
                  <CardContent className="pt-6">
                    <div className="w-12 h-12 rounded-xl bg-pink-500/10 flex items-center justify-center mb-4">
                      <Instagram className="h-6 w-6 text-pink-600" />
                    </div>
                    <h3 className="font-bold text-lg mb-2">Social Media Ready</h3>
                    <p className="text-muted-foreground">Posts optimized for Instagram, Facebook, and Twitter with hashtags.</p>
                  </CardContent>
                </Card>
                <Card className="border-0 shadow-lg bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-950/20 dark:to-violet-950/20">
                  <CardContent className="pt-6">
                    <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center mb-4">
                      <Image className="h-6 w-6 text-purple-600" />
                    </div>
                    <h3 className="font-bold text-lg mb-2">AI Image Generation</h3>
                    <p className="text-muted-foreground">Create stunning promotional images with AI, no design skills needed.</p>
                  </CardContent>
                </Card>
                <Card className="border-0 shadow-lg bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-indigo-950/20 dark:to-blue-950/20">
                  <CardContent className="pt-6">
                    <div className="w-12 h-12 rounded-xl bg-indigo-500/10 flex items-center justify-center mb-4">
                      <Mail className="h-6 w-6 text-indigo-600" />
                    </div>
                    <h3 className="font-bold text-lg mb-2">Email & Print Ready</h3>
                    <p className="text-muted-foreground">Professional copy for emails, flyers, and printed materials.</p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </section>

          {/* Tool Section */}
          <section id="tool-section" className="py-16">
            <div className="container max-w-6xl">
              <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v as ContentType); setResult(null); }}>
                <TabsList className="grid grid-cols-3 md:grid-cols-6 mb-6 h-auto gap-1 bg-muted/50 p-1">
                  <TabsTrigger value="social-post" className="flex items-center gap-1.5 text-xs md:text-sm py-2">
                    <Instagram className="h-4 w-4" /><span className="hidden sm:inline">Social</span>
                  </TabsTrigger>
                  <TabsTrigger value="flyer" className="flex items-center gap-1.5 text-xs md:text-sm py-2">
                    <FileImage className="h-4 w-4" /><span className="hidden sm:inline">Flyer</span>
                  </TabsTrigger>
                  <TabsTrigger value="promo-email" className="flex items-center gap-1.5 text-xs md:text-sm py-2">
                    <Mail className="h-4 w-4" /><span className="hidden sm:inline">Email</span>
                  </TabsTrigger>
                  <TabsTrigger value="menu-description" className="flex items-center gap-1.5 text-xs md:text-sm py-2">
                    <Utensils className="h-4 w-4" /><span className="hidden sm:inline">Menu</span>
                  </TabsTrigger>
                  <TabsTrigger value="tagline" className="flex items-center gap-1.5 text-xs md:text-sm py-2">
                    <Type className="h-4 w-4" /><span className="hidden sm:inline">Tagline</span>
                  </TabsTrigger>
                  <TabsTrigger value="image" className="flex items-center gap-1.5 text-xs md:text-sm py-2">
                    <Image className="h-4 w-4" /><span className="hidden sm:inline">Image</span>
                  </TabsTrigger>
                </TabsList>

                {/* Social Post Form */}
                <TabsContent value="social-post">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2"><Instagram className="h-5 w-5 text-pink-500" />Social Media Posts</CardTitle>
                      <CardDescription>Generate engaging posts for Instagram, Facebook, and Twitter.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label>Business Name</Label>
                          <Input placeholder="e.g., Taco Loco" value={socialForm.businessName} onChange={(e) => setSocialForm({...socialForm, businessName: e.target.value})} />
                        </div>
                        <div className="space-y-2">
                          <Label>Business Type</Label>
                          <Select value={socialForm.businessType} onValueChange={(v) => setSocialForm({...socialForm, businessType: v})}>
                            <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="food_truck">Food Truck</SelectItem>
                              <SelectItem value="food_trailer">Food Trailer</SelectItem>
                              <SelectItem value="ghost_kitchen">Ghost Kitchen</SelectItem>
                              <SelectItem value="catering">Catering</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label>Post Purpose</Label>
                          <Select value={socialForm.purpose} onValueChange={(v) => setSocialForm({...socialForm, purpose: v})}>
                            <SelectTrigger><SelectValue placeholder="What's the post for?" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="promotion">Promotion/Sale</SelectItem>
                              <SelectItem value="new_item">New Menu Item</SelectItem>
                              <SelectItem value="event">Event Announcement</SelectItem>
                              <SelectItem value="location">Location Update</SelectItem>
                              <SelectItem value="engagement">Engagement/Fun</SelectItem>
                              <SelectItem value="behind_scenes">Behind the Scenes</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Tone</Label>
                          <Select value={socialForm.tone} onValueChange={(v) => setSocialForm({...socialForm, tone: v})}>
                            <SelectTrigger><SelectValue placeholder="Select tone" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="friendly">Friendly & Casual</SelectItem>
                              <SelectItem value="professional">Professional</SelectItem>
                              <SelectItem value="funny">Funny & Playful</SelectItem>
                              <SelectItem value="urgent">Urgent/FOMO</SelectItem>
                              <SelectItem value="premium">Premium/Upscale</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Key Message</Label>
                        <Textarea placeholder="What's the main thing you want to communicate?" value={socialForm.keyMessage} onChange={(e) => setSocialForm({...socialForm, keyMessage: e.target.value})} />
                      </div>
                      <div className="space-y-2">
                        <Label>Special Offer (Optional)</Label>
                        <Input placeholder="e.g., 20% off this weekend" value={socialForm.offer} onChange={(e) => setSocialForm({...socialForm, offer: e.target.value})} />
                      </div>
                      <Button onClick={handleGenerate} disabled={isLoading} className="w-full bg-gradient-to-r from-pink-500 to-purple-600">
                        {isLoading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Generating...</> : <><Sparkles className="h-4 w-4 mr-2" />Generate Social Posts</>}
                      </Button>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Flyer Form */}
                <TabsContent value="flyer">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2"><FileImage className="h-5 w-5 text-orange-500" />Flyer Copy</CardTitle>
                      <CardDescription>Create compelling headlines and copy for printed or digital flyers.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label>Business Name</Label>
                          <Input placeholder="e.g., Taco Loco" value={flyerForm.businessName} onChange={(e) => setFlyerForm({...flyerForm, businessName: e.target.value})} />
                        </div>
                        <div className="space-y-2">
                          <Label>Event/Promotion</Label>
                          <Input placeholder="e.g., Grand Opening, Summer Special" value={flyerForm.promotion} onChange={(e) => setFlyerForm({...flyerForm, promotion: e.target.value})} />
                        </div>
                      </div>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label>Date & Time</Label>
                          <Input placeholder="e.g., Saturday, June 15th, 11am-8pm" value={flyerForm.dateTime} onChange={(e) => setFlyerForm({...flyerForm, dateTime: e.target.value})} />
                        </div>
                        <div className="space-y-2">
                          <Label>Location</Label>
                          <Input placeholder="e.g., Downtown Food Park" value={flyerForm.location} onChange={(e) => setFlyerForm({...flyerForm, location: e.target.value})} />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Key Selling Points</Label>
                        <Textarea placeholder="What makes this special? e.g., Free samples, live music, kids eat free" value={flyerForm.sellingPoints} onChange={(e) => setFlyerForm({...flyerForm, sellingPoints: e.target.value})} />
                      </div>
                      <Button onClick={handleGenerate} disabled={isLoading} className="w-full bg-gradient-to-r from-orange-500 to-red-500">
                        {isLoading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Generating...</> : <><Sparkles className="h-4 w-4 mr-2" />Generate Flyer Copy</>}
                      </Button>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Email Form */}
                <TabsContent value="promo-email">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2"><Mail className="h-5 w-5 text-blue-500" />Promotional Email</CardTitle>
                      <CardDescription>Write engaging email campaigns that drive customers to action.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label>Business Name</Label>
                          <Input placeholder="e.g., Taco Loco" value={emailForm.businessName} onChange={(e) => setEmailForm({...emailForm, businessName: e.target.value})} />
                        </div>
                        <div className="space-y-2">
                          <Label>Email Purpose</Label>
                          <Select value={emailForm.purpose} onValueChange={(v) => setEmailForm({...emailForm, purpose: v})}>
                            <SelectTrigger><SelectValue placeholder="Select purpose" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="weekly_newsletter">Weekly Newsletter</SelectItem>
                              <SelectItem value="promotion">Special Promotion</SelectItem>
                              <SelectItem value="new_menu">New Menu Announcement</SelectItem>
                              <SelectItem value="event">Event Invitation</SelectItem>
                              <SelectItem value="loyalty">Loyalty Reward</SelectItem>
                              <SelectItem value="reengagement">Re-engagement</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Main Offer/News</Label>
                        <Textarea placeholder="What's the main thing you're sharing?" value={emailForm.offer} onChange={(e) => setEmailForm({...emailForm, offer: e.target.value})} />
                      </div>
                      <div className="space-y-2">
                        <Label>Call-to-Action Goal</Label>
                        <Input placeholder="e.g., Visit us this weekend, Order online, Book catering" value={emailForm.goal} onChange={(e) => setEmailForm({...emailForm, goal: e.target.value})} />
                      </div>
                      <Button onClick={handleGenerate} disabled={isLoading} className="w-full bg-gradient-to-r from-blue-500 to-indigo-600">
                        {isLoading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Generating...</> : <><Sparkles className="h-4 w-4 mr-2" />Generate Email</>}
                      </Button>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Menu Description Form */}
                <TabsContent value="menu-description">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2"><Utensils className="h-5 w-5 text-green-500" />Menu Descriptions</CardTitle>
                      <CardDescription>Write mouthwatering descriptions that make dishes irresistible.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label>Business Name</Label>
                          <Input placeholder="e.g., Taco Loco" value={menuForm.businessName} onChange={(e) => setMenuForm({...menuForm, businessName: e.target.value})} />
                        </div>
                        <div className="space-y-2">
                          <Label>Cuisine Type</Label>
                          <Input placeholder="e.g., Mexican, Asian Fusion, BBQ" value={menuForm.cuisine} onChange={(e) => setMenuForm({...menuForm, cuisine: e.target.value})} />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Menu Items (one per line or comma-separated)</Label>
                        <Textarea placeholder="e.g., Street Tacos, Loaded Nachos, Churros..." value={menuForm.items} onChange={(e) => setMenuForm({...menuForm, items: e.target.value})} rows={4} />
                      </div>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label>Brand Personality</Label>
                          <Select value={menuForm.personality} onValueChange={(v) => setMenuForm({...menuForm, personality: v})}>
                            <SelectTrigger><SelectValue placeholder="Select style" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="fun_casual">Fun & Casual</SelectItem>
                              <SelectItem value="upscale">Upscale/Premium</SelectItem>
                              <SelectItem value="traditional">Traditional/Authentic</SelectItem>
                              <SelectItem value="trendy">Trendy/Modern</SelectItem>
                              <SelectItem value="family">Family-Friendly</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Price Range</Label>
                          <Select value={menuForm.priceRange} onValueChange={(v) => setMenuForm({...menuForm, priceRange: v})}>
                            <SelectTrigger><SelectValue placeholder="Select range" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="budget">Budget-Friendly ($)</SelectItem>
                              <SelectItem value="moderate">Moderate ($$)</SelectItem>
                              <SelectItem value="premium">Premium ($$$)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <Button onClick={handleGenerate} disabled={isLoading} className="w-full bg-gradient-to-r from-green-500 to-emerald-600">
                        {isLoading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Generating...</> : <><Sparkles className="h-4 w-4 mr-2" />Generate Descriptions</>}
                      </Button>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Tagline Form */}
                <TabsContent value="tagline">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2"><Type className="h-5 w-5 text-violet-500" />Taglines & Slogans</CardTitle>
                      <CardDescription>Create memorable taglines that capture your brand essence.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label>Business Name (or describe if undecided)</Label>
                          <Input placeholder="e.g., Taco Loco or 'Mexican street food truck'" value={taglineForm.businessName} onChange={(e) => setTaglineForm({...taglineForm, businessName: e.target.value})} />
                        </div>
                        <div className="space-y-2">
                          <Label>Business Type</Label>
                          <Select value={taglineForm.businessType} onValueChange={(v) => setTaglineForm({...taglineForm, businessType: v})}>
                            <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="food_truck">Food Truck</SelectItem>
                              <SelectItem value="food_trailer">Food Trailer</SelectItem>
                              <SelectItem value="ghost_kitchen">Ghost Kitchen</SelectItem>
                              <SelectItem value="catering">Catering Service</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label>Specialty/Cuisine</Label>
                          <Input placeholder="e.g., Authentic Mexican, Gourmet Burgers" value={taglineForm.specialty} onChange={(e) => setTaglineForm({...taglineForm, specialty: e.target.value})} />
                        </div>
                        <div className="space-y-2">
                          <Label>Brand Personality</Label>
                          <Select value={taglineForm.personality} onValueChange={(v) => setTaglineForm({...taglineForm, personality: v})}>
                            <SelectTrigger><SelectValue placeholder="Select vibe" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="fun_playful">Fun & Playful</SelectItem>
                              <SelectItem value="premium">Premium & Sophisticated</SelectItem>
                              <SelectItem value="authentic">Authentic & Traditional</SelectItem>
                              <SelectItem value="bold">Bold & Edgy</SelectItem>
                              <SelectItem value="family">Warm & Family-Friendly</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Unique Selling Point</Label>
                        <Input placeholder="What makes you different? e.g., Family recipes, locally sourced" value={taglineForm.usp} onChange={(e) => setTaglineForm({...taglineForm, usp: e.target.value})} />
                      </div>
                      <Button onClick={handleGenerate} disabled={isLoading} className="w-full bg-gradient-to-r from-violet-500 to-purple-600">
                        {isLoading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Generating...</> : <><Sparkles className="h-4 w-4 mr-2" />Generate Taglines</>}
                      </Button>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Image Generation Form */}
                <TabsContent value="image">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2"><Image className="h-5 w-5 text-fuchsia-500" />AI Image Generator</CardTitle>
                      <CardDescription>Create stunning promotional images with AI — no design skills needed.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label>Describe the image you want</Label>
                        <Textarea 
                          placeholder="e.g., A mouth-watering photo of loaded street tacos with fresh toppings, lime wedges, on a rustic wooden board with steam rising" 
                          value={imageForm.prompt} 
                          onChange={(e) => setImageForm({...imageForm, prompt: e.target.value})} 
                          rows={3}
                        />
                      </div>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label>Style</Label>
                          <Select value={imageForm.style} onValueChange={(v) => setImageForm({...imageForm, style: v})}>
                            <SelectTrigger><SelectValue placeholder="Select style" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="photo_realistic">Photo Realistic</SelectItem>
                              <SelectItem value="vibrant_colorful">Vibrant & Colorful</SelectItem>
                              <SelectItem value="minimalist">Clean & Minimalist</SelectItem>
                              <SelectItem value="vintage">Vintage/Retro</SelectItem>
                              <SelectItem value="artistic">Artistic/Illustrated</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Platform</Label>
                          <Select value={imageForm.platform} onValueChange={(v) => setImageForm({...imageForm, platform: v})}>
                            <SelectTrigger><SelectValue placeholder="Select platform" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="instagram_post">Instagram Post</SelectItem>
                              <SelectItem value="instagram_story">Instagram Story</SelectItem>
                              <SelectItem value="facebook">Facebook</SelectItem>
                              <SelectItem value="flyer">Print Flyer</SelectItem>
                              <SelectItem value="menu">Menu Board</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Purpose</Label>
                        <Select value={imageForm.purpose} onValueChange={(v) => setImageForm({...imageForm, purpose: v})}>
                          <SelectTrigger><SelectValue placeholder="What's it for?" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="food_showcase">Food Showcase</SelectItem>
                            <SelectItem value="promotion">Promotion/Sale</SelectItem>
                            <SelectItem value="event">Event Announcement</SelectItem>
                            <SelectItem value="brand">Brand/Logo Background</SelectItem>
                            <SelectItem value="social_engagement">Social Engagement</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <Button onClick={handleGenerate} disabled={isLoading} className="w-full bg-gradient-to-r from-fuchsia-500 to-pink-600">
                        {isLoading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Generating Image...</> : <><Image className="h-4 w-4 mr-2" />Generate Image</>}
                      </Button>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>

              {/* Results Section */}
              {result && (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-8"
                >
                  <div className="flex items-center gap-2 mb-4">
                    <Sparkles className="h-5 w-5 text-primary" />
                    <h3 className="font-semibold text-lg">Generated Content</h3>
                    <Badge variant="secondary" className="text-xs">AI Generated</Badge>
                  </div>

                  {/* Social Posts Result */}
                  {activeTab === 'social-post' && result.posts && (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {result.posts.map((post: any, i: number) => (
                        <Card key={i} className="relative">
                          <CardHeader className="pb-2">
                            <div className="flex items-center justify-between">
                              <Badge variant="outline">{post.platform}</Badge>
                              <CopyButton text={post.content} field={`post-${i}`} />
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-3">
                            <p className="text-sm whitespace-pre-wrap">{post.content}</p>
                            <div className="flex flex-wrap gap-1">
                              {post.hashtags?.map((tag: string, j: number) => (
                                <Badge key={j} variant="secondary" className="text-xs">
                                  <Hash className="h-3 w-3 mr-0.5" />{tag}
                                </Badge>
                              ))}
                            </div>
                            {post.bestTime && (
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Clock className="h-3 w-3" />{post.bestTime}
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}

                  {/* Flyer Result */}
                  {activeTab === 'flyer' && result.headline && (
                    <Card>
                      <CardContent className="pt-6 space-y-4">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h4 className="text-2xl font-bold">{result.headline}</h4>
                            {result.subheadline && <p className="text-lg text-muted-foreground">{result.subheadline}</p>}
                          </div>
                          <CopyButton text={`${result.headline}\n${result.subheadline || ''}`} field="headline" />
                        </div>
                        {result.bodyPoints && (
                          <ul className="space-y-2">
                            {result.bodyPoints.map((point: string, i: number) => (
                              <li key={i} className="flex items-start gap-2">
                                <Check className="h-4 w-4 text-green-500 mt-1 shrink-0" />
                                <span>{point}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                        {result.callToAction && (
                          <div className="p-4 bg-primary/10 rounded-lg">
                            <p className="font-bold text-lg text-center">{result.callToAction}</p>
                          </div>
                        )}
                        {result.designTips && (
                          <div className="text-sm text-muted-foreground">
                            <p className="font-medium mb-1">Design Tips:</p>
                            <ul className="list-disc list-inside">
                              {result.designTips.map((tip: string, i: number) => <li key={i}>{tip}</li>)}
                            </ul>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )}

                  {/* Email Result */}
                  {activeTab === 'promo-email' && result.subjectLine && (
                    <Card>
                      <CardContent className="pt-6 space-y-4">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Label className="text-xs text-muted-foreground">Subject Line</Label>
                            <CopyButton text={result.subjectLine} field="subject" />
                          </div>
                          <p className="font-semibold text-lg">{result.subjectLine}</p>
                          {result.subjectLineAlt && <p className="text-sm text-muted-foreground">Alt: {result.subjectLineAlt}</p>}
                        </div>
                        {result.previewText && (
                          <div className="p-3 bg-muted rounded-lg">
                            <p className="text-sm italic">{result.previewText}</p>
                          </div>
                        )}
                        <div className="prose prose-sm max-w-none">
                          {result.greeting && <p>{result.greeting}</p>}
                          {result.bodyParagraphs?.map((p: string, i: number) => <p key={i}>{p}</p>)}
                          {result.callToAction && (
                            <Button className="my-4">{result.callToAction}</Button>
                          )}
                          {result.closing && <p>{result.closing}</p>}
                          {result.psLine && <p className="text-sm italic">{result.psLine}</p>}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Menu Descriptions Result */}
                  {activeTab === 'menu-description' && result.descriptions && (
                    <div className="space-y-4">
                      {result.categoryIntro && (
                        <p className="text-lg italic text-muted-foreground">{result.categoryIntro}</p>
                      )}
                      <div className="grid gap-4 md:grid-cols-2">
                        {result.descriptions.map((item: any, i: number) => (
                          <Card key={i}>
                            <CardContent className="pt-4">
                              <div className="flex items-start justify-between gap-2 mb-2">
                                <h4 className="font-bold">{item.item}</h4>
                                <div className="flex items-center gap-1">
                                  {item.callout && <Badge variant="secondary" className="text-xs">{item.callout}</Badge>}
                                  <CopyButton text={item.description} field={`menu-${i}`} />
                                </div>
                              </div>
                              <p className="text-sm text-muted-foreground">{item.description}</p>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Taglines Result */}
                  {activeTab === 'tagline' && result.taglines && (
                    <div className="grid gap-4 md:grid-cols-2">
                      {result.taglines.map((item: any, i: number) => (
                        <Card key={i} className="hover:shadow-lg transition-shadow">
                          <CardContent className="pt-4">
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <p className="text-xl font-bold">"{item.text}"</p>
                              <CopyButton text={item.text} field={`tagline-${i}`} />
                            </div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge variant="outline">{item.style}</Badge>
                              <span className="text-xs text-muted-foreground">{item.bestFor}</span>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}

                  {/* Image Result */}
                  {activeTab === 'image' && result.imageUrl && (
                    <Card>
                      <CardContent className="pt-6">
                        <div className="relative group">
                          <img 
                            src={result.imageUrl} 
                            alt="AI Generated Marketing Image" 
                            className="w-full max-w-2xl mx-auto rounded-lg shadow-lg"
                          />
                          <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button size="sm" variant="secondary" asChild>
                              <a href={result.imageUrl} download="marketing-image.png">
                                <Download className="h-4 w-4 mr-2" />Download
                              </a>
                            </Button>
                          </div>
                        </div>
                        {result.description && (
                          <p className="text-sm text-muted-foreground text-center mt-4">{result.description}</p>
                        )}
                      </CardContent>
                    </Card>
                  )}

                  {/* Raw/Fallback Result */}
                  {result.raw && (
                    <Card>
                      <CardContent className="pt-6">
                        <p className="whitespace-pre-wrap">{result.raw}</p>
                      </CardContent>
                    </Card>
                  )}
                </motion.div>
              )}
            </div>
          </section>

          {/* Cross Links */}
          <section className="py-16 bg-muted/30">
            <div className="container max-w-5xl">
              <ToolCrossLinks currentTool="marketing-studio" />
            </div>
          </section>
        </main>

        <Footer />
      </div>
    </>
  );
};

export default MarketingStudio;
