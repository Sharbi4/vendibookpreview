// Consent/eligibility guards for outbound outreach. Prompt, segments and
// follow-up drafts live in ./outboundAtlas.ts (Atlas — Vendibook Outbound).
export {SEGMENTS,OPENERS,FOLLOWUP_LINKS,followupDraft,DYNAMIC_VARIABLES,OUTBOUND_PROMPT as GROWTH_PROMPT} from './outboundAtlas.ts';
export type {GrowthSegment} from './outboundAtlas.ts';
export const OUTCOMES = ['interested','qualified_buyer','qualified_renter','wants_listing_info','follow_up_requested','human_callback','not_interested','wrong_number','do_not_call','no_answer','unavailable'] as const;
export function safeInfoLink(value:string): boolean {
 try {const u=new URL(value);return u.protocol==='https:'&&u.hostname==='vendibook.com'&&!u.username&&!u.password&&['/list','/search','/contact','/pricing'].includes(u.pathname)&&!u.hash;}catch{return false;}
}
export type GuardLead = {timezone:string;state:string;attempts:number;suppressed:boolean};
export type GuardConsent = {channel:string;status:string;source:string;accepted_at:string;reviewed_at:string|null;revoked_at:string|null;ai_marketing:boolean;vendibook_named:boolean;dnc_checked_at:string|null;jurisdiction_approved:boolean;window_start:number;window_end:number;timezone:string;state:string};
export function eligibility(lead:GuardLead, consent:GuardConsent|null, now=new Date()):string[]{
 const reasons:string[]=[];
 if(lead.suppressed)reasons.push('Suppressed / do not call');
 if(lead.attempts>=1)reasons.push('One-attempt limit reached');
 if(!consent||consent.channel!=='ai_call'||consent.status!=='verified'||!consent.reviewed_at||!consent.source||!consent.accepted_at||!consent.ai_marketing||!consent.vendibook_named||consent.revoked_at)reasons.push('Verified written AI marketing consent required');
 if(!consent?.jurisdiction_approved||consent.timezone!==lead.timezone||consent.state!==lead.state)reasons.push('Jurisdiction review required');
 const dnc=consent?.dnc_checked_at?Date.parse(consent.dnc_checked_at):NaN;
 if(!Number.isFinite(dnc)||now.getTime()-dnc>24*60*60*1000||dnc>now.getTime())reasons.push('Current DNC review required');
 try {
  if(!lead.timezone.includes('/')||!lead.state)throw new Error('Unknown jurisdiction');
  const parts=new Intl.DateTimeFormat('en-US',{timeZone:lead.timezone,hourCycle:'h23',hour:'numeric',weekday:'short'}).formatToParts(now);
  const hour=Number(parts.find(x=>x.type==='hour')?.value);const weekday=parts.find(x=>x.type==='weekday')?.value;
  const start=Math.max(10,consent?.window_start??10),end=Math.min(18,consent?.window_end??18);
  if(!Number.isFinite(hour)||start>=end||hour<start||hour>=end||weekday==='Sun'||weekday==='Sat')reasons.push('Outside reviewed local weekday calling window');
 }catch{reasons.push('Valid IANA timezone and state required');}
 return reasons;
}
export function pilotLimit(count:number){return Number.isInteger(count)&&count>=1&&count<=10;}