import { useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowRight, Calculator } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { calculateFinancing, financingInventoryUrl, type FinancingInputs } from '@/lib/financing/calculator';
import { trackBuyerSeoFinancing } from '@/lib/buyerSeoTracking';

const initial = { price: '45000', downPayment: '9000', annualRate: '10', months: '60', orderValue: '18', operatingDays: '22' };
const money = (value: number) => value.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });
const fields = [
  { key: 'price', label: 'Equipment purchase price ($)', min: 0.01, max: 25000000, step: '0.01' },
  { key: 'downPayment', label: 'Down payment ($)', min: 0, step: '0.01' },
  { key: 'annualRate', label: 'Illustrative annual interest rate (%)', min: 0, max: 100, step: '0.01' },
  { key: 'months', label: 'Financing term (months)', min: 1, max: 360, step: '1' },
  { key: 'orderValue', label: 'Average order value ($)', min: 0.01, step: '0.01' },
  { key: 'operatingDays', label: 'Operating days per month', min: 1, max: 31, step: '1' },
] as const;

/** A listing link (?price=) pre-fills the price with the illustrative 10% down. */
function initialValues(search: string) {
  const price = Number(new URLSearchParams(search).get('price'));
  if (!Number.isFinite(price) || price <= 0 || price > 25_000_000) return initial;
  return { ...initial, price: String(Math.round(price)), downPayment: String(Math.round(price * 0.1)) };
}

export function FinancingCalculator() {
  const { search } = useLocation();
  const [values, setValues] = useState(() => initialValues(search));
  const [calculated, setCalculated] = useState(false);
  const started = useRef(false);
  const input = Object.fromEntries(Object.entries(values).map(([key, value]) => [key, value.trim() === '' ? NaN : Number(value)])) as unknown as FinancingInputs;
  const result = calculateFinancing(input);
  const start = () => {
    if (!started.current) { started.current = true; trackBuyerSeoFinancing('calculator_started'); }
  };
  const complete = () => {
    if (result && !calculated) {
      trackBuyerSeoFinancing('calculator_completed', { equipment_price: input.price, down_payment: input.downPayment, annual_rate: input.annualRate, term_months: input.months });
      setCalculated(true);
    }
  };
  return (
    <section id="calculator" aria-labelledby="calculator-heading" data-cta-location="calculator" className="scroll-mt-24 border-b border-border bg-card/40 py-12 md:py-16">
      <div className="container max-w-6xl mx-auto px-4">
        <div className="max-w-2xl mb-8">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700"><Calculator className="h-4 w-4" aria-hidden /> Plan your next move</p>
          <h2 id="calculator-heading" className="mt-3 text-2xl md:text-3xl font-bold tracking-tight">Food truck financing calculator</h2>
          <p className="mt-3 text-muted-foreground leading-relaxed">Start with an equipment budget. Explore how your down payment, rate, and term affect a monthly payment for a food truck or trailer.</p>
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <form className="rounded-3xl border border-border bg-background p-5 sm:p-8" onSubmit={event => { event.preventDefault(); start(); complete(); }}>
            <div className="grid gap-5 sm:grid-cols-2">
              {fields.map(field => (
                <div key={field.key}>
                  <label htmlFor={`finance-${field.key}`} className="block text-sm font-medium mb-2">{field.label}</label>
                  <Input id={`finance-${field.key}`} type="number" inputMode={field.step === '1' ? 'numeric' : 'decimal'} required min={field.min} max={field.key === 'downPayment' ? (Number.isFinite(input.price) ? input.price : undefined) : 'max' in field ? field.max : undefined} step={field.step} value={values[field.key]} aria-describedby="calculator-assumptions" onChange={event => { start(); setCalculated(false); setValues(previous => ({ ...previous, [field.key]: event.target.value })); }} className="h-12 rounded-xl bg-card text-base" />
                </div>
              ))}
            </div>
            <p id="calculator-assumptions" className="mt-5 text-xs leading-relaxed text-muted-foreground">The default 10% rate is an editable illustration, not an average rate, offer, or quote. This model assumes a fixed rate and equal monthly payments; leases or other financing products may work differently.</p>
            <Button type="submit" variant="cta" className="mt-6 rounded-full" disabled={!result}>Calculate payment <ArrowRight className="ml-2 h-4 w-4" aria-hidden /></Button>
          </form>
          <div className="rounded-3xl border border-border bg-card p-5 sm:p-8 shadow-[0_18px_50px_-30px_rgba(0,0,0,0.2)]" aria-live="polite" aria-atomic="true">
            {result ? <>
              <p className="text-sm text-muted-foreground">Estimated monthly equipment payment</p>
              <p className="mt-2 text-4xl sm:text-5xl font-bold tracking-tight tabular-nums">{money(result.monthlyPayment)}<span className="ml-1 text-base font-normal text-muted-foreground">/mo</span></p>
              <p className="mt-2 text-xs text-muted-foreground">{calculated ? 'Estimate calculated with your inputs.' : 'Illustrative estimate · updates as you edit'}</p>
              <dl className="mt-6 space-y-3 text-sm">
                {[
                  ['Amount financed', result.principal], ['Total financing payments', result.totalPayments],
                  ['Financing cost (interest only)', result.financingCost], ['Total including down payment', result.totalWithDownPayment],
                ].map(([label, value]) => <div key={label} className="flex justify-between gap-4"><dt className="text-muted-foreground">{label}</dt><dd className="font-semibold tabular-nums text-right">{money(value as number)}</dd></div>)}
              </dl>
              <div className="mt-6 rounded-2xl bg-emerald-700/5 border border-emerald-700/15 p-4">
                <h3 className="font-semibold">What would it take to cover this payment?</h3>
                <p className="mt-3 text-2xl font-bold tabular-nums">{result.ordersPerMonth.toLocaleString()} <span className="text-sm font-normal">orders/month</span><span className="mx-2 text-border">·</span>{result.ordersPerDay.toFixed(1)} <span className="text-sm font-normal">per operating day</span></p>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">At {money(input.orderValue)} per order and {input.operatingDays} operating days. This compares gross sales with the equipment payment only. It excludes ingredients, labor, permits, fuel, insurance, taxes, and every other operating cost. It is not a break-even or profit forecast.</p>
              </div>
              <Button asChild variant="cta" className="mt-6 w-full rounded-full h-auto min-h-11 whitespace-normal text-center py-3">
                <Link data-cta-id="calculator_browse_inventory" to={financingInventoryUrl(input.price, undefined, search)} onClick={() => { start(); complete(); trackBuyerSeoFinancing('calculator_browse_clicked', { equipment_price: input.price }); }}>Browse equipment within your budget <ArrowRight className="ml-2 h-4 w-4 shrink-0" aria-hidden /></Link>
              </Button>
              <div className="mt-3 flex flex-wrap justify-center gap-x-5 gap-y-2 text-sm">
                <Link to={financingInventoryUrl(input.price, 'food_truck', search)} onClick={() => trackBuyerSeoFinancing('calculator_browse_clicked', { equipment_price: input.price, asset_category: 'food_truck' })} className="underline underline-offset-4">Trucks within budget</Link>
                <Link to={financingInventoryUrl(input.price, 'food_trailer', search)} onClick={() => trackBuyerSeoFinancing('calculator_browse_clicked', { equipment_price: input.price, asset_category: 'food_trailer' })} className="underline underline-offset-4">Trailers within budget</Link>
              </div>
              <p className="mt-3 text-xs text-center text-muted-foreground">Asking prices up to {money(input.price)}. Availability and financing eligibility vary.</p>
            </> : <p role="status" className="text-sm leading-relaxed">Enter a positive equipment price and order value, a down payment no greater than the price, a rate from 0–100%, a whole-number term from 1–360 months, and 1–31 operating days to see your estimate.</p>}
          </div>
        </div>
        <p className="mt-5 max-w-4xl text-xs leading-relaxed text-muted-foreground">Planning estimates only. Actual financing terms, fees, eligibility, operating costs, revenue, and profitability vary. Taxes, fees, insurance, and transportation are not included. Review the provider’s complete repayment schedule before committing. Vendibook is not a lender.</p>
      </div>
    </section>
  );
}
