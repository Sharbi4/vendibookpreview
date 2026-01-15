import { Search, Calendar, Truck, LucideIcon } from 'lucide-react';

interface Step {
  icon: LucideIcon;
  title: string;
  description: string;
}

const steps: Step[] = [
  {
    icon: Search,
    title: 'Search',
    description: 'Browse food trucks, trailers, ghost kitchens, and vendor lots in your area.',
  },
  {
    icon: Calendar,
    title: 'Book',
    description: 'Select your dates, submit a booking request, and wait for host approval.',
  },
  {
    icon: Truck,
    title: 'Launch',
    description: 'Pick up your rental or access your space and start your mobile food business.',
  },
];

const HowItWorks = () => {
  return (
    <section className="py-16 md:py-20 relative overflow-hidden bg-gradient-to-br from-amber-300/30 via-orange-200/50 to-rose-300/25">
      {/* Vibrant decorative elements */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-amber-400/35 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-orange-400/30 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-0 w-64 h-64 bg-rose-400/25 rounded-full blur-3xl" />
        <div className="absolute top-1/3 right-0 w-72 h-72 bg-yellow-300/20 rounded-full blur-3xl" />
      </div>
      <div className="container relative z-10">
        <div className="text-center mb-12">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
            How Vendibook Works
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Get your mobile food business up and running in three simple steps.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <div key={index} className="text-center group">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full 
                                icon-gradient-container icon-shimmer mb-4 transition-transform duration-300
                                group-hover:scale-110">
                  <div className="icon-gradient">
                    <Icon className="h-8 w-8 text-primary" strokeWidth={1.5} />
                  </div>
                </div>
                <div className="text-sm font-medium text-primary mb-2">Step {index + 1}</div>
                <h3 className="text-lg font-semibold text-foreground mb-2">{step.title}</h3>
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
