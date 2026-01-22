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
  Megaphone,
  CheckCircle2
} from 'lucide-react';

// Benefit-first descriptions: "Do X so you Y"
const tools = [
  {
    name: 'PricePilot',
    description: 'Set competitive rates so you book faster.',
    icon: DollarSign,
    gradient: 'from-yellow-400 to-orange-500',
    href: '/tools/pricepilot',
  },
  {
    name: 'PermitPath',
    description: 'Find required licenses so you stay compliant.',
    icon: FileCheck,
    gradient: 'from-amber-400 to-orange-600',
    href: '/tools/permitpath',
  },
  {
    name: 'Listing Studio',
    description: 'Write listings that convert browsers to bookers.',
    icon: FileText,
    gradient: 'from-rose-400 to-pink-600',
    href: '/tools/listing-studio',
  },
  {
    name: 'Concept Lab',
    description: 'Generate business concepts matched to your market.',
    icon: Lightbulb,
    gradient: 'from-yellow-300 to-amber-500',
    href: '/tools/concept-lab',
  },
  {
    name: 'BuildKit',
    description: 'Get equipment guides so you maintain with confidence.',
    icon: Wrench,
    gradient: 'from-orange-400 to-red-500',
    href: '/tools/buildkit',
  },
  {
    name: 'Market Radar',
    description: 'Research demand so you pick the right location.',
    icon: Search,
    gradient: 'from-blue-400 to-indigo-600',
    href: '/tools/market-radar',
  },
  {
    name: 'Marketing Studio',
    description: 'Create promos so you attract more customers.',
    icon: Megaphone,
    gradient: 'from-pink-500 to-purple-600',
    href: '/tools/marketing-studio',
  }
];

const benefits = [
  'Price competitively based on real market data',
  'Know your permit requirements before you start',
  'Write listings that actually convert',
  'Maintain your equipment with confidence'
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
          {/* Hero Section - Clear, benefit-first headline */}
          <section className="py-16 md:py-20 bg-gradient-to-b from-primary/5 to-background">
            <div className="container text-center">
              <Badge className="mb-4 bg-primary/10 text-primary border-primary/20">
                100% Free
              </Badge>
              
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4 leading-tight max-w-3xl mx-auto">
                Host Tools
              </h1>
              <p className="text-lg text-muted-foreground mb-8 max-w-lg mx-auto">
                Free utilities to help you price, write, and stay compliant—so you earn more and book faster.
              </p>
              
              {/* Primary CTA */}
              <Button size="lg" variant="dark-shine" asChild>
                <Link to="/tools/pricepilot">
                  <DollarSign className="h-5 w-5 mr-2" />
                  Start with PricePilot
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Link>
              </Button>
              <p className="text-sm text-muted-foreground mt-3">
                Most popular — set your rates in 60 seconds
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
                        <Button asChild variant="dark-shine" className="w-full justify-between">
                          <Link to={tool.href}>
                            Try {tool.name}
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
                <Button size="lg" variant="dark-shine" asChild>
                  <Link to="/host">
                    List Your Asset
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Link>
                </Button>
                <Button size="lg" variant="dark-shine" asChild>
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
