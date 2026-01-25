import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import SEO from '@/components/SEO';
import JsonLd from '@/components/JsonLd';
import KitchenEarningsCalculatorComponent from '@/components/pricing/KitchenEarningsCalculator';
import { Link } from 'react-router-dom';
import { ArrowRight, ChefHat, TrendingUp, ShieldCheck, Clock, Users, DollarSign, CheckCircle2, BadgeCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

const KitchenEarningsCalculator = () => {
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "How much can I make renting out my commercial kitchen?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Commercial kitchen rental income varies by location, size, and equipment. Full commercial kitchens in major cities can earn $50-150/hour, $400-1,200/day, or $8,000-25,000+/month. Our AI calculator provides personalized estimates based on your specific kitchen and market."
        }
      },
      {
        "@type": "Question",
        "name": "What types of kitchens can I rent out on Vendibook?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "You can list full commercial kitchens, shared kitchen spaces, prep kitchens, and commissary kitchens. We support hourly, daily, weekly, and monthly rental arrangements."
        }
      },
      {
        "@type": "Question",
        "name": "What are Vendibook's fees for kitchen rentals?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Vendibook charges a 12.9% host commission on completed rentals. This covers payment processing, platform support, and buyer protection. Renters pay a separate 12.9% service fee."
        }
      }
    ]
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://vendibook.com" },
      { "@type": "ListItem", "position": 2, "name": "Kitchen Earnings Calculator", "item": "https://vendibook.com/kitchen-earnings-calculator" }
    ]
  };

  const benefits = [
    { icon: TrendingUp, title: "AI-Powered Estimates", description: "Get market-based pricing suggestions instantly" },
    { icon: Clock, title: "Flexible Scheduling", description: "Rent hourly, daily, weekly, or monthly" },
    { icon: ShieldCheck, title: "Verified Renters", description: "Identity verification protects your kitchen" },
    { icon: Users, title: "Growing Demand", description: "Food entrepreneurs need licensed kitchen space" },
  ];

  const stats = [
    { value: "$50-150", label: "Average hourly rate" },
    { value: "70%+", label: "Typical occupancy" },
    { value: "$8K-25K", label: "Monthly potential" },
  ];

  return (
    <>
      <SEO
        title="Commercial Kitchen Rental Earnings Calculator | How Much Can You Make?"
        description="Calculate how much you could earn renting out your commercial kitchen. Get AI-powered pricing estimates for hourly, daily, weekly, and monthly rentals."
        canonical="https://vendibook.com/kitchen-earnings-calculator"
      />
      <JsonLd schema={[faqSchema, breadcrumbSchema]} />
      
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        
        <main className="flex-1">
          {/* Hero Section */}
          <section className="py-12 md:py-20 bg-gradient-to-br from-primary/5 via-transparent to-green-500/5">
            <div className="container">
              <div className="max-w-3xl mx-auto text-center">
                <div className="inline-flex items-center gap-2 bg-green-500/10 text-green-700 dark:text-green-400 px-3 py-1 rounded-full text-sm font-medium mb-4">
                  <ChefHat className="h-4 w-4" />
                  Commercial Kitchen Rentals
                </div>
                <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
                  Turn your kitchen into a <span className="text-primary">revenue stream</span>
                </h1>
                <p className="text-lg text-muted-foreground max-w-xl mx-auto mb-8">
                  Use our AI-powered calculator to see how much you could earn renting your commercial kitchen to food entrepreneurs, caterers, and food trucks.
                </p>
                
                {/* Stats Row */}
                <div className="grid grid-cols-3 gap-4 max-w-lg mx-auto mb-8">
                  {stats.map((stat, index) => (
                    <div key={index} className="text-center">
                      <p className="text-2xl md:text-3xl font-bold text-primary">{stat.value}</p>
                      <p className="text-xs text-muted-foreground">{stat.label}</p>
                    </div>
                  ))}
                </div>

                {/* Trust Row */}
                <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    Free to list
                  </span>
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    Set your own prices
                  </span>
                  <span className="flex items-center gap-1.5">
                    <BadgeCheck className="h-4 w-4 text-primary" />
                    Renter verification
                  </span>
                </div>
              </div>
            </div>
          </section>

          {/* Benefits Section */}
          <section className="py-8 border-b border-border bg-muted/30">
            <div className="container">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
                {benefits.map((benefit, index) => (
                  <div key={index} className="text-center">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-2">
                      <benefit.icon className="h-5 w-5 text-primary" />
                    </div>
                    <h3 className="font-medium text-sm mb-0.5">{benefit.title}</h3>
                    <p className="text-xs text-muted-foreground">{benefit.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
          
          {/* Calculator Section */}
          <section className="py-12 md:py-16">
            <div className="container">
              <div className="max-w-2xl mx-auto">
                <KitchenEarningsCalculatorComponent />
                
                {/* Why List Section */}
                <Card className="mt-8 border-primary/20 bg-primary/5">
                  <CardContent className="p-6">
                    <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                      <DollarSign className="h-5 w-5 text-primary" />
                      Why List Your Kitchen on Vendibook?
                    </h3>
                    <ul className="space-y-3">
                      <li className="flex items-start gap-3 text-sm">
                        <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                        <span><strong>Passive income</strong> — Earn money from your kitchen during off-hours or unused days</span>
                      </li>
                      <li className="flex items-start gap-3 text-sm">
                        <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                        <span><strong>Identity verified renters</strong> — All renters go through our verification process</span>
                      </li>
                      <li className="flex items-start gap-3 text-sm">
                        <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                        <span><strong>Secure payments</strong> — We handle billing and deposit protection</span>
                      </li>
                      <li className="flex items-start gap-3 text-sm">
                        <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                        <span><strong>Flexible scheduling</strong> — You control availability and booking rules</span>
                      </li>
                    </ul>
                    <Button asChild className="w-full mt-6 gap-2" variant="dark-shine">
                      <Link to="/list">
                        List Your Kitchen Free
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </Button>
                  </CardContent>
                </Card>

                {/* Learn More Links */}
                <div className="text-center mt-8 space-y-2">
                  <p className="text-sm text-muted-foreground">Want to learn more?</p>
                  <div className="flex flex-wrap gap-3 justify-center">
                    <Button variant="outline" size="sm" asChild>
                      <Link to="/rent-my-commercial-kitchen">Renting Guide</Link>
                    </Button>
                    <Button variant="outline" size="sm" asChild>
                      <Link to="/pricing-calculator">Fee Calculator</Link>
                    </Button>
                    <Button variant="outline" size="sm" asChild>
                      <Link to="/how-it-works">How It Works</Link>
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </main>
        
        <Footer />
      </div>
    </>
  );
};

export default KitchenEarningsCalculator;
