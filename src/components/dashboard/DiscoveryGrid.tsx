import { Link } from 'react-router-dom';
import { Truck, ShoppingCart, Factory, MapPin, ArrowRight, Search } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface CategoryCardProps {
  title: string;
  icon: React.ElementType;
  href: string;
  description: string;
}

const CategoryCard = ({ title, icon: Icon, href, description }: CategoryCardProps) => (
  <Link to={href}>
    <Card className="border border-border shadow-md hover:shadow-lg transition-all group cursor-pointer h-full">
      <CardContent className="p-5">
        <div className="w-12 h-12 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center mb-4 group-hover:scale-105 transition-transform shadow-lg">
          <Icon className="h-6 w-6" />
        </div>
        <h3 className="text-base font-semibold text-foreground mb-1">{title}</h3>
        <p className="text-sm text-muted-foreground mb-3">{description}</p>
        <span className="inline-flex items-center text-sm font-medium text-primary group-hover:translate-x-1 transition-transform">
          Browse <ArrowRight className="h-4 w-4 ml-1" />
        </span>
      </CardContent>
    </Card>
  </Link>
);

const categories = [
  { 
    title: 'Food Trucks', 
    icon: Truck, 
    href: '/search?category=food_truck', 
    description: 'Taco trucks, pizza ovens, ice cream' 
  },
  { 
    title: 'Food Trailers', 
    icon: ShoppingCart, 
    href: '/search?category=food_trailer', 
    description: 'Mobile concession trailers' 
  },
  { 
    title: 'Ghost Kitchens', 
    icon: Factory, 
    href: '/search?category=ghost_kitchen', 
    description: 'Licensed commercial kitchens' 
  },
  { 
    title: 'Vendor Spaces', 
    icon: MapPin, 
    href: '/search?category=vendor_lot', 
    description: 'Prime vending locations' 
  },
];

export const DiscoveryHeroCard = () => (
  <Card className="border border-border shadow-md">
    <CardContent className="p-8 text-center">
      <div className="w-16 h-16 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center mx-auto mb-5 shadow-lg">
        <Search className="h-8 w-8" />
      </div>
      <h2 className="text-2xl font-bold text-foreground mb-2">Ready to start?</h2>
      <p className="text-muted-foreground mb-6 max-w-md mx-auto">
        Find the perfect truck, kitchen, or parking spot today.
      </p>
      <Button asChild size="lg" variant="dark-shine">
        <Link to="/search">
          Start Browsing
          <ArrowRight className="h-4 w-4 ml-2" />
        </Link>
      </Button>
    </CardContent>
  </Card>
);

export const DiscoveryGrid = () => (
  <div className="space-y-4">
    <h3 className="text-lg font-semibold text-foreground">Discover Categories</h3>
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {categories.map((category) => (
        <CategoryCard key={category.title} {...category} />
      ))}
    </div>
  </div>
);

export default DiscoveryGrid;
