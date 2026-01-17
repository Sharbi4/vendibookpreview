// Guest draft management utilities
// Stores draft token in localStorage for claiming after sign-in

const GUEST_DRAFT_KEY = 'vendibook_guest_draft';

interface GuestDraft {
  token: string;
  listingId: string;
  createdAt: string;
}

export const saveGuestDraft = (listingId: string, token: string): void => {
  const draft: GuestDraft = {
    token,
    listingId,
    createdAt: new Date().toISOString(),
  };
  localStorage.setItem(GUEST_DRAFT_KEY, JSON.stringify(draft));
};

export const getGuestDraft = (): GuestDraft | null => {
  try {
    const data = localStorage.getItem(GUEST_DRAFT_KEY);
    if (!data) return null;
    return JSON.parse(data) as GuestDraft;
  } catch {
    return null;
  }
};

export const clearGuestDraft = (): void => {
  localStorage.removeItem(GUEST_DRAFT_KEY);
};

export const generateDraftToken = (): string => {
  return crypto.randomUUID();
};