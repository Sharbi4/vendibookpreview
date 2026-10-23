-- A bounded public projection: never expose owner contacts, street addresses or exact coordinates.
create or replace function public.buyer_city_inventory(
 p_lat double precision, p_lng double precision, p_city text, p_state text,
 p_state_name text, p_category text, p_local_cities text[] default '{}'::text[]
) returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
 if p_lat is null or p_lng is null or not (p_lat between -90 and 90) or not (p_lng between -180 and 180)
   or p_category is null or p_category not in ('food_truck','food_trailer') then
   raise exception 'Invalid market' using errcode='22023';
 end if;
 return (
 with eligible as (
  select l.id,l.title,l.description,coalesce(l.cover_image_url,l.image_urls[1]) cover_image_url,
   l.price_sale,l.category::text category,l.city,l.state,l.condition,l.updated_at,
   case when l.latitude between -90 and 90 and l.longitude between -180 and 180
    and not (l.latitude=0 and l.longitude=0) then
    3958.7613 * 2 * asin(sqrt(least(1.0,greatest(0.0,
      power(sin(radians(l.latitude-p_lat)/2),2)+cos(radians(p_lat))*cos(radians(l.latitude))*power(sin(radians(l.longitude-p_lng)/2),2)
    )))) end distance_miles,
   (lower(trim(l.state)) in (lower(p_state),lower(p_state_name)) and
    (lower(trim(l.city))=lower(p_city) or lower(trim(l.city)) in (select lower(x) from unnest(p_local_cities) x))) city_match
  from public.listings l join public.profiles p on p.id=l.host_id
  where l.status='published' and l.published_at is not null and l.deleted_at is null
   and l.moderation_status='clear' and l.unlisted=false and coalesce(p.account_suspended,false)=false
   and l.mode='sale' and l.category::text=p_category
   and not (l.title ilike any(array['Demo%','QA %','QA_%','QA-%','Test %','E2E %','Smoke %','Sandbox %']))
 ), ranked as (
  select *, coalesce(city_match,false) or coalesce(distance_miles<=100,false) is_local
  from eligible
 ), selected as (
  select * from ranked order by is_local desc, distance_miles nulls last, updated_at desc nulls last,id limit 10
 )
 select jsonb_build_object(
  'local_count',(select count(*) from ranked where is_local),
  'listings',coalesce((select jsonb_agg(jsonb_build_object(
   'id',id,'title',title,'description',description,'cover_image_url',cover_image_url,
   'price_sale',price_sale,'mode','sale','category',category,'city',city,'state',state,'condition',condition,
   'distance_miles',round(distance_miles::numeric),'is_local',is_local
  ) order by is_local desc,distance_miles nulls last,updated_at desc nulls last,id) from selected),'[]'::jsonb)
 )
 );
end $$;
revoke all on function public.buyer_city_inventory(double precision,double precision,text,text,text,text,text[]) from public;
grant execute on function public.buyer_city_inventory(double precision,double precision,text,text,text,text,text[]) to anon,authenticated;
comment on function public.buyer_city_inventory(double precision,double precision,text,text,text,text,text[]) is 'Up to ten discoverable sale listings: local region / 100 miles first, then nearest mapped nationwide inventory. Unknown distance last within tier. No private fields.';
