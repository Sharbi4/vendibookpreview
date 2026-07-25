import SEO from '@/components/SEO';
import PremiumPlansSection from '@/components/monetization/PremiumPlansSection';

const HostProPlans = () => (
  <div className="min-h-screen bg-background">
    <SEO
      title="Host Plans — Vendibook"
      description="Choose the plan that matches how you host. Starter, Growth, or Operator — cancel anytime, payment protection included."
    />
    <section className="mx-auto max-w-6xl px-4 py-10 md:py-14">
      <PremiumPlansSection />
    </section>
  </div>
);

export default HostProPlans;
