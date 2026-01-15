import { Link } from 'react-router-dom';
import { BookOpen, ChevronRight, Truck, ShoppingCart, ClipboardCheck, Wrench, DollarSign, Shield, HelpCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface FeaturedArticle {
  slug: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  gradient: string;
}

const featuredArticles: FeaturedArticle[] = [
  {
    slug: 'rentals-end-to-end',
    title: 'How Rentals Work',
    description: 'Complete guide to renting mobile kitchens',
    icon: Truck,
    gradient: 'from-blue-500 to-blue-600',
  },
  {
    slug: 'buying-end-to-end',
    title: 'How Buying Works',
    description: 'Everything about purchasing equipment',
    icon: ShoppingCart,
    gradient: 'from-green-500 to-green-600',
  },
  {
    slug: 'pre-rental-inspection',
    title: 'Pre-Rental Inspection',
    description: 'Checklist to protect yourself',
    icon: ClipboardCheck,
    gradient: 'from-orange-500 to-orange-600',
  },
  {
    slug: 'preventive-maintenance',
    title: 'Preventive Maintenance',
    description: 'Keep your equipment running smoothly',
    icon: Wrench,
    gradient: 'from-purple-500 to-purple-600',
  },
];

const quickLinks = [
  { href: '/faq#fees-commission', label: 'Fees & Pricing', icon: DollarSign },
  { href: '/help', label: 'Help Center', icon: HelpCircle },
  { href: '/faq#trust-safety', label: 'Trust & Safety', icon: Shield },
];

const FeaturedArticles = () => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-primary" />
          <h3 className="font-bold text-foreground">Popular Articles</h3>
        </div>
        <Link 
          to="/help" 
          className="text-sm text-primary hover:text-primary/80 font-medium flex items-center gap-1 group"
        >
          View all
          <ChevronRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
        </Link>
      </div>

      {/* Articles Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {featuredArticles.map((article) => {
          const IconComponent = article.icon;
          return (
            <Link key={article.slug} to={`/help/${article.slug}`}>
              <Card className="h-full border-0 bg-muted/50 hover:bg-muted/80 hover:shadow-md transition-all duration-200 cursor-pointer group">
                <CardContent className="p-4">
                  <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${article.gradient} text-white flex items-center justify-center mb-3 shadow-md group-hover:scale-105 transition-transform`}>
                    <IconComponent className="h-5 w-5" />
                  </div>
                  <h4 className="font-semibold text-foreground text-sm mb-1 group-hover:text-primary transition-colors">
                    {article.title}
                  </h4>
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {article.description}
                  </p>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      {/* Quick Links */}
      <div className="flex flex-wrap justify-center gap-2 pt-2">
        {quickLinks.map((link) => {
          const IconComponent = link.icon;
          return (
            <Link
              key={link.href}
              to={link.href}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-muted/80 hover:bg-primary/10 text-sm text-muted-foreground hover:text-primary transition-colors font-medium"
            >
              <IconComponent className="h-4 w-4" />
              {link.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
};

export default FeaturedArticles;
