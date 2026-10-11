import { supabase } from '@/integrations/supabase/client';

const BUCKET = 'booking-documents';

/**
 * Storage path of a renter document. Rows store the object URL Supabase
 * returned at upload; the bucket is private, so that URL can't be opened
 * directly and is only used to locate the file.
 */
export function bookingDocumentPath(fileUrl: string | null | undefined): string | null {
  if (!fileUrl) return null;
  const match = fileUrl.match(/\/storage\/v1\/object\/(?:public|sign|authenticated)\/booking-documents\/([^?#]+)/);
  if (match) return decodeURIComponent(match[1]);
  return /^[a-z]+:\/\//i.test(fileUrl) ? null : fileUrl.replace(/^\/+/, '');
}

/**
 * Opens a private renter document in a new tab through a short-lived signed
 * link. Access is enforced by the storage policies (renter, admins).
 */
export async function openBookingDocument(fileUrl: string | null | undefined): Promise<void> {
  const path = bookingDocumentPath(fileUrl);
  if (!path) throw new Error('This document link is invalid.');
  // Open the tab synchronously so popup blockers allow it, then point it at
  // the signed URL once we have it.
  const tab = window.open('', '_blank');
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 300);
  if (error || !data?.signedUrl) {
    tab?.close();
    throw new Error("You don't have access to this document, or it was removed.");
  }
  if (tab) {
    tab.opener = null;
    tab.location.href = data.signedUrl;
  } else {
    window.location.assign(data.signedUrl);
  }
}
