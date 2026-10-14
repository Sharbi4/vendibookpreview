import { describe, expect, it } from 'vitest';
import { campaignMetrics, listingNextStep, listingRecommendations } from '@/lib/monetization/buyerMatchIntelligence';
describe('BuyerMatch evidence-backed intelligence', () => {
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
