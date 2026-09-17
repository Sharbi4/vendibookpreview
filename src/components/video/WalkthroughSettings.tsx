import { useEffect, useState } from 'react';
import { CalendarDays, Loader2, Plus, Trash2, Video } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const DAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
type Window = { id?: string; weekday: number; start_local_time: string; end_local_time: string; active: boolean };
export default function WalkthroughSettings() {
  const { user } = useAuth();
  const [settings,setSettings] = useState({ enabled:false, timezone:Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC', default_duration_minutes:20, minimum_notice_minutes:120, buffer_minutes:0 });
  const [windows,setWindows] = useState<Window[]>([]); const [saving,setSaving] = useState(false);
  const [blackout,setBlackout] = useState('');
  useEffect(() => { if (!user) return; Promise.all([
    (supabase.from('seller_video_settings') as any).select('*').eq('user_id',user.id).maybeSingle(),
    (supabase.from('seller_video_availability') as any).select('*').eq('seller_id',user.id).order('weekday'),
  ]).then(([s,a]) => { if(s.data) setSettings(s.data); setWindows(a.data || []); }); },[user]);
  const save = async () => { if(!user) return; setSaving(true); try {
    const { error } = await (supabase.from('seller_video_settings') as any).upsert({ user_id:user.id,...settings }); if(error) throw error;
    await (supabase.from('seller_video_availability') as any).delete().eq('seller_id',user.id);
    if(windows.length) { const { error:e }=await (supabase.from('seller_video_availability') as any).insert(windows.map(({weekday,start_local_time,end_local_time,active})=>({seller_id:user.id,weekday,start_local_time,end_local_time,active}))); if(e) throw e; }
    toast.success('Video walkthrough availability saved.');
  } catch(e) { toast.error(e instanceof Error?e.message:'Could not save availability.'); } finally { setSaving(false); } };
  const addWindow=(day:number)=>setWindows(v=>[...v,{weekday:day,start_local_time:'09:00',end_local_time:'17:00',active:true}]);
  const addBlackout=async()=>{ if(!user||!blackout)return; const start=new Date(blackout); const end=new Date(start); end.setDate(end.getDate()+1); const {error}=await (supabase.from('seller_video_blackouts') as any).insert({seller_id:user.id,starts_at:start.toISOString(),ends_at:end.toISOString()}); error?toast.error('Could not block that date.'):toast.success('Date blocked.'); setBlackout(''); };
  return <div className="walkthrough-settings">
    <div className="walkthrough-setting-lead"><Video/><div><h2>Video walkthroughs</h2><p>Meet serious buyers live inside Vendibook.</p></div><label className="walkthrough-switch"><input type="checkbox" checked={settings.enabled} onChange={e=>setSettings(s=>({...s,enabled:e.target.checked}))}/><span/></label></div>
    <div className="walkthrough-setting-grid">
      <label>Timezone<select value={settings.timezone} onChange={e=>setSettings(s=>({...s,timezone:e.target.value}))}><option value={settings.timezone}>{settings.timezone}</option><option value="America/Phoenix">America/Phoenix</option><option value="America/Los_Angeles">America/Los_Angeles</option><option value="America/Denver">America/Denver</option><option value="America/Chicago">America/Chicago</option><option value="America/New_York">America/New_York</option></select></label>
      <label>Duration<select value={settings.default_duration_minutes} onChange={e=>setSettings(s=>({...s,default_duration_minutes:Number(e.target.value)}))}>{[15,20,30].map(v=><option key={v} value={v}>{v} minutes</option>)}</select></label>
      <label>Minimum notice<select value={settings.minimum_notice_minutes} onChange={e=>setSettings(s=>({...s,minimum_notice_minutes:Number(e.target.value)}))}><option value={120}>2 hours</option><option value={720}>12 hours</option><option value={1440}>24 hours</option></select></label>
      <label>Meeting buffer<select value={settings.buffer_minutes} onChange={e=>setSettings(s=>({...s,buffer_minutes:Number(e.target.value)}))}>{[0,15,30].map(v=><option key={v} value={v}>{v} minutes</option>)}</select></label>
    </div>
    <div className="walkthrough-week"><h3>Weekly availability</h3>{DAYS.map((day,i)=>{const rows=windows.map((w,index)=>({w,index})).filter(x=>x.w.weekday===i);return <div className="walkthrough-day" key={day}><strong>{day.slice(0,3)}</strong><div>{rows.map(({w,index})=><div className="walkthrough-window" key={index}><input aria-label={`${day} start`} type="time" value={w.start_local_time.slice(0,5)} onChange={e=>setWindows(a=>a.map((x,j)=>j===index?{...x,start_local_time:e.target.value}:x))}/><span>to</span><input aria-label={`${day} end`} type="time" value={w.end_local_time.slice(0,5)} onChange={e=>setWindows(a=>a.map((x,j)=>j===index?{...x,end_local_time:e.target.value}:x))}/><Button variant="ghost" size="icon" onClick={()=>setWindows(a=>a.filter((_,j)=>j!==index))} aria-label={`Remove ${day} window`}><Trash2/></Button></div>)}<Button variant="ghost" size="sm" onClick={()=>addWindow(i)}><Plus/> Add hours</Button></div></div>})}</div>
    <div className="walkthrough-blackout"><CalendarDays/><label>Block a date<input type="date" value={blackout} onChange={e=>setBlackout(e.target.value)}/></label><Button variant="outline" onClick={addBlackout} disabled={!blackout}>Block date</Button></div>
    <Button onClick={save} disabled={saving}>{saving?<Loader2 className="animate-spin"/>:null}Save walkthrough settings</Button>
  </div>;
}