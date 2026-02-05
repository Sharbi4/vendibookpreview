import { Sparkles, ShieldCheck, MapPin } from 'lucide-react';

const benefits = [
  {
    icon: Sparkles,
    title: 'Capital Efficiency',
    description: "Launch and scale. Don't get locked into a 5-year loan. Whether you need a short-term rental to test a concept or a turnkey asset to own, we provide the inventory to scale on your terms.",
  },
  {
    icon: ShieldCheck,
    title: 'Built-in Trust',
    description: "Verified & Professional. We've standardized the industry. From Stripe-backed ID verification to secure escrow and digital agreements, we've handled the risk so you can focus on the food.",
  },
  {
    icon: MapPin,
    title: 'Strategic Placement',
    description: 'A home for your business. A great truck needs a great location. Instantly discover and book verified vendor slots, commissary kitchens, and food truck parks with professional logistics.',
  },
];

const RentalBenefits = () => {
  return (
    <section className="py-16 md:py-24 bg-background">
      <div className="container max-w-6xl mx-auto px-4">
        {/* Section Header */}
        <div className="text-center mb-12 md:mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            The modern way to start a food business.
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Skip the $50k down payment. Start cooking next week.
          </p>
        </div>

        {/* Benefits Grid */}
        <div className="grid md:grid-cols-3 gap-8 md:gap-12">
          {benefits.map((benefit, index) => (
            <div key={index} className="text-center md:text-left">
              {/* Icon Container */}
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 text-primary mb-5">
                <benefit.icon className="h-7 w-7" />
              </div>
              
              {/* Title */}
              <h3 className="text-xl font-semibold text-foreground mb-3">
                {benefit.title}
              </h3>
              
              {/* Description */}
              <p className="text-muted-foreground leading-relaxed">
                {benefit.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default RentalBenefits;
