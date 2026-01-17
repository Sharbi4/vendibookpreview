import { Search, ShieldCheck, CreditCard, HeadphonesIcon, LucideIcon } from 'lucide-react';

interface Step {
  icon: LucideIcon;
  title: string;
  description: string;
}

const steps: Step[] = [
  {
    icon: Search,
    title: 'Find & Verify',
    description: 'Browse verified listings near you',
  },
  {
    icon: ShieldCheck,
    title: 'Book or Buy',
    description: 'Submit a request or purchase instantly',
  },
  {
    icon: CreditCard,
    title: 'Pay Securely',
    description: 'Funds held in escrow until complete',
  },
  {
    icon: HeadphonesIcon,
    title: 'Get Support',
    description: '24/7 dispute resolution if needed',
  },
];

const HowItWorks = () => {
  return (
    <section className="py-12 md:py-16 bg-muted/30">
      <div className="container max-w-5xl mx-auto px-4">
        <div className="text-center mb-10">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
            How It Works
          </h2>
          <p className="text-muted-foreground">
            From search to support in four simple steps
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
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
      </div>
    </section>
  );
};

export default HowItWorks;
