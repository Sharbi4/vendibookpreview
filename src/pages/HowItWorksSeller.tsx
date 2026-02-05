import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ArrowRight, 
  Camera, 
  Package, 
  DollarSign, 
  Shield, 
  CheckCircle2,
  Truck,
  Users,
  Star,
  Clock,
  Zap,
  CreditCard,
  MessageSquare
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';

const steps = [
  {
    step: 1,
    title: 'List Your Asset',
    description: 'Upload high-quality photos, set your asking price, and provide detailed specifications of your food truck or equipment.',
    icon: Camera,
    color: 'bg-blue-500',
  },
  {
    step: 2,
    title: 'Receive Offers',
    description: 'Interested buyers can make offers directly through the platform. Review, negotiate, or accept with one click.',
    icon: MessageSquare,
    color: 'bg-emerald-500',
  },
  {
    step: 3,
    title: 'Secure Transaction',
    description: 'Once you accept an offer, the buyer pays through our secure escrow system. Funds are held until delivery is confirmed.',
    icon: CreditCard,
    color: 'bg-amber-500',
  },
  {
    step: 4,
    title: 'Complete the Sale',
    description: 'Coordinate handoff with the buyer. Once they confirm receipt, your payment is released instantly.',
    icon: DollarSign,
    color: 'bg-primary',
  },
];

const benefits = [
  { icon: Shield, title: 'Buyer Protection', description: 'Escrow payments protect both parties' },
  { icon: Zap, title: 'Fast Payouts', description: 'Get paid as soon as the sale completes' },
  { icon: Users, title: 'Verified Buyers', description: 'All buyers are identity verified' },
  { icon: Star, title: 'No Upfront Fees', description: 'Free to list, pay only when you sell' },
];

const HowItWorksSeller = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      
      <main className="flex-1">
        {/* Hero Section */}
        <section className="py-16 md:py-24 bg-gradient-to-b from-emerald-500/5 to-background">
          <div className="container max-w-5xl text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 text-emerald-600 text-sm font-medium mb-6">
                <Package className="h-4 w-4" />
                For Sellers
              </div>
              <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-6">
                Sell Your Food Truck or Equipment
              </h1>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
                Reach thousands of verified buyers looking for food trucks, trailers, and commercial kitchen equipment.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button size="lg" className="rounded-full bg-emerald-600 hover:bg-emerald-700" asChild>
                  <Link to="/list">
                    List for Sale
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" className="rounded-full" asChild>
                  <Link to="/how-it-works-host">
                    I Want to Rent Instead
                  </Link>
                </Button>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Steps Section */}
        <section className="py-16 md:py-20">
          <div className="container max-w-5xl">
            <h2 className="text-3xl font-bold text-center mb-12">How Selling Works</h2>
            <div className="grid md:grid-cols-2 gap-6">
              {steps.map((step, index) => (
                <motion.div
                  key={step.step}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  viewport={{ once: true }}
                >
                  <Card className="h-full border-0 shadow-lg hover:shadow-xl transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4">
                        <div className={`${step.color} text-white p-3 rounded-xl`}>
                          <step.icon className="h-6 w-6" />
                        </div>
                        <div>
                          <div className="text-sm text-muted-foreground mb-1">Step {step.step}</div>
                          <h3 className="text-lg font-semibold mb-2">{step.title}</h3>
                          <p className="text-muted-foreground">{step.description}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Benefits Section */}
        <section className="py-16 md:py-20 bg-muted/30">
          <div className="container max-w-5xl">
            <h2 className="text-3xl font-bold text-center mb-12">Why Sell on Vendibook?</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {benefits.map((benefit, index) => (
                <motion.div
                  key={benefit.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  viewport={{ once: true }}
                  className="text-center"
                >
                  <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center mx-auto mb-4">
                    <benefit.icon className="h-7 w-7" />
                  </div>
                  <h3 className="font-semibold mb-2">{benefit.title}</h3>
                  <p className="text-sm text-muted-foreground">{benefit.description}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 md:py-20">
          <div className="container max-w-3xl text-center">
            <div className="bg-emerald-600 rounded-3xl p-8 md:p-12 text-white">
              <h2 className="text-3xl font-bold mb-4">Ready to Sell?</h2>
              <p className="text-lg opacity-90 mb-8">
                List your food truck or equipment today. No upfront fees - you only pay when you make a sale.
              </p>
              <Button size="lg" variant="secondary" className="rounded-full" asChild>
                <Link to="/list">
                  Create Your Listing
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default HowItWorksSeller;
