export const FEATURED_CADENCE = 'THIRTY_DAYS';
export const FEATURED_DISCLOSURE_VERSION = 'featured-30-day-2026-11-07';
export function squarePlanCadence(plan: any, productSlug?: string) {
  if (productSlug === 'featured_listing_monthly' && plan.billing_interval === 'monthly') return FEATURED_CADENCE;
  return { monthly: 'MONTHLY', quarterly: 'QUARTERLY', annual: 'ANNUAL' }[plan.billing_interval as string];
}
export function validateSquarePlan(object: any, plan: any, productSlug?: string) {
  const phases = object?.subscription_plan_variation_data?.phases;
  const cadence = squarePlanCadence(plan, productSlug);
  if (object?.type !== 'SUBSCRIPTION_PLAN_VARIATION' || object.is_deleted || object.present_at_all_locations === false ||
      !cadence || phases?.length !== 1 || phases[0].periods != null || phases[0].cadence !== cadence ||
      phases[0].pricing?.type !== 'STATIC' || Number(phases[0].pricing?.price?.amount) !== plan.price_cents ||
      phases[0].pricing?.price?.currency !== plan.currency) {
    throw new Error('Square plan pricing does not match the catalog. Please contact support.');
  }
}
