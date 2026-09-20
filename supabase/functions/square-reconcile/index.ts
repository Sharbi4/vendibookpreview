import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.2';
import { squareConfig } from '../_shared/square.ts';
import { syncSquareSubscription } from '../_shared/squareSubscription.ts';
Deno.serve(async req=>{
  if(req.method!=='POST' || req.headers.get('Authorization') !== `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`) return new Response('Unauthorized',{status:401});
  try{
    const config=squareConfig();
    const admin=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false}});
    const {data,error}=await admin.from('square_billing_attempts').select('*').eq('kind','subscription').eq('environment',config.environment).not('subscription_id','is',null).order('updated_at').limit(100);
    if(error)throw error;
    for(const attempt of data || [])await syncSquareSubscription(admin,attempt);
    return Response.json({reconciled:data?.length||0});
  }catch{return new Response('Reconciliation failed',{status:500});}
});
