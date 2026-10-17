import { describe,it,expect,vi } from 'vitest';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { z } from 'zod';
import * as helpers from '../../../supabase/functions/_shared/metaMuse';
function endpoint(options:{signedIn?:boolean;admin?:boolean;key?:string}={}) {
 const user={id:'admin'};
 const listing={id:'11111111-1111-4111-8111-111111111111',title:'Trailer',mode:'sale',category:'food_trailer',city:'Phoenix',state:'AZ',price_sale:25000};
 const lead={id:'22222222-2222-4222-8222-222222222222',revision:1,intent:'buy',city:'Phoenix, AZ',category:'food_trailer',contact:'test@example.invalid',contact_allowed:true,consent_evidence:'permission'};
 const rpc=vi.fn(async(name:string)=>({data:name==='has_role'?options.admin!==false:name==='meta_muse_inventory'?[listing]:name==='meta_muse_take_rate'?true:{id:'draft',status:'draft'},error:null}));
 const provider=vi.fn();
 const db={auth:{getUser:async()=>({data:{user:options.signedIn===false?null:user},error:null})},rpc,from:()=>({select:()=>({eq:()=>({single:async()=>({data:lead,error:null})})})})};
 let handler:((req:Request)=>Promise<Response>)|undefined;
 const compiled=ts.transpileModule(fs.readFileSync('supabase/functions/meta-muse-draft/index.ts','utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext},transformers:{before:[context=>root=>ts.visitNode(root,function visit(node):any{return ts.isImportDeclaration(node)?undefined:ts.visitEachChild(node,visit,context);}) as ts.SourceFile]}}).outputText.replace(/export \{\};?/,'');
 vm.runInNewContext(compiled,{...helpers,z,createClient:()=>db,corsHeaders:{},Response,Request,AbortSignal,Date,fetch:provider,Deno:{serve:(h:typeof handler)=>{handler=h;},env:{get:(name:string)=>name==='META_MODEL_API_KEY'?options.key:'fixture-only'}}});
 return {provider,rpc,run:async(action:string,authorization=true)=>{if(!handler)throw Error('Handler missing');const response=await handler(new Request('https://test.invalid',{method:'POST',headers:authorization?{Authorization:'Bearer isolated-test'}:{},body:JSON.stringify({action,lead_id:lead.id})}));return {status:response.status,body:await response.json()};}};
}
describe('actual Muse edge handler',()=>{
 it('denies unauthenticated and ordinary users before reading leads',async()=>{const unsigned=endpoint();expect((await unsigned.run('muse',false)).status).toBe(401);expect(unsigned.rpc).not.toHaveBeenCalled();const regular=endpoint({admin:false});expect((await regular.run('muse')).status).toBe(403);expect(regular.provider).not.toHaveBeenCalled();});
 it('missing secret returns explicit unavailable and makes no provider/save calls',async()=>{const e=endpoint();const r=await e.run('muse');expect(r.status).toBe(503);expect(r.body.code).toBe('missing_secret');expect(e.provider).not.toHaveBeenCalled();expect(e.rpc.mock.calls.some(c=>c[0]==='meta_muse_action')).toBe(false);});
 it('template fallback is explicit, persists draft only and never invokes provider',async()=>{const e=endpoint();const r=await e.run('template');expect(r.status).toBe(200);expect(r.body.sending_enabled).toBe(false);expect(e.provider).not.toHaveBeenCalled();expect(e.rpc.mock.calls.some(c=>c[0]==='meta_muse_action')).toBe(true);});
 it('send is not an accepted operation',async()=>{const e=endpoint();expect((await e.run('send')).status).toBe(400);expect(e.provider).not.toHaveBeenCalled();});
});