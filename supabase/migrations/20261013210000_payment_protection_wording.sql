-- Payment-protection wording for the payment-received notices (2026-10-13).
-- Vendibook's legal copy rules avoid saying Vendibook "holds" buyer funds; the
-- notices now describe when the seller is paid instead. Logic is unchanged.
create or replace function public.commerce_record_payment(_invoice uuid, _actor uuid, _reference text, _received_at timestamptz default null)
returns void language plpgsql set search_path = public as $$
declare i public.sale_invoices;
begin
  if not public.has_role(_actor, 'admin') then raise exception 'Administrator required'; end if;
  if length(btrim(coalesce(_reference, ''))) = 0 then raise exception 'Payment reference required'; end if;
  select * into i from public.sale_invoices where id = _invoice for update;
  if not found then raise exception 'Invoice not found'; end if;
  if i.status = 'paid' then return; end if;
  if i.status not in ('issued', 'payment_processing') then raise exception 'Invoice is not awaiting payment'; end if;
  update public.sale_invoices set status = 'paid', paid_at = coalesce(_received_at, now()), payment_reference = btrim(_reference),
    payment_recorded_by = _actor, disbursement_status = 'held', updated_at = now() where id = i.id;
  update public.sale_transactions set status = 'paid' where id = i.sale_id and status in ('pending', 'payment_failed');
  perform public.commerce_event('paid:' || i.id || ':buyer', i.sale_id, _actor, i.buyer_id, 'payment_received', 'Sale Pending',
    'Payment received. Payment protection: the seller is paid only after you confirm the handoff, you both sign the purchase agreement and the walkthrough video is saved.', '/invoices/' || i.id);
  perform public.commerce_event('paid:' || i.id || ':seller', i.sale_id, _actor, i.seller_id, 'payment_received', 'Buyer paid — arrange the handoff',
    'The buyer has paid. Arrange the handoff, sign the purchase agreement and record the walkthrough video; your payout is released once the buyer confirms the handoff.', '/invoices/' || i.id);
  perform public.commerce_check_release_ready(i.sale_id);
end $$;
