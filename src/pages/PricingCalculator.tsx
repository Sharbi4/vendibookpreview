import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import SEO from '@/components/SEO';
import PricingCalculatorComponent from '@/components/pricing/PricingCalculator';
import { Link } from 'react-router-dom';
import { ArrowRight, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

const PricingCalculator = () => {
  return (
    <>
      <SEO
        title="Pricing Calculator | Vendibook"
        description="Calculate rental and sale fees for food trucks, trailers, and more. See exactly what you'll pay and receive with transparent pricing."
        canonical="https://vendibook.com/pricing-calculator"
      />
      
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        
        <main className="flex-1 py-12">
          <div className="container">
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-10">
                <h1 className="text-3xl md:text-4xl font-bold mb-3">Pricing Calculator</h1>
                <p className="text-muted-foreground max-w-xl mx-auto">
                  See exactly what you'll pay or receive. Transparent fees with no hidden costs.
                </p>
              </div>
              
              <PricingCalculatorComponent />
              
              {/* PricePilot Upsell */}
              <Card className="mt-8 border-amber-500/30 bg-amber-500/5">
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row items-center gap-4">
                    <div className="p-3 rounded-full bg-amber-500/10">
                      <Sparkles className="h-6 w-6 text-amber-600" />
                    </div>
                    <div className="flex-1 text-center md:text-left">
                      <h3 className="font-semibold mb-1">Want help pricing your listing?</h3>
                      <p className="text-sm text-muted-foreground">
                        PricePilot uses AI to scan comparable listings and suggest a competitive price range.
                      </p>
                    </div>
                    <Button asChild>
                      <Link to="/tools/pricepilot">
                        Try PricePilot
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
              
              {/* CTA */}
              <div className="text-center mt-12">
                <p className="text-muted-foreground mb-4">Ready to get started?</p>
                <div className="flex flex-wrap gap-3 justify-center">
                  <Button size="lg" asChild>
                    <Link to="/list">
                      Create a Listing
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                  <Button size="lg" variant="outline" asChild>
                    <Link to="/search">Browse Listings</Link>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </main>
        
        <Footer />
      </div>
    </>
  );
};

export default PricingCalculator;
