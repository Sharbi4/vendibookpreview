import { hasContactDetails } from '../../../supabase/functions/_shared/contactPatterns';

/**
 * Shown under a listing description when it contains a phone number, email,
 * link or payment/chat handle. Phone numbers and emails are removed when the
 * listing is saved (DB trigger a00_strip_contact_details); links and payment
 * apps are masked on the listing page. Tell the seller before they publish.
 */
export const ContactDetailsNotice = ({ text }: { text: string }) => {
  if (!text || !hasContactDetails(text)) return null;
  return (
    <p role="status" className="text-xs rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-amber-800 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-300">
      Phone numbers and emails are removed automatically when you save, and buyers won't see links or payment apps. Buyers message you on Vendibook instead, where every member verifies their phone and ID.
    </p>
  );
};
