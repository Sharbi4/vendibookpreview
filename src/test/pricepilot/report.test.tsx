import React from 'react';
import {describe,it,expect,vi,afterEach} from 'vitest';
import {render as renderReact, cleanup} from '@testing-library/react';
afterEach(cleanup);
vi.stubGlobal('IntersectionObserver', class { observe() {} unobserve() {} disconnect() {} });
import {MemoryRouter} from 'react-router-dom';
import {ReportView} from '@/components/pricepilot/ReportView';
import type {PricingResponse} from '@/pages/tools/PricePilot';
vi.mock('framer-motion',async()=>({...await vi.importActual('framer-motion'),useReducedMotion:()=>true,useInView:()=>true}));
const base:PricingResponse={ok:true,mode:'sale',salePrice:27784,saleLow:21000,saleHigh:41900,marketBenchmark:27000,benchmarkLabel:'State market benchmark',marketScope:'local',marketScopeLabel:'State market',confidence:'directional',reasoning:'Limited matching vehicle details.',priceDrivers:['Condition'],pricingMoves:['Review nearby listings'],sources:['Vendibook asking prices'],lastUpdated:'2026-10-29T19:00:00Z',subject:{assetCategory:'food_truck',categoryLabel:'Food truck',city:'Houston',state:'TX',year:2018,lengthFt:18},valuation:{quickSalePrice:24472,premiumPositionPrice:39744,comparableCount:9,warnings:['No verified transaction prices in this evidence set.'],methodology:['Weighted median']},comparables:[],narrative:null,generatedAt:'2026-10-29T19:00:00Z'};
const render=(result:PricingResponse)=>renderReact(<MemoryRouter future={{v7_startTransition:true,v7_relativeSplatPath:true}}><ReportView result={result} onAdjust={()=>{}} onStartOver={()=>{}} /></MemoryRouter>).container.innerHTML;
describe('PricePilot customer report',()=>{
 it('renders sale prices, evidence caveats and interpretation without AI output',()=>{
  const html=render(base);for(const text of ['$27,784','$21,000','$41,900','State market','No verified transaction prices','Limited matching vehicle details'])expect(html).toContain(text);
 });
 it('renders rental daily, weekly and monthly outputs without sale strategy cards',()=>{
  const html=render({...base,mode:'rental',dailyRate:300,dailyLow:200,dailyHigh:350,weeklyRate:1600,weeklyLow:700,weeklyHigh:2200,marketScope:'national',marketScopeLabel:'Broader U.S. market',valuation:{comparableCount:7,monthlyRate:3000,warnings:['No local rental comparables.'],methodology:['Rental asking rates']}});
  for(const text of ['$300/day','$1,600','$3,000','No local rental comparables.'])expect(html).toContain(text);
  expect(html).not.toContain('Three ways to position it');
 });
});
