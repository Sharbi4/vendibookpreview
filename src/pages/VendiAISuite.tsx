import { Link } from 'react-router-dom';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import SEO from '@/components/SEO';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Sparkles, 
  Scale, 
  Rocket,
  CheckCircle,
  ArrowRight,
  BookOpen
} from 'lucide-react';

const VendiAISuite = () => {
  return (
    <>
      <SEO
        title="Host Operating System | Vendibook"
        description="Free tools to launch and legalize your food truck business. Access our Startup Guide and Regulations Hub."
      />
      <Header />

      <main className="min-h-screen bg-background">
        {/* Hero Section */}
        <section className="relative py-20 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-background" />
          
          <div className="container max-w-4xl mx-auto px-4 text-center relative z-10">
            <Badge className="mb-6 bg-primary/10 text-primary border-primary/20 px-4 py-1.5 text-sm">
              <Sparkles className="w-3.5 h-3.5 mr-2" />
              Vendor Toolkit
            </Badge>
            
            <h1 className="text-4xl md:text-6xl font-bold text-foreground leading-tight mb-6">
              Launch faster with <br/> intelligent tools.
            </h1>
            
            <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed">
              Skip the guesswork. We provide the roadmap and the rulebook so you can focus on the food.
            </p>
          </div>
        </section>

        {/* The Two Tools Detail */}
        <section className="pb-24">
          <div className="container max-w-5xl mx-auto px-4 space-y-24">
            
            {/* Tool 1: Startup Guide */}
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div className="order-2 md:order-1">
                <div className="w-14 h-14 bg-blue-100 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center text-blue-600 mb-6">
                  <Rocket className="w-7 h-7" />
                </div>
                <h2 className="text-3xl font-bold mb-4">Startup Guide</h2>
                <p className="text-lg text-muted-foreground mb-6">
                  From concept to grand opening, follow a proven roadmap designed by industry experts. Track your progress and check off milestones.
                </p>
                <ul className="space-y-3 mb-8">
                  {['Interactive launch checklist', 'Budgeting templates', 'Equipment sourcing guide', 'Marketing launch plan'].map(item => (
                    <li key={item} className="flex items-center gap-3">
                      <CheckCircle className="w-5 h-5 text-green-500" />
                      <span className="font-medium">{item}</span>
                    </li>
                  ))}
                </ul>
                <Button size="lg" className="rounded-full px-8" asChild>
                  <Link to="/tools/startup-guide">
                    Open Guide <ArrowRight className="ml-2 w-4 h-4" />
                  </Link>
                </Button>
              </div>
              <div className="order-1 md:order-2 bg-muted rounded-3xl h-[400px] border border-border flex items-center justify-center relative overflow-hidden group">
                 <BookOpen className="w-24 h-24 text-muted-foreground/20 group-hover:scale-110 transition-transform duration-500" />
              </div>
            </div>

            {/* Tool 2: Regulations Hub */}
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div className="bg-muted rounded-3xl h-[400px] border border-border flex items-center justify-center relative overflow-hidden group">
                 <Scale className="w-24 h-24 text-muted-foreground/20 group-hover:scale-110 transition-transform duration-500" />
              </div>
              <div>
                <div className="w-14 h-14 bg-purple-100 dark:bg-purple-900/30 rounded-2xl flex items-center justify-center text-purple-600 mb-6">
                  <Scale className="w-7 h-7" />
                </div>
                <h2 className="text-3xl font-bold mb-4">Regulations Hub</h2>
                <p className="text-lg text-muted-foreground mb-6">
                  Don't get shut down. Find the exact permits, licenses, and insurance you need for your city and vehicle type instantly.
                </p>
                <ul className="space-y-3 mb-8">
                  {['City-specific permit database', 'Health department requirements', 'Insurance compliance check', 'Renewal reminders'].map(item => (
                    <li key={item} className="flex items-center gap-3">
                      <CheckCircle className="w-5 h-5 text-green-500" />
                      <span className="font-medium">{item}</span>
                    </li>
                  ))}
                </ul>
                <Button size="lg" variant="outline" className="rounded-full px-8" asChild>
                  <Link to="/tools/regulations-hub">
                    Check Compliance <ArrowRight className="ml-2 w-4 h-4" />
                  </Link>
                </Button>
              </div>
            </div>

          </div>
        </section>
      </main>
      <Footer />
    </>
  );
};

export default VendiAISuite;
