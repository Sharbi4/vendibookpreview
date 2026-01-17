import { Link } from 'react-router-dom';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import SEO from '@/components/SEO';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  DollarSign, 
  FileCheck, 
  FileText, 
  Lightbulb, 
  Wrench, 
  Search,
  ArrowRight,
  Sparkles,
  Megaphone,
  CheckCircle2
} from 'lucide-react';

const tools = [
  {
    name: 'PricePilot',
    description: 'Get data-backed daily and weekly rates for your asset.',
    icon: DollarSign,
    gradient: 'from-yellow-400 to-orange-500',
    href: '/tools/pricepilot',
  },
  {
    name: 'PermitPath',
    description: 'Find all licenses and permits required in your city.',
    icon: FileCheck,
    gradient: 'from-amber-400 to-orange-600',
    href: '/tools/permitpath',
  },
  {
    name: 'Listing Studio',
    description: 'Generate high-converting titles and descriptions.',
    icon: FileText,
    gradient: 'from-rose-400 to-pink-600',
    href: '/tools/listing-studio',
  },
  {
    name: 'Concept Lab',
    description: 'Generate profitable food truck business concepts.',
    icon: Lightbulb,
    gradient: 'from-yellow-300 to-amber-500',
    href: '/tools/concept-lab',
  },
  {
    name: 'BuildKit',
    description: 'Equipment guides and maintenance schedules.',
    icon: Wrench,
    gradient: 'from-orange-400 to-red-500',
    href: '/tools/buildkit',
  },
  {
    name: 'Market Radar',
    description: 'Research locations, competitors, and demand.',
    icon: Search,
    gradient: 'from-blue-400 to-indigo-600',
    href: '/tools/market-radar',
  },
  {
    name: 'Marketing Studio',
    description: 'Create social posts, flyers, and promo materials.',
    icon: Megaphone,
    gradient: 'from-pink-500 to-purple-600',
    href: '/tools/marketing-studio',
  }
];

const benefits = [
  'Set competitive pricing based on market data',
  'Understand local permit requirements before you start',
  'Write listings that convert browsers to bookers',
  'Plan your equipment and maintenance needs'
];

const pageJsonLd = {
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  "name": "Host Tools - Free AI Tools for Food Truck Owners",
  "description": "Free AI-powered tools to help food truck and trailer owners price competitively, find permits, write listings, and grow their business.",
  "url": "https://vendibook.com/tools"
};

const ToolsIndex = () => {
  return (
    <>
      <SEO
        title="Host Tools | Free AI Tools for Food Truck Owners | Vendibook"
        description="Free AI tools to help you price your food truck, find permits, write listings, and grow your mobile food business."
        canonical="/tools"
      />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(pageJsonLd) }} />
      
      <div className="min-h-screen flex flex-col bg-background">
        <Header />

        <main className="flex-1">
          {/* Hero Section */}
          <section className="py-16 md:py-20 bg-gradient-to-b from-primary/5 to-background">
            <div className="container text-center">
              <Badge className="mb-4 bg-primary/10 text-primary border-primary/20">
                <Sparkles className="h-3 w-3 mr-1" />
                Free for Hosts
              </Badge>
              
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4 leading-tight max-w-3xl mx-auto">
                Free tools to help you earn more from your mobile food asset
              </h1>
              <p className="text-lg text-muted-foreground mb-8 max-w-xl mx-auto">
                AI-powered utilities designed specifically for food truck and trailer owners.
              </p>
            </div>
          </section>

          {/* Tools Grid */}
          <section className="py-12 md:py-16">
            <div className="container">
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {tools.map((tool) => {
                  const Icon = tool.icon;
                  return (
                    <Card key={tool.name} className="group hover:shadow-lg transition-all duration-200 border hover:border-primary/20">
                      <CardHeader className="pb-3">
                        <div className={`h-11 w-11 rounded-xl bg-gradient-to-br ${tool.gradient} flex items-center justify-center shadow-md group-hover:scale-105 transition-transform duration-200`}>
                          <Icon className="h-5 w-5 text-white" />
                        </div>
                        <CardTitle className="text-lg mt-3">{tool.name}</CardTitle>
                        <CardDescription className="text-sm leading-relaxed">
                          {tool.description}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <Button asChild variant="ghost" className="w-full justify-between group-hover:bg-primary/5">
                          <Link to={tool.href}>
                            Open tool
                            <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                          </Link>
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          </section>

          {/* Why These Tools Exist */}
          <section className="py-12 bg-muted/40">
            <div className="container">
              <div className="max-w-3xl mx-auto">
                <h2 className="text-xl md:text-2xl font-bold mb-4 text-center">Why we built these tools</h2>
                <p className="text-muted-foreground text-center mb-6">
                  Starting and running a mobile food business is complex. These tools help you make smarter decisions before you list—and after.
                </p>
                <div className="grid sm:grid-cols-2 gap-3">
                  {benefits.map((benefit, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                      <span>{benefit}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* CTA Section */}
          <section className="py-16 bg-gradient-to-r from-primary/10 via-amber-500/10 to-orange-500/10">
            <div className="container text-center">
              <h2 className="text-2xl md:text-3xl font-bold mb-3">Ready to list your asset?</h2>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                Create your listing in minutes and start earning from your food truck, trailer, or equipment.
              </p>
              <div className="flex flex-wrap gap-3 justify-center">
                <Button size="lg" asChild>
                  <Link to="/host">
                    List Your Asset
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <Link to="/search">Browse Listings</Link>
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

export default ToolsIndex;
