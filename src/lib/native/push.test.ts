import {beforeEach,afterEach,it,expect,vi} from 'vitest';
const m=vi.hoisted(()=>({listeners:{} as Record<string,any>,permission:'granted',user:'u1',upsert:vi.fn(),unregister:vi.fn(),go:vi.fn(),register:vi.fn()}));
vi.mock('@capacitor/core',()=>({Capacitor:{getPlatform:()=> 'android',isPluginAvailable:()=>true}}));
vi.mock('@capacitor/push-notifications',()=>({PushNotifications:{addListener:vi.fn(async(name,fn)=>{m.listeners[name]=fn;return {remove:vi.fn()};}),checkPermissions:vi.fn(async()=>({receive:m.permission})),requestPermissions:vi.fn(async()=>({receive:m.permission})),createChannel:vi.fn(),register:m.register,unregister:m.unregister,removeAllDeliveredNotifications:vi.fn(async()=>{})}}));
vi.mock('@/integrations/supabase/client',()=>({supabase:{auth:{getUser:async()=>({data:{user:{id:m.user}}})},from:()=>({upsert:m.upsert,delete:()=>({eq:()=>({eq:async()=>({error:null})})})})}}));
beforeEach(()=>{vi.resetModules();vi.clearAllMocks();localStorage.clear();m.listeners={};m.permission='granted';m.user='u1';m.unregister.mockResolvedValue(undefined);m.upsert.mockResolvedValue({error:null});m.register.mockImplementation(async()=>{m.listeners.registration({value:'firebase-device-token-123456789'});});});
afterEach(()=>{vi.useRealTimers();});
it('requires opt-in and saves only for the signed-in user',async()=>{
 const p=await import('./push');await p.setNativePushAccount('u1',m.go);expect(m.register).not.toHaveBeenCalled();
 expect(await p.enableNativePush()).toBe(true);expect(m.upsert).toHaveBeenCalledWith(expect.objectContaining({user_id:'u1'}),{onConflict:'token'});expect(p.nativePushSnapshot().isSubscribed).toBe(true);
});
it('denied permission never registers or saves a token',async()=>{
 m.permission='denied';const p=await import('./push');await p.setNativePushAccount('u1',m.go);expect(await p.enableNativePush()).toBe(false);expect(m.upsert).not.toHaveBeenCalled();
});
it('reports a failed device save rather than enabled',async()=>{
 m.upsert.mockResolvedValue({error:new Error('blocked')});const p=await import('./push');await p.setNativePushAccount('u1',m.go);expect(await p.enableNativePush()).toBe(false);expect(p.nativePushSnapshot().isSubscribed).toBe(false);
});
it('invalidates token and clears preference on sign-out',async()=>{
 const p=await import('./push');await p.setNativePushAccount('u1',m.go);await p.enableNativePush();await p.disableNativePush();expect(m.unregister).toHaveBeenCalled();expect(localStorage.getItem('native-push-enabled:u1')).toBeNull();expect(p.nativePushSnapshot().isSubscribed).toBe(false);
});
it('notification taps validate recipient and route',async()=>{
 const p=await import('./push');await p.setNativePushAccount('u1',m.go);
 m.listeners.pushNotificationActionPerformed({notification:{data:{user_id:'u2',url:'/dashboard'}}});expect(m.go).toHaveBeenLastCalledWith('/auth');
 m.listeners.pushNotificationActionPerformed({notification:{data:{user_id:'u1',url:'https://evil.test'}}});expect(m.go).toHaveBeenLastCalledWith('/dashboard');
});
it('switching accounts invalidates the previous native token',async()=>{
 const p=await import('./push');await p.setNativePushAccount('u1',m.go);m.user='u2';await p.setNativePushAccount('u2',m.go);expect(m.unregister).toHaveBeenCalled();expect(m.register).not.toHaveBeenCalled();
});
