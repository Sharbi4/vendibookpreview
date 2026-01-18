import { useState, useEffect, useCallback } from 'react';

const DRAFT_KEY_PREFIX = 'vendibook_booking_draft_';

export interface BookingDraft {
  listingId: string;
  startDate?: string;
  endDate?: string;
  fulfillmentSelected?: 'pickup' | 'delivery' | 'on_site';
  deliveryAddress?: string;
  message?: string;
  updatedAt: string;
}

interface UseBookingDraftOptions {
  listingId: string;
  enabled?: boolean;
}

export const useBookingDraft = ({ listingId, enabled = true }: UseBookingDraftOptions) => {
  const storageKey = `${DRAFT_KEY_PREFIX}${listingId}`;
  const [draft, setDraft] = useState<BookingDraft | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load draft from localStorage
  useEffect(() => {
    if (!enabled) {
      setIsLoaded(true);
      return;
    }

    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored) as BookingDraft;
        // Check if draft is less than 24 hours old
        const updatedAt = new Date(parsed.updatedAt);
        const now = new Date();
        const hoursDiff = (now.getTime() - updatedAt.getTime()) / (1000 * 60 * 60);
        
        if (hoursDiff < 24) {
          setDraft(parsed);
        } else {
          // Draft is stale, remove it
          localStorage.removeItem(storageKey);
        }
      }
    } catch (error) {
      console.error('Error loading booking draft:', error);
    }
    setIsLoaded(true);
  }, [storageKey, enabled]);

  // Save draft to localStorage
  const saveDraft = useCallback((data: Partial<Omit<BookingDraft, 'listingId' | 'updatedAt'>>) => {
    if (!enabled) return;

    try {
      const newDraft: BookingDraft = {
        listingId,
        startDate: data.startDate,
        endDate: data.endDate,
        fulfillmentSelected: data.fulfillmentSelected,
        deliveryAddress: data.deliveryAddress,
        message: data.message,
        updatedAt: new Date().toISOString(),
      };
      
      localStorage.setItem(storageKey, JSON.stringify(newDraft));
      setDraft(newDraft);
    } catch (error) {
      console.error('Error saving booking draft:', error);
    }
  }, [listingId, storageKey, enabled]);

  // Clear draft from localStorage
  const clearDraft = useCallback(() => {
    try {
      localStorage.removeItem(storageKey);
      setDraft(null);
    } catch (error) {
      console.error('Error clearing booking draft:', error);
    }
  }, [storageKey]);

  // Check if there's a valid draft
  const hasDraft = draft !== null;

  return {
    draft,
    hasDraft,
    isLoaded,
    saveDraft,
    clearDraft,
  };
};

// Hook to manage all booking drafts (for cleanup, etc.)
export const useAllBookingDrafts = () => {
  const getAllDrafts = (): BookingDraft[] => {
    const drafts: BookingDraft[] = [];
    
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith(DRAFT_KEY_PREFIX)) {
          const stored = localStorage.getItem(key);
          if (stored) {
            drafts.push(JSON.parse(stored));
          }
        }
      }
    } catch (error) {
      console.error('Error getting all booking drafts:', error);
    }
    
    return drafts;
  };

  const clearAllDrafts = () => {
    try {
      const keysToRemove: string[] = [];
      
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith(DRAFT_KEY_PREFIX)) {
          keysToRemove.push(key);
        }
      }
      
      keysToRemove.forEach(key => localStorage.removeItem(key));
    } catch (error) {
      console.error('Error clearing all booking drafts:', error);
    }
  };

  return {
    getAllDrafts,
    clearAllDrafts,
  };
};

export default useBookingDraft;
