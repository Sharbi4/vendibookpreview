revoke execute on function public.seller_paypal_ready(uuid) from public, anon, authenticated;
grant execute on function public.seller_paypal_ready(uuid) to service_role;