import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import JsonLd from '@/components/JsonLd';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import SEO from '@/components/SEO';
import { usePageTracking } from '@/hooks/usePageTracking';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList,
  BreadcrumbPage, BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Truck, Calculator, DollarSign, MapPin, ArrowRight, CheckCircle2,
  TrendingUp, FileCheck, ChefHat, Shield,
} from 'lucide-react';

interface CostRow { name: string; low: number; typical: number; high: number; note?: string; }

const ONE_TIME: CostRow[] = [
  { name: 'Truck or trailer (used → new)', low: 25000, typical: 75000, high: 175000, note: 'Used trailers start ~$15k; new custom builds clear $200k.' },
  { name: 'Kitchen equipment build-out', low: 5000, typical: 15000, high: 40000, note: 'Grills, fryers, hood, refrigeration, prep tables.' },
  { name: 'POS + payment hardware', low: 400, typical: 1200, high: 3000 },
  { name: 'Initial inventory + smallwares', low: 1500, typical: 4000, high: 9000 },
  { name: 'Branding, wrap & signage', low: 1500, typical: 4500, high: 12000 },
  { name: 'Permits & business setup', low: 800, typical: 2500, high: 8000, note: 'Highly city-dependent. NYC and SF skew high.' },
  { name: 'Website + photography', low: 0, typical: 600, high: 2500 },
];

const MONTHLY: CostRow[] = [
  { name: 'Commissary kitchen rental', low: 400, typical: 900, high: 2200 },
  { name: 'Insurance (general + auto)', low: 150, typical: 280, high: 500 },
  { name: 'Fuel + propane', low: 300, typical: 700, high: 1400 },
  { name: 'Maintenance reserve', low: 150, typical: 350, high: 800 },
  { name: 'Marketing + booking fees', low: 100, typical: 400, high: 1200 },
  { name: 'Labor (1 part-time helper)', low: 800, typical: 2400, high: 5500 },
  { name: 'Food cost (COGS @ 28–34%)', low: 2500, typical: 5500, high: 12000 },
  { name: 'Payment processing', low: 150, typical: 400, high: 1100 },
];

const fmt = (n: number) => `$${n.toLocaleString()}`;

const CITY_MULT: Record<string, { label: string; mult: number; note: string }> = {
  tier1: { label: 'Tier 1 — NYC, SF, LA, Boston, Seattle, DC', mult: 1.35, note: 'Permits, commissary, insurance all run highest.' },
  tier2: { label: 'Tier 2 — Chicago, Miami, Denver, Austin, Portland, Atlanta', mult: 1.15, note: 'Competitive but more reasonable than tier 1.' },
  tier3: { label: 'Tier 3 — Houston, Phoenix, Tampa, Nashville, Dallas, San Antonio', mult: 1.0, note: 'Baseline numbers. Most metros land here.' },
  tier4: { label: 'Tier 4 — Smaller metros & secondary markets', mult: 0.85, note: 'Lower permits, cheaper commissary, less competition.' },
};

const FAQS = [
  { q: 'What does it cost to start a food truck in 2026?', a: 'For most U.S. cities, expect $50,000–$120,000 to launch a turnkey used or lightly-used food truck, including equipment, permits, branding, and initial inventory. New custom builds push that to $150,000–$250,000+. NYC, SF, and LA add another 25–35% on top of baseline numbers.' },
  { q: 'How much does it cost to start a food truck in NYC?', a: 'NYC is the most expensive U.S. market for food trucks. Expect $80,000–$160,000 all-in for a used setup, driven by the Mobile Food Vending License waitlist/auction, commissary rates of $1,500–$2,500/month, and higher insurance. New custom builds run $200,000+.' },
  { q: 'Are food trucks profitable in 2026?', a: 'Yes — a well-run food truck nets $25,000–$90,000+ in year one and $60,000–$200,000+ once established. Margins typically run 6–9% net at scale, with food cost at 28–34% and labor at 25–30%. Break-even usually lands in months 8–14.' },
  { q: 'How much should I budget for permits and licenses?', a: 'Budget $800 in low-cost cities, $2,500 typical, and up to $8,000+ in high-regulation markets like NYC, SF, and Boston. This includes the business license, mobile vending permit, health department inspection, commissary letter, fire suppression certification, and food handler cards.' },
  { q: 'Can I start a food truck with $20,000?', a: 'Yes, but only with a used trailer (not a truck), DIY branding, and an existing commissary kitchen relationship. Most $20k launches buy a $12k–$15k used trailer, leaving ~$5k for permits, insurance, and 30 days of operating cash. Tight but possible in tier 3–4 cities.' },
  { q: 'What ongoing monthly costs should I plan for?', a: 'Plan for $4,500–$10,000/month in fixed and variable costs once active: commissary rent, insurance, fuel, maintenance reserve, marketing, labor, food cost, and payment fees. Use the calculator above for a more accurate number.' },
  { q: 'How long until a food truck breaks even?', a: 'Most operators break even on monthly cash flow in months 2–4 and recover their full startup investment in months 10–18. Catering-heavy operations break even fastest because of higher ticket averages and lower customer acquisition cost.' },
  { q: 'Is it cheaper to buy used or new?', a: 'Used is almost always 40–60% cheaper, and the used market in 2026 is unusually strong because of post-2020 oversupply. A 2–4 year-old truck with documented service history is the highest-ROI starting point for most first-time operators.' },
  { q: 'What financing options exist for food trucks?', a: 'SBA 7(a) loans (cheapest, slowest), equipment financing (most common — collateralized by the truck), equipment leases, seller financing on used trucks, and business lines of credit for working capital. Most first-time owners use equipment financing at 8–18% APR over 5–7 years.' },
  { q: 'Do I need a commissary kitchen?', a: 'Yes, in essentially every U.S. city. Health codes require a licensed commercial kitchen for prep, water fill, and waste disposal. Shared commissaries run $400–$2,200/month depending on city and hours. Vendibook lists verified commissaries with verified availability.' },
];

export default function FoodTruckStartupCosts2026() {
  usePageTracking('Food Truck Startup Costs 2026 — Pillar');

  const [tier, setTier] = useState<keyof typeof CITY_MULT>('tier3');
  const [condition, setCondition] = useState<'low' | 'typical' | 'high'>('typical');
  const [commissaryHours, setCommissaryHours] = useState<number>(40);

  const mult = CITY_MULT[tier].mult;

  const oneTimeTotal = useMemo(
    () => Math.round(ONE_TIME.reduce((s, r) => s + r[condition], 0) * mult),
    [condition, mult],
  );

  const monthlyTotal = useMemo(() => {
    const base = MONTHLY.reduce((s, r) => s + r[condition], 0) * mult;
    // adjust commissary by hours/40
    const commissaryBase = MONTHLY[0][condition] * mult;
    const adjustedCommissary = commissaryBase * (commissaryHours / 40);
    return Math.round(base - commissaryBase + adjustedCommissary);
  }, [condition, mult, commissaryHours]);

  const breakEvenMonths = useMemo(() => {
    // assume avg monthly profit = monthlyTotal * 0.08 / 0.08 (ie monthly net ~ monthly cost * 0.6 at typical)
    const assumedMonthlyNet = monthlyTotal * 0.6;
    return assumedMonthlyNet > 0 ? Math.ceil(oneTimeTotal / assumedMonthlyNet) : 0;
  }, [oneTimeTotal, monthlyTotal]);

  const articleJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: 'Food Truck Startup Costs in 2026: Full Breakdown + Calculator',
    description:
      'Complete 2026 food truck startup cost guide — equipment, permits, commissary, insurance, branding, and a free interactive cost calculator with city tiers including NYC.',
    datePublished: '2026-05-18',
    dateModified: new Date().toISOString().split('T')[0],
    author: { '@type': 'Organization', name: 'Vendibook' },
    publisher: {
      '@type': 'Organization',
      name: 'Vendibook',
      logo: { '@type': 'ImageObject', url: 'https://vendibook.com/images/vendibook-logo.png' },
    },
    mainEntityOfPage: 'https://vendibook.com/tools/food-truck-startup-costs-2026',
  };

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQS.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  };

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://vendibook.com/' },
      { '@type': 'ListItem', position: 2, name: 'Tools', item: 'https://vendibook.com/tools' },
      { '@type': 'ListItem', position: 3, name: 'Food Truck Startup Costs 2026', item: 'https://vendibook.com/tools/food-truck-startup-costs-2026' },
    ],
  };

  return (
    <>
      <SEO
        title="Food Truck Startup Costs in 2026: Full Breakdown + Calculator"
        description="Real 2026 food truck startup costs — used vs new, NYC vs Houston, permits, commissary, insurance. Free interactive calculator and break-even projection."
        canonical="/tools/food-truck-startup-costs-2026"
        type="article"
      />
      <JsonLd schema={[articleJsonLd, faqJsonLd, breadcrumbJsonLd]} />

      <div className="min-h-screen flex flex-col bg-background">
        <Header />

        <main className="flex-1">
          {/* Hero */}
          <section className="relative py-12 md:py-20 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-foreground/[0.03] via-transparent to-foreground/[0.02]" />
            <div className="container relative z-10 max-w-5xl">
              <Breadcrumb className="mb-6">
                <BreadcrumbList>
                  <BreadcrumbItem><BreadcrumbLink asChild><Link to="/">Home</Link></BreadcrumbLink></BreadcrumbItem>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem><BreadcrumbLink asChild><Link to="/tools">Tools</Link></BreadcrumbLink></BreadcrumbItem>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem><BreadcrumbPage>Food Truck Startup Costs 2026</BreadcrumbPage></BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>

              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
                <Badge variant="secondary" className="mb-4"><TrendingUp className="w-3 h-3 mr-1" /> Updated for 2026</Badge>
                <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
                  Food Truck Startup Costs in 2026:<br />
                  <span className="text-primary">Full Breakdown + Calculator</span>
                </h1>
                <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mb-8">
                  Real 2026 numbers for launching a food truck or trailer — equipment, permits, commissary, insurance, branding, and a free interactive calculator that adjusts for your city.
                </p>
                <div className="flex flex-wrap gap-3">
                  <Button asChild size="lg"><a href="#calculator"><Calculator className="w-4 h-4 mr-2" /> Run the calculator</a></Button>
                  <Button asChild size="lg" variant="outline"><Link to="/search?type=for-sale">Browse trucks for sale <ArrowRight className="w-4 h-4 ml-2" /></Link></Button>
                </div>
              </motion.div>
            </div>
          </section>

          {/* TL;DR */}
          <section className="py-8 border-y bg-muted/30">
            <div className="container max-w-5xl">
              <div className="grid md:grid-cols-3 gap-6">
                <div><div className="text-3xl font-bold text-primary">$50k–$120k</div><div className="text-sm text-muted-foreground mt-1">Typical all-in launch (most U.S. cities)</div></div>
                <div><div className="text-3xl font-bold text-primary">$80k–$160k</div><div className="text-sm text-muted-foreground mt-1">NYC / SF / LA (tier 1 metros)</div></div>
                <div><div className="text-3xl font-bold text-primary">8–14 mo</div><div className="text-sm text-muted-foreground mt-1">Typical break-even window</div></div>
              </div>
            </div>
          </section>

          {/* Calculator */}
          <section id="calculator" className="py-12 md:py-16">
            <div className="container max-w-5xl">
              <h2 className="text-3xl md:text-4xl font-bold mb-2">Free 2026 startup cost calculator</h2>
              <p className="text-muted-foreground mb-8">Adjust for your city tier, build condition, and commissary hours to get a live total + break-even estimate.</p>

              <Card className="mb-8">
                <CardContent className="pt-6 grid md:grid-cols-3 gap-6">
                  <div>
                    <Label className="mb-2 block">City tier</Label>
                    <Select value={tier} onValueChange={(v: keyof typeof CITY_MULT) => setTier(v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(CITY_MULT).map(([k, v]) => (<SelectItem key={k} value={k}>{v.label}</SelectItem>))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground mt-2">{CITY_MULT[tier].note}</p>
                  </div>
                  <div>
                    <Label className="mb-2 block">Build condition</Label>
                    <Select value={condition} onValueChange={(v: 'low' | 'typical' | 'high') => setCondition(v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Used / lean</SelectItem>
                        <SelectItem value="typical">Typical turnkey</SelectItem>
                        <SelectItem value="high">New / custom build</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground mt-2">Drives equipment, branding, and inventory totals.</p>
                  </div>
                  <div>
                    <Label className="mb-2 block">Commissary hours / month</Label>
                    <Input type="number" min={0} max={200} value={commissaryHours} onChange={(e) => setCommissaryHours(Number(e.target.value) || 0)} />
                    <p className="text-xs text-muted-foreground mt-2">40 hrs is standard. Catering ops use 60–100.</p>
                  </div>
                </CardContent>
              </Card>

              <div className="grid md:grid-cols-3 gap-4 mb-8">
                <Card><CardContent className="pt-6"><div className="text-sm text-muted-foreground">One-time launch cost</div><div className="text-3xl font-bold text-primary mt-1">{fmt(oneTimeTotal)}</div></CardContent></Card>
                <Card><CardContent className="pt-6"><div className="text-sm text-muted-foreground">Monthly operating cost</div><div className="text-3xl font-bold text-primary mt-1">{fmt(monthlyTotal)}</div></CardContent></Card>
                <Card><CardContent className="pt-6"><div className="text-sm text-muted-foreground">Break-even estimate</div><div className="text-3xl font-bold text-primary mt-1">{breakEvenMonths} mo</div></CardContent></Card>
              </div>

              <div className="flex flex-wrap gap-3">
                <Button asChild><Link to="/search?type=for-sale"><Truck className="w-4 h-4 mr-2" /> Browse trucks at this budget</Link></Button>
                <Button asChild variant="outline"><Link to="/search?type=commissary"><ChefHat className="w-4 h-4 mr-2" /> Find a commissary</Link></Button>
                <Button asChild variant="outline"><Link to="/tools/permitpath"><FileCheck className="w-4 h-4 mr-2" /> Permit lookup</Link></Button>
              </div>
            </div>
          </section>

          {/* Cost tables */}
          <section className="py-12 bg-muted/20 border-y">
            <div className="container max-w-5xl">
              <h2 className="text-3xl font-bold mb-2">One-time launch costs (2026)</h2>
              <p className="text-muted-foreground mb-6">Baseline ranges before city multiplier.</p>
              <Card className="overflow-hidden mb-12">
                <table className="w-full text-sm">
                  <thead className="bg-muted"><tr className="text-left"><th className="p-3">Category</th><th className="p-3">Low</th><th className="p-3">Typical</th><th className="p-3">High</th></tr></thead>
                  <tbody>
                    {ONE_TIME.map((r) => (
                      <tr key={r.name} className="border-t"><td className="p-3"><div className="font-medium">{r.name}</div>{r.note && <div className="text-xs text-muted-foreground mt-0.5">{r.note}</div>}</td><td className="p-3">{fmt(r.low)}</td><td className="p-3">{fmt(r.typical)}</td><td className="p-3">{fmt(r.high)}</td></tr>
                    ))}
                  </tbody>
                </table>
              </Card>

              <h2 className="text-3xl font-bold mb-2">Monthly operating costs</h2>
              <p className="text-muted-foreground mb-6">Recurring costs once you're operating.</p>
              <Card className="overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted"><tr className="text-left"><th className="p-3">Category</th><th className="p-3">Low</th><th className="p-3">Typical</th><th className="p-3">High</th></tr></thead>
                  <tbody>
                    {MONTHLY.map((r) => (
                      <tr key={r.name} className="border-t"><td className="p-3"><div className="font-medium">{r.name}</div>{r.note && <div className="text-xs text-muted-foreground mt-0.5">{r.note}</div>}</td><td className="p-3">{fmt(r.low)}</td><td className="p-3">{fmt(r.typical)}</td><td className="p-3">{fmt(r.high)}</td></tr>
                    ))}
                  </tbody>
                </table>
              </Card>
            </div>
          </section>

          {/* NYC section — high-intent striking distance */}
          <section className="py-12 md:py-16">
            <div className="container max-w-5xl">
              <div className="flex items-center gap-3 mb-4"><MapPin className="w-6 h-6 text-primary" /><h2 className="text-3xl font-bold">Cost to start a food truck in NYC (2026)</h2></div>
              <p className="text-muted-foreground mb-6">New York City is the most expensive U.S. market for food trucks in 2026. Here's what's different:</p>
              <div className="grid md:grid-cols-2 gap-4 mb-6">
                <Card><CardContent className="pt-6"><div className="font-semibold mb-2">Mobile Food Vending License</div><p className="text-sm text-muted-foreground">NYC caps citywide licenses. New permits are released gradually under Local Law 18 — expect a waitlist or a $20,000+ secondary-market price.</p></CardContent></Card>
                <Card><CardContent className="pt-6"><div className="font-semibold mb-2">Commissary kitchen</div><p className="text-sm text-muted-foreground">$1,500–$2,500/month for shared NYC commissaries vs. $600–$1,200 in tier 3 cities.</p></CardContent></Card>
                <Card><CardContent className="pt-6"><div className="font-semibold mb-2">Insurance</div><p className="text-sm text-muted-foreground">Mandatory $1M general liability + auto adds ~$450–$650/month in NYC.</p></CardContent></Card>
                <Card><CardContent className="pt-6"><div className="font-semibold mb-2">Parking + storage</div><p className="text-sm text-muted-foreground">Garage storage runs $400–$900/month. Few residential streets allow overnight commercial parking.</p></CardContent></Card>
              </div>
              <Card className="bg-primary/5 border-primary/20">
                <CardContent className="pt-6 flex items-center justify-between flex-wrap gap-4">
                  <div><div className="font-semibold text-lg">NYC all-in launch budget</div><div className="text-sm text-muted-foreground">Used turnkey, with permits, commissary, insurance, branding.</div></div>
                  <div className="text-3xl font-bold text-primary">$80k – $160k</div>
                </CardContent>
              </Card>
            </div>
          </section>

          {/* Profitability */}
          <section className="py-12 bg-muted/20 border-y">
            <div className="container max-w-5xl">
              <h2 className="text-3xl font-bold mb-2">Are food trucks profitable in 2026?</h2>
              <p className="text-muted-foreground mb-6">Yes — but margins are tighter than people think. Realistic 2026 numbers:</p>
              <div className="grid md:grid-cols-3 gap-4">
                <Card><CardContent className="pt-6"><div className="text-sm text-muted-foreground">Food cost (COGS)</div><div className="text-2xl font-bold mt-1">28–34%</div></CardContent></Card>
                <Card><CardContent className="pt-6"><div className="text-sm text-muted-foreground">Labor</div><div className="text-2xl font-bold mt-1">25–30%</div></CardContent></Card>
                <Card><CardContent className="pt-6"><div className="text-sm text-muted-foreground">Net margin (mature)</div><div className="text-2xl font-bold mt-1">6–9%</div></CardContent></Card>
              </div>
              <p className="text-muted-foreground mt-6">Year-one net for a competent operator typically lands at <strong>$25k–$90k</strong>. Year three at <strong>$60k–$200k+</strong>. Catering and event-driven ops outperform daily-route trucks because of higher ticket averages and lower customer acquisition costs.</p>
            </div>
          </section>

          {/* FAQ */}
          <section className="py-12 md:py-16">
            <div className="container max-w-3xl">
              <h2 className="text-3xl font-bold mb-6">Food truck startup cost FAQ (2026)</h2>
              <Accordion type="single" collapsible className="w-full">
                {FAQS.map((f, i) => (
                  <AccordionItem key={i} value={`item-${i}`}>
                    <AccordionTrigger className="text-left">{f.q}</AccordionTrigger>
                    <AccordionContent>{f.a}</AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          </section>

          {/* Conversion rail */}
          <section className="py-12 bg-primary/5 border-y">
            <div className="container max-w-5xl">
              <h2 className="text-3xl font-bold mb-2">Next steps</h2>
              <p className="text-muted-foreground mb-6">Vendibook is the marketplace built for this exact moment.</p>
              <div className="grid md:grid-cols-3 gap-4">
                <Card className="hover:shadow-md transition"><CardHeader><Truck className="w-6 h-6 text-primary mb-2" /><CardTitle className="text-lg">Browse trucks for sale</CardTitle></CardHeader><CardContent><Button asChild variant="outline" className="w-full"><Link to="/search?type=for-sale">View listings <ArrowRight className="w-4 h-4 ml-2" /></Link></Button></CardContent></Card>
                <Card className="hover:shadow-md transition"><CardHeader><ChefHat className="w-6 h-6 text-primary mb-2" /><CardTitle className="text-lg">Find a commissary</CardTitle></CardHeader><CardContent><Button asChild variant="outline" className="w-full"><Link to="/search?type=commissary">Find kitchens <ArrowRight className="w-4 h-4 ml-2" /></Link></Button></CardContent></Card>
                <Card className="hover:shadow-md transition"><CardHeader><FileCheck className="w-6 h-6 text-primary mb-2" /><CardTitle className="text-lg">Permit lookup by city</CardTitle></CardHeader><CardContent><Button asChild variant="outline" className="w-full"><Link to="/tools/permitpath">Open PermitPath <ArrowRight className="w-4 h-4 ml-2" /></Link></Button></CardContent></Card>
                <Card className="hover:shadow-md transition"><CardHeader><DollarSign className="w-6 h-6 text-primary mb-2" /><CardTitle className="text-lg">Food truck financing 2026</CardTitle></CardHeader><CardContent><Button asChild variant="outline" className="w-full"><Link to="/blog/food-truck-financing-options">Loans & rates <ArrowRight className="w-4 h-4 ml-2" /></Link></Button></CardContent></Card>
                <Card className="hover:shadow-md transition"><CardHeader><CheckCircle2 className="w-6 h-6 text-primary mb-2" /><CardTitle className="text-lg">Full launch checklist</CardTitle></CardHeader><CardContent><Button asChild variant="outline" className="w-full"><Link to="/tools/startup-guide">Open guide <ArrowRight className="w-4 h-4 ml-2" /></Link></Button></CardContent></Card>
                <Card className="hover:shadow-md transition"><CardHeader><Shield className="w-6 h-6 text-primary mb-2" /><CardTitle className="text-lg">Sell your existing truck</CardTitle></CardHeader><CardContent><Button asChild variant="outline" className="w-full"><Link to="/sell-my-food-truck">List for sale <ArrowRight className="w-4 h-4 ml-2" /></Link></Button></CardContent></Card>
              </div>
            </div>
          </section>
        </main>

        <Footer />
      </div>
    </>
  );
}
