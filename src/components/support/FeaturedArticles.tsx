import { Link } from 'react-router-dom';
import { BookOpen, ChevronRight, Truck, ShoppingCart, ClipboardCheck, Wrench, DollarSign, Shield } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface FeaturedArticle {
  slug: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}

const featuredArticles: FeaturedArticle[] = [
  {
    slug: 'rentals-end-to-end',
    title: 'How Rentals Work',
    description: 'Complete guide to renting mobile kitchens on Vendibook',
    icon: Truck,
  },
  {
    slug: 'buying-end-to-end',
    title: 'How Buying Works',
    description: 'Everything about purchasing equipment on our platform',
    icon: ShoppingCart,
  },
  {
    slug: 'pre-rental-inspection',
    title: 'Pre-Rental Inspection',
    description: 'Checklist to protect yourself when renting equipment',
    icon: ClipboardCheck,
  },
  {
    slug: 'preventive-maintenance',
    title: 'Preventive Maintenance',
    description: 'Keep your equipment running smoothly',
    icon: Wrench,
  },
];

const quickLinks = [
  { href: '/faq#fees-commission', label: 'Fees & Pricing', icon: DollarSign },
  { href: '/help', label: 'Help Center', icon: BookOpen },
  { href: '/faq#trust-safety', label: 'Trust & Safety', icon: Shield },
];

const FeaturedArticles = () => {
  return (
    <div className="space-y-6">
      {/* Featured Articles */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <BookOpen className="h-5 w-5 text-primary" />
          <h3 className="font-semibold text-foreground">Featured Articles</h3>
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          {featuredArticles.map((article) => {
            const IconComponent = article.icon;
            return (
              <Link key={article.slug} to={`/help/${article.slug}`}>
                <Card className="h-full hover:border-primary/50 hover:shadow-sm transition-all cursor-pointer group">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                        <IconComponent className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <h4 className="font-medium text-foreground text-sm group-hover:text-primary transition-colors">
                            {article.title}
                          </h4>
                          <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {article.description}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Quick Links */}
      <div className="flex flex-wrap gap-2">
        {quickLinks.map((link) => {
          const IconComponent = link.icon;
          return (
            <Link
              key={link.href}
              to={link.href}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted hover:bg-primary/10 text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              <IconComponent className="h-3.5 w-3.5" />
              {link.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
};

export default FeaturedArticles;
