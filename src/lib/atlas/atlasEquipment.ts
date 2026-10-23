type EquipmentListing = { title?: unknown; description?: unknown; amenities?: unknown; highlights?: unknown; included_items?: unknown };
export interface CookingIntent { name: string; cooking: string[]; optional: string[]; question: string }
const INTENTS: {pattern:RegExp; intent:CookingIntent}[] = [
  {pattern:/\b(taco|tacos|taqueria|quesadilla|burrito)s?\b/i,intent:{name:'tacos',cooking:['griddle','flat top','flat-top','plancha','grill','charbroiler'],optional:['fryer'],question:'Will you griddle or grill the fillings, or also fry tacos or churros?'}},
  {pattern:/\b(fry|fries|fried|fryer|churro|churros|wings|funnel cake)\b/i,intent:{name:'fried food',cooking:['fryer','deep fryer'],optional:['griddle'],question:'Which foods will you fry, and what batch capacity do you need?'}},
  {pattern:/\b(burger|burgers|smashburger|smashburgers|cheesesteak)\b/i,intent:{name:'burgers',cooking:['griddle','flat top','flat-top','grill','charbroiler'],optional:['fryer'],question:'Will you cook on a flat top or grill, and serve fried sides?'}},
  {pattern:/\b(pizza|pizzeria)\b/i,intent:{name:'pizza',cooking:['pizza oven','wood fired oven','wood-fired oven','deck oven'],optional:['dough mixer'],question:'What pizza style and oven fuel do you plan to use?'}},
  {pattern:/\b(coffee|espresso|latte|lattes)\b/i,intent:{name:'coffee',cooking:['espresso machine','coffee brewer','coffee machine'],optional:['grinder','refrigerator'],question:'Are you serving brewed coffee, espresso drinks, or both?'}},
  {pattern:/\b(barbecue|barbeque|bbq|smoked meat)\b/i,intent:{name:'barbecue',cooking:['smoker','grill','charbroiler'],optional:['hot holding'],question:'Will you smoke on the unit or finish and serve food prepared at an approved base?'}},
];
export function cookingIntent(raw: unknown): CookingIntent | null {
  const text=String(raw ?? '');
  return INTENTS.find(i=>i.pattern.test(text))?.intent ?? null;
}

/** Explicit equipment evidence, with local negation checks. Never infer it from a cuisine label. */
export function matchCookingEquipment(listing: EquipmentListing, intent: CookingIntent) {
  const values=[listing.amenities,listing.highlights,listing.included_items,listing.description]
    .flatMap(value=>Array.isArray(value)?value:[value]).filter(v=>typeof v==='string') as string[];
  const text=values.join('. ').toLowerCase().replace(/[_-]/g,' ');
  const supported=(term:string)=>{
    const normalized=term.replace(/-/g,' ');
    const escaped=normalized.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
    const regex=new RegExp(`\\b${escaped}s?\\b`,'g');
    return [...text.matchAll(regex)].some(match=>{
      const before=text.slice(Math.max(0,match.index!-48),match.index);
      const after=text.slice(match.index!+match[0].length,match.index!+match[0].length+30);
      return !/(?:\bno|\bwithout|\bmissing|\bneeds?|\bnot equipped with|\bnot included|\bspace for|\broom for|\bready for)[^.\n,;]*$/.test(before)
        && !/^\s*(?:not included|not installed|removed|missing|sold separately|not working|does not work)/.test(after);
    });
  };
  const cooking=[...new Set(intent.cooking.filter(supported))];
  const optional=intent.optional.filter(supported);
  return {cooking,optional,status:cooking.length?'potential_equipment_match':'equipment_unconfirmed'};
}

export const STATE_NAMES: Record<string,string> = {AZ:'Arizona',TX:'Texas',CA:'California',FL:'Florida',GA:'Georgia',AL:'Alabama',AK:'Alaska',AR:'Arkansas',CO:'Colorado',CT:'Connecticut',DE:'Delaware',DC:'District of Columbia',HI:'Hawaii',ID:'Idaho',IL:'Illinois',IN:'Indiana',IA:'Iowa',KS:'Kansas',KY:'Kentucky',LA:'Louisiana',ME:'Maine',MD:'Maryland',MA:'Massachusetts',MI:'Michigan',MN:'Minnesota',MS:'Mississippi',MO:'Missouri',MT:'Montana',NE:'Nebraska',NV:'Nevada',NH:'New Hampshire',NJ:'New Jersey',NM:'New Mexico',NY:'New York',NC:'North Carolina',ND:'North Dakota',OH:'Ohio',OK:'Oklahoma',OR:'Oregon',PA:'Pennsylvania',RI:'Rhode Island',SC:'South Carolina',SD:'South Dakota',TN:'Tennessee',UT:'Utah',VT:'Vermont',VA:'Virginia',WA:'Washington',WV:'West Virginia',WI:'Wisconsin',WY:'Wyoming'};
export function normalizeAtlasState(value:unknown): string {
  const raw=String(value??'').trim();
  if(STATE_NAMES[raw.toUpperCase()]) return raw.toUpperCase();
  return Object.entries(STATE_NAMES).find(([,name])=>name.toLowerCase()===raw.toLowerCase())?.[0]??'';
}
