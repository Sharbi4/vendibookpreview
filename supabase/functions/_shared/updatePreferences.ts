export const UPDATE_ROLES = ['renter', 'buyer', 'host', 'seller'] as const;
export type UpdateRole = typeof UPDATE_ROLES[number];
export const UPDATE_TOPICS = ['listings', 'regulations', 'news'] as const;
export const UPDATE_CONSENT_VERSION = 'updates-2026-10-22';
export const UPDATE_SMS_DISCLOSURE = 'Yes, I agree to receive recurring automated marketing texts from Vendibook with listing recommendations, mobile food business news, and regulatory updates based on my preferences. Up to 4 messages per month. Message and data rates may apply. Reply STOP to unsubscribe or HELP for help. Consent is optional and is not a condition of purchase or using Vendibook.';
export const ROLE_CONTENT: Record<UpdateRole, { title: string; detail: string; href: string; cta: string }> = {
  renter: { title: 'Find your next place to operate.', detail: 'Rental listings, operating guides, and mobile food business updates.', href: '/search?mode=rent', cta: 'Explore rentals' },
  buyer: { title: 'Make your next move with confidence.', detail: 'Food trucks and trailers for sale, buying guides, and industry updates.', href: '/search?mode=sale', cta: 'Explore listings for sale' },
  host: { title: 'Keep your rental business moving.', detail: 'Hosting guidance, rental marketplace updates, and ways to present your space.', href: '/dashboard', cta: 'Open your dashboard' },
  seller: { title: 'Put your next sale in motion.', detail: 'Selling guidance, listing presentation ideas, and marketplace updates.', href: '/dashboard', cta: 'Open your dashboard' },
};

export function validateUpdateSignup(raw: Record<string, unknown>) {
  const email = String(raw.email ?? '').trim().toLowerCase();
  const name = String(raw.name ?? '').trim();
  const role = String(raw.role ?? '') as UpdateRole;
  const zip = String(raw.zip ?? '').trim();
  const topics = Array.isArray(raw.topics) ? [...new Set(raw.topics)] : [];
  const digits = String(raw.phone ?? '').replace(/\D/g, '');
  const phone = digits ? (digits.length === 10 ? '+1' + digits : '+' + digits) : null;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) throw new Error('Enter a valid email address.');
  if (name.length > 80) throw new Error('Use a name under 80 characters.');
  if (!UPDATE_ROLES.includes(role)) throw new Error('Choose renter, buyer, host, or seller.');
  if (!/^\d{5}$/.test(zip)) throw new Error('Enter your five-digit US ZIP code.');
  if (!topics.length || topics.some(t => !UPDATE_TOPICS.includes(t as typeof UPDATE_TOPICS[number]))) throw new Error('Choose at least one update topic.');
  if (raw.emailConsent !== true) throw new Error('Confirm that you want email updates.');
  if (phone && !/^\+1[2-9]\d{2}[2-9]\d{6}$/.test(phone)) throw new Error('Enter a valid US or Canadian mobile number.');
  if (phone && raw.smsConsent !== true) throw new Error('Agree to SMS updates, or leave the optional phone field empty.');
  if (!phone && raw.smsConsent === true) throw new Error('Enter a mobile number for text updates.');
  return { email, name, role, zip, topics: topics as string[], phone, smsConsent: !!phone && raw.smsConsent === true };
}
