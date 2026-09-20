import { describe, expect, it } from 'vitest';
import { validateSquarePlan } from '../../../supabase/functions/_shared/squarePlan';
const plan = { billing_interval: 'monthly', price_cents: 7900, currency: 'USD' };
const object = () => ({ type: 'SUBSCRIPTION_PLAN_VARIATION', subscription_plan_variation_data: { phases: [{ cadence: 'MONTHLY', pricing: { type: 'STATIC', price: { amount: 7900, currency: 'USD' } } }] } });
describe('Square catalog contract', () => {
  it('accepts Square pricing.price and rejects incorrect price_money shape', () => {
    expect(() => validateSquarePlan(object(), plan)).not.toThrow();
    const wrong: any = object();
    wrong.subscription_plan_variation_data.phases[0].pricing = { type: 'STATIC', price_money: { amount: 7900, currency: 'USD' } };
    expect(() => validateSquarePlan(wrong, plan)).toThrow();
  });
  it('rejects changed price, cadence, disabled plans, and finite phases', () => {
    expect(() => validateSquarePlan(object(), { ...plan, price_cents: 799 })).toThrow();
    expect(() => validateSquarePlan(object(), { ...plan, billing_interval: 'annual' })).toThrow();
    expect(() => validateSquarePlan({ ...object(), present_at_all_locations: false }, plan)).toThrow();
    const finite: any = object(); finite.subscription_plan_variation_data.phases[0].periods = 1;
    expect(() => validateSquarePlan(finite, plan)).toThrow();
  });
});
