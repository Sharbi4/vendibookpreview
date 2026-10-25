import { maskContactDetails } from './contactPatterns.ts';

export function relayDisplayName(value: string, fallback = 'Buyer') {
  const clean = maskContactDetails(value).replace(/\[contact removed\]/g, '').replace(/[^\p{L}\p{M}' -]/gu, '').trim();
  const words = clean.split(/\s+/).filter(Boolean);
  return words.length ? `${words[0]}${words.length > 1 ? ` ${words[words.length - 1][0]}.` : ''}`.slice(0, 80) : fallback;
}

export function relayVisible(message: { sender_role: string; recipient_role?: string | null; sent_at?: string | null }, role: string) {
  return role === 'support' || message.sender_role === role || (!!message.sent_at && (message.sender_role !== 'support' || message.recipient_role === role));
}

export function relayBody(message: { body: string; released_body?: string | null; sent_at?: string | null }, admin: boolean) {
  return admin ? message.body : maskContactDetails(message.sent_at ? message.released_body ?? '' : message.body);
}
