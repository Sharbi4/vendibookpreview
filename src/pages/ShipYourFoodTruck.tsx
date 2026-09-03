import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  ArrowLeft,
  ArrowRight,
  MapPin,
  Navigation,
  Box,
  Ruler,
  Gauge,
  Forklift,
  Route as RouteIcon,
  Landmark,
  ClipboardCheck,
  CheckCircle2,
  Pencil,
} from 'lucide-react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import SEO from '@/components/SEO';
import { GuideBreadcrumb } from '@/components/education/GuideBreadcrumb';
import { RequiredMark, RequiredLegend } from '@/components/common/RequiredMark';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import movingArt from '@/assets/education/moving.svg.asset.json';
import deliveryMapArt from '@/assets/education/delivery-map.svg.asset.json';

/**
 * /ship-your-food-truck — high-intent standalone acquisition page for
 * Vendibook Freight. Front-end structure, copy, and conversion design only.
 *
 * Guardrails (do not regress): no fixed per-mile rate, no $75 handling fee,
 * no universal tax rate, no client-side price calculation, and no call to the
 * legacy estimate-freight endpoint. The quote intake below is a staged
 * front-end flow: submissions are held in local state and confirmed in the UI.
 * Persistence and pricing are wired in a follow-up engine task.
 * Provider-dependent claims carry an asterisk resolved in the bottom
 * disclosure. The only fixed figure allowed is the $150 Coordination Fee.
 */

const fadeUp = {
  initial: { opacity: 0, y: 18 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-60px' },
  transition: { duration: 0.45 },
};

const HERO_PROOF = [
  'Lower 48 states*',
  'Food trucks & trailers',
  'Standalone shipments welcome',
  'Pickup coordination*',
];

const EQUIPMENT_TYPES = [
  'Food Truck',
  'Food Trailer',
  'Food Cart',
  'Other Mobile Food Equipment',
];

const STANDALONE_USES = [
  {
    title: 'Dealer or manufacturer delivery',
    body: 'Bought from a dealer lot or ordered from a builder? Freight can coordinate the trip from their door to yours.',
  },
  {
    title: 'Private purchase transportation',
    body: 'Found the right unit in a private sale? You can still use Vendibook Freight to get it home.*',
  },
  {
    title: 'Relocating equipment',
    body: 'Moving your own truck or trailer to a new market, a new commissary, or a new home base.',
  },
  {
    title: 'Moving a custom build',
    body: 'Shipping a finished build to a customer? Coordinate delivery without standing up your own logistics desk.*',
  },
];

const CATEGORY_CARDS = [
  {
    icon: Ruler,
    title: 'Size and weight',
    body: 'Length, width, height, and weight decide which trailer setup and equipment can move your unit safely and legally.',
  },
  {
    icon: Gauge,
    title: 'Running condition',
    body: 'A truck that starts, steers, and brakes loads differently than one that does not. It shapes the plan and the pricing.*',
  },
  {
    icon: Forklift,
    title: 'Loading access',
    body: 'Tight lots, low clearance, soft ground, and gated yards change how pickup works. Sharing that early keeps the move smooth.',
  },
  {
    icon: RouteIcon,
    title: 'Route and availability',
    body: 'Transportation pricing reflects the actual route, current carrier availability, and fuel and travel costs at the time of the move.*',
  },
];

const STEPS = [
  {
    num: '01',
    title: 'Tell us what you’re moving',
    body: 'Submit the route and equipment details in the form above. It takes a couple of minutes.',
  },
  {
    num: '02',
    title: 'Review transportation pricing',
    body: 'Pricing is prepared around the actual shipment and current transportation availability.*',
  },
  {
    num: '03',
    title: 'Coordinate the move',
    body: 'Once transportation is confirmed, pickup and delivery are coordinated around the shipment details and provider availability.*',
  },
];

const PRICING_FACTORS = [
  'Origin and destination',
  'The actual route',
  'Equipment dimensions and weight',
  'Equipment type',
  'Whether the unit runs and drives',
  'Current transportation availability',
  'Travel and fuel costs',
  'Pickup and delivery access',
  'Special handling requirements',
];

const FAQS = [
  {
    q: 'How do I ship a food truck?',
    a: 'Start by submitting your pickup location, delivery location, and equipment details in the form on this page. Vendibook Freight prepares transportation pricing around the actual shipment, and once transportation is confirmed, pickup and delivery are coordinated around your details and provider availability.*',
  },
  {
    q: 'Can Vendibook transport a food trailer I bought somewhere else?',
    a: 'Yes. Standalone shipments are welcome. Vendibook Freight can help coordinate food truck and food trailer transport even when the equipment came from a dealer, a manufacturer, a private seller, or another marketplace.*',
  },
  {
    q: 'How is food truck transportation pricing determined?',
    a: 'Transportation charges vary with the origin and destination, the route, equipment dimensions and weight, running condition, current transportation availability, travel and fuel costs, pickup and delivery access, and any special handling.* Vendibook charges a separate $150 Freight Coordination Fee.',
  },
  {
    q: 'Can the transportation itself be financed?',
    a: 'Yes — freight may be included in eligible financing arrangements, depending on the financing provider and the transaction. See the Financing page for how equipment financing works, and mention transportation when you apply.*',
  },
  {
    q: 'What information do I need to request transportation pricing?',
    a: 'The pickup location, delivery location, and equipment type are the starting point. Adding the year, dimensions, approximate weight, running condition, and preferred pickup date makes the pricing more accurate for your specific shipment.',
  },
  {
    q: 'Does the food truck need to run and drive?',
    a: 'Not necessarily. Units that do not run can often still be transported, but loading takes different equipment and planning, so note the condition accurately when you request pricing. Eligibility depends on the shipment and the transportation provider.*',
  },
  {
    q: 'Where is Vendibook Freight available?',
    a: 'Vendibook Freight helps coordinate food truck and food trailer shipping across the lower 48 states.* Route availability can vary by shipment and provider.',
  },
  {
    q: 'What happens after I request pricing?',
    a: 'Your route and equipment details are reviewed, and transportation pricing is prepared around the actual shipment and current availability.* Transportation charges are separate from the $150 Vendibook Freight Coordination Fee.',
  },
];

interface QuoteForm {
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  pickupLocation: string;
  deliveryLocation: string;
  equipmentType: string;
  year: string;
  lengthFt: string;
  widthFt: string;
  heightFt: string;
  weightLbs: string;
  runsAndDrives: '' | 'yes' | 'no';
  pickupDate: string;
  deliverByDate: string;
  notes: string;
}

const EMPTY_FORM: QuoteForm = {
  contactName: '',
  contactEmail: '',
  contactPhone: '',
  pickupLocation: '',
  deliveryLocation: '',
  equipmentType: '',
  year: '',
  lengthFt: '',
  widthFt: '',
  heightFt: '',
  weightLbs: '',
  runsAndDrives: '',
  pickupDate: '',
  deliverByDate: '',
  notes: '',
};

type QuoteErrors = Partial<
  Record<
    | 'contactName'
    | 'contactEmail'
    | 'contactPhone'
    | 'pickupLocation'
    | 'deliveryLocation'
    | 'equipmentType',
    string
  >
>;

const STEP_META = [
  { label: 'Contact & route', hint: 'How to reach you, plus the route — under a minute.' },
  { label: 'Equipment & timing', hint: 'All optional, but it sharpens the pricing.' },
  { label: 'Review & send', hint: 'Confirm the details, then send your request.' },
] as const;

const inputClass =
  'h-12 rounded-xl text-base md:text-sm bg-background border-border focus-visible:ring-primary/40';

const ShipYourFoodTruck = () => {
  const reduce = useReducedMotion();
  const { user, profile } = useAuth();
  const formSectionRef = useRef<HTMLDivElement>(null);
  const [form, setForm] = useState<QuoteForm>(EMPTY_FORM);
  const [errors, setErrors] = useState<QuoteErrors>({});
  const [submitted, setSubmitted] = useState(false);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  // Guards against stray/double-tap submits: the submit button replaces
  // Continue in the same spot, so a fast second tap could otherwise fire it.
  const step3EnteredAt = useRef(0);
  const prefilled = useRef(false);

  // Prefill contact details for signed-in users, without clobbering typing.
  useEffect(() => {
    if (prefilled.current) return;
    if (!user && !profile) return;
    const name = profile?.full_name || '';
    const email = profile?.email || user?.email || '';
    const phone = profile?.phone_number || '';
    if (!name && !email && !phone) return;
    prefilled.current = true;
    setForm((prev) => ({
      ...prev,
      contactName: prev.contactName || name,
      contactEmail: prev.contactEmail || email,
      contactPhone: prev.contactPhone || phone,
    }));
  }, [user, profile]);

  const scrollToForm = () => {
    formSectionRef.current?.scrollIntoView({
      behavior: reduce ? 'auto' : 'smooth',
      block: 'start',
    });
  };

  const setField = <K extends keyof QuoteForm>(key: K, value: QuoteForm[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (key in errors) {
      setErrors((prev) => ({ ...prev, [key]: undefined }));
    }
  };

  const validate = (): QuoteErrors => {
    const next: QuoteErrors = {};
    if (!form.contactName.trim()) next.contactName = 'Enter your full name.';
    if (!form.contactEmail.trim()) {
      next.contactEmail = 'Enter your email address.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.contactEmail.trim())) {
      next.contactEmail = 'Enter a valid email address.';
    }
    const digits = form.contactPhone.replace(/\D/g, '');
    if (!form.contactPhone.trim()) {
      next.contactPhone = 'Enter a phone number we can reach you at.';
    } else if (digits.length < 10) {
      next.contactPhone = 'Enter a valid phone number.';
    }
    if (!form.pickupLocation.trim()) next.pickupLocation = 'Enter the pickup city, state, or ZIP.';
    if (!form.deliveryLocation.trim()) next.deliveryLocation = 'Enter the delivery city, state, or ZIP.';
    if (!form.equipmentType) next.equipmentType = 'Choose the equipment type.';
    return next;
  };

  const goToStep = (next: 1 | 2 | 3) => {
    if (next === 3) step3EnteredAt.current = Date.now();
    setStep(next);
    requestAnimationFrame(() => {
      formSectionRef.current?.scrollIntoView({
        behavior: reduce ? 'auto' : 'smooth',
        block: 'start',
      });
    });
  };

  const goNext = () => {
    if (step === 1) {
      const next = validate();
      setErrors(next);
      if (Object.keys(next).length > 0) return;
    }
    if (step < 3) goToStep((step + 1) as 1 | 2 | 3);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (step !== 3) return;
    if (Date.now() - step3EnteredAt.current < 700) return;
    const next = validate();
    setErrors(next);
    if (Object.keys(next).length > 0) {
      // Contact/route errors live on step 1 — send them back to fix it.
      goToStep(1);
      return;
    }
    setSubmitted(true);

    const dimensions = [
      form.lengthFt && `${form.lengthFt} ft L`,
      form.widthFt && `${form.widthFt} ft W`,
      form.heightFt && `${form.heightFt} ft H`,
    ]
      .filter(Boolean)
      .join(' × ');
    const runsAndDrives =
      form.runsAndDrives === 'yes' ? 'Yes' : form.runsAndDrives === 'no' ? 'No' : '';

    // Persist first so the request is never lost, then notify — neither
    // blocks the confirmation state.
    supabase
      .from('freight_requests')
      .insert({
        user_id: user?.id ?? null,
        contact_name: form.contactName.trim(),
        contact_email: form.contactEmail.trim(),
        contact_phone: form.contactPhone.trim(),
        pickup_location: form.pickupLocation.trim(),
        delivery_location: form.deliveryLocation.trim(),
        equipment_type: form.equipmentType,
        year: form.year.trim() || null,
        length_ft: form.lengthFt.trim() || null,
        width_ft: form.widthFt.trim() || null,
        height_ft: form.heightFt.trim() || null,
        weight_lbs: form.weightLbs.trim() || null,
        runs_and_drives: runsAndDrives || null,
        pickup_date: form.pickupDate || null,
        deliver_by_date: form.deliverByDate || null,
        notes: form.notes.trim() || null,
        source_page: '/ship-your-food-truck',
      })
      .then(({ error }) => {
        if (error) console.error('Freight request save error:', error);
      });

    supabase.functions
      .invoke('send-admin-notification', {
        body: {
          type: 'freight_quote_request',
          data: {
            contact_name: form.contactName.trim(),
            contact_email: form.contactEmail.trim(),
            contact_phone: form.contactPhone.trim(),
            account: user?.id ? `Signed in (${user.email ?? user.id})` : 'Guest (not signed in)',
            pickup_location: form.pickupLocation.trim(),
            delivery_location: form.deliveryLocation.trim(),
            equipment_type: form.equipmentType,
            year: form.year.trim(),
            dimensions,
            weight: form.weightLbs.trim() ? `${form.weightLbs.trim()} lbs` : '',
            runs_and_drives: runsAndDrives,
            preferred_pickup: form.pickupDate,
            deliver_by: form.deliverByDate,
            notes: form.notes.trim(),
            source_page: '/ship-your-food-truck',
          },
        },
      })
      .catch((err) => console.error('Freight quote notification error:', err));
    requestAnimationFrame(() => {
      formSectionRef.current?.scrollIntoView({
        behavior: reduce ? 'auto' : 'smooth',
        block: 'start',
      });
    });
  };

  const summaryRows: Array<{ label: string; value: string }> = [
    { label: 'Name', value: form.contactName.trim() },
    { label: 'Email', value: form.contactEmail.trim() },
    { label: 'Phone', value: form.contactPhone.trim() },
    { label: 'Pickup', value: form.pickupLocation.trim() },
    { label: 'Delivery', value: form.deliveryLocation.trim() },
    { label: 'Equipment', value: form.equipmentType },
    { label: 'Year', value: form.year.trim() },
    {
      label: 'Dimensions',
      value:
        [form.lengthFt && `${form.lengthFt} ft L`, form.widthFt && `${form.widthFt} ft W`, form.heightFt && `${form.heightFt} ft H`]
          .filter(Boolean)
          .join(' × '),
    },
    { label: 'Approx. weight', value: form.weightLbs.trim() ? `${form.weightLbs.trim()} lbs` : '' },
    {
      label: 'Runs and drives',
      value: form.runsAndDrives === 'yes' ? 'Yes' : form.runsAndDrives === 'no' ? 'No' : '',
    },
    { label: 'Preferred pickup', value: form.pickupDate },
    { label: 'Deliver by', value: form.deliverByDate },
    { label: 'Notes', value: form.notes.trim() },
  ].filter((r) => r.value);

  useEffect(() => {
    // FAQ structured data for high-intent shipping queries.
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.text = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: FAQS.map((f) => ({
        '@type': 'Question',
        name: f.q,
        acceptedAnswer: { '@type': 'Answer', text: f.a },
      })),
    });
    document.head.appendChild(script);
    return () => {
      document.head.removeChild(script);
    };
  }, []);

  return (
    <div className="sale-light min-h-screen bg-background flex flex-col">
      <SEO
        title="Ship a Food Truck or Food Trailer | Vendibook Freight"
        description="Need to move a food truck or trailer? Submit pickup, delivery, and equipment details to Vendibook Freight for transportation pricing across the lower 48 states."
        canonical="/ship-your-food-truck"
      />

      <Header />

      <main className="flex-1">
        {/* 1. HERO */}
        <section className="relative pt-12 pb-14 md:pt-20 md:pb-20 overflow-hidden">
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                'radial-gradient(70% 55% at 85% 0%, rgba(255,106,26,0.07) 0%, transparent 70%), linear-gradient(180deg, rgba(255,248,240,0.9) 0%, transparent 45%)',
            }}
            aria-hidden="true"
          />
          <div className="container max-w-6xl mx-auto px-4 relative z-10">
            <GuideBreadcrumb
              items={[
                { label: 'Home', to: '/' },
                { label: 'Vendibook Freight', to: '/vendibook-freight' },
                { label: 'Ship Your Food Truck' },
              ]}
              className="mb-8"
            />
            <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
              <motion.div
                initial={reduce ? undefined : { opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-card border border-border text-[11px] font-semibold uppercase tracking-[0.16em] text-foreground mb-6 shadow-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary" aria-hidden="true" />
                  Vendibook Freight
                </div>
                <h1 className="text-4xl sm:text-5xl md:text-[3.4rem] font-bold tracking-tight text-foreground mb-5 leading-[1.06]">
                  Ship Your Food Truck or Trailer
                </h1>
                <p className="text-lg text-muted-foreground mb-8 max-w-xl leading-relaxed">
                  Moving mobile food equipment? Tell us what you’re shipping and where it needs to
                  go. Vendibook Freight helps coordinate food truck and food trailer transportation
                  across the lower 48 states.*
                </p>
                <div className="flex flex-col sm:flex-row gap-3 mb-8">
                  <Button
                    variant="cta"
                    size="cta"
                    className="rounded-full"
                    onClick={scrollToForm}
                  >
                    Get Transportation Pricing <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                  <Button variant="cta-outline" size="lg" className="rounded-full h-14" asChild>
                    <Link to="/vendibook-freight">How Vendibook Freight Works</Link>
                  </Button>
                </div>
                <ul className="flex flex-wrap gap-x-5 gap-y-2">
                  {HERO_PROOF.map((item) => (
                    <li
                      key={item}
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground"
                    >
                      <span className="w-1 h-1 rounded-full bg-primary/70" aria-hidden="true" />
                      {item}
                    </li>
                  ))}
                </ul>
              </motion.div>

              <motion.div
                initial={reduce ? undefined : { opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, delay: 0.1 }}
                className="relative"
              >
                <div className="rounded-[2rem] border border-border bg-card shadow-[0_30px_80px_-30px_rgba(18,18,18,0.25)] p-6 sm:p-10">
                  <img
                    src={movingArt.url}
                    alt="Illustration of a food truck being prepared for transport to its new home"
                    className="w-full h-auto"
                    loading="eager"
                  />
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* 2. HIGH-INTENT QUOTE INTAKE */}
        <section ref={formSectionRef} id="quote-form" className="scroll-mt-24 pb-16 md:pb-24">
          <div className="container max-w-4xl mx-auto px-4">
            <motion.div
              {...(reduce ? {} : fadeUp)}
              className="rounded-[2rem] border border-border bg-card shadow-[0_24px_60px_-30px_rgba(18,18,18,0.18)] p-6 sm:p-10"
            >
              {submitted ? (
                <div role="status" aria-live="polite">
                  <div className="flex items-start gap-4 mb-6">
                    <span className="w-12 h-12 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                      <CheckCircle2 className="w-6 h-6 text-primary" />
                    </span>
                    <div>
                      <h2 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight mb-2">
                        Request received
                      </h2>
                      <p className="text-sm md:text-base text-muted-foreground leading-relaxed max-w-xl">
                        We have the route and equipment details needed to prepare transportation
                        pricing. Final availability and pricing depend on the shipment and the
                        transportation provider.*
                      </p>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-border bg-background p-5 sm:p-6 mb-6">
                    <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground mb-4">
                      Your shipment details
                    </h3>
                    <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-3">
                      {summaryRows.map((row) => (
                        <div key={row.label}>
                          <dt className="text-xs font-medium text-muted-foreground">{row.label}</dt>
                          <dd className="text-sm font-semibold text-foreground break-words">
                            {row.value}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button
                      variant="cta-outline"
                      size="lg"
                      className="rounded-full"
                      onClick={() => {
                        setSubmitted(false);
                        setStep(3);
                      }}
                    >
                      <Pencil className="w-4 h-4 mr-1.5" /> Edit details
                    </Button>
                    <Button variant="cta-outline" size="lg" className="rounded-full" asChild>
                      <Link to="/vendibook-freight">
                        How Vendibook Freight Works <ArrowRight className="w-4 h-4 ml-1" />
                      </Link>
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="mb-7">
                    <h2 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight mb-2">
                      Tell us what you’re moving.
                    </h2>
                    <p className="text-sm md:text-base text-muted-foreground leading-relaxed max-w-xl">
                      Give us the route and equipment details needed to prepare transportation
                      pricing.*
                    </p>
                  </div>

                  <form onSubmit={handleSubmit} noValidate>
                    {/* Step progress */}
                    <div className="mb-7">
                      <div className="flex items-baseline justify-between gap-3 mb-2.5">
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-foreground">
                          Step {step} of 3 · {STEP_META[step - 1].label}
                        </p>
                        <p className="text-xs text-muted-foreground hidden sm:block">
                          {STEP_META[step - 1].hint}
                        </p>
                      </div>
                      <div
                        className="h-1.5 rounded-full bg-muted overflow-hidden"
                        role="progressbar"
                        aria-valuemin={1}
                        aria-valuemax={3}
                        aria-valuenow={step}
                        aria-label="Quote request progress"
                      >
                        <motion.div
                          className="h-full rounded-full bg-primary"
                          initial={false}
                          animate={{ width: `${(step / 3) * 100}%` }}
                          transition={reduce ? { duration: 0 } : { duration: 0.35 }}
                        />
                      </div>
                    </div>

                    <AnimatePresence mode="wait" initial={false}>
                      {step === 1 && (
                        <motion.div
                          key="step-1"
                          initial={reduce ? false : { opacity: 0, x: 24 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={reduce ? undefined : { opacity: 0, x: -24 }}
                          transition={{ duration: 0.25 }}
                          className="space-y-5"
                        >
                          <RequiredLegend>
                            Required to request pricing. Everything else can wait for the next
                            step.
                          </RequiredLegend>

                          <div>
                            <Label htmlFor="pickup-location" className="mb-1.5 block text-sm font-semibold">
                              Pickup location <RequiredMark />
                            </Label>
                            <div className="relative">
                              <MapPin
                                className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none"
                                aria-hidden="true"
                              />
                              <Input
                                id="pickup-location"
                                value={form.pickupLocation}
                                onChange={(e) => setField('pickupLocation', e.target.value)}
                                placeholder="City, state, or ZIP"
                                autoComplete="off"
                                aria-invalid={!!errors.pickupLocation}
                                className={cn(inputClass, 'pl-10')}
                              />
                            </div>
                            {errors.pickupLocation && (
                              <p className="text-xs text-destructive mt-1.5">{errors.pickupLocation}</p>
                            )}
                          </div>

                          <div>
                            <Label htmlFor="delivery-location" className="mb-1.5 block text-sm font-semibold">
                              Delivery location <RequiredMark />
                            </Label>
                            <div className="relative">
                              <Navigation
                                className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none"
                                aria-hidden="true"
                              />
                              <Input
                                id="delivery-location"
                                value={form.deliveryLocation}
                                onChange={(e) => setField('deliveryLocation', e.target.value)}
                                placeholder="City, state, or ZIP"
                                autoComplete="off"
                                aria-invalid={!!errors.deliveryLocation}
                                className={cn(inputClass, 'pl-10')}
                              />
                            </div>
                            {errors.deliveryLocation && (
                              <p className="text-xs text-destructive mt-1.5">{errors.deliveryLocation}</p>
                            )}
                          </div>

                          <div>
                            <Label htmlFor="equipment-type" className="mb-1.5 block text-sm font-semibold">
                              Equipment type <RequiredMark />
                            </Label>
                            <Select
                              value={form.equipmentType}
                              onValueChange={(v) => setField('equipmentType', v)}
                            >
                              <SelectTrigger
                                id="equipment-type"
                                aria-invalid={!!errors.equipmentType}
                                className={cn(inputClass, 'w-full')}
                              >
                                <div className="flex items-center gap-2">
                                  <Box className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
                                  <SelectValue placeholder="Food truck, trailer, cart, or other" />
                                </div>
                              </SelectTrigger>
                              <SelectContent>
                                {EQUIPMENT_TYPES.map((t) => (
                                  <SelectItem key={t} value={t}>
                                    {t}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            {errors.equipmentType && (
                              <p className="text-xs text-destructive mt-1.5">{errors.equipmentType}</p>
                            )}
                          </div>
                        </motion.div>
                      )}

                      {step === 2 && (
                        <motion.div
                          key="step-2"
                          initial={reduce ? false : { opacity: 0, x: 24 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={reduce ? undefined : { opacity: 0, x: -24 }}
                          transition={{ duration: 0.25 }}
                          className="space-y-5"
                        >
                          <p className="text-xs text-muted-foreground leading-relaxed">
                            Everything on this step is optional — the more detail you add, the more
                            accurate the pricing.
                          </p>

                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label htmlFor="equipment-year" className="mb-1.5 block text-sm font-semibold">
                                Year
                              </Label>
                              <Input
                                id="equipment-year"
                                inputMode="numeric"
                                value={form.year}
                                onChange={(e) => setField('year', e.target.value)}
                                placeholder="e.g. 2019"
                                autoComplete="off"
                                className={inputClass}
                              />
                            </div>

                            <div>
                              <Label htmlFor="equipment-weight" className="mb-1.5 block text-sm font-semibold">
                                Weight (lbs)
                              </Label>
                              <Input
                                id="equipment-weight"
                                inputMode="numeric"
                                value={form.weightLbs}
                                onChange={(e) => setField('weightLbs', e.target.value)}
                                placeholder="e.g. 9,500"
                                autoComplete="off"
                                className={inputClass}
                              />
                            </div>
                          </div>

                          <div>
                            <span className="mb-1.5 block text-sm font-semibold text-foreground">
                              Approximate dimensions (feet)
                            </span>
                            <div className="grid grid-cols-3 gap-3">
                              <div>
                                <Label htmlFor="dim-length" className="sr-only">
                                  Length in feet
                                </Label>
                                <Input
                                  id="dim-length"
                                  inputMode="decimal"
                                  value={form.lengthFt}
                                  onChange={(e) => setField('lengthFt', e.target.value)}
                                  placeholder="Length"
                                  autoComplete="off"
                                  className={inputClass}
                                />
                              </div>
                              <div>
                                <Label htmlFor="dim-width" className="sr-only">
                                  Width in feet
                                </Label>
                                <Input
                                  id="dim-width"
                                  inputMode="decimal"
                                  value={form.widthFt}
                                  onChange={(e) => setField('widthFt', e.target.value)}
                                  placeholder="Width"
                                  autoComplete="off"
                                  className={inputClass}
                                />
                              </div>
                              <div>
                                <Label htmlFor="dim-height" className="sr-only">
                                  Height in feet
                                </Label>
                                <Input
                                  id="dim-height"
                                  inputMode="decimal"
                                  value={form.heightFt}
                                  onChange={(e) => setField('heightFt', e.target.value)}
                                  placeholder="Height"
                                  autoComplete="off"
                                  className={inputClass}
                                />
                              </div>
                            </div>
                          </div>

                          <div>
                            <span id="runs-label" className="mb-1.5 block text-sm font-semibold text-foreground">
                              Does it run and drive?
                            </span>
                            <div
                              role="radiogroup"
                              aria-labelledby="runs-label"
                              className="grid grid-cols-1 sm:grid-cols-2 gap-3"
                            >
                              {(
                                [
                                  { value: 'yes', label: 'Yes, it runs and drives' },
                                  { value: 'no', label: 'No, it does not run' },
                                ] as const
                              ).map((opt) => (
                                <button
                                  key={opt.value}
                                  type="button"
                                  role="radio"
                                  aria-checked={form.runsAndDrives === opt.value}
                                  onClick={() => setField('runsAndDrives', opt.value)}
                                  className={cn(
                                    'h-14 rounded-xl border text-sm font-semibold transition-colors',
                                    form.runsAndDrives === opt.value
                                      ? 'border-primary bg-primary/10 text-foreground'
                                      : 'border-border bg-background text-muted-foreground hover:border-foreground/30',
                                  )}
                                >
                                  {opt.label}
                                </button>
                              ))}
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <Label htmlFor="pickup-date" className="mb-1.5 block text-sm font-semibold">
                                Preferred pickup date
                              </Label>
                              <Input
                                id="pickup-date"
                                type="date"
                                value={form.pickupDate}
                                onChange={(e) => setField('pickupDate', e.target.value)}
                                className={inputClass}
                              />
                            </div>
                            <div>
                              <Label htmlFor="deliver-by-date" className="mb-1.5 block text-sm font-semibold">
                                Deliver by date
                              </Label>
                              <Input
                                id="deliver-by-date"
                                type="date"
                                min={form.pickupDate || undefined}
                                value={form.deliverByDate}
                                onChange={(e) => setField('deliverByDate', e.target.value)}
                                className={inputClass}
                              />
                            </div>
                          </div>
                        </motion.div>
                      )}

                      {step === 3 && (
                        <motion.div
                          key="step-3"
                          initial={reduce ? false : { opacity: 0, x: 24 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={reduce ? undefined : { opacity: 0, x: -24 }}
                          transition={{ duration: 0.25 }}
                          className="space-y-5"
                        >
                          <div className="rounded-2xl border border-border bg-background p-5">
                            <div className="flex items-center justify-between gap-3 mb-4">
                              <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                                Your shipment
                              </h3>
                              <button
                                type="button"
                                onClick={() => goToStep(1)}
                                className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                              >
                                <Pencil className="w-3.5 h-3.5" aria-hidden="true" /> Edit
                              </button>
                            </div>
                            <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-3">
                              {summaryRows
                                .filter((r) => r.label !== 'Notes')
                                .map((row) => (
                                  <div key={row.label}>
                                    <dt className="text-xs font-medium text-muted-foreground">
                                      {row.label}
                                    </dt>
                                    <dd className="text-sm font-semibold text-foreground break-words">
                                      {row.value}
                                    </dd>
                                  </div>
                                ))}
                            </dl>
                          </div>

                          <div>
                            <Label htmlFor="shipment-notes" className="mb-1.5 block text-sm font-semibold">
                              Notes or special handling
                            </Label>
                            <Textarea
                              id="shipment-notes"
                              value={form.notes}
                              onChange={(e) => setField('notes', e.target.value)}
                              placeholder="Gate access, tight lot, attached equipment, timing constraints, anything the driver should know."
                              rows={4}
                              className="rounded-xl text-base md:text-sm bg-background border-border focus-visible:ring-primary/40 resize-y"
                            />
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Step navigation — sticky thumb-reach bar on mobile */}
                    <div className="sticky bottom-3 z-10 mt-7">
                      <div className="flex flex-col-reverse sm:flex-row gap-3 rounded-[1.75rem] border border-border bg-card/95 backdrop-blur p-3 shadow-[0_16px_40px_-16px_rgba(18,18,18,0.3)] sm:rounded-none sm:border-0 sm:bg-transparent sm:p-0 sm:shadow-none sm:backdrop-blur-0">
                        {step > 1 && (
                          <Button
                            type="button"
                            variant="cta-outline"
                            size="lg"
                            className="rounded-full w-full sm:w-auto h-14"
                            onClick={() => goToStep((step - 1) as 1 | 2 | 3)}
                          >
                            <ArrowLeft className="w-4 h-4 mr-1.5" /> Back
                          </Button>
                        )}
                        {step < 3 ? (
                          <Button
                            type="button"
                            variant="cta"
                            size="cta"
                            className="rounded-full w-full sm:w-auto"
                            onClick={goNext}
                          >
                            Continue <ArrowRight className="w-4 h-4 ml-1" />
                          </Button>
                        ) : (
                          <Button
                            type="submit"
                            variant="cta"
                            size="cta"
                            className="rounded-full w-full sm:w-auto"
                          >
                            Request Transportation Pricing <ArrowRight className="w-4 h-4 ml-1" />
                          </Button>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed text-center sm:text-left mt-3 px-2">
                        No payment is collected here. Transportation pricing is prepared around your
                        actual shipment.*
                      </p>
                    </div>
                  </form>
                </>
              )}
            </motion.div>
          </div>
        </section>

        {/* 3. STANDALONE USE CASES */}
        <section className="py-16 md:py-24 border-y border-border bg-card/40">
          <div className="container max-w-6xl mx-auto px-4">
            <div className="grid lg:grid-cols-[1fr_1.2fr] gap-10 lg:gap-16 items-start">
              <motion.div {...(reduce ? {} : fadeUp)}>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground mb-3">
                  Standalone shipments
                </p>
                <h2 className="text-3xl md:text-4xl font-bold text-foreground tracking-tight mb-5 leading-[1.1]">
                  You don’t have to buy it on Vendibook.
                </h2>
                <p className="text-base md:text-lg text-muted-foreground leading-relaxed mb-8 max-w-md">
                  Bought from a dealer? Moving your own trailer? Shipping a build to a customer?
                  Vendibook Freight can help coordinate the move even when the equipment came from
                  somewhere else.*
                </p>
                <div className="rounded-[2rem] border border-border bg-background shadow-sm p-6 sm:p-8">
                  <img
                    src={deliveryMapArt.url}
                    alt="Illustrated transport route map connecting a pickup and delivery location"
                    className="w-full h-auto"
                    loading="lazy"
                  />
                </div>
              </motion.div>

              <div className="grid sm:grid-cols-2 gap-5">
                {STANDALONE_USES.map((u, i) => (
                  <motion.div
                    key={u.title}
                    {...(reduce ? {} : fadeUp)}
                    transition={{ duration: 0.45, delay: reduce ? 0 : i * 0.06 }}
                    className="rounded-[2rem] border border-border bg-card p-6 sm:p-7 shadow-sm"
                  >
                    <h3 className="text-lg font-semibold text-foreground mb-2">{u.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{u.body}</p>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* 4. WHY CATEGORY-SPECIFIC MATTERS */}
        <section className="py-16 md:py-24">
          <div className="container max-w-6xl mx-auto px-4">
            <motion.div {...(reduce ? {} : fadeUp)} className="text-center mb-12">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground mb-3">
                Category specific
              </p>
              <h2 className="text-3xl md:text-4xl font-bold text-foreground tracking-tight">
                Built around mobile food equipment.
              </h2>
              <p className="text-base md:text-lg text-muted-foreground mt-4 max-w-2xl mx-auto leading-relaxed">
                A food truck or food trailer is not a parcel. Transportation planning depends on the
                details of the unit and the route.*
              </p>
            </motion.div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {CATEGORY_CARDS.map((c, i) => (
                <motion.div
                  key={c.title}
                  {...(reduce ? {} : fadeUp)}
                  transition={{ duration: 0.45, delay: reduce ? 0 : i * 0.06 }}
                  className="rounded-[2rem] border border-border bg-card p-6 sm:p-7 shadow-sm"
                >
                  <span className="inline-flex w-11 h-11 rounded-2xl bg-primary/10 border border-primary/20 items-center justify-center mb-5">
                    <c.icon className="w-5 h-5 text-primary" />
                  </span>
                  <h3 className="text-base font-semibold text-foreground mb-2">{c.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{c.body}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* 5. THREE STEP PROCESS (charcoal contrast) */}
        <section
          className="py-16 md:py-24 text-white"
          style={{ background: 'linear-gradient(160deg, #17171a 0%, #0a0a0c 100%)' }}
        >
          <div className="container max-w-6xl mx-auto px-4">
            <motion.div {...(reduce ? {} : fadeUp)} className="text-center mb-12 md:mb-16">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/50 mb-3">
                How it works
              </p>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
                From pickup to delivery.
              </h2>
            </motion.div>

            <ol className="grid md:grid-cols-3 gap-5 md:gap-6">
              {STEPS.map((s, i) => (
                <motion.li
                  key={s.num}
                  {...(reduce ? {} : fadeUp)}
                  transition={{ duration: 0.45, delay: reduce ? 0 : i * 0.08 }}
                  className="rounded-[2rem] p-7 sm:p-8 backdrop-blur-sm"
                  style={{
                    background: 'rgba(255,255,255,0.045)',
                    border: '1px solid rgba(255,255,255,0.10)',
                  }}
                >
                  <p className="text-sm font-bold tracking-[0.2em] text-primary mb-5">{s.num}</p>
                  <h3 className="text-xl font-semibold mb-3">{s.title}</h3>
                  <p className="text-sm text-white/65 leading-relaxed">{s.body}</p>
                </motion.li>
              ))}
            </ol>

            <motion.div {...(reduce ? {} : fadeUp)} className="text-center mt-10">
              <Button variant="cta" size="cta" className="rounded-full" onClick={scrollToForm}>
                Get Transportation Pricing <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </motion.div>
          </div>
        </section>

        {/* 6. PRICING POSITIONING */}
        <section className="py-16 md:py-24">
          <div className="container max-w-5xl mx-auto px-4">
            <motion.div {...(reduce ? {} : fadeUp)} className="text-center mb-12">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground mb-3">
                Pricing
              </p>
              <h2 className="text-3xl md:text-4xl font-bold text-foreground tracking-tight">
                Pricing built around the actual shipment.
              </h2>
              <p className="text-base md:text-lg text-muted-foreground mt-4 max-w-2xl mx-auto leading-relaxed">
                Food truck hauling is not one flat number. Your pricing reflects what it takes to
                move your equipment on your route.*
              </p>
            </motion.div>

            <div className="grid lg:grid-cols-[1fr_360px] gap-5 md:gap-6 items-stretch">
              <motion.div
                {...(reduce ? {} : fadeUp)}
                className="rounded-[2rem] border border-border bg-card p-7 sm:p-10"
              >
                <h3 className="text-lg font-semibold text-foreground mb-5">
                  What shapes transportation charges*
                </h3>
                <ul className="grid sm:grid-cols-2 gap-x-6 gap-y-3.5">
                  {PRICING_FACTORS.map((f) => (
                    <li
                      key={f}
                      className="flex items-start gap-2.5 text-sm text-muted-foreground leading-relaxed"
                    >
                      <span
                        className="mt-1.5 w-1.5 h-1.5 rounded-full bg-primary shrink-0"
                        aria-hidden="true"
                      />
                      {f}
                    </li>
                  ))}
                </ul>
              </motion.div>

              <motion.div
                {...(reduce ? {} : fadeUp)}
                transition={{ duration: 0.45, delay: reduce ? 0 : 0.08 }}
                className="rounded-[2rem] border border-primary/25 bg-card p-7 sm:p-10 flex flex-col shadow-[0_20px_50px_-25px_rgba(255,106,26,0.25)]"
              >
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground mb-2">
                  Vendibook Freight
                </p>
                <p className="text-sm text-muted-foreground mb-1">Coordination Fee</p>
                <p className="text-5xl font-bold text-foreground tracking-tight mb-4">$150</p>
                <p className="text-sm text-muted-foreground leading-relaxed mb-8">
                  Covers coordination of your shipment. Variable transportation charges are
                  separate and confirmed around your actual move.*
                </p>
                <div className="mt-auto">
                  <Button
                    variant="cta"
                    size="lg"
                    className="rounded-full w-full"
                    onClick={scrollToForm}
                  >
                    Request Transportation Pricing <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* 7. MARKETPLACE CONNECTION */}
        <section className="pb-16 md:pb-24">
          <div className="container max-w-5xl mx-auto px-4">
            <motion.div
              {...(reduce ? {} : fadeUp)}
              className="rounded-[2rem] border border-border bg-card/60 p-7 sm:p-10 flex flex-col md:flex-row md:items-center gap-6 md:gap-10"
            >
              <span className="w-12 h-12 rounded-2xl bg-background border border-border flex items-center justify-center shrink-0 shadow-sm">
                <ClipboardCheck className="w-5 h-5 text-foreground/70" />
              </span>
              <div className="flex-1">
                <h2 className="text-xl md:text-2xl font-bold text-foreground tracking-tight mb-2">
                  Still looking for the truck?
                </h2>
                <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
                  Browse food trucks and food trailers for sale on Vendibook, then bring Freight
                  into the purchase when it is time to get it home.
                </p>
              </div>
              <Button variant="cta-outline" size="lg" className="rounded-full shrink-0" asChild>
                <Link to="/browse">
                  Browse trucks &amp; trailers <ArrowRight className="w-4 h-4 ml-1" />
                </Link>
              </Button>
            </motion.div>
          </div>
        </section>

        {/* 8. FINANCING CONNECTION */}
        <section className="pb-16 md:pb-24">
          <div className="container max-w-5xl mx-auto px-4">
            <motion.div
              {...(reduce ? {} : fadeUp)}
              className="rounded-[2rem] border border-border bg-card/60 p-7 sm:p-10 flex flex-col md:flex-row md:items-center gap-6 md:gap-10"
            >
              <span className="w-12 h-12 rounded-2xl bg-background border border-border flex items-center justify-center shrink-0 shadow-sm">
                <Landmark className="w-5 h-5 text-foreground/70" />
              </span>
              <div className="flex-1">
                <h2 className="text-xl md:text-2xl font-bold text-foreground tracking-tight mb-2">
                  Yes — Vendibook Freight can be financed too.
                </h2>
                <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
                  Freight transportation may be included in eligible financing arrangements,
                  depending on the financing provider and the transaction.* Mention it when you
                  apply for equipment financing.
                </p>
              </div>
              <Button variant="cta-outline" size="lg" className="rounded-full shrink-0" asChild>
                <Link to="/financing">
                  Explore financing <ArrowRight className="w-4 h-4 ml-1" />
                </Link>
              </Button>
            </motion.div>
          </div>
        </section>

        {/* 9. FAQ */}
        <section className="py-16 md:py-24 border-y border-border bg-card/40">
          <div className="container max-w-3xl mx-auto px-4">
            <motion.div {...(reduce ? {} : fadeUp)} className="text-center mb-10">
              <h2 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight">
                Food truck shipping questions, answered
              </h2>
            </motion.div>

            <motion.div {...(reduce ? {} : fadeUp)}>
              <Accordion type="single" collapsible className="space-y-3">
                {FAQS.map((f, i) => (
                  <AccordionItem
                    key={f.q}
                    value={`faq-${i}`}
                    className="rounded-2xl border border-border bg-card px-5 data-[state=open]:shadow-sm"
                  >
                    <AccordionTrigger className="text-left text-sm sm:text-base font-semibold text-foreground hover:no-underline py-4">
                      {f.q}
                    </AccordionTrigger>
                    <AccordionContent className="text-sm text-muted-foreground leading-relaxed">
                      {f.a}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </motion.div>
          </div>
        </section>

        {/* 10. FINAL CTA */}
        <section className="py-16 md:py-24">
          <div className="container max-w-4xl mx-auto px-4">
            <motion.div
              {...(reduce ? {} : fadeUp)}
              className="relative overflow-hidden rounded-[2.5rem] text-center px-6 py-14 sm:px-12 sm:py-20 text-white"
              style={{ background: 'linear-gradient(150deg, #1c1c1f 0%, #0b0b0d 100%)' }}
            >
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background:
                    'radial-gradient(60% 60% at 50% 0%, rgba(255,106,26,0.16) 0%, transparent 70%)',
                }}
                aria-hidden="true"
              />
              <div className="relative">
                <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-3">
                  Ready to move it?
                </h2>
                <p className="text-sm md:text-base text-white/65 leading-relaxed max-w-xl mx-auto mb-9">
                  Tell us where it is, where it’s going, and what you’re shipping.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Button variant="cta" size="cta" className="rounded-full" onClick={scrollToForm}>
                    Get Transportation Pricing <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                  <Link
                    to="/vendibook-freight"
                    className="inline-flex items-center justify-center rounded-full h-14 px-8 text-base font-semibold text-white transition-colors hover:bg-white/[0.08]"
                    style={{ border: '1px solid rgba(255,255,255,0.22)' }}
                  >
                    Explore Vendibook Freight
                  </Link>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* BOTTOM DISCLOSURE */}
        <section className="pb-12">
          <div className="container max-w-4xl mx-auto px-4">
            <p className="text-[11px] leading-relaxed text-muted-foreground/80 border-t border-border pt-6">
              *Vendibook Freight transportation may be coordinated through Vendibook and independent
              third party transportation and logistics providers. Availability, pricing, pickup
              timing, delivery timing, routes, equipment eligibility, and transportation
              requirements vary by shipment and provider. Estimates are provided for planning
              purposes and may change when final transportation details are confirmed. Financing,
              where referenced, is provided by third-party financing partners and is subject to
              application, prequalification, and underwriting; Vendibook is not a lender and does
              not guarantee approval, rates, terms, or funding.
            </p>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default ShipYourFoodTruck;
