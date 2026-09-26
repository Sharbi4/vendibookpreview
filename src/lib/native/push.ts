import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { supabase } from '@/integrations/supabase/client';
import { safeNotificationPath } from '../../../supabase/functions/send-native-push/policy';

export const nativePushSupported = () => Capacitor.getPlatform() === 'android' && Capacitor.isPluginAvailable('PushNotifications');
const db = supabase as any; // New table is defined in the native-push migration.
const subscribers = new Set<() => void>();
let snapshot = { isSubscribed: false, isLoading: false, permission: 'default' as NotificationPermission };
export const nativePushSnapshot = () => snapshot;
export const observeNativePush = (cb: () => void) => { subscribers.add(cb); return () => { subscribers.delete(cb); }; };
const update = (value: Partial<typeof snapshot>) => { snapshot={...snapshot,...value}; subscribers.forEach(cb=>cb()); };
const enabledKey=(id: string)=>`native-push-enabled:${id}`;
let currentUser: string | undefined;
let generation=0;
let init: Promise<void> | undefined;
let activeToken: string | undefined;
let pending: { resolve: (value: boolean) => void; timer: ReturnType<typeof setTimeout> } | undefined;
let navigateTo: ((path: string) => void) | undefined;
const finish=(ok: boolean)=>{ if(pending){clearTimeout(pending.timer);pending.resolve(ok);pending=undefined;}update({isLoading:false}); };

async function persist(token: string) {
 const id=currentUser, version=generation;
 if(!id || localStorage.getItem(enabledKey(id))!=='true') return;
 const {data}=await supabase.auth.getUser();
 if(data.user?.id!==id || version!==generation) return;
 const {error}=await db.from('native_push_devices').upsert({token,user_id:id,updated_at:new Date().toISOString()},{onConflict:'token'});
 if(error){finish(false);return;}
 if(version!==generation){ await db.from('native_push_devices').delete().eq('token',token).eq('user_id',id);return; }
 if(activeToken && activeToken!==token) await db.from('native_push_devices').delete().eq('token',activeToken).eq('user_id',id);
 activeToken=token; localStorage.setItem('native-push-token',token);update({isSubscribed:true});finish(true);
}
async function ensureListeners() {
 if(!init) init=(async()=>{
  await PushNotifications.addListener('registration', token=>{void persist(token.value).catch(()=>finish(false));});
  await PushNotifications.addListener('registrationError', ()=>finish(false));
  await PushNotifications.addListener('pushNotificationActionPerformed', event=>{
   const data=event.notification.data;
   if(currentUser && data?.user_id===currentUser) navigateTo?.(safeNotificationPath(data.url));
   else navigateTo?.('/auth');
  });
 })().catch(error=>{init=undefined;throw error;});
 return init;
}
export async function enableNativePush() {
 if(!nativePushSupported()||!currentUser||pending) return false;
 const id=currentUser, version=generation;update({isLoading:true});
 try {
  await ensureListeners();
  let permission=await PushNotifications.checkPermissions();
  if(permission.receive==='prompt'||permission.receive==='prompt-with-rationale') permission=await PushNotifications.requestPermissions();
  update({permission:permission.receive==='granted'?'granted':permission.receive==='denied'?'denied':'default'});
  if(permission.receive!=='granted'||version!==generation){update({isLoading:false});return false;}
  localStorage.setItem(enabledKey(id),'true');
  await PushNotifications.createChannel({id:'vendibook_updates',name:'Account updates',description:'Messages, bookings and transaction updates',importance:4,visibility:0});
  const result=new Promise<boolean>(resolve=>{pending={resolve,timer:setTimeout(()=>finish(false),20000)};});
  try {await PushNotifications.register();} catch {finish(false);}
  return await result;
 } catch {finish(false);return false;}
}
export async function disableNativePush() {
 if(!nativePushSupported()) return true;
 const id=currentUser;generation++;finish(false);
 if(id)localStorage.removeItem(enabledKey(id));
 const token=activeToken||localStorage.getItem('native-push-token');
 let removed=true;
 if(token && id){const {error}=await db.from('native_push_devices').delete().eq('token',token).eq('user_id',id);removed=!error;}
 try {await PushNotifications.unregister();await PushNotifications.removeAllDeliveredNotifications();} catch {removed=false;}
 activeToken=undefined;localStorage.removeItem('native-push-token');update({isSubscribed:false});
 return removed;
}
export async function setNativePushAccount(id: string | undefined, navigate: (path: string)=>void) {
 if(!nativePushSupported())return;
 navigateTo=navigate;
 if(currentUser===id)return;
 const previous=currentUser, version=++generation;
 finish(false);currentUser=id;activeToken=undefined;update({isSubscribed:false});
 if(previous){await PushNotifications.unregister().catch(()=>{});await PushNotifications.removeAllDeliveredNotifications().catch(()=>{});}
 if(version!==generation)return;
 await ensureListeners();
 const permission=await PushNotifications.checkPermissions();
 if(version!==generation)return;
 update({permission:permission.receive==='granted'?'granted':permission.receive==='denied'?'denied':'default'});
 if(id && localStorage.getItem(enabledKey(id))==='true' && permission.receive==='granted') await enableNativePush();
}
