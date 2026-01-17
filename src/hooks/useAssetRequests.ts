import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface AssetRequest {
  id: string;
  user_id?: string;
  email?: string;
  phone?: string;
  city: string;
  state?: string;
  asset_type: string;
  start_date?: string;
  end_date?: string;
  budget_min?: number;
  budget_max?: number;
  notes?: string;
  status: 'new' | 'contacted' | 'matched' | 'closed';
  assigned_to?: string;
  admin_notes?: string;
  created_at: string;
  updated_at: string;
}

interface CreateAssetRequestParams {
  email?: string;
  phone?: string;
  city: string;
  state?: string;
  asset_type: string;
  start_date?: string;
  end_date?: string;
  budget_min?: number;
  budget_max?: number;
  notes?: string;
}

export const useAssetRequests = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Get user's own requests
  const { data: myRequests = [], isLoading } = useQuery({
    queryKey: ['my-asset-requests', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('asset_requests')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as AssetRequest[];
    },
    enabled: !!user,
  });

  const createMutation = useMutation({
    mutationFn: async (params: CreateAssetRequestParams) => {
      const { data, error } = await supabase
        .from('asset_requests')
        .insert({
          user_id: user?.id || null,
          ...params,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-asset-requests'] });
      toast.success('Request submitted! We\'ll reach out shortly.');
    },
    onError: () => {
      toast.error('Failed to submit request');
    },
  });

  return {
    myRequests,
    isLoading,
    submitRequest: createMutation.mutate,
    isSubmitting: createMutation.isPending,
  };
};

// Admin hook for managing all asset requests
export const useAdminAssetRequests = () => {
  const queryClient = useQueryClient();

  const { data: allRequests = [], isLoading } = useQuery({
    queryKey: ['admin-asset-requests'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_all_asset_requests');
      if (error) throw error;
      return data as AssetRequest[];
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ 
      id, 
      status, 
      assigned_to, 
      admin_notes 
    }: { 
      id: string; 
      status: string; 
      assigned_to?: string; 
      admin_notes?: string;
    }) => {
      const { data, error } = await supabase.rpc('update_asset_request_status', {
        request_id: id,
        new_status: status,
        new_assigned_to: assigned_to || null,
        new_admin_notes: admin_notes || null,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-asset-requests'] });
      toast.success('Request updated');
    },
    onError: () => {
      toast.error('Failed to update request');
    },
  });

  const stats = {
    total: allRequests.length,
    new: allRequests.filter(r => r.status === 'new').length,
    contacted: allRequests.filter(r => r.status === 'contacted').length,
    matched: allRequests.filter(r => r.status === 'matched').length,
    closed: allRequests.filter(r => r.status === 'closed').length,
  };

  return {
    allRequests,
    isLoading,
    updateStatus: updateStatusMutation.mutate,
    isUpdating: updateStatusMutation.isPending,
    stats,
  };
};

export default useAssetRequests;
