import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { z } from 'zod';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import SEO from '@/components/SEO';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import {
  FileCheck, Loader2, Home, Shield, Clock, ArrowRight, DollarSign, AlertCircle,
} from 'lucide-react';
import ToolCrossLinks from '@/components/tools/ToolCrossLinks';
import ResultsDashboard, { type DashboardResult } from '@/components/tools/permit-path/ResultsDashboard';
import ResultsSkeleton from '@/components/tools/permit-path/ResultsSkeleton';
import ResultsError from '@/components/tools/permit-path/ResultsError';

const pageJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'Vendi PermitPath — Food Truck Permit & License Finder',
  applicationCategory: 'BusinessApplication',
  operatingSystem: 'Web',
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
  description: 'Find every license, permit, and inspection required for your mobile food business. Mapped to your city and setup.',
};

const US_STATES = [
  { value: 'AL', label: 'Alabama' }, { value: 'AK', label: 'Alaska' }, { value: 'AZ', label: 'Arizona' },
  { value: 'AR', label: 'Arkansas' }, { value: 'CA', label: 'California' }, { value: 'CO', label: 'Colorado' },
  { value: 'CT', label: 'Connecticut' }, { value: 'DE', label: 'Delaware' }, { value: 'FL', label: 'Florida' },
  { value: 'GA', label: 'Georgia' }, { value: 'HI', label: 'Hawaii' }, { value: 'ID', label: 'Idaho' },
  { value: 'IL', label: 'Illinois' }, { value: 'IN', label: 'Indiana' }, { value: 'IA', label: 'Iowa' },
  { value: 'KS', label: 'Kansas' }, { value: 'KY', label: 'Kentucky' }, { value: 'LA', label: 'Louisiana' },
  { value: 'ME', label: 'Maine' }, { value: 'MD', label: 'Maryland' }, { value: 'MA', label: 'Massachusetts' },
  { value: 'MI', label: 'Michigan' }, { value: 'MN', label: 'Minnesota' }, { value: 'MS', label: 'Mississippi' },
  { value: 'MO', label: 'Missouri' }, { value: 'MT', label: 'Montana' }, { value: 'NE', label: 'Nebraska' },
  { value: 'NV', label: 'Nevada' }, { value: 'NH', label: 'New Hampshire' }, { value: 'NJ', label: 'New Jersey' },
  { value: 'NM', label: 'New Mexico' }, { value: 'NY', label: 'New York' }, { value: 'NC', label: 'North Carolina' },
  { value: 'ND', label: 'North Dakota' }, { value: 'OH', label: 'Ohio' }, { value: 'OK', label: 'Oklahoma' },
  { value: 'OR', label: 'Oregon' }, { value: 'PA', label: 'Pennsylvania' }, { value: 'RI', label: 'Rhode Island' },
  { value: 'SC', label: 'South Carolina' }, { value: 'SD', label: 'South Dakota' }, { value: 'TN', label: 'Tennessee' },
  { value: 'TX', label: 'Texas' }, { value: 'UT', label: 'Utah' }, { value: 'VT', label: 'Vermont' },
  { value: 'VA', label: 'Virginia' }, { value: 'WA', label: 'Washington' }, { value: 'WV', label: 'West Virginia' },
  { value: 'WI', label: 'Wisconsin' }, { value: 'WY', label: 'Wyoming' }, { value: 'DC', label: 'Washington D.C.' },
];

// Adapter — handles both the new schema and any in-flight legacy responses.
function adaptResult(raw: any): DashboardResult | null {
  if (!raw) return null;
  if (Array.isArray(raw.categories) && raw.categories.length) return raw as DashboardResult;
  // Legacy adapter: group `licenses` into categories
  if (Array.isArray(raw.licenses)) {
    const buckets: Record<string, any[]> = {};
    for (const l of raw.licenses) {
      const cat =
        l.category === 'health' ? 'Health Permits' :
        l.category === 'fire' ? 'Fire & Equipment' :
        l.category === 'tax' ? 'Business Registration' :
        l.category === 'city' || l.category === 'county' ? 'Local & City-Specific' :
        l.category === 'state' ? 'Mobile Vendor License' :
        l.category === 'federal' ? 'Business Registration' :
        'Other';
      (buckets[cat] ||= []).push({
        title: l.name,
        issuer: l.issuingAuthority,
        level: l.category === 'federal' || l.category === 'state' || l.category === 'county' || l.category === 'city'
          ? l.category
          : 'state',
        cost_estimate: l.estimatedCost,
        timeline_estimate: l.processingTime,
        official_url: l.officialUrl || '',
        why_it_matters: l.description,
        commonly_missed: l.priority === 'required',
      });
    }
    const categories = Object.entries(buckets).map(([name, items]) => ({ name, items }));
    return {
      location: { city: raw.location?.city, state: raw.location?.state, stateAbbreviation: raw.location?.stateAbbreviation },
      businessType: raw.businessType,
      overview: raw.overview,
      recent_law_alert: null,
      estimated_total_cost: { display: raw.estimatedTotalCost },
      estimated_setup_weeks: { display: raw.estimatedTimeline },
      categories,
      sources: raw.sources,
      verify_note: 'Requirements vary by jurisdiction and change often. Confirm each item with the issuing agency before applying.',
    };
  }
  return null;
}

const STATE_CODES = US_STATES.map((s) => s.value) as [string, ...string[]];
const BUSINESS_TYPES = ['food_truck', 'food_trailer', 'food_cart', 'ghost_kitchen', 'catering', 'cottage_food'] as const;
const BUSINESS_TYPE_LABELS: Record<typeof BUSINESS_TYPES[number], string> = {
  food_truck: 'Food Truck',
  food_trailer: 'Food Trailer',
  food_cart: 'Food Cart / Pushcart',
  ghost_kitchen: 'Shared / Ghost Kitchen',
  catering: 'Catering Business',
  cottage_food: 'Cottage Food',
};

const lookupSchema = z.object({
  state: z.enum(STATE_CODES, { errorMap: () => ({ message: 'Pick a U.S. state to continue.' }) }),
  city: z
    .string()
    .trim()
    .max(80, { message: 'City name is too long (max 80 characters).' })
    .regex(/^[A-Za-zÀ-ÿ0-9 .'\-]*$/, { message: 'City can only contain letters, numbers, spaces, apostrophes, periods, and hyphens.' })
    .optional()
    .or(z.literal('')),
  businessType: z.enum(BUSINESS_TYPES, { errorMap: () => ({ message: 'Choose a supported business type.' }) }),
});

type FieldErrors = Partial<Record<'state' | 'city' | 'businessType', string>>;

const PermitPath = () => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [form, setForm] = useState({ city: '', state: '', businessType: 'food_truck' });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [result, setResult] = useState<DashboardResult | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const updateField = <K extends keyof typeof form>(key: K, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key as keyof FieldErrors]) {
      setErrors((prev) => ({ ...prev, [key]: undefined }));
    }
  };

  const loadingLocationLabel = () => {
    const stateLabel = US_STATES.find((s) => s.value === form.state)?.label || form.state || 'your area';
    return form.city.trim() ? `${form.city.trim()}, ${stateLabel}` : stateLabel;
  };

  const runLookup = async () => {
    const parsed = lookupSchema.safeParse({
      state: form.state,
      city: form.city.trim(),
      businessType: form.businessType,
    });
    if (!parsed.success) {
      const fieldErrors: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof FieldErrors;
        if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
      }
      setErrors(fieldErrors);
      toast({
        title: 'Check your details',
        description: fieldErrors.state || fieldErrors.city || fieldErrors.businessType || 'Please review the highlighted fields.',
        variant: 'destructive',
      });
      return;
    }

    setErrors({});
    setFetchError(null);
    setIsLoading(true);
    setResult(null);
    setTimeout(() => document.getElementById('results-section')?.scrollIntoView({ behavior: 'smooth' }), 50);
    try {
      const { data: response, error } = await supabase.functions.invoke('ai-license-finder', {
        body: { state: parsed.data.state, city: parsed.data.city || '', businessType: parsed.data.businessType },
      });
      if (error) throw error;
      if (response?.error) {
        setFetchError(response.error);
        return;
      }
      const adapted = adaptResult(response?.result);
      if (!adapted) {
        setFetchError('We could not parse a checklist. Please try again.');
        return;
      }
      setResult(adapted);
      if ((response?.result as any)?.fallback) {
        toast({
          title: 'Showing baseline checklist',
          description: 'Live research was thin — we rendered the standard checklist for this business type. Verify each item locally.',
        });
      }
    } catch (e: any) {
      setFetchError(e?.message || 'Something went wrong reaching our compliance engine.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = runLookup;

  return (
    <>
      <SEO
        title="Food Truck Permits & Licenses Lookup by City (2026) — Free Tool"
        description="Free 2026 food truck permit & license finder. Get every health permit, business license, fire inspection, and commissary rule for your city — organized as an interactive checklist."
        canonical="/tools/permitpath"
      />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(pageJsonLd) }} />

      <div className="min-h-screen flex flex-col bg-[#08080a] text-white">
        <Header />

        <main className="flex-1">
          {/* Hero */}
          <section className="relative py-16 md:py-24 overflow-hidden">
            {/* Orange radial glow */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0"
              style={{
                background:
                  'radial-gradient(60% 50% at 30% 30%, rgba(255,81,36,0.18) 0%, rgba(255,81,36,0) 60%)',
              }}
            />
            <div className="container relative z-10">
              <Breadcrumb className="mb-6">
                <BreadcrumbList>
                  <BreadcrumbItem>
                    <BreadcrumbLink asChild>
                      <Link to="/" className="flex items-center gap-1 text-white/60 hover:text-white">
                        <Home className="h-4 w-4" /> Home
                      </Link>
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <BreadcrumbLink asChild>
                      <Link to="/tools" className="text-white/60 hover:text-white">Host Tools</Link>
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <BreadcrumbPage className="text-white">PermitPath</BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>

              <div className="max-w-3xl">
                <div className="inline-flex items-center gap-2 mb-5 px-3 py-1.5 rounded-full border border-white/10 bg-white/5 backdrop-blur">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#FF5124] shadow-[0_0_8px_rgba(255,81,36,0.8)]" />
                  <span className="text-xs font-medium tracking-wider uppercase text-white/80">PermitPath</span>
                </div>
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-5 leading-[1.05] tracking-tight">
                  Navigate permits in minutes,<br className="hidden sm:block" />
                  <span className="text-[#FF5124]">not weeks.</span>
                </h1>
                <p className="text-lg md:text-xl text-white/70 mb-8 max-w-2xl">
                  Permits, licenses, and compliance — mapped to your city and setup. Built from official sources so you know exactly what you need before you start.
                </p>
                <Button
                  size="lg"
                  onClick={() => document.getElementById('tool-section')?.scrollIntoView({ behavior: 'smooth' })}
                  className="bg-[#FF5124] hover:bg-[#FF5124]/90 text-white font-semibold px-6 h-12 rounded-xl shadow-[0_8px_30px_-8px_rgba(255,81,36,0.6)]"
                >
                  Find My Permits <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </div>
          </section>

          {/* Benefit cards — unified dark */}
          <section className="py-12 md:py-16">
            <div className="container">
              <div className="grid gap-4 md:grid-cols-3">
                {[
                  { icon: Shield, tint: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20', title: 'Avoid compliance mistakes', body: 'A complete checklist so you don\'t miss critical permits that could shut you down.' },
                  { icon: Clock, tint: 'text-sky-400', bg: 'bg-sky-500/10 border-sky-500/20', title: 'Save weeks of research', body: 'Skip the endless Googling. Every requirement in one organized, interactive view.' },
                  { icon: DollarSign, tint: 'text-[#FF5124]', bg: 'bg-[#FF5124]/10 border-[#FF5124]/20', title: 'Know your costs upfront', body: 'Estimated costs and timelines so you can budget your launch with confidence.' },
                ].map((b, i) => (
                  <motion.div
                    key={b.title}
                    initial={{ opacity: 0, y: 16 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.08 }}
                    className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 hover:border-white/20 hover:bg-white/[0.04] transition-all"
                  >
                    <div className={`w-11 h-11 rounded-xl border ${b.bg} flex items-center justify-center mb-4`}>
                      <b.icon className={`h-5 w-5 ${b.tint}`} />
                    </div>
                    <h3 className="font-semibold text-white text-lg mb-2">{b.title}</h3>
                    <p className="text-white/60 text-sm leading-relaxed">{b.body}</p>
                  </motion.div>
                ))}
              </div>
            </div>
          </section>

          {/* How it works */}
          <section className="py-12 md:py-16">
            <div className="container max-w-4xl">
              <h2 className="text-3xl md:text-4xl font-bold text-center text-white mb-12">
                How PermitPath works
              </h2>
              <div className="relative grid gap-8 md:grid-cols-3">
                {/* Connector line desktop */}
                <div aria-hidden className="hidden md:block absolute top-7 left-[16.66%] right-[16.66%] h-px bg-gradient-to-r from-transparent via-[#FF5124]/40 to-transparent" />
                {[
                  { n: 1, title: 'Enter your location', body: 'Tell us your state, city, and business type.' },
                  { n: 2, title: 'We map your requirements', body: 'Get a complete checklist of permits, licenses, and inspections.' },
                  { n: 3, title: 'Track & apply', body: 'Check items off, download as PDF, and apply on official sites.' },
                ].map((s, i) => (
                  <motion.div
                    key={s.n}
                    initial={{ opacity: 0, y: 16 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1 }}
                    className="relative text-center"
                  >
                    <div className="w-14 h-14 rounded-full bg-[#FF5124] flex items-center justify-center mx-auto mb-4 shadow-[0_8px_24px_-8px_rgba(255,81,36,0.7)] ring-4 ring-[#08080a] relative z-10">
                      <span className="text-xl font-bold text-white">{s.n}</span>
                    </div>
                    <h3 className="font-semibold text-white mb-1.5">{s.title}</h3>
                    <p className="text-sm text-white/55">{s.body}</p>
                  </motion.div>
                ))}
              </div>
            </div>
          </section>

          {/* Tool */}
          <section id="tool-section" className="py-12 md:py-16">
            <div className="container max-w-3xl">
              <div className="rounded-2xl border border-white/10 bg-[#0d0d10] p-6 md:p-8 shadow-2xl">
                <div className="flex items-center gap-3 mb-6">
                  <div className="h-10 w-10 rounded-xl bg-[#FF5124]/15 border border-[#FF5124]/30 flex items-center justify-center">
                    <FileCheck className="h-5 w-5 text-[#FF5124]" />
                  </div>
                  <div>
                    <h2 className="font-semibold text-white text-lg">Build your checklist</h2>
                    <p className="text-sm text-white/55">State and business type required. City makes it more accurate.</p>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="space-y-1.5">
                    <Label className="text-white/80 text-sm">State *</Label>
                    <Select value={form.state} onValueChange={(v) => updateField('state', v)}>
                      <SelectTrigger
                        aria-invalid={!!errors.state}
                        className={cn(
                          'bg-white/[0.03] border-white/10 text-white h-11 text-base',
                          errors.state && 'border-red-500/60 focus:ring-red-500/40',
                        )}
                      >
                        <SelectValue placeholder="Select state" />
                      </SelectTrigger>
                      <SelectContent>
                        {US_STATES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    {errors.state && (
                      <p className="flex items-center gap-1 text-xs text-red-400"><AlertCircle className="h-3 w-3" /> {errors.state}</p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-white/80 text-sm">City (optional)</Label>
                    <Input
                      placeholder="e.g., Austin"
                      value={form.city}
                      onChange={(e) => updateField('city', e.target.value)}
                      maxLength={80}
                      aria-invalid={!!errors.city}
                      className={cn(
                        'bg-white/[0.03] border-white/10 text-white placeholder:text-white/30 h-11 text-base',
                        errors.city && 'border-red-500/60 focus-visible:ring-red-500/40',
                      )}
                    />
                    {errors.city && (
                      <p className="flex items-center gap-1 text-xs text-red-400"><AlertCircle className="h-3 w-3" /> {errors.city}</p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-white/80 text-sm">Business type</Label>
                    <Select value={form.businessType} onValueChange={(v) => updateField('businessType', v)}>
                      <SelectTrigger
                        aria-invalid={!!errors.businessType}
                        className={cn(
                          'bg-white/[0.03] border-white/10 text-white h-11 text-base',
                          errors.businessType && 'border-red-500/60 focus:ring-red-500/40',
                        )}
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {BUSINESS_TYPES.map((bt) => (
                          <SelectItem key={bt} value={bt}>{BUSINESS_TYPE_LABELS[bt]}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.businessType && (
                      <p className="flex items-center gap-1 text-xs text-red-400"><AlertCircle className="h-3 w-3" /> {errors.businessType}</p>
                    )}
                  </div>
                </div>

                <Button
                  onClick={handleSubmit}
                  disabled={isLoading || !form.state}
                  className="w-full mt-6 h-12 bg-[#FF5124] hover:bg-[#FF5124]/90 disabled:bg-white/10 disabled:text-white/40 text-white font-semibold text-base rounded-xl shadow-[0_8px_30px_-8px_rgba(255,81,36,0.6)] transition-all"
                >
                  {isLoading ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Building your checklist…</>
                  ) : (
                    <>Find my permits <ArrowRight className="h-4 w-4 ml-2" /></>
                  )}
                </Button>

                <p className="text-xs text-white/40 mt-4 text-center">
                  Requirements are researched from official sources. Always confirm with your local agency before applying.
                </p>
              </div>

              {/* Results */}
              <div id="results-section">
                {isLoading && <ResultsSkeleton location={loadingLocationLabel()} />}
                {!isLoading && fetchError && (
                  <ResultsError message={fetchError} onRetry={runLookup} />
                )}
                {!isLoading && !fetchError && result && <ResultsDashboard result={result} />}
              </div>
            </div>
          </section>

          <ToolCrossLinks currentTool="permitpath" />
        </main>

        <Footer />
      </div>
    </>
  );
};

export default PermitPath;
