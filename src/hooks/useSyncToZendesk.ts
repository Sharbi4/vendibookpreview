import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface SyncResult {
  success: boolean;
  action: 'created' | 'updated';
  zendesk_user_id: number;
  message: string;
}

interface BulkSyncResult {
  success: boolean;
  synced: number;
  failed: number;
  created: number;
  updated: number;
  message: string;
  errors?: string[];
}

interface BulkSyncOptions {
  role?: 'host' | 'shopper' | 'admin';
  verified_only?: boolean;
  limit?: number;
  offset?: number;
}

interface ContactSyncOptions {
  status?: 'new' | 'contacted' | 'matched' | 'closed' | 'all';
  limit?: number;
  sync_as?: 'users' | 'tickets' | 'both';
}

interface ContactSyncResult {
  success: boolean;
  users_created: number;
  users_updated: number;
  tickets_created: number;
  failed: number;
  total_synced: number;
  message: string;
  errors?: string[];
}

export const useSyncToZendesk = () => {
  const { toast } = useToast();
  const [isSyncing, setIsSyncing] = useState(false);
  const [isBulkSyncing, setIsBulkSyncing] = useState(false);
  const [isContactSyncing, setIsContactSyncing] = useState(false);
  const [bulkProgress, setBulkProgress] = useState<{ synced: number; total: number } | null>(null);

  const syncCustomer = async (userId: string): Promise<SyncResult | null> => {
    setIsSyncing(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('sync-customer-to-zendesk', {
        body: { user_id: userId },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast({
        title: 'Customer synced to Zendesk',
        description: data.message,
      });

      return data as SyncResult;
    } catch (error) {
      console.error('Error syncing to Zendesk:', error);
      toast({
        title: 'Sync failed',
        description: error instanceof Error ? error.message : 'Failed to sync customer to Zendesk',
        variant: 'destructive',
      });
      return null;
    } finally {
      setIsSyncing(false);
    }
  };

  const syncCurrentUser = async (): Promise<SyncResult | null> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({
        title: 'Not logged in',
        description: 'Please log in to sync your profile',
        variant: 'destructive',
      });
      return null;
    }
    return syncCustomer(user.id);
  };

  const bulkSync = async (options: BulkSyncOptions = {}): Promise<BulkSyncResult | null> => {
    setIsBulkSyncing(true);
    setBulkProgress({ synced: 0, total: options.limit || 100 });
    
    try {
      const { data, error } = await supabase.functions.invoke('bulk-sync-zendesk', {
        body: options,
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast({
        title: 'Bulk sync completed',
        description: data.message,
      });

      return data as BulkSyncResult;
    } catch (error) {
      console.error('Error during bulk sync:', error);
      toast({
        title: 'Bulk sync failed',
        description: error instanceof Error ? error.message : 'Failed to bulk sync to Zendesk',
        variant: 'destructive',
      });
      return null;
    } finally {
      setIsBulkSyncing(false);
      setBulkProgress(null);
    }
  };

  const syncContacts = async (options: ContactSyncOptions = {}): Promise<ContactSyncResult | null> => {
    setIsContactSyncing(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('sync-contacts-to-zendesk', {
        body: options,
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast({
        title: 'Contacts synced to Zendesk',
        description: data.message,
      });

      return data as ContactSyncResult;
    } catch (error) {
      console.error('Error syncing contacts:', error);
      toast({
        title: 'Contact sync failed',
        description: error instanceof Error ? error.message : 'Failed to sync contacts to Zendesk',
        variant: 'destructive',
      });
      return null;
    } finally {
      setIsContactSyncing(false);
    }
  };

  return {
    syncCustomer,
    syncCurrentUser,
    bulkSync,
    syncContacts,
    isSyncing,
    isBulkSyncing,
    isContactSyncing,
    bulkProgress,
  };
};
