-- Additive safety update: no message, account, report, or credit rows are changed.
begin;
CREATE OR REPLACE FUNCTION public.message_contact_info_problem(body text)
RETURNS text LANGUAGE plpgsql IMMUTABLE SET search_path TO 'public' AS $$
declare b text := lower(normalize(coalesce(body,''), NFKC));
begin
  -- Remove invisible separators; normalize full-width characters first.
  b := translate(b, U&'\200B\200C\200D\2060\FEFF', '');
  if b ~ '[a-z0-9._%+-]+\s*(@|\(at\)|\[at\]|\sat\s)\s*[a-z0-9-]+\s*(\.|\(dot\)|\[dot\]|\sdot\s)\s*[a-z]{2,}'
     or b ~ '(gmail|yahoo|hotmail|outlook|icloud|aol|proton)\s*(\.|dot)?\s*com' then
    return 'For your safety, email addresses cannot be shared in messages. Keep the conversation on Vendibook.';
  end if;
  -- Treat written separators like punctuation, without joining unrelated numbers.
  b := regexp_replace(b, '\m(dot|dash|hyphen)\M', '-', 'g');
  if b ~ '(^|[^0-9])([0-9][[:space:]().-]*){9}[0-9]([^0-9]|$)'
     or regexp_replace(b, '[^0-9]', '', 'g') ~ '[0-9]{10,}' and b ~ '\(?[0-9]{3}\)?[\s.-]*[0-9]{3}[\s.-]*[0-9]{4}' then
    return 'For your safety, phone numbers cannot be shared in messages. Keep the conversation on Vendibook.';
  end if;
  return null;
end $$;


CREATE OR REPLACE FUNCTION public.message_content_problem(body text, is_new boolean)
 RETURNS text LANGUAGE plpgsql IMMUTABLE SET search_path TO 'public'
AS $function$
declare compact text := public.message_normalize(body); lower_body text := lower(normalize(coalesce(body,''), NFKC));
  has_link boolean; contact text;
begin
  contact := public.message_contact_info_problem(body);
  if contact is not null then return contact; end if;
  has_link := lower_body ~ '(https?[: ]|www[.]|[a-z0-9][.](com|net|org|ee|io|co|app|test|xyz|click)([^a-z]|$))';
  if compact ~ '(treevendibook|vendibookverify|vendibookverification)' then
    return 'For your safety, payment and account verification links cannot be sent in chat. Use your dashboard.';
  end if;
  if lower_body ~ '(^|[^a-z0-9])(tr[.]ee|bit[.]ly|tinyurl[.]com|t[.]co|shorturl[.]at|cutt[.]ly|rb[.]gy|rebrand[.]ly)([^a-z0-9]|$)' then
    return 'Shortened links are not allowed in messages. Share the full destination address instead.';
  end if;
  if compact ~ '(send|enter|provide|confirm|submit|share).{0,30}(cardnumber|carddetails|creditcard|debitcard|password|verificationcode|securitycode|onetimecode)'
     or compact ~ '(verificationfee|activationfee|paymentrequiredtoreceive|paytoreceive)'
     or (has_link and compact ~ '(verify.{0,20}account|account.{0,20}verif|create.{0,20}paypal|paypal.{0,20}signup|claim.{0,20}payment|release.{0,20}(funds|payment)|account.{0,20}suspend)') then
    return 'For your safety, requests for credentials, card details, or external account verification are not allowed in chat.';
  end if;
  if compact ~ '(tr[e3][e3]|bitly|tinyurlcom|cuttly|rbgy)(vendibook|verify|payment)' then
    return 'Suspicious shortened links are not allowed in messages.';
  end if;
  if is_new and (has_link or compact ~ '(paypalm[e3]|cashapp|venmo).{0,30}(pay|send|deposit)') then
    return 'New accounts cannot send external links or payment requests yet. Discuss the listing here and use checkout for payments.';
  end if;
  return null;
end $function$;

-- Guest contact fields remain available to the concierge. The question itself
-- must obey the same contact-info rule as chat, including direct API inserts.
create or replace function public.guard_guest_message_contact()
returns trigger language plpgsql set search_path=public as $$
declare problem text;
begin
  if TG_OP='UPDATE' and new.message is not distinct from old.message then return new; end if;
  problem := public.message_contact_info_problem(new.message);
  if problem is not null then raise exception using errcode='P0001', message=problem; end if;
  return new;
end $$;
drop trigger if exists guest_message_contact_guard on public.listing_leads;
create trigger guest_message_contact_guard before insert or update of message on public.listing_leads
for each row execute function public.guard_guest_message_contact();
commit;
