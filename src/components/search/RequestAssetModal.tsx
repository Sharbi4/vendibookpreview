import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { useAssetRequests } from '@/hooks/useAssetRequests';
import { trackEvent } from '@/lib/analytics';
import { CATEGORY_LABELS } from '@/types/listing';

interface RequestAssetModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultCity?: string;
  defaultAssetType?: string;
}

export const RequestAssetModal = ({
  open,
  onOpenChange,
  defaultCity = '',
  defaultAssetType = '',
}: RequestAssetModalProps) => {
  const { user, profile } = useAuth();
  const { submitRequest, isSubmitting } = useAssetRequests();
  const [submitted, setSubmitted] = useState(false);

  const [formData, setFormData] = useState({
    city: defaultCity,
    state: '',
    asset_type: defaultAssetType,
    start_date: '',
    end_date: '',
    budget_min: '',
    budget_max: '',
    notes: '',
    email: profile?.email || '',
    phone: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    submitRequest({
      city: formData.city,
      state: formData.state || undefined,
      asset_type: formData.asset_type,
      start_date: formData.start_date || undefined,
      end_date: formData.end_date || undefined,
      budget_min: formData.budget_min ? parseFloat(formData.budget_min) : undefined,
      budget_max: formData.budget_max ? parseFloat(formData.budget_max) : undefined,
      notes: formData.notes || undefined,
      email: !user ? formData.email : undefined,
      phone: formData.phone || undefined,
    }, {
      onSuccess: () => {
        setSubmitted(true);
        trackEvent({
          category: 'Conversion',
          action: 'asset_request_submitted',
          label: formData.asset_type,
          metadata: { city: formData.city },
        });
      },
    });
  };

  const handleClose = () => {
    setSubmitted(false);
    setFormData({
      city: defaultCity,
      state: '',
      asset_type: defaultAssetType,
      start_date: '',
      end_date: '',
      budget_min: '',
      budget_max: '',
      notes: '',
      email: profile?.email || '',
      phone: '',
    });
    onOpenChange(false);
  };

  if (submitted) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <div className="text-center py-6">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">Request submitted</h3>
            <p className="text-sm text-muted-foreground mb-6">
              We'll reach out shortly to help you find the right match.
            </p>
            <Button onClick={handleClose}>
              Done
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Request an asset</DialogTitle>
          <DialogDescription>
            Tell us what you're looking for and we'll match you with the right listing.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {/* Required fields */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="city">City *</Label>
              <Input
                id="city"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                placeholder="e.g. Houston"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="state">State</Label>
              <Input
                id="state"
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                placeholder="e.g. TX"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="asset_type">Asset type *</Label>
            <Select
              value={formData.asset_type}
              onValueChange={(value) => setFormData({ ...formData, asset_type: value })}
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
                <SelectItem value="equipment">Equipment</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Optional fields */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="start_date">Start date</Label>
              <Input
                id="start_date"
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end_date">End date</Label>
              <Input
                id="end_date"
                type="date"
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="budget_min">Min budget</Label>
              <Input
                id="budget_min"
                type="number"
                value={formData.budget_min}
                onChange={(e) => setFormData({ ...formData, budget_min: e.target.value })}
                placeholder="$0"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="budget_max">Max budget</Label>
              <Input
                id="budget_max"
                type="number"
                value={formData.budget_max}
                onChange={(e) => setFormData({ ...formData, budget_max: e.target.value })}
                placeholder="$5,000"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Additional details</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Tell us more about what you need..."
              rows={3}
            />
          </div>

          {/* Contact info for non-logged in users */}
          {!user && (
            <div className="space-y-3 pt-2 border-t">
              <p className="text-xs text-muted-foreground">How can we reach you?</p>
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="you@example.com"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="(555) 123-4567"
                />
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1"
              disabled={isSubmitting || !formData.city || !formData.asset_type}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                'Submit request'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default RequestAssetModal;
