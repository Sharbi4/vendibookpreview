import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import JsonLd from '@/components/JsonLd';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import SEO from '@/components/SEO';
import { usePageTracking } from '@/hooks/usePageTracking';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import AcademyPreviewBand from '@/components/tools/AcademyPreviewBand';
import {
  Truck,
  ChefHat,
  FileCheck,
  DollarSign,
  Wrench,
  Megaphone,
  CheckCircle2,
  ArrowRight,
  Flame,
  Coffee,
  Salad,
  Settings,
  Calculator,
  Fuel,
  Droplets,
  CloudRain,
  Store,
  UtensilsCrossed,
  ChevronDown,
  Info
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Content model
// ---------------------------------------------------------------------------

const DECISIONS = [
  {
    icon: ChefHat,
    title: 'Menu first',
    body: 'Your menu determines what equipment you actually need and how fast you can serve. Lock the concept before you shop for a truck or trailer.'
  },
  {
    icon: Flame,
    title: 'Cooking method changes overhead',
    body: 'Frying, grilling, open flame, and grease-heavy menus can mean more ventilation, fire suppression, propane, oil handling, cleaning, and maintenance. A lower-intensity menu can sometimes simplify the build and operating load, depending on local rules.'
  },
  {
    icon: Truck,
    title: 'Truck vs trailer is an operating decision',
    body: 'A truck gives you one self-contained unit. A trailer can give you more kitchen space and separates the kitchen from the tow vehicle. The right answer depends on route, parking, mobility, crew, storage, and budget.'
  },
  {
    icon: Settings,
    title: 'Design for the day-to-day reality',
    body: 'Think about where propane is refilled, where oil is disposed of, where wastewater goes, where the unit is parked, how it gets cleaned, and what happens when a generator or vehicle goes down.'
  }
];

const ROADMAP = [
  {
    id: 'concept',
    icon: ChefHat,
    title: 'Define the concept and menu',
    points: [
      'Keep the menu focused so service stays fast',
      'Cross-use ingredients across dishes to cut waste',
      'Price for ticket speed and food cost awareness',
      'Start thinking about branding early, not at the end'
    ]
  },
  {
    id: 'setup',
    icon: Truck,
    title: 'Choose the right setup',
    points: [
      'Truck vs trailer based on route and mobility',
      'New vs used based on budget and risk tolerance',
      'Match cooking intensity to the menu',
      'Plan workspace around your crew size'
    ]
  },
  {
    id: 'equipment',
    icon: Wrench,
    title: 'Map the equipment and utilities',
    points: [
      'Cooking equipment and refrigeration',
      'Sinks, fresh water, and wastewater capacity',
      'Power: generator or shore power',
      'Propane, ventilation, and fire suppression where applicable'
    ]
  },
  {
    id: 'rules',
    icon: FileCheck,
    title: 'Check the rules before you buy or build',
    points: [
      'Health department plan review and inspection',
      'Fire requirements for cooking equipment and fuel',
      'Mobile vending permissions where you plan to sell',
      'Commissary or servicing area requirements where applicable'
    ],
    note: 'Requirements vary by city, county, state, menu, equipment, and operating model.'
  },
  {
    id: 'budget',
    icon: Calculator,
    title: 'Build the real startup budget',
    points: [
      'Equipment or vehicle, buildout, and wrap',
      'Permits, insurance, and commissary or storage',
      'POS and payment setup plus opening inventory',
      'Repairs reserve and working capital'
    ],
    note: 'Any ranges you see on Vendibook are planning estimates, not quotes.'
  },
  {
    id: 'operations',
    icon: Settings,
    title: 'Prepare the operating system',
    points: [
      'Prep workflow and cleaning routine',
      'Waste, oil, and water handling plan',
      'Maintenance schedule for vehicle and equipment',
      'Supplier routine and event or lot logistics'
    ]
  },
  {
    id: 'launch',
    icon: Megaphone,
    title: 'Launch the brand, not just the truck',
    points: [
      'Strong visual branding and wrap',
      'Professional photos and video',
      'Social presence and repeat locations',
      'Catering, events, and customer retention'
    ]
  }
];

const OPERATING_PROFILES = [
  {
    icon: Flame,
    name: 'Frying / grease-heavy',
    examples: 'Fried chicken, wings, fries, fish and chips',
    changes: [
      'Often drives ventilation and fire suppression requirements',
      'Propane demand and oil handling become daily tasks',
      'Grease disposal and cleaning add operating cost'
    ]
  },
  {
    icon: UtensilsCrossed,
    name: 'Griddle / hot line',
    examples: 'Burgers, tacos, breakfast, smash patties',
    changes: [
      'Grease-laden vapor may trigger hood and suppression rules',
      'Refrigerated prep space matters for speed',
      'Power and propane sizing depend on equipment count'
    ]
  },
  {
    icon: Coffee,
    name: 'Coffee / beverage',
    examples: 'Espresso, cold brew, smoothies, tea',
    changes: [
      'Usually lighter ventilation needs, depending on local code',
      'Espresso machines and blenders can push small generators',
      'Water, ice, and refrigeration become the core utilities'
    ]
  },
  {
    icon: Salad,
    name: 'Cold prep / light assembly',
    examples: 'Salads, bowls, sandwiches, desserts',
    changes: [
      'Refrigeration capacity is often the main constraint',
      'May simplify fire and ventilation requirements, depending on local code',
      'Storage and prep workflow drive the layout'
    ]
  }
];

const BUDGET_CATEGORIES = [
  'Truck or trailer',
  'Buildout and equipment',
  'Permits and inspections',
  'Insurance',
  'Commissary or storage',
  'Branding, wrap, and signage',
  'Inventory and supplies',
  'Maintenance reserve',
  'Working capital'
];

const FORGOTTEN_COSTS = [
  {
    icon: Fuel,
    title: 'Fuel and generator use',
    body: 'Gas or diesel for the vehicle, plus propane and generator fuel during service. Generators also need regular oil changes and load management.'
  },
  {
    icon: Droplets,
    title: 'Fryer oil and wastewater',
    body: 'If you fry, you buy oil, filter it, and dispose of it properly. Fresh water refill and wastewater dumping usually happen at a commissary or servicing area.'
  },
  {
    icon: Wrench,
    title: 'Maintenance and downtime',
    body: 'Trucks vibrate, which loosens fittings, plumbing, and electrical. A broken generator or vehicle can close the business until it is fixed.'
  },
  {
    icon: Store,
    title: 'Event fees, storage, and insurance',
    body: 'Many events charge vendor fees. Overnight parking or storage can be a monthly line item, and insurance premiums continue whether or not you sell.'
  },
  {
    icon: CloudRain,
    title: 'Weather and slow periods',
    body: 'Rain and seasonality can cut into sales while fixed costs continue. A cash reserve keeps slow weeks from becoming emergencies.'
  }
];

const CHECKLIST_PHASES = [
  {
    id: 'concept',
    title: 'Define the concept and menu',
    items: [
      'Choose your cuisine and concept',
      'Design a focused menu of core items',
      'Plan ingredient cross-use across dishes',
      'Estimate food cost per item',
      'Sketch your brand name and visual direction'
    ]
  },
  {
    id: 'setup',
    title: 'Choose the right setup',
    items: [
      'Decide between a food truck and a food trailer',
      'Weigh new vs used for your budget',
      'Match kitchen intensity to your menu',
      'Plan workspace around your crew size'
    ]
  },
  {
    id: 'equipment',
    title: 'Map the equipment and utilities',
    items: [
      'List the cooking equipment your menu needs',
      'Plan refrigeration and prep space',
      'Plan sinks, fresh water, and wastewater capacity',
      'Size your power: generator or shore power',
      'Plan propane storage where applicable',
      'Confirm ventilation and fire suppression needs with your local authority'
    ]
  },
  {
    id: 'rules',
    title: 'Check the rules before you buy or build',
    items: [
      'Contact the local health department about plan review',
      'Ask the fire authority about cooking and fuel requirements',
      'Confirm mobile vending rules for your target locations',
      'Check commissary or servicing area requirements',
      'Work through PermitPath and the Regulations Hub'
    ]
  },
  {
    id: 'budget',
    title: 'Build the real startup budget',
    items: [
      'Price the vehicle and buildout',
      'Budget permits, inspections, and insurance',
      'Budget commissary or storage and branding',
      'Plan POS, payment setup, and opening inventory',
      'Set aside a maintenance reserve and working capital'
    ]
  },
  {
    id: 'operations',
    title: 'Prepare the operating system',
    items: [
      'Write your prep and cleaning workflow',
      'Plan waste, oil, and water handling',
      'Create a vehicle and equipment maintenance schedule',
      'Line up suppliers and delivery routines',
      'Plan event and lot logistics'
    ]
  },
  {
    id: 'launch',
    title: 'Launch the brand, not just the truck',
    items: [
      'Finalize wrap, signage, and menu board',
      'Shoot professional photos and video',
      'Set up your social presence',
      'Secure repeat locations and anchor spots',
      'Line up catering, events, and private bookings'
    ]
  }
];

const ECOSYSTEM_LINKS = [
  {
    icon: Truck,
    title: 'Browse equipment',
    body: 'See food trucks and trailers for sale and for rent on the marketplace.',
    to: '/browse',
    cta: 'Browse the marketplace'
  },
  {
    icon: FileCheck,
    title: 'Check permits',
    body: 'Work through location-specific permit and licensing questions.',
    to: '/tools/permitpath',
    cta: 'Open PermitPath'
  },
  {
    icon: Info,
    title: 'Regulations Hub',
    body: 'Understand the major compliance categories before you commit.',
    to: '/tools/regulations-hub',
    cta: 'Open the Regulations Hub'
  },
  {
    icon: Calculator,
    title: 'Startup cost planning',
    body: 'Go deeper on 2026 startup cost categories and planning ranges.',
    to: '/tools/food-truck-startup-costs-2026',
    cta: 'See cost planning'
  }
];

// ---------------------------------------------------------------------------
// Small presentational helpers
// ---------------------------------------------------------------------------

const FadeIn = ({
  children,
  delay = 0,
  className
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) => {
  const reduced = useReducedMotion();
  return (
    <motion.div
      initial={{ opacity: 0, y: reduced ? 0 : 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: reduced ? 0 : 0.5, delay: reduced ? 0 : delay, ease: 'easeOut' }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

const Eyebrow = ({ children }: { children: React.ReactNode }) => (
  <p className="text-xs font-semibold tracking-[0.18em] uppercase text-muted-foreground mb-3">
    {children}
  </p>
);

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

const StartupGuide = () => {
  usePageTracking();
  const reduced = useReducedMotion();

  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [openPhase, setOpenPhase] = useState<string>(CHECKLIST_PHASES[0].id);

  const totalItems = useMemo(
    () => CHECKLIST_PHASES.reduce((sum, p) => sum + p.items.length, 0),
    []
  );
  const doneItems = Object.values(checked).filter(Boolean).length;
  const progressPct = totalItems ? Math.round((doneItems / totalItems) * 100) : 0;

  const scrollToChecklist = () => {
    document
      .getElementById('launch-checklist')
      ?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
  };

  return (
    <div className="sale-light min-h-screen flex flex-col overflow-x-clip">
      <SEO
        title="How to Start a Food Truck or Trailer | Vendibook Startup Guide"
        description="Plan a food truck or food trailer business in the right order. Learn how menu, equipment, permits, power, operating costs, branding, and startup budgeting fit together."
        canonical="/tools/startup-guide"
        type="article"
      />
      <JsonLd
        schema={{
          '@context': 'https://schema.org',
          '@type': 'Article',
          headline: 'How to Start a Food Truck or Trailer',
          description:
            'A free planning guide for food trucks and food trailers covering menu, equipment, permits, operating costs, branding, and startup budgeting.',
          url: 'https://vendibook.com/tools/startup-guide',
          publisher: { '@type': 'Organization', name: 'Vendibook', url: 'https://vendibook.com' }
        }}
      />
      <Header />

      <main className="flex-1">
        {/* ---------------------------------------------------------------- */}
        {/* Hero */}
        {/* ---------------------------------------------------------------- */}
        <section className="pt-10 md:pt-16 pb-14 md:pb-20">
          <div className="container max-w-5xl">
            <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground mb-8">
              <Link to="/tools" className="hover:text-foreground transition-colors">Tools</Link>
              <span className="mx-2" aria-hidden="true">/</span>
              <span className="text-foreground">Startup Guide</span>
            </nav>

            <FadeIn>
              <Eyebrow>Starting a mobile food business</Eyebrow>
              <h1 className="text-4xl md:text-6xl font-bold tracking-tight leading-[1.05] mb-6">
                Start smarter before you spend.
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground leading-relaxed max-w-3xl mb-4">
                A food truck business starts long before the service window opens. Your menu affects your equipment. Your equipment affects your permits, power, ventilation, maintenance, and operating costs. This guide helps you think through the decisions in the right order.
              </p>
              <p className="text-sm text-muted-foreground mb-8">
                Free Vendibook startup guide. Built for food trucks, food trailers, and mobile food businesses.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Button variant="cta" size="cta" onClick={scrollToChecklist}>
                  Start the launch checklist
                  <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
                </Button>
                <Button variant="outline" size="cta" asChild className="rounded-2xl">
                  <Link to="/browse">Browse food trucks &amp; trailers</Link>
                </Button>
              </div>
            </FadeIn>
          </div>
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* Decisions that change everything */}
        {/* ---------------------------------------------------------------- */}
        <section className="py-14 md:py-20">
          <div className="container max-w-5xl">
            <FadeIn>
              <Eyebrow>The decisions that change everything</Eyebrow>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4 max-w-2xl">
                Build the business around the menu, not the other way around.
              </h2>
              <p className="text-muted-foreground leading-relaxed max-w-2xl mb-10">
                Most expensive mistakes happen when the truck gets bought before the menu is decided. These four ideas keep the plan in the right order.
              </p>
            </FadeIn>
            <div className="grid gap-5 md:grid-cols-2">
              {DECISIONS.map((d, i) => (
                <FadeIn key={d.title} delay={i * 0.05}>
                  <div className="bg-sale-card rounded-3xl p-7 h-full">
                    <div className="w-11 h-11 rounded-2xl chip-accent flex items-center justify-center mb-5">
                      <d.icon className="h-5 w-5" aria-hidden="true" />
                    </div>
                    <h3 className="text-lg font-bold tracking-tight mb-2">{d.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{d.body}</p>
                  </div>
                </FadeIn>
              ))}
            </div>
          </div>
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* 7-part roadmap */}
        {/* ---------------------------------------------------------------- */}
        <section className="py-14 md:py-20">
          <div className="container max-w-5xl">
            <FadeIn>
              <Eyebrow>Your 7-part launch roadmap</Eyebrow>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4 max-w-2xl">
                Work the plan in order.
              </h2>
              <p className="text-muted-foreground leading-relaxed max-w-2xl mb-12">
                Each step feeds the next. Skipping ahead is how budgets blow up.
              </p>
            </FadeIn>

            <ol className="relative space-y-6 before:absolute before:left-[27px] before:top-4 before:bottom-4 before:w-px before:bg-border max-md:before:hidden">
              {ROADMAP.map((step, i) => (
                <FadeIn key={step.id} delay={Math.min(i * 0.04, 0.2)}>
                  <li className="relative flex gap-5 md:gap-7 items-start">
                    <div className="shrink-0 w-14 h-14 rounded-2xl bg-sale-card flex items-center justify-center font-bold text-lg tracking-tight">
                      {String(i + 1).padStart(2, '0')}
                    </div>
                    <div className="bg-sale-card rounded-3xl p-6 md:p-8 flex-1">
                      <div className="flex items-center gap-3 mb-4">
                        <step.icon className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
                        <h3 className="text-xl font-bold tracking-tight">{step.title}</h3>
                      </div>
                      <ul className="grid gap-2 sm:grid-cols-2">
                        {step.points.map((p) => (
                          <li key={p} className="flex items-start gap-2 text-sm text-muted-foreground leading-relaxed">
                            <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0 text-primary" aria-hidden="true" />
                            {p}
                          </li>
                        ))}
                      </ul>
                      {step.note && (
                        <p className="mt-4 text-xs text-muted-foreground flex items-start gap-2">
                          <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" aria-hidden="true" />
                          {step.note}
                        </p>
                      )}
                      {step.id === 'rules' && (
                        <div className="mt-5 flex flex-wrap gap-3">
                          <Button variant="outline" size="sm" asChild className="rounded-xl">
                            <Link to="/tools/permitpath">Open PermitPath</Link>
                          </Button>
                          <Button variant="outline" size="sm" asChild className="rounded-xl">
                            <Link to="/tools/regulations-hub">Open Regulations Hub</Link>
                          </Button>
                        </div>
                      )}
                    </div>
                  </li>
                </FadeIn>
              ))}
            </ol>
          </div>
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* Menu + equipment reality */}
        {/* ---------------------------------------------------------------- */}
        <section className="py-14 md:py-20">
          <div className="container max-w-5xl">
            <FadeIn>
              <Eyebrow>Menu + equipment reality</Eyebrow>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4 max-w-2xl">
                Your menu changes the build.
              </h2>
              <p className="text-muted-foreground leading-relaxed max-w-2xl mb-10">
                Four common operating profiles and what each one usually changes. Local code decides what is actually required, so confirm with your health and fire authorities before you build.
              </p>
            </FadeIn>
            <div className="grid gap-5 md:grid-cols-2">
              {OPERATING_PROFILES.map((profile, i) => (
                <FadeIn key={profile.name} delay={i * 0.05}>
                  <div className="bg-sale-card rounded-3xl p-7 h-full">
                    <div className="flex items-center gap-3 mb-1">
                      <div className="w-10 h-10 rounded-xl chip-accent flex items-center justify-center">
                        <profile.icon className="h-5 w-5" aria-hidden="true" />
                      </div>
                      <h3 className="text-lg font-bold tracking-tight">{profile.name}</h3>
                    </div>
                    <p className="text-xs text-muted-foreground mb-5">{profile.examples}</p>
                    <p className="text-xs font-semibold tracking-[0.14em] uppercase text-muted-foreground mb-3">
                      What it usually changes
                    </p>
                    <ul className="space-y-2">
                      {profile.changes.map((c) => (
                        <li key={c} className="flex items-start gap-2 text-sm text-muted-foreground leading-relaxed">
                          <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0 text-primary" aria-hidden="true" />
                          {c}
                        </li>
                      ))}
                    </ul>
                  </div>
                </FadeIn>
              ))}
            </div>
          </div>
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* Money */}
        {/* ---------------------------------------------------------------- */}
        <section className="py-14 md:py-20">
          <div className="container max-w-5xl">
            <FadeIn>
              <div className="bg-sale-card rounded-[2rem] p-8 md:p-12">
                <Eyebrow>Money</Eyebrow>
                <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
                  Budget for more than the truck.
                </h2>
                <p className="text-muted-foreground leading-relaxed max-w-2xl mb-8">
                  The vehicle is only one line item. A realistic startup budget covers the full picture, and the categories below are where most first-time operators underestimate.
                </p>
                <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 mb-10">
                  {BUDGET_CATEGORIES.map((c) => (
                    <li key={c} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <DollarSign className="h-4 w-4 mt-0.5 shrink-0 text-primary" aria-hidden="true" />
                      {c}
                    </li>
                  ))}
                </ul>
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button variant="cta" asChild>
                    <Link to="/tools/food-truck-startup-costs-2026">
                      See 2026 startup cost planning
                      <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
                    </Link>
                  </Button>
                  <Button variant="outline" asChild className="rounded-2xl">
                    <Link to="/financing">Explore financing</Link>
                  </Button>
                </div>
              </div>
            </FadeIn>
          </div>
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* Costs people forget */}
        {/* ---------------------------------------------------------------- */}
        <section className="py-14 md:py-20">
          <div className="container max-w-5xl">
            <FadeIn>
              <Eyebrow>The costs people forget</Eyebrow>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4 max-w-2xl">
                Plan for the quiet expenses.
              </h2>
              <p className="text-muted-foreground leading-relaxed max-w-2xl mb-10">
                None of these are dramatic. All of them show up every month.
              </p>
            </FadeIn>
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {FORGOTTEN_COSTS.map((c, i) => (
                <FadeIn key={c.title} delay={i * 0.05} className={i === 4 ? 'md:col-span-2 lg:col-span-1' : ''}>
                  <div className="bg-sale-card rounded-3xl p-7 h-full">
                    <div className="w-11 h-11 rounded-2xl chip-accent flex items-center justify-center mb-5">
                      <c.icon className="h-5 w-5" aria-hidden="true" />
                    </div>
                    <h3 className="text-lg font-bold tracking-tight mb-2">{c.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{c.body}</p>
                  </div>
                </FadeIn>
              ))}
            </div>
          </div>
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* Interactive launch checklist */}
        {/* ---------------------------------------------------------------- */}
        <section id="launch-checklist" className="py-14 md:py-20 scroll-mt-24">
          <div className="container max-w-4xl">
            <FadeIn>
              <Eyebrow>Free launch checklist</Eyebrow>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
                Track your launch, phase by phase.
              </h2>
              <p className="text-muted-foreground leading-relaxed max-w-2xl mb-6">
                Work through the seven phases and check items off as you go. Progress is saved in this browser only.
              </p>
              <div className="flex items-center gap-4 mb-10">
                <Progress value={progressPct} className="h-2 flex-1" />
                <span className="text-sm text-muted-foreground whitespace-nowrap">
                  {doneItems} of {totalItems} done
                </span>
              </div>
            </FadeIn>

            <div className="space-y-4">
              {CHECKLIST_PHASES.map((phase, i) => {
                const isOpen = openPhase === phase.id;
                const phaseDone = phase.items.filter((_, j) => checked[`${phase.id}-${j}`]).length;
                return (
                  <FadeIn key={phase.id} delay={Math.min(i * 0.03, 0.15)}>
                    <div className="bg-sale-card rounded-3xl overflow-hidden">
                      <button
                        type="button"
                        onClick={() => setOpenPhase(isOpen ? '' : phase.id)}
                        aria-expanded={isOpen}
                        className="w-full flex items-center gap-4 px-6 py-5 text-left"
                      >
                        <span className="text-sm font-bold text-muted-foreground w-8 shrink-0">
                          {String(i + 1).padStart(2, '0')}
                        </span>
                        <span className="flex-1 font-bold tracking-tight">{phase.title}</span>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {phaseDone}/{phase.items.length}
                        </span>
                        <ChevronDown
                          className={`h-4 w-4 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`}
                          aria-hidden="true"
                        />
                      </button>
                      {isOpen && (
                        <ul className="px-6 pb-6 pt-1 space-y-3 border-t border-border">
                          {phase.items.map((item, j) => {
                            const key = `${phase.id}-${j}`;
                            return (
                              <li key={key} className="flex items-start gap-3 pt-3">
                                <Checkbox
                                  id={key}
                                  checked={!!checked[key]}
                                  onCheckedChange={(v) =>
                                    setChecked((prev) => ({ ...prev, [key]: v === true }))
                                  }
                                  className="mt-0.5"
                                />
                                <label
                                  htmlFor={key}
                                  className={`text-sm leading-relaxed cursor-pointer ${
                                    checked[key] ? 'text-muted-foreground line-through' : ''
                                  }`}
                                >
                                  {item}
                                </label>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </div>
                  </FadeIn>
                );
              })}
            </div>
          </div>
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* Vendibook ecosystem */}
        {/* ---------------------------------------------------------------- */}
        <section className="py-14 md:py-20">
          <div className="container max-w-5xl">
            <FadeIn>
              <Eyebrow>The Vendibook ecosystem</Eyebrow>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-10">
                Use Vendibook as you build.
              </h2>
            </FadeIn>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {ECOSYSTEM_LINKS.map((link, i) => (
                <FadeIn key={link.title} delay={i * 0.05}>
                  <Link to={link.to} className="group block h-full">
                    <div className="bg-sale-card rounded-3xl p-6 h-full flex flex-col transition-shadow group-hover:shadow-lg">
                      <div className="w-10 h-10 rounded-xl chip-accent flex items-center justify-center mb-4">
                        <link.icon className="h-5 w-5" aria-hidden="true" />
                      </div>
                      <h3 className="font-bold tracking-tight mb-1">{link.title}</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed flex-1 mb-4">{link.body}</p>
                      <span className="inline-flex items-center text-sm font-semibold text-primary">
                        {link.cta}
                        <ArrowRight className="ml-1.5 h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                      </span>
                    </div>
                  </Link>
                </FadeIn>
              ))}
            </div>
            <FadeIn className="mt-6">
              <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
                <Link to="/financing" className="hover:text-foreground transition-colors">
                  Equipment financing
                </Link>
                <Link to="/vendibook-freight" className="hover:text-foreground transition-colors">
                  Vendibook Freight transport
                </Link>
              </div>
            </FadeIn>
          </div>
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* Academy preview */}
        {/* ---------------------------------------------------------------- */}
        <AcademyPreviewBand
          title="Vendibook Academy"
          body="The free Startup Guide gives you the foundation. Vendibook Academy will go deeper with practical lessons, worksheets, startup planning, menu and operating strategy, equipment decisions, launch preparation, and the real details behind running a mobile food business."
        />

        {/* ---------------------------------------------------------------- */}
        {/* Final CTA */}
        {/* ---------------------------------------------------------------- */}
        <section className="pb-20 md:pb-28">
          <div className="container max-w-4xl text-center">
            <FadeIn>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
                Ready to turn the plan into something real?
              </h2>
              <p className="text-muted-foreground leading-relaxed max-w-xl mx-auto mb-8">
                See what is available on the marketplace, then confirm the rules where you plan to operate.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button variant="cta" size="cta" asChild>
                  <Link to="/browse">
                    Browse food trucks &amp; trailers
                    <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
                  </Link>
                </Button>
                <Button variant="outline" size="cta" asChild className="rounded-2xl">
                  <Link to="/tools/permitpath">Check your permits</Link>
                </Button>
              </div>
            </FadeIn>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default StartupGuide;
