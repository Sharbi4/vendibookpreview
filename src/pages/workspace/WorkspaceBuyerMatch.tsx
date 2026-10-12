import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowUpRight, Search, FileText, Loader2 } from 'lucide-react';
import WorkspaceShell from '@/components/workspace/WorkspaceShell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { buyerMatchAction, useBuyerMatch } from '@/hooks/useBuyerMatch';
import { useAuth } from '@/contexts/AuthContext';

const metricLabels: Record<string,string> = {discovered:'Potential matches',contacted:'Prospects contacted',responses:'Actual responses',interested:'Interested buyers',qualified:'Qualified conversations',introduced:'Buyer introductions',inquiries:'Vendibook inquiries'};
const date = (s: string) => new Date(s).toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'});
const statusLabels: Record<string,string> = {pending_activation:'Pending activation',researching:'Research underway',paused:'Paused',completed:'Completed'};
function download(name: string, value: unknown) {
  const url=URL.createObjectURL(new Blob([JSON.stringify(value,null,2)],{type:'application/json'}));
  const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
export default function WorkspaceBuyerMatch() {
  const {user}=useAuth();const query=useBuyerMatch();const client=useQueryClient();const [params,setParams]=useSearchParams();
  const [listing,setListing]=useState('');const [geography,setGeography]=useState('');const [criteria,setCriteria]=useState('');
  const action=useMutation({mutationFn:({name,payload}:{name:string;payload:Record<string,unknown>})=>buyerMatchAction(name,payload),
    onSuccess:()=>client.invalidateQueries({queryKey:['buyermatch']})});
  const act=(name:string,payload:Record<string,unknown>)=>action.mutate({name,payload});
  const data=query.data;const campaigns=data?.campaigns??[];
  const selected=campaigns.find((c:any)=>c.id===params.get('campaign'))??campaigns[0];
  const latest=new Map<string,any>();for(const r of data?.reports??[])if(!latest.has(r.campaign_id))latest.set(r.campaign_id,r);
  const totals=Object.fromEntries(Object.keys(metricLabels).map(key=>[key,Array.from(latest.values()).reduce((sum,r)=>sum+Number(r.metrics[key]??0),0)]));
  return <WorkspaceShell><main className="mx-auto max-w-6xl space-y-8 pb-12 text-stone-900">
    <header className="rounded-[28px] border border-stone-200 bg-[#fffdf9] p-7 sm:p-10">
      <p className="text-xs font-semibold uppercase tracking-[.2em] text-orange-700">Vendibook Pro · Seller intelligence</p>
      <div className="mt-5 flex flex-wrap items-start justify-between gap-5"><div><h1 className="text-4xl font-semibold tracking-tight">BuyerMatch AI</h1>
        <p className="mt-3 max-w-2xl text-lg leading-7 text-stone-600">Your listing deserves more than visibility. Follow the search for your next buyer.</p></div>
        <Link to="/account/subscription" className="text-sm underline underline-offset-4">Manage membership</Link></div>
      <p className="mt-6 max-w-3xl text-sm leading-6 text-stone-600">Select an eligible sale listing, add optional buyer preferences, and submit it for activation. Research and authorized outreach are reviewed by our team. Results are not guaranteed.</p>
    </header>
    {query.isLoading?<p className="flex gap-2"><Loader2 className="animate-spin"/>Loading campaign activity…</p>:query.error?
      <section role="alert" className="rounded-2xl border p-6"><p>BuyerMatch could not be loaded. Your existing membership is unchanged.</p><Button className="mt-3" onClick={()=>query.refetch()}>Retry</Button></section>:data&&<>
      {action.error&&<p role="alert" className="rounded-xl bg-red-50 p-4 text-red-800">{action.error.message}</p>}
      {!data.config.fulfillment_enabled&&<p className="rounded-2xl border border-orange-200 bg-orange-50 p-5 text-sm leading-6"><strong>Pending service activation.</strong> You can submit a campaign for review. Research and outreach will begin only after the fulfillment workflow is ready and an operator activates your campaign.</p>}
      {!data.config.entitled&&<p className="rounded-2xl border p-5 text-sm">New campaign activity requires current Pro access with a verified access-end date. Historical reports and your messages remain available. <Link className="text-orange-700 underline" to="/pricing">Review Pro membership</Link></p>}
      <section aria-label="Campaign overview" className="grid grid-cols-2 gap-x-8 gap-y-6 border-y border-stone-200 py-7 sm:grid-cols-4">
        <div><p className="text-3xl font-semibold">{campaigns.filter((c:any)=>c.status==='researching').length}</p><p className="mt-1 text-sm text-stone-500">Active campaigns / listings</p></div>
        {Object.entries(metricLabels).map(([key,label])=><div key={key}><p className="text-3xl font-semibold">{totals[key]}</p><p className="mt-1 text-sm text-stone-500">{label}</p></div>)}
      </section><p className="text-xs text-stone-500">Totals use each campaign’s latest approved report. Contact attempts, responses, and qualification are separate recorded activities, not an assumed conversion funnel.</p>
      {data.config.entitled&&<section className="rounded-3xl border bg-white p-6">
        <h2 className="text-xl font-semibold">Choose your next campaign</h2><p className="mt-2 text-sm text-stone-500">We reuse your listing details, specifications, and photos. Up to {data.config.max_campaigns} open campaigns, including paused campaigns. Reserved and sold listings are excluded.</p>
        <form className="mt-5 grid gap-4 sm:grid-cols-2" onSubmit={e=>{e.preventDefault();act('submit',{listing_id:listing,geography,buyer_criteria:criteria});}}>
          <label className="text-sm">Sale listing<select required value={listing} onChange={e=>setListing(e.target.value)} className="mt-2 block w-full rounded-xl border bg-white p-3"><option value="">Select your listing</option>{data.listings.filter((l:any)=>!campaigns.some((c:any)=>c.listing_id===l.id)).map((l:any)=><option key={l.id} value={l.id}>{l.title}</option>)}</select></label>
          <label className="text-sm">Geographic preferences (optional)<Input className="mt-2" maxLength={500} value={geography} onChange={e=>setGeography(e.target.value)} placeholder="For example: Southwest, or nationwide"/></label>
          <label className="text-sm sm:col-span-2">Buyer criteria (optional)<Textarea className="mt-2" maxLength={2000} value={criteria} onChange={e=>setCriteria(e.target.value)} placeholder="Preferred equipment use, buyer budget, or configuration needs"/></label>
          <Button type="submit" disabled={!listing||action.isPending||!data.config.submissions_enabled} className="w-fit bg-orange-600 hover:bg-orange-700">Submit for activation</Button>
        </form>
        {!data.listings.length&&<p className="mt-4 text-sm">Publish an eligible sale listing to begin. <Link className="underline" to="/dashboard/listings">Manage listings</Link></p>}
      </section>}
      <section className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <aside><h2 className="mb-4 text-lg font-semibold">Your campaigns</h2>{!campaigns.length?<p className="rounded-2xl border border-dashed p-6 text-sm text-stone-500">No campaigns yet. Nothing has been researched or sent on your behalf.</p>:<div className="space-y-3">{campaigns.map((c:any)=><button key={c.id} onClick={()=>setParams({campaign:c.id})} className={'w-full rounded-2xl border p-4 text-left '+(selected?.id===c.id?'border-orange-400 bg-orange-50':'bg-white')}>
          {c.listing_snapshot.cover_image_url&&<img src={c.listing_snapshot.cover_image_url} alt="" className="mb-3 aspect-[16/9] w-full rounded-xl object-cover"/>}<span className="block font-semibold">{c.listing_snapshot.title}</span><span className="mt-2 block text-xs text-stone-600">{statusLabels[c.status]}</span></button>)}</div>}</aside>
        {selected&&<CampaignDetail key={selected.id+':'+selected.updated_at} campaign={selected} reports={data.reports.filter((r:any)=>r.campaign_id===selected.id)} owner={selected.seller_id===user?.id} entitled={data.config.entitled} busy={action.isPending} act={act}/>}
      </section>
      {data.config.is_admin&&<AdminTools key={selected?.id??'settings'} config={data.config} campaign={selected} imports={data.imports.filter((i:any)=>i.campaign_id===selected?.id)} busy={action.isPending} act={act}/>}
    </>}
  </main></WorkspaceShell>;
}
function CampaignDetail({campaign:c,reports,owner,entitled,busy,act}:any) {
  const [geo,setGeo]=useState(c.geography);const [criteria,setCriteria]=useState(c.buyer_criteria);const [notify,setNotify]=useState(c.notifications_enabled);
  return <article className="min-w-0 rounded-3xl border bg-white p-6 sm:p-8"><div className="flex flex-wrap justify-between gap-3"><span className="rounded-full bg-stone-100 px-3 py-1 text-xs font-medium">{statusLabels[c.status]}</span><Link to={'/listing/'+c.listing_id} className="inline-flex gap-1 text-sm text-orange-700">View listing<ArrowUpRight className="h-4 w-4"/></Link></div>
    <h2 className="mt-5 text-2xl font-semibold">{c.listing_snapshot.title}</h2><p className="mt-2 break-all text-xs text-stone-500">Campaign {c.id}</p><p className="mt-2 text-sm text-stone-500">Submitted {date(c.created_at)} · {c.activated_at?'Research started '+date(c.activated_at):'Not activated'}</p>
    <p className="mt-4 text-sm leading-6">Targeting: {c.geography||'Listing location and relevant buying opportunities'}. {c.buyer_criteria||'Equipment relevance and documented buying intent.'}</p>
    {owner&&<details className="mt-6 rounded-xl border p-4"><summary className="cursor-pointer text-sm font-medium">Manage participation & preferences</summary><form className="mt-4 space-y-4" onSubmit={e=>{e.preventDefault();act('preferences',{campaign_id:c.id,geography:geo,buyer_criteria:criteria,notifications_enabled:notify});}}>
      <label className="block text-sm">Geographic preferences<Input value={geo} maxLength={500} onChange={e=>setGeo(e.target.value)}/></label>
      <label className="block text-sm">Buyer criteria<Textarea value={criteria} maxLength={2000} onChange={e=>setCriteria(e.target.value)}/></label>
      <label className="flex gap-2 text-sm"><input type="checkbox" checked={notify} onChange={e=>setNotify(e.target.checked)}/>Campaign notifications and batched report emails</label>
      <Button disabled={busy} type="submit" variant="outline">Save preferences</Button>
      {c.status!=='completed'&&<Button type="button" className="ml-2" variant="outline" disabled={busy||(c.status==='paused'&&!entitled)} onClick={()=>act(c.status==='paused'?'resume':'pause',{campaign_id:c.id})}>{c.status==='paused'?'Resubmit for activation':'Pause campaign'}</Button>}
    </form></details>}
    <section className="mt-8"><h3 className="text-lg font-semibold">Activity & reports</h3>{!reports.length?<div className="mt-4 rounded-xl bg-stone-50 p-6"><Search className="h-6 w-6 text-orange-600"/><p className="mt-3 text-sm text-stone-600">No approved activity yet. Your first report will appear after research is completed and reviewed.</p></div>:
      <ol className="mt-5 space-y-6 border-l border-orange-200 pl-5">{reports.map((r:any)=><li key={r.id}><p className="text-xs font-medium text-orange-700">{date(r.published_at)} · Approved report</p><p className="mt-2 whitespace-pre-wrap text-sm leading-6">{r.summary}</p><dl className="mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-3">{Object.entries(metricLabels).map(([k,label])=><div key={k}><dt className="text-stone-500">{label}</dt><dd className="mt-1 text-base font-semibold">{r.metrics[k]??0}</dd></div>)}</dl><button className="mt-3 text-xs text-orange-700 underline" onClick={()=>download('buyermatch-report-'+r.id+'.json',r)}>Download report</button></li>)}</ol>}
    </section><Link to="/dashboard/messages" className="mt-7 inline-flex gap-2 text-sm text-orange-700 underline">View your Vendibook messages</Link><p className="mt-2 text-xs leading-5 text-stone-500">A prospect is not automatically an inquiry. Reports show reviewed evidence; no private contact list is shared here.</p>
  </article>;
}
function AdminTools({config,campaign:c,imports,busy,act}:any) {
  const [workflow,setWorkflow]=useState(config.workflow_reference??'');const [enabled,setEnabled]=useState(config.fulfillment_enabled);const [intake,setIntake]=useState(config.submissions_enabled);const [limit,setLimit]=useState(config.max_campaigns);
  const [started,setStarted]=useState(false);const [raw,setRaw]=useState('');const [batch,setBatch]=useState('');const [summary,setSummary]=useState('');const [reviewed,setReviewed]=useState<string|null>(null);const [error,setError]=useState('');
  return <section className="rounded-3xl border-2 border-stone-300 bg-stone-50 p-6"><h2 className="text-xl font-semibold">BuyerMatch operations · Admin only</h2><p className="mt-2 text-sm text-stone-600">Manual Muse research and reviewed JSON imports. No automated messaging is connected.</p>
    <details className="mt-4"><summary className="cursor-pointer font-medium">Operational controls</summary><div className="mt-4 grid gap-4">
      <label className="text-sm">Approved workflow reference<Input value={workflow} onChange={e=>setWorkflow(e.target.value)}/></label>
      <label className="text-sm">Maximum open campaigns per seller<Input type="number" min={1} max={50} value={limit} onChange={e=>setLimit(Number(e.target.value))}/></label>
      <label className="flex gap-2 text-sm"><input type="checkbox" checked={intake} onChange={e=>setIntake(e.target.checked)}/>Accept submissions</label>
      <label className="flex gap-2 text-sm"><input type="checkbox" checked={enabled} onChange={e=>setEnabled(e.target.checked)}/>Approved fulfillment workflow is operational</label>
      <Button className="w-fit" disabled={busy} onClick={()=>act('settings',{workflow_reference:workflow,fulfillment_enabled:enabled,submissions_enabled:intake,max_campaigns:limit})}>Save controls</Button>
    </div></details>
    {c&&<div className="mt-6 space-y-4 border-t pt-6"><p className="text-sm">Selected campaign: <strong>{c.listing_snapshot.title}</strong></p>
      <label className="flex gap-2 text-sm"><input type="checkbox" checked={started} onChange={e=>setStarted(e.target.checked)}/>I have actually started the approved research workflow for this campaign.</label>
      <div className="flex flex-wrap gap-3"><Button disabled={busy||!started||!config.fulfillment_enabled} onClick={()=>act('activate',{campaign_id:c.id,research_started:started})}>Confirm research started</Button><Button variant="outline" disabled={busy} onClick={()=>act('complete',{campaign_id:c.id})}>Complete campaign</Button>
      <Button variant="outline" disabled={c.status!=='researching'||!config.fulfillment_enabled} onClick={async()=>{try{const brief=await buyerMatchAction('brief',{campaign_id:c.id});download('muse-campaign-'+c.id+'.json',brief);setError('');}catch(e){setError((e as Error).message);}}>Export Muse brief</Button></div>
      <p className="text-xs text-stone-600">Import a JSON array of 1–500 records using the schema in docs/buyermatch/operations.md. Each row must identify this campaign and listing. This stages records privately; approval is a separate action.</p>
      <label className="block text-sm">Import JSON file<input type="file" accept=".json,application/json" className="mt-2 block" onChange={async e=>{setError('');const f=e.target.files?.[0];if(!f)return;if(f.size>450000){setError('File must be under 450 KB');return;}setRaw(await f.text());}}/></label>
      <label className="block text-sm">Batch identifier<Input value={batch} maxLength={100} onChange={e=>setBatch(e.target.value)} placeholder="Unique source report ID"/></label>
      <label className="block text-sm">Private research records<Textarea value={raw} onChange={e=>setRaw(e.target.value)} rows={7}/></label>
      {error&&<p role="alert" className="text-sm text-red-700">{error}</p>}
      <Button disabled={busy||!batch||!raw||c.status!=='researching'} onClick={()=>{try{const records=JSON.parse(raw);if(!Array.isArray(records))throw Error('Expected a JSON array');setError('');act('import',{campaign_id:c.id,batch_key:batch,records});}catch(e){setError((e as Error).message);}}}>Stage import for review</Button>
      {imports.map((i:any)=><div key={i.id} className="rounded-xl border bg-white p-4"><p className="font-medium">Review batch: {i.batch_key}</p><details className="mt-3"><summary className="cursor-pointer text-sm">Inspect private records ({i.records.length})</summary><pre className="mt-3 max-h-72 overflow-auto whitespace-pre-wrap break-all text-xs">{JSON.stringify(i.records,null,2)}</pre></details>
        <label className="mt-4 block text-sm">Seller-visible summary (no private contact details)<Textarea maxLength={2000} value={summary} onChange={e=>setSummary(e.target.value)}/></label>
        <label className="mt-3 flex gap-2 text-sm"><input type="checkbox" checked={reviewed===i.id} onChange={e=>setReviewed(e.target.checked?i.id:null)}/>I verified source evidence, outreach permission, actual activity, and that this summary is appropriate to share with the seller.</label>
        <div className="mt-4 flex gap-3"><Button disabled={busy||reviewed!==i.id||!summary.trim()} onClick={()=>{act('approve_import',{campaign_id:c.id,import_id:i.id,summary,review_confirmed:true});setReviewed(null);setSummary('');}}>Approve & publish report</Button><Button variant="outline" disabled={busy} onClick={()=>act('reject_import',{campaign_id:c.id,import_id:i.id})}>Reject</Button></div>
      </div>)}
    </div>}
  </section>;
}
