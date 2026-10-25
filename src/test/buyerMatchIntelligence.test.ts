import { describe, expect, it } from 'vitest';
import { campaignMetrics, listingNextStep, listingRecommendations, matchingListingPrice } from '@/lib/monetization/buyerMatchIntelligence';
describe('BuyerMatch evidence-backed intelligence', () => {
  it('uses rental rates and periods without falling back to a sale price', () => {
    const rental = {id:'r',title:'Kitchen',mode:'rent' as const,price_sale:50000,price_daily:125};
    expect(matchingListingPrice(rental)).toBe('$125/day');
    expect(matchingListingPrice({...rental,price_daily:null})).toBeNull();
    expect(matchingListingPrice({...rental,price_daily:null,price_hourly:24.5})).toBe('$24.50/hour');
    expect(listingRecommendations(rental)).not.toContain('Confirm a rental rate before campaign review.');
    expect(listingRecommendations({...rental,price_daily:0})).toContain('Confirm a rental rate before campaign review.');
  });
  it('does not direct hosts to equipment sale appraisals because a rental has views but no saves', () => {
    const rental={id:'r',title:'Kitchen',mode:'rent' as const,image_urls:['a','b','c','d'],description:'a'.repeat(160),included_items:'range',price_daily:125};
    expect(listingNextStep(rental,{views30:40,saves:0,offersWaiting:0,conversations:0},{entitled:true,inCampaign:false})).toMatchObject({label:'Start a renter search',action:'start_buyermatch'});
  });
  it('counts distinct verified events only, never observed clicks as responses', () => {
    const event = {id:'a',campaign_id:'c',event_type:'outreach_sent',occurred_at:'2026-10-12',source:'approved source',verification_status:'verified'};
    expect(campaignMetrics([event,event,{...event,id:'b',event_type:'buyer_response_received',verification_status:'observed'}])).toMatchObject({outreach:1,responses:0,qualified:0});
  });
  it('does not invent readiness facts', () => {
    expect(listingRecommendations({})).toHaveLength(5);
    expect(listingRecommendations({cover_image_url:'photo',image_urls:['a','b','c','d'],description:'a'.repeat(160),included_items:'range',price_sale:38000})).toEqual([]);
  });
  it('picks one concrete next step from real listing fields and counts only', () => {
    const full = {id:'l',title:'Trailer',image_urls:['a','b','c','d'],description:'a'.repeat(160),included_items:'fryer',price_sale:38000};
    const quiet = {views30:0,saves:0,offersWaiting:0,conversations:0};
    expect(listingNextStep(full,{...quiet,offersWaiting:2},{entitled:true,inCampaign:false})).toMatchObject({label:'Answer 2 offers',to:'/dashboard/offers'});
    expect(listingNextStep({...full,image_urls:['a']},quiet,{entitled:true,inCampaign:false})).toMatchObject({label:'Add photos',to:'/dashboard/listings/l/edit'});
    expect(listingNextStep(full,quiet,{entitled:true,inCampaign:false}).action).toBe('start_buyermatch');
    expect(listingNextStep(full,quiet,{entitled:false,inCampaign:false}).action).toBeUndefined();
    // Missing counts never trigger a price nudge.
    expect(listingNextStep(full,{views30:null,saves:null,offersWaiting:null,conversations:null},{entitled:false,inCampaign:true}).to).toBe('/listing/l');
  });
});
