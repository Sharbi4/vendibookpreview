import { useState } from 'react';
import { US_STATES } from '@/lib/operations/usStates';
import type { RegionMetric } from '@/lib/operations/types';
export function USMarketMap({regions}:{regions:RegionMetric[]}){
 const [mode,setMode]=useState<'supply'|'demand'>('supply');const [selected,setSelected]=useState('AZ');
 const max=Math.max(1,...regions.map(r=>r[mode]));const active=regions.find(r=>r.state===selected);const name=US_STATES.find(s=>s.code===selected)?.name;
 return <section className="ops-card ops-map"><div className="ops-section-head"><div><p className="ops-overline">MARKET INTELLIGENCE</p><h2>Where the market moves</h2></div><div className="ops-switch" aria-label="Map metric">{(['supply','demand'] as const).map(m=><button key={m} aria-pressed={mode===m} onClick={()=>setMode(m)}>{m==='supply'?'Supply':'Demand'}</button>)}</div></div>
 <svg viewBox="0 0 975 610" aria-label={`United States ${mode} map`} role="group">{US_STATES.map(state=>{const value=regions.find(r=>r.state===state.code)?.[mode]||0;const intensity=value/max;const fill=value===0?'#e9edf0':mode==='supply'?`hsl(20 90% ${88-intensity*36}%)`:`hsl(207 70% ${88-intensity*47}%)`;return <path key={state.code} d={state.path} fill={fill} stroke={selected===state.code?'#242b32':'#fff'} strokeWidth={selected===state.code?2.5:1} role="button" tabIndex={0} aria-label={`${state.name}: ${value} ${mode==='supply'?'active listings':'demand actions'}`} aria-pressed={selected===state.code} onClick={()=>setSelected(state.code)} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();setSelected(state.code);}}}><title>{state.name}: {value}</title></path>;})}</svg>
 <div className="ops-map-summary"><div><strong>{name}</strong><small>Selected market</small></div><div><strong>{active?.supply??0}</strong><small>Active listings</small></div><div><strong>{active?.demand??0}</strong><small>Demand actions</small></div></div>
 <p className="ops-note">Supply: public active listings now. Demand: inquiries, offers and booking requests in the selected period, grouped by listing state—not buyer location. Unknown state: {regions.find(r=>r.state==='UNKNOWN')?.[mode]??0}.</p></section>;
}
