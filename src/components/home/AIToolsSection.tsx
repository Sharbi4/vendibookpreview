import { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  ArrowRight, 
  Sparkles, 
  DollarSign, 
  FileText, 
  Lightbulb, 
  Scale, 
  Wrench, 
  TrendingUp,
  Star
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface AITool {
  id: string;
  icon: React.ElementType;
  title: string;
  tagline: string;
  description: string;
  features: string[];
  cta: string;
  featured?: boolean;
}

const aiTools: AITool[] = [
  {
    id: 'license-finder',
    icon: Scale,
    title: 'License & Permit Finder',
    tagline: 'Know exactly what permits you need',
    description: 'Navigate the complex world of food truck licenses, mobile vendor permits, health department certifications, and business registrations. Our AI instantly identifies every license, permit, and insurance requirement for your specific city and state—saving you weeks of research and preventing costly compliance mistakes.',
    features: [
      'State-by-state food truck license requirements',
      'City-specific mobile vendor permit lookup',
      'Health department permit checklist',
      'Commercial liability insurance requirements',
      'Timeline & cost estimates for each permit',
      'Direct links to official application portals'
    ],
    cta: 'Find My Licenses',
    featured: true
  },
  {
    id: 'pricing',
    icon: DollarSign,
    title: 'Smart Pricing Generator',
    tagline: 'Set competitive rates instantly',
    description: 'Our AI analyzes market data, location, and your listing features to suggest optimal daily, weekly, and sale prices that maximize your earnings while staying competitive.',
    features: [
      'Market-based pricing recommendations',
      'Location-aware rate adjustments',
      'Category-specific insights',
      'Seasonal pricing suggestions'
    ],
    cta: 'Generate Pricing'
  },
  {
    id: 'description',
    icon: FileText,
    title: 'Listing Description Writer',
    tagline: 'Craft compelling listings in seconds',
    description: 'Transform basic details into professional, engaging listing descriptions that highlight your unique selling points and attract more bookings.',
    features: [
      'SEO-optimized descriptions',
      'Highlight generation',
      'Professional tone matching',
      'Key feature emphasis'
    ],
    cta: 'Write Description'
  },
  {
    id: 'equipment-guide',
    icon: Wrench,
    title: 'Equipment Maintenance Guide',
    tagline: 'Keep your equipment running smoothly',
    description: 'Get step-by-step maintenance guides, troubleshooting tips, and care schedules for commercial kitchen equipment. From fryers to refrigeration units, keep your food truck or trailer in peak condition.',
    features: [
      'Daily, weekly, monthly maintenance schedules',
      'Step-by-step repair & cleaning guides',
      'Troubleshooting common issues',
      'Safety tips & professional service recommendations'
    ],
    cta: 'Get Equipment Guide'
  },
  {
    id: 'market-research',
    icon: TrendingUp,
    title: 'Market Research Tool',
    tagline: 'Understand your local food market',
    description: 'Discover market trends, competitor analysis, and industry insights for the mobile food industry. Make data-driven decisions about locations, menu offerings, and pricing strategies.',
    features: [
      'Local food truck market analysis',
      'Competitor & trend research',
      'Industry growth insights',
      'Location demand forecasting'
    ],
    cta: 'Research Market'
  },
  {
    id: 'business-idea',
    icon: Lightbulb,
    title: 'Business Idea Generator',
    tagline: 'Discover your next venture',
    description: 'Get personalized food business concepts tailored to your interests, budget, and local market opportunities. From food trucks to ghost kitchens, find your perfect fit.',
    features: [
      'Budget-conscious suggestions',
      'Market gap analysis',
      'Concept validation tips',
      'Revenue projections'
    ],
    cta: 'Explore Ideas'
  }
];

const AIToolsSection = () => {
  const [selectedTool, setSelectedTool] = useState<AITool | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const handleToolClick = (tool: AITool) => {
    setSelectedTool(tool);
    setModalOpen(true);
  };

  return (
    <section className="py-16 md:py-20 bg-background" aria-labelledby="ai-tools-heading">
      {/* SEO-rich hidden content for search engines */}
      <div className="sr-only">
        <h1>Free AI Tools for Food Truck Owners and Mobile Vendors</h1>
        <p>Vendibook offers free AI-powered tools to help food truck entrepreneurs succeed: license finder, permit lookup, pricing calculator, equipment maintenance guides, and business planning tools.</p>
        <ul>
          <li>Food truck license requirements by state - California, Texas, Florida, New York, and all 50 states</li>
          <li>Mobile vendor permit lookup - city-specific requirements for street vending</li>
          <li>Health department permit checklist for food trucks and food trailers</li>
          <li>Commercial kitchen equipment maintenance schedules</li>
          <li>Food truck business startup cost calculator</li>
          <li>Ghost kitchen licensing requirements</li>
        </ul>
      </div>

      <div className="container max-w-7xl mx-auto px-4 relative z-10">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-10">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl icon-gradient-container icon-shimmer">
              <div className="icon-gradient">
                <Sparkles className="w-6 h-6 text-primary" />
              </div>
            </div>
            <div>
              <h2 
                id="ai-tools-heading" 
                className="text-2xl md:text-3xl font-semibold text-foreground mb-2"
              >
                AI-Powered Tools for Food Entrepreneurs
              </h2>
              <p className="text-muted-foreground max-w-xl">
                Find licenses & permits, set competitive pricing, research your market, and launch your food business smarter—all powered by AI.
              </p>
            </div>
          </div>
          <Link 
            to="/ai-tools" 
            className="inline-flex items-center gap-1.5 text-sm text-primary hover:text-primary/80 
                       transition-colors group whitespace-nowrap font-medium"
          >
            Try all AI tools free
            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>

        {/* Featured Tool - License Finder */}
        {aiTools.filter(t => t.featured).map((tool) => {
          const Icon = tool.icon;
          return (
            <button
              key={tool.id}
              onClick={() => handleToolClick(tool)}
              className="group relative w-full p-6 md:p-8 rounded-2xl bg-gradient-to-br from-primary/10 via-card to-card 
                         border-2 border-primary/20 hover:border-primary/40 hover:shadow-xl hover:shadow-primary/10
                         transition-all duration-300 text-left mb-8"
            >
              {/* Star badge */}
              <div className="absolute -top-3 left-6 px-3 py-1 bg-primary text-primary-foreground text-xs font-semibold rounded-full flex items-center gap-1">
                <Star className="w-3 h-3 fill-current" />
                Most Popular
              </div>
              
              <div className="flex flex-col md:flex-row md:items-center gap-6">
                {/* Icon */}
                <div className="w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center flex-shrink-0
                                transition-transform duration-300 group-hover:scale-110">
                  <Icon className="w-8 h-8 text-primary" />
                </div>
                
                {/* Content */}
                <div className="flex-1">
                  <h3 className="text-xl md:text-2xl font-bold text-foreground mb-2">
                    {tool.title}
                  </h3>
                  <p className="text-muted-foreground mb-3 max-w-2xl">
                    {tool.tagline} — Instantly discover food truck permits, mobile vendor licenses, health department certifications, and insurance requirements for any city or state.
                  </p>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {['Food Truck Permits', 'Mobile Vendor Licenses', 'Health Dept. Certs', 'Insurance Requirements'].map((tag) => (
                      <span key={tag} className="px-2.5 py-1 bg-primary/10 text-primary text-xs font-medium rounded-full">
                        {tag}
                      </span>
                    ))}
                  </div>
                  <span className="inline-flex items-center gap-2 text-primary font-semibold group-hover:gap-3 transition-all">
                    {tool.cta}
                    <ArrowRight className="w-5 h-5" />
                  </span>
                  
                  {/* Disclaimer */}
                  <p className="text-xs text-muted-foreground mt-3 italic">
                    *AI-generated results are for informational purposes only. Requirements vary by jurisdiction—always verify with your local government agencies before applying.
                  </p>
                </div>
              </div>
            </button>
          );
        })}

        {/* AI Tools Grid - Other tools */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {aiTools.filter(t => !t.featured).map((tool) => {
            const Icon = tool.icon;
            return (
              <button
                key={tool.id}
                onClick={() => handleToolClick(tool)}
                className="group relative p-5 rounded-2xl bg-card border border-border 
                           hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5
                           transition-all duration-300 text-left"
              >
                {/* Gradient overlay on hover */}
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/5 to-transparent 
                                opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                
                <div className="relative z-10">
                  {/* Icon */}
                  <div className="w-11 h-11 rounded-xl icon-gradient-container icon-shimmer mb-3
                                  transition-transform duration-300 group-hover:scale-110">
                    <div className="icon-gradient">
                      <Icon className="w-5 h-5 text-primary" />
                    </div>
                  </div>
                  
                  {/* Content */}
                  <h3 className="text-base font-semibold text-foreground mb-1">
                    {tool.title}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                    {tool.tagline}
                  </p>
                  
                  {/* Learn More Link */}
                  <span className="inline-flex items-center gap-1 text-sm text-primary font-medium
                                   group-hover:gap-2 transition-all">
                    Learn more
                    <ArrowRight className="w-4 h-4" />
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Bottom CTA */}
        <div className="mt-10 text-center">
          <p className="text-sm text-muted-foreground mb-4">
            All AI tools are <span className="text-primary font-medium">free to use</span> — no credit card required
          </p>
          <Link to="/ai-tools">
            <Button size="lg" className="gap-2">
              <Sparkles className="w-4 h-4" />
              Explore AI Tools
            </Button>
          </Link>
        </div>
      </div>

      {/* Tool Detail Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-lg">
          {selectedTool && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <selectedTool.icon className="w-5 h-5 text-primary" />
                  </div>
                  <DialogTitle className="text-xl">{selectedTool.title}</DialogTitle>
                </div>
                <DialogDescription className="text-base">
                  {selectedTool.description}
                  {selectedTool.id === 'license-finder' && (
                    <span className="block mt-2 text-xs text-muted-foreground italic">
                      *Results are AI-generated and for informational purposes only. Licensing requirements change frequently—always confirm with your local city, county, and state agencies.
                    </span>
                  )}
                </DialogDescription>
              </DialogHeader>
              
              <div className="mt-4">
                <h4 className="text-sm font-semibold text-foreground mb-3">What you'll get:</h4>
                <ul className="space-y-2">
                  {selectedTool.features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
              
              <div className="mt-6 flex gap-3">
                <Link to="/ai-tools" className="flex-1">
                  <Button className="w-full gap-2">
                    <Sparkles className="w-4 h-4" />
                    {selectedTool.cta}
                  </Button>
                </Link>
                <Button variant="outline" onClick={() => setModalOpen(false)}>
                  Close
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
};

export default AIToolsSection;
