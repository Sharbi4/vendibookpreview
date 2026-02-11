import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import SEO from '@/components/SEO';
import JsonLd from '@/components/JsonLd';
import PricingCalculatorComponent from '@/components/pricing/PricingCalculator';
import { Link } from 'react-router-dom';
import { ArrowRight, Sparkles, ShieldCheck, Eye, BadgeCheck, CreditCard, Percent, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import affirmLogo from '@/assets/affirm-logo.png';
import afterpayLogo from '@/assets/afterpay-logo.jpg';

const PricingCalculator = () => {
  // FAQ schema for transparent pricing
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "What are Vendibook's fees for selling a food truck?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Vendibook charges a 12.9% seller commission on sales processed through our secure platform. There are no hidden fees. Buyers pay the listing price with no additional platform fee."
        }
      },
      {
        "@type": "Question",
        "name": "Can I sell my food truck without paying any fees?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Yes! You can choose 'Pay in Person' to handle payment directly with your buyer at no cost. Our platform fee only applies when you use our secure checkout for added protection."
        }
      },
      {
        "@type": "Question",
        "name": "What are the rental fees on Vendibook?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "For rentals, hosts pay a 3% commission and renters pay a 12% service fee. These fees cover secure payments, messaging, and platform support."
        }
      }
    ]
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://vendibook.com" },
      { "@type": "ListItem", "position": 2, "name": "Pricing Calculator", "item": "https://vendibook.com/pricing-calculator" }
    ]
  };

  const transparencyPoints = [
    { icon: Eye, title: "No hidden fees", description: "What you see is what you pay. Period." },
    { icon: Percent, title: "Simple commission", description: "12.9% on sales, 3% host / 12% renter on rentals." },
    { icon: CreditCard, title: "Pay in Person option", description: "Handle payment directly — completely free." },
    { icon: ShieldCheck, title: "Buyer protection included", description: "Secure checkout protects both parties." },
  ];

  return (
    <>
      <SEO
        title="Transparent Pricing Calculator | Vendibook Fees Explained"
        description="See exactly what you'll pay and receive when selling or renting on Vendibook. No hidden fees, no surprises — just transparent pricing for food trucks, trailers, and more."
        canonical="https://vendibook.com/pricing-calculator"
      />
      <JsonLd schema={[faqSchema, breadcrumbSchema]} />
      
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        
        <main className="flex-1">
          {/* Hero Section */}
          <section className="py-12 md:py-16 bg-[hsl(30,10%,97%)]">
            <div className="container">
              <div className="max-w-3xl mx-auto text-center">
                <div className="inline-flex items-center gap-2 bg-green-500/10 text-green-700 dark:text-green-400 px-3 py-1 rounded-full text-sm font-medium mb-4">
                  <Eye className="h-4 w-4" />
                  100% Transparent Pricing
                </div>
                <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
                  Know exactly what you'll pay — and keep.
                </h1>
                <p className="text-lg text-muted-foreground max-w-xl mx-auto mb-6">
                  No hidden fees. No surprises. Calculate your rental or sale fees instantly and see how we compare to other platforms.
                </p>
                
                {/* Trust Row */}
                <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    No listing fees
                  </span>
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    Free for pay-in-person
                  </span>
                  <span className="flex items-center gap-1.5">
                    <BadgeCheck className="h-4 w-4 text-primary" />
                    Buyer protection included
                  </span>
                </div>
              </div>
            </div>
          </section>

          {/* Transparency Points */}
          <section className="py-8 border-b border-border bg-muted/30">
            <div className="container">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
                {transparencyPoints.map((point, index) => (
                  <div key={index} className="text-center">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-2">
                      <point.icon className="h-5 w-5 text-primary" />
                    </div>
                    <h3 className="font-medium text-sm mb-0.5">{point.title}</h3>
                    <p className="text-xs text-muted-foreground">{point.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
          
          {/* Calculator Section */}
          <section className="py-12">
            <div className="container">
              <div className="max-w-4xl mx-auto">
                <PricingCalculatorComponent />
                
                {/* BNPL Section */}
                <Card className="mt-8 border-blue-500/20 bg-blue-500/5">
                  <CardContent className="p-6">
                    <div className="flex flex-col sm:flex-row items-center gap-4">
                      <div className="flex items-center gap-4">
                        <Link to="/payments" className="hover:opacity-80 transition-opacity">
                          <img src={affirmLogo} alt="Affirm" className="h-6 md:h-8 object-contain dark:invert" />
                        </Link>
                        <Link to="/payments" className="hover:opacity-80 transition-opacity">
                          <img src={afterpayLogo} alt="Afterpay" className="h-5 md:h-6 object-contain dark:invert" />
                        </Link>
                      </div>
                      <div className="flex-1 text-center sm:text-left">
                        <h3 className="font-semibold text-sm mb-0.5">Flexible payment options for buyers</h3>
                        <p className="text-xs text-muted-foreground">
                          Let buyers pay over time with Affirm or Afterpay — you get paid upfront.
                        </p>
                      </div>
                      <Button variant="outline" size="sm" asChild className="gap-1 shrink-0">
                        <Link to="/payments">
                          Learn more
                          <ArrowRight className="h-3 w-3" />
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
                
                {/* PricePilot Upsell */}
                <Card className="mt-4 border-amber-500/30 bg-amber-500/5">
                  <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row items-center gap-4">
                      <div className="p-3 rounded-full bg-amber-500/10">
                        <Sparkles className="h-6 w-6 text-amber-600" />
                      </div>
                      <div className="flex-1 text-center md:text-left">
                        <h3 className="font-semibold mb-1">Not sure what to price it at?</h3>
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
                  <p className="text-muted-foreground mb-4">Ready to list with transparent pricing?</p>
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
          </section>
        </main>
        
        <Footer />
      </div>
    </>
  );
};

export default PricingCalculator;
