import { hasContactDetails } from '../../../supabase/functions/_shared/contactPatterns';

/**
 * Shown under a listing description when it contains a phone number, email,
 * link or payment/chat handle. Buyers see those masked on the listing page,
 * so tell the seller before they publish.
 */
export const ContactDetailsNotice = ({ text }: { text: string }) => {
  if (!text || !hasContactDetails(text)) return null;
  return (
    <p role="status" className="text-xs rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-amber-800 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-300">
      Buyers won't see phone numbers, emails, links or payment apps in your description. They'll message you on Vendibook instead, where every member verifies their phone and ID.
    </p>
  );
};
