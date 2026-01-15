import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Sparkles, DollarSign, FileText, Lightbulb, X } from 'lucide-react';
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
}

const aiTools: AITool[] = [
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
      {/* NATURAL Section - Clean background */}
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
                AI-Powered Tools
              </h2>
              <p className="text-muted-foreground max-w-xl">
                Launch smarter. Price competitively. Write listings that convert.
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

        {/* AI Tools Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {aiTools.map((tool) => {
            const Icon = tool.icon;
            return (
              <button
                key={tool.id}
                onClick={() => handleToolClick(tool)}
                className="group relative p-6 rounded-2xl bg-card border border-border 
                           hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5
                           transition-all duration-300 text-left"
              >
                {/* Gradient overlay on hover */}
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/5 to-transparent 
                                opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                
                <div className="relative z-10">
                  {/* Icon */}
                  <div className="w-12 h-12 rounded-xl icon-gradient-container icon-shimmer mb-4
                                  transition-transform duration-300 group-hover:scale-110">
                    <div className="icon-gradient">
                      <Icon className="w-6 h-6 text-primary" />
                    </div>
                  </div>
                  
                  {/* Content */}
                  <h3 className="text-lg font-semibold text-foreground mb-1">
                    {tool.title}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
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
