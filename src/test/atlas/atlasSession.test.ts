// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

let handler: (req: Request) => Promise<Response>;
const rateLimit = vi.fn();
const provider = vi.fn();
const source = readFileSync('supabase/functions/atlas-agent-token/index.ts','utf8').replace(/^import .*;\r?\n/gm,'');
const compiled = ts.transpileModule(source, {compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
const clientIp = vi.fn();
new Function('serve','checkAtlasLimits','trustedClientIp','createClient','Deno','fetch',compiled)(
  (fn:typeof handler)=>{handler=fn;},rateLimit,clientIp,()=>({}),
  {env:{get:(key:string)=>key==='ELEVENLABS_API_KEY'?'private-provider-key':undefined}},provider,
);
const request=(mode:string)=>new Request('https://vendibook.com/atlas-agent-token',{method:'POST',body:JSON.stringify({mode})});
describe('Atlas session handoff',()=>{
  it('does not fall back to Atlas when Allison is not configured', async () => {
    const response = await handler(new Request('https://vendibook.com/atlas-agent-token', { method: 'POST', body: JSON.stringify({agent:'allison', mode:'text'}) }));
    expect(response.status).toBe(503);
    expect(provider).not.toHaveBeenCalled();
  });
  it('rejects arbitrary provider agent selection', async () => {
    const response = await handler(new Request('https://vendibook.com/atlas-agent-token', { method: 'POST', body: JSON.stringify({agent:'someone-else'}) }));
    expect(response.status).toBe(400);
    expect(provider).not.toHaveBeenCalled();
  });
  beforeEach(()=>{vi.clearAllMocks();rateLimit.mockResolvedValue('allowed');clientIp.mockReturnValue('test-ip');});
  it('issues text WebSocket handoff without exposing the provider key',async()=>{
    provider.mockResolvedValue(new Response(JSON.stringify({signed_url:'wss://api.elevenlabs.io/v1/convai/conversation?token=temporary'})));
    const result=await handler(request('text'));
    expect(result.status).toBe(200);
    expect(await result.json()).toEqual({signedUrl:'wss://api.elevenlabs.io/v1/convai/conversation?token=temporary'});
    expect(provider.mock.calls[0][0]).toContain('get-signed-url?agent_id=agent_1501m4rhvkz9fsbs5ce89zvk2k7b');
    expect(result.headers.get('Cache-Control')).toBe('no-store');
    expect(rateLimit.mock.calls[0][1]).toBe('test-ip');
    expect(rateLimit.mock.calls[0][2]).toEqual([
      { scope: 'atlas_agent_ip_min', limit: 6, minutes: 1 },
      { scope: 'atlas_agent_ip_day', limit: 40, minutes: 1440 },
    ]);
  });
  it('issues a voice WebRTC token separately',async()=>{
    provider.mockResolvedValue(new Response(JSON.stringify({token:'temporary-voice-token'})));
    expect(await (await handler(request('voice'))).json()).toEqual({token:'temporary-voice-token'});
    expect(provider.mock.calls[0][0]).toContain('/conversation/token?');
  });
  it('rejects rate-limited requests before contacting the provider',async()=>{
    rateLimit.mockResolvedValue('limited');
    expect((await handler(request('text'))).status).toBe(429);
    expect(provider).not.toHaveBeenCalled();
  });
  it('fails closed when the limiter or trusted client IP is unavailable',async()=>{
    rateLimit.mockResolvedValue('unavailable');
    expect((await handler(request('text'))).status).toBe(503);
    clientIp.mockReturnValue(null);
    expect((await handler(request('voice'))).status).toBe(503);
    expect(provider).not.toHaveBeenCalled();
  });
  it('rejects unsupported signed URL hosts',async()=>{
    provider.mockResolvedValue(new Response(JSON.stringify({signed_url:'wss://untrusted.example/conversation'})));
    expect((await handler(request('text'))).status).toBe(503);
  });
  it('does not permit GET to create conversations',async()=>{
    expect((await handler(new Request('https://vendibook.com/atlas-agent-token'))).status).toBe(405);
    expect(provider).not.toHaveBeenCalled();
  });
});
