import { CONDITION_OPTIONS } from './stages';

/**
 * Seller-declared condition values that describe a pre-owned unit.
 * Source of truth is the listing wizard's CONDITION_OPTIONS: every option
 * except 'new' describes a used unit. Listings with no condition (NULL) are
 * NOT treated as used — condition unknown must never be presented as used.
 */
export const USED_CONDITION_VALUES: string[] = CONDITION_OPTIONS
  .map((o) => o.value as string)
  .filter((v) => v !== 'new');

export const isUsedCondition = (condition: string | null | undefined): boolean =>
  !!condition && USED_CONDITION_VALUES.includes(condition);
