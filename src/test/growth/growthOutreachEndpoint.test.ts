import {beforeEach,describe,it,expect,vi} from 'vitest';
const mocks=vi.hoisted(()=>({caller:vi.fn(),admin:vi.fn(),db:vi.fn(),insert:vi.fn(),from:vi.fn(),fetch:vi.fn()}));
vi.mock('../../../supabase/functions/_shared/callerGuard.ts',()=>({getCaller:mocks.caller,isAdminUser:mocks.admin,serviceRoleClient:mocks.db}));
let handler:(r:Request)=>Promise<Response>;
vi.stubGlobal('Deno',{env:{get:()=>undefined},serve:(fn:typeof handler)=>{handler=fn;}});
vi.stubGlobal('fetch',mocks.fetch);
await import('../../../supabase/functions/growth-outreach/index.ts');
const request=(body:object)=>new Request('https://example.test',{method:'POST',body:JSON.stringify(body)});
describe('outreach server boundary',()=>{
 beforeEach(()=>{vi.clearAllMocks();mocks.caller.mockResolvedValue({id:'admin'});mocks.admin.mockResolvedValue(true);mocks.insert.mockResolvedValue({error:null});mocks.from.mockReturnValue({insert:mocks.insert});mocks.db.mockReturnValue({from:mocks.from});});
 it('rejects anonymous callers before any database or provider access',async()=>{mocks.caller.mockResolvedValue(null);expect((await handler(request({action:'snapshot'}))).status).toBe(403);expect(mocks.db).not.toHaveBeenCalled();expect(mocks.fetch).not.toHaveBeenCalled();});
 it('rejects signed-in nonadministrators',async()=>{mocks.admin.mockResolvedValue(false);expect((await handler(request({action:'provider_status'}))).status).toBe(403);expect(mocks.fetch).not.toHaveBeenCalled();});
 it('blocks dispatch despite admin approval with no provider request',async()=>{expect((await handler(request({action:'dispatch',batch_id:'11111111-1111-4111-8111-111111111111'}))).status).toBe(423);expect(mocks.fetch).not.toHaveBeenCalled();expect(mocks.insert).toHaveBeenCalledWith(expect.objectContaining({action:'blocked_dispatch'}));});
 it('blocks all SMS sends',async()=>{expect((await handler(request({action:'send_sms',followup_id:'11111111-1111-4111-8111-111111111111'}))).status).toBe(423);expect(mocks.fetch).not.toHaveBeenCalled();});
 it('rejects more than ten pilot leads before access',async()=>{expect((await handler(request({action:'preview',lead_ids:Array(11).fill('11111111-1111-4111-8111-111111111111')}))).status).toBe(400);expect(mocks.db).not.toHaveBeenCalled();});
 it('rejects malformed CSV phones before import',async()=>{expect((await handler(request({action:'import',leads:[{record_id:'example',phone:'not-a-phone',segment:'seller',state:'AZ',timezone:'America/Phoenix'}]}))).status).toBe(400);expect(mocks.db).not.toHaveBeenCalled();});
 it('cannot create or update provider agents through this endpoint',async()=>{expect((await handler(request({action:'create_agent'}))).status).toBe(400);expect(mocks.fetch).not.toHaveBeenCalled();});
});