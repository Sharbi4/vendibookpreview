import { Link } from 'react-router-dom';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import SEO, { generateArticleSchema, generateBreadcrumbSchema, generateFAQSchema } from '@/components/SEO';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { 
  Sparkles, 
  DollarSign, 
  FileText, 
  Lightbulb, 
  Scale, 
  Wrench, 
  TrendingUp,
  CheckCircle,
  ArrowRight,
  Clock,
  Target,
  Zap,
  Shield,
  Users,
  Star,
  ChefHat,
  Truck,
  MapPin,
  FileCheck,
  Calculator,
  Megaphone,
  BarChart3,
  BookOpen,
  Rocket
} from 'lucide-react';

// SEO structured data
const articleSchema = generateArticleSchema({
  title: 'Vendi AI Suite: Free AI Tools for Food Truck & Trailer Startups',
  description: 'Complete guide to launching your food truck business with AI-powered tools. Get permits, set pricing, build your menu, and launch faster with the Vendi AI Suite.',
  slug: 'vendi-ai-suite',
  category: 'Food Truck Startup Guide',
  datePublished: '2024-01-15',
  dateModified: '2025-01-17',
});

const breadcrumbSchema = generateBreadcrumbSchema([
  { name: 'Home', url: '/' },
  { name: 'Host Tools', url: '/tools' },
  { name: 'Vendi AI Suite Guide', url: '/vendi-ai-suite' },
]);

const faqData = [
  {
    question: 'What is the Vendi AI Suite?',
    answer: 'The Vendi AI Suite is a collection of free AI-powered tools designed specifically for food truck owners, food trailer operators, and mobile food vendors. It includes tools for permit finding, pricing optimization, listing creation, equipment guidance, market research, and business concept development.'
  },
  {
    question: 'Are the Vendi AI tools really free?',
    answer: 'Yes, all Vendi AI tools are completely free to use with no credit card required. We believe in helping food entrepreneurs succeed, and these tools are our way of supporting the mobile food community.'
  },
  {
    question: 'How accurate is the PermitPath license finder?',
    answer: 'PermitPath uses AI to provide comprehensive permit and license information based on your location and business type. While results are highly accurate, we always recommend verifying requirements directly with your local government agencies as regulations change frequently.'
  },
  {
    question: 'Can I use these tools if I\'m just starting my food truck research?',
    answer: 'Absolutely! These tools are perfect for entrepreneurs at any stage—from initial research to active operation. Concept Lab and Market Radar are especially helpful for those just starting to explore the food truck industry.'
  },
  {
    question: 'Do I need to create an account to use the AI tools?',
    answer: 'No account is required to access and use the Vendi AI Suite. Simply visit the AI Tools page and start using any tool immediately.'
  },
  {
    question: 'What types of food businesses do these tools support?',
    answer: 'The Vendi AI Suite supports food trucks, food trailers, ghost kitchens, commissary kitchens, food carts, and vendor lot operations. Tools are customized based on your specific business type.'
  },
];

const faqSchema = generateFAQSchema(faqData);

const tools = [
  {
    id: 'permit-path',
    icon: Scale,
    name: 'PermitPath',
    tagline: 'Permits, licenses, and compliance—mapped to your city and setup',
    description: 'Navigate the complex world of food truck licenses and permits without the headache. PermitPath instantly identifies every permit, license, and certification you need based on your exact location and business type.',
    benefits: [
      'Save 40+ hours of permit research',
      'Avoid costly compliance mistakes',
      'Get direct links to application portals',
      'Understand costs and timelines upfront'
    ],
    useCases: [
      'First-time food truck owners researching requirements',
      'Expanding to new cities or states',
      'Renewing expired permits',
      'Converting from cart to truck operations'
    ],
    href: '/tools/permitpath',
    category: 'Compliance'
  },
  {
    id: 'price-pilot',
    icon: DollarSign,
    name: 'PricePilot',
    tagline: 'Data-backed pricing that helps you book faster and earn more',
    description: 'Stop guessing on pricing. PricePilot analyzes market data, location factors, and your unique features to suggest optimal daily, weekly, and sale prices that maximize your earnings while staying competitive.',
    benefits: [
      'Increase bookings with competitive pricing',
      'Maximize revenue without leaving money on the table',
      'Adjust prices seasonally with confidence',
      'Understand your market position'
    ],
    useCases: [
      'Setting initial rental or sale prices',
      'Adjusting for seasonal demand',
      'Pricing for new locations',
      'Competitive analysis'
    ],
    href: '/tools/pricepilot',
    category: 'Revenue'
  },
  {
    id: 'listing-studio',
    icon: FileText,
    name: 'Listing Studio',
    tagline: 'Turn specs into a high-converting listing in minutes',
    description: 'Transform basic details into professional, engaging listing descriptions that highlight your unique selling points. Our AI crafts SEO-optimized copy that attracts more views and converts browsers into bookings.',
    benefits: [
      'Professional listings in under 5 minutes',
      'SEO-optimized descriptions',
      'Highlight generation for key features',
      'Consistent, polished brand voice'
    ],
    useCases: [
      'Creating new marketplace listings',
      'Refreshing underperforming listings',
      'Describing equipment for sale',
      'Writing social media posts'
    ],
    href: '/tools/listing-studio',
    category: 'Marketing'
  },
  {
    id: 'build-kit',
    icon: Wrench,
    name: 'BuildKit',
    tagline: 'Equipment recommendations that match your menu, volume, and budget',
    description: 'Get expert guidance on commercial kitchen equipment—from fryers to refrigeration units. BuildKit provides maintenance schedules, troubleshooting guides, and care recommendations to keep your operation running smoothly.',
    benefits: [
      'Extend equipment lifespan',
      'Reduce unexpected breakdowns',
      'Learn proper maintenance procedures',
      'Save on repair costs'
    ],
    useCases: [
      'Setting up a new food truck',
      'Maintaining existing equipment',
      'Troubleshooting issues',
      'Planning equipment upgrades'
    ],
    href: '/tools/buildkit',
    category: 'Operations'
  },
  {
    id: 'concept-lab',
    icon: Lightbulb,
    name: 'Concept Lab',
    tagline: 'Generate sellable concepts designed for your market and margins',
    description: 'Discover your perfect food business concept. Concept Lab generates personalized ideas tailored to your interests, budget, and local market opportunities—from fusion food trucks to niche ghost kitchens.',
    benefits: [
      'Validated business concepts',
      'Market gap analysis included',
      'Revenue projections',
      'Budget-conscious suggestions'
    ],
    useCases: [
      'Exploring food truck concepts',
      'Pivoting an existing business',
      'Identifying market gaps',
      'Validating new menu ideas'
    ],
    href: '/tools/concept-lab',
    category: 'Strategy'
  },
  {
    id: 'market-radar',
    icon: TrendingUp,
    name: 'Market Radar',
    tagline: 'Location intel + competitor snapshots for smarter decisions',
    description: 'Make data-driven decisions with comprehensive market intelligence. Market Radar delivers competitor analysis, location demand forecasting, and industry trends to help you find your competitive edge.',
    benefits: [
      'Understand your competition',
      'Identify high-demand locations',
      'Spot emerging food trends',
      'Make informed business decisions'
    ],
    useCases: [
      'Choosing your operating locations',
      'Analyzing competitor pricing',
      'Understanding local food trends',
      'Planning expansion'
    ],
    href: '/tools/market-radar',
    category: 'Intelligence'
  },
];

const checklistItems = [
  {
    icon: FileCheck,
    title: 'Research Permits & Licenses',
    description: 'Use PermitPath to identify all required permits for your city, county, and state.',
    tool: 'PermitPath'
  },
  {
    icon: Lightbulb,
    title: 'Validate Your Concept',
    description: 'Test your food truck idea against market demand with Concept Lab.',
    tool: 'Concept Lab'
  },
  {
    icon: TrendingUp,
    title: 'Analyze the Competition',
    description: 'Understand your market landscape and identify opportunities with Market Radar.',
    tool: 'Market Radar'
  },
  {
    icon: Wrench,
    title: 'Plan Your Equipment',
    description: 'Get equipment recommendations and maintenance guides from BuildKit.',
    tool: 'BuildKit'
  },
  {
    icon: DollarSign,
    title: 'Set Your Pricing',
    description: 'Use PricePilot to establish competitive, profitable pricing.',
    tool: 'PricePilot'
  },
  {
    icon: FileText,
    title: 'Create Your Listings',
    description: 'Craft professional marketplace listings with Listing Studio.',
    tool: 'Listing Studio'
  },
];

const VendiAISuite = () => {
  return (
    <>
      <SEO
        title="Vendi AI Suite: Free AI Tools for Food Truck Startups | Complete 2025 Guide"
        description="Launch your food truck or food trailer business faster with free AI-powered tools. Get permits, set pricing, find equipment, and create listings—all in one place. The ultimate food truck startup checklist."
        canonical="/vendi-ai-suite"
        type="article"
        article={{
          publishedTime: '2024-01-15',
          modifiedTime: '2025-01-17',
          author: 'Vendibook',
          section: 'Food Truck Startup Guide',
          tags: ['food truck startup', 'food trailer business', 'mobile vendor tools', 'food truck permits', 'food truck pricing'],
        }}
      />

      {/* JSON-LD Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([articleSchema, breadcrumbSchema, faqSchema]),
        }}
      />

      <Header />

      <main className="min-h-screen bg-background">
        {/* Hero Section */}
        <section className="relative py-16 md:py-24 overflow-hidden">
          {/* Background gradient */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-secondary/5" />
          <div className="absolute top-20 right-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl" />
          <div className="absolute bottom-10 left-10 w-96 h-96 bg-secondary/10 rounded-full blur-3xl" />
          
          <div className="container max-w-5xl mx-auto px-4 relative z-10">
            {/* Breadcrumb */}
            <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-8">
              <Link to="/" className="hover:text-primary transition-colors">Home</Link>
              <span>/</span>
              <Link to="/tools" className="hover:text-primary transition-colors">Host Tools</Link>
              <span>/</span>
              <span className="text-foreground">Vendi AI Suite Guide</span>
            </nav>

            <div className="flex flex-col md:flex-row items-start gap-8">
              <div className="flex-1">
                <Badge className="mb-4 bg-primary/10 text-primary border-primary/20">
                  <Sparkles className="w-3 h-3 mr-1" />
                  Free AI Tools for Food Entrepreneurs
                </Badge>
                
                <h1 className="text-3xl md:text-5xl font-bold text-foreground leading-tight mb-6">
                  The Complete Food Truck <span className="text-primary">Startup Toolkit</span>
                </h1>
                
                <p className="text-lg md:text-xl text-muted-foreground mb-8 leading-relaxed">
                  Launching a food truck, food trailer, or mobile food business? The Vendi AI Suite gives you 
                  everything you need to go from idea to open for business—permits, pricing, equipment, 
                  listings, and market intelligence. All free, all AI-powered.
                </p>

                <div className="flex flex-wrap gap-4 mb-8">
                  <Link to="/tools">
                    <Button size="lg" className="gap-2">
                      <Sparkles className="w-4 h-4" />
                      Open AI Suite
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </Link>
                  <Button variant="outline" size="lg" asChild>
                    <a href="#startup-checklist">
                      <BookOpen className="w-4 h-4 mr-2" />
                      View Startup Checklist
                    </a>
                  </Button>
                </div>

                {/* Trust signals */}
                <div className="flex flex-wrap items-center gap-6 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    100% Free
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    No Account Required
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    Instant Results
                  </div>
                </div>
              </div>

              {/* Stats card */}
              <Card className="w-full md:w-80 bg-card/80 backdrop-blur border-primary/20">
                <CardContent className="p-6">
                  <h3 className="font-semibold text-foreground mb-4">Why Food Entrepreneurs Love Us</h3>
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Clock className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <div className="text-xl font-bold text-foreground">40+ Hours</div>
                        <div className="text-sm text-muted-foreground">Saved on research</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Scale className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <div className="text-xl font-bold text-foreground">50 States</div>
                        <div className="text-sm text-muted-foreground">Permit coverage</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Users className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <div className="text-xl font-bold text-foreground">10,000+</div>
                        <div className="text-sm text-muted-foreground">Entrepreneurs helped</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Introduction Article Section */}
        <section className="py-12 md:py-16 bg-muted/30">
          <div className="container max-w-4xl mx-auto px-4">
            <article className="prose prose-lg dark:prose-invert max-w-none">
              <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-6">
                Starting a Food Truck in 2025: Why You Need AI on Your Side
              </h2>
              
              <p className="text-muted-foreground leading-relaxed mb-6">
                The food truck industry continues to boom, with over <strong>35,000 food trucks</strong> operating 
                across the United States and the market projected to reach <strong>$2.7 billion by 2027</strong>. 
                But here's what most aspiring food truck owners don't realize: the biggest challenge isn't 
                cooking great food—it's navigating the complex web of permits, pricing, and operations that 
                make or break a mobile food business.
              </p>

              <p className="text-muted-foreground leading-relaxed mb-6">
                That's exactly why we built the <strong>Vendi AI Suite</strong>—a collection of free, 
                AI-powered tools designed specifically for food truck entrepreneurs, food trailer operators, 
                ghost kitchen owners, and mobile vendors. Whether you're writing your business plan or 
                ready to hit the streets, these tools eliminate the guesswork and accelerate your path to success.
              </p>

              <div className="bg-primary/5 border border-primary/20 rounded-xl p-6 my-8">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center flex-shrink-0">
                    <Target className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">Who This Guide Is For</h3>
                    <ul className="text-muted-foreground space-y-2 list-none p-0 m-0">
                      <li className="flex items-center gap-2">
                        <ChefHat className="w-4 h-4 text-primary" />
                        First-time food truck entrepreneurs
                      </li>
                      <li className="flex items-center gap-2">
                        <Truck className="w-4 h-4 text-primary" />
                        Food trailer and food cart operators
                      </li>
                      <li className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-primary" />
                        Ghost kitchen and commissary owners
                      </li>
                      <li className="flex items-center gap-2">
                        <Star className="w-4 h-4 text-primary" />
                        Established vendors looking to optimize
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </article>
          </div>
        </section>

        {/* Tools Deep Dive */}
        <section className="py-16 md:py-20">
          <div className="container max-w-6xl mx-auto px-4">
            <div className="text-center mb-12">
              <Badge className="mb-4">6 AI-Powered Tools</Badge>
              <h2 className="text-2xl md:text-4xl font-bold text-foreground mb-4">
                Meet the Vendi AI Suite
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Each tool is purpose-built for mobile food businesses. Use them individually or together 
                as a complete startup toolkit.
              </p>
            </div>

            <div className="space-y-8">
              {tools.map((tool, index) => {
                const Icon = tool.icon;
                const isEven = index % 2 === 0;
                
                return (
                  <Card key={tool.id} className="overflow-hidden border-border/50 hover:border-primary/30 transition-colors">
                    <CardContent className="p-0">
                      <div className={`flex flex-col ${isEven ? 'md:flex-row' : 'md:flex-row-reverse'}`}>
                        {/* Content */}
                        <div className="flex-1 p-6 md:p-8">
                          <div className="flex items-center gap-3 mb-4">
                            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                              <Icon className="w-6 h-6 text-primary" />
                            </div>
                            <div>
                              <Badge variant="secondary" className="mb-1">{tool.category}</Badge>
                              <h3 className="text-xl font-bold text-foreground">{tool.name}</h3>
                            </div>
                          </div>
                          
                          <p className="text-primary font-medium mb-3">{tool.tagline}</p>
                          <p className="text-muted-foreground mb-6">{tool.description}</p>
                          
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                            <div>
                              <h4 className="text-sm font-semibold text-foreground mb-2">Benefits</h4>
                              <ul className="space-y-1.5">
                                {tool.benefits.map((benefit, i) => (
                                  <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                                    <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                                    {benefit}
                                  </li>
                                ))}
                              </ul>
                            </div>
                            <div>
                              <h4 className="text-sm font-semibold text-foreground mb-2">Use Cases</h4>
                              <ul className="space-y-1.5">
                                {tool.useCases.map((useCase, i) => (
                                  <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                                    <Zap className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                                    {useCase}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>
                          
                          <Link to={tool.href}>
                            <Button className="gap-2">
                              Try {tool.name}
                              <ArrowRight className="w-4 h-4" />
                            </Button>
                          </Link>
                        </div>
                        
                        {/* Visual element */}
                        <div className={`w-full md:w-80 bg-gradient-to-br ${isEven ? 'from-primary/5 to-secondary/10' : 'from-secondary/10 to-primary/5'} flex items-center justify-center p-8`}>
                          <div className="w-32 h-32 rounded-2xl bg-background/80 backdrop-blur border border-border/50 flex items-center justify-center shadow-xl">
                            <Icon className="w-16 h-16 text-primary" />
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </section>

        {/* Startup Checklist Section */}
        <section id="startup-checklist" className="py-16 md:py-20 bg-muted/30">
          <div className="container max-w-5xl mx-auto px-4">
            <div className="text-center mb-12">
              <Badge className="mb-4 bg-primary/10 text-primary border-primary/20">
                <Rocket className="w-3 h-3 mr-1" />
                Food Truck Startup Checklist
              </Badge>
              <h2 className="text-2xl md:text-4xl font-bold text-foreground mb-4">
                Your Step-by-Step Launch Plan
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Follow this checklist to launch your food truck or food trailer business with confidence. 
                Each step links to the AI tool that helps you complete it.
              </p>
            </div>

            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-primary/20 hidden md:block" />
              
              <div className="space-y-6">
                {checklistItems.map((item, index) => {
                  const Icon = item.icon;
                  return (
                    <div key={index} className="relative flex gap-4 md:gap-6">
                      {/* Timeline dot */}
                      <div className="relative z-10 w-12 h-12 rounded-full bg-primary/10 border-2 border-primary flex items-center justify-center flex-shrink-0">
                        <span className="text-primary font-bold">{index + 1}</span>
                      </div>
                      
                      <Card className="flex-1 hover:border-primary/30 transition-colors">
                        <CardContent className="p-5 flex items-start gap-4">
                          <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                            <Icon className="w-5 h-5 text-primary" />
                          </div>
                          <div className="flex-1">
                            <h3 className="font-semibold text-foreground mb-1">{item.title}</h3>
                            <p className="text-sm text-muted-foreground mb-3">{item.description}</p>
                            <Link to="/tools">
                              <Badge variant="secondary" className="cursor-pointer hover:bg-primary/10 transition-colors">
                                Use {item.tool} →
                              </Badge>
                            </Link>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* Industry Stats Section */}
        <section className="py-16 md:py-20">
          <div className="container max-w-5xl mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
                The Food Truck Industry by the Numbers
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Understanding the market landscape helps you make better business decisions.
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {[
                { value: '$2.7B', label: 'Market Size by 2027', icon: BarChart3 },
                { value: '35K+', label: 'Food Trucks in the US', icon: Truck },
                { value: '6.8%', label: 'Annual Growth Rate', icon: TrendingUp },
                { value: '$250K', label: 'Avg Annual Revenue', icon: DollarSign },
              ].map((stat, index) => {
                const Icon = stat.icon;
                return (
                  <Card key={index} className="text-center">
                    <CardContent className="p-6">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mx-auto mb-3">
                        <Icon className="w-5 h-5 text-primary" />
                      </div>
                      <div className="text-2xl md:text-3xl font-bold text-primary mb-1">{stat.value}</div>
                      <div className="text-sm text-muted-foreground">{stat.label}</div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="py-16 md:py-20 bg-muted/30">
          <div className="container max-w-3xl mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
                Frequently Asked Questions
              </h2>
              <p className="text-muted-foreground">
                Everything you need to know about the Vendi AI Suite.
              </p>
            </div>

            <Accordion type="single" collapsible className="space-y-4">
              {faqData.map((faq, index) => (
                <AccordionItem key={index} value={`faq-${index}`} className="bg-background border rounded-xl px-6">
                  <AccordionTrigger className="text-left font-medium hover:no-underline">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-16 md:py-24 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-secondary/10" />
          <div className="absolute top-10 left-10 w-72 h-72 bg-primary/20 rounded-full blur-3xl" />
          <div className="absolute bottom-10 right-10 w-96 h-96 bg-secondary/20 rounded-full blur-3xl" />
          
          <div className="container max-w-3xl mx-auto px-4 text-center relative z-10">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full text-primary text-sm font-medium mb-6">
              <Sparkles className="w-4 h-4" />
              Start Building Your Food Business Today
            </div>
            
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-6">
              Ready to Launch Your Food Truck?
            </h2>
            
            <p className="text-lg text-muted-foreground mb-8 max-w-xl mx-auto">
              Join thousands of food entrepreneurs who've used the Vendi AI Suite to 
              start and grow their mobile food businesses. All tools are free—no credit card, no catch.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/tools">
                <Button size="lg" className="gap-2 w-full sm:w-auto">
                  <Sparkles className="w-4 h-4" />
                  Open Vendi AI Suite
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
              <Link to="/search">
                <Button variant="outline" size="lg" className="w-full sm:w-auto">
                  Browse Food Trucks
                </Button>
              </Link>
            </div>

            <p className="text-sm text-muted-foreground mt-6">
              No sign-up required • Instant results • 100% free
            </p>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
};

export default VendiAISuite;
