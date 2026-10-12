import { COMMERCE_STATUSES } from '../../../supabase/functions/_shared/purchaseRequestPolicy';
export default function CommerceStatus({status}:{status:string}) {
  const copy=COMMERCE_STATUSES[status as keyof typeof COMMERCE_STATUSES];
  const tone=['completed','sold'].includes(status)?'border-emerald-200 bg-emerald-50 text-emerald-900':status==='disputed'?'border-rose-200 bg-rose-50 text-rose-900':['cancelled','expired','refunded','declined'].includes(status)?'border-stone-200 bg-stone-100 text-stone-700':'border-orange-200 bg-orange-50 text-orange-950';
  return <span title={copy?.[1]} className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${tone}`}>{copy?.[0]??'Status unavailable'}</span>;
}
