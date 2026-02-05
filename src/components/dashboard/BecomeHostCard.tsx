import { Link } from 'react-router-dom';
import { DollarSign, Truck, ChefHat, MapPin, ArrowRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const BecomeHostCard = () => {
  return (
    <Card className="border border-border shadow-md overflow-hidden relative">
      {/* Decorative gradient blob */}
      <div className="absolute -top-20 -right-20 w-40 h-40 bg-gradient-to-br from-primary/20 to-emerald-500/20 rounded-full blur-3xl" />
      
      <CardContent className="p-6 relative">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-primary text-white flex items-center justify-center shadow-lg">
            <DollarSign className="h-6 w-6" />
          </div>
          <div>
            <h3 className="font-bold text-foreground">Earn with Vendibook</h3>
            <p className="text-sm text-muted-foreground">Turn idle assets into income</p>
          </div>
        </div>

        {/* Quick Links */}
        <div className="space-y-2 mb-6">
          <Link 
            to="/sell-my-food-truck" 
            className="flex items-center gap-3 p-3 rounded-xl bg-muted/50 hover:bg-muted transition-colors group"
          >
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center">
              <Truck className="h-5 w-5" />
            </div>
            <span className="text-sm font-medium text-foreground flex-1">Sell a Food Truck</span>
            <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
          </Link>
          
          <Link 
            to="/rent-my-commercial-kitchen" 
            className="flex items-center gap-3 p-3 rounded-xl bg-muted/50 hover:bg-muted transition-colors group"
          >
            <div className="w-10 h-10 rounded-xl bg-blue-500 text-white flex items-center justify-center">
              <ChefHat className="h-5 w-5" />
            </div>
            <span className="text-sm font-medium text-foreground flex-1">List a Kitchen</span>
            <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
          </Link>
          
          <Link 
            to="/vendor-lots" 
            className="flex items-center gap-3 p-3 rounded-xl bg-muted/50 hover:bg-muted transition-colors group"
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center">
              <MapPin className="h-5 w-5" />
            </div>
            <span className="text-sm font-medium text-foreground flex-1">List a Vendor Lot</span>
            <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
          </Link>
        </div>

        {/* CTA */}
        <Button asChild className="w-full" size="lg">
          <Link to="/list">
            Create a Listing
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
};

export default BecomeHostCard;
