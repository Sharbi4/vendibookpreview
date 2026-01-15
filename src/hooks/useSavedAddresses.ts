import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface SavedAddress {
  id: string;
  user_id: string;
  label: string;
  full_address: string;
  street: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;
  country: string | null;
  latitude: number | null;
  longitude: number | null;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateAddressInput {
  label: string;
  full_address: string;
  street?: string | null;
  city?: string | null;
  state?: string | null;
  zip_code?: string | null;
  country?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  is_default?: boolean;
}

export const useSavedAddresses = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAddresses = useCallback(async () => {
    if (!user) {
      setAddresses([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('saved_addresses')
        .select('*')
        .eq('user_id', user.id)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      setAddresses((data as SavedAddress[]) || []);
    } catch (err) {
      console.error('Error fetching saved addresses:', err);
      setError('Failed to load saved addresses');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchAddresses();
  }, [fetchAddresses]);

  const saveAddress = useCallback(async (input: CreateAddressInput): Promise<SavedAddress | null> => {
    if (!user) {
      toast({
        title: 'Sign in required',
        description: 'Please sign in to save addresses',
        variant: 'destructive',
      });
      return null;
    }

    try {
      // Check if address already exists
      const existingAddress = addresses.find(
        addr => addr.full_address.toLowerCase() === input.full_address.toLowerCase()
      );

      if (existingAddress) {
        toast({
          title: 'Address exists',
          description: 'This address is already saved',
        });
        return existingAddress;
      }

      const { data, error: insertError } = await supabase
        .from('saved_addresses')
        .insert({
          user_id: user.id,
          label: input.label,
          full_address: input.full_address,
          street: input.street,
          city: input.city,
          state: input.state,
          zip_code: input.zip_code,
          country: input.country || 'United States',
          latitude: input.latitude,
          longitude: input.longitude,
          is_default: input.is_default || false,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      const newAddress = data as SavedAddress;
      setAddresses(prev => [newAddress, ...prev]);
      
      toast({
        title: 'Address saved',
        description: `"${input.label}" has been saved to your addresses`,
      });

      return newAddress;
    } catch (err) {
      console.error('Error saving address:', err);
      toast({
        title: 'Error',
        description: 'Failed to save address',
        variant: 'destructive',
      });
      return null;
    }
  }, [user, addresses, toast]);

  const deleteAddress = useCallback(async (addressId: string): Promise<boolean> => {
    if (!user) return false;

    try {
      const { error: deleteError } = await supabase
        .from('saved_addresses')
        .delete()
        .eq('id', addressId)
        .eq('user_id', user.id);

      if (deleteError) throw deleteError;

      setAddresses(prev => prev.filter(addr => addr.id !== addressId));
      
      toast({
        title: 'Address deleted',
        description: 'The address has been removed',
      });

      return true;
    } catch (err) {
      console.error('Error deleting address:', err);
      toast({
        title: 'Error',
        description: 'Failed to delete address',
        variant: 'destructive',
      });
      return false;
    }
  }, [user, toast]);

  const setDefaultAddress = useCallback(async (addressId: string): Promise<boolean> => {
    if (!user) return false;

    try {
      // First, unset all defaults
      await supabase
        .from('saved_addresses')
        .update({ is_default: false })
        .eq('user_id', user.id);

      // Set the new default
      const { error: updateError } = await supabase
        .from('saved_addresses')
        .update({ is_default: true })
        .eq('id', addressId)
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      setAddresses(prev => prev.map(addr => ({
        ...addr,
        is_default: addr.id === addressId,
      })));

      toast({
        title: 'Default address set',
        description: 'Your default delivery address has been updated',
      });

      return true;
    } catch (err) {
      console.error('Error setting default address:', err);
      toast({
        title: 'Error',
        description: 'Failed to set default address',
        variant: 'destructive',
      });
      return false;
    }
  }, [user, toast]);

  return {
    addresses,
    isLoading,
    error,
    saveAddress,
    deleteAddress,
    setDefaultAddress,
    refetch: fetchAddresses,
  };
};
