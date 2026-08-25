import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import SEO from '@/components/SEO';
import JsonLd from '@/components/JsonLd';
import { usePageTracking } from '@/hooks/usePageTracking';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import AcademyPreviewBand from '@/components/tools/AcademyPreviewBand';
import {
  Shield,
  FileCheck,
  MapPin,
  Building2,
  Truck,
  ChefHat,
  Scale,
  BookOpen,
  ExternalLink,
  Search,
  Award,
  Info,
  Flame,
  CheckCircle2,
  Home,
  Store,
  ArrowRight,
  UtensilsCrossed
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Content model
// ---------------------------------------------------------------------------

const FIVE_QUESTIONS = [
  {
    icon: ChefHat,
    q: 'What are you serving?',
    body: 'Prepackaged snacks, hot held foods, and raw protein cooked to order are often regulated very differently.'
  },
  {
    icon: Flame,
    q: 'What equipment and fuel will you use?',
    body: 'Fryers, griddles, open flame, propane, and generators can each trigger fire, ventilation, or suppression requirements.'
  },
  {
    icon: Building2,
    q: 'Where will you prep, store, fill water, and dispose of wastewater?',
    body: 'Many jurisdictions tie your permit to a commissary or servicing area that supports these functions.'
  },
  {
    icon: MapPin,
    q: 'Where will you park and vend?',
    body: 'Zoning, distance rules, time limits, and private property agreements can all shape where you may operate.'
  },
  {
    icon: Scale,
    q: 'Which agencies inspect or license the operation?',
    body: 'Health, fire, tax, and licensing agencies may each play a role. Knowing who issues what saves weeks.'
  }
];

const REGULATORY_CATEGORIES = [
  {
    icon: Truck,
    title: 'Mobile food permits',
    body: 'The core license or permit that lets a truck, trailer, or cart sell food. Names and issuing agencies vary widely.'
  },
  {
    icon: Shield,
    title: 'Health and food safety',
    body: 'Plan review, inspections, temperature control, sinks, water tanks, and sanitation standards set by health departments.'
  },
  {
    icon: Flame,
    title: 'Fire, propane, and ventilation',
    body: 'Cooking equipment, fuel storage, hoods, and suppression systems are often reviewed by fire authorities separately.'
  },
  {
    icon: Building2,
    title: 'Commissary and servicing area',
    body: 'Many jurisdictions expect a licensed base for prep, storage, water, wastewater, and cleaning, documented by an agreement.'
  },
  {
    icon: MapPin,
    title: 'Location, zoning, and vending rules',
    body: 'Where you may park, how long you may stay, and how close you may be to schools, restaurants, or other vendors.'
  },
  {
    icon: Award,
    title: 'Food handler and manager certification',
    body: 'Jurisdictions may require food handler cards for staff or a certified food protection manager for the operation.'
  },
  {
    icon: Home,
    title: 'Cottage food and home-kitchen rules',
    body: 'Separate regulatory models for low-risk foods made at home, and in some places, full meals from home kitchens.'
  },
  {
    icon: Store,
    title: 'Shared and commercial kitchens',
    body: 'Renting licensed kitchen time comes with its own operator and user licensing in many cities.'
  }
];

// Selected jurisdiction examples. This is intentionally NOT a complete
// 50-state database. Copy is phrased as "what to verify" so it stays useful
// even as specific fees and rules change.
const JURISDICTION_EXAMPLES = [
  {
    state: 'Arizona',
    regions: [
      {
        name: 'Maricopa County (Phoenix)',
        agency: 'Maricopa County Environmental Services',
        verify: [
          'Mobile food unit type classification based on prep complexity',
          'Pre-operational steps required before the first inspection',
          'Commissary return expectations and agreement documentation',
          'Reciprocity options for permits from neighboring counties'
        ],
        keyForms: ['Mobile Food Pre-Operational Attestation', 'Type Classification Application', 'Commissary Agreement'],
        url: 'https://www.maricopa.gov/mobileFood'
      },
      {
        name: 'Pima County (Tucson)',
        agency: 'Pima County Health Department',
        verify: [
          'Menu classification for full-service cooking',
          'Fresh water and wastewater tank sizing rules',
          'Route sheet and restroom access expectations',
          'Servicing area agreement approval before operation'
        ],
        keyForms: ['MFU Plan Review Application', 'Servicing Area Agreement'],
        url: 'https://www.pima.gov/mfu'
      }
    ]
  },
  {
    state: 'California',
    regions: [
      {
        name: 'Los Angeles County',
        agency: 'LA County Department of Public Health',
        verify: [
          'Plan check before operation',
          'Route sheet expectations with the application',
          'Approved commissary list and commissary letter',
          'Sidewalk vending rules under the compact mobile food operation model'
        ],
        keyForms: ['Supplemental Application for Mobile Food Facility', 'Commissary Letter'],
        url: 'https://publichealth.lacounty.gov'
      },
      {
        name: 'San Diego County',
        agency: 'Department of Environmental Health and Quality',
        verify: [
          'Visible letter grading for mobile facilities',
          'Construction guides for carts and trucks',
          'Written standard operating procedures',
          'Different rules for packaged vs unpackaged push carts'
        ],
        keyForms: ['SOPs Document', 'Plan Check Guide'],
        url: 'https://www.sandiegocounty.gov/deh'
      },
      {
        name: 'Santa Clara County',
        agency: 'Santa Clara County DEH',
        verify: [
          'State HCD insignia for occupied vehicles',
          'Private property vending permits and time thresholds',
          'Distance and residential zone vending rules'
        ],
        keyForms: ['HCD Insignia Proof', 'Administrative Permit Application'],
        url: 'https://www.sccgov.org/deh'
      }
    ]
  },
  {
    state: 'Texas',
    regions: [
      {
        name: 'Harris County (Houston)',
        agency: 'Harris County Public Health',
        verify: [
          'Physical medallion system for permitted units',
          'In-person vehicle inspection requirements',
          'Notarized commissary letter',
          'Property agreement with documented restroom access'
        ],
        keyForms: ['Equipment List', 'Medallion Application', 'Property Agreement Letter'],
        url: 'https://publichealth.harriscountytx.gov'
      },
      {
        name: 'Dallas County',
        agency: 'Dallas County Health and Human Services',
        verify: [
          'Unit classes for enclosed trucks vs trailers with external cooking',
          'Fire department propane permit as a prerequisite',
          'Rules that restrict home-based operations'
        ],
        keyForms: ['Dallas Commissary Approval Form', 'Fire Permit Application'],
        url: 'https://www.dallascounty.org/hhsd'
      },
      {
        name: 'Travis County (Austin)',
        agency: 'Austin Public Health',
        verify: [
          'Notarized central preparation facility contract',
          'Grease trap pumping verification',
          'Fire inspection sequencing before the health permit'
        ],
        keyForms: ['CPF Contract', 'Fire Safety Permit'],
        url: 'https://www.austintexas.gov/aph'
      },
      {
        name: 'Bexar County (San Antonio)',
        agency: 'San Antonio Metropolitan Health District',
        verify: [
          'Background checks for certain vendor types',
          'Distance rules near schools during school hours',
          'The distinction between mobile vending and temporary events'
        ],
        keyForms: ['Background Check Application', 'Mobile Vending Permit'],
        url: 'https://www.sanantonio.gov/health'
      }
    ]
  },
  {
    state: 'Illinois',
    regions: [
      {
        name: 'Chicago',
        agency: 'Chicago Department of Public Health',
        verify: [
          'License class depends on whether you cook on board',
          'GPS tracking expectations for mobile vendors',
          'Time limits at vending locations',
          'City registration for food sanitation manager certificates'
        ],
        keyForms: ['GPS Device Certification', 'Food Service Sanitation Manager Certificate'],
        url: 'https://www.chicago.gov/cdph'
      }
    ]
  },
  {
    state: 'New York',
    regions: [
      {
        name: 'New York City',
        agency: 'NYC DOHMH / Dept. of Consumer and Worker Protection',
        verify: [
          'Separate individual license and unit permit',
          'Permit caps and waitlist realities',
          'Supervisory license requirements for new permits',
          'Restricted area permits for private property and parks'
        ],
        keyForms: ['Waiting List Application', 'Supervisory License Application'],
        url: 'https://www.nyc.gov/dohmh'
      }
    ]
  },
  {
    state: 'Pennsylvania',
    regions: [
      {
        name: 'Philadelphia',
        agency: 'Philadelphia Department of Public Health',
        verify: [
          'Commercial activity license before the health permit',
          'Tax account prerequisites',
          'Support facility documentation with recent inspection reports',
          'Extra steps for out-of-city support facilities'
        ],
        keyForms: ['Commercial Activity License', 'Support Facility Information Form'],
        url: 'https://www.phila.gov/health'
      }
    ]
  },
  {
    state: 'Florida',
    regions: [
      {
        name: 'Statewide',
        agency: 'DBPR Division of Hotels and Restaurants',
        verify: [
          'Mobile food dispensing vehicle license',
          'Plan review for new vehicles',
          'Commissary notification for water and waste',
          'Possible exemptions for self-sufficient vehicles'
        ],
        keyForms: ['HR-7031 Plan Review', 'HR-7022 Commissary Notification'],
        url: 'https://www.myfloridalicense.com/dbpr'
      }
    ]
  }
];

// Concise list of major providers. Acceptance varies by jurisdiction, so no
// universal acceptance claims and no pricing that can go stale.
const CERTIFICATION_PROVIDERS = [
  {
    name: 'ServSafe',
    organization: 'National Restaurant Association',
    type: 'Manager and handler',
    url: 'https://www.servsafe.com'
  },
  {
    name: 'StateFoodSafety',
    organization: 'StateFoodSafety.com',
    type: 'Manager and handler',
    url: 'https://www.statefoodsafety.com'
  },
  {
    name: 'NRFSP',
    organization: 'National Registry of Food Safety Professionals',
    type: 'Manager',
    url: 'https://www.nrfsp.com'
  },
  {
    name: 'Learn2Serve',
    organization: '360training',
    type: 'Manager and handler',
    url: 'https://www.learn2serve.com'
  },
  {
    name: 'Always Food Safe',
    organization: 'The Always Food Safe Company',
    type: 'Manager and handler',
    url: 'https://www.alwaysfoodsafe.com'
  },
  {
    name: 'Prometric',
    organization: 'Prometric Testing',
    type: 'Manager (CPFM)',
    url: 'https://www.prometric.com'
  }
];

const COMMISSARY_FUNCTIONS = [
  'Food preparation',
  'Approved food storage',
  'Potable water refill',
  'Wastewater disposal',
  'Warewashing and cleaning',
  'Grease handling',
  'Parking and servicing',
  'A documented commissary agreement'
];

// Selected home-kitchen examples, qualitative on purpose. Revenue caps and
// fees change often, so the page explains the models instead of quoting numbers.
const HOME_KITCHEN_EXAMPLES = [
  {
    state: 'Florida',
    model: 'Cottage food',
    note: 'Allows many low-risk, non-perishable foods made at home and sold directly, with specific labeling language.'
  },
  {
    state: 'Texas',
    model: 'Cottage food',
    note: 'Covers low-risk foods and some acidified canned goods, with limits on meat, poultry, and seafood.'
  },
  {
    state: 'New York',
    model: 'Home processor registration',
    note: 'A registration-based model for baked goods and similar items, with its own list of allowed and prohibited foods.'
  },
  {
    state: 'California',
    model: 'MEHKO',
    note: 'Microenterprise home kitchen permits can allow full meals from a home kitchen, but counties must opt in and set their own terms.'
  },
  {
    state: 'Pennsylvania',
    model: 'Limited food establishment',
    note: 'A middle ground that can include acidified and fermented foods, with registration and plan review.'
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

const RegulationsHub = () => {
  usePageTracking();
  const reduced = useReducedMotion();
  const [searchTerm, setSearchTerm] = useState('');

  const filteredStates = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return JURISDICTION_EXAMPLES;
    return JURISDICTION_EXAMPLES.map((s) => ({
      ...s,
      regions: s.regions.filter(
        (r) =>
          s.state.toLowerCase().includes(term) ||
          r.name.toLowerCase().includes(term) ||
          r.agency.toLowerCase().includes(term)
      )
    })).filter((s) => s.state.toLowerCase().includes(term) || s.regions.length > 0);
  }, [searchTerm]);

  const scrollToJurisdictions = () => {
    document
      .getElementById('jurisdiction-examples')
      ?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
  };

  return (
    <div className="sale-light min-h-screen flex flex-col overflow-x-clip">
      <SEO
        title="Food Truck Regulations & Permit Guide | Vendibook"
        description="Understand the major regulations that can affect food trucks and food trailers, including health permits, fire requirements, commissaries, vending rules, certifications, and selected jurisdiction examples."
        canonical="/tools/regulations-hub"
        type="article"
      />
      <JsonLd
        schema={{
          '@context': 'https://schema.org',
          '@type': 'Article',
          headline: 'Food Truck Regulations and Permit Guide',
          description:
            'An educational overview of the regulation categories that can affect food trucks and food trailers, with selected state and city examples.',
          url: 'https://vendibook.com/tools/regulations-hub',
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
              <span className="text-foreground">Regulations Hub</span>
            </nav>

            <FadeIn>
              <Eyebrow>Regulations Hub</Eyebrow>
              <h1 className="text-4xl md:text-6xl font-bold tracking-tight leading-[1.05] mb-6">
                Know what your market requires before you commit.
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground leading-relaxed max-w-3xl mb-8">
                Food truck and food trailer rules can change by state, county, city, menu, equipment, and where you operate. Use the Regulations Hub to understand the major compliance categories, review selected jurisdiction examples, and know what to verify with the agencies that actually issue your permits.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 mb-8">
                <Button variant="cta" size="cta" asChild>
                  <Link to="/tools/permitpath">
                    Find my permits
                    <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
                  </Link>
                </Button>
                <Button variant="outline" size="cta" className="rounded-2xl" onClick={scrollToJurisdictions}>
                  Browse the regulations below
                </Button>
              </div>
              <p className="text-xs text-muted-foreground flex items-start gap-2 max-w-2xl">
                <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" aria-hidden="true" />
                Regulatory information is educational and may change. Always confirm current requirements with the issuing agency before purchasing equipment, signing a lease, or operating.
              </p>
            </FadeIn>
          </div>
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* Five questions */}
        {/* ---------------------------------------------------------------- */}
        <section className="py-14 md:py-20">
          <div className="container max-w-5xl">
            <FadeIn>
              <Eyebrow>Start with the five questions</Eyebrow>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4 max-w-2xl">
                Before you buy or build, answer these first.
              </h2>
              <p className="text-muted-foreground leading-relaxed max-w-2xl mb-10">
                The same truck can face different requirements in different places. These five questions explain why.
              </p>
            </FadeIn>
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {FIVE_QUESTIONS.map((item, i) => (
                <FadeIn key={item.q} delay={i * 0.05} className={i === 4 ? 'md:col-span-2 lg:col-span-1' : ''}>
                  <div className="bg-sale-card rounded-3xl p-7 h-full">
                    <div className="w-11 h-11 rounded-2xl chip-accent flex items-center justify-center mb-5">
                      <item.icon className="h-5 w-5" aria-hidden="true" />
                    </div>
                    <h3 className="text-lg font-bold tracking-tight mb-2">{item.q}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{item.body}</p>
                  </div>
                </FadeIn>
              ))}
            </div>
          </div>
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* Regulatory categories */}
        {/* ---------------------------------------------------------------- */}
        <section className="py-14 md:py-20">
          <div className="container max-w-5xl">
            <FadeIn>
              <Eyebrow>Regulatory categories</Eyebrow>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4 max-w-2xl">
                The eight categories worth understanding.
              </h2>
              <p className="text-muted-foreground leading-relaxed max-w-2xl mb-10">
                Most mobile food requirements fall into one of these buckets. Which ones apply to you depends on your menu, equipment, and market.
              </p>
            </FadeIn>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {REGULATORY_CATEGORIES.map((cat, i) => (
                <FadeIn key={cat.title} delay={Math.min(i * 0.04, 0.2)}>
                  <div className="bg-sale-card rounded-3xl p-6 h-full">
                    <div className="w-10 h-10 rounded-xl chip-accent flex items-center justify-center mb-4">
                      <cat.icon className="h-5 w-5" aria-hidden="true" />
                    </div>
                    <h3 className="font-bold tracking-tight mb-2">{cat.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{cat.body}</p>
                  </div>
                </FadeIn>
              ))}
            </div>
          </div>
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* Selected jurisdiction examples */}
        {/* ---------------------------------------------------------------- */}
        <section id="jurisdiction-examples" className="py-14 md:py-20 scroll-mt-24">
          <div className="container max-w-5xl">
            <FadeIn>
              <Eyebrow>Selected state and city examples</Eyebrow>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4 max-w-2xl">
                See how differently jurisdictions structure the rules.
              </h2>
              <p className="text-muted-foreground leading-relaxed max-w-2xl mb-8">
                These examples show how different jurisdictions structure mobile food requirements. They are not a complete 50-state legal database. Use PermitPath and official agency sources to confirm the current rules where you plan to operate.
              </p>
              <div className="relative max-w-md mb-10">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden="true" />
                <Input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search the included states and cities"
                  aria-label="Search included states and cities"
                  className="pl-11 h-12 rounded-2xl text-base bg-white"
                />
              </div>
            </FadeIn>

            {filteredStates.length === 0 ? (
              <FadeIn>
                <div className="bg-sale-card rounded-3xl p-10 text-center">
                  <p className="font-bold tracking-tight mb-2">No matches in the included examples.</p>
                  <p className="text-sm text-muted-foreground max-w-md mx-auto mb-6">
                    This hub covers a limited set of jurisdictions. For anywhere else, confirm the rules with your local health and fire agencies.
                  </p>
                  <Button variant="cta" asChild>
                    <Link to="/tools/permitpath">Open PermitPath</Link>
                  </Button>
                </div>
              </FadeIn>
            ) : (
              <div className="space-y-8">
                {filteredStates.map((stateBlock, i) => (
                  <FadeIn key={stateBlock.state} delay={Math.min(i * 0.04, 0.2)}>
                    <div>
                      <h3 className="text-xl font-bold tracking-tight mb-4">{stateBlock.state}</h3>
                      <div className="grid gap-5 md:grid-cols-2">
                        {stateBlock.regions.map((region) => (
                          <div key={region.name} className="bg-sale-card rounded-3xl p-7 h-full flex flex-col">
                            <div className="flex items-start gap-3 mb-1">
                              <MapPin className="h-5 w-5 mt-0.5 shrink-0 text-primary" aria-hidden="true" />
                              <div>
                                <h4 className="font-bold tracking-tight">{region.name}</h4>
                                <p className="text-xs text-muted-foreground">{region.agency}</p>
                              </div>
                            </div>
                            <p className="text-xs font-semibold tracking-[0.14em] uppercase text-muted-foreground mt-5 mb-3">
                              What to verify
                            </p>
                            <ul className="space-y-2 mb-5">
                              {region.verify.map((v) => (
                                <li key={v} className="flex items-start gap-2 text-sm text-muted-foreground leading-relaxed">
                                  <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0 text-primary" aria-hidden="true" />
                                  {v}
                                </li>
                              ))}
                            </ul>
                            <div className="flex flex-wrap gap-2 mb-6">
                              {region.keyForms.map((form) => (
                                <span key={form} className="chip-accent rounded-full px-3 py-1 text-xs font-medium">
                                  {form}
                                </span>
                              ))}
                            </div>
                            <div className="mt-auto">
                              <Button variant="outline" size="sm" asChild className="rounded-xl">
                                <a href={region.url} target="_blank" rel="noopener noreferrer">
                                  Official source
                                  <ExternalLink className="ml-1.5 h-3.5 w-3.5" aria-hidden="true" />
                                </a>
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </FadeIn>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* PermitPath connection */}
        {/* ---------------------------------------------------------------- */}
        <section className="py-14 md:py-20">
          <div className="container max-w-5xl">
            <FadeIn>
              <div className="rounded-[2rem] bg-[#1c1917] text-[#faf8f5] px-6 py-12 md:px-14 md:py-16 shadow-xl">
                <div className="max-w-2xl">
                  <p className="text-xs font-semibold tracking-[0.18em] uppercase text-white/60 mb-3">
                    PermitPath connection
                  </p>
                  <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
                    Regulations Hub explains the landscape. PermitPath helps you narrow it down.
                  </h2>
                  <p className="text-white/70 leading-relaxed mb-8">
                    Use PermitPath to work through location-specific permit and licensing questions for your planned operation, then confirm the answers with the issuing agencies.
                  </p>
                  <Button variant="cta" size="cta" asChild>
                    <Link to="/tools/permitpath">
                      Open PermitPath
                      <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
                    </Link>
                  </Button>
                </div>
              </div>
            </FadeIn>
          </div>
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* Certification */}
        {/* ---------------------------------------------------------------- */}
        <section className="py-14 md:py-20">
          <div className="container max-w-5xl">
            <FadeIn>
              <Eyebrow>Food safety certification</Eyebrow>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4 max-w-2xl">
                Food safety certification is only one piece of compliance.
              </h2>
              <p className="text-muted-foreground leading-relaxed max-w-2xl mb-10">
                Jurisdictions may require food handler cards, a certified food protection manager, or local registration. Acceptance and renewal rules can vary, so confirm approved providers with your local agency before you pay for a course.
              </p>
            </FadeIn>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {CERTIFICATION_PROVIDERS.map((p, i) => (
                <FadeIn key={p.name} delay={Math.min(i * 0.04, 0.2)}>
                  <a
                    href={p.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group block h-full"
                  >
                    <div className="bg-sale-card rounded-3xl p-6 h-full transition-shadow group-hover:shadow-lg">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <h3 className="font-bold tracking-tight">{p.name}</h3>
                        <ExternalLink className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden="true" />
                      </div>
                      <p className="text-xs text-muted-foreground mb-2">{p.organization}</p>
                      <span className="chip-accent rounded-full px-3 py-1 text-xs font-medium">{p.type}</span>
                    </div>
                  </a>
                </FadeIn>
              ))}
            </div>
          </div>
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* Commissary */}
        {/* ---------------------------------------------------------------- */}
        <section className="py-14 md:py-20">
          <div className="container max-w-5xl">
            <FadeIn>
              <div className="bg-sale-card rounded-[2rem] p-8 md:p-12">
                <Eyebrow>Commissary and servicing area</Eyebrow>
                <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
                  A commissary is more than a kitchen address.
                </h2>
                <p className="text-muted-foreground leading-relaxed max-w-2xl mb-8">
                  Depending on your jurisdiction and operation, a commissary or servicing area may be required to support some or all of these functions, and your permit may depend on a documented agreement.
                </p>
                <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 mb-10">
                  {COMMISSARY_FUNCTIONS.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0 text-primary" aria-hidden="true" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Button variant="outline" asChild className="rounded-2xl">
                  <Link to="/browse">
                    Browse kitchen spaces and equipment
                    <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
                  </Link>
                </Button>
              </div>
            </FadeIn>
          </div>
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* Home kitchen rules */}
        {/* ---------------------------------------------------------------- */}
        <section className="py-14 md:py-20">
          <div className="container max-w-5xl">
            <FadeIn>
              <Eyebrow>Cottage food and home kitchens</Eyebrow>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4 max-w-2xl">
                Home kitchen rules are a different lane.
              </h2>
              <p className="text-muted-foreground leading-relaxed max-w-2xl mb-10">
                Cottage food laws usually cover low-risk foods sold directly from home. MEHKO-style permits in parts of California go further and can allow full meals from a home kitchen. Both models vary heavily by state and by local adoption. The examples below are illustrative, not a national comparison.
              </p>
            </FadeIn>
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {HOME_KITCHEN_EXAMPLES.map((ex, i) => (
                <FadeIn key={ex.state} delay={Math.min(i * 0.04, 0.2)}>
                  <div className="bg-sale-card rounded-3xl p-6 h-full">
                    <div className="flex items-center gap-2 mb-2">
                      <Home className="h-4 w-4 text-primary" aria-hidden="true" />
                      <h3 className="font-bold tracking-tight">{ex.state}</h3>
                    </div>
                    <span className="chip-accent rounded-full px-3 py-1 text-xs font-medium inline-block mb-3">
                      {ex.model}
                    </span>
                    <p className="text-sm text-muted-foreground leading-relaxed">{ex.note}</p>
                  </div>
                </FadeIn>
              ))}
            </div>
            <FadeIn className="mt-8">
              <p className="text-xs text-muted-foreground flex items-start gap-2 max-w-2xl">
                <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" aria-hidden="true" />
                Allowed foods, sales channels, caps, and fees change often. Always confirm the current rules with your state agriculture or health agency.
              </p>
            </FadeIn>
          </div>
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* Academy preview */}
        {/* ---------------------------------------------------------------- */}
        <AcademyPreviewBand
          title="Compliance will be part of Vendibook Academy."
          body="Academy will help founders understand how permits, commissaries, menu choices, equipment, inspections, and operating decisions connect before they spend money."
        />

        {/* ---------------------------------------------------------------- */}
        {/* Final CTA */}
        {/* ---------------------------------------------------------------- */}
        <section className="pb-20 md:pb-28">
          <div className="container max-w-4xl text-center">
            <FadeIn>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
                Check the rules before the build locks you in.
              </h2>
              <p className="text-muted-foreground leading-relaxed max-w-xl mx-auto mb-8">
                Equipment decisions are hard to undo. Permit and licensing questions are much easier to answer first.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button variant="cta" size="cta" asChild>
                  <Link to="/tools/permitpath">
                    Find my permits
                    <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
                  </Link>
                </Button>
                <Button variant="outline" size="cta" asChild className="rounded-2xl">
                  <Link to="/tools/startup-guide">Open the Startup Guide</Link>
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

export default RegulationsHub;
