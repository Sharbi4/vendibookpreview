import { DOCUMENT_TYPE_LABELS } from '@/types/documents';

/** notifyUser appends a zero-width delimiter and an internal replay key. */
export function notificationMessage(message: string): string {
  let copy = message.replace(/\u200b[^\s]+$/, '').trim();
  for (const [key, label] of Object.entries(DOCUMENT_TYPE_LABELS)) {
    copy = copy.replace(new RegExp(`\\b${key}\\b`, 'g'), label);
  }
  return copy;
}
