import {useState} from 'react';
import {Link} from 'react-router-dom';
import {Dialog,DialogContent,DialogDescription,DialogHeader,DialogTitle} from '@/components/ui/dialog';
import {Checkbox} from '@/components/ui/checkbox';
import {Button} from '@/components/ui/button';
import {PURCHASE_ACK_TEXT,PURCHASE_ACK_VERSION,PURCHASE_DISCLOSURES} from '../../../supabase/functions/_shared/purchaseRequestPolicy';

export default function PurchaseRequestConfirmation({open,onOpenChange,onSubmit,busy,listingTitle}:{open:boolean;onOpenChange:(open:boolean)=>void;onSubmit:(ack:{version:string;accepted:true})=>void;busy:boolean;listingTitle:string}) {
  const [accepted,setAccepted]=useState(false);
  return <Dialog open={open} onOpenChange={v=>{if(busy)return;setAccepted(false);onOpenChange(v);}}>
    <DialogContent className="max-h-[90dvh] overflow-y-auto rounded-3xl sm:max-w-xl">
      <DialogHeader><DialogTitle className="text-2xl">Confirm Your Purchase Request</DialogTitle><DialogDescription>You are requesting to begin the purchase process for {listingTitle} through Vendibook.</DialogDescription></DialogHeader>
      <ol className="list-decimal space-y-3 pl-5 text-sm leading-relaxed text-stone-700">{PURCHASE_DISCLOSURES.map(text=><li key={text}>{text}</li>)}</ol>
      <label className="flex gap-3 rounded-2xl border p-4 text-sm leading-relaxed"><Checkbox checked={accepted} onCheckedChange={v=>setAccepted(v===true)} disabled={busy}/><span>{PURCHASE_ACK_TEXT}</span></label>
      <p className="text-xs text-muted-foreground">Review the <Link className="underline" to="/legal/purchase-agreement" target="_blank">purchase terms</Link>, <Link className="underline" to="/legal/payments-terms" target="_blank">Payments Terms</Link>, and <Link className="underline" to="/privacy" target="_blank">Privacy Policy</Link>. Your separate checkout electronic-record consent remains required.</p>
      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><Button variant="outline" disabled={busy} onClick={()=>onOpenChange(false)}>Cancel</Button><Button className="rounded-full shadow-[0_6px_22px_#f9731630]" disabled={!accepted||busy} onClick={()=>onSubmit({version:PURCHASE_ACK_VERSION,accepted:true})}>{busy?'Submitting…':'Agree & Submit Purchase Request'}</Button></div>
    </DialogContent>
  </Dialog>;
}
