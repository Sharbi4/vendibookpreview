import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ArrowRight, 
  Camera, 
  Calendar, 
  DollarSign, 
  Shield, 
  CheckCircle2,
  Truck,
  Users,
  Star,
  Clock,
  Zap
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';

const steps = [
  {
    step: 1,
    title: 'Create Your Listing',
    description: 'Add photos, set your daily/hourly rates, and describe your food truck, trailer, or commercial kitchen.',
    icon: Camera,
    color: 'bg-blue-500',
  },
  {
    step: 2,
    title: 'Set Your Availability',
    description: 'Use our calendar to block dates, set minimum booking windows, and manage your schedule.',
    icon: Calendar,
    color: 'bg-emerald-500',
  },
  {
    step: 3,
    title: 'Review & Approve Bookings',
    description: 'Get notified instantly when renters request your asset. Review their profile and approve or decline.',
    icon: Users,
    color: 'bg-amber-500',
  },
  {
    step: 4,
    title: 'Get Paid Securely',
    description: 'Payments are processed through Stripe. You get paid directly to your bank account after each rental.',
    icon: DollarSign,
    color: 'bg-primary',
  },
];

const benefits = [
  { icon: Shield, title: 'Insurance Coverage', description: 'Every rental includes liability protection' },
  { icon: Zap, title: 'Instant Payouts', description: 'Get paid within 24-48 hours of rental completion' },
  { icon: Star, title: 'Verified Renters', description: 'All renters go through identity verification' },
  { icon: Clock, title: '24/7 Support', description: 'Our team is here to help anytime' },
];

const HowItWorksHost = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      
      <main className="flex-1">
        {/* Hero Section */}
        <section className="py-16 md:py-24 bg-gradient-to-b from-primary/5 to-background">
          <div className="container max-w-5xl text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
                <Truck className="h-4 w-4" />
                For Hosts & Kitchen Owners
              </div>
              <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-6">
                Turn Your Kitchen Into Income
              </h1>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
                List your food truck, trailer, or commercial kitchen on Vendibook and start earning from day one.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button size="lg" className="rounded-full" asChild>
                  <Link to="/list">
                    Start Listing Now
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" className="rounded-full" asChild>
                  <Link to="/how-it-works-seller">
                    I Want to Sell Instead
                  </Link>
                </Button>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Steps Section */}
        <section className="py-16 md:py-20">
          <div className="container max-w-5xl">
            <h2 className="text-3xl font-bold text-center mb-12">How It Works</h2>
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
            <h2 className="text-3xl font-bold text-center mb-12">Why Host on Vendibook?</h2>
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
                  <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-4">
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
            <div className="bg-primary rounded-3xl p-8 md:p-12 text-primary-foreground">
              <h2 className="text-3xl font-bold mb-4">Ready to Start Earning?</h2>
              <p className="text-lg opacity-90 mb-8">
                Join thousands of hosts already earning on Vendibook. Listing is free and takes just 5 minutes.
              </p>
              <Button size="lg" variant="secondary" className="rounded-full" asChild>
                <Link to="/list">
                  Create Your First Listing
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

export default HowItWorksHost;
