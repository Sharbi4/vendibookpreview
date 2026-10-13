import { describe, expect, it } from 'vitest';
import { campaignMetrics, listingRecommendations } from '@/lib/monetization/buyerMatchIntelligence';
describe('BuyerMatch evidence-backed intelligence', () => {
  it('counts distinct verified events only, never observed clicks as responses', () => {
    const event = {id:'a',campaign_id:'c',event_type:'outreach_sent',occurred_at:'2026-10-12',source:'approved source',verification_status:'verified'};
    expect(campaignMetrics([event,event,{...event,id:'b',event_type:'buyer_response_received',verification_status:'observed'}])).toMatchObject({outreach:1,responses:0,qualified:0});
  });
  it('does not invent readiness facts', () => {
    expect(listingRecommendations({})).toHaveLength(5);
    expect(listingRecommendations({cover_image_url:'photo',image_urls:['a','b','c','d'],description:'a'.repeat(160),included_items:'range',price_sale:38000})).toEqual([]);
  });
});