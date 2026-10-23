import {beforeEach,describe,it,expect,vi} from 'vitest';
const mocks=vi.hoisted(()=>({caller:vi.fn(),admin:vi.fn(),db:vi.fn(),send:vi.fn(),routing:vi.fn()}));
vi.mock('../../../supabase/functions/_shared/callerGuard.ts',()=>({getCaller:mocks.caller,isAdminUser:mocks.admin,serviceRoleClient:mocks.db}));
vi.mock('../../../supabase/functions/_shared/smsGuard.ts',()=>({sendGuardedSms:mocks.send}));
vi.mock('../../../supabase/functions/_shared/googleRouting.ts',()=>({isGoogleRoutingConfigured:mocks.routing}));
let handler:(req:Request)=>Promise<Response>;
vi.stubGlobal('Deno',{env:{get:()=>undefined},serve:(fn:typeof handler)=>{handler=fn;}});
await import('../../../supabase/functions/admin-operations/index.ts');
const request=(body:unknown)=>new Request('https://example.com/admin-operations',{method:'POST',body:JSON.stringify(body)});
describe('operations endpoint boundaries',()=>{
 beforeEach(()=>{vi.clearAllMocks();mocks.caller.mockResolvedValue(null);mocks.admin.mockResolvedValue(false);mocks.db.mockReturnValue({});});
 it('rejects anonymous callers before database access',async()=>{expect((await handler(request({action:'connections'}))).status).toBe(403);expect(mocks.db).not.toHaveBeenCalled();});
 it('rejects a signed-in nonadministrator',async()=>{mocks.caller.mockResolvedValue({id:'user'});expect((await handler(request({action:'sms_send'}))).status).toBe(403);expect(mocks.send).not.toHaveBeenCalled();});
 it('allows preflight but not GET mutations',async()=>{expect((await handler(new Request('https://example.com',{method:'OPTIONS'}))).status).toBe(200);expect((await handler(new Request('https://example.com'))).status).toBe(405);});
 it('only reports connector presence, never credentials',async()=>{mocks.caller.mockResolvedValue({id:'admin'});mocks.admin.mockResolvedValue(true);mocks.routing.mockReturnValue(true);const data=await(await handler(request({action:'connections'}))).json();expect(data.google_routes).toBe(true);expect(data.sms_callbacks).toBe(false);expect(data.ga4).toBe(false);expect(Object.values(data).every(v=>typeof v==='boolean')).toBe(true);});
 it('does not dispatch a malformed recipient or feedback mutation',async()=>{mocks.caller.mockResolvedValue({id:'admin'});mocks.admin.mockResolvedValue(true);expect((await handler(request({action:'sms_send',user_id:'bad',message:'hello'}))).status).toBe(400);expect((await handler(request({action:'set_feedback',enabled:'true'}))).status).toBe(400);expect(mocks.send).not.toHaveBeenCalled();});
});
