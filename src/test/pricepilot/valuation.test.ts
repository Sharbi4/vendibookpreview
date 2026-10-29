import { describe, it, expect } from 'vitest';
import { runSaleValuation, runRentalValuation, compWeight, type SubjectProfile, type CompRecord } from '../../../supabase/functions/_shared/pricepilot/valuation';
import { observedSaleComp } from '../../../supabase/functions/_shared/pricepilot/observedComp';
const subject: SubjectProfile = {mode:'sale',assetCategory:'food_truck',state:'AZ',features:{}};
const comp=(price:number,id=String(price)):CompRecord=>({id,title:'Test unit',city:null,state:'AZ',year:null,make:null,model:null,lengthFt:null,displayedPrice:price,previousDisplayedPrice:null,observedStatus:'active',evidenceType:'vendibook_asking',evidenceConfidence:0.5,features:{},qualityFlags:[]});
describe('PricePilot calculation contracts',()=>{
 it('does not report high confidence from same-state prices with missing age and size',()=>{
  const r=runSaleValuation({...subject,year:2018,lengthFt:18},Array.from({length:10},(_,i)=>comp(30000+i*1000,String(i))));
  expect(r.strongComparableCount).toBe(0);expect(r.confidenceLabel).not.toBe('high');
  expect(r.warnings.join(' ')).toContain('Missing equipment details');
 });
 it('weights sold observations above pending and active observations',()=>{
  const observed={...comp(30000),evidenceType:'facebook_observed' as const};
  expect(compWeight({...observed,observedStatus:'sold'},1)).toBeGreaterThan(compWeight({...observed,observedStatus:'pending'},1));
  expect(compWeight({...observed,observedStatus:'pending'},1)).toBeGreaterThan(compWeight({...observed,observedStatus:'active'},1));
 });
 it('returns the actual median for three equally weighted sale prices',()=>{
  const r=runSaleValuation(subject,[20000,30000,40000].map(p=>comp(p)));
  expect(r.medianComparablePrice).toBe(30000);expect(r.recommendedListPrice).toBe(30000);
 });
 it('returns the midpoint median for an even sample',()=>{
  expect(runSaleValuation(subject,[20000,30000,40000,50000].map(p=>comp(p))).medianComparablePrice).toBe(35000);
 });
 it('calculates rental rates separately and uses direct bundle rates',()=>{
  const r=runRentalValuation({...subject,mode:'rental'},[200,300,400].map(p=>({...comp(p),features:{__weeklyRate:p*5,__monthlyRate:p*18}})));
  expect(r.dailyRate).toBe(300);expect(r.weeklyRate).toBe(1500);expect(r.monthlyRate).toBe(5400);
 });
 it('ignores non-finite prices and keeps recommendations within the range',()=>{
  const r=runSaleValuation({...subject,condition:'project',operationalStatus:'not_running'},[30000,31000,32000,33000,34000,35000,Infinity,NaN].map(p=>comp(p)));
  expect(r.comparableCount).toBe(6);expect(Number.isFinite(r.recommendedListPrice)).toBe(true);
  expect(r.recommendedListPrice).toBeGreaterThanOrEqual(r.estimatedMarketLow);expect(r.recommendedListPrice).toBeLessThanOrEqual(r.estimatedMarketHigh);
 });
 it('labels missing evidence as limited rather than inventing comparables',()=>{
  const r=runSaleValuation(subject,[]);expect(r.confidenceLabel).toBe('limited');expect(r.comparableCount).toBe(0);expect(r.warnings.join(' ')).toContain('broad category bands');
 });
 it('uses a verified transaction value even without an asking price',()=>{
  const r=observedSaleComp({id:'verified',observed_status:'sold',valuation_mode:'sale',transaction_price_verified:true,verified_transaction_price:21000,displayed_price:null,evidence_confidence:0.8});
  expect(r?.displayedPrice).toBe(21000);expect(r?.evidenceType).toBe('vendibook_verified');
 });
 it('keeps observed sold prices distinct and rejects untrusted evidence',()=>{
  const row={observed_status:'sold',displayed_price:30000,previous_displayed_price:50000,evidence_confidence:0.8};
  expect(observedSaleComp(row)?.displayedPrice).toBe(30000);expect(observedSaleComp(row)?.evidenceType).toBe('facebook_observed');
  expect(observedSaleComp({...row,evidence_confidence:0.1})).toBeNull();expect(observedSaleComp({...row,valuation_mode:'rental'})).toBeNull();expect(observedSaleComp({...row,observed_status:'ambiguous'})).toBeNull();
 });
});
