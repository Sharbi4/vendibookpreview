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
  Megaphone
} from 'lucide-react';

const tools = [
  {
    name: 'PricePilot',
    description: 'Get data-backed pricing recommendations for your food truck, trailer, or ghost kitchen.',
    icon: DollarSign,
    gradient: 'from-yellow-400 to-orange-500',
    href: '/tools/pricepilot',
    tag: 'Pricing'
  },
  {
    name: 'PermitPath',
    description: 'Find all licenses, permits, and compliance requirements mapped to your city and setup.',
    icon: FileCheck,
    gradient: 'from-amber-400 to-orange-600',
    href: '/tools/permitpath',
    tag: 'Compliance'
  },
  {
    name: 'Listing Studio',
    description: 'Turn specs into high-converting listings with AI-generated titles, descriptions, and highlights.',
    icon: FileText,
    gradient: 'from-rose-400 to-pink-600',
    href: '/tools/listing-studio',
    tag: 'Copy'
  },
  {
    name: 'Concept Lab',
    description: 'Generate sellable food truck concepts designed for your market and margins.',
    icon: Lightbulb,
    gradient: 'from-yellow-300 to-amber-500',
    href: '/tools/concept-lab',
    tag: 'Ideas'
  },
  {
    name: 'BuildKit',
    description: 'Get equipment recommendations and maintenance guides for commercial kitchen equipment.',
    icon: Wrench,
    gradient: 'from-orange-400 to-red-500',
    href: '/tools/buildkit',
    tag: 'Equipment'
  },
  {
    name: 'Market Radar',
    description: 'AI-powered market research with location intel, competitor snapshots, and demand signals.',
    icon: Search,
    gradient: 'from-blue-400 to-indigo-600',
    href: '/tools/market-radar',
    tag: 'Research'
  },
  {
    name: 'Marketing Studio',
    description: 'Create social posts, flyers, emails, menu copy, taglines, and AI-generated images.',
    icon: Megaphone,
    gradient: 'from-pink-500 to-purple-600',
    href: '/tools/marketing-studio',
    tag: 'Marketing'
  }
];

const pageJsonLd = {
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  "name": "Vendi AI Suite - Free AI Tools for Food Truck Businesses",
  "description": "Access 6 powerful AI tools designed specifically for food truck owners. Pricing, permits, listings, concepts, equipment, and market research.",
  "url": "https://vendibook.com/tools"
};

const ToolsIndex = () => {
  return (
    <>
      <SEO
        title="Vendi AI Suite | Free AI Tools for Food Trucks | Vendibook"
        description="Access 6 powerful AI tools designed specifically for food truck owners. Get pricing recommendations, find permits, generate listings, and more."
        canonical="/tools"
      />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(pageJsonLd) }} />
      
      <div className="min-h-screen flex flex-col bg-background">
        <Header />

        <main className="flex-1">
          {/* Hero Section */}
          <section className="relative py-16 md:py-24 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-amber-500/5 to-orange-500/10" />
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <div className="absolute top-10 right-10 w-[400px] h-[400px] bg-gradient-to-br from-primary/10 to-amber-500/8 rounded-full blur-3xl animate-pulse" />
              <div className="absolute bottom-10 left-10 w-[350px] h-[350px] bg-gradient-to-tr from-amber-500/8 to-orange-500/6 rounded-full blur-3xl" />
            </div>
            
            <div className="container relative z-10 text-center">
              <Badge className="mb-4 bg-gradient-to-r from-primary to-amber-500 text-white border-0">
                <Sparkles className="h-3 w-3 mr-1" />
                Vendi AI Suite
              </Badge>
              
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-4 leading-tight">
                AI tools built for <span className="text-primary">food truck success</span>
              </h1>
              <p className="text-xl text-foreground/70 mb-8 max-w-2xl mx-auto">
                6 powerful AI tools to help you price smarter, stay compliant, write better listings, and grow your mobile food business.
              </p>
            </div>
          </section>

          {/* Tools Grid */}
          <section className="py-16 bg-muted/30">
            <div className="container">
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {tools.map((tool) => {
                  const Icon = tool.icon;
                  return (
                    <Card key={tool.name} className="group hover:shadow-xl transition-all duration-300 border-0 shadow-lg overflow-hidden">
                      <CardHeader>
                        <div className="flex items-start justify-between gap-4">
                          <div className={`h-14 w-14 rounded-xl bg-gradient-to-br ${tool.gradient} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                            <Icon className="h-7 w-7 text-white" />
                          </div>
                          <Badge variant="secondary" className="text-xs">
                            {tool.tag}
                          </Badge>
                        </div>
                        <CardTitle className="text-xl mt-4">{tool.name}</CardTitle>
                        <CardDescription className="text-sm">
                          {tool.description}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <Button asChild className="w-full group-hover:bg-primary group-hover:text-primary-foreground" variant="outline">
                          <Link to={tool.href}>
                            Use {tool.name}
                            <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
                          </Link>
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          </section>

          {/* CTA Section */}
          <section className="py-20 bg-gradient-to-r from-primary/10 via-amber-500/10 to-orange-500/10">
            <div className="container text-center">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to supercharge your business?</h2>
              <p className="text-lg text-muted-foreground mb-8 max-w-xl mx-auto">
                All tools are free to use. Start with any tool above or explore the full Command Center.
              </p>
              <div className="flex flex-wrap gap-4 justify-center">
                <Button size="lg" asChild>
                  <Link to="/ai-tools">
                    Open Command Center
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <Link to="/create-listing">Create a Listing</Link>
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
