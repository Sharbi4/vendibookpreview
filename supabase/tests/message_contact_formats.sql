-- Pure-function regression checks; no messages, notifications, or customer writes.
begin;
do $test$
declare item record;
begin
  for item in select * from (values
    ('buyer@example.com', true),
    ('buyer (at) example (dot) com', true),
    ('buyer [at] example [dot] com', true),
    ('(202) 555-0123', true),
    ('202 dot 555 dot 0123', true),
    ('202 dash 555 dash 0123', true),
    ('2 0 2 5 5 5 0 1 2 3', true),
    ('２０２５５５０１２３', true),
    (U&'buyer\200B@example.com', true),
    ('Please call Randy Reed Trucking 5zero7-435-5939', true),
    ('five oh seven four three five five nine three nine', true),
    ('5o7-435-5939', true),
    ('Someone wants one trailer for $20,000 and deposit $2,000', false),
    ('Hi! Could you share a video walkthrough here on Vendibook?', false),
    ('It is 20 feet long and 8 feet wide.', false),
    ('The trailer is $20,000 and the deposit is $2,000.', false)
  ) cases(body,blocked)
  loop
    assert (public.message_contact_info_problem(item.body) is not null) = item.blocked,
      'Unexpected contact classification: ' || item.body;
    assert (public.message_content_problem(item.body,false) is not null) = item.blocked,
      'Chat must use the contact guard: ' || item.body;
  end loop;
end $test$;
rollback;
