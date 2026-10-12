import { invokeTransactionalEmail } from "./invokeTransactionalEmail.ts";
// Called only by existing authenticated maintenance. No recipient or copy comes from a browser.
export async function dispatchBuyerMatchEmails(db: any) {
  const token=crypto.randomUUID();
  const {data:events,error}=await db.rpc("claim_buyermatch_emails",{_token:token});
  if(error)throw error;
  let failures=0;
  for(const e of events??[]) {
    let failure:string|null=null;
    try {
      const {data:c,error:ce}=await db.from("buyermatch_campaigns").select("seller_id,notifications_enabled").eq("id",e.campaign_id).single();
      if(ce)throw ce;
      const {data:prefs,error:pe}=await db.from("notification_preferences").select("sale_email").eq("user_id",c.seller_id).maybeSingle();
      if(pe)throw pe;
      if(c.notifications_enabled&&prefs?.sale_email!==false) {
        const {data:recipient,error:re}=await db.auth.admin.getUserById(c.seller_id);
        if(re||!recipient?.user?.email)throw new Error("Recipient unavailable");
        const {error:sendError}=await invokeTransactionalEmail({
          templateName:"generic-notice",recipientEmail:recipient.user.email,idempotencyKey:"buyermatch-digest:"+e.id,
          templateData:{subject:"Your BuyerMatch report is ready",kicker:"Vendibook Pro · BuyerMatch AI",heading:"Your buyer discovery update",
            paragraphs:["Reviewed campaign activity is available in your dashboard. See potential matches, documented outreach, and actual responses separately.","This is an activity report, not a guarantee of a lead or sale."],
            ctaLabel:"View BuyerMatch Report",ctaUrl:"https://vendibook.com/dashboard/buyermatch?campaign="+e.campaign_id,
            footnote:"Manage campaign notifications in your BuyerMatch dashboard."},
          metadata:{campaign_id:e.campaign_id,report_id:e.report_id,digest_id:e.id},
        });
        if(sendError)throw sendError;
      }
    } catch {failure="BuyerMatch report email failed; retry scheduled";failures++;}
    const {error:finishError}=await db.rpc("finish_buyermatch_email",{_id:e.id,_token:token,_error:failure});
    if(finishError)throw finishError;
  }
  return {processed:events?.length??0,failures};
}
