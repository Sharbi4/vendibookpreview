import { Link } from 'react-router-dom';
import { ArrowRight, BookOpen, Wrench, ChefHat, Thermometer, HelpCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const featuredArticles = [
  {
    slug: 'ghost-kitchen-launch',
    title: 'Starting a Ghost Kitchen',
    description: 'Step-by-step launch checklist for facility selection, equipment, and compliance.',
    icon: ChefHat,
  },
  {
    slug: 'preventive-maintenance',
    title: 'Preventive Maintenance',
    description: 'Reduce breakdowns and protect rental value with scheduled upkeep.',
    icon: Wrench,
  },
  {
    slug: 'food-safety-temps',
    title: 'Food Safety Temperatures',
    description: 'Essential holding, cooking, and cooling temps to stay compliant.',
    icon: Thermometer,
  },
];

const HelpCenterPreview = () => {
  return (
    <section className="py-16 md:py-20 relative overflow-hidden" aria-labelledby="help-center-heading">
      {/* GRADIENT Section - #FF5124 Orange based */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#FF5124]/20 via-[#FF5124]/12 to-amber-200/10" />
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-10 left-1/4 w-72 h-72 bg-[#FF5124]/18 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-1/4 w-80 h-80 bg-[#FF5124]/15 rounded-full blur-3xl animate-pulse" />
        <div className="absolute top-1/2 right-10 w-64 h-64 bg-amber-300/12 rounded-full blur-3xl" />
      </div>
      <div className="container max-w-7xl mx-auto px-4 relative z-10">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-10">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl icon-gradient-container icon-shimmer">
              <div className="icon-gradient">
                <BookOpen className="w-6 h-6 text-primary" />
              </div>
            </div>
            <div>
              <h2 
                id="help-center-heading" 
                className="text-2xl md:text-3xl font-semibold text-foreground mb-2"
              >
                Help Center
              </h2>
              <p className="text-muted-foreground max-w-xl">
                Practical guides for renting, buying, and maintaining mobile kitchens.
              </p>
            </div>
          </div>
          <Link 
            to="/help" 
            className="inline-flex items-center gap-1.5 text-sm text-primary hover:text-primary/80 
                       transition-colors group whitespace-nowrap font-medium"
          >
            Browse all articles
            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>

        {/* Featured Articles Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {featuredArticles.map((article) => {
            const Icon = article.icon;
            return (
              <Link key={article.slug} to={`/help/${article.slug}`}>
                <Card className="group h-full hover:shadow-lg transition-all duration-300 border hover:border-primary/30 cursor-pointer">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between mb-3">
                      <div className="w-12 h-12 rounded-xl icon-gradient-container icon-shimmer 
                                      transition-transform duration-300 group-hover:scale-110">
                        <div className="icon-gradient">
                          <Icon className="w-6 h-6 text-primary" />
                        </div>
                      </div>
                      <Badge variant="secondary" className="text-xs">Guide</Badge>
                    </div>
                    <CardTitle className="text-lg leading-tight group-hover:text-primary transition-colors">
                      {article.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-sm leading-relaxed mb-4">
                      {article.description}
                    </CardDescription>
                    <span className="inline-flex items-center text-sm font-medium text-primary">
                      Read guide
                      <ArrowRight className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform" />
                    </span>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>

        {/* Support CTA */}
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4 text-center">
          <div className="flex items-center gap-2 text-muted-foreground">
            <HelpCircle className="w-4 h-4" />
            <span className="text-sm">Can't find what you're looking for?</span>
          </div>
          <Link 
            to="/contact" 
            className="inline-flex items-center gap-1.5 text-sm text-primary hover:text-primary/80 
                       transition-colors font-medium"
          >
            Contact Support
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  );
};

export default HelpCenterPreview;
