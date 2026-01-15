import { Link } from 'react-router-dom';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import SEO from '@/components/SEO';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  BookOpen, 
  Wrench, 
  ChefHat, 
  Thermometer, 
  Flame, 
  Zap, 
  FileCheck,
  MessageCircle,
  HelpCircle,
  ArrowRight,
  Star
} from 'lucide-react';

// Featured articles data
const featuredArticles = [
  {
    id: 'starting-ghost-kitchen',
    slug: 'ghost-kitchen-launch',
    title: 'Starting a Ghost Kitchen: The Practical Launch Checklist',
    description: 'A step-by-step ghost kitchen launch guide—facility selection, equipment setup, food safety basics, and operating systems to go live fast and safely.',
    icon: ChefHat,
  },
  {
    id: 'preventive-maintenance',
    slug: 'preventive-maintenance',
    title: 'Preventive Maintenance for Food Trailers, Food Trucks, and Mobile Kitchens',
    description: 'A practical preventive maintenance schedule for mobile kitchens—reduce breakdowns, improve safety, and protect rental and resale value.',
    icon: Wrench,
  },
  {
    id: 'food-safety-temperatures',
    slug: 'food-safety-temps',
    title: 'Food Safety Temperatures: Hold, Cook, and Cool',
    description: 'The most important food safety temperatures explained for operators—plus holding and cooling practices to reduce risk and stay compliant.',
    icon: Thermometer,
  },
];

// Category data
const categories = [
  {
    title: 'Start Here',
    description: 'How Vendibook rentals and sales work, what to check before you book, and what happens after checkout.',
    icon: BookOpen,
    articles: [
      { title: 'How Vendibook Rentals Work (End-to-End)', slug: 'rentals-end-to-end' },
      { title: 'How Buying Works on Vendibook (End-to-End)', slug: 'buying-end-to-end' },
      { title: 'What to Inspect Before You Rent a Trailer or Food Truck', slug: 'pre-rental-inspection' },
    ],
  },
  {
    title: 'Care, Maintenance, and Checklists',
    description: 'Preventive maintenance schedules, inspection guides, and operational best practices.',
    icon: Wrench,
    articles: [
      { title: 'Refrigeration and Cold Holding: Keep Food Safe and Extend Equipment Life', slug: 'refrigeration-cold-holding' },
      { title: 'Preventive Maintenance for Food Trailers, Food Trucks, and Mobile Kitchens', slug: 'preventive-maintenance' },
      { title: 'Daily Open/Close Checklist for Mobile Kitchens', slug: 'daily-checklist' },
    ],
  },
  {
    title: 'Ghost Kitchens and Commercial Kitchens',
    description: 'How to start, set up equipment, and run compliant operations.',
    icon: ChefHat,
    articles: [
      { title: 'Starting a Ghost Kitchen: The Practical Launch Checklist', slug: 'ghost-kitchen-launch' },
      { title: 'Commercial Kitchen Equipment Basics: NSF, ETL/UL, and What to Look For', slug: 'commercial-equipment-basics' },
      { title: 'Ghost Kitchen Menu Design: What Delivers Well', slug: 'ghost-kitchen-menu' },
    ],
  },
  {
    title: 'Food Safety and Temperature Standards',
    description: 'Holding temps, cooking temps, cooling, and contamination prevention.',
    icon: Thermometer,
    articles: [
      { title: 'Food Safety Temperatures: Hold, Cook, and Cool', slug: 'food-safety-temps' },
      { title: 'Cooling and Reheating: Safe Methods That Prevent Illness', slug: 'cooling-reheating' },
      { title: 'Hot Holding and Transport: Catering and Events', slug: 'hot-holding-transport' },
    ],
  },
  {
    title: 'Fire Safety, Ventilation, and Grease',
    description: 'Hood systems, grease management, and fire prevention basics.',
    icon: Flame,
    articles: [
      { title: 'Ventilation, Grease, and Fire Prevention: NFPA 96 Explained Simply', slug: 'nfpa-96-explained' },
      { title: 'Grease Trap and FOG Management', slug: 'grease-trap-fog' },
      { title: 'Hood Filter Cleaning: Frequency and Best Practices', slug: 'hood-filter-cleaning' },
    ],
  },
  {
    title: 'Power, Propane, and Utilities',
    description: 'Generator safety, propane safety, and operational essentials for mobile kitchens.',
    icon: Zap,
    articles: [
      { title: 'Propane and Gas Safety for Mobile Food Operations', slug: 'propane-gas-safety' },
      { title: 'Generator and Carbon Monoxide Safety (Mobile Kitchens)', slug: 'generator-co-safety' },
      { title: 'Generator Sizing Guide for Food Trucks and Trailers', slug: 'generator-sizing' },
    ],
  },
  {
    title: 'Compliance and Permits',
    description: 'Mobile vending, commissaries, and how requirements vary by location.',
    icon: FileCheck,
    articles: [
      { title: 'Mobile Vending Permits: State and Local Requirements', slug: 'mobile-vending-permits' },
      { title: 'Commissary Requirements Explained', slug: 'commissary-requirements' },
      { title: 'Health Department Inspections: What to Expect', slug: 'health-inspections' },
    ],
  },
];

// Generate FAQ schema data for structured data
const helpCenterFAQs = [
  { question: 'How do Vendibook rentals work?', answer: 'Vendibook connects you with verified hosts who rent out food trucks, trailers, and mobile kitchens. Browse listings, book securely through our platform, and enjoy protection through escrow payments and 24/7 support.' },
  { question: 'What should I inspect before renting a food truck?', answer: 'Check the refrigeration systems, propane connections, electrical systems, ventilation hood, fire suppression system, and overall cleanliness. Our pre-rental inspection guide covers everything in detail.' },
  { question: 'How do I start a ghost kitchen?', answer: 'Start by selecting a facility, setting up commercial equipment (NSF-certified), obtaining health permits, and creating a delivery-optimized menu. Our launch checklist walks you through each step.' },
];

const HelpCenter = () => {
  // JSON-LD for FAQ Page
  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: helpCenterFAQs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SEO
        title="Help Center - Guides for Food Trucks, Trailers & Ghost Kitchens"
        description="Practical guides for renting, buying, and maintaining food trucks, trailers, and mobile kitchens. Learn food safety, maintenance, permits, and how to start a ghost kitchen."
        canonical="/help"
        type="website"
      />
      
      {/* FAQ Schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      <Header />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="bg-gradient-to-br from-primary/10 via-background to-secondary/20 py-16 md:py-24">
          <div className="container text-center">
            <Badge variant="secondary" className="mb-4">
              <HelpCircle className="h-3 w-3 mr-1" />
              Help Center
            </Badge>
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
              Vendibook Help Center
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto">
              Practical, operator-grade guidance for renting, buying, and maintaining mobile kitchens, 
              trailers, and commercial kitchen equipment—plus step-by-step resources for launching a ghost kitchen.
            </p>
          </div>
        </section>

        {/* Featured Articles */}
        <section className="py-12 md:py-16">
          <div className="container">
            <div className="flex items-center gap-2 mb-8">
              <Star className="h-5 w-5 text-primary" />
              <h2 className="text-2xl font-bold text-foreground">Featured Articles</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {featuredArticles.map((article) => (
                <Link key={article.id} to={`/help/${article.slug}`}>
                  <Card className="group h-full hover:shadow-lg transition-all duration-300 border-2 hover:border-primary/50 cursor-pointer">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="p-3 rounded-xl bg-primary/10 text-primary mb-3">
                          <article.icon className="h-6 w-6" />
                        </div>
                        <Badge variant="secondary" className="text-xs">Featured</Badge>
                      </div>
                      <CardTitle className="text-lg leading-tight group-hover:text-primary transition-colors">
                        {article.title}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <CardDescription className="text-sm leading-relaxed mb-4">
                        {article.description}
                      </CardDescription>
                      <span className="inline-flex items-center text-sm font-medium text-primary group-hover:underline">
                        Read article
                        <ArrowRight className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform" />
                      </span>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* Browse by Category */}
        <section className="py-12 md:py-16 bg-muted/30">
          <div className="container">
            <h2 className="text-2xl font-bold text-foreground mb-8">Browse by Category</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {categories.map((category) => (
                <Card key={category.title} className="h-full">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-primary/10 text-primary">
                        <category.icon className="h-5 w-5" />
                      </div>
                      <CardTitle className="text-lg">{category.title}</CardTitle>
                    </div>
                    <CardDescription className="text-sm mt-2">
                      {category.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {category.articles.map((article) => (
                        <li key={article.slug}>
                          <Link 
                            to={`/help/${article.slug}`}
                            className="group flex items-start gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
                          >
                            <ArrowRight className="h-4 w-4 mt-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                            <span className="group-hover:underline">{article.title}</span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Become a Host CTA */}
        <section className="py-12 md:py-16 bg-gradient-to-br from-primary/10 via-background to-vendibook-cream">
          <div className="container">
            <div className="max-w-3xl mx-auto text-center">
              <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
                Interested in becoming a host?
              </h2>
              <p className="text-muted-foreground mb-6">
                Turn your food truck, trailer, kitchen, or lot into a revenue-generating asset with Vendibook.
              </p>
              <Button asChild size="lg">
                <Link to="/host">
                  Learn More About Hosting
                  <ArrowRight className="h-5 w-5 ml-2" />
                </Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Community & Support */}
        <section className="py-12 md:py-16">
          <div className="container">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Community Card */}
              <Card className="bg-gradient-to-br from-secondary/50 to-secondary/20 border-secondary">
                <CardHeader>
                  <div className="p-3 rounded-xl bg-primary/10 text-primary w-fit mb-2">
                    <MessageCircle className="h-6 w-6" />
                  </div>
                  <CardTitle className="text-xl">Join the Community</CardTitle>
                  <CardDescription>
                    Connect with fellow <Link to="/host" className="text-primary hover:underline">hosts</Link>, share tips, and learn from the community
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="outline" className="w-full sm:w-auto">
                    Visit Forum
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </CardContent>
              </Card>

              {/* Support Card */}
              <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
                <CardHeader>
                  <div className="p-3 rounded-xl bg-primary/10 text-primary w-fit mb-2">
                    <HelpCircle className="h-6 w-6" />
                  </div>
                  <CardTitle className="text-xl">Still Need Help?</CardTitle>
                  <CardDescription>
                    Our support team is here to help you 24/7
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button asChild className="w-full sm:w-auto">
                    <Link to="/contact">
                      Contact Support
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default HelpCenter;
