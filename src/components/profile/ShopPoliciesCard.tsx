import { useState } from 'react';
import { Package, RotateCcw, Clock, CreditCard, ChevronDown, ChevronUp, Shield, Pencil, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface ShopPolicies {
  delivery_range_miles?: number;
  return_policy?: string;
  cancellation_notice?: string;
  accepts_deposits?: boolean;
  custom_policies?: string[];
}

interface ShopPoliciesCardProps {
  policies: ShopPolicies | null;
  isOwnProfile?: boolean;
  onUpdate?: (policies: ShopPolicies) => void;
}

const ShopPoliciesCard = ({ policies, isOwnProfile, onUpdate }: ShopPoliciesCardProps) => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editedPolicies, setEditedPolicies] = useState<ShopPolicies>({
    delivery_range_miles: policies?.delivery_range_miles || undefined,
    return_policy: policies?.return_policy || '',
    cancellation_notice: policies?.cancellation_notice || '',
    accepts_deposits: policies?.accepts_deposits || false,
    custom_policies: policies?.custom_policies || [],
  });
  const [newCustomPolicy, setNewCustomPolicy] = useState('');

  const handleOpenEditModal = () => {
    setEditedPolicies({
      delivery_range_miles: policies?.delivery_range_miles || undefined,
      return_policy: policies?.return_policy || '',
      cancellation_notice: policies?.cancellation_notice || '',
      accepts_deposits: policies?.accepts_deposits || false,
      custom_policies: policies?.custom_policies || [],
    });
    setIsEditModalOpen(true);
  };

  const handleAddCustomPolicy = () => {
    if (newCustomPolicy.trim()) {
      setEditedPolicies(prev => ({
        ...prev,
        custom_policies: [...(prev.custom_policies || []), newCustomPolicy.trim()],
      }));
      setNewCustomPolicy('');
    }
  };

  const handleRemoveCustomPolicy = (index: number) => {
    setEditedPolicies(prev => ({
      ...prev,
      custom_policies: prev.custom_policies?.filter((_, i) => i !== index) || [],
    }));
  };

  const handleSave = async () => {
    if (!user) return;
    
    setIsSaving(true);
    try {
      const cleanedPolicies: ShopPolicies = {};
      
      if (editedPolicies.delivery_range_miles && editedPolicies.delivery_range_miles > 0) {
        cleanedPolicies.delivery_range_miles = editedPolicies.delivery_range_miles;
      }
      if (editedPolicies.return_policy?.trim()) {
        cleanedPolicies.return_policy = editedPolicies.return_policy.trim();
      }
      if (editedPolicies.cancellation_notice?.trim()) {
        cleanedPolicies.cancellation_notice = editedPolicies.cancellation_notice.trim();
      }
      if (editedPolicies.accepts_deposits) {
        cleanedPolicies.accepts_deposits = true;
      }
      if (editedPolicies.custom_policies && editedPolicies.custom_policies.length > 0) {
        cleanedPolicies.custom_policies = editedPolicies.custom_policies;
      }

      const { error } = await supabase
        .from('profiles')
        .update({ shop_policies: cleanedPolicies })
        .eq('id', user.id);

      if (error) throw error;

      toast.success('Shop policies updated successfully');
      setIsEditModalOpen(false);
      onUpdate?.(cleanedPolicies);
      
      // Reload the page to reflect changes
      window.location.reload();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'An unexpected error occurred';
      toast.error('Failed to update shop policies', {
        description: message,
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Don't render if no policies and not own profile
  if (!policies && !isOwnProfile) return null;

  // Check if there are any policies to show
  const hasPolicies = policies && (
    policies.delivery_range_miles ||
    policies.return_policy ||
    policies.cancellation_notice ||
    policies.accepts_deposits ||
    (policies.custom_policies && policies.custom_policies.length > 0)
  );

  if (!hasPolicies && !isOwnProfile) return null;

  // Empty state for own profile
  if (!hasPolicies && isOwnProfile) {
    return (
      <>
        <div 
          className="bg-muted/30 rounded-xl p-4 border border-dashed border-border cursor-pointer hover:border-primary/50 hover:bg-muted/50 transition-colors"
          onClick={handleOpenEditModal}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Shield className="h-4 w-4" />
              <span className="text-sm">Add shop policies to build trust with customers</span>
            </div>
            <Button variant="ghost" size="sm" className="h-8 px-3">
              <Pencil className="h-3.5 w-3.5 mr-1.5" />
              Add
            </Button>
          </div>
        </div>
        <EditPoliciesModal 
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          editedPolicies={editedPolicies}
          setEditedPolicies={setEditedPolicies}
          newCustomPolicy={newCustomPolicy}
          setNewCustomPolicy={setNewCustomPolicy}
          handleAddCustomPolicy={handleAddCustomPolicy}
          handleRemoveCustomPolicy={handleRemoveCustomPolicy}
          handleSave={handleSave}
          isSaving={isSaving}
        />
      </>
    );
  }

  const policyItems = [];

  if (policies?.delivery_range_miles) {
    policyItems.push({
      icon: Package,
      label: `Delivery within ${policies.delivery_range_miles} miles`,
    });
  }

  if (policies?.return_policy) {
    policyItems.push({
      icon: RotateCcw,
      label: policies.return_policy,
    });
  }

  if (policies?.cancellation_notice) {
    policyItems.push({
      icon: Clock,
      label: `${policies.cancellation_notice} cancellation notice`,
    });
  }

  if (policies?.accepts_deposits) {
    policyItems.push({
      icon: CreditCard,
      label: 'Deposits accepted',
    });
  }

  // Show first 2 items always, rest in collapsible
  const visibleItems = policyItems.slice(0, 2);
  const hiddenItems = policyItems.slice(2);
  const hasMoreItems = hiddenItems.length > 0 || (policies?.custom_policies?.length ?? 0) > 0;

  return (
    <>
    <div className="bg-card/50 backdrop-blur-sm rounded-xl p-4 border border-border/50">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-medium text-foreground">Shop Policies</h3>
        </div>
        {isOwnProfile && (
          <Button variant="ghost" size="sm" className="h-7 px-2" onClick={handleOpenEditModal}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {visibleItems.map((item, index) => (
          <div key={index} className="flex items-center gap-2 text-sm text-muted-foreground">
            <item.icon className="h-3.5 w-3.5 flex-shrink-0" />
            <span>{item.label}</span>
          </div>
        ))}
      </div>

      {hasMoreItems && (
        <Collapsible open={isOpen} onOpenChange={setIsOpen} className="mt-2">
          <CollapsibleContent className="space-y-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
              {hiddenItems.map((item, index) => (
                <div key={index} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <item.icon className="h-3.5 w-3.5 flex-shrink-0" />
                  <span>{item.label}</span>
                </div>
              ))}
            </div>

            {policies?.custom_policies && policies.custom_policies.length > 0 && (
              <div className="pt-2 border-t border-border/50">
                <ul className="space-y-1">
                  {policies.custom_policies.map((policy, index) => (
                    <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                      <span className="text-primary mt-1">•</span>
                      <span>{policy}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CollapsibleContent>

          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="w-full mt-2 h-7 text-xs">
              {isOpen ? (
                <>
                  <ChevronUp className="h-3 w-3 mr-1" />
                  Show less
                </>
              ) : (
                <>
                  <ChevronDown className="h-3 w-3 mr-1" />
                  View all policies
                </>
              )}
            </Button>
          </CollapsibleTrigger>
        </Collapsible>
      )}
    </div>
    <EditPoliciesModal 
      isOpen={isEditModalOpen}
      onClose={() => setIsEditModalOpen(false)}
      editedPolicies={editedPolicies}
      setEditedPolicies={setEditedPolicies}
      newCustomPolicy={newCustomPolicy}
      setNewCustomPolicy={setNewCustomPolicy}
      handleAddCustomPolicy={handleAddCustomPolicy}
      handleRemoveCustomPolicy={handleRemoveCustomPolicy}
      handleSave={handleSave}
      isSaving={isSaving}
    />
    </>
  );
};

// Edit Policies Modal Component
interface EditPoliciesModalProps {
  isOpen: boolean;
  onClose: () => void;
  editedPolicies: ShopPolicies;
  setEditedPolicies: React.Dispatch<React.SetStateAction<ShopPolicies>>;
  newCustomPolicy: string;
  setNewCustomPolicy: React.Dispatch<React.SetStateAction<string>>;
  handleAddCustomPolicy: () => void;
  handleRemoveCustomPolicy: (index: number) => void;
  handleSave: () => void;
  isSaving: boolean;
}

const EditPoliciesModal = ({
  isOpen,
  onClose,
  editedPolicies,
  setEditedPolicies,
  newCustomPolicy,
  setNewCustomPolicy,
  handleAddCustomPolicy,
  handleRemoveCustomPolicy,
  handleSave,
  isSaving,
}: EditPoliciesModalProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Edit Shop Policies
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-4">
          {/* Delivery Range */}
          <div className="space-y-2">
            <Label htmlFor="delivery_range" className="flex items-center gap-2">
              <Package className="h-4 w-4 text-muted-foreground" />
              Delivery Range (miles)
            </Label>
            <Input
              id="delivery_range"
              type="number"
              min="0"
              placeholder="e.g., 25"
              value={editedPolicies.delivery_range_miles || ''}
              onChange={(e) => setEditedPolicies(prev => ({
                ...prev,
                delivery_range_miles: e.target.value ? parseInt(e.target.value) : undefined,
              }))}
            />
          </div>

          {/* Return Policy */}
          <div className="space-y-2">
            <Label htmlFor="return_policy" className="flex items-center gap-2">
              <RotateCcw className="h-4 w-4 text-muted-foreground" />
              Return Policy
            </Label>
            <Input
              id="return_policy"
              placeholder="e.g., 30-day returns"
              value={editedPolicies.return_policy || ''}
              onChange={(e) => setEditedPolicies(prev => ({
                ...prev,
                return_policy: e.target.value,
              }))}
            />
          </div>

          {/* Cancellation Notice */}
          <div className="space-y-2">
            <Label htmlFor="cancellation_notice" className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              Cancellation Notice Required
            </Label>
            <Input
              id="cancellation_notice"
              placeholder="e.g., 24 hours"
              value={editedPolicies.cancellation_notice || ''}
              onChange={(e) => setEditedPolicies(prev => ({
                ...prev,
                cancellation_notice: e.target.value,
              }))}
            />
          </div>

          {/* Accepts Deposits */}
          <div className="flex items-center justify-between">
            <Label htmlFor="accepts_deposits" className="flex items-center gap-2 cursor-pointer">
              <CreditCard className="h-4 w-4 text-muted-foreground" />
              Accept Deposits
            </Label>
            <Switch
              id="accepts_deposits"
              checked={editedPolicies.accepts_deposits || false}
              onCheckedChange={(checked) => setEditedPolicies(prev => ({
                ...prev,
                accepts_deposits: checked,
              }))}
            />
          </div>

          {/* Custom Policies */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-muted-foreground" />
              Custom Policies
            </Label>
            
            {/* Existing custom policies */}
            {editedPolicies.custom_policies && editedPolicies.custom_policies.length > 0 && (
              <div className="space-y-2">
                {editedPolicies.custom_policies.map((policy, index) => (
                  <div key={index} className="flex items-center gap-2 bg-muted/50 rounded-lg p-2">
                    <span className="flex-1 text-sm">{policy}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                      onClick={() => handleRemoveCustomPolicy(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {/* Add new custom policy */}
            <div className="flex gap-2">
              <Textarea
                placeholder="Add a custom policy..."
                value={newCustomPolicy}
                onChange={(e) => setNewCustomPolicy(e.target.value)}
                className="min-h-[60px] resize-none"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="shrink-0"
                onClick={handleAddCustomPolicy}
                disabled={!newCustomPolicy.trim()}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save Policies'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ShopPoliciesCard;
