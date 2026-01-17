import { useState } from 'react';
import { format } from 'date-fns';
import { MapPin, Calendar, DollarSign, MessageSquare, User, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CATEGORY_LABELS, ListingCategory } from '@/types/listing';

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
}

interface ConciergeQueueCardProps {
  request: AssetRequest;
  onUpdate: (data: { id: string; status: string; assigned_to?: string; admin_notes?: string }) => void;
  isUpdating: boolean;
}

const STATUS_CONFIG = {
  new: { label: 'New', className: 'bg-blue-100 text-blue-700' },
  contacted: { label: 'Contacted', className: 'bg-amber-100 text-amber-700' },
  matched: { label: 'Matched', className: 'bg-emerald-100 text-emerald-700' },
  closed: { label: 'Closed', className: 'bg-slate-100 text-slate-700' },
};

export const ConciergeQueueCard = ({ request, onUpdate, isUpdating }: ConciergeQueueCardProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [assignedTo, setAssignedTo] = useState(request.assigned_to || '');
  const [adminNotes, setAdminNotes] = useState(request.admin_notes || '');

  const handleSave = () => {
    onUpdate({
      id: request.id,
      status: request.status,
      assigned_to: assignedTo || undefined,
      admin_notes: adminNotes || undefined,
    });
    setIsEditing(false);
  };

  const handleStatusChange = (newStatus: string) => {
    onUpdate({
      id: request.id,
      status: newStatus,
      assigned_to: assignedTo || undefined,
      admin_notes: adminNotes || undefined,
    });
  };

  const statusConfig = STATUS_CONFIG[request.status];
  const categoryLabel = CATEGORY_LABELS[request.asset_type as ListingCategory] || request.asset_type;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base">
              {categoryLabel} in {request.city}{request.state ? `, ${request.state}` : ''}
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Submitted {format(new Date(request.created_at), 'MMM d, yyyy \'at\' h:mm a')}
            </p>
          </div>
          <Badge className={statusConfig.className}>
            {statusConfig.label}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Request Details */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <MapPin className="h-4 w-4 flex-shrink-0" />
            <span>{request.city}{request.state ? `, ${request.state}` : ''}</span>
          </div>
          
          {(request.start_date || request.end_date) && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="h-4 w-4 flex-shrink-0" />
              <span>
                {request.start_date ? format(new Date(request.start_date), 'MMM d') : '?'}
                {' - '}
                {request.end_date ? format(new Date(request.end_date), 'MMM d') : '?'}
              </span>
            </div>
          )}
          
          {(request.budget_min || request.budget_max) && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <DollarSign className="h-4 w-4 flex-shrink-0" />
              <span>
                {request.budget_min ? `$${request.budget_min}` : '$0'}
                {' - '}
                {request.budget_max ? `$${request.budget_max}` : 'Any'}
              </span>
            </div>
          )}
          
          <div className="flex items-center gap-2 text-muted-foreground">
            <User className="h-4 w-4 flex-shrink-0" />
            <span>{request.email || request.phone || 'Logged-in user'}</span>
          </div>
        </div>

        {/* Notes from requester */}
        {request.notes && (
          <div className="p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2 mb-1.5">
              <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground">Notes</span>
            </div>
            <p className="text-sm">{request.notes}</p>
          </div>
        )}

        {/* Admin Controls */}
        {isEditing ? (
          <div className="space-y-3 pt-3 border-t">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Assigned to</label>
                <Input
                  value={assignedTo}
                  onChange={(e) => setAssignedTo(e.target.value)}
                  placeholder="Team member name"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Status</label>
                <Select value={request.status} onValueChange={handleStatusChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new">New</SelectItem>
                    <SelectItem value="contacted">Contacted</SelectItem>
                    <SelectItem value="matched">Matched</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Admin notes</label>
              <Textarea
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="Internal notes about this request..."
                rows={2}
              />
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSave} disabled={isUpdating}>
                {isUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setIsEditing(false)}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between pt-3 border-t">
            <div className="text-sm">
              {request.assigned_to && (
                <span className="text-muted-foreground">
                  Assigned to <span className="text-foreground font-medium">{request.assigned_to}</span>
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <Select value={request.status} onValueChange={handleStatusChange}>
                <SelectTrigger className="w-32 h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="contacted">Contacted</SelectItem>
                  <SelectItem value="matched">Matched</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
              <Button size="sm" variant="outline" onClick={() => setIsEditing(true)}>
                Edit
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ConciergeQueueCard;
