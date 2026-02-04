import { Link } from 'react-router-dom';
import { 
  ArrowRight, 
  Sparkles, 
  Scale, 
  Rocket,
  Star
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AITool {
  id: string;
  icon: React.ElementType;
  title: string;
  tagline: string;
  description: string;
  cta: string;
  href: string;
  featured?: boolean;
  comingSoon?: boolean;
}

const aiTools: AITool[] = [
  {
    id: 'startup-guide',
    icon: Rocket,
    title: 'Startup Guide',
    tagline: 'The ultimate checklist from concept to opening day',
    description: 'A step-by-step interactive guide to launching your food truck business. Track your progress, access funding resources, and get expert advice for every stage of the journey.',
    cta: 'Start Your Journey',
    href: '/tools/startup-guide',
    featured: true
  },
  {
    id: 'regulations',
    icon: Scale,
    title: 'Regulations Hub',
    tagline: 'Permits, licenses, and compliance mapped to your city',
    description: 'Instantly identify every license, permit, and insurance requirement for your specific city and state. Save weeks of research and prevent costly compliance mistakes.',
    cta: 'Find Requirements',
    href: '/tools/regulations-hub',
    featured: true
  }
];

const AIToolsSection = () => {
  return (
    <section className="py-24 bg-background border-t border-border/40">
      <div className="container max-w-7xl mx-auto px-4 relative z-10">
        
        {/* Simplified Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium mb-6">
            <Sparkles className="w-3 h-3" />
            Host Operating System
          </div>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
            Everything you need to launch.
          </h2>
          <p className="text-lg text-muted-foreground">
            We don't just list your truck. We help you build the business behind it.
          </p>
        </div>

        {/* The Two Main Tools */}
        <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {aiTools.map((tool) => {
            const Icon = tool.icon;
            return (
              <Link 
                key={tool.id}
                to={tool.href}
                className="group relative flex flex-col p-8 rounded-3xl bg-card border border-border/50 hover:border-primary/50 hover:shadow-xl transition-all duration-300"
              >
                <div className="mb-6 flex items-start justify-between">
                  <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform duration-300">
                    <Icon className="w-7 h-7" />
                  </div>
                  {tool.id === 'startup-guide' && (
                    <span className="px-3 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-xs font-bold rounded-full flex items-center gap-1">
                      <Star className="w-3 h-3 fill-current" />
                      Essential
                    </span>
                  )}
                </div>

                <h3 className="text-2xl font-bold mb-2">{tool.title}</h3>
                <p className="text-primary font-medium text-sm mb-4">{tool.tagline}</p>
                <p className="text-muted-foreground leading-relaxed mb-8 flex-1">
                  {tool.description}
                </p>

                <div className="mt-auto">
                  <Button variant="outline" className="w-full group-hover:bg-primary group-hover:text-primary-foreground border-primary/20">
                    {tool.cta} <ArrowRight className="ml-2 w-4 h-4" />
                  </Button>
                </div>
              </Link>
            );
          })}
        </div>

        {/* Coming Soon Teaser */}
        <div className="mt-16 text-center">
          <p className="text-sm text-muted-foreground">
            More tools coming soon: <span className="font-medium text-foreground">AI Pricing</span> • <span className="font-medium text-foreground">Market Radar</span> • <span className="font-medium text-foreground">Listing Studio</span>
          </p>
        </div>

      </div>
    </section>
  );
};

export default AIToolsSection;
