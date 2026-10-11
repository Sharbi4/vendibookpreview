/**
 * Menu-to-equipment knowledge base for Build Studio guidance. Suggestions are
 * educational only; they never replace manufacturer or health-department rules.
 * Equipment "kinds" are matched against whatever the regional catalog offers.
 */
import type { EquipmentSpec } from './catalog';

export type Kind = 'griddle' | 'fryer' | 'oven' | 'range' | 'smoker' | 'refrigeration' | 'freezer' | 'prep' | 'sink' | 'handsink'
  | 'hood' | 'espresso' | 'icecream' | 'generator';

export const KINDS: Record<Kind, { label: string; does: string; match: RegExp }> = {
  griddle: { label: 'Flat-top griddle', does: 'A large heated steel surface for searing and cooking many items at once.', match: /griddle|flat[- ]?top|plancha/i },
  fryer: { label: 'Fryer', does: 'Deep-fries in hot oil; needs a hood and fire suppression.', match: /fryer/i },
  oven: { label: 'Oven', does: 'Bakes, roasts and finishes food; pizza ovens reach very high heat.', match: /oven/i },
  range: { label: 'Range / burners', does: 'Open burners for pots and pans: sauces, beans, rice, eggs.', match: /range|burner|stove/i },
  smoker: { label: 'Smoker', does: 'Low-and-slow cooking with wood smoke, usually mounted outside.', match: /smoker/i },
  refrigeration: { label: 'Refrigeration', does: 'Keeps ingredients cold and safe during service.', match: /refrig|reach-?in|cooler|prep ?table.*cold|sandwich/i },
  freezer: { label: 'Freezer', does: 'Holds frozen product such as fries, patties or ice cream.', match: /freez/i },
  prep: { label: 'Prep table', does: 'Stainless work surface for assembling orders.', match: /prep/i },
  sink: { label: '3-compartment sink', does: 'Wash, rinse and sanitize utensils; required by most health departments.', match: /3-?comp|three.?comp/i },
  handsink: { label: 'Hand sink', does: 'A separate hand-washing sink; required by most health departments.', match: /hand ?sink/i },
  hood: { label: 'Exhaust hood', does: 'Removes heat, grease and smoke above cooking equipment.', match: /hood|ventilat/i },
  espresso: { label: 'Espresso machine', does: 'Brews espresso drinks; needs water and dedicated power.', match: /espresso|coffee/i },
  icecream: { label: 'Soft-serve machine', does: 'Freezes and dispenses soft-serve; high power draw.', match: /soft.?serve|ice ?cream/i },
  generator: { label: 'Generator', does: 'Powers equipment where shore power is not available.', match: /generator/i },
};

export interface BusinessCategory { id: string; name: string; blurb: string; kinds: Kind[] }

export const BUSINESS_CATEGORIES: BusinessCategory[] = [
  { id: 'burgers', name: 'Burgers and sandwiches', blurb: 'Smash burgers, cheesesteaks, melts', kinds: ['griddle', 'fryer', 'refrigeration', 'prep', 'hood'] },
  { id: 'tacos', name: 'Tacos and Mexican food', blurb: 'Street tacos, burritos, quesadillas', kinds: ['griddle', 'range', 'refrigeration', 'prep', 'hood'] },
  { id: 'pizza', name: 'Pizza', blurb: 'Wood-fired, deck or conveyor pies', kinds: ['oven', 'refrigeration', 'prep', 'hood'] },
  { id: 'bbq', name: 'BBQ and smoked meats', blurb: 'Brisket, ribs, pulled pork', kinds: ['smoker', 'refrigeration', 'prep'] },
  { id: 'coffee', name: 'Coffee and beverages', blurb: 'Espresso, cold brew, smoothies', kinds: ['espresso', 'refrigeration', 'prep'] },
  { id: 'dessert', name: 'Ice cream and desserts', blurb: 'Soft serve, shaved ice, sweets', kinds: ['icecream', 'freezer', 'prep'] },
  { id: 'breakfast', name: 'Breakfast and brunch', blurb: 'Eggs, pancakes, breakfast burritos', kinds: ['griddle', 'range', 'refrigeration', 'prep', 'hood'] },
  { id: 'bakery', name: 'Bakery', blurb: 'Pastries, bread, cookies', kinds: ['oven', 'refrigeration', 'prep'] },
  { id: 'other', name: 'Other / my own concept', blurb: 'Tell us what you have in mind', kinds: ['refrigeration', 'prep'] },
];

/** Menu words that point to a piece of equipment. */
const MENU_WORDS: [RegExp, Kind][] = [
  [/burger|cheesesteak|smash|pancake|egg|quesadilla|philly|hash/i, 'griddle'],
  [/fries|wing|chicken tender|fried|churro|donut|tempura|fish/i, 'fryer'],
  [/pizza|bake|bread|cookie|pastr|croissant|calzone/i, 'oven'],
  [/brisket|rib|pulled pork|smoked|bbq|barbecue/i, 'smoker'],
  [/coffee|latte|espresso|cappuccino|mocha/i, 'espresso'],
  [/soft serve|ice cream|froyo|frozen yogurt/i, 'icecream'],
  [/milkshake|shake|smoothie|gelato|popsicle/i, 'freezer'],
  [/rice|bean|soup|stew|sauce|pasta|ramen|noodle/i, 'range'],
];

export const ALWAYS_SUGGESTED: Kind[] = ['handsink', 'sink'];

export interface Recommendation {
  kind: Kind; label: string; does: string; supports: string[]; reason: 'category' | 'menu' | 'health';
  /** Matching items in the regional catalog; empty = not offered. */
  available: EquipmentSpec[];
}

export function recommend(categoryIds: string[], menuItems: string[], catalog: EquipmentSpec[]): Recommendation[] {
  const map = new Map<Kind, { supports: Set<string>; reason: Recommendation['reason'] }>();
  const put = (k: Kind, reason: Recommendation['reason'], support?: string) => {
    const cur = map.get(k) ?? { supports: new Set<string>(), reason };
    if (support) cur.supports.add(support);
    if (reason === 'menu' && cur.reason !== 'menu') cur.reason = cur.reason === 'health' ? 'health' : 'menu';
    map.set(k, cur);
  };
  for (const id of categoryIds) {
    const c = BUSINESS_CATEGORIES.find((x) => x.id === id);
    c?.kinds.forEach((k) => put(k, 'category', c.name.split(' and ')[0]));
  }
  for (const item of menuItems) for (const [re, k] of MENU_WORDS) if (re.test(item)) put(k, 'menu', item);
  if (map.size) ALWAYS_SUGGESTED.forEach((k) => put(k, 'health'));
  return [...map.entries()].map(([kind, v]) => ({
    kind, label: KINDS[kind].label, does: KINDS[kind].does, supports: [...v.supports], reason: v.reason,
    available: catalog.filter((e) => KINDS[kind].match.test(e.name)),
  }));
}

/** Educational "Great for" list for a catalog item, from the same knowledge base. */
export function greatFor(e: EquipmentSpec): string[] {
  const k = (Object.keys(KINDS) as Kind[]).find((x) => KINDS[x].match.test(e.name));
  if (!k) return [];
  const words: Record<Kind, string[]> = {
    griddle: ['Burgers', 'Breakfast sandwiches', 'Eggs', 'Cheesesteaks', 'Quesadillas'],
    fryer: ['Fries', 'Wings', 'Chicken tenders', 'Churros'], oven: ['Pizza', 'Baked goods', 'Roasting'],
    range: ['Sauces', 'Rice and beans', 'Soups'], smoker: ['Brisket', 'Ribs', 'Pulled pork'],
    refrigeration: ['Cold ingredients', 'Drinks', 'Prepped toppings'], freezer: ['Frozen fries', 'Ice cream', 'Patties'],
    prep: ['Assembling orders', 'Cutting and portioning'], sink: ['Washing utensils', 'Health inspections'],
    handsink: ['Hand washing', 'Health inspections'], hood: ['Any grease or smoke-producing cooking'],
    espresso: ['Lattes', 'Cappuccinos', 'Americanos'], icecream: ['Soft serve', 'Sundaes', 'Cones'], generator: ['Off-grid events'],
  };
  return words[k];
}

/** Left-panel groups (brief section 7); items fall into a group by category. */
export const PANEL_GROUPS: { id: string; label: string; categories: string[] }[] = [
  { id: 'cooking', label: 'Cooking', categories: ['Cooking'] },
  { id: 'refrigeration', label: 'Refrigeration', categories: ['Refrigeration'] },
  { id: 'plumbing', label: 'Plumbing', categories: ['Sanitation'] },
  { id: 'prep', label: 'Prep & layout', categories: ['Prep', 'Serving window', 'Ventilation'] },
  { id: 'power', label: 'Electrical & power', categories: ['Electrical', 'Generator', 'Solar & battery'] },
  { id: 'other', label: 'Other', categories: ['Interior finish', 'Other'] },
];
