import { Link } from 'react-router-dom';
import { Search, ShieldCheck, CreditCard, ArrowRight, LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Step {
  icon: LucideIcon;
  title: string;
  description: string;
}

const steps: Step[] = [
  {
    icon: Search,
    title: 'Find or List',
    description: 'Browse verified listings or create your own',
  },
  {
    icon: ShieldCheck,
    title: 'Verify & Approve',
    description: 'Upload documents, get approved, stay compliant',
  },
  {
    icon: CreditCard,
    title: 'Transact Securely',
    description: 'Payments held in escrow until complete',
  },
];

const HowItWorks = () => {
  return (
    <section className="py-12 md:py-16 bg-muted/30">
      <div className="container max-w-4xl mx-auto px-4">
        <div className="text-center mb-10">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
            How It Works
          </h2>
          <p className="text-muted-foreground">
            Three simple steps to get started
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <div key={index} className="text-center group">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-full 
                                bg-primary/10 mb-3 transition-transform duration-300
                                group-hover:scale-110">
                  <Icon className="h-6 w-6 text-primary" strokeWidth={1.5} />
                </div>
                <div className="text-xs font-medium text-primary mb-1">Step {index + 1}</div>
                <h3 className="text-base font-semibold text-foreground mb-1">{step.title}</h3>
                <p className="text-muted-foreground text-sm">{step.description}</p>
              </div>
            );
          })}
        </div>

        <div className="text-center">
          <Button variant="outline" asChild>
            <Link to="/how-it-works" className="gap-2">
              See how it works
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
