CREATE OR REPLACE FUNCTION public.message_contact_info_problem(body text)
 RETURNS text LANGUAGE plpgsql IMMUTABLE SET search_path TO 'public'
AS $function$
declare b text := lower(normalize(coalesce(body,''), NFKC));
begin
  b := translate(b, U&'\200B\200C\200D\2060\FEFF', '');
  if b ~ '[a-z0-9._%+-]+\s*(@|\(at\)|\[at\]|\sat\s)\s*[a-z0-9-]+\s*(\.|\(dot\)|\[dot\]|\sdot\s)\s*[a-z]{2,}'
     or b ~ '(gmail|yahoo|hotmail|outlook|icloud|aol|proton)\s*(\.|dot)?\s*com' then
    return 'For your safety, email addresses cannot be shared in messages. Keep the conversation on Vendibook.';
  end if;
  b := regexp_replace(b, '\m(dot|dash|hyphen)\M', '-', 'g');
  -- Spelled-out digits ("5zero7", "five oh seven") count as digits.
  b := regexp_replace(b, 'zero', '0', 'g');
  b := regexp_replace(b, 'one', '1', 'g');
  b := regexp_replace(b, 'two', '2', 'g');
  b := regexp_replace(b, 'three', '3', 'g');
  b := regexp_replace(b, 'four', '4', 'g');
  b := regexp_replace(b, 'five', '5', 'g');
  b := regexp_replace(b, 'six', '6', 'g');
  b := regexp_replace(b, 'seven', '7', 'g');
  b := regexp_replace(b, 'eight', '8', 'g');
  b := regexp_replace(b, 'nine', '9', 'g');
  b := regexp_replace(b, '([0-9][[:space:]().-]*)(oh|o)([[:space:]().-]*[0-9])', '\10\3', 'g');
  b := regexp_replace(b, '([0-9][[:space:]().-]*)(oh|o)([[:space:]().-]*[0-9])', '\10\3', 'g');
  b := regexp_replace(b, '([0-9])[il|]([0-9])', '\11\2', 'g');
  if b ~ '(^|[^0-9])([0-9][[:space:]().-]*){9}[0-9]([^0-9]|$)'
     or regexp_replace(b, '[^0-9]', '', 'g') ~ '[0-9]{10,}' and b ~ '\(?[0-9]{3}\)?[\s.-]*[0-9]{3}[\s.-]*[0-9]{4}' then
    return 'For your safety, phone numbers cannot be shared in messages. Keep the conversation on Vendibook.';
  end if;
  return null;
end $function$;