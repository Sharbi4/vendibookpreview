import { matchCookingEquipment } from './atlasEquipment';
export interface AtlasMenuItem { name: string; description: string; equipment: string[] }
export interface AtlasMenuConcept { listingId: string; listingTitle: string; photo: string | null; items: AtlasMenuItem[]; note: string }
const ideas = [
  { name: 'Griddled street tacos', description: 'A focused taco menu with shared fillings, tortillas and fresh toppings.', equipment: ['griddle', 'flat top', 'plancha', 'grill'] },
  { name: 'Smash burgers', description: 'A compact burger menu built around one patty and a few topping combinations.', equipment: ['griddle', 'flat top', 'plancha'] },
  { name: 'Grilled vegetable wraps', description: 'A vegetable-forward option using the same cooking line.', equipment: ['griddle', 'flat top', 'plancha', 'grill'] },
  { name: 'Loaded fries', description: 'One fry base with a small set of toppings; plan batch capacity and holding.', equipment: ['fryer', 'deep fryer'] },
  { name: 'Churros', description: 'A fried dessert concept; confirm fryer suitability and allergen separation.', equipment: ['fryer', 'deep fryer'] },
  { name: 'Personal pizzas', description: 'A short pizza menu; confirm the oven style, fuel, capacity and dough process.', equipment: ['pizza oven', 'deck oven', 'wood fired oven'] },
  { name: 'Espresso drinks', description: 'Espresso, americano and latte concepts; milk service also needs suitable cold storage.', equipment: ['espresso machine'] },
  { name: 'Brewed coffee', description: 'A small brewed-coffee menu; size the brewer and water supply for demand.', equipment: ['coffee brewer'] },
  { name: 'Smoked barbecue plates', description: 'A focused smoked-protein menu; plan approved prep, cooling and holding.', equipment: ['smoker'] },
];
export function menuIdeasForListing(listing: Record<string, unknown>): AtlasMenuItem[] {
  return ideas.flatMap(idea => {
    const evidence = matchCookingEquipment(listing, { name: idea.name, cooking: idea.equipment, optional: [], question: '' });
    return evidence.cooking.length ? [{ name: idea.name, description: idea.description, equipment: evidence.cooking }] : [];
  }).slice(0, 5);
}
