begin;

-- Run after the migration in a transaction; this script always rolls back.
-- Suppress only notification triggers while test messages are inserted. No email/SMS is sent.
alter table public.conversation_messages disable trigger on_new_conversation_message;
alter table public.booking_messages disable trigger on_new_booking_message;
do $test$
declare c record; outsider uuid; r jsonb; failed boolean; count_before int;
begin
  assert public.message_reserved_name('Emma Support');
  assert public.message_reserved_name('V e n d i b o o k Admin');
  assert public.message_reserved_name('Ｖｅｎｄｉｂｏｏｋ Ｓｕｐｐｏｒｔ');
  assert public.message_reserved_name('Vendіbооk Support');
  assert not public.message_reserved_name('Samantha Van');
  assert not public.message_reserved_name('Atlanta Food Trucks');
  assert public.message_content_problem('Please enter your credit card details',false) is not null;
  assert public.message_content_problem('https://tr.ee/vendibook',false) is not null;
  assert public.message_content_problem('Verify your seller account https://example.com',false) is not null;
  assert public.message_content_problem('https://example.com/trailer',true) is not null;
  assert public.message_content_problem('https://example.com/trailer',false) is null;
  assert public.message_content_problem('Can I pay with PayPal at checkout?',true) is null;
  assert public.message_content_problem('Is the food trailer available for a viewing?',true) is null;
  select * into c from public.conversations where not public.is_admin(shopper_id)
    and public.message_account_active(shopper_id) limit 1;
  assert c.id is not null, 'Needs an existing non-staff conversation fixture';
  perform set_config('request.jwt.claims',jsonb_build_object('sub',c.shopper_id,'role','authenticated')::text,true);
  perform set_config('request.jwt.claim.sub',c.shopper_id::text,true);
  perform set_config('request.jwt.claim.role','authenticated',true);
  assert public.message_recipient('conversation',c.id,c.shopper_id)=c.host_id;
  select id into outsider from auth.users where id not in(c.shopper_id,c.host_id) limit 1;
  failed:=false;
  begin perform public.message_recipient('conversation',c.id,outsider);
  exception when insufficient_privilege then failed:=true; end;
  assert failed, 'Nonparticipant cannot access/report/block a thread';
  select count(*) into count_before from public.conversation_messages where conversation_id=c.id;
  r:=public.send_marketplace_message('conversation',c.id,'Please provide your credit card details',null);
  assert not (r->>'success')::boolean, 'Phishing rejected';
  assert (select count(*) from public.conversation_messages where conversation_id=c.id)=count_before, 'Rejected message not delivered';
  assert exists(select 1 from public.message_safety_events where user_id=c.shopper_id and evidence->>'attempted_message'='Please provide your credit card details'), 'Rejected evidence retained';
  failed:=false;
  begin insert into public.conversation_messages(conversation_id,sender_id,message) values(c.id,c.shopper_id,'Please provide your credit card details');
  exception when sqlstate 'P0001' then failed:=true; end;
  assert failed, 'Direct REST inserts cannot bypass the guard';
  r:=public.send_marketplace_message('conversation',c.id,'Regression test: is this trailer available for a viewing next week?',null);
  assert (r->>'success')::boolean, 'Legitimate send accepted';
  perform public.set_message_block('conversation',c.id,true);
  r:=public.send_marketplace_message('conversation',c.id,'Hello again',null);
  assert not (r->>'success')::boolean, 'Blocked sender cannot send';
  perform set_config('request.jwt.claims',jsonb_build_object('sub',c.host_id,'role','authenticated')::text,true);
  perform set_config('request.jwt.claim.sub',c.host_id::text,true);
  r:=public.send_marketplace_message('conversation',c.id,'Hello from the other side',null);
  assert not (r->>'success')::boolean, 'Block applies in both directions';
  perform set_config('request.jwt.claims',jsonb_build_object('sub',c.shopper_id,'role','authenticated')::text,true);
  perform set_config('request.jwt.claim.sub',c.shopper_id::text,true);
  perform public.set_message_block('conversation',c.id,false);
  perform public.report_message_thread('conversation',c.id,'Impersonating support');
  perform public.report_message_thread('conversation',c.id,'Impersonating support');
  assert (select count(*) from public.message_safety_events where reporter_id=c.shopper_id and thread_id=c.id and status='open')=1, 'Reports idempotent';
  assert not exists(select 1 from public.message_sending_holds where user_id=c.host_id), 'One report does not auto-suspend';
  failed:=false;
  begin perform public.review_message_safety((select id from public.message_safety_events limit 1),'pause');
  exception when sqlstate 'P0001' then failed:=true; end;
  assert failed, 'Non-admin cannot moderate';
  failed:=false;
  begin update public.conversations set shopper_id=outsider where id=c.id;
  exception when sqlstate 'P0001' then failed:=true; end;
  assert failed, 'Participants cannot be replaced';
  failed:=false;
  begin update public.profiles set display_name='Emma Support' where id=c.shopper_id;
  exception when sqlstate 'P0001' then failed:=true; end;
  assert failed, 'Reserved profile names blocked on update';
  r:=public.send_marketplace_message('conversation',c.id,'Sent an attachment',jsonb_build_object('url','https://evil.example/phishing.pdf','name','invoice.pdf','type','application/pdf'));
  assert not (r->>'success')::boolean, 'External URL cannot disguise itself as an attachment';
end $test$;

do $rates$
declare actor uuid; listing record; threads uuid[]:='{}'; i int:=0; r jsonb; b record; new_thread uuid;
begin
  select u.id into actor from auth.users u join public.profiles p on p.id=u.id
  where not public.is_admin(u.id) and not coalesce(p.account_suspended,false)
    and not public.message_reserved_name(concat_ws(' ',p.full_name,p.display_name,p.username,p.business_name,p.first_name,p.last_name))
    and public.message_account_active(u.id)
    and not exists(select 1 from public.conversation_messages where sender_id=u.id)
    and not exists(select 1 from public.booking_messages where sender_id=u.id)
    and not exists(select 1 from public.conversations where shopper_id=u.id or host_id=u.id)
  limit 1;
  assert actor is not null, 'Needs an unused member fixture';
  update auth.users set created_at=now()-interval '1 day' where id=actor;
  perform set_config('request.jwt.claims',jsonb_build_object('sub',actor,'role','authenticated')::text,true);
  perform set_config('request.jwt.claim.sub',actor::text,true);
  for listing in select distinct on (host_id) id,host_id from public.listings where host_id<>actor and deleted_at is null order by host_id limit 6 loop
    i:=i+1;
    insert into public.conversations(listing_id,host_id,shopper_id) values(listing.id,listing.host_id,actor) returning id into new_thread;
    threads:=array_append(threads,new_thread);
  end loop;
  assert i=6, 'Needs six listing-owner fixtures';
  for i in 1..5 loop
    r:=public.send_marketplace_message('conversation',threads[i],'Regression availability question for equipment '||i,null);
    assert (r->>'success')::boolean, 'Five initial contacts allowed';
  end loop;
  r:=public.send_marketplace_message('conversation',threads[6],'Regression sixth contact',null);
  assert not (r->>'success')::boolean and r->>'error' like 'New conversation limit%', 'Sixth new contact blocked';
  for i in 1..3 loop
    r:=public.send_marketplace_message('conversation',threads[i],'Repeated bulk promotional message with identical content to multiple different sellers',null);
    assert (r->>'success')::boolean, 'Existing replies allowed below duplicate threshold';
  end loop;
  r:=public.send_marketplace_message('conversation',threads[4],'Repeated bulk promotional message with identical content to multiple different sellers',null);
  assert not (r->>'success')::boolean and r->>'error' like 'Repeated messages%', 'Fourth copied message stopped';
  assert exists(select 1 from public.message_sending_holds where user_id=actor), 'Bulk spam pauses sending for review';
  r:=public.send_marketplace_message('conversation',threads[1],'Changed message to try bypassing the hold',null);
  assert not (r->>'success')::boolean and r->>'error' like 'Messaging is paused%', 'Hold persists across content changes';

  select * into b from public.booking_requests where not public.is_admin(shopper_id)
    and public.message_account_active(shopper_id) limit 1;
  assert b.id is not null, 'Needs an existing booking fixture';
  perform set_config('request.jwt.claims',jsonb_build_object('sub',b.shopper_id,'role','authenticated')::text,true);
  perform set_config('request.jwt.claim.sub',b.shopper_id::text,true);
  r:=public.send_marketplace_message('booking',b.id,'Please send your password to receive payment',null);
  assert not (r->>'success')::boolean, 'Booking messages share the phishing guard';
  r:=public.send_marketplace_message('booking',b.id,'Regression question: what time is pickup?',null);
  assert (r->>'success')::boolean, 'Legitimate booking message accepted';
end $rates$;

select 'PASS: identity/content rules, authenticated send, direct-write guard, rejection evidence, blocks both ways, reports, moderation authorization, immutable participants, attachment URL protection' result;
rollback;
