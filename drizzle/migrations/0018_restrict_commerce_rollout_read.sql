-- commerce_rollout is internal rollout/payment configuration. No client code reads it;
-- edge functions use the service role (bypasses RLS) and SECURITY DEFINER RPCs read it as definer.
-- Narrow the permissive authenticated read to admins only.
drop policy if exists commerce_rollout_read on public.commerce_rollout;
create policy commerce_rollout_read on public.commerce_rollout
  for select to authenticated
  using (public.has_role((select auth.uid()), 'admin'));

-- Keep grants aligned: authenticated keeps SELECT privilege but the policy now gates rows to admins.
grant select on public.commerce_rollout to authenticated;
revoke insert, update, delete on public.commerce_rollout from authenticated;
revoke all on public.commerce_rollout from anon;
grant select on public.commerce_rollout to service_role;