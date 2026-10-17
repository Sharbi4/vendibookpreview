import { leadListingFilter, type MatchableListing } from './leadMatches.ts';
import { parseLocationInput } from './locationSearch.ts';
export interface MuseLead {
 id: string; revision: number; intent: 'buy'|'rent'|'sell'; category?: string|null; city?: string|null; budget_max?: number|null; start_date?: string|null; end_date?: string|null;
}
export interface MuseListing extends MatchableListing { rental_min_days?: number|null; available_from?: string|null; available_to?: string|null }
export interface MuseMatch { listing: MuseListing; score: number; reasons: string[]; warnings: string[]; availability: 'available'|'unknown' }
export function matchMuseLead(lead: MuseLead, rows: MuseListing[], availability: Record<string, boolean|undefined> = {}, limit = 5): MuseMatch[] {
 const filter = leadListingFilter(lead); if (!filter) return [];
 const loc = parseLocationInput(lead.city); const norm = (s?: string|null) => (s??'').trim().toLowerCase();
 return rows.flatMap(listing => {
  if (listing.mode !== filter.mode || (filter.categories && !filter.categories.includes(listing.category))) return [];
  const reasons = ['Transaction matches']; const warnings: string[] = []; let score=25;
  if (lead.category) { score+=25; reasons.push('Category matches'); } else warnings.push('Category missing');
  const sameCity=!!loc.city && norm(loc.city)===norm(listing.city); const sameState=!!loc.state && loc.state===listing.state?.toUpperCase();
  if (sameCity || sameState) {score+=sameCity?25:15; reasons.push(sameCity?'Same city':'Same state');}
  else if (loc.city || loc.state) { if (listing.mode!=='sale' || !listing.vendibook_freight_enabled) return []; score+=5; reasons.push('Freight enabled; destination quote required'); }
  else warnings.push('Location missing; distance not assessed');
  const price = Number(listing.mode==='sale'?listing.price_sale:listing.price_daily);
  if (lead.budget_max && price>0) { if(price>lead.budget_max) return []; score+=15; reasons.push('Within equipment / daily rental budget'); }
  else warnings.push(!lead.budget_max?'Budget missing':'Listing price missing');
  if(listing.mode==='rent') {
   warnings.push('Daily base rate only; total, fees and delivery require checkout');
   if(!lead.start_date || !lead.end_date) warnings.push('Rental dates missing; availability unverified');
   else {
    const days=(Date.parse(lead.end_date)-Date.parse(lead.start_date))/86400000+1;
    if(!Number.isFinite(days) || days<1 || days>367 || days<(listing.rental_min_days??1) || (listing.available_from && lead.start_date<listing.available_from) || (listing.available_to && lead.end_date>listing.available_to) || availability[listing.id]===false) return [];
    if(availability[listing.id]===true) {score+=10; reasons.push('Requested dates currently available; not reserved');} else warnings.push('Availability check unavailable; approval blocked');
   }
  } else score+=10;
  return [{listing, score, reasons, warnings, availability: availability[listing.id]===true?'available' as const:'unknown' as const}];
 }).sort((a,b)=>b.score-a.score).slice(0,limit);
}
export function templateDraft(lead: MuseLead, matches: MuseMatch[]) {
 if(lead.intent==='sell') return 'Hello! We are Vendibook’s marketplace team. Would you like to share details about equipment you voluntarily offered for sale or rental? We can review whether it fits our marketplace. No listing, sale or outcome is guaranteed.';
 return `Hello! We are Vendibook’s marketplace team. Based on your request, these current listings may be worth reviewing. Availability, delivery and final totals require confirmation.\n\n${matches.map(m=>`${m.listing.title}\nhttps://vendibook.com/listing/${m.listing.id}`).join('\n\n')}`;
}
// The model selects approved phrases only: it cannot invent claims, numbers or links.
export const MUSE_PHRASES = ['Hello! We are Vendibook’s marketplace team.', 'Thank you for sharing your request.', 'These current listings may be worth reviewing.', 'Availability, delivery and final totals require confirmation.', 'Would you like to share more details about your equipment?', 'No listing, sale or outcome is guaranteed.'] as const;
export function validateMuseOutput(raw: unknown): number[] {
 if(!raw || typeof raw!=='object' || !('phrase_ids' in raw) || Object.keys(raw).length!==1) throw new Error('Invalid Muse output');
 const ids=(raw as {phrase_ids:unknown}).phrase_ids;
 if(!Array.isArray(ids) || ids.length<1 || ids.length>6 || ids.some(i=>!Number.isInteger(i)||i<0||i>=MUSE_PHRASES.length)) throw new Error('Invalid Muse output');
 return ids as number[];
}
export function museState(key?: string) { return key?'configured_unverified':'unavailable_missing_secret'; }
export const sendingEnabled = false;
export function requireMuseAdmin(user: {id:string}|null, isAdmin: boolean) { if(!user || !isAdmin) throw new Error('Admin access required'); }
export function draftAfterEdit<T extends {revision:number}>(draft:T) {return {...draft,revision:draft.revision+1,status:'draft',approved_by:null,approved_at:null};}
